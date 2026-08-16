import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Check, FileText, Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";
import { renderPage, renderPageTextLayer } from "../../core/render/pdfjs";
import type { Overlay, OverlayChanges, PageRef, SourceDocument } from "../../core/model/types";
import { useDocumentStore } from "../../store/documentStore";
import { useUiStore, type PlacementImage, type PlacementMode } from "../../store/uiStore";
import { Button } from "../ui/Button";
import { TextSearch } from "./TextSearch";
import { useTranslation } from "../../i18n";

function readerRenderWidth(zoom: number): number {
  // Varsayılan yakınlaştırmada sayfa, dar tarayıcı penceresine taşmadan sığsın.
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTarget, setSearchTarget] = useState<{ pageIndex: number; matchIndex: number } | null>(null);
  const { t } = useTranslation();

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

  const handleSearchNavigate = useCallback((index: number, matchIndex: number) => {
    setSearchTarget({ pageIndex: index, matchIndex });
    scrollToIndex(index);
  }, [scrollToIndex]);

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

  // Ctrl/Cmd + tekerlek yalnızca PDF sayfalarının ölçeğini değiştirir.
  // Tarayıcının ya da okuyucu araç çubuğunun büyümesini engellemek için native
  // ve passive olmayan dinleyici kullanıyoruz.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!previewPageId || !scroller) return;

    const handleDocumentZoom = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const currentZoom = useUiStore.getState().previewZoom;
      useUiStore.getState().setPreviewZoom(currentZoom + (event.deltaY < 0 ? 0.25 : -0.25));
    };

    scroller.addEventListener("wheel", handleDocumentZoom, { passive: false });
    return () => scroller.removeEventListener("wheel", handleDocumentZoom);
  }, [previewPageId]);

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
    setSearchQuery("");
    setSearchTarget(null);
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
      className="reader-shell fixed inset-0 z-40 flex flex-col backdrop-blur-xl"
      onClick={close}
    >
      <div
        className="reader-toolbar flex min-h-14 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3 py-2 shadow-sm sm:flex-nowrap sm:px-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            compact
            icon={<X size={18} />}
            onClick={close}
            aria-label={t("closeReaderMode")}
          />
          <span className="hidden h-8 w-px bg-border sm:block" />
          <span className="hidden h-8 w-8 place-items-center rounded-lg bg-accent-soft text-brand sm:grid">
            <BookOpen size={15} />
          </span>
          {/* İpucu metni yalnızca genişte gösterilir: dar ekranda satır kaymasına
              yol açıp kapatma düğmesinin üstüne binmesin diye. */}
          <span className="min-w-0">
            <span className="block max-w-32 truncate text-[12px] font-bold text-text sm:max-w-44">{currentSource.name}</span>
            <span className="mt-0.5 hidden text-[10px] text-text-soft sm:block">{t("readingModeHint")}</span>
          </span>
        </div>

        {/* Çok dar ekranlarda (≤340px) arama sonucu okları taşarsa kırpılmak yerine
            yatay kaydırılabilsin diye overflow-x-auto: hiçbir kontrol erişilemez kalmaz. */}
        <div className="order-3 flex w-full shrink-0 items-center gap-1.5 overflow-x-auto sm:order-none sm:ml-auto sm:w-auto sm:overflow-visible">
          <label className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-border bg-sidebar-header px-2 text-[11px] text-text-dim">
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
              className="h-6 w-7 border-0 bg-transparent p-0 text-center text-[11px] font-bold text-text outline-none"
              aria-label={t("goToPage")}
            />
            <span className="text-text-soft">/ {pages.length}</span>
          </label>
          <Button
            variant="ghost"
            compact
            icon={<Minus size={15} />}
            disabled={zoom <= 0.5}
            onClick={() => setZoom(zoom - 0.25)}
            aria-label={t("zoomOut")}
          />
          <span className="hidden w-10 text-center text-[11px] text-text-dim tabular-nums sm:block">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            compact
            icon={<Plus size={15} />}
            disabled={zoom >= 3}
            onClick={() => setZoom(zoom + 0.25)}
            aria-label={t("zoomIn")}
          />
          <div className="shrink-0">
            <TextSearch
              ref={searchRef}
              model={model}
              currentPageIndex={currentIndex}
              onNavigate={handleSearchNavigate}
              query={searchQuery}
              onQueryChange={(query) => {
                setSearchQuery(query);
                setSearchTarget(null);
              }}
            />
          </div>
        </div>
      </div>

      {placementMode && (
        <div className="absolute left-1/2 top-[4.5rem] z-20 -translate-x-1/2 rounded-full bg-brand px-4 py-2 text-[11px] font-semibold text-accent-text shadow-lg">
          {placementMode === "text"
            ? t("clickToPlaceText")
            : t("clickToPlaceSignature")}
        </div>
      )}

      {/* PDF dışına (sayfa aralarındaki boşluğa) tıklamak okuyucuyu kapatır;
          sayfa blokları kendi tıklamalarını aşağıda durdurur. */}
      <div
        ref={scrollRef}
        className="reader-scroll min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:px-10"
        onClick={close}
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
                searchQuery={searchQuery}
                activeSearchMatch={searchTarget?.pageIndex === index ? searchTarget.matchIndex : null}
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
  searchQuery,
  activeSearchMatch,
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
  searchQuery: string;
  activeSearchMatch: number | null;
  placementMode: PlacementMode;
  placementImage: PlacementImage | null;
  cancelPlacement: () => void;
  registerPage: (id: string, element: HTMLDivElement | null) => void;
}) {
  const addOverlay = useDocumentStore((state) => state.addOverlay);
  const updateOverlay = useDocumentStore((state) => state.updateOverlay);
  const notify = useUiStore((state) => state.notify);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<OverlayTransform | null>(null);
  const [rendering, setRendering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [textReady, setTextReady] = useState(false);
  const [renderSize, setRenderSize] = useState(() => {
    const width = readerRenderWidth(zoom);
    return { width, height: Math.round(width * 1.414) };
  });
  const [textPoint, setTextPoint] = useState<{ x: number; y: number } | null>(null);
  const [text, setText] = useState("");
  const [textSize, setTextSize] = useState(18);
  const [textColor, setTextColor] = useState("#202020");
  const [editingOverlay, setEditingOverlay] = useState<Overlay | null>(null);
  const [sourceTextDraft, setSourceTextDraft] = useState<Overlay | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    registerPage(page.id, pageRef.current);
    return () => registerPage(page.id, null);
  }, [page.id, registerPage]);

  useEffect(() => {
    let cancelled = false;
    let started = false;
    let cancelTextLayer: (() => void) | null = null;
    const element = pageRef.current;
    if (!element) return;

    const draw = async () => {
      if (started) return;
      started = true;
      setRendering(true);
      setFailed(false);
      setReady(false);
      setTextReady(false);
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

        const textContainer = textLayerRef.current;
        if (textContainer) {
          const textLayer = await renderPageTextLayer(
            source.id,
            source.bytes,
            page.sourceIndex,
            textContainer,
            rendered.width,
            page.rotation,
          );
          cancelTextLayer = textLayer.cancel;
          if (!cancelled) {
            textLayer.textDivs.forEach((element, itemIndex) => {
              element.dataset.pdfText = textLayer.textItems[itemIndex] ?? element.textContent ?? "";
            });
            setTextReady(true);
          } else {
            textLayer.cancel();
          }
        }
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
      cancelTextLayer?.();
      observer.disconnect();
    };
  }, [page.rotation, page.sourceIndex, source.bytes, source.id, scrollRoot, zoom]);

  useEffect(() => {
    if (!textReady || !textLayerRef.current) return;
    highlightTextLayer(textLayerRef.current, searchQuery, active, activeSearchMatch);
  }, [active, activeSearchMatch, searchQuery, textReady]);

  useEffect(() => {
    if (!placementMode) setTextPoint(null);
  }, [placementMode]);

  useEffect(() => {
    setEditingOverlay((current) => {
      if (!current) return null;
      return page.overlays.some((overlay) => overlay.id === current.id) ? current : null;
    });
  }, [page.overlays]);

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
      tool: placementMode === "signature" ? "signature" : "image",
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
      tool: "text",
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

  const editSourceText = (event: React.MouseEvent<HTMLDivElement>) => {
    if (placementMode) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-pdf-text]");
    const text = target?.dataset.pdfText?.trim();
    const surface = surfaceRef.current;
    if (!target || !text || !surface) return;
    event.preventDefault();
    event.stopPropagation();

    const textRect = target.getBoundingClientRect();
    const pageRect = surface.getBoundingClientRect();
    const x = clamp((textRect.left - pageRect.left) / pageRect.width, 0, 0.96);
    const y = clamp((textRect.bottom - pageRect.top) / pageRect.height, 0.02, 1);
    const size = clamp((textRect.height / pageRect.width) * 595.28, 7, 72);
    setEditingOverlay(null);
    setSourceTextDraft({
      id: "source-text-template",
      tool: "text",
      kind: "text",
      text,
      x,
      y,
      size,
      color: "#202020",
      backgroundColor: "#ffffff",
      backgroundPadding: 1.5,
      opacity: 1,
      rotate: 0,
    });
  };

  const selectOverlay = (overlay: Overlay) => {
    if (placementMode) return;
    setSourceTextDraft(null);
    setEditingOverlay((current) => current?.id === overlay.id ? current : { ...overlay });
  };

  const startTransform = (
    event: React.PointerEvent<HTMLElement>,
    overlay: Overlay,
    kind: OverlayTransform["kind"],
  ) => {
    if (placementMode || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const draft = editingOverlay?.id === overlay.id ? editingOverlay : { ...overlay };
    setEditingOverlay(draft);
    event.currentTarget.setPointerCapture(event.pointerId);
    transformRef.current = {
      id: overlay.id,
      kind,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      initial: { ...draft },
    };
  };

  const updateTransform = (event: React.PointerEvent<HTMLElement>) => {
    const transform = transformRef.current;
    const surface = surfaceRef.current;
    if (!transform || !surface || transform.pointerId !== event.pointerId) return;
    const rect = surface.getBoundingClientRect();
    const deltaX = (event.clientX - transform.startX) / rect.width;
    const deltaY = (event.clientY - transform.startY) / rect.height;

    setEditingOverlay((current) => {
      if (!current || current.id !== transform.id) return current;
      if (transform.kind === "move") return moveOverlay(transform.initial, deltaX, deltaY);
      return resizeOverlay(transform.initial, deltaX);
    });
  };

  const endTransform = (event: React.PointerEvent<HTMLElement>) => {
    if (transformRef.current?.pointerId !== event.pointerId) return;
    transformRef.current = null;
  };

  const saveOverlayEdit = () => {
    if (!editingOverlay) return;
    updateOverlay(page.id, editingOverlay.id, editableChanges(editingOverlay));
    setEditingOverlay(null);
    notify("success", t("appliedItemUpdated"));
  };

  return (
    <article ref={pageRef} className="scroll-mt-5" onClick={(event) => event.stopPropagation()}>
      <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-semibold text-white/58">
        <span>{t("page", { count: index + 1 })}</span>
        <span>{index + 1} / {pageCount}</span>
      </div>
      <div
        ref={surfaceRef}
        className={[
          "relative overflow-hidden rounded-[4px] bg-white shadow-[0_28px_72px_rgb(0_0_0/0.42)] transition-shadow",
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
          style={{
            opacity: ready ? 1 : 0,
            pointerEvents: placementMode ? "auto" : "none",
            transition: "opacity 160ms",
          }}
        />
        <div
          ref={textLayerRef}
          className="pdf-text-layer textLayer"
          onClick={editSourceText}
          data-searching={searchQuery.trim() ? "true" : "false"}
          style={{ pointerEvents: placementMode ? "none" : "auto" }}
          aria-label={t("pageTextLabel", { count: index + 1 })}
        />
        {!ready && !failed && (
          <div className="absolute inset-0 grid place-items-center bg-white">
            <span className="h-7 w-7 rounded-full border-2 border-[#dedce5] border-t-brand [animation:spin_700ms_linear_infinite]" />
          </div>
        )}
        {failed && (
          <div className="absolute inset-0 grid place-items-center bg-white p-5 text-center text-xs text-danger">
            {t("pageRenderFailed")}
          </div>
        )}
        {page.overlays.map((overlay) => (
          <OverlayPreview
            key={overlay.id}
            overlay={editingOverlay?.id === overlay.id ? editingOverlay : overlay}
            canvasWidth={renderSize.width}
            selected={editingOverlay?.id === overlay.id}
            editable={!placementMode}
            onSelect={() => selectOverlay(overlay)}
            onMoveStart={(event) => startTransform(event, overlay, "move")}
            onResizeStart={(event) => startTransform(event, overlay, "resize")}
            onTransformMove={updateTransform}
            onTransformEnd={endTransform}
          />
        ))}
        {sourceTextDraft && !placementMode && (
          <OverlayPreview
            overlay={sourceTextDraft}
            canvasWidth={renderSize.width}
            selected
            editable={false}
            onSelect={() => undefined}
            onMoveStart={() => undefined}
            onResizeStart={() => undefined}
            onTransformMove={() => undefined}
            onTransformEnd={() => undefined}
          />
        )}
        {(editingOverlay || sourceTextDraft) && !placementMode && (
          <OnPageOverlayEditor
            overlay={editingOverlay ?? sourceTextDraft!}
            onChange={(overlay) => {
              if (editingOverlay) setEditingOverlay(overlay);
              else setSourceTextDraft(overlay);
            }}
            onCancel={() => {
              setEditingOverlay(null);
              setSourceTextDraft(null);
            }}
            onSave={() => {
              if (editingOverlay) saveOverlayEdit();
              else if (sourceTextDraft) {
                addOverlay([page.id], sourceTextDraft);
                setSourceTextDraft(null);
                notify("success", t("sourceTextReplaced"));
              }
            }}
          />
        )}
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
              placeholder={t("text")}
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
                aria-label={t("textSize")}
              />
              <input
                type="color"
                value={textColor}
                onChange={(event) => setTextColor(event.target.value)}
                className="h-8 w-full"
                aria-label={t("textColor")}
              />
            </div>
            <div className="mt-2 flex justify-end gap-1">
              <Button variant="ghost" compact onClick={cancelPlacement}>{t("cancel")}</Button>
              <Button variant="primary" compact disabled={!text.trim()} onClick={addText}>{t("add")}</Button>
            </div>
          </div>
        )}
      </div>
      {rendering && <p className="mt-2 text-center text-[10px] text-white/38">{t("pagePreparing")}</p>}
    </article>
  );
}

