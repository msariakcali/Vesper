import { useMemo, useState } from "react";
import { Hash } from "lucide-react";
import type { Overlay } from "../../core/model/types";
import { parsePageRange } from "../../core/ops/pageRange";
import { useDocumentStore } from "../../store/documentStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";
import { PageRangeInput, Section, SegmentedButton } from "./toolUi";

type Position = `${"top" | "middle" | "bottom"}-${"left" | "center" | "right"}`;
type NumberFormat = "{n}" | "{n} / {total}" | "Sayfa {n}";

const POSITION_LABELS: Array<{ id: Position; label: string }> = [
  { id: "top-left", label: "↖" },
  { id: "top-center", label: "↑" },
  { id: "top-right", label: "↗" },
  { id: "middle-left", label: "←" },
  { id: "middle-center", label: "·" },
  { id: "middle-right", label: "→" },
  { id: "bottom-left", label: "↙" },
  { id: "bottom-center", label: "↓" },
  { id: "bottom-right", label: "↘" },
];

function overlayPosition(position: Position, text: string, size: number) {
  const [vertical, horizontal] = position.split("-");
  const estimatedWidth = (text.length * size * 0.52) / 595.28;
  const x = horizontal === "left" ? 0.06 : horizontal === "center" ? 0.5 - estimatedWidth / 2 : 0.94 - estimatedWidth;
  const y = vertical === "top" ? 0.043 : vertical === "middle" ? 0.5 : 0.957;
  return { x: Math.max(0.02, x), y };
}

export function PageNumberPanel() {
  const pages = useDocumentStore((state) => state.model.pages);
  const addOverlayPerPage = useDocumentStore((state) => state.addOverlayPerPage);
  const notify = useUiStore((state) => state.notify);
  const [position, setPosition] = useState<Position>("bottom-center");
  const [format, setFormat] = useState<NumberFormat>("{n}");
  const [start, setStart] = useState(1);
  const [size, setSize] = useState(11);
  const [color, setColor] = useState("#202020");
  const [range, setRange] = useState(() => (pages.length ? `1-${pages.length}` : ""));
  const parsed = useMemo(() => parsePageRange(range, pages.length), [pages.length, range]);

  const apply = () => {
    const entries = parsed.indices.map((pageIndex, selectedIndex) => {
      const text = format
        .replace("{n}", String(start + selectedIndex))
        .replace("{total}", String(pages.length));
      const coords = overlayPosition(position, text, size);
      const overlay: Overlay = {
        kind: "text",
        id: "template",
        text,
        ...coords,
        size,
        color,
        opacity: 1,
        rotate: 0,
      };
      return { pageId: pages[pageIndex].id, overlay };
    });
    addOverlayPerPage(entries);
    notify("success", `${entries.length} sayfaya numara eklendi.`);
  };

  return (
    <div className="flex flex-col gap-5">
      <Section title="Konum">
        <div className="grid w-24 grid-cols-3 gap-1">
          {POSITION_LABELS.map((item) => (
            <button
              key={item.id}
              type="button"
              title={item.id}
              aria-pressed={position === item.id}
              onClick={() => setPosition(item.id)}
              className={[
                "h-7 w-7 rounded border text-sm",
                position === item.id
                  ? "border-accent bg-accent text-accent-text"
                  : "border-border bg-surface text-text-dim",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="Biçim">
        <div className="grid grid-cols-3 gap-1">
          {(["{n}", "{n} / {total}", "Sayfa {n}"] as NumberFormat[]).map((item) => (
            <SegmentedButton key={item} selected={format === item} onClick={() => setFormat(item)}>
              {item.replace("{n}", "1").replace("{total}", String(pages.length || 20))}
            </SegmentedButton>
          ))}
        </div>
        <label className="grid grid-cols-[5rem_1fr] items-center gap-2 text-xs text-text-dim">
          Başlangıç
          <input
            type="number"
            value={start}
            onChange={(event) => setStart(Number(event.target.value) || 1)}
            className="h-9 rounded-md border border-border bg-surface px-3 font-mono text-sm text-text"
          />
        </label>
        <label className="grid grid-cols-[5rem_1fr_3rem] items-center gap-2 text-xs text-text-dim">
          Boyut
          <input
            type="range"
            min={7}
            max={32}
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
            className="w-full accent-[var(--accent)]"
          />
          <span className="text-right font-mono text-text">{size}pt</span>
        </label>
        <label className="flex items-center justify-between text-xs text-text-dim">
          Renk
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
        </label>
      </Section>
      <Section title="Uygulanacak sayfalar">
        <PageRangeInput value={range} onChange={setRange} pageCount={pages.length} />
      </Section>
      <Button
        variant="primary"
        icon={<Hash size={15} />}
        disabled={parsed.indices.length === 0 || parsed.errors.length > 0}
        onClick={apply}
      >
        Sayfa Numaralarını Ekle
      </Button>
    </div>
  );
}
