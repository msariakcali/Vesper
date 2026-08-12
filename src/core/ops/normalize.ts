import { PDFDocument } from "pdf-lib";
import { PAGE_SIZES } from "./blankPage";

/** Her sayfayı oranını koruyarak ortalanmış bir A4 sayfasına yerleştirir. */
export async function normalizePdfToA4(bytes: Uint8Array): Promise<Uint8Array> {
  const source = await PDFDocument.load(bytes);
  const output = await PDFDocument.create();
  const [targetWidth, targetHeight] = PAGE_SIZES.A4;
  for (const sourcePage of source.getPages()) {
    // pdf-lib tamamen boş sayfalarda /Contents üretmez; embedPage ise bir
    // içerik akışı bekler. Görünmez, sıfır boyutlu çizim bu kenar durumunu çözer.
    sourcePage.drawRectangle({ x: 0, y: 0, width: 0, height: 0, opacity: 0 });
    const embedded = await output.embedPage(sourcePage);
    const scale = Math.min(targetWidth / embedded.width, targetHeight / embedded.height);
    const page = output.addPage([targetWidth, targetHeight]);
    page.drawPage(embedded, {
      x: (targetWidth - embedded.width * scale) / 2,
      y: (targetHeight - embedded.height * scale) / 2,
      xScale: scale,
      yScale: scale,
    });
  }
  return output.save();
}