function OverlayPreview({
  overlay,
  canvasWidth,
  selected,
  editable,
  onSelect,
  onMoveStart,
  onResizeStart,
  onTransformMove,
  onTransformEnd,
}: {
  overlay: Overlay;
  canvasWidth: number;
  selected: boolean;
  editable: boolean;
  onSelect: () => void;
  onMoveStart: (event: React.PointerEvent<HTMLElement>) => void;
  onResizeStart: (event: React.PointerEvent<HTMLElement>) => void;
  onTransformMove: (event: React.PointerEvent<HTMLElement>) => void;
  onTransformEnd: (event: React.PointerEvent<HTMLElement>) => void;
}) {
  const common = {
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      onSelect();
      onMoveStart(event);
    },
    onPointerMove: onTransformMove,
    onPointerUp: onTransformEnd,
    onPointerCancel: onTransformEnd,
  };

  if (overlay.kind === "text") {
    return (
      <div
        {...common}
        className={[
          "absolute origin-bottom-left whitespace-pre text-black",
          editable ? "cursor-move touch-none" : "pointer-events-none",
          selected ? "z-10 outline outline-2 outline-brand outline-offset-2" : "z-[3]",
        ].join(" ")}
        style={{
          left: `${overlay.x * 100}%`,
          top: `${overlay.y * 100}%`,
          fontFamily: "Noto Sans, sans-serif",
          fontSize: `${(overlay.size * canvasWidth) / 595.28}px`,
          lineHeight: 1,
          color: overlay.color,
          backgroundColor: overlay.backgroundColor,
          padding: overlay.backgroundColor
            ? `${((overlay.backgroundPadding ?? 1) * canvasWidth) / 595.28}px`
            : undefined,
          opacity: overlay.opacity,
          transform: `translateY(-100%) rotate(${-overlay.rotate}deg)`,
        }}
      >
        {overlay.text}
        {selected && editable && <ResizeHandle onPointerDown={onResizeStart} />}
      </div>
    );
  }
  return (
    <div
      {...common}
      className={[
        "absolute origin-top-left",
        editable ? "cursor-move touch-none" : "pointer-events-none",
        selected ? "z-10 outline outline-2 outline-brand outline-offset-2" : "z-[3]",
      ].join(" ")}
      style={{
        left: `${overlay.x * 100}%`,
        top: `${overlay.y * 100}%`,
        width: `${overlay.width * 100}%`,
        height: `${overlay.height * 100}%`,
        opacity: overlay.opacity,
        transform: `rotate(${-overlay.rotate}deg)`,
      }}
    >
      <ImageOverlayPreview overlay={overlay} />
      {selected && editable && <ResizeHandle onPointerDown={onResizeStart} />}
    </div>
  );
}

