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
    "bg-accent text-accent-text border-accent hover:brightness-110 disabled:hover:brightness-100",
  default: "bg-surface-2 text-text border-border hover:border-accent/60",
  ghost: "bg-transparent text-text-dim border-transparent hover:bg-surface-2 hover:text-text",
  danger: "bg-transparent text-danger border-transparent hover:bg-danger/10",
  topbar: "bg-transparent text-text-dim border-transparent hover:bg-surface-2 hover:text-text",
  brand: "bg-brand text-accent-text border-brand hover:bg-brand-strong disabled:hover:bg-brand",
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
        "inline-flex items-center justify-center gap-2 rounded-lg border text-[13px] font-medium",
        "transition-[background-color,border-color,color,transform] duration-150 select-none active:translate-y-px",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        compact ? "h-9 px-2.5" : "h-10 px-4",
        VARIANTS[variant],
        className,
      ].join(" ")}
    >
      {icon}
      {children && <span className="whitespace-nowrap">{children}</span>}
    </button>
  );
}
