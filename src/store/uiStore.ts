import { create } from "zustand";

/** Arayüz durumu: tema, aktif araç paneli, bildirimler, meşgul göstergesi. */

export type ToolId =
  | "pages"
  | "documents"
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

export type Language = "en" | "tr";
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

const LANGUAGE_KEY = "pdf-editor-language";

function initialLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_KEY);
  if (stored === "tr" || stored === "en") return stored;
  return "en";
}

export interface UiState {
  language: Language;
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
  /** Açıkken düz tıklama, Ctrl gerektirmeden çoklu sayfa seçimini değiştirir. */
  selectionMode: boolean;

  setLanguage: (language: Language) => void;
  setActiveTool: (tool: ToolId) => void;
  setBusy: (message: string | null) => void;
  notify: (kind: Toast["kind"], message: string) => void;
  dismissToast: (id: number) => void;
  setPreviewPage: (id: string | null) => void;
  setPreviewZoom: (zoom: number) => void;
  setPlacementMode: (mode: PlacementMode) => void;
  setPlacementImage: (image: PlacementImage | null) => void;
  setThumbnailSize: (size: number) => void;
  setSelectionMode: (enabled: boolean) => void;
}

let toastId = 0;

export const useUiStore = create<UiState>((set) => ({
  language: initialLanguage(),
  activeTool: "pages",
  busy: null,
  toasts: [],
  previewPageId: null,
  previewZoom: 1.1,
  placementMode: null,
  placementImage: null,
  thumbnailSize: 220,
  selectionMode: false,

  setLanguage: (language) => {
    localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
    set({ language });
  },

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
  setSelectionMode: (selectionMode) => set({ selectionMode }),
}));
