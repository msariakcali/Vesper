import {
  Copy,
  Cloud,
  CloudCheck,
  FileText,
  FolderOpen,
  Moon,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  Sun,
  Trash2,
  Undo2,
} from "lucide-react";
import { useOpenDialog } from "../../hooks/useFiles";
import { useSaveAll } from "../../hooks/useActions";
import { platform } from "../../platform";
import { useDocumentStore } from "../../store/documentStore";
import { useSelectionStore } from "../../store/selectionStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";

export function TopBar() {
  const openDialog = useOpenDialog();
  const saveAll = useSaveAll();

  const pages = useDocumentStore((s) => s.model.pages);
  const past = useDocumentStore((s) => s.past);
  const future = useDocumentStore((s) => s.future);
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);
  const rotatePages = useDocumentStore((s) => s.rotatePages);
  const deletePages = useDocumentStore((s) => s.deletePages);
  const duplicatePages = useDocumentStore((s) => s.duplicatePages);

  const selected = useSelectionStore((s) => s.selected);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const autoSaveStatus = useUiStore((s) => s.autoSaveStatus);

  const ids = [...selected];
  const hasSelection = ids.length > 0;
  const hasPages = pages.length > 0;

  return (
    <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-border bg-surface px-3 shadow-sm">
      <div className="mr-2 flex items-center gap-2.5 pr-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-text shadow-sm">
          <FileText size={17} />
        </span>
        <span className="text-sm font-bold tracking-tight">PDF Editör</span>
      </div>

      <Button icon={<FolderOpen size={15} />} onClick={() => void openDialog()} title="Ctrl+O">
        İçe aktar
      </Button>
      <Button
        icon={<Save size={15} />}
        disabled={!hasPages}
        onClick={() => void saveAll()}
        title="Ctrl+S"
      >
        Şimdi kaydet
      </Button>

      <Divider />

      <Button
        variant="ghost"
        compact
        icon={<Undo2 size={16} />}
        disabled={past.length === 0}
        onClick={undo}
        title="Geri al (Ctrl+Z)"
        aria-label="Geri al"
      />
      <Button
        variant="ghost"
        compact
        icon={<Redo2 size={16} />}
        disabled={future.length === 0}
        onClick={redo}
        title="İleri al (Ctrl+Y)"
        aria-label="İleri al"
      />

      <Divider />

      <Button
        variant="ghost"
        compact
        icon={<RotateCcw size={16} />}
        disabled={!hasSelection}
        onClick={() => rotatePages(ids, -90)}
        title="Sola döndür (Ctrl+←)"
        aria-label="Sola döndür"
      />
      <Button
        variant="ghost"
        compact
        icon={<RotateCw size={16} />}
        disabled={!hasSelection}
        onClick={() => rotatePages(ids, 90)}
        title="Sağa döndür (Ctrl+→)"
        aria-label="Sağa döndür"
      />
      <Button
        variant="ghost"
        compact
        icon={<Copy size={16} />}
        disabled={!hasSelection}
        onClick={() => duplicatePages(ids)}
        title="Seçilenleri çoğalt (Ctrl+D)"
        aria-label="Çoğalt"
      />
      <Button
        variant="danger"
        compact
        icon={<Trash2 size={16} />}
        disabled={!hasSelection}
        onClick={() => deletePages(ids)}
        title="Seçilenleri sil (Delete)"
        aria-label="Sil"
      />

      <div className="flex-1" />

      {hasPages && platform.kind === "tauri" && (
        <span
          className={[
            "mr-1 flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium",
            autoSaveStatus === "error"
              ? "bg-danger/10 text-danger"
              : autoSaveStatus === "saving"
                ? "bg-accent-soft text-accent"
                : "bg-ok/10 text-ok",
          ].join(" ")}
        >
          {autoSaveStatus === "saved" ? <CloudCheck size={14} /> : <Cloud size={14} />}
          {autoSaveStatus === "saving"
            ? "Kaydediliyor…"
            : autoSaveStatus === "pending"
              ? "Otomatik kayıt bekliyor"
              : autoSaveStatus === "error"
                ? "Kayıt hatası"
                : "Otomatik kayıt açık"}
        </span>
      )}

      <Button
        variant="ghost"
        compact
        icon={theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        onClick={toggleTheme}
        title={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
        aria-label="Temayı değiştir"
      />
    </header>
  );
}

function Divider() {
  return <div className="mx-1.5 h-6 w-px bg-border" />;
}
