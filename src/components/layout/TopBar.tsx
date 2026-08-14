import { Download, FilePlus2, Languages, Layers3, Moon, Redo2, Sun, Undo2 } from "lucide-react";
import { useOpenDialog } from "../../hooks/useFiles";
import { useSaveAll } from "../../hooks/useActions";
import { useDocumentStore } from "../../store/documentStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";
import { useTranslation } from "../../i18n";

export function TopBar() {
  const openDialog = useOpenDialog();
  const saveAll = useSaveAll();

  const pages = useDocumentStore((state) => state.model.pages);
  const sources = useDocumentStore((state) => state.model.sources);
  const dirty = useDocumentStore((state) => state.dirty);
  const past = useDocumentStore((state) => state.past);
  const future = useDocumentStore((state) => state.future);
  const undo = useDocumentStore((state) => state.undo);
  const redo = useDocumentStore((state) => state.redo);

  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const setLanguage = useUiStore((state) => state.setLanguage);
  const { language, t } = useTranslation();

  const hasPages = pages.length > 0;
  const firstSource = Object.values(sources)[0];

  return (
    <header className="topbar flex h-[3.75rem] shrink-0 items-center gap-1.5 px-3 text-text sm:px-4">
      <div className="mr-1 flex shrink-0 items-center gap-2.5 sm:mr-3 sm:w-[13.5rem]">
        <span className="brand-mark grid h-8 w-8 place-items-center rounded-[9px] text-accent-text">
          <Layers3 size={17} strokeWidth={2.15} />
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block text-[14px] font-bold leading-none tracking-[-0.025em]">Forma</span>
          <span className="mt-1 block text-[8px] font-semibold tracking-[0.14em] text-text-soft uppercase">PDF Workspace</span>
        </span>
      </div>

      <div className="hidden min-w-0 items-center border-l border-border pl-4 md:flex">
        <div className="min-w-0 leading-tight">
          <p className="max-w-[18rem] truncate text-[12px] font-bold text-text">
            {firstSource?.name ?? t("untitledProject")}
            {dirty && <span className="ml-1.5 text-brand" aria-label="Unsaved changes">●</span>}
          </p>
          <p className="mt-1 text-[10px] text-text-soft">
            {hasPages ? t("pageProject", { count: pages.length }) : t("newPdfProject")}
          </p>
        </div>
      </div>

      <div className="ml-1 hidden h-5 w-px bg-border md:ml-3 md:block" />
      <Button
        variant="topbar"
        compact
        icon={<Undo2 size={16} />}
        disabled={past.length === 0}
        onClick={undo}
        title={t("undo")}
        aria-label={t("undo")}
      />
      <Button
        variant="topbar"
        compact
        icon={<Redo2 size={16} />}
        disabled={future.length === 0}
        onClick={redo}
        title={t("redo")}
        aria-label={t("redo")}
      />

      <div className="flex-1" />

      <label className="hidden h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-2 sm:flex" title="Language">
        <span className="sr-only">Language</span>
        <Languages size={13} className="text-text-soft" />
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value as "en" | "tr")}
          className="cursor-pointer border-0 bg-transparent text-[10px] font-bold text-text outline-none"
          aria-label="Language"
        >
          <option value="en">EN</option>
          <option value="tr">TR</option>
        </select>
      </label>

      <Button
        variant="topbar"
        compact
        icon={theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        onClick={toggleTheme}
        title={t("switchTheme")}
        aria-label={t("switchTheme")}
      />
      <Button
        variant="topbar"
        compact
        icon={<FilePlus2 size={15} />}
        onClick={() => void openDialog()}
        title={t("importPdf")}
      >
        <span className="hidden sm:inline">{t("addPdf")}</span>
      </Button>
      <Button
        variant="brand"
        icon={<Download size={15} />}
        disabled={!hasPages}
        onClick={() => void saveAll()}
        title={t("savePdf")}
      >
        <span className="hidden sm:inline">{t("downloadPdf")}</span>
      </Button>
    </header>
  );
}
