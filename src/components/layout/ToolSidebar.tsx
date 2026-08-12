import type { ComponentType } from "react";
import {
  ChevronDown,
  Combine,
  Crop,
  Droplets,
  FileImage,
  FilePlus,
  Hash,
  PenTool,
  Scissors,
  SplitSquareHorizontal,
  Type,
} from "lucide-react";
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

interface Tool {
  id: Exclude<ToolId, "pages">;
  label: string;
  icon: ComponentType<{ size?: number }>;
  panel: ComponentType;
  description: string;
}

const TOOLS: Tool[] = [
  { id: "extract", label: "Sayfaları Ayıkla", icon: Scissors, panel: ExtractPanel, description: "Seçili sayfaları ayrı PDF yap" },
  { id: "split", label: "PDF'i Böl", icon: SplitSquareHorizontal, panel: SplitPanel, description: "Aralık veya sayfa sayısına göre böl" },
  { id: "merge", label: "PDF'leri Birleştir", icon: Combine, panel: MergePanel, description: "Açık belgeleri tek PDF yap" },
  { id: "insert", label: "Sayfa Ekle", icon: FilePlus, panel: InsertPanel, description: "Boş sayfa, görsel veya PDF ekle" },
  { id: "watermark", label: "Filigran", icon: Droplets, panel: WatermarkPanel, description: "Sayfalara filigran uygula" },
  { id: "pageNumbers", label: "Sayfa Numaraları", icon: Hash, panel: PageNumberPanel, description: "Otomatik numaralandır" },
  { id: "text", label: "Metin Yerleştir", icon: Type, panel: TextPanel, description: "Sayfa üzerine metin ekle" },
  { id: "signature", label: "İmza ve Görsel", icon: PenTool, panel: SignaturePanel, description: "İmza çiz veya görsel yükle" },
  { id: "crop", label: "A4'e Sığdır", icon: Crop, panel: CropPanel, description: "Tüm sayfaları A4 boyutuna getir" },
  { id: "convert", label: "Dönüştür", icon: FileImage, panel: ConvertPanel, description: "PDF, görsel ve metin dönüşümü" },
];

export function ToolSidebar() {
  const activeTool = useUiStore((state) => state.activeTool);
  const setActiveTool = useUiStore((state) => state.setActiveTool);

  return (
    <aside className="flex w-[22rem] shrink-0 flex-col border-r border-border bg-surface shadow-[8px_0_30px_rgb(15_23_42/0.04)]">
      <div className="border-b border-border bg-sidebar-header px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold tracking-tight text-text">Kontrol Merkezi</p>
            <p className="mt-0.5 text-[11px] text-text-dim">Belgeler ve bütün PDF araçları</p>
          </div>
          <span className="rounded-full bg-ok/10 px-2 py-1 text-[9px] font-bold tracking-wider text-ok uppercase">
            Otomatik
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-border p-3">
          <DocumentPanel />
        </div>

        <div className="p-3">
          <h2 className="mb-2 px-1 text-[11px] font-bold tracking-[0.14em] text-text-dim uppercase">
            Araçlar
          </h2>
          <div className="space-y-1.5">
            {TOOLS.map((tool) => {
              const Icon = tool.icon;
              const expanded = activeTool === tool.id;
              const Panel = tool.panel;
              return (
                <section
                  key={tool.id}
                  className={[
                    "overflow-hidden rounded-lg border transition-colors",
                    expanded ? "border-accent/40 bg-panel-active" : "border-transparent",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setActiveTool(expanded ? "pages" : tool.id)}
                    className={[
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      expanded
                        ? "bg-accent-soft text-accent"
                        : "text-text-dim hover:bg-surface-2 hover:text-text",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "grid h-8 w-8 shrink-0 place-items-center rounded-md",
                        expanded ? "bg-accent text-accent-text" : "bg-surface-2 text-text-dim",
                      ].join(" ")}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold">{tool.label}</span>
                      <span className="block truncate text-[10px] opacity-75">{tool.description}</span>
                    </span>
                    <ChevronDown
                      size={14}
                      className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  {expanded && (
                    <div className="border-t border-accent/15 bg-surface px-3 py-4">
                      <Panel />
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
