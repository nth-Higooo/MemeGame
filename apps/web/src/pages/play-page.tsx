import { Clock3, Search, Sparkles, Wifi } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "../components/app-shell";
import { GlassBadge } from "../components/glass-badge";
import { GlassButton } from "../components/glass-button";
import { GlassCard } from "../components/glass-card";
import { GlassInput } from "../components/glass-input";
import { MemeCard } from "../components/meme-card";
import { mockMemes, mockRound } from "../data/mock-data";

const filters = ["Tất cả", "Phản ứng", "Bất lực", "Slay"];

export function PlayPage({ sessionCode }: { sessionCode: string }) {
  const [selectedId, setSelectedId] = useState(mockMemes[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const visibleMemes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return mockMemes.filter((meme) => {
      const matchesQuery = meme.title.toLowerCase().includes(normalizedQuery);
      const matchesFilter =
        activeFilter === "Tất cả" ||
        meme.tag === activeFilter ||
        (activeFilter === "Phản ứng" &&
          ["Bất ngờ", "Quan sát", "Năn nỉ", "Vô tội"].includes(meme.tag));
      return matchesQuery && matchesFilter;
    });
  }, [activeFilter, query]);
  const selected = mockMemes.find((meme) => meme.id === selectedId);
  const bottomBar = (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
      <div className="glass-control mx-auto flex max-w-xl items-center gap-3 rounded-[1.55rem] border border-white/72 p-2 shadow-[var(--shadow-nav)]">
        <div className="min-w-0 flex-1 pl-2">
          <span className="block text-[.65rem] font-bold uppercase tracking-[.11em] text-violet-950/45">
            Đang chọn
          </span>
          <strong className="block truncate text-sm font-black text-violet-950">
            {selected?.title ?? "Chưa chọn meme"}
          </strong>
        </div>
        <GlassButton disabled={!selected} className="shrink-0 px-5">
          Chốt meme
        </GlassButton>
      </div>
    </div>
  );

  return (
    <AppShell
      bottomBar={bottomBar}
      compactNav
      action={
        <GlassBadge icon={<Wifi aria-hidden="true" size={12} />} tone="success">
          {sessionCode}
        </GlassBadge>
      }
      className="pb-[calc(6.5rem+env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto max-w-xl py-5 sm:py-8">
        <header className="flex items-start justify-between gap-3 px-1">
          <div className="min-w-0 pt-1">
            <GlassBadge icon={<Clock3 aria-hidden="true" size={11} />} tone="violet">
              Vòng {mockRound.number}/{mockRound.totalRounds}
            </GlassBadge>
            <h1 className="mt-3 text-[1.8rem] font-black leading-[1.05] tracking-[-.045em] text-violet-950 min-[390px]:text-[2.05rem]">
              Chọn cú chốt của bạn
            </h1>
            <p className="mt-1.5 text-sm font-medium text-violet-950/52">
              Chạm một meme để xem lựa chọn
            </p>
          </div>
          <div className="countdown" aria-label={`Còn ${mockRound.secondsLeft} giây`}>
            {mockRound.secondsLeft}
          </div>
        </header>

        <GlassCard className="mt-5 p-4 min-[390px]:p-5" variant="solid">
          <div className="flex items-center gap-2 text-[.66rem] font-black uppercase tracking-[.14em] text-fuchsia-700">
            <Sparkles aria-hidden="true" size={13} /> Tình huống
          </div>
          <p className="mt-2 text-[1.08rem] font-extrabold leading-snug tracking-[-.02em] text-violet-950 min-[390px]:text-xl">
            {mockRound.prompt}
          </p>
        </GlassCard>

        <div className="mt-4">
          <GlassInput
            label="Tìm meme"
            icon={<Search aria-hidden="true" size={17} />}
            placeholder="Tìm trong kho meme..."
            value={query}
            visuallyHideLabel
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="-mx-3 mt-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((filter) => (
            <GlassButton
              key={filter}
              aria-pressed={activeFilter === filter}
              className="shrink-0"
              size="small"
              variant={activeFilter === filter ? "soft" : "glass"}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </GlassButton>
          ))}
        </div>

        <section
          aria-label="Thư viện meme"
          className="mt-3 grid grid-cols-2 gap-2.5 min-[390px]:gap-3"
        >
          {visibleMemes.map((meme) => (
            <MemeCard
              key={meme.id}
              meme={meme}
              selected={selectedId === meme.id}
              onClick={() => setSelectedId(meme.id)}
            />
          ))}
        </section>
      </div>
    </AppShell>
  );
}
