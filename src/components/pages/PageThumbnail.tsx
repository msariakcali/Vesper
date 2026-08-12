import { memo, useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, Maximize2, RotateCcw, RotateCw, Trash2 } from "lucide-react";
import { getCachedThumbnail, getThumbnail } from "../../core/render/thumbnailCache";
import type { PageRef, SourceDocument } from "../../core/model/types";

interface Props {
  page: PageRef;
  source: SourceDocument;
  /** Belgedeki 1-tabanlı sıra numarası. */
  number: number;
  width: number;
  selected: boolean;
  /** Birden fazla kaynak açıkken sayfanın hangi dosyadan geldiğini göster. */
  showSourceName: boolean;
  onSelect: (event: React.MouseEvent) => void;
  onPreview: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/** Küçük resmin çözünürlüğü: retina ekranlarda bulanık görünmesin. */
function renderWidth(width: number): number {
  return Math.round(width * Math.min(2, window.devicePixelRatio || 1));
}

export const PageThumbnail = memo(function PageThumbnail({
  page,
  source,
  number,
  width,
  selected,
  showSourceName,
  onSelect,
  onPreview,
  onRotateLeft,
  onRotateRight,
  onDuplicate,
  onDelete,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [aspect, setAspect] = useState(1.414); // A4 dikey, ölçüler gelene kadar

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: page.id,
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
      { rootMargin: "600px 0px" },
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
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
      }}
      className="group relative flex flex-col gap-1.5"
    >
      <div
        ref={containerRef}
        {...attributes}
        {...listeners}
        onClick={onSelect}
        onDoubleClick={onPreview}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={`Sayfa ${number}`}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(event as unknown as React.MouseEvent);
          }
        }}
        className={[
          "relative overflow-hidden rounded-xl border-2 bg-white cursor-pointer shadow-sm",
          "transition-[border-color,box-shadow,transform] duration-150 group-hover:-translate-y-0.5 group-hover:shadow-lg",
          selected
            ? "border-accent shadow-[0_0_0_3px_var(--accent-soft)]"
            : "border-border hover:border-accent/50",
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
            Sayfa görüntülenemedi
          </div>
        )}

        {/* Sayfa numarası rozeti */}
        <span
          className={[
            "absolute left-1.5 top-1.5 min-w-6 rounded px-1.5 py-0.5 text-center",
            "text-[11px] font-semibold tabular-nums",
            selected ? "bg-accent text-accent-text" : "bg-black/55 text-white",
          ].join(" ")}
        >
          {number}
        </span>

        {/* Sayfanın üzerine gelince tek noktadan erişilen hızlı araç paleti. */}
        <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/65 via-black/30 to-transparent px-2 pb-2 pt-8 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <div className="flex items-center gap-1 rounded-lg border border-white/15 bg-black/55 p-1 shadow-xl backdrop-blur-md">
          <ThumbAction label="Büyüt" onClick={onPreview}>
            <Maximize2 size={14} />
          </ThumbAction>
          <ThumbAction label="Sola döndür" onClick={onRotateLeft}>
            <RotateCcw size={14} />
          </ThumbAction>
          <ThumbAction label="Sağa döndür" onClick={onRotateRight}>
            <RotateCw size={14} />
          </ThumbAction>
          <ThumbAction label="Çoğalt" onClick={onDuplicate}>
            <Copy size={14} />
          </ThumbAction>
          <ThumbAction label="Sayfayı sil" danger onClick={onDelete}>
            <Trash2 size={14} />
          </ThumbAction>
          </div>
        </div>
      </div>

      {showSourceName && (
        <span className="truncate px-0.5 text-[11px] text-text-dim" title={source.name}>
          {source.name}
        </span>
      )}
    </div>
  );
});

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
        "grid h-7 w-7 place-items-center rounded-md text-white transition-colors",
        danger ? "hover:bg-danger" : "hover:bg-accent",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