function ResizeHandle({ onPointerDown }: { onPointerDown: (event: React.PointerEvent<HTMLElement>) => void }) {
  return (
    <span
      role="presentation"
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(event);
      }}
      className="absolute -bottom-2 -right-2 grid h-5 w-5 cursor-nwse-resize place-items-center rounded-full border-2 border-white bg-brand shadow-md"
    >
      <Maximize2 size={10} className="text-accent-text" />
    </span>
  );
}

function ImageOverlayPreview({ overlay }: { overlay: Extract<Overlay, { kind: "image" }> }) {
  const [url, setUrl] = useState("");
  const { t } = useTranslation();
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
      alt={t("placedImageAlt")}
      draggable={false}
      className="pointer-events-none block h-full w-full select-none object-contain"
    />
  );
}

function OnPageOverlayEditor({
  overlay,
  onChange,
  onCancel,
  onSave,
}: {
  overlay: Overlay;
  onChange: (overlay: Overlay) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const patch = (changes: OverlayChanges) => onChange({ ...overlay, ...changes } as Overlay);
  const changeImageWidth = (percent: number) => {
    if (overlay.kind !== "image") return;
    const ratio = overlay.width > 0 ? overlay.height / overlay.width : 1;
    const width = percent / 100;
    patch({ width, height: Math.min(0.95, width * ratio) });
  };
  const size = overlay.kind === "text" ? Math.round(overlay.size) : Math.round(overlay.width * 100);

  return (
    <div
      className="absolute right-3 top-3 z-20 w-64 rounded-xl border border-border bg-surface/97 p-2.5 shadow-[var(--shadow-float)] backdrop-blur"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold tracking-[0.08em] text-brand uppercase">{t("editOnPage")}</p>
          <p className="mt-0.5 text-[9px] text-text-soft">{t("editOnPageHint")}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="grid h-7 w-7 place-items-center rounded-md text-text-soft hover:bg-surface-2 hover:text-text"
          aria-label={t("cancel")}
        >
          <X size={13} />
        </button>
      </div>

      <div className="space-y-2.5">
        {overlay.kind === "text" && (
          <input
            value={overlay.text}
            onChange={(event) => patch({ text: event.target.value })}
            className="h-8 w-full rounded-lg border border-border bg-sidebar-header px-2 text-xs text-text outline-none focus:border-brand"
            aria-label={t("text")}
          />
        )}
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <span className="text-[10px] font-semibold text-text-dim">{t("size")}</span>
          <div className="flex items-center rounded-lg border border-border bg-sidebar-header">
            <OverlayControlButton
              label={t("zoomOut")}
              onClick={() => overlay.kind === "text" ? patch({ size: Math.max(6, overlay.size - 2) }) : changeImageWidth(Math.max(5, size - 5))}
            >
              <Minus size={12} />
            </OverlayControlButton>
            <span className="min-w-12 text-center font-mono text-[10px] text-text">{size}{overlay.kind === "text" ? "pt" : "%"}</span>
            <OverlayControlButton
              label={t("zoomIn")}
              onClick={() => overlay.kind === "text" ? patch({ size: Math.min(144, overlay.size + 2) }) : changeImageWidth(Math.min(90, size + 5))}
            >
              <Plus size={12} />
            </OverlayControlButton>
          </div>
        </div>
        {overlay.kind === "text" && (
          <label className="flex items-center justify-between gap-2 text-[10px] font-semibold text-text-dim">
            {t("color")}
            <input
              type="color"
              value={overlay.color}
              onChange={(event) => patch({ color: event.target.value })}
              className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
            />
          </label>
        )}
        <OnPageRange
          label={t("opacity")}
          value={Math.round(overlay.opacity * 100)}
          min={5}
          max={100}
          suffix="%"
          onChange={(value) => patch({ opacity: value / 100 })}
        />
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <span className="text-[10px] font-semibold text-text-dim">{t("angle")}</span>
          <div className="flex items-center rounded-lg border border-border bg-sidebar-header">
            <OverlayControlButton label={t("rotateLeft")} onClick={() => patch({ rotate: Math.max(-180, overlay.rotate - 15) })}>
              <RotateCcw size={12} />
            </OverlayControlButton>
            <span className="min-w-12 text-center font-mono text-[10px] text-text">{Math.round(overlay.rotate)}°</span>
            <OverlayControlButton label={t("rotateRight")} onClick={() => patch({ rotate: Math.min(180, overlay.rotate + 15) })}>
              <RotateCcw size={12} className="-scale-x-100" />
            </OverlayControlButton>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            onClick={onCancel}
            className="h-8 rounded-lg border border-border bg-sidebar-header text-[10px] font-semibold text-text-dim hover:text-text"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            disabled={overlay.kind === "text" && !overlay.text.trim()}
            onClick={onSave}
            className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-brand text-[10px] font-semibold text-accent-text hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check size={12} /> {t("saveChanges")}
          </button>
        </div>
      </div>
    </div>
  );
}

function OverlayControlButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className="grid h-7 w-7 place-items-center text-text-dim hover:bg-surface hover:text-brand">
      {children}
    </button>
  );
}

