import { getMessages } from "../i18n";

export function Brand({ compact = false }: { compact?: boolean }) {
  const { brand } = getMessages();
  return (
    <a className="inline-flex items-center gap-3" href="/" aria-label={brand.homeLabel}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 44 44">
          <path d="M22 5c.6 8.8 4.2 12.4 13 13-8.8.6-12.4 4.2-13 13-.6-8.8-4.2-12.4-13-13 8.8-.6 12.4-4.2 13-13Z" />
          <circle cx="34.5" cy="8.5" r="2.5" />
          <circle cx="9" cy="33" r="2" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-none">
          <strong className="brand-name">{brand.name}</strong>
          <span className="brand-suffix">{brand.suffix}</span>
        </span>
      )}
    </a>
  );
}
