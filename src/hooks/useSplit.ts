import { useCallback } from "react";
import { buildPdf } from "../core/model/buildPdf";
import type { PageRef } from "../core/model/types";
import { platform } from "../platform";
import { useDocumentStore } from "../store/documentStore";
import { useUiStore } from "../store/uiStore";
import { useTranslation } from "../i18n";

export function useSplitExport() {
  const model = useDocumentStore((state) => state.model);
  const setBusy = useUiStore((state) => state.setBusy);
  const notify = useUiStore((state) => state.notify);
  const { t } = useTranslation();

  return useCallback(
    async (groups: { name: string; pages: PageRef[] }[], baseName: string) => {
      if (groups.length === 0) {
        notify("error", t("noPagesToSplit"));
        return;
      }
      setBusy(t("preparingFilesCount", { count: groups.length }));
      try {
        const stem = baseName.replace(/\.pdf$/i, "");
        const files = await Promise.all(
          groups.map(async (group) => ({
            name: `${stem}_${group.name}.pdf`,
            data: await buildPdf(model, group.pages),
          })),
        );
        const count = await platform.saveManyToDir(files);
        if (count > 0) notify("success", t("filesSavedCount", { count }));
      } catch (error) {
        notify("error", error instanceof Error ? error.message : String(error));
      } finally {
        setBusy(null);
      }
    },
    [model, notify, setBusy, t],
  );
}
