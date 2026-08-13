import { useMemo, useState } from "react";
import { FileImage, FilePlus, ImagePlus, Plus } from "lucide-react";
import { createBlankPagePdf, type PAGE_SIZES } from "../../core/ops/blankPage";
import { imagesToPdf, type PdfImageInput } from "../../core/ops/imageToPdf";
import { useInsertAt } from "../../hooks/useInsert";
import { platform, type PickedFile } from "../../platform";
import { useDocumentStore } from "../../store/documentStore";
import { useSelectionStore } from "../../store/selectionStore";
import { useUiStore } from "../../store/uiStore";
import { Button } from "../ui/Button";
import { Section } from "./toolUi";
import { useTranslation } from "../../i18n";

type InsertPosition = "start" | "before" | "after" | "end";
type PageSize = keyof typeof PAGE_SIZES;

function imageInput(file: PickedFile): PdfImageInput {
  return {
    bytes: file.bytes,
    mime: file.name.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
  };
}

export function InsertPanel() {
  const pages = useDocumentStore((state) => state.model.pages);
  const selected = useSelectionStore((state) => state.selected);
  const notify = useUiStore((state) => state.notify);
  const setBusy = useUiStore((state) => state.setBusy);
  const insertAt = useInsertAt();
  const [position, setPosition] = useState<InsertPosition>("end");
  const [pageSize, setPageSize] = useState<PageSize>("A4");
  const [images, setImages] = useState<PickedFile[]>([]);
  const { t } = useTranslation();

  const selectedIndex = useMemo(
    () => pages.findIndex((page) => selected.has(page.id)),
    [pages, selected],
  );
  const targetIndex =
    position === "start"
      ? 0
      : position === "end"
        ? pages.length
        : position === "before"
          ? Math.max(0, selectedIndex)
          : Math.max(0, selectedIndex + 1);

  const runInsert = async (work: () => Promise<Uint8Array>, name: string) => {
    setBusy(t("preparingNamed", { name }));
    try {
      const count = await insertAt(await work(), name, targetIndex);
      if (count > 0) notify("success", t("pagesAdded", { count }));
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

  const pickPdf = async () => {
    try {
      const files = await platform.pickPdfFiles(true);
      for (const file of files) {
        await insertAt(file.bytes, file.name, targetIndex);
      }
      if (files.length > 0) notify("success", t("pdfAddedToDocument", { count: files.length }));
    } catch (error) {
      notify("error", error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Section title={t("insertPosition")}>
        <div className="grid grid-cols-2 gap-1.5">
          <PositionButton selected={position === "start"} onClick={() => setPosition("start")}>
            {t("positionStart")}
          </PositionButton>
          <PositionButton
            selected={position === "before"}
            disabled={selectedIndex < 0}
            onClick={() => setPosition("before")}
          >
            {t("positionBeforeSelected")}
          </PositionButton>
          <PositionButton
            selected={position === "after"}
            disabled={selectedIndex < 0}
            onClick={() => setPosition("after")}
          >
            {t("positionAfterSelected")}
          </PositionButton>
          <PositionButton selected={position === "end"} onClick={() => setPosition("end")}>
            {t("positionEnd")}
          </PositionButton>
        </div>
      </Section>

      <Section title={t("blankPage")}>
        <div className="flex gap-2">
          <select
            value={pageSize}
            onChange={(event) => setPageSize(event.target.value as PageSize)}
            className="h-9 min-w-20 rounded-md border border-border bg-surface px-2 text-sm text-text"
          >
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
          </select>
          <Button
            className="flex-1"
            icon={<Plus size={15} />}
            onClick={() => void runInsert(() => createBlankPagePdf(pageSize), `bos-${pageSize}.pdf`)}
          >
            {t("addBlankPage")}
          </Button>
        </div>
      </Section>

      <Section title={t("fromImage")}>
        <Button icon={<ImagePlus size={15} />} onClick={() => void pickImages()}>
          {t("chooseImage")}
        </Button>
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
          icon={<FilePlus size={15} />}
          disabled={images.length === 0}
          onClick={() =>
            void runInsert(
              () => imagesToPdf(images.map(imageInput)),
              "gorsellerden-eklenen.pdf",
            ).then(() => setImages([]))
          }
        >
          {t("addAsPage")}
        </Button>
      </Section>

      <Section title={t("fromAnotherPdf")}>
        <Button icon={<FilePlus size={15} />} onClick={() => void pickPdf()}>
          {t("choosePdf")}
        </Button>
      </Section>
    </div>
  );
}

function PositionButton({
  selected,
  disabled = false,
  onClick,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={[
        "min-h-9 rounded-md border px-2 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        selected
          ? "border-accent bg-accent-soft text-accent"
          : "border-border bg-surface text-text-dim",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
