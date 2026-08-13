import { Files, Plus } from "lucide-react";
import { useOpenDialog } from "../../hooks/useFiles";
import { DocumentPanel } from "../tools/DocumentPanel";

/** Web oturumundaki açık PDF'ler. Kalıcı bulut kütüphanesi daha sonra eklenebilir. */
export function ToolSidebar() {
  const openDialog = useOpenDialog();

  return (
    <aside className="project-sidebar hidden w-[16rem] shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <div>
          <div className="flex items-center gap-2 text-text">
            <Files size={16} className="text-brand" />
            <h1 className="text-sm font-bold tracking-[-0.015em]">Açık belgeler</h1>
          </div>
          <p className="mt-1 text-[10px] text-text-dim">Bu tarayıcı oturumunda</p>
        </div>
        <button
          type="button"
          onClick={() => void openDialog()}
          className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-accent-text shadow-sm transition hover:bg-brand-strong"
          title="PDF ekle"
          aria-label="PDF ekle"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="mx-4 h-px bg-border" />
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <DocumentPanel />
      </div>

      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2 text-[10px] text-text-dim">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" />
          Dosyalar yalnızca bu cihazda
        </div>
      </div>
    </aside>
  );
}
