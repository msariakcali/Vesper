import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, FileText, Minus, Plus, X } from "lucide-react";
import { renderPage, renderPageTextLayer } from "../../core/render/pdfjs";
import type { Overlay, PageRef, SourceDocument } from "../../core/model/types";
import { useDocumentStore } from "../../store/documentStore";
import { useUiStore, type PlacementImage, type PlacementMode } from "../../store/uiStore";
import { Button } from "../ui/Button";
import { TextSearch } from "./TextSearch";
import { useTranslation } from "../../i18n";

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
      className="reader-shell fixed inset-0 z-40 flex flex-col backdrop-blur-md"
      onClick={close}
    >
      <div
        className="reader-toolbar flex min-h-14 shrink-0 items-center gap-3 border-b border-border px-3 py-2 shadow-sm sm:px-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-w-0 items-center gap-2">
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
          <span className="min-w-0">
            <span className="block max-w-44 truncate text-[12px] font-bold text-text">{currentSource.name}</span>
            <span className="mt-0.5 block text-[10px] text-text-soft">{t("readingModeHint")}</span>
          </span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <label className="flex h-8 items-center gap-1 rounded-lg border border-border bg-sidebar-header px-2 text-[11px] text-text-dim">
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

      {placementMode && (
        <div className="absolute left-1/2 top-[4.5rem] z-20 -translate-x-1/2 rounded-full bg-brand px-4 py-2 text-[11px] font-semibold text-white shadow-lg">
          {placementMode === "text"
            ? t("clickToPlaceText")
            : t("clickToPlaceSignature")}
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
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
      <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-semibold text-white/58">
        <span>{t("page", { count: index + 1 })}</span>
        <span>{index + 1} / {pageCount}</span>
      </div>
      <div
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
}: {
  overlay: Overlay;
  canvasWidth: number;
}) {
  if (overlay.kind === "text") {
    return (
      <span
        className="pointer-events-none absolute z-[3] origin-bottom-left whitespace-pre text-black"
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
      className="pointer-events-none absolute z-[3] origin-top-left object-contain"
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
