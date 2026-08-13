import { Check, FilePlus2, FileText, X } from "lucide-react";
import { useOpenDialog } from "../../hooks/useFiles";
import { useDocumentStore } from "../../store/documentStore";
import { useSelectionStore } from "../../store/selectionStore";
import { Button } from "../ui/Button";
import { useTranslation } from "../../i18n";

export function DocumentPanel() {
  const model = useDocumentStore((state) => state.model);
  const closeAll = useDocumentStore((state) => state.closeAll);
  const selected = useSelectionStore((state) => state.selected);
  const setSelection = useSelectionStore((state) => state.set);
  const clearSelection = useSelectionStore((state) => state.clear);
  const openDialog = useOpenDialog();
  const sources = Object.values(model.sources);
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-5">
      <Button
        variant="primary"
        className="w-full justify-start"
        icon={<FilePlus2 size={15} />}
        onClick={() => void openDialog()}
      >
        {t("addAnotherPdf")}
      </Button>

      <section>
        <div className="mb-2 flex h-6 items-center justify-between">
          <h3 className="text-[10px] font-bold tracking-[0.15em] text-text-soft uppercase">{t("documents")}</h3>
          <button
            type="button"
            onClick={() => {
              closeAll();
              clearSelection();
            }}
            className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-text-soft hover:bg-danger/10 hover:text-danger"
          >
            <X size={10} /> {t("closeAll")}
          </button>
        </div>

        <div className="space-y-1.5">
          {sources.map((source, index) => {
            const pageIds = model.pages
              .filter((page) => page.sourceId === source.id)
              .map((page) => page.id);
            const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
            return (
              <button
                key={source.id}
                type="button"
                onClick={() => setSelection(pageIds)}
                className={[
                  "group flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2.5 text-left transition",
                  allSelected
                    ? "border-brand/35 bg-accent-soft"
                    : "border-border bg-surface hover:border-brand/25 hover:bg-sidebar-header",
                ].join(" ")}
              >
                <span className="relative grid h-9 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-brand">
                  <FileText size={15} />
                  <span className="absolute -left-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full border-2 border-surface bg-brand px-0.5 text-[7px] font-bold text-white">
                    {index + 1}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold text-text">{source.name}</span>
                  <span className="mt-0.5 block text-[10px] text-text-soft">{t("pagesCount", { count: pageIds.length })}</span>
                </span>
                {allSelected && <Check size={13} className="text-brand" />}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => selected.size > 0 ? clearSelection() : setSelection(model.pages.map((page) => page.id))}
          className="mt-2 w-full rounded-lg px-2 py-1.5 text-[10px] font-semibold text-text-dim hover:bg-surface-2 hover:text-text"
        >
          {selected.size > 0 ? t("clearSelection") : t("selectAllPages")}
        </button>
      </section>

      <p className="rounded-xl bg-sidebar-header px-3 py-3 text-[10px] leading-relaxed text-text-soft">
        {t("sessionFilesNote")}
      </p>
    </div>
  );
}
