import { Download, FilePlus2, Layers3, Moon, Redo2, Sparkles, Sun, Undo2 } from "lucide-react";
import { useOpenDialog } from "../../hooks/useFiles";
import { useSaveAll } from "../../hooks/useActions";
import { useDocumentStore } from "../../store/documentStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";

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

  const hasPages = pages.length > 0;
  const firstSource = Object.values(sources)[0];

  return (
    <header className="topbar flex h-16 shrink-0 items-center gap-2 px-4 text-white">
      <div className="mr-2 flex shrink-0 items-center gap-3 sm:mr-4 sm:w-[15rem]">
        <span className="brand-mark grid h-9 w-9 place-items-center rounded-xl text-white">
          <Layers3 size={18} strokeWidth={2.2} />
        </span>
        <span className="min-w-0">
          <span className="block text-[15px] font-bold leading-none tracking-[-0.025em]">Forma</span>
          <span className="mt-1 block text-[9px] font-semibold tracking-[0.18em] text-white/45 uppercase">
            PDF Studio
          </span>
        </span>
      </div>

      <div className="hidden min-w-0 items-center gap-2 md:flex">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/7 text-white/65">
          <Sparkles size={15} />
        </span>
        <div className="min-w-0">
          <p className="max-w-[22rem] truncate text-xs font-semibold text-white/90">
            {firstSource?.name ?? "İsimsiz çalışma"}
            {dirty && <span className="ml-1.5 text-brand">●</span>}
          </p>
          <p className="mt-0.5 text-[10px] text-white/38">
            {hasPages ? `${pages.length} sayfalık çalışma` : "Yeni PDF projesi"}
          </p>
        </div>
      </div>

      <div className="ml-1 hidden h-6 w-px bg-white/10 sm:block md:ml-3" />
      <Button
        variant="topbar"
        compact
        icon={<Undo2 size={16} />}
        disabled={past.length === 0}
        onClick={undo}
        title="Geri al (Ctrl+Z)"
        aria-label="Geri al"
      />
      <Button
        variant="topbar"
        compact
        icon={<Redo2 size={16} />}
        disabled={future.length === 0}
        onClick={redo}
        title="İleri al (Ctrl+Y)"
        aria-label="İleri al"
      />

      <div className="flex-1" />

      <Button
        variant="topbar"
        compact
        icon={theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        onClick={toggleTheme}
        title={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
        aria-label="Temayı değiştir"
      />
      <Button
        variant="topbar"
        icon={<FilePlus2 size={15} />}
        onClick={() => void openDialog()}
        title="PDF içe aktar (Ctrl+O)"
      >
        <span className="hidden sm:inline">PDF ekle</span>
      </Button>
      <Button
        variant="brand"
        icon={<Download size={15} />}
        disabled={!hasPages}
        onClick={() => void saveAll()}
        title="PDF'i indir (Ctrl+S)"
      >
        <span className="hidden sm:inline">PDF'i indir</span>
      </Button>
    </header>
  );
}
