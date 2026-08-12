import { useEffect } from "react";
import { buildPdf } from "../core/model/buildPdf";
import { platform } from "../platform";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";

let saveRevision = 0;

/** Masaüstünde değişiklikleri Belgeler/PDF Editör klasörüne otomatik yazar. */
export function useAutoSave() {
  const model = useDocumentStore((state) => state.model);
  const dirty = useDocumentStore((state) => state.dirty);
  const setAutoSaveStatus = useUiStore((state) => state.setAutoSaveStatus);
  const notify = useUiStore((state) => state.notify);

  useEffect(() => {
    saveRevision += 1;
    const revision = saveRevision;
    if (platform.kind !== "tauri" || !dirty || model.pages.length === 0) {
      if (model.pages.length === 0) setAutoSaveStatus("idle", null);
      return;
    }

    setAutoSaveStatus("pending");
    const timer = window.setTimeout(() => {
      const snapshot = model;
      const firstSource = Object.values(snapshot.sources)[0];
      const name = firstSource?.name.toLowerCase().endsWith(".pdf")
        ? firstSource.name
        : "belge.pdf";
      setAutoSaveStatus("saving");

      void buildPdf(snapshot, snapshot.pages)
        .then(async (bytes) => {
          if (revision !== saveRevision) return;
          const path = await platform.saveBytes(bytes, name);
          if (revision !== saveRevision || !path) return;
          if (useDocumentStore.getState().model === snapshot) {
            useDocumentStore.getState().markSaved();
          }
          setAutoSaveStatus("saved", path);
        })
        .catch((error: unknown) => {
          if (revision !== saveRevision) return;
          setAutoSaveStatus("error");
          notify("error", `Otomatik kayıt başarısız: ${error instanceof Error ? error.message : String(error)}`);
        });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [dirty, model, notify, setAutoSaveStatus]);
}
