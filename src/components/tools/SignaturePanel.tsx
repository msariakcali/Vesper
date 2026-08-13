import { useRef, useState } from "react";
import { Eraser, ImagePlus, PenTool } from "lucide-react";
import { platform } from "../../platform";
import { useDocumentStore } from "../../store/documentStore";
import { useSelectionStore } from "../../store/selectionStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";
import { SegmentedButton } from "./toolUi";
import { useTranslation } from "../../i18n";

type Tab = "draw" | "upload";

async function imageAspect(bytes: Uint8Array, mime: string): Promise<number> {
  const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: mime });
  const bitmap = await createImageBitmap(blob);
  const aspect = bitmap.width / bitmap.height;
  bitmap.close();
  return aspect;
}

export function SignaturePanel() {
  const pages = useDocumentStore((state) => state.model.pages);
  const selected = useSelectionStore((state) => state.selected);
  const setPreviewPage = useUiStore((state) => state.setPreviewPage);
  const setPlacementMode = useUiStore((state) => state.setPlacementMode);
  const setPlacementImage = useUiStore((state) => state.setPlacementImage);
  const notify = useUiStore((state) => state.notify);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [tab, setTab] = useState<Tab>("draw");
  const [color, setColor] = useState("#000000");
  const { t } = useTranslation();

  const previewPlacement = (data: Uint8Array, mime: "image/png" | "image/jpeg", aspectRatio: number) => {
    const page = pages.find((item) => selected.has(item.id)) ?? pages[0];
    if (!page) return;
    setPlacementImage({ data, mime, aspectRatio });
    setPlacementMode("signature");
    setPreviewPage(page.id);
    notify("info", t("signaturePlacementHint"));
  };

  const pointerPosition = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    canvas.setPointerCapture(event.pointerId);
    const context = canvas.getContext("2d");
    if (!context) return;
    const point = pointerPosition(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.strokeStyle = color;
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.lineJoin = "round";
    drawing.current = true;
  };

  const continueDrawing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = pointerPosition(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const placeDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) return;
    previewPlacement(new Uint8Array(await blob.arrayBuffer()), "image/png", canvas.width / canvas.height);
  };

  const upload = async () => {
    try {
      const [file] = await platform.pickImageFiles(false);
      if (!file) return;
      const mime = file.name.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
      previewPlacement(file.bytes, mime, await imageAspect(file.bytes, mime));
    } catch (error) {
      notify("error", error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-1">
        <SegmentedButton selected={tab === "draw"} onClick={() => setTab("draw")}>{t("draw")}</SegmentedButton>
        <SegmentedButton selected={tab === "upload"} onClick={() => setTab("upload")}>{t("upload")}</SegmentedButton>
      </div>
      {tab === "draw" ? (
        <>
          <canvas
            ref={canvasRef}
            width={400}
            height={150}
            onPointerDown={startDrawing}
            onPointerMove={continueDrawing}
            onPointerUp={() => (drawing.current = false)}
            onPointerCancel={() => (drawing.current = false)}
            className="h-auto w-full touch-none rounded-md border border-border bg-white"
          />
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-text-dim">
              {t("penColor")}
              <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
            </label>
            <Button
              variant="ghost"
              compact
              icon={<Eraser size={14} />}
              onClick={() => canvasRef.current?.getContext("2d")?.clearRect(0, 0, 400, 150)}
            >
              {t("clear")}
            </Button>
          </div>
          <Button variant="primary" icon={<PenTool size={15} />} onClick={() => void placeDrawing()}>
            {t("placeOnPage")}
          </Button>
        </>
      ) : (
        <Button variant="primary" icon={<ImagePlus size={15} />} onClick={() => void upload()}>
          {t("chooseImage")}
        </Button>
      )}
    </div>
  );
}
