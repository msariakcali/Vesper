import { useMemo, useState } from "react";
import { FileImage, FileText, ImageDown, ImagePlus } from "lucide-react";
import { imagesToPdf } from "../../core/ops/imageToPdf";
import { parsePageRange } from "../../core/ops/pageRange";
import { extractPageText, renderPage } from "../../core/render/pdfjs";
import { platform, type PickedFile } from "../../platform";
import { useDocumentStore } from "../../store/documentStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";
import { PageRangeInput, Section, SegmentedButton } from "./toolUi";
import { useTranslation } from "../../i18n";

type ConvertTab = "pdf-image" | "image-pdf" | "text";
type ImageFormat = "png" | "jpeg";

export function ConvertPanel() {
  const model = useDocumentStore((state) => state.model);
  const setBusy = useUiStore((state) => state.setBusy);
  const notify = useUiStore((state) => state.notify);
  const [tab, setTab] = useState<ConvertTab>("pdf-image");
  const [dpi, setDpi] = useState(150);
  const [format, setFormat] = useState<ImageFormat>("png");
  const [quality, setQuality] = useState(85);
  const [range, setRange] = useState(() => (model.pages.length ? `1-${model.pages.length}` : ""));
  const [images, setImages] = useState<PickedFile[]>([]);
  const parsed = useMemo(() => parsePageRange(range, model.pages.length), [model.pages.length, range]);
  const base = Object.values(model.sources)[0]?.name.replace(/\.pdf$/i, "") ?? "belge";
  const { t } = useTranslation();

  const pdfToImages = async () => {
    setBusy(t("convertingToImages", { count: parsed.indices.length }));
    try {
      const files = [];
      for (const pageIndex of parsed.indices) {
        const page = model.pages[pageIndex];
        const source = model.sources[page.sourceId];
        const rendered = await renderPage(
          source.id,
          source.bytes,
          page.sourceIndex,
          { scale: dpi / 72 },
          page.rotation,
        );
        const canvas = new OffscreenCanvas(rendered.width, rendered.height);
        const context = canvas.getContext("2d");
        if (!context) throw new Error(t("canvasContextError"));
        context.drawImage(rendered.bitmap, 0, 0);
        rendered.bitmap.close();
        const mime = format === "png" ? "image/png" : "image/jpeg";
        const blob = await canvas.convertToBlob({ type: mime, quality: quality / 100 });
        files.push({
          name: `${base}_sayfa_${pageIndex + 1}.${format === "png" ? "png" : "jpg"}`,
          data: new Uint8Array(await blob.arrayBuffer()),
        });
      }
      const count = await platform.saveManyToDir(files);
      if (count > 0) notify("success", t("imagesSaved", { count }));
    } catch (error) {
      notify("error", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  const pickImages = async () => {
    try {
      setImages(await platform.pickImageFiles(true));
    } catch (error) {
      notify("error", error instanceof Error ? error.message : String(error));
    }
  };

  const imagesToDocument = async () => {
    setBusy(t("convertingImagesToPdf", { count: images.length }));
    try {
      const bytes = await imagesToPdf(
        images.map((image) => ({
          bytes: image.bytes,
          mime: image.name.toLowerCase().endsWith(".png")
            ? ("image/png" as const)
            : ("image/jpeg" as const),
        })),
      );
      const path = await platform.saveBytes(bytes, "gorsellerden.pdf");
      if (path) notify("success", t("imagesSavedAsPdf"));
    } catch (error) {
      notify("error", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  const extractText = async () => {
    setBusy(t("extractingTextFromPages", { count: parsed.indices.length }));
    try {
      const sections = await Promise.all(
        parsed.indices.map(async (pageIndex) => {
          const page = model.pages[pageIndex];
          const source = model.sources[page.sourceId];
          const text = await extractPageText(source.id, source.bytes, page.sourceIndex);
          return `--- Sayfa ${pageIndex + 1} ---\n${text}\n\n`;
        }),
      );
      const bytes = new TextEncoder().encode(sections.join(""));
      const path = await platform.saveBytes(bytes, `${base}_metin.txt`, {
        name: "Metin Dosyası",
        extensions: ["txt"],
      });
      if (path) notify("success", t("textFileSaved"));
    } catch (error) {
      notify("error", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  const selectionInvalid = parsed.indices.length === 0 || parsed.errors.length > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-1">
        <SegmentedButton selected={tab === "pdf-image"} onClick={() => setTab("pdf-image")}>
          {t("pdfToImageTab")}
        </SegmentedButton>
        <SegmentedButton selected={tab === "image-pdf"} onClick={() => setTab("image-pdf")}>
          {t("imageToPdfTab")}
        </SegmentedButton>
        <SegmentedButton selected={tab === "text"} onClick={() => setTab("text")}>
          {t("extractTextTab")}
        </SegmentedButton>
      </div>

      {tab === "pdf-image" && (
        <>
          <Section title={t("imageSettings")}>
            <label className="grid grid-cols-[3rem_1fr_3rem] items-center gap-2 text-xs text-text-dim">
              DPI
              <input
                type="range"
                min={72}
                max={300}
                value={dpi}
                onChange={(event) => setDpi(Number(event.target.value))}
                className="w-full accent-[var(--accent)]"
              />
              <span className="font-mono text-text">{dpi}</span>
            </label>
            <div className="grid grid-cols-2 gap-1">
              <SegmentedButton selected={format === "png"} onClick={() => setFormat("png")}>PNG</SegmentedButton>
              <SegmentedButton selected={format === "jpeg"} onClick={() => setFormat("jpeg")}>JPEG</SegmentedButton>
            </div>
            {format === "jpeg" && (
              <label className="grid grid-cols-[3rem_1fr_3rem] items-center gap-2 text-xs text-text-dim">
                {t("quality")}
                <input
                  type="range"
                  min={40}
                  max={100}
                  value={quality}
                  onChange={(event) => setQuality(Number(event.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
                <span className="font-mono text-text">{quality}%</span>
              </label>
            )}
          </Section>
          <Section title={t("pages")}>
            <PageRangeInput value={range} onChange={setRange} pageCount={model.pages.length} />
          </Section>
          <Button
            variant="primary"
            icon={<ImageDown size={15} />}
            disabled={selectionInvalid}
            onClick={() => void pdfToImages()}
          >
            {t("convertToImages")}
          </Button>
        </>
      )}

      {tab === "image-pdf" && (
        <>
          <Button icon={<ImagePlus size={15} />} onClick={() => void pickImages()}>{t("chooseImage")}</Button>
          {images.length > 0 && (
            <div className="flex flex-col gap-1 rounded-md border border-border bg-surface-2 p-2">
              {images.map((image, index) => (
                <div key={`${image.name}-${index}`} className="flex items-center gap-2 text-xs">
                  <FileImage size={13} className="text-accent" />
                  <span className="truncate">{image.name}</span>
                </div>
              ))}
            </div>
          )}
          <Button
            variant="primary"
            icon={<FileImage size={15} />}
            disabled={images.length === 0}
            onClick={() => void imagesToDocument()}
          >
            {t("saveAsPdf")}
          </Button>
        </>
      )}

      {tab === "text" && (
        <>
          <Section title={t("pages")}>
            <PageRangeInput value={range} onChange={setRange} pageCount={model.pages.length} />
          </Section>
          <Button
            variant="primary"
            icon={<FileText size={15} />}
            disabled={selectionInvalid}
            onClick={() => void extractText()}
          >
            {t("extractTextAndSave")}
          </Button>
        </>
      )}
    </div>
  );
}
