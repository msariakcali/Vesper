import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { useDocumentStore } from "../../store/documentStore";
import { useSelectionStore } from "../../store/selectionStore";
import { useUiStore } from "../../store/uiStore";
import { PageThumbnail } from "./PageThumbnail";
import { useTranslation } from "../../i18n";

/**
 * Sayfa ızgarası: seçim, sürükle-bırak sıralama ve tembel küçük resim yükleme.
 *
 * Sanallaştırma yerine IntersectionObserver ile tembel render tercih edildi —
 * asıl maliyet DOM düğümleri değil raster işlemiydi ve sanallaştırma dnd-kit'in
 * sıralama mantığıyla çakışıyor (görünmeyen öğeler DOM'da olmadığı için).
 */
export function PageGrid() {
  const pages = useDocumentStore((s) => s.model.pages);
  const sources = useDocumentStore((s) => s.model.sources);
  const reorderPages = useDocumentStore((s) => s.reorderPages);
  const movePagesTo = useDocumentStore((s) => s.movePagesTo);
  const rotatePages = useDocumentStore((s) => s.rotatePages);
  const deletePages = useDocumentStore((s) => s.deletePages);
  const duplicatePages = useDocumentStore((s) => s.duplicatePages);

  const selected = useSelectionStore((s) => s.selected);
  const selectOnly = useSelectionStore((s) => s.selectOnly);
  const selectRangeTo = useSelectionStore((s) => s.selectRangeTo);
  const toggleSelection = useSelectionStore((s) => s.toggle);
  const clearSelection = useSelectionStore((s) => s.clear);

  const thumbnailSize = useUiStore((s) => s.thumbnailSize);
  const setPreviewPage = useUiStore((s) => s.setPreviewPage);
  const selectionMode = useUiStore((s) => s.selectionMode);
  const { t } = useTranslation();

  const [draggingId, setDraggingId] = useState<string | null>(null);

  const orderedIds = useMemo(() => pages.map((page) => page.id), [pages]);
  const showSourceName = Object.keys(sources).length > 1;

  const sensors = useSensors(
    // Küçük hareketleri tıklama sayarak seçimin sürüklemeye dönüşmesini engelle.
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
  );

  const handleSelect = useCallback(
    (id: string, event: React.MouseEvent) => {
      if (event.shiftKey) selectRangeTo(id, orderedIds);
      else if (selectionMode || event.ctrlKey || event.metaKey) toggleSelection(id);
      else selectOnly(id);
    },
    [orderedIds, selectOnly, selectRangeTo, selectionMode, toggleSelection],
  );

  const handleToggle = useCallback((id: string) => toggleSelection(id), [toggleSelection]);
  const handlePreview = useCallback((id: string) => setPreviewPage(id), [setPreviewPage]);
  const handleRotateLeft = useCallback((id: string) => rotatePages([id], -90), [rotatePages]);
  const handleRotateRight = useCallback((id: string) => rotatePages([id], 90), [rotatePages]);
  const handleDuplicate = useCallback((id: string) => duplicatePages([id]), [duplicatePages]);
  const handleDelete = useCallback((id: string) => deletePages([id]), [deletePages]);

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setDraggingId(id);
    // Seçim dışındaki bir sayfa sürüklenirse seçim ona geçsin.
    if (!selected.has(id)) selectOnly(id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = orderedIds.indexOf(String(active.id));
    const to = orderedIds.indexOf(String(over.id));
    if (from === -1 || to === -1) return;

    // Çoklu seçim sürükleniyorsa tüm blok birlikte taşınır.
    if (selected.size > 1 && selected.has(String(active.id))) {
      movePagesTo([...selected], to);
    } else {
      reorderPages(from, to);
    }
  };

  const draggingPage = draggingId ? pages.find((page) => page.id === draggingId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={{ droppable: { strategy: MeasuringStrategy.BeforeDragging } }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDraggingId(null)}
    >
      <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
        <div
          className="page-grid grid min-h-full content-start justify-center gap-x-7 gap-y-7 p-5 sm:p-7 lg:p-9"
          style={{ gridTemplateColumns: `repeat(auto-fill, ${thumbnailSize}px)` }}
          // Boşluğa tıklamak seçimi temizler.
          onClick={(event) => {
            if (event.target === event.currentTarget && !selectionMode) clearSelection();
          }}
        >
          {pages.map((page, index) => {
            const source = sources[page.sourceId];
            if (!source) return null;
            return (
              <PageThumbnail
                key={page.id}
                page={page}
                source={source}
                number={index + 1}
                width={thumbnailSize}
                selected={selected.has(page.id)}
                selectionMode={selectionMode}
                showSourceName={showSourceName}
                onSelect={handleSelect}
                onToggle={handleToggle}
                onPreview={handlePreview}
                onRotateLeft={handleRotateLeft}
                onRotateRight={handleRotateRight}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      </SortableContext>

      {/* Sürüklenen sayfanın imleci takip eden hafif kopyası. */}
      <DragOverlay dropAnimation={null}>
        {draggingPage ? (
          <div
            className="grid place-items-center rounded-lg border-2 border-brand bg-surface text-xs font-bold text-brand shadow-[var(--shadow-float)]"
            style={{ width: thumbnailSize, height: thumbnailSize * 1.414 }}
          >
            {selected.size > 1 && selected.has(draggingPage.id)
              ? t("dragPages", { count: selected.size })
              : t("readerPage", { count: orderedIds.indexOf(draggingPage.id) + 1 })}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
