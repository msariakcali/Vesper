import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, FileText, Minus, Plus, X } from "lucide-react";
import { renderPage } from "../../core/render/pdfjs";
import type { Overlay, PageRef, SourceDocument } from "../../core/model/types";
import { useDocumentStore } from "../../store/documentStore";
import { useUiStore, type PlacementImage, type PlacementMode } from "../../store/uiStore";
import { Button } from "../ui/Button";
import { TextSearch } from "./TextSearch";

function readerRenderWidth(zoom: number): number {
  // Varsayılan yakınlaştırmada sayfa, dar masaüstü penceresine de taşmadan sığsın.
  const available = Math.max(360, Math.min(900, window.innerWidth - 96));
  return Math.round(available * zoom);
}

/**
 * Kesintisiz PDF okuyucu. Sayfalar görünür alana yaklaşınca render edilir;
 * bu sayede uzun PDF'ler doğal bir aşağı kaydırma akışıyla okunur.
 */
export function PreviewModal() {
  const model = useDocumentStore((state) => state.model);
  const previewPageId = useUiStore((state) => state.previewPageId);
  const setPreviewPage = useUiStore((state) => state.setPreviewPage);
  const zoom = useUiStore((state) => state.previewZoom);
  const setZoom = useUiStore((state) => state.setPreviewZoom);
  const placementMode = useUiStore((state) => state.placementMode);
  const placementImage = useUiStore((state) => state.placementImage);
  const setPlacementMode = useUiStore((state) => state.setPlacementMode);
  const setPlacementImage = useUiStore((state) => state.setPlacementImage);

  const scrollRef = useRef<HTMLDivElement>(null);
  const pageElements = useRef(new Map<string, HTMLDivElement>());
  const pendingFrame = useRef<number | null>(null);
  const lastRequestedPage = useRef<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [pageField, setPageField] = useState("1");

  const pages = model.pages;
  const visiblePageId = currentPageId ?? previewPageId;
  const pageIndex = pages.findIndex((page) => page.id === visiblePageId);
  const currentIndex = pageIndex >= 0 ? pageIndex : 0;
  const currentPage = pages[currentIndex];
  const currentSource = currentPage ? model.sources[currentPage.sourceId] : undefined;

  const registerPage = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) pageElements.current.set(id, element);
    else pageElements.current.delete(id);
  }, []);

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const target = pages[Math.max(0, Math.min(pages.length - 1, index))];
      if (!target) return;
      setCurrentPageId(target.id);
      pageElements.current.get(target.id)?.scrollIntoView({ behavior, block: "start" });
    },
    [pages],
  );

  const updateCurrentPage = useCallback(() => {
    const scroller = scrollRef.current;
    if (!scroller || pages.length === 0) return;
    const top = scroller.getBoundingClientRect().top + 18;
    let closestId = pages[0]?.id ?? null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const page of pages) {
      const element = pageElements.current.get(page.id);
      if (!element) continue;
      const distance = Math.abs(element.getBoundingClientRect().top - top);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestId = page.id;
      }
    }
    if (closestId) setCurrentPageId((previous) => previous === closestId ? previous : closestId);
  }, [pages]);

  const scheduleCurrentPageUpdate = useCallback(() => {
    if (pendingFrame.current !== null) return;
    pendingFrame.current = window.requestAnimationFrame(() => {
      pendingFrame.current = null;
      updateCurrentPage();
    });
  }, [updateCurrentPage]);

  // Dışarıdan "Oku" veya bir sayfa kartı ile açıldığında o sayfaya kaydır.
  useEffect(() => {
    if (!previewPageId) {
      lastRequestedPage.current = null;
      return;
    }
    if (previewPageId === lastRequestedPage.current) return;
    lastRequestedPage.current = previewPageId;
    const targetIndex = pages.findIndex((page) => page.id === previewPageId);
    setCurrentPageId(previewPageId);
    const timer = window.setTimeout(() => scrollToIndex(targetIndex, "auto"), 0);
    return () => window.clearTimeout(timer);
  }, [pages, previewPageId, scrollToIndex]);

  useEffect(() => {
    if (!previewPageId) return;
    const timer = window.setTimeout(updateCurrentPage, 80);
    return () => window.clearTimeout(timer);
  }, [previewPageId, updateCurrentPage, zoom]);

  useEffect(() => () => {
    if (pendingFrame.current !== null) window.cancelAnimationFrame(pendingFrame.current);
  }, []);

  useEffect(() => setPageField(String(currentIndex + 1)), [currentIndex]);

  const cancelPlacement = () => {
    setPlacementMode(null);
    setPlacementImage(null);
  };

  const close = () => {
    cancelPlacement();
    setPreviewPage(null);
  };

  const jumpToPage = () => {
    const requested = Number(pageField);
    if (!Number.isInteger(requested)) {
      setPageField(String(currentIndex + 1));
      return;
    }
    scrollToIndex(requested - 1);
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
      if (event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        scrollRef.current?.scrollBy({ top: Math.max(280, window.innerHeight * 0.75), behavior: "smooth" });
      } else if (event.key === "PageUp") {
        event.preventDefault();
        scrollRef.current?.scrollBy({ top: -Math.max(280, window.innerHeight * 0.75), behavior: "smooth" });
      } else if (event.key === "Home") {
        event.preventDefault();
        scrollToIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        scrollToIndex(pages.length - 1);
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
  }, [pages.length, previewPageId, scrollToIndex, setZoom, zoom]);

  if (!previewPageId || !currentPage || !currentSource) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col bg-[#111116]/92 backdrop-blur-md"
      onClick={close}
      onWheel={(event) => {
        if (!event.ctrlKey) return;
        event.preventDefault();
        setZoom(zoom + (event.deltaY < 0 ? 0.25 : -0.25));
      }}
    >
      <div
        className="flex min-h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 py-2.5 shadow-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            compact
            icon={<X size={18} />}
            onClick={close}
            aria-label="Okuma modunu kapat"
          />
          <span className="hidden h-8 w-px bg-border sm:block" />
          <span className="hidden h-8 w-8 place-items-center rounded-lg bg-accent-soft text-brand sm:grid">
            <BookOpen size={15} />
          </span>
          <span className="min-w-0">
            <span className="block max-w-44 truncate text-[11px] font-bold text-text">{currentSource.name}</span>
            <span className="mt-0.5 block text-[9px] text-text-soft">Okuma modu · aşağı kaydırarak ilerle</span>
          </span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <label className="flex h-8 items-center gap-1 rounded-lg border border-border bg-sidebar-header px-2 text-[10px] text-text-dim">
            <FileText size={12} className="text-text-soft" />
            <input
              type="number"
              min={1}
              max={pages.length}
              value={pageField}
              onChange={(event) => setPageField(event.target.value)}
              onBlur={jumpToPage}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  jumpToPage();
                }
              }}
              className="h-6 w-7 border-0 bg-transparent p-0 text-center text-[10px] font-bold text-text outline-none"
              aria-label="Sayfaya git"
            />
            <span className="text-text-soft">/ {pages.length}</span>
          </label>
          <Button
            variant="ghost"
            compact
            icon={<Minus size={15} />}
            disabled={zoom <= 0.5}
            onClick={() => setZoom(zoom - 0.25)}
            aria-label="Uzaklaştır"
          />
          <span className="hidden w-10 text-center text-[10px] text-text-dim tabular-nums sm:block">{Math.round(zoom * 100)}%</span>
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
            currentPageIndex={currentIndex}
            onNavigate={(index) => scrollToIndex(index)}
          />
        </div>
      </div>

      {placementMode && (
        <div className="absolute left-1/2 top-[4.5rem] z-20 -translate-x-1/2 rounded-full bg-brand px-4 py-2 text-[10px] font-semibold text-white shadow-lg">
          {placementMode === "text"
            ? "Metnin yerleşeceği noktaya tıklayın"
            : "İmzanın yerleşeceği noktaya tıklayın"}
        </div>
      )}

      <div
        ref={scrollRef}
        className="reader-scroll min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:px-10"
        onClick={(event) => event.stopPropagation()}
        onScroll={scheduleCurrentPageUpdate}
      >
        <div className="flex min-w-full flex-col items-center gap-9 pb-16">
          {pages.map((page, index) => {
            const source = model.sources[page.sourceId];
            if (!source) return null;
            return (
              <ReaderPage
                key={page.id}
                page={page}
                source={source}
                index={index}
                pageCount={pages.length}
                zoom={zoom}
                scrollRoot={scrollRef}
                active={page.id === visiblePageId}
                placementMode={placementMode}
                placementImage={placementImage}
                cancelPlacement={cancelPlacement}
                registerPage={registerPage}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReaderPage({
  page,
  source,
  index,
  pageCount,
  zoom,
  scrollRoot,
  active,
  placementMode,
  placementImage,
  cancelPlacement,
  registerPage,
}: {
  page: PageRef;
  source: SourceDocument;
  index: number;
  pageCount: number;
  zoom: number;
  scrollRoot: React.RefObject<HTMLDivElement | null>;
  active: boolean;
  placementMode: PlacementMode;
  placementImage: PlacementImage | null;
  cancelPlacement: () => void;
  registerPage: (id: string, element: HTMLDivElement | null) => void;
}) {
  const addOverlay = useDocumentStore((state) => state.addOverlay);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [renderSize, setRenderSize] = useState(() => {
    const width = readerRenderWidth(zoom);
    return { width, height: Math.round(width * 1.414) };
  });
  const [textPoint, setTextPoint] = useState<{ x: number; y: number } | null>(null);
  const [text, setText] = useState("");
  const [textSize, setTextSize] = useState(18);
  const [textColor, setTextColor] = useState("#202020");

  useEffect(() => {
    registerPage(page.id, pageRef.current);
    return () => registerPage(page.id, null);
  }, [page.id, registerPage]);

  useEffect(() => {
    let cancelled = false;
    let started = false;
    const element = pageRef.current;
    if (!element) return;

    const draw = async () => {
      if (started) return;
      started = true;
      setRendering(true);
      setFailed(false);
      setReady(false);
      try {
        const rendered = await renderPage(
          source.id,
          source.bytes,
          page.sourceIndex,
          { targetWidth: readerRenderWidth(zoom) },
          page.rotation,
        );
        if (cancelled) {
          rendered.bitmap.close();
          return;
        }
        const canvas = canvasRef.current;
        if (!canvas) {
          rendered.bitmap.close();
          return;
        }
        canvas.width = rendered.width;
        canvas.height = rendered.height;
        canvas.getContext("2d")?.drawImage(rendered.bitmap, 0, 0);
        rendered.bitmap.close();
        setRenderSize({ width: rendered.width, height: rendered.height });
        setReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setRendering(false);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void draw();
      },
      { root: scrollRoot.current, rootMargin: "1200px 0px" },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [page.rotation, page.sourceIndex, source.bytes, source.id, scrollRoot, zoom]);

  useEffect(() => {
    if (!placementMode) setTextPoint(null);
  }, [placementMode]);

  const handlePageClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!placementMode) return;
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
    const height = Math.min(0.5, (width * renderSize.width) / (placementImage.aspectRatio * renderSize.height));
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
    if (!textPoint || !text.trim()) return;
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

  return (
    <article ref={pageRef} className="scroll-mt-5">
      <div className="mb-2 flex items-center justify-between px-1 text-[10px] font-semibold text-white/58">
        <span>Sayfa {index + 1}</span>
        <span>{index + 1} / {pageCount}</span>
      </div>
      <div
        className={[
          "relative overflow-hidden rounded-[3px] bg-white shadow-[0_28px_72px_rgb(0_0_0/0.42)] transition-shadow",
          active ? "ring-2 ring-brand/50 ring-offset-4 ring-offset-transparent" : "",
        ].join(" ")}
        style={{ width: renderSize.width, height: renderSize.height }}
      >
        <canvas
          ref={canvasRef}
          onClick={handlePageClick}
          className={[
            "block h-full w-full",
            placementMode ? "cursor-crosshair" : "cursor-text",
          ].join(" ")}
          style={{ opacity: ready ? 1 : 0, transition: "opacity 160ms" }}
        />
        {!ready && !failed && (
          <div className="absolute inset-0 grid place-items-center bg-white">
            <span className="h-7 w-7 rounded-full border-2 border-[#dedce5] border-t-brand [animation:spin_700ms_linear_infinite]" />
          </div>
        )}
        {failed && (
          <div className="absolute inset-0 grid place-items-center bg-white p-5 text-center text-xs text-danger">
            Sayfa görüntülenemedi.
          </div>
        )}
        {page.overlays.map((overlay) => (
          <OverlayPreview key={overlay.id} overlay={overlay} canvasWidth={renderSize.width} />
        ))}
        {textPoint && placementMode === "text" && (
          <div
            className="absolute z-10 w-56 rounded-xl border border-border bg-surface p-2.5 shadow-[var(--shadow-float)]"
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
              className="h-8 w-full rounded-lg border border-border bg-sidebar-header px-2 text-xs text-text"
            />
            <div className="mt-2 grid grid-cols-[1fr_3rem] gap-2">
              <input
                type="number"
                min={6}
                max={120}
                value={textSize}
                onChange={(event) => setTextSize(Number(event.target.value) || 18)}
                className="h-8 rounded-lg border border-border bg-sidebar-header px-2 font-mono text-xs text-text"
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
      {rendering && <p className="mt-2 text-center text-[9px] text-white/38">Sayfa hazırlanıyor…</p>}
    </article>
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
