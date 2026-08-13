import type { ReactNode } from "react";
import { parsePageRange } from "../../core/ops/pageRange";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-[9px] font-bold tracking-[0.14em] text-text-soft uppercase">{title}</h3>
      {children}
    </div>
  );
}

export function PageRangeInput({
  value,
  onChange,
  pageCount,
}: {
  value: string;
  onChange: (value: string) => void;
  pageCount: number;
}) {
  const parsed = parsePageRange(value, pageCount);
  return (
    <>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={pageCount > 0 ? `1-${pageCount}` : "Sayfa aralığı"}
        spellCheck={false}
        className={[
          "h-9 w-full rounded-lg border bg-sidebar-header px-3 font-mono text-xs text-text",
          parsed.errors.length > 0 ? "border-danger" : "border-border",
        ].join(" ")}
      />
      {parsed.errors.length > 0 && (
        <p className="text-xs text-danger">Anlaşılmayan bölüm: {parsed.errors.join(", ")}</p>
      )}
    </>
  );
}

export function SegmentedButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        "min-h-9 rounded-lg border px-2 text-[10px] font-semibold transition-colors",
        selected
          ? "border-brand/40 bg-accent-soft text-brand"
          : "border-border bg-surface text-text-dim hover:text-text",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
