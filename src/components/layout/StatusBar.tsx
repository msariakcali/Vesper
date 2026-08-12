import { useDocumentStore } from "../../store/documentStore";
import { useSelectionStore } from "../../store/selectionStore";
import { useUiStore } from "../../store/uiStore";
import { platform } from "../../platform";

export function StatusBar() {
  const pages = useDocumentStore((s) => s.model.pages);
  const sources = useDocumentStore((s) => s.model.sources);
  const selected = useSelectionStore((s) => s.selected);
  const busy = useUiStore((s) => s.busy);
  const autoSaveStatus = useUiStore((s) => s.autoSaveStatus);
  const lastSavedPath = useUiStore((s) => s.lastSavedPath);

  const sourceCount = Object.keys(sources).length;

  return (
    <footer className="flex h-8 shrink-0 items-center gap-4 border-t border-border bg-sidebar-header px-3 text-[11px] text-text-dim">
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
          <span className="tabular-nums">
            {pages.length} sayfa
            {sourceCount > 1 && ` · ${sourceCount} belge`}
          </span>
          {selected.size > 0 && (
            <span className="tabular-nums text-accent">{selected.size} seçili</span>
          )}
          {platform.kind === "tauri" && pages.length > 0 && (
            <span
              className={autoSaveStatus === "error" ? "text-danger" : "text-ok"}
              title={lastSavedPath ?? undefined}
            >
              {autoSaveStatus === "saving"
                ? "● kaydediliyor"
                : autoSaveStatus === "pending"
                  ? "● değişiklik algılandı"
                  : autoSaveStatus === "saved"
                    ? "● otomatik kaydedildi"
                    : "● otomatik kayıt açık"}
            </span>
          )}
        </>
      )}

      <div className="flex-1" />
      <span>{platform.kind === "tauri" ? "Belgeler / PDF Editör" : "Tarayıcı modu"}</span>
    </footer>
  );
}
