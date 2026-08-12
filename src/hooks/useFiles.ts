import { useCallback, useEffect } from "react";
import { platform, type PickedFile } from "../platform";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { useRecentFilesStore } from "../store/recentFilesStore";

/**
 * Dosya açma akışı: diyalog, sürükle-bırak ve "PDF Editör ile aç" başlangıcı
 * aynı yoldan geçsin diye tek yerde toplandı.
 */
export function useAddFiles() {
  const addSources = useDocumentStore((s) => s.addSources);
  const notify = useUiStore((s) => s.notify);
  const setBusy = useUiStore((s) => s.setBusy);

  return useCallback(
    async (files: PickedFile[]) => {
      const pdfs = files.filter((f) => f.name.toLowerCase().endsWith(".pdf"));
      if (pdfs.length === 0) return;

      setBusy(pdfs.length === 1 ? `${pdfs[0].name} açılıyor…` : `${pdfs.length} dosya açılıyor…`);
      try {
        const prepared =
          platform.kind === "tauri"
            ? await Promise.all(
                pdfs.map(async (file) => ({
                  ...file,
                  path: (await platform.saveBytes(file.bytes, file.name)) ?? file.path,
                })),
              )
            : pdfs;
        const { added, errors } = await addSources(prepared);
        for (const error of errors) notify("error", error);
        if (added > 0) {
          const openedPaths = new Set(
            Object.values(useDocumentStore.getState().model.sources)
              .map((source) => source.path)
              .filter(Boolean),
          );
          const addRecent = useRecentFilesStore.getState().add;
          for (const file of prepared) {
            if (file.path && openedPaths.has(file.path)) addRecent({ path: file.path, name: file.name });
          }
          notify("success", added === 1 ? "Belge açıldı." : `${added} belge açıldı.`);
        }
      } finally {
        setBusy(null);
      }
    },
    [addSources, notify, setBusy],
  );
}

/** "Aç" düğmesi ve Ctrl+O için native dosya diyaloğunu çağırır. */
export function useOpenDialog() {
  const addFiles = useAddFiles();
  const notify = useUiStore((s) => s.notify);

  return useCallback(async () => {
    try {
      const files = await platform.pickPdfFiles(true);
      await addFiles(files);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : String(error));
    }
  }, [addFiles, notify]);
}

/** Pencereye bırakılan dosyaları ve başlangıç argümanlarını bağlar. */
export function useFileDropAndStartup() {
  const addFiles = useAddFiles();

  useEffect(() => {
    const disposers: Array<() => void> = [];
    let cancelled = false;

    void platform.onFileDrop((files) => void addFiles(files)).then((unsubscribe) => {
      if (cancelled) unsubscribe();
      else disposers.push(unsubscribe);
    });

    void platform.onOpenFiles((files) => void addFiles(files)).then((unsubscribe) => {
      if (cancelled) unsubscribe();
      else disposers.push(unsubscribe);
    });

    void platform.getStartupFiles().then((files) => {
      if (!cancelled && files.length > 0) void addFiles(files);
    });

    return () => {
      cancelled = true;
      disposers.forEach((dispose) => dispose());
    };
  }, [addFiles]);
}
