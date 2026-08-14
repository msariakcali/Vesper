import {
  IMAGE_FILTER,
  PDF_FILTER,
  type OutputFile,
  type PickedFile,
  type Platform,
} from "./types";

/** Web uygulamasının dosya seçme, bırakma ve indirme davranışları. */

function toAccept(filter: { extensions: string[] }): string {
  return filter.extensions.map((e) => `.${e}`).join(",");
}

function pickViaInput(multiple: boolean, accept: string): Promise<PickedFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    // İptal edilirse hiçbir olay tetiklenmeyebilir; pencere odağa döndüğünde
    // dosya seçilmemişse boş sonuçla kapatıyoruz ki promise askıda kalmasın.
    const settle = (files: PickedFile[]) => {
      window.removeEventListener("focus", onFocus);
      resolve(files);
    };
    const onFocus = () => {
      setTimeout(() => {
        if (!input.files || input.files.length === 0) settle([]);
      }, 300);
    };
    input.addEventListener("change", async () => {
      const files = Array.from(input.files ?? []);
      settle(await Promise.all(files.map(fileToPicked)));
    });
    window.addEventListener("focus", onFocus, { once: true });
    input.click();
  });
}

async function fileToPicked(file: File): Promise<PickedFile> {
  return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
}

function download(data: Uint8Array, name: string) {
  // Uint8Array<ArrayBufferLike> -> Blob için kesin ArrayBuffer'a kopyala.
  const blob = new Blob([data.slice().buffer as ArrayBuffer], {
    type: "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export const webPlatform: Platform = {
  kind: "web",

  pickPdfFiles(multiple = true) {
    return pickViaInput(multiple, toAccept(PDF_FILTER));
  },

  pickImageFiles(multiple = true) {
    return pickViaInput(multiple, toAccept(IMAGE_FILTER));
  },

  async saveBytes(data, suggestedName) {
    download(data, suggestedName);
    return suggestedName;
  },

  async saveManyToDir(files: OutputFile[]) {
    // Tarayıcıda klasör seçimi yok; dosyalar tek tek indirilir.
    for (const file of files) {
      download(file.data, file.name);
      await new Promise((r) => setTimeout(r, 120));
    }
    return files.length;
  },

  async onFileDrop(handler) {
    const accepted = [...PDF_FILTER.extensions, ...IMAGE_FILTER.extensions];
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDrop = async (e: DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer?.files ?? []).filter((f) =>
        accepted.some((ext) => f.name.toLowerCase().endsWith(`.${ext}`)),
      );
      if (files.length === 0) return;
      handler(await Promise.all(files.map(fileToPicked)));
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  },

};
