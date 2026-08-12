import { create } from "zustand";

/**
 * Sayfa seçimi.
 *
 * Belge durumundan ayrı tutuluyor çünkü seçim değişimi undo geçmişine
 * girmemeli — kullanıcı Ctrl+Z ile seçimini değil, düzenlemesini geri alır.
 */

export interface SelectionState {
  selected: Set<string>;
  /** Shift+tık aralığı için son "çıpa" sayfa kimliği. */
  anchorId: string | null;

  isSelected: (id: string) => boolean;
  set: (ids: string[]) => void;
  toggle: (id: string) => void;
  selectRangeTo: (id: string, orderedIds: string[]) => void;
  selectOnly: (id: string) => void;
  clear: () => void;
  /** Silinen sayfaların kimliklerini seçimden düşürür. */
  retain: (validIds: string[]) => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selected: new Set<string>(),
  anchorId: null,

  isSelected: (id) => get().selected.has(id),

  set: (ids) => set({ selected: new Set(ids), anchorId: ids[ids.length - 1] ?? null }),

  toggle: (id) =>
    set((state) => {
      const selected = new Set(state.selected);
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      return { selected, anchorId: id };
    }),

  selectRangeTo: (id, orderedIds) =>
    set((state) => {
      const anchor = state.anchorId ?? id;
      const from = orderedIds.indexOf(anchor);
      const to = orderedIds.indexOf(id);
      if (from === -1 || to === -1) return { selected: new Set([id]), anchorId: id };
      const [start, end] = from <= to ? [from, to] : [to, from];
      return {
        selected: new Set(orderedIds.slice(start, end + 1)),
        anchorId: anchor,
      };
    }),

  selectOnly: (id) => set({ selected: new Set([id]), anchorId: id }),

  clear: () => set({ selected: new Set<string>(), anchorId: null }),

  retain: (validIds) =>
    set((state) => {
      const valid = new Set(validIds);
      const selected = new Set<string>();
      for (const id of state.selected) if (valid.has(id)) selected.add(id);
      if (selected.size === state.selected.size) return {};
      return {
        selected,
        anchorId: state.anchorId && valid.has(state.anchorId) ? state.anchorId : null,
      };
    }),
}));
