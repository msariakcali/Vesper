import { PDFDocument } from "pdf-lib";

export interface PdfImageInput {
  bytes: Uint8Array;
  mime: "image/png" | "image/jpeg";
}

/** Her görseli kendi doğal boyutunda, tam sayfalı bir PDF sayfasına dönüştürür. */
export async function imagesToPdf(images: PdfImageInput[]): Promise<Uint8Array> {
  if (images.length === 0) throw new Error("Dönüştürülecek görsel bulunamadı.");
  const doc = await PDFDocument.create();
  for (const image of images) {
    const embedded =
      image.mime === "image/png"
        ? await doc.embedPng(image.bytes)
        : await doc.embedJpg(image.bytes);
    const page = doc.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, {
      x: 0,
      y: 0,
      width: embedded.width,
      height: embedded.height,
    });
  }
  return doc.save();
}
