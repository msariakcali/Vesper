/**
 * Belge modeli.
 *
 * Kritik tasarım kararı: düzenleme sırasında PDF'i asla yeniden yazmıyoruz.
 * Bunun yerine hafif bir `PageRef` listesi tutuyoruz; sil/sırala/döndür gibi
 * işlemler bu dizi üzerinde anlık dizi işlemleri. Gerçek PDF baytları yalnızca
 * kaydet/dışa aktar anında `core/model/buildPdf.ts` içinde üretilir.
 */

export type Rotation = 0 | 90 | 180 | 270;

/** Açık bir kaynak dosya. Baytlar bir kez okunur ve paylaşılır. */
export interface SourceDocument {
  id: string;
  /** Kullanıcıya gösterilen dosya adı, örn. "rapor.pdf" */
  name: string;
  bytes: Uint8Array;
  pageCount: number;
}

/** Sayfa üzerine kaydederken uygulanacak katmanlar (Faz 5). */
export type Overlay =
  | {
      kind: "text";
      id: string;
      text: string;
      /** Sayfa genişliğine oranla 0-1 arası konum (sol-üst köken). */
      x: number;
      y: number;
      size: number;
      color: string;
      opacity: number;
      rotate: number;
    }
  | {
      kind: "image";
      id: string;
      /** PNG/JPEG ham baytları. */
      data: Uint8Array;
      mime: "image/png" | "image/jpeg";
      x: number;
      y: number;
      /** Sayfa genişliğine oranla 0-1 arası boyut. */
      width: number;
      height: number;
      opacity: number;
      rotate: number;
    };

/**
 * Düzenlenen belgedeki tek bir sayfa.
 * Kaynak sayfaya bir referanstır — baytları kopyalamaz.
 */
export interface PageRef {
  /** React anahtarı ve seçim için kararlı kimlik. Sayfa taşınsa da değişmez. */
  id: string;
  sourceId: string;
  /** Kaynak belgedeki 0-tabanlı orijinal indeks. */
  sourceIndex: number;
  /** Kaynağın kendi rotasyonuna eklenen kullanıcı rotasyonu. */
  rotation: Rotation;
  overlays: Overlay[];
}

/** Düzenleyicinin tüm durumu — undo/redo bu nesnenin anlık görüntüsünü alır. */
export interface DocumentModel {
  sources: Record<string, SourceDocument>;
  pages: PageRef[];
}

let idCounter = 0;
/** Çakışmayan, kısa, kararlı kimlik üretir. */
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter.toString(36)}`;
}

export function createEmptyModel(): DocumentModel {
  return { sources: {}, pages: [] };
}

/** Bir kaynak belgenin tüm sayfaları için PageRef üretir. */
export function pagesFromSource(source: SourceDocument): PageRef[] {
  return Array.from({ length: source.pageCount }, (_, i) => ({
    id: nextId("p"),
    sourceId: source.id,
    sourceIndex: i,
    rotation: 0 as Rotation,
    overlays: [],
  }));
}

/** Rotasyonu 0-270 aralığına normalize ederek ekler. */
export function addRotation(current: Rotation, delta: number): Rotation {
  const next = (((current + delta) % 360) + 360) % 360;
  return next as Rotation;
}
