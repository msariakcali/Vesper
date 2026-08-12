import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { PAGE_SIZES } from "./blankPage";
import { normalizePdfToA4 } from "./normalize";

describe("normalizePdfToA4", () => {
  it("farklı boyutlardaki tüm sayfaları A4 yapar", async () => {
    const source = await PDFDocument.create();
    source.addPage([300, 200]);
    source.addPage([1000, 1200]);
    const output = await PDFDocument.load(await normalizePdfToA4(await source.save()));
    expect(output.getPageCount()).toBe(2);
    for (const page of output.getPages()) {
      expect(page.getWidth()).toBeCloseTo(PAGE_SIZES.A4[0]);
      expect(page.getHeight()).toBeCloseTo(PAGE_SIZES.A4[1]);
    }
  });
});
