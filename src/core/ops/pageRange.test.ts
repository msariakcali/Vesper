import { describe, expect, it } from "vitest";
import { formatPageRange, parsePageRange } from "./pageRange";

describe("parsePageRange", () => {
  it("tek sayfa ve aralıkları birlikte ayrıştırır", () => {
    const { indices, errors } = parsePageRange("1-5, 8, 11-13", 20);
    expect(indices).toEqual([0, 1, 2, 3, 4, 7, 10, 11, 12]);
    expect(errors).toEqual([]);
  });

  it("çekirdek akış: 3-7 tam beş sayfa verir", () => {
    const { indices } = parsePageRange("3-7", 10);
    expect(indices).toEqual([2, 3, 4, 5, 6]);
    expect(indices).toHaveLength(5);
  });

  it("tekrarları ayıklar ve sıralar", () => {
    const { indices } = parsePageRange("5, 1-3, 2, 5", 10);
    expect(indices).toEqual([0, 1, 2, 4]);
  });

  it("ters yazılan aralığı düzeltir", () => {
    expect(parsePageRange("7-3", 10).indices).toEqual([2, 3, 4, 5, 6]);
  });

  it("farklı ayraçları ve en tiresini kabul eder", () => {
    expect(parsePageRange("1–2; 4  6", 10).indices).toEqual([0, 1, 3, 5]);
  });

  it("sınır dışı değerleri hata olarak bildirir ama geçerlileri korur", () => {
    const { indices, errors } = parsePageRange("2-4, 99", 10);
    expect(indices).toEqual([1, 2, 3]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("99");
  });

  it("anlamsız girdiyi hata olarak işaretler", () => {
    const { indices, errors } = parsePageRange("abc", 10);
    expect(indices).toEqual([]);
    expect(errors).toEqual(["abc"]);
  });

  it("'tümü' kısayolunu tanır", () => {
    expect(parsePageRange("tümü", 4).indices).toEqual([0, 1, 2, 3]);
    expect(parsePageRange("all", 3).indices).toEqual([0, 1, 2]);
  });

  it("boş girdide boş sonuç döner", () => {
    expect(parsePageRange("   ", 10)).toEqual({ indices: [], errors: [] });
  });
});

describe("formatPageRange", () => {
  it("bitişik indeksleri aralığa sıkıştırır", () => {
    expect(formatPageRange([0, 1, 2, 4, 7, 8])).toBe("1-3, 5, 8-9");
  });

  it("tek sayfayı aralık yapmaz", () => {
    expect(formatPageRange([3])).toBe("4");
  });

  it("boş listede boş metin döner", () => {
    expect(formatPageRange([])).toBe("");
  });

  it("parsePageRange ile gidiş-dönüş tutarlı", () => {
    const text = "1-3, 5, 8-9";
    expect(formatPageRange(parsePageRange(text, 20).indices)).toBe(text);
  });
});
