import { extractPageText } from "./pdfjs";

const cache = new Map<string, string>();

export async function getPageText(
  sourceId: string,
  bytes: Uint8Array,
  pageIndex: number,
): Promise<string> {
  const key = `${sourceId}:${pageIndex}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const text = await extractPageText(sourceId, bytes, pageIndex);
  cache.set(key, text);
  return text;
}

export function evictPageText(sourceId: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(`${sourceId}:`)) cache.delete(key);
  }
}
