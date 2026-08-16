import { memo, useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  Copy,
  Droplets,
  Hash,
  ImageIcon,
  Maximize2,
  PenTool,
  RotateCcw,
  RotateCw,
  Trash2,
  Type,
} from "lucide-react";
import { getCachedThumbnail, getThumbnail } from "../../core/render/thumbnailCache";
import type { Overlay, OverlayTool, PageRef, SourceDocument } from "../../core/model/types";
import { useTranslation } from "../../i18n";

interface Props {
  page: PageRef;
  source: SourceDocument;
  /** Belgedeki 1-tabanlı sıra numarası. */
  number: number;
  width: number;
  selected: boolean;
  selectionMode: boolean;
  /** Birden fazla kaynak açıkken sayfanın hangi dosyadan geldiğini göster. */
  showSourceName: boolean;
  onSelect: (id: string, event: React.MouseEvent) => void;
  onToggle: (id: string) => void;
  onPreview: (id: string) => void;
  onRotateLeft: (id: string) => void;
  onRotateRight: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

const disableLayoutAnimation = () => false;

/** Küçük resmin çözünürlüğü: retina ekranlarda bulanık görünmesin. */
function renderWidth(width: number): number {
  // 2x canvas'lar sürükleme sırasında GPU belleğini gereksiz büyütüyordu;
  // 1.5x, küçük resim netliğini korurken katman maliyetini ciddi azaltır.
  return Math.round(width * Math.min(1.5, window.devicePixelRatio || 1));
}

export const PageThumbnail = memo(function PageThumbnail({
  page,
  source,
  number,
  width,
  selected,
  selectionMode,
  showSourceName,
  onSelect,
  onToggle,
  onPreview,
  onRotateLeft,
  onRotateRight,
  onDuplicate,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [aspect, setAspect] = useState(1.414); // A4 dikey, ölçüler gelene kadar

  const { attributes, listeners, setNodeRef, transform, isDragging, isSorting } = useSortable({
    id: page.id,
    animateLayoutChanges: disableLayoutAnimation,
    transition: null,
  });

  const target = renderWidth(width);

  useEffect(() => {
    let cancelled = false;
    const element = containerRef.current;
    if (!element) return;

    const draw = (bitmap: ImageBitmap, w: number, h: number) => {
      if (cancelled) return;
      setAspect(h / w);
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
      setReady(true);
    };

    // Önbellekte varsa hiç beklemeden çiz — kaydırma sırasında titreme olmasın.
    const cached = getCachedThumbnail(source.id, page.sourceIndex, page.rotation, target);
    if (cached) {
      draw(cached.bitmap, cached.width, cached.height);
      return;
    }

    setReady(false);
    setFailed(false);

    // Yalnızca görünür alana girenleri render et; 500 sayfalık belgede
    // hepsini birden işlemek dakikalar sürerdi.
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        getThumbnail(source.id, source.bytes, page.sourceIndex, page.rotation, target)
          .then((thumb) => draw(thumb.bitmap, thumb.width, thumb.height))
          .catch(() => !cancelled && setFailed(true));
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(element);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [source.id, source.bytes, page.sourceIndex, page.rotation, target]);

  return (
    <div
      ref={setNodeRef}
      style={{
        width,
        transform: CSS.Transform.toString(
          transform ? { ...transform, x: Math.round(transform.x), y: Math.round(transform.y) } : null,
        ),
        opacity: isDragging ? 0.35 : 1,
        zIndex: isDragging ? 2 : undefined,
        contain: "layout paint style",
      }}
      className={`page-thumbnail group relative flex flex-col gap-2${isSorting ? " is-sorting" : ""}`}
    >
      <div
        ref={containerRef}
        {...attributes}
        {...listeners}
        onClick={(event) => onSelect(page.id, event)}
        onDoubleClick={() => onPreview(page.id)}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={`${t("page", { count: number })}. ${t("openReader")}.`}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(page.id, event as unknown as React.MouseEvent);
          }
        }}
        className={[
          "page-paper relative cursor-pointer overflow-hidden rounded-md border bg-white shadow-[0_2px_6px_rgb(22_27_38/0.10)]",
          "transition-[border-color,box-shadow,transform] duration-150 group-hover:-translate-y-0.5 group-hover:shadow-[0_12px_28px_rgb(22_27_38/0.14)]",
          selected
            ? "border-brand shadow-[0_0_0_3px_var(--accent-soft),0_12px_28px_rgb(22_27_38/0.13)]"
            : "border-border hover:border-brand/45",
        ].join(" ")}
        style={{ aspectRatio: `1 / ${aspect}` }}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full object-contain"
          style={{ opacity: ready ? 1 : 0, transition: "opacity 140ms" }}
        />

        {!ready && !failed && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-2">
            <div
              className="h-5 w-5 rounded-full border-2 border-border border-t-accent"
              style={{ animation: "spin 700ms linear infinite" }}
            />
          </div>
        )}

        {failed && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-2 p-2 text-center text-xs text-danger">
            {t("pageRenderFailed")}
          </div>
        )}

