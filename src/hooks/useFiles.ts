import { useCallback, useEffect } from "react";
import { platform, type PickedFile } from "../platform";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { useTranslation } from "../i18n";

/**
 * Dosya seçme ve sürükle-bırak aynı doğrulama akışından geçer.
 */
export function useAddFiles() {
  const addSources = useDocumentStore((s) => s.addSources);
  const notify = useUiStore((s) => s.notify);
  const setBusy = useUiStore((s) => s.setBusy);
  const { t } = useTranslation();

  return useCallback(
    async (files: PickedFile[]) => {
      const pdfs = files.filter((f) => f.name.toLowerCase().endsWith(".pdf"));
      if (pdfs.length === 0) return;

      setBusy(pdfs.length === 1 ? t("openingNamed", { name: pdfs[0].name }) : t("openingFilesCount", { count: pdfs.length }));
      try {
        const { added, errors } = await addSources(pdfs);
        for (const error of errors) notify("error", error);
        if (added > 0) {
          notify("success", added === 1 ? t("documentOpened") : t("documentsOpenedCount", { count: added }));
        }
      } finally {
        setBusy(null);
      }
    },
    [addSources, notify, setBusy, t],
  );
}

/** "Aç" düğmesi ve Ctrl+O için tarayıcının dosya seçicisini çağırır. */
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

/** Sayfaya bırakılan dosyaları uygulamaya bağlar. */
export function useFileDrop() {
  const addFiles = useAddFiles();

  useEffect(() => {
    const disposers: Array<() => void> = [];
    let cancelled = false;

    void platform.onFileDrop((files) => void addFiles(files)).then((unsubscribe) => {
      if (cancelled) unsubscribe();
      else disposers.push(unsubscribe);
    });

    return () => {
      cancelled = true;
      disposers.forEach((dispose) => dispose());
    };
  }, [addFiles]);
}
