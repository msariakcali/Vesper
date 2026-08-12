import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckSquare2,
  FileText,
  FolderOpen,
  FolderPlus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useAddFiles, useOpenDialog } from "../../hooks/useFiles";
import { platform, type LibraryFile } from "../../platform";
import { useDocumentStore } from "../../store/documentStore";
import { useSelectionStore } from "../../store/selectionStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Kalıcı PDF kütüphanesi ve açık çalışma belgesi tek merkezde. */
export function DocumentPanel() {
  const model = useDocumentStore((state) => state.model);
  const closeAll = useDocumentStore((state) => state.closeAll);
  const selected = useSelectionStore((state) => state.selected);
  const setSelection = useSelectionStore((state) => state.set);
  const clearSelection = useSelectionStore((state) => state.clear);
  const thumbnailSize = useUiStore((state) => state.thumbnailSize);
  const setThumbnailSize = useUiStore((state) => state.setThumbnailSize);
  const notify = useUiStore((state) => state.notify);
  const openDialog = useOpenDialog();
  const addFiles = useAddFiles();
  const [library, setLibrary] = useState<LibraryFile[]>([]);
  const [libraryDir, setLibraryDir] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (platform.kind !== "tauri") return;
    setLoading(true);
    try {
      const [files, directory] = await Promise.all([
        platform.listLibraryFiles(),
        platform.getLibraryDir(),
      ]);
      setLibrary(files);
      setLibraryDir(directory);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener("pdf-editor-library-changed", onChange);
    return () => window.removeEventListener("pdf-editor-library-changed", onChange);
  }, [refresh]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("tr-TR");
    return normalized
      ? library.filter((file) => file.name.toLocaleLowerCase("tr-TR").includes(normalized))
      : library;
  }, [library, query]);

  const openLibraryFile = async (file: LibraryFile) => {
    try {
      const files = await platform.readFilesByPaths([file.path]);
      if (files.length === 0) throw new Error("Belge okunamadı.");
      closeAll();
      clearSelection();
      await addFiles(files);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : String(error));
    }
  };

  const deleteLibraryFile = async (file: LibraryFile) => {
    if (!window.confirm(`“${file.name}” kütüphaneden silinsin mi?`)) return;
    try {
      const isOpen = Object.values(model.sources).some((source) => source.path === file.path);
      if (isOpen) {
        closeAll();
        clearSelection();
      }
      await platform.deleteLibraryFile(file.name);
      await refresh();
      notify("success", "Belge kütüphaneden silindi.");
    } catch (error) {
      notify("error", error instanceof Error ? error.message : String(error));
    }
  };

  const sources = Object.values(model.sources);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button
          variant="primary"
          className="min-w-0 flex-1"
          icon={<FolderPlus size={15} />}
          onClick={() => void openDialog()}
        >
          PDF içe aktar
        </Button>
        {platform.kind === "tauri" && (
          <Button
            compact
            variant="ghost"
            icon={<FolderOpen size={16} />}
            title="Kütüphane klasörünü aç"
            aria-label="Kütüphane klasörünü aç"
            onClick={() => void platform.openLibraryDir()}
          />
        )}
      </div>

      {platform.kind === "tauri" && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold tracking-[0.14em] text-text-dim uppercase">
              PDF Kütüphanesi
            </h3>
            <button
              type="button"
              onClick={() => void refresh()}
              className="rounded p-1 text-text-dim hover:bg-surface-2 hover:text-text"
              aria-label="Kütüphaneyi yenile"
              title="Yenile"
            >
              <RefreshCw size={13} className={loading ? "[animation:spin_700ms_linear_infinite]" : ""} />
            </button>
          </div>
          {libraryDir && (
            <button
              type="button"
              onClick={() => void platform.openLibraryDir()}
              title={libraryDir}
              className="truncate rounded-md bg-accent-soft px-2.5 py-1.5 text-left font-mono text-[10px] text-accent"
            >
              {libraryDir}
            </button>
          )}
          <div className="relative">
            <Search
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Belgelerde ara…"
              className="h-8 w-full rounded-md border border-border bg-surface-2 pl-8 pr-2 text-xs text-text"
            />
          </div>
          <div className="max-h-52 space-y-1 overflow-y-auto pr-0.5">
            {filtered.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-text-dim">
                {query ? "Eşleşen belge yok." : "Kütüphane henüz boş."}
              </p>
            ) : (
              filtered.map((file) => (
                <div
                  key={file.path}
                  className="group/library flex items-center gap-2 rounded-md border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-surface-2"
                >
                  <button
                    type="button"
                    onClick={() => void openLibraryFile(file)}
                    title={file.path}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent-soft text-accent">
                      <FileText size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-text">{file.name}</span>
                      <span className="block text-[10px] text-text-dim">{formatSize(file.size)}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteLibraryFile(file)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded text-text-dim opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover/library:opacity-100"
                    title="Kütüphaneden sil"
                    aria-label={`${file.name} belgesini kütüphaneden sil`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {sources.length > 0 && (
        <section className="flex flex-col gap-2 border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold tracking-[0.14em] text-text-dim uppercase">
              Açık Çalışma
            </h3>
            <button
              type="button"
              onClick={() => {
                closeAll();
                clearSelection();
              }}
              className="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] text-text-dim hover:bg-danger/10 hover:text-danger"
            >
              <X size={11} /> Kapat
            </button>
          </div>
          {sources.map((source) => {
            const count = model.pages.filter((page) => page.sourceId === source.id).length;
            return (
              <button
                key={source.id}
                type="button"
                onClick={() =>
                  setSelection(
                    model.pages.filter((page) => page.sourceId === source.id).map((page) => page.id),
                  )
                }
                className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-2 text-left hover:border-accent/50"
              >
                <FileText size={15} className="shrink-0 text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">{source.name}</span>
                  <span className="text-[10px] text-text-dim">{count} sayfa</span>
                </span>
              </button>
            );
          })}
          <div className="flex gap-1.5">
            <Button
              compact
              className="min-w-0 flex-1 text-xs"
              icon={<CheckSquare2 size={13} />}
              onClick={() => setSelection(model.pages.map((page) => page.id))}
            >
              Tümü
            </Button>
            <Button
              compact
              className="min-w-0 flex-1 text-xs"
              disabled={selected.size === 0}
              onClick={clearSelection}
            >
              Bırak
            </Button>
          </div>
          <label className="grid grid-cols-[1fr_auto] items-center gap-2 text-[10px] text-text-dim">
            <input
              type="range"
              min={120}
              max={320}
              step={10}
              value={thumbnailSize}
              onChange={(event) => setThumbnailSize(Number(event.target.value))}
              className="w-full accent-[var(--accent)]"
              aria-label="Küçük resim boyutu"
            />
            <span className="w-10 text-right font-mono">{thumbnailSize}px</span>
          </label>
        </section>
      )}
    </div>
  );
}
