import { useEffect } from "react";
import { useDocumentStore } from "../store/documentStore";
import { useSelectionStore } from "../store/selectionStore";
import { useUiStore } from "../store/uiStore";
import { useSaveAll } from "./useActions";
import { useOpenDialog } from "./useFiles";

/** Uygulama geneli klavye kısayolları. */
export function useKeyboardShortcuts() {
  const saveAll = useSaveAll();
  const openDialog = useOpenDialog();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Metin kutusunda yazarken kısayollar devreye girmesin.
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      const doc = useDocumentStore.getState();
      const selection = useSelectionStore.getState();
      const ui = useUiStore.getState();
      const ids = [...selection.selected];
      const ctrl = event.ctrlKey || event.metaKey;

      // Önizleme açıkken Esc onu kapatsın.
      if (event.key === "Escape") {
        if (ui.previewPageId) {
          ui.setPreviewPage(null);
          ui.setPlacementMode(null);
          ui.setPlacementImage(null);
        }
        else {
          ui.setSelectionMode(false);
          selection.clear();
        }
        return;
      }

      if (ctrl) {
        switch (event.key.toLowerCase()) {
          case "o":
            event.preventDefault();
            void openDialog();
            return;
          case "s":
            event.preventDefault();
            void saveAll();
            return;
          case "a":
            event.preventDefault();
            selection.set(doc.model.pages.map((page) => page.id));
            return;
          case "z":
            event.preventDefault();
            // Ctrl+Shift+Z de ileri alsın — yaygın beklenti.
            if (event.shiftKey) doc.redo();
            else doc.undo();
            return;
          case "y":
            event.preventDefault();
            doc.redo();
            return;
          case "d":
            if (ids.length > 0) {
              event.preventDefault();
              doc.duplicatePages(ids);
            }
            return;
          case "e":
            event.preventDefault();
            ui.setActiveTool("extract");
            return;
        }

        if (event.key === "ArrowLeft" && ids.length > 0) {
          event.preventDefault();
          doc.rotatePages(ids, -90);
          return;
        }
        if (event.key === "ArrowRight" && ids.length > 0) {
          event.preventDefault();
          doc.rotatePages(ids, 90);
          return;
        }
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && ids.length > 0) {
        event.preventDefault();
        doc.deletePages(ids);
        return;
      }

      // R, seçili sayfadan; seçim yoksa ilk sayfadan okuma modunu açar.
      if (event.key.toLowerCase() === "r") {
        const pageId = ids[0] ?? doc.model.pages[0]?.id;
        if (pageId) {
          event.preventDefault();
          ui.setPreviewPage(pageId);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openDialog, saveAll]);
}
