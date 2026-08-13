import { Crop } from "lucide-react";
import { buildPdf } from "../../core/model/buildPdf";
import { normalizePdfToA4 } from "../../core/ops/normalize";
import { platform } from "../../platform";
import { useDocumentStore } from "../../store/documentStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";
import { useTranslation } from "../../i18n";

export function CropPanel() {
  const model = useDocumentStore((state) => state.model);
  const setBusy = useUiStore((state) => state.setBusy);
  const notify = useUiStore((state) => state.notify);
  const { t } = useTranslation();

  const normalize = async () => {
    setBusy(t("normalizingToA4"));
    try {
      const bytes = await normalizePdfToA4(await buildPdf(model, model.pages));
      const first = Object.values(model.sources)[0]?.name.replace(/\.pdf$/i, "") ?? "belge";
      const path = await platform.saveBytes(bytes, `${first}_A4.pdf`);
      if (path) notify("success", t("a4DocumentSaved"));
    } catch (error) {
      notify("error", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-dim">
        {t("fitToA4Hint")}
      </p>
      <Button
        variant="primary"
        icon={<Crop size={15} />}
        disabled={model.pages.length === 0}
        onClick={() => void normalize()}
      >
        {t("fitAllPagesToA4")}
      </Button>
    </div>
  );
}
