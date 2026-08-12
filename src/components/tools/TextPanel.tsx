import { Type } from "lucide-react";
import { useDocumentStore } from "../../store/documentStore";
import { useSelectionStore } from "../../store/selectionStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";

export function TextPanel() {
  const pages = useDocumentStore((state) => state.model.pages);
  const selected = useSelectionStore((state) => state.selected);
  const setPreviewPage = useUiStore((state) => state.setPreviewPage);
  const setPlacementMode = useUiStore((state) => state.setPlacementMode);

  const begin = () => {
    const page = pages.find((item) => selected.has(item.id)) ?? pages[0];
    if (!page) return;
    setPlacementMode("text");
    setPreviewPage(page.id);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-dim">
        Metni hassas biçimde yerleştirmek için büyük önizlemede istediğiniz noktaya tıklayın.
      </p>
      <Button
        variant="primary"
        icon={<Type size={15} />}
        disabled={pages.length === 0}
        onClick={begin}
      >
        Metin Ekle
      </Button>
    </div>
  );
}
