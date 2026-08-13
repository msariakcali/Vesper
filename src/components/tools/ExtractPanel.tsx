import { useEffect, useMemo, useState } from "react";
import { Scissors, SquareDashed } from "lucide-react";
import { formatPageRange, parsePageRange } from "../../core/ops/pageRange";
import { useExtractSelection } from "../../hooks/useActions";
import { useDocumentStore } from "../../store/documentStore";
import { useSelectionStore } from "../../store/selectionStore";
import { Button } from "../ui/Button";
import { Section } from "./toolUi";
import { useTranslation } from "../../i18n";

/**
 * Sayfa ayıklama paneli — uygulamanın çekirdek akışı.
 *
 * Kullanıcı ya ızgaradan sayfa seçer ya da "3-7" gibi bir aralık yazar;
 * iki yol da aynı seçime bağlanır, böylece ne seçtiği her zaman ızgarada
 * görünür ve "Ayıkla" ile yeni bir PDF olarak kaydedilir.
 */
export function ExtractPanel() {
  const pages = useDocumentStore((s) => s.model.pages);
  const keepOnlyPages = useDocumentStore((s) => s.keepOnlyPages);
  const selected = useSelectionStore((s) => s.selected);
  const setSelection = useSelectionStore((s) => s.set);
  const extract = useExtractSelection();
  const { t } = useTranslation();

  const [text, setText] = useState("");
  /** Kutuya yazarken seçimi biz güncelliyoruz; geri yansımayı engellemek için işaret. */
  const [editing, setEditing] = useState(false);

  const selectedIndices = useMemo(
    () => pages.map((page, index) => (selected.has(page.id) ? index : -1)).filter((i) => i >= 0),
    [pages, selected],
  );

  // Izgaradan yapılan seçim kutuya yansısın (kullanıcı kutuda yazarken değil).
  useEffect(() => {
    if (!editing) setText(formatPageRange(selectedIndices));
  }, [selectedIndices, editing]);

  const parsed = useMemo(() => parsePageRange(text, pages.length), [text, pages.length]);

  const applyText = (value: string) => {
    setText(value);
    const { indices } = parsePageRange(value, pages.length);
    setSelection(indices.map((index) => pages[index]?.id).filter(Boolean) as string[]);
  };

  const count = selected.size;
  const disabled = count === 0;

  return (
    <div className="flex flex-col gap-4">
      <Section title={t("pageRange")}>
        <input
          value={text}
          onChange={(event) => applyText(event.target.value)}
          onFocus={() => setEditing(true)}
          onBlur={() => setEditing(false)}
          placeholder={t("pageRangePlaceholder")}
          spellCheck={false}
          className={[
            "h-9 w-full rounded-md border bg-surface px-3 font-mono text-sm text-text",
            "placeholder:font-sans placeholder:text-text-dim/70",
            parsed.errors.length > 0 ? "border-danger" : "border-border",
          ].join(" ")}
        />
        {parsed.errors.length > 0 ? (
          <p className="text-xs text-danger">{t("unrecognizedSection", { list: parsed.errors.join(", ") })}</p>
        ) : (
          <p className="text-xs text-text-dim">
            {t("gridOrTypeRangeHint")}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          <QuickPick label={t("quickPickAll")} onClick={() => applyText(`1-${pages.length}`)} />
          <QuickPick
            label={t("quickPickOdd")}
            onClick={() =>
              setSelection(pages.filter((_, index) => index % 2 === 0).map((page) => page.id))
            }
          />
          <QuickPick
            label={t("quickPickEven")}
            onClick={() =>
              setSelection(pages.filter((_, index) => index % 2 === 1).map((page) => page.id))
            }
          />
          <QuickPick label={t("clear")} onClick={() => applyText("")} />
        </div>
      </Section>

      <div className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
        {count === 0 ? (
          <span className="text-text-dim">{t("noPagesSelectedYet")}</span>
        ) : (
          <span>
            <strong className="text-accent tabular-nums">{t("pagesSelectedCount", { count })}</strong>
            <span className="text-text-dim"> {t("ofTotal", { total: pages.length })}</span>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          variant="primary"
          icon={<Scissors size={15} />}
          disabled={disabled}
          onClick={() => void extract()}
        >
          {t("extractAndSaveSelected")}
        </Button>
        <p className="px-0.5 text-xs text-text-dim">
          {t("extractSelectedHint")}
        </p>

        <Button
          icon={<SquareDashed size={15} />}
          disabled={disabled || count === pages.length}
          onClick={() => keepOnlyPages([...selected])}
        >
          {t("keepOnlySelected")}
        </Button>
        <p className="px-0.5 text-xs text-text-dim">
          {t("keepOnlySelectedHint")}
        </p>
      </div>
    </div>
  );
}

function QuickPick({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-border bg-surface px-2 py-1 text-xs text-text-dim transition-colors hover:border-accent/60 hover:text-text"
    >
      {label}
    </button>
  );
}
