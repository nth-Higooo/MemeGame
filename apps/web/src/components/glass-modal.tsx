import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { GlassButton } from "./glass-button";

export function GlassModal({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className="glass-modal m-auto w-[min(92vw,30rem)] rounded-[var(--radius-xl)] p-0 text-left text-violet-950 backdrop:bg-violet-950/20 backdrop:backdrop-blur-sm"
      onCancel={onClose}
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="glass-solid relative p-6 sm:p-7">
        <GlassButton
          aria-label="Đóng"
          className="absolute right-4 top-4"
          size="icon"
          variant="ghost"
          onClick={onClose}
        >
          <X aria-hidden="true" size={18} />
        </GlassButton>
        <h2 id={titleId} className="pr-12 text-2xl font-black tracking-[-.035em]">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="mt-2 text-sm leading-6 text-violet-950/60">
            {description}
          </p>
        )}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </dialog>
  );
}
