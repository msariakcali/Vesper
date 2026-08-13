import { memo, useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Copy, Maximize2, RotateCcw, RotateCw, Trash2 } from "lucide-react";
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
      className="group relative flex flex-col gap-2"
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
        aria-label={`Sayfa ${number}. Okumak için çift tıklayın.`}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(event as unknown as React.MouseEvent);
          }
        }}
        className={[
          "relative cursor-pointer overflow-hidden rounded-lg border bg-white shadow-[0_2px_7px_rgb(31_30_41/0.08)]",
          "transition-[border-color,box-shadow,transform] duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_14px_32px_rgb(31_30_41/0.14)]",
          selected
            ? "border-brand shadow-[0_0_0_3px_var(--accent-soft),0_14px_32px_rgb(31_30_41/0.12)]"
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
            Sayfa görüntülenemedi
          </div>
        )}

        {/* Sayfa numarası rozeti */}
        <span className="absolute left-2 top-2 min-w-6 rounded-md bg-black/58 px-1.5 py-1 text-center text-[9px] font-bold text-white shadow-sm tabular-nums backdrop-blur-sm">
          {String(number).padStart(2, "0")}
        </span>

        {selected && (
          <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-brand text-white shadow-md">
            <Check size={13} strokeWidth={2.5} />
          </span>
        )}

        {/* Sayfanın üzerine gelince tek noktadan erişilen hızlı araç paleti. */}
        <div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/65 via-black/30 to-transparent px-2 pb-2 pt-8 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <div className="flex items-center gap-1 rounded-xl border border-white/15 bg-[#1f1e29]/82 p-1 shadow-xl backdrop-blur-md">
            <ThumbAction label="Okuma modunda aç" onClick={onPreview}>
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

      <div className="flex min-w-0 items-center justify-between gap-2 px-0.5">
        <span className={selected ? "text-[10px] font-bold text-brand" : "text-[10px] font-semibold text-text-dim"}>
          Sayfa {number}
        </span>
        {showSourceName && (
          <span className="min-w-0 truncate text-right text-[9px] text-text-soft" title={source.name}>
            {source.name}
          </span>
        )}
      </div>
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
