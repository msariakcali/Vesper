import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { createBlankPagePdf, PAGE_SIZES } from "./blankPage";
import { imagesToPdf } from "./imageToPdf";

const PNG_1X1 = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="),
  (character) => character.charCodeAt(0),
);

describe("sayfa ekleme üreticileri", () => {
  it("doğru A4 boyutunda tek boş sayfa üretir", async () => {
    const pdf = await PDFDocument.load(await createBlankPagePdf("A4"));
    expect(pdf.getPageCount()).toBe(1);
    const { width, height } = pdf.getPage(0).getSize();
    expect(width).toBeCloseTo(PAGE_SIZES.A4[0]);
    expect(height).toBeCloseTo(PAGE_SIZES.A4[1]);
  });

  it("her görsel için bir PDF sayfası üretir", async () => {
    const bytes = await imagesToPdf([
      { bytes: PNG_1X1, mime: "image/png" },
      { bytes: PNG_1X1, mime: "image/png" },
    ]);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
  });
});
