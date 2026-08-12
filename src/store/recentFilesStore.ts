import { create } from "zustand";

export interface RecentFile {
  path: string;
  name: string;
  openedAt: number;
}

interface RecentFilesState {
  files: RecentFile[];
  add: (file: Omit<RecentFile, "openedAt">) => void;
  remove: (path: string) => void;
}

const STORAGE_KEY = "pdf-editor-recent";

function loadRecentFiles(): RecentFile[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is RecentFile =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as RecentFile).path === "string" &&
          typeof (item as RecentFile).name === "string" &&
          typeof (item as RecentFile).openedAt === "number",
      )
      .slice(0, 10);
  } catch {
    return [];
  }
}

function persist(files: RecentFile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

export const useRecentFilesStore = create<RecentFilesState>((set) => ({
  files: loadRecentFiles(),
  add: (file) =>
    set((state) => {
      const files = [
        { ...file, openedAt: Date.now() },
        ...state.files.filter((recent) => recent.path !== file.path),
      ].slice(0, 10);
      persist(files);
      return { files };
    }),
  remove: (path) =>
    set((state) => {
      const files = state.files.filter((file) => file.path !== path);
      persist(files);
      return { files };
    }),
}));
