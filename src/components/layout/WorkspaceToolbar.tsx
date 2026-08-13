import { useEffect, useMemo, useRef, type ComponentType } from "react";
import {
  Check,
  BookOpen,
  ChevronDown,
  Combine,
  Copy,
  Crop,
  Droplets,
  FileImage,
  FilePlus2,
  Grid2X2,
  Hash,
  PenTool,
  RotateCcw,
  RotateCw,
  Scissors,
  SplitSquareHorizontal,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { useDocumentStore } from "../../store/documentStore";
import { useSelectionStore } from "../../store/selectionStore";
import { useUiStore, type ToolId } from "../../store/uiStore";
import { ConvertPanel } from "../tools/ConvertPanel";
import { CropPanel } from "../tools/CropPanel";
import { ExtractPanel } from "../tools/ExtractPanel";
import { InsertPanel } from "../tools/InsertPanel";
import { MergePanel } from "../tools/MergePanel";
import { PageNumberPanel } from "../tools/PageNumberPanel";
import { SignaturePanel } from "../tools/SignaturePanel";
import { SplitPanel } from "../tools/SplitPanel";
import { TextPanel } from "../tools/TextPanel";
import { WatermarkPanel } from "../tools/WatermarkPanel";
import { Button } from "../ui/Button";

interface ToolDefinition {
  id: Exclude<ToolId, "pages">;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  panel: ComponentType;
}

const TOOLS: ToolDefinition[] = [
  { id: "insert", label: "Ekle", description: "PDF, görsel veya boş sayfa ekle", icon: FilePlus2, panel: InsertPanel },
  { id: "text", label: "Metin", description: "Sayfaya metin yerleştir", icon: Type, panel: TextPanel },
  { id: "signature", label: "İmza", description: "İmza çiz veya görsel ekle", icon: PenTool, panel: SignaturePanel },
  { id: "watermark", label: "Filigran", description: "Belgeye filigran uygula", icon: Droplets, panel: WatermarkPanel },
  { id: "pageNumbers", label: "Numarala", description: "Sayfaları otomatik numarala", icon: Hash, panel: PageNumberPanel },
  { id: "crop", label: "A4'e sığdır", description: "Sayfa ölçülerini düzenle", icon: Crop, panel: CropPanel },
  { id: "extract", label: "Ayıkla", description: "Seçili sayfaları ayrı kaydet", icon: Scissors, panel: ExtractPanel },
  { id: "split", label: "Böl", description: "PDF'i aralıklara göre böl", icon: SplitSquareHorizontal, panel: SplitPanel },
  { id: "merge", label: "Birleştir", description: "Açık PDF'leri tek dosya yap", icon: Combine, panel: MergePanel },
  { id: "convert", label: "Dönüştür", description: "PDF ve görsel dönüşümleri", icon: FileImage, panel: ConvertPanel },
];

export function WorkspaceToolbar() {
  const rootRef = useRef<HTMLDivElement>(null);
  const activeTool = useUiStore((state) => state.activeTool);
  const setActiveTool = useUiStore((state) => state.setActiveTool);
  const active = TOOLS.find((tool) => tool.id === activeTool);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (active && !rootRef.current?.contains(event.target as Node)) setActiveTool("pages");
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && active) setActiveTool("pages");
    };
    window.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [active, setActiveTool]);

  return (
    <div ref={rootRef} className="relative z-30 shrink-0 border-b border-border bg-surface">
      <div className="flex h-[5.25rem] items-stretch gap-1 overflow-x-auto px-3 py-2">
        <div className="hidden w-16 shrink-0 flex-col justify-center pl-1 xl:flex">
          <span className="text-[9px] font-bold tracking-[0.16em] text-text-dim uppercase">Araçlar</span>
          <span className="mt-1 text-[10px] leading-tight text-text-soft">PDF'ini düzenle</span>
        </div>
        <div className="mx-1 hidden w-px shrink-0 bg-border xl:block" />

        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const selected = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setActiveTool(selected ? "pages" : tool.id)}
              className={[
                "group/tool relative flex min-w-[4.4rem] shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-2 text-center transition",
                selected
                  ? "bg-accent-soft text-brand"
                  : "text-text-dim hover:bg-surface-2 hover:text-text",
              ].join(" ")}
            >
              <span
                className={[
                  "grid h-8 w-8 place-items-center rounded-lg transition",
                  selected
                    ? "bg-brand text-white shadow-sm"
                    : "bg-surface-2 text-text-dim group-hover/tool:bg-surface-3 group-hover/tool:text-text",
                ].join(" ")}
              >
                <Icon size={16} strokeWidth={1.9} />
              </span>
              <span className="whitespace-nowrap text-[10px] font-semibold">{tool.label}</span>
              {selected && <ChevronDown size={10} className="absolute bottom-1 right-1 text-brand/60" />}
            </button>
          );
        })}
      </div>

      {active && (
        <ToolPopover tool={active} onClose={() => setActiveTool("pages")} />
      )}
    </div>
  );
}

