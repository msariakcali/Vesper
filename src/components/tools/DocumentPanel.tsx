import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
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

export function DocumentPanel() {
  const model = useDocumentStore((state) => state.model);
  const closeAll = useDocumentStore((state) => state.closeAll);
  const selected = useSelectionStore((state) => state.selected);
  const setSelection = useSelectionStore((state) => state.set);
  const clearSelection = useSelectionStore((state) => state.clear);
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
      notify("success", "Belge projelerden silindi.");
    } catch (error) {
      notify("error", error instanceof Error ? error.message : String(error));
    }
  };

  const sources = Object.values(model.sources);

  return (
    <div className="flex flex-col gap-5">
      <Button
        variant="primary"
        className="w-full justify-start"
        icon={<FolderPlus size={15} />}
        onClick={() => void openDialog()}
      >
        PDF ekle
      </Button>

      <section>
        <SectionTitle
          title="Bu çalışma"
          action={sources.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                closeAll();
                clearSelection();
              }}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[9px] text-text-soft hover:bg-danger/10 hover:text-danger"
            >
              <X size={10} /> Kapat
            </button>
          ) : null}
        />

        {sources.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-sidebar-header px-3 py-5 text-center">
            <p className="text-[10px] font-semibold text-text-dim">Açık bir proje yok</p>
            <p className="mt-1 text-[9px] leading-relaxed text-text-soft">Başlamak için bir PDF ekle.</p>
          </div>
        ) : (
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
                    <span className="block truncate text-[10px] font-bold text-text">{source.name}</span>
                    <span className="mt-0.5 block text-[9px] text-text-soft">{pageIds.length} sayfa</span>
                  </span>
                  {allSelected && <Check size={13} className="text-brand" />}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => selected.size > 0 ? clearSelection() : setSelection(model.pages.map((page) => page.id))}
              className="mt-1 w-full rounded-lg px-2 py-1.5 text-[9px] font-semibold text-text-dim hover:bg-surface-2 hover:text-text"
            >
              {selected.size > 0 ? "Seçimi temizle" : "Tüm sayfaları seç"}
            </button>
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title={platform.kind === "tauri" ? "Tüm projeler" : "Projeler"}
          action={platform.kind === "tauri" ? (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => void platform.openLibraryDir()}
                className="grid h-6 w-6 place-items-center rounded-md text-text-soft hover:bg-surface-2 hover:text-text"
                aria-label="Proje klasörünü aç"
                title={libraryDir ?? "Proje klasörünü aç"}
              >
                <FolderOpen size={12} />
              </button>
              <button
                type="button"
                onClick={() => void refresh()}
                className="grid h-6 w-6 place-items-center rounded-md text-text-soft hover:bg-surface-2 hover:text-text"
                aria-label="Projeleri yenile"
              >
                <RefreshCw size={12} className={loading ? "[animation:spin_700ms_linear_infinite]" : ""} />
              </button>
            </div>
          ) : null}
        />

        <div className="relative mb-2.5">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-soft" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Projelerde ara"
            className="h-9 w-full rounded-lg border border-border bg-sidebar-header pl-8 pr-2 text-[10px] text-text"
          />
        </div>

        {platform.kind !== "tauri" ? (
          <p className="rounded-xl bg-sidebar-header px-3 py-3 text-[9px] leading-relaxed text-text-soft">
            Masaüstü sürümünde projelerin burada otomatik olarak listelenir.
          </p>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-[9px] text-text-soft">
            {query ? "Eşleşen proje bulunamadı." : "Henüz kayıtlı proje yok."}
          </p>
        ) : (
          <div className="space-y-1">
            {filtered.map((file) => (
              <div key={file.path} className="group/library flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-surface-2">
                <button
                  type="button"
                  onClick={() => void openLibraryFile(file)}
                  title={file.path}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-surface text-text-soft">
                    <FileText size={12} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[9px] font-semibold text-text">{file.name}</span>
                    <span className="block text-[8px] text-text-soft">{formatSize(file.size)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void deleteLibraryFile(file)}
                  className="grid h-6 w-6 place-items-center rounded-md text-text-soft opacity-0 hover:bg-danger/10 hover:text-danger group-hover/library:opacity-100"
                  title="Projelerden sil"
                  aria-label={`${file.name} projesini sil`}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex h-6 items-center justify-between">
      <h3 className="text-[9px] font-bold tracking-[0.15em] text-text-soft uppercase">{title}</h3>
      {action}
    </div>
  );
}
