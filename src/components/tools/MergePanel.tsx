import { useMemo } from "react";
import { ArrowDown, ArrowUp, Combine, FileText, Plus } from "lucide-react";
import { useExportPages } from "../../hooks/useActions";
import { useOpenDialog } from "../../hooks/useFiles";
import { useDocumentStore } from "../../store/documentStore";
import { Button } from "../ui/Button";
import { Section } from "./toolUi";
import { useTranslation } from "../../i18n";

export function MergePanel() {
  const model = useDocumentStore((state) => state.model);
  const movePagesTo = useDocumentStore((state) => state.movePagesTo);
  const openDialog = useOpenDialog();
  const exportPages = useExportPages();
  const { t } = useTranslation();

  const sourceOrder = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const page of model.pages) {
      if (!seen.has(page.sourceId)) {
        seen.add(page.sourceId);
        order.push(page.sourceId);
      }
    }
    return order;
  }, [model.pages]);

  const moveSource = (sourceId: string, direction: -1 | 1) => {
    const sourceIndex = sourceOrder.indexOf(sourceId);
    const neighborId = sourceOrder[sourceIndex + direction];
    if (!neighborId) return;
    const ids = model.pages.filter((page) => page.sourceId === sourceId).map((page) => page.id);
    if (direction < 0) {
      const target = model.pages.findIndex((page) => page.sourceId === neighborId);
      movePagesTo(ids, target);
    } else {
      let target = -1;
      model.pages.forEach((page, index) => {
        if (page.sourceId === neighborId) target = index + 1;
      });
      movePagesTo(ids, target);
    }
  };

  const disabled = sourceOrder.length < 2;

  return (
    <div className="flex flex-col gap-4">
      <Section title={t("documentsToMerge")}>
        <div className="flex flex-col gap-2">
          {sourceOrder.map((sourceId, index) => {
            const source = model.sources[sourceId];
            const count = model.pages.filter((page) => page.sourceId === sourceId).length;
            return (
              <div
                key={sourceId}
                className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2 py-2"
              >
                <FileText size={16} className="shrink-0 text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{source.name}</span>
                  <span className="block text-xs text-text-dim">{t("pagesCount", { count })}</span>
                </span>
                <Button
                  variant="ghost"
                  compact
                  disabled={index === 0}
                  icon={<ArrowUp size={14} />}
                  aria-label={t("moveDocumentUp", { name: source.name })}
                  onClick={() => moveSource(sourceId, -1)}
                />
                <Button
                  variant="ghost"
                  compact
                  disabled={index === sourceOrder.length - 1}
                  icon={<ArrowDown size={14} />}
                  aria-label={t("moveDocumentDown", { name: source.name })}
                  onClick={() => moveSource(sourceId, 1)}
                />
              </div>
            );
          })}
        </div>
        <Button icon={<Plus size={15} />} onClick={() => void openDialog()}>
          {t("addMorePdf")}
        </Button>
      </Section>

      <div className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
        {t("totalPrefix")} <strong className="text-accent tabular-nums">{model.pages.length}</strong> {t("pagesUnit")}
      </div>
      {disabled && (
        <p className="text-xs text-text-dim">{t("needAtLeastTwoPdfs")}</p>
      )}
      <Button
        variant="primary"
        icon={<Combine size={15} />}
        disabled={disabled}
        onClick={() => void exportPages(model.pages, "birlestirilmis.pdf")}
      >
        {t("mergeAndSaveAs")}
      </Button>
    </div>
  );
}
