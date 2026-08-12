import { useMemo, useState } from "react";
import { SplitSquareHorizontal } from "lucide-react";
import { parsePageRange } from "../../core/ops/pageRange";
import { splitByRanges, splitEachPage, splitEveryN } from "../../core/ops/split";
import { useSplitExport } from "../../hooks/useSplit";
import { platform } from "../../platform";
import { useDocumentStore } from "../../store/documentStore";
import { Button } from "../ui/Button";

type SplitMode = "ranges" | "every" | "each";

export function SplitPanel() {
  const model = useDocumentStore((state) => state.model);
  const splitExport = useSplitExport();
  const [mode, setMode] = useState<SplitMode>("ranges");
  const [ranges, setRanges] = useState("");
  const [every, setEvery] = useState(5);

  const rangeErrors = useMemo(
    () =>
      ranges
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .flatMap((line) => parsePageRange(line, model.pages.length).errors),
    [model.pages.length, ranges],
  );

  const groups = useMemo(() => {
    if (mode === "ranges") return splitByRanges(model.pages, ranges);
    if (mode === "every") return splitEveryN(model.pages, every);
    return splitEachPage(model.pages);
  }, [every, mode, model.pages, ranges]);

  const invalid =
    model.pages.length === 0 ||
    groups.length === 0 ||
    rangeErrors.length > 0 ||
    (mode === "ranges" && ranges.trim() === "");
  const first = Object.values(model.sources)[0];

  return (
    <div className="flex flex-col gap-4">
      <Section title="Bölme yöntemi">
        <div className="grid grid-cols-1 gap-1.5">
          <ModeButton selected={mode === "ranges"} onClick={() => setMode("ranges")}>
            Aralıklara göre
          </ModeButton>
          <ModeButton selected={mode === "every"} onClick={() => setMode("every")}>
            Her N sayfada bir
          </ModeButton>
          <ModeButton selected={mode === "each"} onClick={() => setMode("each")}>
            Her sayfa ayrı dosya
          </ModeButton>
        </div>
      </Section>

      {mode === "ranges" && (
        <Section title="Her satıra bir aralık yazın">
          <textarea
            value={ranges}
            onChange={(event) => setRanges(event.target.value)}
            placeholder={"1-5\n6-10\n11-12"}
            spellCheck={false}
            rows={5}
            className={[
              "w-full resize-none rounded-md border bg-surface px-3 py-2 font-mono text-sm text-text",
              rangeErrors.length > 0 ? "border-danger" : "border-border",
            ].join(" ")}
          />
          {rangeErrors.length > 0 && (
            <p className="text-xs text-danger">Anlaşılmayan bölüm: {rangeErrors.join(", ")}</p>
          )}
        </Section>
      )}

      {mode === "every" && (
        <Section title="Sayfa sayısı">
          <input
            type="number"
            min={1}
            max={Math.max(1, model.pages.length)}
            value={every}
            onChange={(event) => setEvery(Math.max(1, Number(event.target.value) || 1))}
            className="h-9 w-full rounded-md border border-border bg-surface px-3 font-mono text-sm text-text"
          />
        </Section>
      )}

      <p className="text-xs text-text-dim">
        → {groups.length} dosya oluşacak
        {groups.length > 0 && ` (${groups.map((group) => group.pages.length).join(", ")} sayfa)`}
      </p>
      {platform.kind === "web" && (
        <p className="rounded-md bg-surface-2 px-2.5 py-2 text-xs text-text-dim">
          Tarayıcıda her dosya ayrı indirilecek.
        </p>
      )}
      <Button
        variant="primary"
        icon={<SplitSquareHorizontal size={15} />}
        disabled={invalid}
        onClick={() => void splitExport(groups, first?.name ?? "belge.pdf")}
      >
        Böl ve Klasöre Kaydet
      </Button>
    </div>
  );
}

function ModeButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        "h-9 rounded-md border px-3 text-left text-sm transition-colors",
        selected
          ? "border-accent bg-accent-soft text-accent"
          : "border-border bg-surface text-text-dim hover:text-text",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-text-dim uppercase">{title}</h3>
      {children}
    </div>
  );
}
