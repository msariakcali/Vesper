import {
  Cloud,
  CloudCheck,
  FolderOpen,
  Layers3,
  Moon,
  Redo2,
  Save,
  Sparkles,
  Sun,
  Undo2,
} from "lucide-react";
import { useOpenDialog } from "../../hooks/useFiles";
import { useSaveAll } from "../../hooks/useActions";
import { platform } from "../../platform";
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
  const autoSaveStatus = useUiStore((state) => state.autoSaveStatus);

  const hasPages = pages.length > 0;
  const firstSource = Object.values(sources)[0];

  return (
    <header className="topbar flex h-16 shrink-0 items-center gap-2 px-4 text-white">
      <div className="mr-4 flex w-[15rem] shrink-0 items-center gap-3">
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

      <div className="flex min-w-0 items-center gap-2">
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

      <div className="ml-3 h-6 w-px bg-white/10" />
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

      {hasPages && platform.kind === "tauri" && (
        <span
          className={[
            "mr-1 flex h-8 items-center gap-1.5 rounded-full px-3 text-[10px] font-semibold",
            autoSaveStatus === "error"
              ? "bg-danger/15 text-red-200"
              : autoSaveStatus === "saving"
                ? "bg-white/10 text-white/70"
                : "bg-white/7 text-white/55",
          ].join(" ")}
        >
          {autoSaveStatus === "saved" ? <CloudCheck size={14} /> : <Cloud size={14} />}
          {autoSaveStatus === "saving"
            ? "Kaydediliyor…"
            : autoSaveStatus === "pending"
              ? "Değişiklik var"
              : autoSaveStatus === "error"
                ? "Kayıt hatası"
                : "Kaydedildi"}
        </span>
      )}

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
        icon={<FolderOpen size={15} />}
        onClick={() => void openDialog()}
        title="PDF içe aktar (Ctrl+O)"
      >
        İçe aktar
      </Button>
      <Button
        variant="brand"
        icon={<Save size={15} />}
        disabled={!hasPages}
        onClick={() => void saveAll()}
        title="Dışa aktar (Ctrl+S)"
      >
        Dışa aktar
      </Button>
    </header>
  );
}
