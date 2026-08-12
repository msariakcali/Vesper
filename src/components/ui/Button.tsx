import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "default" | "ghost" | "danger";

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
        "inline-flex items-center justify-center gap-2 rounded-md border font-medium",
        "transition-colors duration-100 select-none",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        compact ? "h-8 px-2" : "h-9 px-3",
        VARIANTS[variant],
        className,
      ].join(" ")}
    >
      {icon}
      {children && <span className="whitespace-nowrap">{children}</span>}
    </button>
  );
}
