import { describe, expect, it } from "vitest";
import type { PageRef } from "../model/types";
import { splitByRanges, splitEachPage, splitEveryN } from "./split";

const pages: PageRef[] = Array.from({ length: 12 }, (_, index) => ({
  id: `p${index}`,
  sourceId: "source",
  sourceIndex: index,
  rotation: 0,
  overlays: [],
}));

describe("PDF bölme grupları", () => {
  it("satır başına bir aralık üretir", () => {
    expect(splitByRanges(pages, "1-5\n6-10\n11-12").map((group) => group.pages.length)).toEqual([
      5, 5, 2,
    ]);
  });

  it("her N sayfada böler", () => {
    expect(splitEveryN(pages, 5).map((group) => group.pages.length)).toEqual([5, 5, 2]);
  });

  it("her sayfayı ayrı dosyaya ayırır", () => {
    expect(splitEachPage(pages)).toHaveLength(12);
    expect(splitEachPage(pages)[11].name).toBe("sayfa_12");
  });
});
