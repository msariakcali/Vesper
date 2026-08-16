import { useMemo } from "react";
import { Check, Copy, Eye, Grid2X2, ListChecks, RotateCcw, RotateCw, Trash2 } from "lucide-react";
import { useDocumentStore } from "../../store/documentStore";
import { useSelectionStore } from "../../store/selectionStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";
import { useTranslation } from "../../i18n";

/** Kanvasın üstündeki sayfa araç çubuğu: seçim, döndürme, çoğaltma, silme ve küçük resim boyutu. */
export function CanvasHeader() {
  const pages = useDocumentStore((state) => state.model.pages);
  const sources = useDocumentStore((state) => state.model.sources);
  const rotatePages = useDocumentStore((state) => state.rotatePages);
  const duplicatePages = useDocumentStore((state) => state.duplicatePages);
  const deletePages = useDocumentStore((state) => state.deletePages);
  const selected = useSelectionStore((state) => state.selected);
  const setSelection = useSelectionStore((state) => state.set);
  const clearSelection = useSelectionStore((state) => state.clear);
  const thumbnailSize = useUiStore((state) => state.thumbnailSize);
  const setThumbnailSize = useUiStore((state) => state.setThumbnailSize);
  const setPreviewPage = useUiStore((state) => state.setPreviewPage);
  const selectionMode = useUiStore((state) => state.selectionMode);
  const setSelectionMode = useUiStore((state) => state.setSelectionMode);
  const { t } = useTranslation();

  const ids = useMemo(() => [...selected], [selected]);
  const hasSelection = ids.length > 0;
  const allSelected = pages.length > 0 && ids.length === pages.length;
  const sourceCount = Object.keys(sources).length;
  const readerPageId = ids[0] ?? pages[0]?.id;

  return (
    <div className="canvas-toolbar flex h-[3.75rem] shrink-0 items-center gap-2 overflow-x-auto border-b border-border bg-canvas-header px-3 sm:px-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-bold tracking-[-0.01em]">{t("pages")}</h2>
          {pages.length > 0 && (
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-text-dim tabular-nums">
              {pages.length}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-text-soft">
          {sourceCount > 1 ? t("documentsInWorkspace", { count: sourceCount }) : t("selectAndReorder")}
        </p>
      </div>

      <div className="ml-2 h-6 w-px bg-border" />
      <Button
        variant="default"
        compact
        disabled={!readerPageId}
        icon={<Eye size={14} />}
        onClick={() => readerPageId && setPreviewPage(readerPageId)}
        title={hasSelection ? t("startReadingSelected") : t("startReading")}
      >
        {t("read")}
      </Button>

      <Button
        variant={selectionMode ? "primary" : "default"}
        compact
        disabled={pages.length === 0}
        icon={<ListChecks size={15} />}
        onClick={() => setSelectionMode(!selectionMode)}
        aria-pressed={selectionMode}
        title={selectionMode ? t("finishSelection") : t("selectPages")}
      >
        {selectionMode ? t("finishSelection") : t("selectPages")}
      </Button>

      {(selectionMode || hasSelection) && (
        <Button
          variant="ghost"
          compact
          icon={<Check size={14} />}
          onClick={() => (allSelected ? clearSelection() : setSelection(pages.map((page) => page.id)))}
        >
          {allSelected ? t("clearSelection") : t("selectAll")}
        </Button>
      )}

      {hasSelection && (
        <span className="rounded-lg bg-accent-soft px-2.5 py-1.5 text-[11px] font-bold text-brand tabular-nums">
          {t("selected", { count: ids.length })}
        </span>
      )}

      {hasSelection && (
        <>
          <Button variant="ghost" compact icon={<RotateCcw size={14} />} onClick={() => rotatePages(ids, -90)} title={t("rotateLeft")} aria-label={t("rotateLeft")} />
          <Button variant="ghost" compact icon={<RotateCw size={14} />} onClick={() => rotatePages(ids, 90)} title={t("rotateRight")} aria-label={t("rotateRight")} />
          <Button variant="ghost" compact icon={<Copy size={14} />} onClick={() => duplicatePages(ids)} title={t("duplicate")} aria-label={t("duplicate")} />
          <Button variant="danger" compact icon={<Trash2 size={14} />} onClick={() => deletePages(ids)} title={t("delete")} aria-label={t("delete")} />
        </>
      )}

      <div className="flex-1" />
      <div className="hidden items-center gap-2 sm:flex">
        <Grid2X2 size={13} className="text-text-soft" />
        <input
          type="range"
          min={120}
          max={320}
          step={10}
          value={thumbnailSize}
          onChange={(event) => setThumbnailSize(Number(event.target.value))}
          className="w-20 accent-[var(--brand)]"
          aria-label={t("pageCardSize")}
        />
        <span className="w-8 text-right text-[10px] text-text-soft tabular-nums">{thumbnailSize}</span>
      </div>
    </div>
  );
}
