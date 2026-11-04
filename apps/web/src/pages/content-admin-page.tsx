import {
  Archive,
  ArrowDown,
  ArrowUp,
  Download,
  FileJson,
  ImagePlus,
  LogOut,
  PackagePlus,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Brand } from "../components/brand";
import { CelestialBackground } from "../components/celestial-background";
import { GlassBadge } from "../components/glass-badge";
import { GlassButton } from "../components/glass-button";
import { GlassCard } from "../components/glass-card";
import { GlassInput } from "../components/glass-input";

type Status = "DRAFT" | "ACTIVE" | "ARCHIVED";
type Asset = {
  id: string;
  title: string;
  tags: string[];
  category: string;
  status: Status;
  contentType: string | null;
  contentUrl: string | null;
  sourceType: string;
  altText: string;
};
type Question = {
  id: string;
  text: string;
  imageAssetId: string | null;
  memeAssetIds: string[];
  position: number;
  submissionDurationSeconds: number;
  votingDurationSeconds: number;
  status: Status;
};
type Preset = {
  id: string;
  name: string;
  description: string;
  mode: "TALENT_MODE" | "COMMUNITY_MODE";
  roundDurationSeconds: number;
  questionIds: string[];
  status: Status;
  tieBreaker: string;
  votingRules: { allowSelfVote: false; votesPerPlayer: number; audienceVoting: boolean };
  scoring: { winnerPoints: number; participationPoints: number };
  playMode: "INDIVIDUAL";
};
type Tab = "assets" | "questions" | "presets" | "transfer";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (init?.method && !["GET", "HEAD"].includes(init.method))
    headers.set("X-Requested-With", "misthy-admin");
  const response = await fetch(`/api/admin${path}`, { ...init, headers, credentials: "include" });
  const body = (await response
    .json()
    .catch(() => ({ message: "Máy chủ trả về dữ liệu không hợp lệ." }))) as { message?: string };
  if (!response.ok) throw new Error(body.message ?? `Yêu cầu thất bại (${response.status}).`);
  return body as T;
}

