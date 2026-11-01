import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "../components/app-shell";
import { ConnectionIndicator } from "../components/connection-indicator";
import { CountdownTimer } from "../components/countdown-timer";
import { FloatingActionBar } from "../components/floating-action-bar";
import { GlassBadge } from "../components/glass-badge";
import { GlassButton } from "../components/glass-button";
import { GlassInput } from "../components/glass-input";
import { MemeCard } from "../components/meme-card";
import { MemeGrid } from "../components/meme-grid";
import { QuestionCard } from "../components/question-card";
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

  return (
    <AppShell
      compactNav
      action={
        <div className="flex items-center gap-2">
          <ConnectionIndicator compact />
          <GlassBadge tone="violet">{sessionCode}</GlassBadge>
        </div>
      }
      bottomBar={
        <FloatingActionBar>
          <div className="min-w-0 flex-1 pl-2">
            <span className="block text-[.62rem] font-extrabold uppercase tracking-[.12em] text-[var(--ink-muted)]">
              Lựa chọn của bạn
            </span>
            <strong className="block truncate text-sm font-extrabold text-[var(--midnight)]">
              {selected?.title ?? "Chưa chọn meme"}
            </strong>
          </div>
          <GlassButton disabled={!selected} className="shrink-0 px-4">
            Chốt meme này
          </GlassButton>
        </FloatingActionBar>
      }
      className="pb-[calc(6rem+env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto max-w-xl py-4 sm:py-7">
        <header className="flex items-center justify-between gap-3 px-1">
          <div className="min-w-0">
            <GlassBadge tone="violet">
              Vòng {mockRound.number} / {mockRound.totalRounds}
            </GlassBadge>
            <h1 className="mt-2 text-[1.55rem] font-black leading-tight tracking-[-.035em] text-[var(--midnight)] min-[390px]:text-[1.72rem]">
              Chọn cú chốt của bạn
            </h1>
            <p className="mt-1 text-xs font-semibold text-[var(--ink-muted)]">
              Chạm vào meme hợp tình huống nhất
            </p>
          </div>
          <CountdownTimer seconds={mockRound.secondsLeft} />
        </header>

        <QuestionCard className="mt-4">{mockRound.prompt}</QuestionCard>

        <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2">
          <GlassInput
            label="Tìm meme"
            icon={<Search aria-hidden="true" size={16} />}
            placeholder="Tìm nhanh..."
            value={query}
            visuallyHideLabel
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="text-xs font-extrabold text-[var(--ink-muted)]">
            {visibleMemes.length} GIF
          </span>
        </div>

        <div className="-mx-3 mt-2.5 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((filter) => (
            <GlassButton
              key={filter}
              aria-pressed={activeFilter === filter}
              className="shrink-0"
              size="small"
              variant={activeFilter === filter ? "soft" : "ghost"}
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </GlassButton>
          ))}
        </div>

        <MemeGrid aria-label="Thư viện meme" className="mt-2.5">
          {visibleMemes.map((meme) => (
            <MemeCard
              key={meme.id}
              meme={meme}
              selected={selectedId === meme.id}
              onClick={() => setSelectedId(meme.id)}
            />
          ))}
        </MemeGrid>
      </div>
    </AppShell>
  );
}
