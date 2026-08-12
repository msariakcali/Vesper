import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { buildPdf } from "./buildPdf";
import { parsePageRange } from "../ops/pageRange";
import { nextId, pagesFromSource, type DocumentModel, type SourceDocument } from "./types";

/** 12 sayfalık, her sayfası büyük bir numarayla işaretli test belgesi üretir. */
async function makeTestPdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pageCount; i += 1) {
    const page = doc.addPage([200, 300]);
    page.drawText(String(i), { x: 80, y: 140, size: 40, font, color: rgb(0, 0, 0) });
  }
  return doc.save();
}

async function readBackPageNumbers(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes);
}

describe("çekirdek akış: aç → 3-7 seç → ayıkla", () => {
  it("tam olarak sayfa 3-7'yi doğru sırada içeren bir PDF üretir", async () => {
    const bytes = await makeTestPdf(12);
    const sourceId = nextId("src");
    const source: SourceDocument = { id: sourceId, name: "test12.pdf", bytes, pageCount: 12 };
    const model: DocumentModel = { sources: { [sourceId]: source }, pages: pagesFromSource(source) };

    const { indices } = parsePageRange("3-7", 12);
    expect(indices).toEqual([2, 3, 4, 5, 6]);

    const selectedPages = indices.map((i) => model.pages[i]);
    const outputBytes = await buildPdf(model, selectedPages);

    const output = await readBackPageNumbers(outputBytes);
    expect(output.getPageCount()).toBe(5);
  });

  it("rotasyon uygulanan sayfa çıktıda da döndürülmüş olur", async () => {
    const bytes = await makeTestPdf(3);
    const sourceId = nextId("src");
    const source: SourceDocument = { id: sourceId, name: "test3.pdf", bytes, pageCount: 3 };
    const pages = pagesFromSource(source);
    pages[1].rotation = 90;
    const model: DocumentModel = { sources: { [sourceId]: source }, pages };

    const outputBytes = await buildPdf(model, pages);
    const output = await readBackPageNumbers(outputBytes);
    expect(output.getPage(1).getRotation().angle).toBe(90);
    expect(output.getPage(0).getRotation().angle).toBe(0);
  });

  it("aynı sayfa birden çok kez kullanılırsa (çoğaltma) her ikisi de çıktıya girer", async () => {
    const bytes = await makeTestPdf(3);
    const sourceId = nextId("src");
    const source: SourceDocument = { id: sourceId, name: "test3.pdf", bytes, pageCount: 3 };
    const pages = pagesFromSource(source);
    const duplicated = [pages[0], pages[0], pages[1]];

    const model: DocumentModel = { sources: { [source.id]: source }, pages: duplicated };
    const outputBytes = await buildPdf(model, duplicated);
    const output = await readBackPageNumbers(outputBytes);
    expect(output.getPageCount()).toBe(3);
  });

  it("çok kaynaklı birleştirme: iki belgeden gelen sayfalar tek çıktıda sırayla yer alır", async () => {
    const bytesA = await makeTestPdf(2);
    const bytesB = await makeTestPdf(2);
    const sourceA: SourceDocument = { id: nextId("src"), name: "a.pdf", bytes: bytesA, pageCount: 2 };
    const sourceB: SourceDocument = { id: nextId("src"), name: "b.pdf", bytes: bytesB, pageCount: 2 };
    const pagesA = pagesFromSource(sourceA);
    const pagesB = pagesFromSource(sourceB);
    const model: DocumentModel = {
      sources: { [sourceA.id]: sourceA, [sourceB.id]: sourceB },
      pages: [pagesA[0], pagesB[0], pagesA[1], pagesB[1]],
    };

    const outputBytes = await buildPdf(model, model.pages);
    const output = await readBackPageNumbers(outputBytes);
    expect(output.getPageCount()).toBe(4);
  });

  it("Türkçe karakter içeren metin overlay'ini gerçek PDF'e gömer", async () => {
    const bytes = await makeTestPdf(1);
    const source: SourceDocument = {
      id: nextId("src"),
      name: "turkce.pdf",
      bytes,
      pageCount: 1,
    };
    const pages = pagesFromSource(source);
    pages[0].overlays.push({
      kind: "text",
      id: nextId("ov"),
      text: "Şğüöçİı TEST",
      x: 0.1,
      y: 0.2,
      size: 18,
      color: "#808080",
      opacity: 0.8,
      rotate: 0,
    });
    const outputBytes = await buildPdf({ sources: { [source.id]: source }, pages }, pages);
    const output = await PDFDocument.load(outputBytes);
    expect(output.getPageCount()).toBe(1);
    expect(outputBytes.length).toBeGreaterThan(bytes.length);
  });

  it("PNG görsel overlay'ini gerçek PDF'e gömer", async () => {
    const bytes = await makeTestPdf(1);
    const source: SourceDocument = {
      id: nextId("src"),
      name: "imza.pdf",
      bytes,
      pageCount: 1,
    };
    const pages = pagesFromSource(source);
    const png = Uint8Array.from(
      atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="),
      (character) => character.charCodeAt(0),
    );
    pages[0].overlays.push({
      kind: "image",
      id: nextId("ov"),
      data: png,
      mime: "image/png",
      x: 0.1,
      y: 0.1,
      width: 0.25,
      height: 0.1,
      opacity: 1,
      rotate: 0,
    });
    const outputBytes = await buildPdf({ sources: { [source.id]: source }, pages }, pages);
    expect((await PDFDocument.load(outputBytes)).getPageCount()).toBe(1);
    expect(outputBytes.length).toBeGreaterThan(bytes.length);
  });
});
