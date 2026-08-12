import { useEffect } from "react";
import { StatusBar } from "./components/layout/StatusBar";
import { Toasts } from "./components/layout/Toasts";
import { ToolSidebar } from "./components/layout/ToolSidebar";
import { TopBar } from "./components/layout/TopBar";
import { EmptyState } from "./components/pages/EmptyState";
import { PageGrid } from "./components/pages/PageGrid";
import { PreviewModal } from "./components/viewer/PreviewModal";
import { useFileDropAndStartup } from "./hooks/useFiles";
import { useKeyboardShortcuts } from "./hooks/useKeyboard";
import { useAutoSave } from "./hooks/useAutoSave";
import { useDocumentStore } from "./store/documentStore";
import { useSelectionStore } from "./store/selectionStore";

export default function App() {
  const pages = useDocumentStore((s) => s.model.pages);
  const retainSelection = useSelectionStore((s) => s.retain);

  useFileDropAndStartup();
  useKeyboardShortcuts();
  useAutoSave();

  // Silinen veya geri alınan sayfaların kimlikleri seçimde asılı kalmasın.
  useEffect(() => {
    retainSelection(pages.map((page) => page.id));
  }, [pages, retainSelection]);

  return (
    <div className="flex h-full flex-col bg-bg text-text">
      <TopBar />

      <div className="flex min-h-0 flex-1">
        <ToolSidebar />
        <main className="min-w-0 flex-1 overflow-y-auto bg-bg">
          {pages.length === 0 ? <EmptyState /> : <PageGrid />}
        </main>
      </div>

      <StatusBar />
      <Toasts />
      <PreviewModal />
    </div>
  );
}
