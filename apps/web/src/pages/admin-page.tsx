import {
  Activity,
  ArrowRight,
  BarChart3,
  CirclePause,
  Gamepad2,
  LayoutDashboard,
  MoreHorizontal,
  Radio,
  Settings2,
  Users,
} from "lucide-react";
import { AmbientBackground } from "../components/ambient-background";
import { Brand } from "../components/brand";
import { GlassBadge } from "../components/glass-badge";
import { GlassButton } from "../components/glass-button";
import { GlassCard } from "../components/glass-card";
import { mockPlayers, mockRound } from "../data/mock-data";

const navigation = [
  { label: "Tổng quan", icon: LayoutDashboard, active: true },
  { label: "Người chơi", icon: Users },
  { label: "Các vòng", icon: Gamepad2 },
  { label: "Kết quả", icon: BarChart3 },
  { label: "Cài đặt", icon: Settings2 },
];

export function AdminPage({ sessionCode }: { sessionCode: string }) {
  const progress = Math.round((mockRound.submitted / mockRound.players) * 100);
  return (
    <main className="relative min-h-dvh overflow-x-clip p-3 sm:p-5 lg:p-6">
      <AmbientBackground />
      <div className="relative z-10 mx-auto grid max-w-[96rem] gap-4 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <aside className="glass-control hidden min-h-[calc(100dvh-3rem)] flex-col rounded-[var(--radius-xl)] border border-white/72 p-4 shadow-[var(--shadow-nav)] lg:flex">
          <Brand />
          <nav aria-label="Điều hướng quản trị" className="mt-10 space-y-1.5">
            {navigation.map(({ label, icon: Icon, active }) => (
              <a
                key={label}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-2xl px-3.5 text-sm font-bold transition ${
                  active
                    ? "bg-violet-700 text-white shadow-lg shadow-violet-500/20"
                    : "text-violet-950/58 hover:bg-white/55 hover:text-violet-950"
                }`}
                href="#"
              >
                <Icon aria-hidden="true" size={18} /> {label}
              </a>
            ))}
          </nav>
          <div className="mt-auto rounded-[var(--radius-md)] bg-white/48 p-4">
            <span className="text-[.65rem] font-black uppercase tracking-[.12em] text-violet-950/42">
              Mã phòng
            </span>
            <strong className="mt-1 block text-2xl tracking-[.12em] text-violet-950">
              {sessionCode}
            </strong>
            <p className="mt-1 text-xs text-violet-950/48">Chia sẻ để người chơi tham gia</p>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="glass-control flex items-center justify-between rounded-[var(--radius-lg)] border border-white/72 px-3 py-2.5 shadow-[var(--shadow-nav)] sm:px-4">
            <div className="lg:hidden">
              <Brand compact />
            </div>
            <div className="hidden lg:block">
              <span className="text-xs font-bold text-violet-950/42">MisThy Meme Party</span>
              <strong className="block text-sm text-violet-950">Bảng điều phối sự kiện</strong>
            </div>
            <div className="flex items-center gap-2">
              <GlassBadge icon={<Radio aria-hidden="true" size={12} />} tone="success">
                Trực tiếp
              </GlassBadge>
              <GlassButton aria-label="Thêm tùy chọn" size="icon" variant="ghost">
                <MoreHorizontal aria-hidden="true" size={19} />
              </GlassButton>
            </div>
          </header>

          <div className="py-6 sm:py-8">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <GlassBadge tone="violet">Bảng điều phối</GlassBadge>
                <h1 className="mt-3 text-3xl font-black tracking-[-.045em] text-violet-950 sm:text-4xl">
                  Chào buổi tiệc 👋
                </h1>
                <p className="mt-1.5 text-sm font-medium text-violet-950/52">
                  Vòng {mockRound.number} đang nhận meme · mọi hệ thống ổn định
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <GlassButton variant="glass">
                  <CirclePause aria-hidden="true" size={17} /> Tạm dừng
                </GlassButton>
                <GlassButton>
                  Chuyển tiết lộ <ArrowRight aria-hidden="true" size={17} />
                </GlassButton>
              </div>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: "Người chơi",
                  value: `${mockRound.players}`,
                  note: "27 đang online",
                  icon: Users,
                  tone: "bg-violet-100 text-violet-700",
                },
                {
                  label: "Meme đã gửi",
                  value: `${mockRound.submitted}`,
                  note: `${progress}% hoàn thành`,
                  icon: Activity,
                  tone: "bg-pink-100 text-pink-700",
                },
                {
                  label: "Chế độ",
                  value: "Cộng đồng",
                  note: "Khán giả bình chọn",
                  icon: Gamepad2,
                  tone: "bg-emerald-100 text-emerald-700",
                },
              ].map(({ label, value, note, icon: Icon, tone }) => (
                <GlassCard key={label} className="p-5" variant="solid">
                  <div className={`grid size-10 place-items-center rounded-2xl ${tone}`}>
                    <Icon aria-hidden="true" size={18} />
                  </div>
                  <span className="mt-5 block text-xs font-bold text-violet-950/45">{label}</span>
                  <strong className="mt-1 block text-2xl font-black tracking-[-.035em] text-violet-950">
                    {value}
                  </strong>
                  <span className="mt-1 block text-xs text-violet-950/46">{note}</span>
                </GlassCard>
              ))}
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
              <GlassCard className="p-5 sm:p-6" variant="solid">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <GlassBadge tone="danger">Đang diễn ra</GlassBadge>
                    <h2 className="mt-3 max-w-2xl text-xl font-black leading-snug tracking-[-.025em] text-violet-950 sm:text-2xl">
                      {mockRound.prompt}
                    </h2>
                  </div>
                  <div className="countdown">{mockRound.secondsLeft}</div>
                </div>
                <div className="mt-8 h-3 overflow-hidden rounded-full bg-violet-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-3 flex justify-between text-xs font-semibold text-violet-950/48">
                  <span>{mockRound.submitted} meme đã gửi</span>
                  <span>{progress}%</span>
                </div>
              </GlassCard>

              <GlassCard className="p-5 sm:p-6" variant="solid">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-violet-950/42">
                      Tiến độ chương trình
                    </span>
                    <strong className="mt-1 block text-xl font-black text-violet-950">
                      Vòng 1 / 5
                    </strong>
                  </div>
                  <span className="grid size-12 place-items-center rounded-full bg-violet-100 text-sm font-black text-violet-700">
                    20%
                  </span>
                </div>
                <div className="mt-6 grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((round) => (
                    <span
                      key={round}
                      className={`h-2 rounded-full ${round === 1 ? "bg-violet-600" : "bg-violet-100"}`}
                    />
                  ))}
                </div>
              </GlassCard>
            </div>

            <GlassCard className="mt-4 p-5 sm:p-6" variant="solid">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-violet-950">Người chơi gần đây</h2>
                  <p className="text-xs text-violet-950/45">Mock data cho kiểm tra giao diện</p>
                </div>
                <GlassButton size="small" variant="ghost">
                  Xem tất cả
                </GlassButton>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {mockPlayers.map((player, index) => (
                  <div
                    key={player.name}
                    className="flex items-center gap-3 rounded-2xl bg-violet-50/72 p-3"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-200 to-pink-200 text-xs font-black text-violet-800">
                      {player.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm text-violet-950">
                        {player.name}
                      </strong>
                      <span className="text-xs text-violet-950/44">{player.status}</span>
                    </div>
                    <span className="text-xs font-black text-violet-700">#{index + 1}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        </section>
      </div>
    </main>
  );
}
