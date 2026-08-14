import { useDocumentStore } from "../../store/documentStore";
import { useSelectionStore } from "../../store/selectionStore";
import { useUiStore } from "../../store/uiStore";
import { useTranslation } from "../../i18n";
import { ShieldCheck } from "lucide-react";

export function StatusBar() {
  const pages = useDocumentStore((s) => s.model.pages);
  const sources = useDocumentStore((s) => s.model.sources);
  const selected = useSelectionStore((s) => s.selected);
  const busy = useUiStore((s) => s.busy);
  const { t } = useTranslation();

  const sourceCount = Object.keys(sources).length;

  return (
    <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-border bg-sidebar-header px-4 text-[10px] text-text-soft">
      {busy ? (
        <span className="flex items-center gap-2 text-text">
          <span
            className="h-3 w-3 rounded-full border-2 border-border border-t-accent"
            style={{ animation: "spin 700ms linear infinite" }}
          />
          {busy}
        </span>
      ) : (
        <>
          <span className="font-medium tabular-nums">
            {t("pagesCount", { count: pages.length })}
            {sourceCount > 1 && ` · ${t("documentsCount", { count: sourceCount })}`}
          </span>
          {selected.size > 0 && (
            <span className="tabular-nums text-accent">{t("selected", { count: selected.size })}</span>
          )}
        </>
      )}

      <div className="flex-1" />
      <span className="hidden items-center gap-1.5 sm:flex">
        <ShieldCheck size={11} className="text-ok" />
        {t("browserMode")}
      </span>
    </footer>
  );
}
