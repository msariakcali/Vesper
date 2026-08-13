import { Download, FilePlus2, Layers3, Moon, Redo2, Sun, Undo2 } from "lucide-react";
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
    <header className="topbar flex h-16 shrink-0 items-center gap-2 px-3 text-text sm:px-4">
      <div className="mr-2 flex shrink-0 items-center gap-3 sm:mr-4 sm:w-[15rem]">
        <span className="brand-mark grid h-9 w-9 place-items-center rounded-[0.7rem] text-white">
          <Layers3 size={19} strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="block text-base font-semibold leading-none tracking-[-0.025em]">Forma</span>
          <span className="mt-1 block text-[9px] font-medium tracking-[0.15em] text-text-soft uppercase">
            PDF Studio
          </span>
        </span>
      </div>

      <div className="hidden min-w-0 items-center gap-2 md:flex">
        <div className="min-w-0">
          <p className="max-w-[22rem] truncate text-[13px] font-medium text-text">
            {firstSource?.name ?? t("untitledProject")}
            {dirty && <span className="ml-1.5 text-brand">●</span>}
          </p>
          <p className="mt-0.5 text-[11px] text-text-soft">
            {hasPages ? t("pageProject", { count: pages.length }) : t("newPdfProject")}
          </p>
        </div>
      </div>

      <div className="ml-1 hidden h-5 w-px bg-border sm:block md:ml-3" />
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

      <label className="hidden items-center rounded-lg bg-surface-2 px-1 sm:flex" title="Language">
        <span className="sr-only">Language</span>
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value as "en" | "tr")}
          className="h-8 cursor-pointer border-0 bg-transparent px-1.5 text-[11px] font-semibold text-text outline-none"
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
