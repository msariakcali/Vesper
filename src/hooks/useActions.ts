import { useCallback } from "react";
import { buildPdf } from "../core/model/buildPdf";
import type { PageRef } from "../core/model/types";
import { platform } from "../platform";
import { useDocumentStore } from "../store/documentStore";
import { useSelectionStore } from "../store/selectionStore";
import { useUiStore } from "../store/uiStore";

/** "rapor.pdf" + "_sayfa_3-7" -> "rapor_sayfa_3-7.pdf" */
export function suggestName(base: string, suffix: string): string {
  const withoutExt = base.replace(/\.pdf$/i, "");
  return `${withoutExt}${suffix}.pdf`;
}

/**
 * PDF üretip kullanıcıya kaydettiren ortak akış.
 * Meşgul göstergesi, hata yakalama ve bildirim tek yerde.
 */
export function useExportPages() {
  const model = useDocumentStore((s) => s.model);
  const markSaved = useDocumentStore((s) => s.markSaved);
  const setBusy = useUiStore((s) => s.setBusy);
  const notify = useUiStore((s) => s.notify);

  return useCallback(
    async (pages: PageRef[], fileName: string, options?: { markClean?: boolean }) => {
      if (pages.length === 0) {
        notify("error", "Önce en az bir sayfa seçmelisiniz.");
        return false;
      }

      setBusy(`${pages.length} sayfa hazırlanıyor…`);
      try {
        const bytes = await buildPdf(model, pages);
        const path = await platform.saveBytes(bytes, fileName);
        if (!path) return false;

        if (options?.markClean) markSaved();
        notify(
          "success",
          `${pages.length} sayfa kaydedildi${platform.kind === "tauri" ? `: ${path}` : "."}`,
        );
        return true;
      } catch (error) {
        notify("error", error instanceof Error ? error.message : String(error));
        return false;
      } finally {
        setBusy(null);
      }
    },
    [model, markSaved, notify, setBusy],
  );
}

/** Belgenin tamamını kaydeder. */
export function useSaveAll() {
  const exportPages = useExportPages();
  const model = useDocumentStore((s) => s.model);

  return useCallback(() => {
    const first = Object.values(model.sources)[0];
    return exportPages(model.pages, first?.name ?? "belge.pdf", {
      markClean: true,
    });
  }, [exportPages, model]);
}

/**
 * Uygulamanın çekirdek akışı: seçili sayfaları ayrı bir PDF olarak kaydeder.
 * Kaynak belge olduğu gibi kalır.
 */
export function useExtractSelection() {
  const exportPages = useExportPages();
  const model = useDocumentStore((s) => s.model);
  const selected = useSelectionStore((s) => s.selected);

  return useCallback(() => {
    // Seçim sırası değil, belge sırası korunur.
    const pages = model.pages.filter((page) => selected.has(page.id));
    const first = Object.values(model.sources)[0];
    const indices = pages.map((page) => model.pages.indexOf(page) + 1);
    const label =
      indices.length === 1
        ? `_sayfa_${indices[0]}`
        : `_sayfa_${indices[0]}-${indices[indices.length - 1]}`;
    return exportPages(pages, suggestName(first?.name ?? "belge.pdf", label));
  }, [exportPages, model, selected]);
}
