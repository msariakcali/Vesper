import { create } from "zustand";

/** Arayüz durumu: tema, aktif araç paneli, bildirimler, meşgul göstergesi. */

export type ToolId =
  | "pages"
  | "extract"
  | "split"
  | "merge"
  | "watermark"
  | "pageNumbers"
  | "text"
  | "signature"
  | "crop"
  | "insert"
  | "convert";

export type Theme = "light" | "dark";
export type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";
export type PlacementMode = "text" | "signature" | "image" | null;

export interface PlacementImage {
  data: Uint8Array;
  mime: "image/png" | "image/jpeg";
  aspectRatio: number;
}

export interface Toast {
  id: number;
  kind: "info" | "success" | "error";
  message: string;
}

const THEME_KEY = "pdf-editor-theme";

function initialTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export interface UiState {
  theme: Theme;
  activeTool: ToolId;
  /** Uzun süren işlem sırasında gösterilen açıklama; boşsa işlem yok. */
  busy: string | null;
  toasts: Toast[];
  /** Büyük önizlemede açık olan sayfanın kimliği; null ise ızgara görünümü. */
  previewPageId: string | null;
  previewZoom: number;
  placementMode: PlacementMode;
  placementImage: PlacementImage | null;
  thumbnailSize: number;
  autoSaveStatus: AutoSaveStatus;
  lastSavedPath: string | null;

  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setActiveTool: (tool: ToolId) => void;
  setBusy: (message: string | null) => void;
  notify: (kind: Toast["kind"], message: string) => void;
  dismissToast: (id: number) => void;
  setPreviewPage: (id: string | null) => void;
  setPreviewZoom: (zoom: number) => void;
  setPlacementMode: (mode: PlacementMode) => void;
  setPlacementImage: (image: PlacementImage | null) => void;
  setThumbnailSize: (size: number) => void;
  setAutoSaveStatus: (status: AutoSaveStatus, path?: string | null) => void;
}

let toastId = 0;

export const useUiStore = create<UiState>((set) => ({
  theme: initialTheme(),
  activeTool: "pages",
  busy: null,
  toasts: [],
  previewPageId: null,
  previewZoom: 1,
  placementMode: null,
  placementImage: null,
  thumbnailSize: 190,
  autoSaveStatus: "idle",
  lastSavedPath: null,

  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },

  toggleTheme: () =>
    set((state) => {
      const theme = state.theme === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, theme);
      document.documentElement.dataset.theme = theme;
      return { theme };
    }),

  setActiveTool: (activeTool) => set({ activeTool }),
  setBusy: (busy) => set({ busy }),

  notify: (kind, message) => {
    toastId += 1;
    const toast: Toast = { id: toastId, kind, message };
    set((state) => ({ toasts: [...state.toasts, toast] }));
    // Hatalar daha uzun kalsın; kullanıcı okuyabilmeli.
    setTimeout(
      () => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== toast.id) })),
      kind === "error" ? 7000 : 3500,
    );
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  setPreviewPage: (previewPageId) => set({ previewPageId }),
  setPreviewZoom: (previewZoom) =>
    set({ previewZoom: Math.max(0.5, Math.min(3, previewZoom)) }),
  setPlacementMode: (placementMode) => set({ placementMode }),
  setPlacementImage: (placementImage) => set({ placementImage }),
  setThumbnailSize: (thumbnailSize) => set({ thumbnailSize }),
  setAutoSaveStatus: (autoSaveStatus, path) =>
    set((state) => ({
      autoSaveStatus,
      lastSavedPath: path === undefined ? state.lastSavedPath : path,
    })),
}));
