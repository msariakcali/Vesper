import { create } from "zustand";
import { evictSource } from "../core/render/thumbnailCache";
import { readPageCount, releasePdfDocument } from "../core/render/pdfjs";
import {
  addRotation,
  createEmptyModel,
  nextId,
  pagesFromSource,
  type DocumentModel,
  type Overlay,
  type PageRef,
  type SourceDocument,
} from "../core/model/types";
import type { PickedFile } from "../platform";

/**
 * Belge durumu ve geçmişi.
 *
 * Undo/redo, model anlık görüntülerini yığında tutarak çalışıyor. Bu ucuz:
 * `pages` hafif nesnelerden oluşan bir dizi ve `sources` baytları referansla
 * paylaşılıyor — kopyalanan tek şey dizi yapısı.
 */

const HISTORY_LIMIT = 60;

export interface DocumentState {
  model: DocumentModel;
  past: DocumentModel[];
  future: DocumentModel[];
  /** Kaydedilmemiş değişiklik var mı (pencere başlığındaki • için). */
  dirty: boolean;

  canUndo: () => boolean;
  canRedo: () => boolean;
  undo: () => void;
  redo: () => void;

  addSources: (files: PickedFile[]) => Promise<{ added: number; errors: string[] }>;
  closeAll: () => void;

  deletePages: (ids: string[]) => void;
  keepOnlyPages: (ids: string[]) => void;
  rotatePages: (ids: string[], delta: number) => void;
  duplicatePages: (ids: string[]) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  movePagesTo: (ids: string[], targetIndex: number) => void;
  insertPages: (pages: PageRef[], atIndex: number) => void;
  addOverlay: (pageIds: string[], overlay: Overlay) => void;
  addOverlayPerPage: (entries: { pageId: string; overlay: Overlay }[]) => void;
  markSaved: () => void;
}

