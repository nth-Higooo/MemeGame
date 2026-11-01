import { Sparkles } from "lucide-react";
import { getMessages } from "../i18n";

export function Brand({ compact = false }: { compact?: boolean }) {
  const { brand } = getMessages();
  return (
    <a className="inline-flex items-center gap-3" href="/" aria-label={brand.homeLabel}>
      <span className="grid size-11 rotate-[-5deg] place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-300/35">
        <Sparkles aria-hidden="true" size={21} />
      </span>
      {!compact && (
        <span className="leading-none">
          <strong className="block text-[1.05rem] font-extrabold tracking-[-0.035em] text-violet-950">{brand.name}</strong>
          <span className="mt-1 block text-[.7rem] font-bold uppercase tracking-[.25em] text-fuchsia-600">{brand.suffix}</span>
        </span>
      )}
    </a>
  );
}
