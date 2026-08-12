import type { PageRef } from "../model/types";
import { parsePageRange } from "./pageRange";

export interface SplitGroup {
  name: string;
  pages: PageRef[];
}

/** Her satırı ayrı bir sayfa aralığı olarak gruplar. */
export function splitByRanges(pages: PageRef[], rangesText: string): SplitGroup[] {
  const lines = rangesText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines
    .map((line, index) => {
      const { indices } = parsePageRange(line, pages.length);
      return {
        name: `parca_${index + 1}`,
        pages: indices.map((pageIndex) => pages[pageIndex]).filter(Boolean),
      };
    })
    .filter((group) => group.pages.length > 0);
}

/** Her N sayfada yeni bir grup başlatır. */
export function splitEveryN(pages: PageRef[], n: number): SplitGroup[] {
  if (!Number.isFinite(n) || n < 1) return [];
  const size = Math.floor(n);
  const groups: SplitGroup[] = [];
  for (let index = 0; index < pages.length; index += size) {
    groups.push({ name: `parca_${groups.length + 1}`, pages: pages.slice(index, index + size) });
  }
  return groups;
}

/** Her sayfayı ayrı bir grup yapar. */
export function splitEachPage(pages: PageRef[]): SplitGroup[] {
  return pages.map((page, index) => ({ name: `sayfa_${index + 1}`, pages: [page] }));
}
