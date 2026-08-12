import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";
import { renderPage } from "../../core/render/pdfjs";
import type { Overlay } from "../../core/model/types";
import { useDocumentStore } from "../../store/documentStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";
import { TextSearch } from "./TextSearch";

export function PreviewModal() {
  const model = useDocumentStore((state) => state.model);
  const addOverlay = useDocumentStore((state) => state.addOverlay);
  const previewPageId = useUiStore((state) => state.previewPageId);
  const setPreviewPage = useUiStore((state) => state.setPreviewPage);
  const zoom = useUiStore((state) => state.previewZoom);
  const setZoom = useUiStore((state) => state.setPreviewZoom);
  const placementMode = useUiStore((state) => state.placementMode);
  const placementImage = useUiStore((state) => state.placementImage);
  const setPlacementMode = useUiStore((state) => state.setPlacementMode);
  const setPlacementImage = useUiStore((state) => state.setPlacementImage);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [rendering, setRendering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [renderSize, setRenderSize] = useState({ width: 1, height: 1 });
  const [textPoint, setTextPoint] = useState<{ x: number; y: number } | null>(null);
  const [text, setText] = useState("");
  const [textSize, setTextSize] = useState(18);
  const [textColor, setTextColor] = useState("#202020");

  const pageIndex = model.pages.findIndex((page) => page.id === previewPageId);
  const page = pageIndex >= 0 ? model.pages[pageIndex] : undefined;
  const source = page ? model.sources[page.sourceId] : undefined;

  const navigate = (index: number) => {
    const target = model.pages[Math.max(0, Math.min(model.pages.length - 1, index))];
    if (target) setPreviewPage(target.id);
  };

  const cancelPlacement = () => {
    setTextPoint(null);
    setPlacementMode(null);
    setPlacementImage(null);
  };

  const close = () => {
    cancelPlacement();
    setPreviewPage(null);
  };

  useEffect(() => {
    if (!page || !source) return;
    let cancelled = false;
    setRendering(true);
    setFailed(false);
    void renderPage(
      source.id,
      source.bytes,
      page.sourceIndex,
      { targetWidth: 900 * zoom },
      page.rotation,
    )
      .then((rendered) => {
        if (cancelled) {
          rendered.bitmap.close();
          return;
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = rendered.width;
        canvas.height = rendered.height;
        setRenderSize({ width: rendered.width, height: rendered.height });
        canvas.getContext("2d")?.drawImage(rendered.bitmap, 0, 0);
        rendered.bitmap.close();
      })
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setRendering(false));
    return () => {
      cancelled = true;
    };
  }, [page, source, zoom]);

  useEffect(() => setTextPoint(null), [page?.id]);

  const handlePageClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!placementMode || !page) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
    if (placementMode === "text") {
      setTextPoint(point);
      return;
    }
    if (!placementImage) return;
    const width = 0.25;
    const height = Math.min(
      0.5,
      (width * renderSize.width) / (placementImage.aspectRatio * renderSize.height),
    );
    addOverlay([page.id], {
      kind: "image",
      id: "template",
      data: placementImage.data,
      mime: placementImage.mime,
      x: point.x,
      y: point.y,
      width,
      height,
      opacity: 1,
      rotate: 0,
    });
    cancelPlacement();
  };

  const addText = () => {
    if (!textPoint || !text.trim() || !page) return;
    addOverlay([page.id], {
      kind: "text",
      id: "template",
      text: text.trim(),
      x: textPoint.x,
      y: textPoint.y,
      size: textSize,
      color: textColor,
      opacity: 1,
      rotate: 0,
    });
    setText("");
    cancelPlacement();
  };

  useEffect(() => {
    if (!previewPageId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const editing = /^(INPUT|TEXTAREA|SELECT)$/.test((event.target as HTMLElement | null)?.tagName ?? "");
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (editing) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigate(pageIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        navigate(pageIndex + 1);
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setZoom(zoom + 0.25);
      } else if (event.key === "-") {
        event.preventDefault();
        setZoom(zoom - 0.25);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pageIndex, previewPageId, setZoom, zoom]);

  if (!page || !source || pageIndex < 0) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-black/85 backdrop-blur-sm"
      onClick={close}
      onWheel={(event) => {
        if (!event.ctrlKey) return;
        event.preventDefault();
        setZoom(zoom + (event.deltaY < 0 ? 0.25 : -0.25));
      }}
    >
      <div
        className="flex min-h-13 items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2"
        onClick={(event) => event.stopPropagation()}
      >
        <Button
          variant="ghost"
          compact
          icon={<X size={18} />}
          onClick={close}
          aria-label="Önizlemeyi kapat"
        />
        <span className="shrink-0 text-sm tabular-nums">
          {pageIndex + 1} / {model.pages.length}
        </span>
        <div className="flex min-w-0 items-center justify-end gap-1">
          <Button
            variant="ghost"
            compact
            icon={<Minus size={15} />}
            disabled={zoom <= 0.5}
            onClick={() => setZoom(zoom - 0.25)}
            aria-label="Uzaklaştır"
          />
          <span className="w-12 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            compact
            icon={<Plus size={15} />}
            disabled={zoom >= 3}
            onClick={() => setZoom(zoom + 0.25)}
            aria-label="Yakınlaştır"
          />
          <TextSearch
            ref={searchRef}
            model={model}
            currentPageIndex={pageIndex}
            onNavigate={navigate}
          />
        </div>
      </div>

      {placementMode && (
        <div className="absolute left-1/2 top-16 z-20 -translate-x-1/2 rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-text shadow-lg">
          {placementMode === "text"
            ? "Metnin yerleşeceği noktaya tıklayın"
            : "İmzanın yerleşeceği noktaya tıklayın"}
        </div>
      )}
      <div className="relative min-h-0 flex-1 overflow-auto p-12" onClick={(event) => event.stopPropagation()}>
        <div className="flex min-h-full min-w-full items-center justify-center">
          <div
            className="relative shrink-0 shadow-2xl"
            style={{ width: renderSize.width, height: renderSize.height }}
          >
            <canvas
              ref={canvasRef}
              onClick={handlePageClick}
              className={[
                "block bg-white",
                placementMode ? "cursor-crosshair" : "cursor-default",
              ].join(" ")}
            />
            {page.overlays.map((overlay) => (
              <OverlayPreview
                key={overlay.id}
                overlay={overlay}
                canvasWidth={renderSize.width}
              />
            ))}
            {textPoint && placementMode === "text" && (
              <div
                className="absolute z-10 w-56 rounded-md border border-border bg-surface p-2 shadow-xl"
                style={{
                  left: `${Math.min(0.75, textPoint.x) * 100}%`,
                  top: `${Math.min(0.82, textPoint.y) * 100}%`,
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <input
                  autoFocus
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Metin"
                  className="h-8 w-full rounded border border-border bg-surface-2 px-2 text-sm text-text"
                />
                <div className="mt-2 grid grid-cols-[1fr_3rem] gap-2">
                  <input
                    type="number"
                    min={6}
                    max={120}
                    value={textSize}
                    onChange={(event) => setTextSize(Number(event.target.value) || 18)}
                    className="h-8 rounded border border-border bg-surface-2 px-2 font-mono text-sm text-text"
                    aria-label="Metin boyutu"
                  />
                  <input
                    type="color"
                    value={textColor}
                    onChange={(event) => setTextColor(event.target.value)}
                    className="h-8 w-full"
                    aria-label="Metin rengi"
                  />
                </div>
                <div className="mt-2 flex justify-end gap-1">
                  <Button variant="ghost" compact onClick={cancelPlacement}>İptal</Button>
                  <Button variant="primary" compact disabled={!text.trim()} onClick={addText}>Ekle</Button>
                </div>
              </div>
            )}
          </div>
        </div>
        {rendering && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="h-8 w-8 rounded-full border-2 border-white/30 border-t-white [animation:spin_700ms_linear_infinite]" />
          </div>
        )}
        {failed && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-white">
            Sayfa görüntülenemedi.
          </div>
        )}
        <button
          type="button"
          className="fixed left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60 disabled:opacity-30"
          disabled={pageIndex === 0}
          onClick={() => navigate(pageIndex - 1)}
          aria-label="Önceki sayfa"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          type="button"
          className="fixed right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60 disabled:opacity-30"
          disabled={pageIndex === model.pages.length - 1}
          onClick={() => navigate(pageIndex + 1)}
          aria-label="Sonraki sayfa"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}

function OverlayPreview({
  overlay,
  canvasWidth,
}: {
  overlay: Overlay;
  canvasWidth: number;
}) {
  if (overlay.kind === "text") {
    return (
      <span
        className="pointer-events-none absolute origin-bottom-left whitespace-pre text-black"
        style={{
          left: `${overlay.x * 100}%`,
          top: `${overlay.y * 100}%`,
          fontFamily: "Noto Sans, sans-serif",
          fontSize: `${(overlay.size * canvasWidth) / 595.28}px`,
          lineHeight: 1,
          color: overlay.color,
          opacity: overlay.opacity,
          transform: `translateY(-100%) rotate(${-overlay.rotate}deg)`,
        }}
      >
        {overlay.text}
      </span>
    );
  }
  return <ImageOverlayPreview overlay={overlay} />;
}

function ImageOverlayPreview({ overlay }: { overlay: Extract<Overlay, { kind: "image" }> }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(
      new Blob([overlay.data.slice().buffer as ArrayBuffer], { type: overlay.mime }),
    );
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [overlay.data, overlay.mime]);
  if (!url) return null;
  return (
    <img
      src={url}
      alt="Yerleştirilen görsel"
      className="pointer-events-none absolute origin-top-left object-contain"
      style={{
        left: `${overlay.x * 100}%`,
        top: `${overlay.y * 100}%`,
        width: `${overlay.width * 100}%`,
        height: `${overlay.height * 100}%`,
        opacity: overlay.opacity,
        transform: `rotate(${-overlay.rotate}deg)`,
      }}
    />
  );
}