/** Geçmişe kaydederek modeli değiştirir. */
function withHistory(
  state: DocumentState,
  updater: (model: DocumentModel) => DocumentModel,
): Partial<DocumentState> {
  const next = updater(state.model);
  if (next === state.model) return {};
  const past = [...state.past, state.model].slice(-HISTORY_LIMIT);
  return { model: next, past, future: [], dirty: true };
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  model: createEmptyModel(),
  past: [],
  future: [],
  dirty: false,

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  undo: () =>
    set((state) => {
      const previous = state.past[state.past.length - 1];
      if (!previous) return {};
      return {
        model: previous,
        past: state.past.slice(0, -1),
        future: [state.model, ...state.future].slice(0, HISTORY_LIMIT),
        dirty: true,
      };
    }),

  redo: () =>
    set((state) => {
      const [next, ...rest] = state.future;
      if (!next) return {};
      return {
        model: next,
        past: [...state.past, state.model].slice(-HISTORY_LIMIT),
        future: rest,
        dirty: true,
      };
    }),

  addSources: async (files) => {
    const errors: string[] = [];
    const sources: SourceDocument[] = [];

    for (const file of files) {
      const id = nextId("src");
      try {
        const pageCount = await readPageCount(id, file.bytes);
        sources.push({ id, name: file.name, path: file.path, bytes: file.bytes, pageCount });
      } catch (error) {
        releasePdfDocument(id);
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${file.name}: ${message}`);
      }
    }

    if (sources.length > 0) {
      set((state) =>
        withHistory(state, (model) => {
          const nextSources = { ...model.sources };
          let nextPages = model.pages;
          for (const source of sources) {
            nextSources[source.id] = source;
            nextPages = [...nextPages, ...pagesFromSource(source)];
          }
          return { sources: nextSources, pages: nextPages };
        }),
      );
    }

    return { added: sources.length, errors };
  },

  closeAll: () =>
    set((state) => {
      for (const id of Object.keys(state.model.sources)) {
        releasePdfDocument(id);
        evictSource(id);
      }
      return { model: createEmptyModel(), past: [], future: [], dirty: false };
    }),

  deletePages: (ids) =>
    set((state) =>
      withHistory(state, (model) => {
        const remove = new Set(ids);
        const pages = model.pages.filter((page) => !remove.has(page.id));
        if (pages.length === model.pages.length) return model;
        return pruneSources({ ...model, pages });
      }),
    ),

  /** Çekirdek "ayıkla" davranışının belge içi karşılığı: seçilenler dışını at. */
  keepOnlyPages: (ids) =>
    set((state) =>
      withHistory(state, (model) => {
        const keep = new Set(ids);
        const pages = model.pages.filter((page) => keep.has(page.id));
        if (pages.length === 0 || pages.length === model.pages.length) return model;
        return pruneSources({ ...model, pages });
      }),
    ),

  rotatePages: (ids, delta) =>
    set((state) =>
      withHistory(state, (model) => {
        const target = new Set(ids);
        if (target.size === 0) return model;
        return {
          ...model,
          pages: model.pages.map((page) =>
            target.has(page.id)
              ? { ...page, rotation: addRotation(page.rotation, delta) }
              : page,
          ),
        };
      }),
    ),

  duplicatePages: (ids) =>
    set((state) =>
      withHistory(state, (model) => {
        const target = new Set(ids);
        if (target.size === 0) return model;
        const pages: PageRef[] = [];
        for (const page of model.pages) {
          pages.push(page);
          if (target.has(page.id)) {
            pages.push({ ...page, id: nextId("p"), overlays: [...page.overlays] });
          }
        }
        return { ...model, pages };
      }),
    ),

  reorderPages: (fromIndex, toIndex) =>
    set((state) =>
      withHistory(state, (model) => {
        if (fromIndex === toIndex) return model;
        const pages = [...model.pages];
        const [moved] = pages.splice(fromIndex, 1);
        if (!moved) return model;
        pages.splice(toIndex, 0, moved);
        return { ...model, pages };
      }),
    ),

  /** Çoklu seçimi tek blok halinde hedef indekse taşır. */
  movePagesTo: (ids, targetIndex) =>
    set((state) =>
      withHistory(state, (model) => {
        const target = new Set(ids);
        if (target.size === 0) return model;
        const moving = model.pages.filter((page) => target.has(page.id));
        const rest = model.pages.filter((page) => !target.has(page.id));
        // Hedef indeks, taşınanlar çıkarıldıktan sonraki listeye göre kaydırılır.
        const before = model.pages
          .slice(0, targetIndex)
          .filter((page) => target.has(page.id)).length;
        const insertAt = Math.max(0, Math.min(rest.length, targetIndex - before));
        return { ...model, pages: [...rest.slice(0, insertAt), ...moving, ...rest.slice(insertAt)] };
      }),
    ),

  insertPages: (pages, atIndex) =>
    set((state) =>
      withHistory(state, (model) => {
        if (pages.length === 0) return model;
        const index = Math.max(0, Math.min(model.pages.length, atIndex));
        return {
          ...model,
          pages: [...model.pages.slice(0, index), ...pages, ...model.pages.slice(index)],
        };
      }),
    ),

  addOverlay: (pageIds, overlay) =>
    set((state) =>
      withHistory(state, (model) => {
        const target = new Set(pageIds);
        if (target.size === 0) return model;
        return {
          ...model,
          pages: model.pages.map((page) =>
            target.has(page.id)
              ? { ...page, overlays: [...page.overlays, { ...overlay, id: nextId("ov") }] }
              : page,
          ),
        };
      }),
    ),

  addOverlayPerPage: (entries) =>
    set((state) =>
      withHistory(state, (model) => {
        if (entries.length === 0) return model;
        const byPage = new Map(entries.map((entry) => [entry.pageId, entry.overlay]));
        return {
          ...model,
          pages: model.pages.map((page) => {
            const overlay = byPage.get(page.id);
            return overlay
              ? { ...page, overlays: [...page.overlays, { ...overlay, id: nextId("ov") }] }
              : page;
          }),
        };
      }),
    ),

  markSaved: () => set({ dirty: false }),
}));

/**
 * Artık hiçbir sayfası kullanılmayan kaynakları modelden düşürür.
 *
 * Belleği geri vermek için önemli: 100 MB'lık bir PDF'in tüm sayfaları
 * silindiğinde baytlarını tutmaya devam etmenin anlamı yok. Ancak undo
 * geçmişindeki eski modeller hâlâ bu kaynağa işaret edebileceği için
 * pdf.js belgesini ve bitmap'leri burada serbest bırakmıyoruz.
 */
function pruneSources(model: DocumentModel): DocumentModel {
  const used = new Set(model.pages.map((page) => page.sourceId));
  const sources: Record<string, SourceDocument> = {};
  let changed = false;
  for (const [id, source] of Object.entries(model.sources)) {
    if (used.has(id)) sources[id] = source;
    else changed = true;
  }
  return changed ? { ...model, sources } : model;
}
