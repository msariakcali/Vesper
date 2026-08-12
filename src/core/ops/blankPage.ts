import { PDFDocument } from "pdf-lib";

export const PAGE_SIZES = {
  A4: [595.28, 841.89] as const,
  Letter: [612, 792] as const,
};

export async function createBlankPagePdf(
  size: keyof typeof PAGE_SIZES = "A4",
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage([...PAGE_SIZES[size]] as [number, number]);
  return doc.save();
}
