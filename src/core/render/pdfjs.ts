import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";

/**
 * pdf.js worker kurulumu.
 *
 * `new URL(..., import.meta.url)` deseni Vite'ın worker'ı bundle'a dahil
 * etmesini sağlar ve Tauri'nin özel protokolünde de doğru çözümlenir —
 * CDN'den worker çekmek çevrimdışı masaüstü uygulamasında çalışmazdı.
 */
pdfjs.GlobalWorkerOptions.workerPort = new Worker(
  new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url),
  { type: "module" },
);

/** Aynı kaynak baytları için tekrar tekrar parse etmemek adına açık belge önbelleği. */
const documentCache = new Map<string, Promise<PDFDocumentProxy>>();
/** Belgeyi kapatmak yükleme görevi üzerinden yapılır (PDFDocumentProxy'de destroy yok). */
const taskCache = new Map<string, PDFDocumentLoadingTask>();

export class PasswordProtectedError extends Error {
  constructor() {
    super("Bu PDF parola korumalı ve açılamıyor.");
    this.name = "PasswordProtectedError";
  }
}

/**
 * Bir kaynak belgeyi pdf.js ile açar (render için).
 *
 * pdf.js verilen ArrayBuffer'ın sahipliğini alıp detach ettiği için baytların
 * bir kopyasını veriyoruz — aksi halde aynı Uint8Array'i sonradan pdf-lib ile
 * kaydetmeye çalıştığımızda boş çıkardı.
 */
export function loadPdfDocument(id: string, bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const cached = documentCache.get(id);
  if (cached) return cached;

  const task = pdfjs.getDocument({ data: bytes.slice() });
  const promise = task.promise.catch((error: unknown) => {
    documentCache.delete(id);
    taskCache.delete(id);
    if (error instanceof Error && error.name === "PasswordException") {
      throw new PasswordProtectedError();
    }
    throw error;
  });
  documentCache.set(id, promise);
  taskCache.set(id, task);
  return promise;
}

export function releasePdfDocument(id: string): void {
  const task = taskCache.get(id);
  documentCache.delete(id);
  taskCache.delete(id);
  void task?.destroy().catch(() => {});
}

/** Sayfa sayısını okumak için belgeyi açar. */
export async function readPageCount(id: string, bytes: Uint8Array): Promise<number> {
  const doc = await loadPdfDocument(id, bytes);
  return doc.numPages;
}

export interface RenderedPage {
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

export interface RenderedTextLayer {
  cancel: () => void;
  textDivs: HTMLElement[];
  textItems: string[];
}

/**
 * Bir sayfayı verilen genişliğe sığacak şekilde render eder.
 *
 * `rotation` kullanıcının uyguladığı ek dönüşü temsil eder; pdf.js bunu
 * sayfanın kendi `/Rotate` değerine ekler.
 */
export async function renderPage(
  sourceId: string,
  bytes: Uint8Array,
  pageIndex: number,
  sizing: { targetWidth: number } | { scale: number },
  rotation = 0,
): Promise<RenderedPage> {
  const doc = await loadPdfDocument(sourceId, bytes);
  const page = await doc.getPage(pageIndex + 1);

  const base = page.getViewport({ scale: 1, rotation: page.rotate + rotation });
  const scale = "scale" in sizing ? sizing.scale : sizing.targetWidth / base.width;
  const viewport = page.getViewport({ scale, rotation: page.rotate + rotation });

  const canvas = new OffscreenCanvas(
    Math.max(1, Math.round(viewport.width)),
    Math.max(1, Math.round(viewport.height)),
  );
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D bağlamı oluşturulamadı.");

  // Şeffaf PDF'lerin koyu temada okunmaz görünmemesi için beyaz zemin.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: context as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;

  page.cleanup();
  return {
    bitmap: canvas.transferToImageBitmap(),
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * PDF.js'in gerçek metin katmanını sayfa görüntüsüyle aynı ölçekte kurar.
 * Bu katman, metni seçilebilir/kopyalanabilir yapar ve arama vurguları için
 * kararlı DOM düğümleri sağlar.
 */
export async function renderPageTextLayer(
  sourceId: string,
  bytes: Uint8Array,
  pageIndex: number,
  container: HTMLElement,
  targetWidth: number,
  rotation = 0,
): Promise<RenderedTextLayer> {
  const doc = await loadPdfDocument(sourceId, bytes);
  const page = await doc.getPage(pageIndex + 1);
  const base = page.getViewport({ scale: 1, rotation: page.rotate + rotation });
  const scale = targetWidth / base.width;
  const viewport = page.getViewport({ scale, rotation: page.rotate + rotation });
  const content = await page.getTextContent({ includeMarkedContent: true });

  container.replaceChildren();
  container.style.setProperty("--scale-factor", String(scale));
  container.style.setProperty("--total-scale-factor", String(scale));

  const layer = new pdfjs.TextLayer({
    textContentSource: content,
    container,
    viewport,
  });
  await layer.render();

  return {
    cancel: () => layer.cancel(),
    textDivs: layer.textDivs,
    textItems: layer.textContentItemsStr,
  };
}

/** Bir sayfanın metin içeriğini düz metin olarak çıkarır (Faz 6). */
export async function extractPageText(
  sourceId: string,
  bytes: Uint8Array,
  pageIndex: number,
): Promise<string> {
  const doc = await loadPdfDocument(sourceId, bytes);
  const page = await doc.getPage(pageIndex + 1);
  const content = await page.getTextContent();
  const text = content.items
    .map((item) => ("str" in item ? item.str : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  page.cleanup();
  return text;
}
