import { useMemo } from "react";
import { BookOpen, Check, Copy, Grid2X2, RotateCcw, RotateCw, Trash2 } from "lucide-react";
import { useDocumentStore } from "../../store/documentStore";
import { useSelectionStore } from "../../store/selectionStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";

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

  const ids = useMemo(() => [...selected], [selected]);
  const hasSelection = ids.length > 0;
  const sourceCount = Object.keys(sources).length;
  const readerPageId = ids[0] ?? pages[0]?.id;

  return (
    <div className="flex h-16 shrink-0 items-center gap-2 overflow-x-auto border-b border-border bg-canvas-header px-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-[-0.01em]">Sayfalar</h2>
          {pages.length > 0 && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-text-dim tabular-nums">
              {pages.length}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[10px] text-text-soft">
          {sourceCount > 1 ? `${sourceCount} belge tek çalışma içinde` : "Kutuyla çoklu seç · sürükleyerek sırala"}
        </p>
      </div>

      <div className="ml-3 h-6 w-px bg-border" />
      <Button
        variant="primary"
        compact
        disabled={!readerPageId}
        icon={<BookOpen size={14} />}
        onClick={() => readerPageId && setPreviewPage(readerPageId)}
        title={hasSelection ? "Seçili sayfadan okumaya başla" : "PDF'i okumaya başla"}
      >
        Oku
      </Button>
      <button
        type="button"
        disabled={pages.length === 0}
        onClick={() => (hasSelection ? clearSelection() : setSelection(pages.map((page) => page.id)))}
        className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold text-text-dim hover:bg-surface hover:text-text disabled:opacity-35"
      >
        <Check size={13} />
        {hasSelection ? `${ids.length} seçili` : "Tümünü seç"}
      </button>

      {hasSelection && (
        <>
          <Button variant="ghost" compact icon={<RotateCcw size={14} />} onClick={() => rotatePages(ids, -90)} title="Sola döndür" aria-label="Sola döndür" />
          <Button variant="ghost" compact icon={<RotateCw size={14} />} onClick={() => rotatePages(ids, 90)} title="Sağa döndür" aria-label="Sağa döndür" />
          <Button variant="ghost" compact icon={<Copy size={14} />} onClick={() => duplicatePages(ids)} title="Çoğalt" aria-label="Çoğalt" />
          <Button variant="danger" compact icon={<Trash2 size={14} />} onClick={() => deletePages(ids)} title="Sil" aria-label="Sil" />
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
          aria-label="Sayfa kartı boyutu"
        />
        <span className="w-9 text-right text-[10px] text-text-soft tabular-nums">{thumbnailSize}</span>
      </div>
    </div>
  );
}
