import { FilePlus2 } from "lucide-react";
import { useOpenDialog } from "../../hooks/useFiles";
import { Button } from "../ui/Button";

export function EmptyState() {
  const openDialog = useOpenDialog();

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl border border-accent/20 bg-accent-soft text-accent shadow-sm">
          <FilePlus2 size={28} />
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 className="text-xl font-bold tracking-tight">PDF çalışma alanınız hazır</h2>
          <p className="text-sm text-text-dim">
            Soldaki kütüphaneden bir belge açın, buraya sürükleyin veya yeni bir PDF içe aktarın.
            Değişiklikleriniz otomatik kaydedilir.
          </p>
        </div>

        <Button variant="primary" icon={<FilePlus2 size={15} />} onClick={() => void openDialog()}>
          PDF içe aktar
        </Button>

        <p className="text-xs text-text-dim">
          Masaüstünde tüm belgeler Belgeler\PDF Editör klasöründe tutulur.
        </p>
      </div>
    </div>
  );
}