        {/* Sayfa numarası rozeti */}
        <span className="absolute left-2 top-2 min-w-6 rounded bg-[#1c2230]/78 px-1.5 py-1 text-center text-[9px] font-bold text-white shadow-sm tabular-nums backdrop-blur-sm">
          {String(number).padStart(2, "0")}
        </span>

        <button
          type="button"
          aria-label={t("pageSelectionLabel", {
            count: number,
            action: selected ? t("removeSelection") : t("addToSelection"),
          })}
          aria-pressed={selected}
          title={selected ? t("removeSelection") : t("addToSelection")}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(page.id);
          }}
          className={[
            "absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full border shadow-md transition",
            selected
              ? "border-brand bg-brand text-accent-text"
              : selectionMode
                ? "border-brand/45 bg-white/92 text-transparent"
                : "border-white/70 bg-white/88 text-transparent opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:border-brand hover:text-brand",
          ].join(" ")}
        >
          <Check size={13} strokeWidth={2.5} />
        </button>

        {/* Sayfanın üzerine gelince tek noktadan erişilen hızlı araç paleti. */}
        <div className="thumb-actions absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/70 via-black/30 to-transparent px-2 pb-2 pt-8 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-[#151922]/82 p-1 shadow-xl backdrop-blur-md">
            <ThumbAction label={t("openReader")} onClick={() => onPreview(page.id)}>
              <Maximize2 size={14} />
            </ThumbAction>
            <ThumbAction label={t("rotateLeft")} onClick={() => onRotateLeft(page.id)}>
              <RotateCcw size={14} />
            </ThumbAction>
            <ThumbAction label={t("rotateRight")} onClick={() => onRotateRight(page.id)}>
              <RotateCw size={14} />
            </ThumbAction>
            <ThumbAction label={t("duplicate")} onClick={() => onDuplicate(page.id)}>
              <Copy size={14} />
            </ThumbAction>
            <ThumbAction label={t("delete")} danger onClick={() => onDelete(page.id)}>
              <Trash2 size={14} />
            </ThumbAction>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-2 px-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={
              selected ? "shrink-0 text-[11px] font-bold text-brand" : "shrink-0 text-[11px] font-semibold text-text-dim"
            }
          >
            {t("page", { count: number })}
          </span>
          <PageOverlayIndicators overlays={page.overlays} />
        </div>
        {showSourceName && (
          <span className="min-w-0 truncate text-right text-[9px] text-text-soft" title={source.name}>
            {source.name}
          </span>
        )}
      </div>
    </div>
  );
});

function PageOverlayIndicators({ overlays }: { overlays: Overlay[] }) {
  const { t } = useTranslation();
  const summaries = summarizeOverlays(overlays);

  if (summaries.length === 0) return null;

  return (
    <div className="flex min-w-0 items-center gap-0.5" aria-label={t("appliedItems")}>
      {summaries.map(({ tool, count }) => {
        const label =
          tool === "signature"
            ? t("signature")
            : tool === "watermark"
              ? t("watermark")
              : tool === "pageNumber"
                ? t("pageNumbers")
                : tool === "image"
                  ? t("fromImage")
                  : t("text");

        return (
          <span
            key={tool}
            title={`${label} · ${count}`}
            aria-label={`${label} · ${count}`}
            className="grid h-5 min-w-5 place-items-center rounded border border-brand/15 bg-accent-soft px-1 text-brand"
          >
            <OverlayIcon tool={tool} />
          </span>
        );
      })}
    </div>
  );
}

function summarizeOverlays(overlays: Overlay[]): Array<{ tool: OverlayTool; count: number }> {
  const counts = new Map<OverlayTool, number>();

  overlays.forEach((overlay) => {
    const tool = overlay.tool ?? (overlay.kind === "image" ? "image" : "text");
    counts.set(tool, (counts.get(tool) ?? 0) + 1);
  });

  return [...counts].map(([tool, count]) => ({ tool, count }));
}

function OverlayIcon({ tool }: { tool: OverlayTool }) {
  if (tool === "signature") return <PenTool size={11} />;
  if (tool === "watermark") return <Droplets size={11} />;
  if (tool === "pageNumber") return <Hash size={11} />;
  if (tool === "image") return <ImageIcon size={11} />;
  return <Type size={11} />;
}

function ThumbAction({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      // Sürükleme ve seçim tetiklenmesin.
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={[
        "grid h-7 w-7 place-items-center rounded-[6px] text-white transition-colors",
        danger ? "hover:bg-danger" : "hover:bg-accent",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