export function ContentAdminPage({ sessionCode }: { sessionCode: string }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("assets");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      await api("/auth/me");
      setAuthenticated(true);
      const [assetData, questionData, presetData] = await Promise.all([
        api<{ items: Asset[] }>("/assets"),
        api<{ items: Question[] }>("/questions"),
        api<{ items: Preset[] }>("/presets"),
      ]);
      setAssets(assetData.items);
      setQuestions(questionData.items);
      setPresets(presetData.items);
    } catch (caught) {
      setAuthenticated(false);
      if (authenticated)
        setError(caught instanceof Error ? caught.message : "Không thể tải dữ liệu.");
    }
  }, [authenticated]);

  useEffect(() => {
    // Initial remote synchronization; state updates happen after fetch promises settle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (action: () => Promise<unknown>, success: string) => {
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Có lỗi xảy ra.");
    }
  };

  if (authenticated !== true)
    return (
      <AdminLogin
        onAuthenticated={() => {
          setAuthenticated(true);
          void refresh();
        }}
      />
    );

  return (
    <main className="admin-canvas min-h-screen">
      <CelestialBackground />
      <div className="relative mx-auto max-w-[1500px] p-4 md:p-7">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-5">
            <Brand />
            <div>
              <GlassBadge tone="violet">Content Studio</GlassBadge>
              <h1 className="mt-1 text-2xl font-black text-[var(--midnight)]">Thư viện nội dung</h1>
              <p className="text-sm text-[var(--ink-muted)]">
                Tạo trọn bộ nội dung cho phòng {sessionCode}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <GlassButton variant="glass" onClick={() => void refresh()}>
              <RefreshCw size={16} />
              Làm mới
            </GlassButton>
            <GlassButton
              variant="ghost"
              onClick={() =>
                void run(() => api("/auth/logout", { method: "POST" }), "Đã đăng xuất.")
              }
            >
              <LogOut size={16} />
              Đăng xuất
            </GlassButton>
          </div>
        </header>
        <nav
          className="mb-5 flex gap-2 overflow-x-auto rounded-[var(--radius-pill)] border border-white/70 bg-white/50 p-1.5 backdrop-blur-xl"
          aria-label="Quản lý nội dung"
        >
          {(
            [
              ["assets", "Meme"],
              ["questions", "Câu hỏi"],
              ["presets", "Preset"],
              ["transfer", "Nhập / xuất"],
            ] as const
          ).map(([id, label]) => (
            <GlassButton
              key={id}
              size="small"
              variant={tab === id ? "primary" : "ghost"}
              onClick={() => setTab(id)}
            >
              {label}
            </GlassButton>
          ))}
          <a className="ml-auto" href={`/admin/${sessionCode}`}>
            <GlassButton size="small" variant="ghost">
              Về dashboard
            </GlassButton>
          </a>
        </nav>
        {(notice || error) && (
          <div
            className={`mb-4 rounded-2xl border p-3 text-sm font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
            role="status"
          >
            {error || notice}
          </div>
        )}
        {tab === "assets" && <AssetsPanel assets={assets} run={run} onFiltered={setAssets} />}
        {tab === "questions" && <QuestionsPanel assets={assets} questions={questions} run={run} />}
        {tab === "presets" && <PresetsPanel questions={questions} presets={presets} run={run} />}
        {tab === "transfer" && <TransferPanel run={run} />}
      </div>
    </main>
  );
}

export function AdminLogin({
  onAuthenticated,
  title = "Đăng nhập Content Studio",
}: {
  onAuthenticated: () => void;
  title?: string;
}) {
  const [bootstrap, setBootstrap] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (bootstrap)
        await api("/auth/bootstrap", {
          method: "POST",
          headers: { "X-Bootstrap-Secret": String(form.get("secret")) },
          body: JSON.stringify({
            email: form.get("email"),
            displayName: form.get("displayName"),
            password: form.get("password"),
          }),
        });
      await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      onAuthenticated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể đăng nhập.");
    }
  };
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <CelestialBackground />
      <GlassCard className="relative w-full max-w-md p-6">
        <Brand />
        <h1 className="mt-6 text-2xl font-black">{bootstrap ? "Khởi tạo quản trị" : title}</h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          {bootstrap
            ? "Chỉ dùng một lần khi chưa có tài khoản."
            : "Nội dung và kho ảnh được bảo vệ."}
        </p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          {bootstrap && <GlassInput label="Tên hiển thị" name="displayName" required />}
          <GlassInput label="Email" name="email" type="email" required />
          <GlassInput
            label="Mật khẩu"
            name="password"
            type="password"
            minLength={bootstrap ? 12 : 1}
            required
          />
          {bootstrap && <GlassInput label="Mã khởi tạo" name="secret" type="password" required />}
          {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
          <GlassButton className="w-full" type="submit">
            {bootstrap ? "Khởi tạo và đăng nhập" : "Đăng nhập"}
          </GlassButton>
        </form>
        <button
          className="mt-4 w-full text-sm font-bold text-[var(--periwinkle-700)]"
          onClick={() => setBootstrap(!bootstrap)}
        >
          {bootstrap ? "Đã có tài khoản" : "Khởi tạo lần đầu"}
        </button>
      </GlassCard>
    </main>
  );
}

function AssetsPanel({
  assets,
  run,
  onFiltered,
}: {
  assets: Asset[];
  run: (action: () => Promise<unknown>, success: string) => Promise<void>;
  onFiltered: (items: Asset[]) => void;
}) {
  const [preview, setPreview] = useState("");
  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (file instanceof File) setPreview(URL.createObjectURL(file));
    form.set(
      "tags",
      JSON.stringify(
        String(form.get("tags") ?? "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    );
    await run(() => api("/assets", { method: "POST", body: form }), "Đã tải meme lên R2.");
    event.currentTarget.reset();
  };
  const search = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const query = new URLSearchParams({
      search: String(form.get("search") ?? ""),
      status: String(form.get("filterStatus") ?? ""),
      category: String(form.get("filterCategory") ?? ""),
    });
    try {
      onFiltered((await api<{ items: Asset[] }>(`/assets?${query}`)).items);
    } catch {
      // The full refresh action remains available in the page header.
    }
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <GlassCard className="p-5">
        <h2 className="text-lg font-black">
          <ImagePlus className="mr-2 inline" size={18} />
          Tải meme
        </h2>
        <form className="mt-4 space-y-3" onSubmit={upload}>
          <GlassInput
            label="Tệp GIF, WebP, PNG, JPEG"
            name="file"
            type="file"
            accept="image/gif,image/webp,image/png,image/jpeg"
            required
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPreview(URL.createObjectURL(file));
            }}
          />
          {preview && (
            <img
              className="aspect-video w-full rounded-2xl object-contain bg-white/50"
              src={preview}
              alt="Xem trước tệp tải lên"
            />
          )}
          <GlassInput label="Tiêu đề" name="title" required maxLength={120} />
          <GlassInput label="Tags" name="tags" hint="Phân cách bằng dấu phẩy" />
          <GlassInput label="Danh mục" name="category" defaultValue="reaction" required />
          <GlassInput label="Mô tả ảnh" name="altText" />
          <label className="block text-sm font-bold">
            Trạng thái
            <select className="cms-field mt-2" name="status" defaultValue="DRAFT">
              <option>DRAFT</option>
              <option>ACTIVE</option>
            </select>
          </label>
          <GlassButton className="w-full" type="submit">
            <Upload size={16} />
            Tải lên
          </GlassButton>
        </form>
      </GlassCard>
      <section>
        <form className="mb-4 grid gap-2 md:grid-cols-[1fr_160px_160px_auto]" onSubmit={search}>
          <GlassInput
            label="Tìm meme"
            name="search"
            visuallyHideLabel
            placeholder="Tên hoặc tag..."
          />
          <select className="cms-field" name="filterStatus">
            <option value="">Mọi trạng thái</option>
            <option>DRAFT</option>
            <option>ACTIVE</option>
            <option>ARCHIVED</option>
          </select>
          <GlassInput
            label="Danh mục"
            name="filterCategory"
            visuallyHideLabel
            placeholder="Danh mục"
          />
          <GlassButton size="small">Tìm</GlassButton>
        </form>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((asset) => (
            <GlassCard className="overflow-hidden p-3" key={asset.id}>
              {asset.contentUrl ? (
                <img
                  className="aspect-video w-full rounded-2xl bg-white/60 object-contain"
                  src={asset.contentUrl}
                  alt={asset.altText || asset.title}
                />
              ) : (
                <div className="grid aspect-video place-items-center rounded-2xl bg-white/50 text-xs font-bold text-[var(--ink-muted)]">
                  Placeholder metadata
                </div>
              )}
              <div className="p-2">
                <div className="flex items-start justify-between gap-2">
                  <strong>{asset.title}</strong>
                  <GlassBadge tone={asset.status === "ACTIVE" ? "success" : "violet"}>
                    {asset.status}
                  </GlassBadge>
                </div>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  {asset.category} · {asset.tags.join(", ") || "chưa có tag"}
                </p>
                <div className="mt-3 flex gap-2">
                  <GlassButton
                    size="small"
                    variant="glass"
                    onClick={() =>
                      void run(
                        () =>
                          api(`/assets/${asset.id}`, {
                            method: "PATCH",
                            body: JSON.stringify({ status: "ARCHIVED" }),
                          }),
                        "Đã lưu trữ meme.",
                      )
                    }
                  >
                    <Archive size={14} />
                    Lưu trữ
                  </GlassButton>
                  <GlassButton
                    size="small"
                    variant="danger"
                    aria-label="Xóa vĩnh viễn"
                    onClick={() =>
                      confirm("Xóa vĩnh viễn meme chưa được sử dụng?") &&
                      void run(
                        () => api(`/assets/${asset.id}?mode=delete`, { method: "DELETE" }),
                        "Đã xóa meme.",
                      )
                    }
                  >
                    <Trash2 size={14} />
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
        {assets.length === 0 && <Empty text="Chưa có meme phù hợp." />}
      </section>
    </div>
  );
}

function QuestionsPanel({
  assets,
  questions,
  run,
}: {
  assets: Asset[];
  questions: Question[];
  run: Runner;
}) {
  const [editing, setEditing] = useState<Question | null>(null);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      text: form.get("text"),
      imageAssetId: form.get("imageAssetId") || null,
      memeAssetIds: form.getAll("memeAssetIds"),
      position: editing?.position ?? questions.length,
      submissionDurationSeconds: Number(form.get("submissionDurationSeconds")),
      votingDurationSeconds: Number(form.get("votingDurationSeconds")),
      status: form.get("status"),
    };
    await run(
      () =>
        api(editing ? `/questions/${editing.id}` : "/questions", {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(body),
        }),
      editing ? "Đã cập nhật câu hỏi." : "Đã tạo câu hỏi.",
    );
    setEditing(null);
    event.currentTarget.reset();
  };
  const move = (index: number, delta: number) => {
    const copy = [...questions];
    const target = index + delta;
    if (!copy[target]) return;
    [copy[index], copy[target]] = [copy[target]!, copy[index]!];
    void run(
      () =>
        api("/questions/reorder", {
          method: "POST",
          body: JSON.stringify({ ids: copy.map((item) => item.id) }),
        }),
      "Đã đổi thứ tự câu hỏi.",
    );
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
      <GlassCard className="p-5">
        <h2 className="text-lg font-black">
          <Plus className="mr-2 inline" size={18} />
          {editing ? "Sửa câu hỏi" : "Tạo câu hỏi"}
        </h2>
        <form className="mt-4 space-y-3" onSubmit={save} key={editing?.id ?? "new"}>
          <label className="block text-sm font-bold">
            Tình huống
            <textarea
              className="cms-field mt-2 min-h-24"
              name="text"
              defaultValue={editing?.text}
              required
              maxLength={280}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <GlassInput
              label="Thời gian gửi (giây)"
              name="submissionDurationSeconds"
              type="number"
              min={10}
              max={300}
              defaultValue={editing?.submissionDurationSeconds ?? 45}
              required
            />
            <GlassInput
              label="Thời gian vote (giây)"
              name="votingDurationSeconds"
              type="number"
              min={5}
              max={180}
              defaultValue={editing?.votingDurationSeconds ?? 30}
              required
            />
          </div>
          <label className="block text-sm font-bold">
            Ảnh đính kèm
            <select
              className="cms-field mt-2"
              name="imageAssetId"
              defaultValue={editing?.imageAssetId ?? ""}
            >
              <option value="">Không có</option>
              {assets.map((asset) => (
                <option value={asset.id} key={asset.id}>
                  {asset.title}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="text-sm font-bold">Bộ meme được phép</legend>
            <div className="mt-2 max-h-48 space-y-1 overflow-auto rounded-2xl bg-white/50 p-3">
              {assets
                .filter((asset) => asset.status !== "ARCHIVED")
                .map((asset) => (
                  <label className="flex items-center gap-2 text-sm" key={asset.id}>
                    <input
                      type="checkbox"
                      name="memeAssetIds"
                      value={asset.id}
                      defaultChecked={editing?.memeAssetIds.includes(asset.id)}
                    />
                    {asset.title}
                  </label>
                ))}
            </div>
          </fieldset>
          <StatusSelect value={editing?.status} />
          <div className="flex gap-2">
            <GlassButton className="flex-1" type="submit">
              {editing ? "Lưu thay đổi" : "Tạo câu hỏi"}
            </GlassButton>
            {editing && (
              <GlassButton variant="ghost" type="button" onClick={() => setEditing(null)}>
                Hủy
              </GlassButton>
            )}
          </div>
        </form>
      </GlassCard>
      <section className="space-y-3">
        {questions.map((question, index) => (
          <GlassCard className="p-4" key={question.id}>
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/70 font-black">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <strong>{question.text}</strong>
                  <GlassBadge tone={question.status === "ACTIVE" ? "success" : "violet"}>
                    {question.status}
                  </GlassBadge>
                </div>
                <p className="mt-2 text-xs text-[var(--ink-muted)]">
                  Gửi {question.submissionDurationSeconds}s · Vote {question.votingDurationSeconds}s
                  · {question.memeAssetIds.length} meme
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <GlassButton size="small" variant="glass" onClick={() => setEditing(question)}>
                    Sửa / xem trước
                  </GlassButton>
                  <GlassButton
                    size="small"
                    variant="ghost"
                    aria-label="Đưa lên"
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp size={14} />
                  </GlassButton>
                  <GlassButton
                    size="small"
                    variant="ghost"
                    aria-label="Đưa xuống"
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown size={14} />
                  </GlassButton>
                  <GlassButton
                    size="small"
                    variant="danger"
                    onClick={() =>
                      confirm("Xóa câu hỏi này?") &&
                      void run(
                        () => api(`/questions/${question.id}`, { method: "DELETE" }),
                        "Đã xóa câu hỏi.",
                      )
                    }
                  >
                    <Trash2 size={14} />
                  </GlassButton>
                </div>
              </div>
            </div>
          </GlassCard>
        ))}
        {questions.length === 0 && <Empty text="Chưa có câu hỏi. Hãy tạo câu đầu tiên." />}
      </section>
    </div>
  );
}

type Runner = (action: () => Promise<unknown>, success: string) => Promise<void>;
function PresetsPanel({
  questions,
  presets,
  run,
}: {
  questions: Question[];
  presets: Preset[];
  run: Runner;
}) {
  const [editing, setEditing] = useState<Preset | null>(null);
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const mode = String(form.get("mode"));
    const body = {
      name: form.get("name"),
      description: form.get("description"),
      mode,
      playMode: "INDIVIDUAL",
      roundDurationSeconds: Number(form.get("roundDurationSeconds")),
      votingRules: {
        allowSelfVote: false,
        votesPerPlayer: 1,
        audienceVoting: mode === "COMMUNITY_MODE",
      },
      scoring: {
        winnerPoints: Number(form.get("winnerPoints")),
        participationPoints: Number(form.get("participationPoints")),
      },
      tieBreaker: form.get("tieBreaker"),
      questionIds: form.getAll("questionIds"),
      status: form.get("status"),
    };
    await run(
      () =>
        api(editing ? `/presets/${editing.id}` : "/presets", {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(body),
        }),
      editing ? "Đã cập nhật preset." : "Đã tạo preset.",
    );
    setEditing(null);
    event.currentTarget.reset();
  };
  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <GlassCard className="p-5">
        <h2 className="text-lg font-black">
          <PackagePlus className="mr-2 inline" size={18} />
          {editing ? "Sửa preset" : "Tạo preset"}
        </h2>
        <form className="mt-4 space-y-3" onSubmit={save} key={editing?.id ?? "new-preset"}>
          <GlassInput label="Tên preset" name="name" defaultValue={editing?.name} required />
          <label className="block text-sm font-bold">
            Mô tả
            <textarea
              className="cms-field mt-2 min-h-20"
              name="description"
              defaultValue={editing?.description}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-bold">
              Chế độ
              <select
                className="cms-field mt-2"
                name="mode"
                defaultValue={editing?.mode ?? "COMMUNITY_MODE"}
              >
                <option value="COMMUNITY_MODE">Cộng đồng</option>
                <option value="TALENT_MODE">Talent chọn</option>
              </select>
            </label>
            <GlassInput
              label="Thời lượng vòng"
              name="roundDurationSeconds"
              type="number"
              min={10}
              max={300}
              defaultValue={editing?.roundDurationSeconds ?? 45}
            />
            <GlassInput
              label="Điểm thắng"
              name="winnerPoints"
              type="number"
              min={0}
              defaultValue={editing?.scoring.winnerPoints ?? 100}
            />
            <GlassInput
              label="Điểm tham gia"
              name="participationPoints"
              type="number"
              min={0}
              defaultValue={editing?.scoring.participationPoints ?? 0}
            />
          </div>
          <label className="block text-sm font-bold">
            Phân định hòa
            <select
              className="cms-field mt-2"
              name="tieBreaker"
              defaultValue={editing?.tieBreaker ?? "EARLIEST_SUBMISSION"}
            >
              <option value="EARLIEST_SUBMISSION">Gửi sớm nhất</option>
              <option value="RANDOM">Ngẫu nhiên</option>
              <option value="TALENT_DECIDES">Talent quyết định</option>
            </select>
          </label>
          <fieldset>
            <legend className="text-sm font-bold">Câu hỏi theo thứ tự hiện tại</legend>
            <div className="mt-2 max-h-48 space-y-1 overflow-auto rounded-2xl bg-white/50 p-3">
              {questions
                .filter((item) => item.status !== "ARCHIVED")
                .map((question) => (
                  <label className="flex items-start gap-2 text-sm" key={question.id}>
                    <input
                      className="mt-1"
                      type="checkbox"
                      name="questionIds"
                      value={question.id}
                      defaultChecked={editing?.questionIds.includes(question.id)}
                    />
                    {question.text}
                  </label>
                ))}
            </div>
          </fieldset>
          <StatusSelect value={editing?.status} />
          <GlassButton className="w-full" type="submit">
            {editing ? "Lưu preset" : "Tạo preset"}
          </GlassButton>
        </form>
      </GlassCard>
      <section className="grid content-start gap-3 md:grid-cols-2">
        {presets.map((preset) => (
          <GlassCard className="p-5" key={preset.id}>
            <div className="flex justify-between gap-2">
              <div>
                <GlassBadge tone="violet">
                  {preset.mode === "COMMUNITY_MODE" ? "Cộng đồng" : "Talent"}
                </GlassBadge>
                <h3 className="mt-2 text-lg font-black">{preset.name}</h3>
              </div>
              <GlassBadge>{preset.status}</GlassBadge>
            </div>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              {preset.description || "Không có mô tả"}
            </p>
            <p className="mt-3 text-xs font-bold">
              {preset.questionIds.length} câu · {preset.roundDurationSeconds}s · thắng{" "}
              {preset.scoring.winnerPoints} điểm
            </p>
            <div className="mt-4 flex gap-2">
              <GlassButton size="small" variant="glass" onClick={() => setEditing(preset)}>
                Sửa / xem trước
              </GlassButton>
              <GlassButton
                size="small"
                variant="danger"
                onClick={() =>
                  confirm("Xóa preset này?") &&
                  void run(
                    () => api(`/presets/${preset.id}`, { method: "DELETE" }),
                    "Đã xóa preset.",
                  )
                }
              >
                <Trash2 size={14} />
              </GlassButton>
            </div>
          </GlassCard>
        ))}
        {presets.length === 0 && <Empty text="Chưa có preset." />}
      </section>
    </div>
  );
}

function TransferPanel({ run }: { run: Runner }) {
  const [json, setJson] = useState("");
  const [strategy, setStrategy] = useState("REJECT");
  const exportPack = async () => {
    const pack = await api<object>("/content/export");
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `misthy-content-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <GlassCard className="p-6">
        <Download size={22} />
        <h2 className="mt-3 text-xl font-black">Xuất gói nội dung</h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Xuất câu hỏi, preset và tham chiếu meme. Tệp ảnh R2 không nằm trong JSON.
        </p>
        <GlassButton className="mt-5" onClick={() => void run(exportPack, "Đã xuất gói JSON.")}>
          <Download size={16} />
          Tải JSON
        </GlassButton>
      </GlassCard>
      <GlassCard className="p-6">
        <FileJson size={22} />
        <h2 className="mt-3 text-xl font-black">Nhập gói JSON</h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Schema được kiểm tra trước khi ghi. Asset được tham chiếu phải tồn tại.
        </p>
        <input
          className="cms-field mt-4"
          type="file"
          accept="application/json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void file.text().then(setJson);
          }}
        />
        <textarea
          className="cms-field mt-3 min-h-52 font-mono text-xs"
          value={json}
          onChange={(event) => setJson(event.target.value)}
          placeholder="Dán JSON tại đây..."
        />
        <label className="mt-3 block text-sm font-bold">
          Khi trùng ID
          <select
            className="cms-field mt-2"
            value={strategy}
            onChange={(event) => setStrategy(event.target.value)}
          >
            <option value="REJECT">Báo lỗi</option>
            <option value="SKIP">Bỏ qua</option>
            <option value="REGENERATE">Tạo ID mới</option>
          </select>
        </label>
        <GlassButton
          className="mt-4"
          onClick={() =>
            void run(
              () =>
                api("/content/import", {
                  method: "POST",
                  body: JSON.stringify({ duplicateStrategy: strategy, pack: JSON.parse(json) }),
                }),
              "Đã nhập gói nội dung.",
            )
          }
          disabled={!json}
        >
          <Upload size={16} />
          Kiểm tra và nhập
        </GlassButton>
      </GlassCard>
    </div>
  );
}

function StatusSelect({ value = "DRAFT" }: { value: Status | undefined }) {
  return (
    <label className="block text-sm font-bold">
      Trạng thái
      <select className="cms-field mt-2" name="status" defaultValue={value}>
        <option>DRAFT</option>
        <option>ACTIVE</option>
        <option>ARCHIVED</option>
      </select>
    </label>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-white bg-white/40 p-10 text-center text-sm font-semibold text-[var(--ink-muted)]">
      {text}
    </div>
  );
}
