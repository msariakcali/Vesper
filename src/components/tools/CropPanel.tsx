import { Crop } from "lucide-react";
import { buildPdf } from "../../core/model/buildPdf";
import { normalizePdfToA4 } from "../../core/ops/normalize";
import { platform } from "../../platform";
import { useDocumentStore } from "../../store/documentStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";

export function CropPanel() {
  const model = useDocumentStore((state) => state.model);
  const setBusy = useUiStore((state) => state.setBusy);
  const notify = useUiStore((state) => state.notify);

  const normalize = async () => {
    setBusy("Sayfalar A4 boyutuna getiriliyor…");
    try {
      const bytes = await normalizePdfToA4(await buildPdf(model, model.pages));
      const first = Object.values(model.sources)[0]?.name.replace(/\.pdf$/i, "") ?? "belge";
      const path = await platform.saveBytes(bytes, `${first}_A4.pdf`);
      if (path) notify("success", "A4 boyutlu belge kaydedildi.");
    } catch (error) {
      notify("error", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-dim">
        Tüm sayfaları oranlarını koruyarak A4 içine sığdırır ve yeni bir PDF olarak kaydeder.
      </p>
      <Button
        variant="primary"
        icon={<Crop size={15} />}
        disabled={model.pages.length === 0}
        onClick={() => void normalize()}
      >
        Tüm Sayfaları A4'e Sığdır
      </Button>
    </div>
  );
}
