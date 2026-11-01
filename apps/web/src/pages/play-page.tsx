import { Check, Search, Wifi } from "lucide-react";
import { AppShell } from "../components/app-shell";
import { GlassCard } from "../components/glass-card";
import { Button } from "../components/ui/button";

const memes = ["Ủa alo?", "Hết cứu", "Quá dữ", "Tỉnh táo lên"];

export function PlayPage({ sessionCode }: { sessionCode: string }) {
  return (
    <AppShell
      action={
        <span className="status-pill">
          <Wifi size={13} /> {sessionCode}
        </span>
      }
    >
      <div className="mx-auto max-w-lg py-8 sm:py-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="eyebrow">Vòng 1 · còn 24 giây</span>
            <h1 className="mt-3 text-3xl font-black tracking-[-.04em] text-violet-950">
              Chọn cú chốt của bạn
            </h1>
          </div>
          <div className="countdown" aria-label="Còn 24 giây">
            24
          </div>
        </div>
        <GlassCard className="mt-6 p-5">
          <p className="text-sm font-bold text-fuchsia-600">TÌNH HUỐNG</p>
          <p className="mt-2 text-xl font-bold leading-snug text-violet-950">
            Khi admin bảo “chương trình hôm nay đơn giản lắm”...
          </p>
        </GlassCard>
        <label className="mt-5 flex min-h-12 items-center gap-3 rounded-full border border-white/70 bg-white/55 px-4 text-violet-950/50 shadow-sm backdrop-blur-xl">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Tìm meme</span>
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-violet-950/40"
            placeholder="Tìm trong kho meme MisThy"
          />
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {memes.map((meme, index) => (
            <button key={meme} className="meme-tile group" aria-label={`Chọn meme ${meme}`}>
              <span>{["😳", "🫠", "💅", "👀"][index]}</span>
              <strong>{meme}</strong>
              {index === 0 && (
                <i>
                  <Check size={14} />
                </i>
              )}
            </button>
          ))}
        </div>
        <Button className="mt-5 w-full" size="large">
          Chốt meme này
        </Button>
      </div>
    </AppShell>
  );
}
