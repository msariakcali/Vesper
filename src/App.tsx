import { useEffect } from "react";
import { StatusBar } from "./components/layout/StatusBar";
import { Toasts } from "./components/layout/Toasts";
import { ToolSidebar } from "./components/layout/ToolSidebar";
import { TopBar } from "./components/layout/TopBar";
import { CanvasHeader } from "./components/layout/CanvasToolbar";
import { EmptyState } from "./components/pages/EmptyState";
import { PageGrid } from "./components/pages/PageGrid";
import { PreviewModal } from "./components/viewer/PreviewModal";
import { useFileDrop } from "./hooks/useFiles";
import { useKeyboardShortcuts } from "./hooks/useKeyboard";
import { useDocumentStore } from "./store/documentStore";
import { useSelectionStore } from "./store/selectionStore";

export default function App() {
  const pages = useDocumentStore((s) => s.model.pages);
  const retainSelection = useSelectionStore((s) => s.retain);

  useFileDrop();
  useKeyboardShortcuts();

  // Silinen veya geri alınan sayfaların kimlikleri seçimde asılı kalmasın.
  useEffect(() => {
    retainSelection(pages.map((page) => page.id));
  }, [pages, retainSelection]);

  return (
    <div className="app-shell flex h-full flex-col bg-bg text-text">
      {pages.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <TopBar />
          <div className="editor-body flex min-h-0 flex-1">
            <ToolSidebar />
            <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
              <CanvasHeader />
              <main className="workspace-canvas min-h-0 min-w-0 flex-1 overflow-y-auto">
                <PageGrid />
              </main>
              <StatusBar />
            </section>
          </div>
        </>
      )}

      <Toasts />
      <PreviewModal />
    </div>
  );
}
