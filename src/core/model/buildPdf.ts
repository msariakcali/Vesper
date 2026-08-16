import { PDFDocument, degrees, rgb } from "pdf-lib";
import type { DocumentModel, PageRef } from "./types";
import { hexToRgb01 } from "../ops/color";
import { embedUnicodeFont } from "../render/fonts";

/**
 * Sayfa referanslarından gerçek PDF baytları üretir.
 *
 * Uygulamadaki TÜM çıktılar (kaydet, ayıkla, böl, birleştir) buradan geçer;
 * böylece rotasyon ve overlay uygulama mantığı tek yerde kalır.
 */

/** Aynı kaynağı defalarca parse etmemek için işlem başına önbellek. */
type SourceLoader = (sourceId: string) => Promise<PDFDocument>;

function createLoader(model: DocumentModel): SourceLoader {
  const loaded = new Map<string, Promise<PDFDocument>>();
  return (sourceId: string) => {
    const cached = loaded.get(sourceId);
    if (cached) return cached;

    const source = model.sources[sourceId];
    if (!source) throw new Error(`Kaynak belge bulunamadı: ${sourceId}`);

    // ignoreEncryption: yalnızca sahip parolasıyla korunan (açılışta parola
    // sormayan) belgelerin de işlenebilmesi için.
    const promise = PDFDocument.load(source.bytes, { ignoreEncryption: true });
    loaded.set(sourceId, promise);
    return promise;
  };
}

/**
 * Verilen sayfa listesinden yeni bir PDF oluşturur.
 * `pages` sırası çıktı sırasıdır.
 */
export async function buildPdf(model: DocumentModel, pages: PageRef[]): Promise<Uint8Array> {
  if (pages.length === 0) {
    throw new Error("Çıktı için en az bir sayfa gerekli.");
  }

  const load = createLoader(model);
  const output = await PDFDocument.create();
  const hasTextOverlay = pages.some((page) =>
    page.overlays.some((overlay) => overlay.kind === "text"),
  );
  const font = hasTextOverlay ? await embedUnicodeFont(output) : null;
  const embeddedImages = new Map<string, import("pdf-lib").PDFImage>();

  // copyPages'i kaynak başına toplu çağırmak tek tek çağırmaktan belirgin
  // şekilde hızlı; ama sayfa sırasını korumak zorundayız. Bu yüzden önce
  // kaynak başına gereken indeksleri topluyor, sonra hedef sırayla yerleştiriyoruz.
  const byIndex = new Map<string, number>(); // "sourceId:index" -> kopyalanmış sayfa sırası
  const grouped = new Map<string, number[]>();
  for (const page of pages) {
    const key = `${page.sourceId}:${page.sourceIndex}`;
    if (byIndex.has(key)) continue;
    byIndex.set(key, -1);
    const list = grouped.get(page.sourceId) ?? [];
    list.push(page.sourceIndex);
    grouped.set(page.sourceId, list);
  }

  const copied = new Map<string, import("pdf-lib").PDFPage>();
  for (const [sourceId, indices] of grouped) {
    const sourceDoc = await load(sourceId);
    const copiedPages = await output.copyPages(sourceDoc, indices);
    indices.forEach((sourceIndex, i) => {
      copied.set(`${sourceId}:${sourceIndex}`, copiedPages[i]);
    });
  }

  for (const page of pages) {
    const key = `${page.sourceId}:${page.sourceIndex}`;
    const template = copied.get(key);
    if (!template) throw new Error(`Sayfa kopyalanamadı: ${key}`);

    // Aynı kaynak sayfa birden çok kez kullanılabilir (çoğaltma). copyPages
    // ile gelen nesne yalnızca bir kez eklenebildiğinden tekrarlarda yeniden
    // kopyalıyoruz.
    let target = template;
    if (output.getPages().includes(template)) {
      const sourceDoc = await load(page.sourceId);
      [target] = await output.copyPages(sourceDoc, [page.sourceIndex]);
    }

    if (page.rotation !== 0) {
      const current = target.getRotation().angle;
      target.setRotation(degrees((current + page.rotation) % 360));
    }

    for (const overlay of page.overlays) {
      const { width, height } = target.getSize();
      if (overlay.kind === "text") {
        const [red, green, blue] = hexToRgb01(overlay.color);
        if (overlay.backgroundColor) {
          const [backgroundRed, backgroundGreen, backgroundBlue] = hexToRgb01(overlay.backgroundColor);
          const padding = overlay.backgroundPadding ?? 1;
          const textWidth = font!.widthOfTextAtSize(overlay.text, overlay.size);
          target.drawRectangle({
            x: overlay.x * width - padding,
            y: (1 - overlay.y) * height - overlay.size * 0.24 - padding,
            width: textWidth + padding * 2,
            height: overlay.size * 1.24 + padding * 2,
            color: rgb(backgroundRed, backgroundGreen, backgroundBlue),
            rotate: degrees(overlay.rotate),
          });
        }
        target.drawText(overlay.text, {
          x: overlay.x * width,
          y: (1 - overlay.y) * height,
          size: overlay.size,
          font: font!,
          color: rgb(red, green, blue),
          opacity: overlay.opacity,
          rotate: degrees(overlay.rotate),
        });
      } else {
        let image = embeddedImages.get(overlay.id);
        if (!image) {
          image =
            overlay.mime === "image/png"
              ? await output.embedPng(overlay.data)
              : await output.embedJpg(overlay.data);
          embeddedImages.set(overlay.id, image);
        }
        target.drawImage(image, {
          x: overlay.x * width,
          y: (1 - overlay.y) * height - overlay.height * height,
          width: overlay.width * width,
          height: overlay.height * height,
          opacity: overlay.opacity,
          rotate: degrees(overlay.rotate),
        });
      }
    }

    output.addPage(target);
  }

  return output.save();
}

/** Tüm belgeyi olduğu gibi kaydeder. */
export function buildFullPdf(model: DocumentModel): Promise<Uint8Array> {
  return buildPdf(model, model.pages);
}