function OnPageRange({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid grid-cols-[3.5rem_1fr_2.4rem] items-center gap-2 text-[10px] font-semibold text-text-dim">
      <span>{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[var(--accent)]" />
      <span className="text-right font-mono text-[9px] font-normal text-text">{value}{suffix}</span>
    </label>
  );
}

interface OverlayTransform {
  id: string;
  kind: "move" | "resize";
  pointerId: number;
  startX: number;
  startY: number;
  initial: Overlay;
}

function moveOverlay(overlay: Overlay, deltaX: number, deltaY: number): Overlay {
  const maxX = overlay.kind === "image" ? 1 - overlay.width : 1;
  const maxY = overlay.kind === "image" ? 1 - overlay.height : 1;
  return {
    ...overlay,
    x: clamp(overlay.x + deltaX, 0, maxX),
    y: clamp(overlay.y + deltaY, 0, maxY),
  };
}

function resizeOverlay(overlay: Overlay, deltaX: number): Overlay {
  if (overlay.kind === "text") {
    return { ...overlay, size: clamp(overlay.size + deltaX * 595.28, 6, 144) };
  }
  const ratio = overlay.width > 0 ? overlay.height / overlay.width : 1;
  const width = clamp(overlay.width + deltaX, 0.05, 0.9);
  const height = Math.min(0.95, width * ratio);
  return { ...overlay, width, height, x: Math.min(overlay.x, 1 - width), y: Math.min(overlay.y, 1 - height) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function editableChanges(overlay: Overlay): OverlayChanges {
  const common = { x: overlay.x, y: overlay.y, opacity: overlay.opacity, rotate: overlay.rotate };
  return overlay.kind === "text"
    ? { ...common, text: overlay.text, size: overlay.size, color: overlay.color }
    : { ...common, width: overlay.width, height: overlay.height };
}

function highlightTextLayer(
  container: HTMLElement,
  query: string,
  activePage: boolean,
  activeMatchIndex: number | null,
) {
  const needle = query.trim().toLocaleLowerCase("tr-TR");

  container.querySelectorAll<HTMLElement>("[data-pdf-text]").forEach((element) => {
    const original = element.dataset.pdfText ?? "";
    element.replaceChildren(document.createTextNode(original));
    if (!needle) return;

    const searchable = original.toLocaleLowerCase("tr-TR");
    let cursor = 0;
    let matchIndex = searchable.indexOf(needle, cursor);
    if (matchIndex < 0) return;

    const fragment = document.createDocumentFragment();
    while (matchIndex >= 0) {
      if (matchIndex > cursor) fragment.append(document.createTextNode(original.slice(cursor, matchIndex)));
      const mark = document.createElement("mark");
      mark.className = "pdf-search-match";
      mark.textContent = original.slice(matchIndex, matchIndex + needle.length);
      fragment.append(mark);
      cursor = matchIndex + needle.length;
      matchIndex = searchable.indexOf(needle, cursor);
    }
    if (cursor < original.length) fragment.append(document.createTextNode(original.slice(cursor)));
    element.replaceChildren(fragment);
  });

  if (!activePage) return;
  const matches = container.querySelectorAll<HTMLElement>(".pdf-search-match");
  const current = matches[activeMatchIndex ?? 0];
  current?.classList.add("is-current");
  if (activeMatchIndex !== null) current?.scrollIntoView({ behavior: "smooth", block: "center" });
}
