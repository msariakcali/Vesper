import { useMemo, useState } from "react";
import { Droplets } from "lucide-react";
import { parsePageRange } from "../../core/ops/pageRange";
import type { Overlay } from "../../core/model/types";
import { useDocumentStore } from "../../store/documentStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";
import { PageRangeInput, Section } from "./toolUi";
import { useTranslation } from "../../i18n";

export function WatermarkPanel() {
  const pages = useDocumentStore((state) => state.model.pages);
  const addOverlay = useDocumentStore((state) => state.addOverlay);
  const notify = useUiStore((state) => state.notify);
  const [text, setText] = useState("GİZLİ");
  const [size, setSize] = useState(48);
  const [color, setColor] = useState("#808080");
  const [opacity, setOpacity] = useState(0.3);
  const [angle, setAngle] = useState(45);
  const [range, setRange] = useState(() => (pages.length ? `1-${pages.length}` : ""));
  const parsed = useMemo(() => parsePageRange(range, pages.length), [pages.length, range]);
  const { t } = useTranslation();

  const apply = () => {
    const ids = parsed.indices.map((index) => pages[index]?.id).filter(Boolean) as string[];
    const approximateWidth = (text.length * size * 0.52) / 595.28;
    const overlay: Overlay = {
      kind: "text",
      id: "template",
      text,
      x: Math.max(0.03, 0.5 - approximateWidth / 2),
      y: 0.5,
      size,
      color,
      opacity,
      rotate: angle,
    };
    addOverlay(ids, overlay);
    notify("success", t("watermarkApplied", { count: ids.length }));
  };

  return (
    <div className="flex flex-col gap-5">
      <Section title={t("text")}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text"
        />
      </Section>
      <Section title={t("appearance")}>
        <Slider label={t("size")} value={size} suffix="pt" min={12} max={120} onChange={setSize} />
        <label className="flex items-center justify-between gap-3 text-xs text-text-dim">
          {t("color")}
          <span className="flex items-center gap-2">
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
            <span className="font-mono">{color}</span>
          </span>
        </label>
        <Slider
          label={t("opacity")}
          value={Math.round(opacity * 100)}
          suffix="%"
          min={0}
          max={100}
          onChange={(value) => setOpacity(value / 100)}
        />
        <Slider label={t("angle")} value={angle} suffix="°" min={-90} max={90} onChange={setAngle} />
      </Section>
      <Section title={t("pagesToApply")}>
        <PageRangeInput value={range} onChange={setRange} pageCount={pages.length} />
      </Section>
      <Button
        variant="primary"
        icon={<Droplets size={15} />}
        disabled={!text.trim() || parsed.indices.length === 0 || parsed.errors.length > 0}
        onClick={apply}
      >
        {t("applyWatermark")}
      </Button>
    </div>
  );
}

function Slider({
  label,
  value,
  suffix,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid grid-cols-[5rem_1fr_3rem] items-center gap-2 text-xs text-text-dim">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[var(--accent)]"
      />
      <span className="text-right font-mono text-text">{value}{suffix}</span>
    </label>
  );
}
