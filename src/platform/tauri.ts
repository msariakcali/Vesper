import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import {
  IMAGE_FILTER,
  PDF_FILTER,
  type OutputFile,
  type PickedFile,
  type Platform,
} from "./types";

function baseName(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

/**
 * Yolu baytlara çevirir.
 *
 * dialog ile seçilen yollar fs scope'una otomatik eklendiği için `readFile`
 * çalışır; sürükle-bırak ve başlangıç argümanlarında ise scope'a girmedikleri
 * için Rust tarafındaki `read_file_bytes` komutuna düşeriz.
 */
async function readPath(path: string): Promise<PickedFile> {
  let bytes: Uint8Array;
  try {
    bytes = await readFile(path);
  } catch {
    const buffer = await invoke<ArrayBuffer>("read_file_bytes", { path });
    bytes = new Uint8Array(buffer);
  }
  return { name: baseName(path), path, bytes };
}

async function pick(
  multiple: boolean,
  filter: { name: string; extensions: string[] },
): Promise<PickedFile[]> {
  const selection = await open({ multiple, directory: false, filters: [filter] });
  if (selection === null) return [];
  const paths = Array.isArray(selection) ? selection : [selection];
  return Promise.all(paths.map(readPath));
}

function hasExtension(path: string, extensions: string[]): boolean {
  const lower = path.toLowerCase();
  return extensions.some((ext) => lower.endsWith(`.${ext}`));
}

export const tauriPlatform: Platform = {
  kind: "tauri",

  pickPdfFiles(multiple = true) {
    return pick(multiple, PDF_FILTER);
  },

  pickImageFiles(multiple = true) {
    return pick(multiple, IMAGE_FILTER);
  },

  async saveBytes(data, suggestedName) {
    const path = await invoke<string>("write_library_file", {
      name: suggestedName,
      data: Array.from(data),
    });
    window.dispatchEvent(new Event("pdf-editor-library-changed"));
    return path;
  },

  async saveManyToDir(files: OutputFile[]) {
    if (files.length === 0) return 0;
    const written = await invoke<string[]>("write_library_files", {
      files: files.map((f) => ({ name: f.name, data: Array.from(f.data) })),
    });
    window.dispatchEvent(new Event("pdf-editor-library-changed"));
    return written.length;
  },

  async onFileDrop(handler) {
    const webview = getCurrentWebview();
    return webview.onDragDropEvent(async (event) => {
      if (event.payload.type !== "drop") return;
      const paths = event.payload.paths.filter((p) =>
        hasExtension(p, [...PDF_FILTER.extensions, ...IMAGE_FILTER.extensions]),
      );
      if (paths.length === 0) return;
      handler(await Promise.all(paths.map(readPath)));
    });
  },

  async getStartupFiles() {
    const paths = await invoke<string[]>("startup_files");
    if (paths.length === 0) return [];
    return Promise.all(paths.map(readPath));
  },

  async readFilesByPaths(paths) {
    return Promise.all(paths.map(readPath));
  },

  async onOpenFiles(handler) {
    return listen<string[]>("open-files", (event) => {
      void Promise.all(event.payload.map(readPath)).then(handler);
    });
  },

  getLibraryDir() {
    return invoke<string>("library_dir");
  },

  listLibraryFiles() {
    return invoke("list_library_files");
  },

  async deleteLibraryFile(name) {
    await invoke("delete_library_file", { name });
    window.dispatchEvent(new Event("pdf-editor-library-changed"));
  },

  async openLibraryDir() {
    await invoke("open_library_dir");
  },
};
