import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "default" | "ghost" | "danger" | "topbar" | "brand";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
  /** Dar araç çubuklarında yalnızca ikon göstermek için. */
  compact?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-accent-text border-brand hover:bg-brand-strong disabled:hover:bg-brand",
  default: "bg-surface text-text border-border shadow-xs hover:border-brand/35 hover:bg-surface-2",
  ghost: "bg-transparent text-text-dim border-transparent hover:bg-surface-2 hover:text-text",
  danger: "bg-transparent text-danger border-transparent hover:bg-danger/10",
  topbar: "bg-transparent text-text-dim border-transparent hover:bg-surface-2 hover:text-text",
  brand: "bg-brand text-accent-text border-brand shadow-sm hover:bg-brand-strong disabled:hover:bg-brand",
};

export function Button({
  variant = "default",
  icon,
  compact = false,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg border text-[12px] font-semibold",
        "transition-[background-color,border-color,color,transform] duration-150 select-none active:translate-y-px",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        compact ? "h-8 px-2.5" : "h-9 px-3.5",
        VARIANTS[variant],
        className,
      ].join(" ")}
    >
      {icon}
      {children && <span className="whitespace-nowrap">{children}</span>}
    </button>
  );
}