function ToolPopover({ tool, onClose }: { tool: ToolDefinition; onClose: () => void }) {
  const Icon = tool.icon;
  const Panel = tool.panel;

  return (
    <section className="tool-popover absolute left-1/2 top-[calc(100%+0.6rem)] w-[23rem] max-w-[calc(100%-2rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-float)]">
      <header className="flex items-center gap-3 border-b border-border bg-sidebar-header px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-sm">
          <Icon size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold tracking-[-0.015em]">{tool.label}</h2>
          <p className="mt-0.5 truncate text-[10px] text-text-dim">{tool.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-lg text-text-dim hover:bg-surface-2 hover:text-text"
          aria-label="Araç panelini kapat"
        >
          <X size={15} />
        </button>
      </header>
      <div className="max-h-[min(34rem,calc(100vh-13rem))] overflow-y-auto p-4">
        <Panel />
      </div>
    </section>
  );
}

export function CanvasHeader() {
  const pages = useDocumentStore((state) => state.model.pages);
  const sources = useDocumentStore((state) => state.model.sources);
  const rotatePages = useDocumentStore((state) => state.rotatePages);
  const duplicatePages = useDocumentStore((state) => state.duplicatePages);
  const deletePages = useDocumentStore((state) => state.deletePages);
  const selected = useSelectionStore((state) => state.selected);
  const setSelection = useSelectionStore((state) => state.set);
  const clearSelection = useSelectionStore((state) => state.clear);
  const thumbnailSize = useUiStore((state) => state.thumbnailSize);
  const setThumbnailSize = useUiStore((state) => state.setThumbnailSize);
  const setPreviewPage = useUiStore((state) => state.setPreviewPage);

  const ids = useMemo(() => [...selected], [selected]);
  const hasSelection = ids.length > 0;
  const sourceCount = Object.keys(sources).length;
  const readerPageId = ids[0] ?? pages[0]?.id;

  return (
    <div className="flex h-[3.35rem] shrink-0 items-center gap-2 overflow-x-auto border-b border-border bg-canvas-header px-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-bold tracking-[-0.01em]">Sayfalar</h2>
          {pages.length > 0 && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[9px] font-semibold text-text-dim tabular-nums">
              {pages.length}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[9px] text-text-soft">
          {sourceCount > 1 ? `${sourceCount} belge tek çalışma içinde` : "Sürükleyerek yeniden sırala"}
        </p>
      </div>

      <div className="ml-3 h-6 w-px bg-border" />
      <Button
        variant="primary"
        compact
        disabled={!readerPageId}
        icon={<BookOpen size={14} />}
        onClick={() => readerPageId && setPreviewPage(readerPageId)}
        title={hasSelection ? "Seçili sayfadan okumaya başla" : "PDF'i okumaya başla"}
      >
        Oku
      </Button>
      <button
        type="button"
        disabled={pages.length === 0}
        onClick={() => (hasSelection ? clearSelection() : setSelection(pages.map((page) => page.id)))}
        className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[10px] font-semibold text-text-dim hover:bg-surface hover:text-text disabled:opacity-35"
      >
        <Check size={13} />
        {hasSelection ? `${ids.length} seçili` : "Tümünü seç"}
      </button>

      {hasSelection && (
        <>
          <Button variant="ghost" compact icon={<RotateCcw size={14} />} onClick={() => rotatePages(ids, -90)} title="Sola döndür" aria-label="Sola döndür" />
          <Button variant="ghost" compact icon={<RotateCw size={14} />} onClick={() => rotatePages(ids, 90)} title="Sağa döndür" aria-label="Sağa döndür" />
          <Button variant="ghost" compact icon={<Copy size={14} />} onClick={() => duplicatePages(ids)} title="Çoğalt" aria-label="Çoğalt" />
          <Button variant="danger" compact icon={<Trash2 size={14} />} onClick={() => deletePages(ids)} title="Sil" aria-label="Sil" />
        </>
      )}

      <div className="flex-1" />
      <div className="hidden items-center gap-2 sm:flex">
        <Grid2X2 size={13} className="text-text-soft" />
        <input
          type="range"
          min={120}
          max={320}
          step={10}
          value={thumbnailSize}
          onChange={(event) => setThumbnailSize(Number(event.target.value))}
          className="w-20 accent-[var(--brand)]"
          aria-label="Sayfa kartı boyutu"
        />
        <span className="w-9 text-right text-[9px] text-text-soft tabular-nums">{thumbnailSize}</span>
      </div>
    </div>
  );
}
