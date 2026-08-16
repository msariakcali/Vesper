import { Type } from "lucide-react";
import { useDocumentStore } from "../../store/documentStore";
import { useSelectionStore } from "../../store/selectionStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";
import { AppliedOverlays } from "./toolUi";
import { useTranslation } from "../../i18n";

export function TextPanel() {
  const pages = useDocumentStore((state) => state.model.pages);
  const selected = useSelectionStore((state) => state.selected);
  const setPreviewPage = useUiStore((state) => state.setPreviewPage);
  const setPlacementMode = useUiStore((state) => state.setPlacementMode);
  const { t } = useTranslation();

  const begin = () => {
    const page = pages.find((item) => selected.has(item.id)) ?? pages[0];
    if (!page) return;
    setPlacementMode("text");
    setPreviewPage(page.id);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-dim">
        {t("textPlacementHint")}
      </p>
      <Button
        variant="primary"
        icon={<Type size={15} />}
        disabled={pages.length === 0}
        onClick={begin}
      >
        {t("addText")}
      </Button>
      <AppliedOverlays tool="text" />
    </div>
  );
}
