import { renderPage } from "./pdfjs";

/**
 * Küçük resim önbelleği ve render kuyruğu.
 *
 * pdf.js ağır işi (parse + raster) kendi worker'ında yaptığı için ayrı bir
 * worker'a ihtiyaç yok; burada asıl mesele eşzamanlı render sayısını sınırlamak
 * ve üretilen bitmap'leri sınırlı bir LRU'da tutmak. 300+ sayfalık belgede
 * hepsini bellekte tutmak yüzlerce MB ederdi.
 */

const MAX_CACHED = 240;
const MAX_CONCURRENT = 3;

export interface Thumbnail {
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

/** Aynı sayfa+rotasyon+genişlik kombinasyonu için tekil anahtar. */
function cacheKey(sourceId: string, pageIndex: number, rotation: number, width: number): string {
  return `${sourceId}:${pageIndex}:${rotation}:${width}`;
}

const cache = new Map<string, Thumbnail>();
const inFlight = new Map<string, Promise<Thumbnail>>();

let active = 0;
const queue: Array<() => void> = [];

function runNext() {
  if (active >= MAX_CONCURRENT) return;
  const task = queue.shift();
  if (!task) return;
  active += 1;
  task();
}

function schedule<T>(work: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push(() => {
      work()
        .then(resolve, reject)
        .finally(() => {
          active -= 1;
          runNext();
        });
    });
    runNext();
  });
}

function remember(key: string, thumb: Thumbnail) {
  cache.set(key, thumb);
  while (cache.size > MAX_CACHED) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.get(oldest)?.bitmap.close();
    cache.delete(oldest);
  }
}

export function getCachedThumbnail(
  sourceId: string,
  pageIndex: number,
  rotation: number,
  width: number,
): Thumbnail | undefined {
  const key = cacheKey(sourceId, pageIndex, rotation, width);
  const hit = cache.get(key);
  if (hit) {
    // LRU: erişilen kaydı sona taşı.
    cache.delete(key);
    cache.set(key, hit);
  }
  return hit;
}

export async function getThumbnail(
  sourceId: string,
  bytes: Uint8Array,
  pageIndex: number,
  rotation: number,
  width: number,
): Promise<Thumbnail> {
  const key = cacheKey(sourceId, pageIndex, rotation, width);

  const cached = getCachedThumbnail(sourceId, pageIndex, rotation, width);
  if (cached) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = schedule(async () => {
    const rendered = await renderPage(sourceId, bytes, pageIndex, { targetWidth: width }, rotation);
    const thumb: Thumbnail = {
      bitmap: rendered.bitmap,
      width: rendered.width,
      height: rendered.height,
    };
    remember(key, thumb);
    return thumb;
  }).finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise;
}

/** Bir kaynak kapatıldığında ona ait tüm bitmap'leri serbest bırakır. */
export function evictSource(sourceId: string): void {
  for (const [key, thumb] of cache) {
    if (key.startsWith(`${sourceId}:`)) {
      thumb.bitmap.close();
      cache.delete(key);
    }
  }
}
