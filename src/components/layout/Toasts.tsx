import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { useUiStore } from "../../store/uiStore";

const ICONS = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
} as const;

const COLORS = {
  info: "text-text-dim",
  success: "text-ok",
  error: "text-danger",
} as const;

export function Toasts() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-10 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind];
        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex max-w-lg items-start gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs shadow-[var(--shadow-float)]"
            style={{ animation: "toast-in 160ms ease-out" }}
          >
            <Icon size={16} className={`mt-0.5 shrink-0 ${COLORS[toast.kind]}`} />
            <span className="break-words">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Kapat"
              className="mt-0.5 shrink-0 text-text-dim transition-colors hover:text-text"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
