import { useEffect, type ComponentType } from "react";
import {
  Combine,
  Crop,
  Droplets,
  FileImage,
  FilePlus2,
  Files,
  Hash,
  PenTool,
  Plus,
  Scissors,
  SplitSquareHorizontal,
  Type,
  X,
} from "lucide-react";
import { useOpenDialog } from "../../hooks/useFiles";
import { useDocumentStore } from "../../store/documentStore";
import { useUiStore, type ToolId } from "../../store/uiStore";
import { ConvertPanel } from "../tools/ConvertPanel";
import { CropPanel } from "../tools/CropPanel";
import { DocumentPanel } from "../tools/DocumentPanel";
import { ExtractPanel } from "../tools/ExtractPanel";
import { InsertPanel } from "../tools/InsertPanel";
import { MergePanel } from "../tools/MergePanel";
import { PageNumberPanel } from "../tools/PageNumberPanel";
import { SignaturePanel } from "../tools/SignaturePanel";
import { SplitPanel } from "../tools/SplitPanel";
import { TextPanel } from "../tools/TextPanel";
import { WatermarkPanel } from "../tools/WatermarkPanel";
import { type TranslationKey, useTranslation } from "../../i18n";

interface RailItem {
  id: ToolId;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  panel: ComponentType;
}

const DOCUMENTS: RailItem = {
  id: "documents",
  labelKey: "documents",
  descriptionKey: "documentsDescription",
  icon: Files,
  panel: DocumentPanel,
};

const TOOL_GROUPS: RailItem[][] = [
  [
    { id: "insert", labelKey: "insert", descriptionKey: "insertDescription", icon: FilePlus2, panel: InsertPanel },
    { id: "text", labelKey: "text", descriptionKey: "textDescription", icon: Type, panel: TextPanel },
    { id: "signature", labelKey: "signature", descriptionKey: "signatureDescription", icon: PenTool, panel: SignaturePanel },
  ],
  [
    { id: "watermark", labelKey: "watermark", descriptionKey: "watermarkDescription", icon: Droplets, panel: WatermarkPanel },
    { id: "pageNumbers", labelKey: "pageNumbers", descriptionKey: "pageNumbersDescription", icon: Hash, panel: PageNumberPanel },
    { id: "crop", labelKey: "crop", descriptionKey: "cropDescription", icon: Crop, panel: CropPanel },
  ],
  [
    { id: "extract", labelKey: "extract", descriptionKey: "extractDescription", icon: Scissors, panel: ExtractPanel },
    { id: "split", labelKey: "split", descriptionKey: "splitDescription", icon: SplitSquareHorizontal, panel: SplitPanel },
    { id: "merge", labelKey: "merge", descriptionKey: "mergeDescription", icon: Combine, panel: MergePanel },
    { id: "convert", labelKey: "convert", descriptionKey: "convertDescription", icon: FileImage, panel: ConvertPanel },
  ],
];

const TOOLS = TOOL_GROUPS.flat();

/** Sol araç rayı: Canva tarzı ince ikon şeridi + seçili sekmeye göre açılan sabit (docked) panel. */
export function ToolSidebar() {
  const activeTool = useUiStore((state) => state.activeTool);
  const setActiveTool = useUiStore((state) => state.setActiveTool);
  const sourceCount = useDocumentStore((state) => Object.keys(state.model.sources).length);
  const openDialog = useOpenDialog();
  const { t } = useTranslation();
  const active = activeTool === "documents" ? DOCUMENTS : TOOLS.find((tool) => tool.id === activeTool);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && active) setActiveTool("pages");
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [active, setActiveTool]);

  return (
    <div className="tool-sidebar-shell flex shrink-0">
      <aside className="tool-rail project-sidebar relative z-30 flex w-[4.75rem] shrink-0 flex-col items-stretch gap-0.5 overflow-y-auto border-r border-border bg-sidebar-header px-1.5 py-2.5">
        <RailButton
          item={DOCUMENTS}
          selected={activeTool === "documents"}
          badge={sourceCount > 0 ? sourceCount : undefined}
          onClick={() => setActiveTool(activeTool === "documents" ? "pages" : "documents")}
        />
        {TOOL_GROUPS.map((group) => (
          <div key={group[0].id} className="contents">
            <div className="rail-separator mx-1 my-1.5 h-px shrink-0 bg-border" aria-hidden="true" />
            {group.map((tool) => (
              <RailButton
                key={tool.id}
                item={tool}
                selected={activeTool === tool.id}
                onClick={() => setActiveTool(activeTool === tool.id ? "pages" : tool.id)}
              />
            ))}
          </div>
        ))}

        <div className="flex-1" />
        <button
          type="button"
          onClick={() => void openDialog()}
          title={t("addPdf")}
          aria-label={t("addPdf")}
          className="rail-add mx-auto grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-dashed border-border text-text-dim transition hover:border-brand/50 hover:bg-surface hover:text-brand"
        >
          <Plus size={16} />
        </button>
      </aside>

      {active && <ToolDock item={active} onClose={() => setActiveTool("pages")} />}
    </div>
  );
}

function RailButton({
  item,
  selected,
  badge,
  onClick,
}: {
  item: RailItem;
  selected: boolean;
  badge?: number;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const { t } = useTranslation();
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      title={t(item.labelKey)}
      className={[
        "rail-button group/rail relative flex shrink-0 flex-col items-center gap-1 rounded-lg px-1 py-2 text-center transition",
        selected ? "bg-accent-soft text-brand" : "text-text-dim hover:bg-surface hover:text-text",
      ].join(" ")}
    >
      {selected && <span className="rail-active-indicator absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-brand" aria-hidden="true" />}
      <span className="relative">
        <span
          className={[
            "grid h-8 w-8 place-items-center rounded-[8px] transition",
            selected
              ? "bg-brand text-accent-text shadow-sm"
              : "text-text-dim group-hover/rail:text-text",
          ].join(" ")}
        >
          <Icon size={16} strokeWidth={1.9} />
        </span>
        {badge !== undefined && (
          <span className="absolute -right-1 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full border-2 border-sidebar-header bg-brand px-0.5 text-[7px] font-bold text-accent-text">
            {badge}
          </span>
        )}
      </span>
      <span className="rail-label text-[9.5px] font-semibold leading-tight tracking-tight">{t(item.labelKey)}</span>
    </button>
  );
}

function ToolDock({ item, onClose }: { item: RailItem; onClose: () => void }) {
  const Icon = item.icon;
  const Panel = item.panel;
  const { t } = useTranslation();

  return (
    <section className="tool-dock flex w-[20rem] shrink-0 flex-col overflow-hidden border-r border-border bg-surface">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 py-3.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-brand">
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] font-bold tracking-[-0.015em]">{t(item.labelKey)}</h2>
          <p className="mt-0.5 truncate text-[11px] text-text-dim">{t(item.descriptionKey)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-dim hover:bg-surface-2 hover:text-text"
          aria-label={t("closePanel")}
        >
          <X size={15} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 text-[14px]">
        <Panel />
      </div>
    </section>
  );
}
