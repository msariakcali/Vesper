import { useMemo, useState, type ReactNode } from "react";
import { Eye, Pencil, Save, Trash2, Undo2, X } from "lucide-react";
import { parsePageRange } from "../../core/ops/pageRange";
import type { Overlay, OverlayChanges, OverlayTool } from "../../core/model/types";
import { useDocumentStore } from "../../store/documentStore";
import { useUiStore } from "../../store/uiStore";
import { useTranslation } from "../../i18n";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-[10px] font-bold tracking-[0.1em] text-text-soft uppercase">{title}</h3>
      {children}
    </div>
  );
}

export function PageRangeInput({
  value,
  onChange,
  pageCount,
}: {
  value: string;
  onChange: (value: string) => void;
  pageCount: number;
}) {
  const parsed = parsePageRange(value, pageCount);
  return (
    <>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={pageCount > 0 ? `1-${pageCount}` : "Sayfa aralığı"}
        spellCheck={false}
        className={[
          "h-9 w-full rounded-lg border bg-surface-2 px-3 font-mono text-xs text-text",
          parsed.errors.length > 0 ? "border-danger" : "border-border",
        ].join(" ")}
      />
      {parsed.errors.length > 0 && (
        <p className="text-xs text-danger">Anlaşılmayan bölüm: {parsed.errors.join(", ")}</p>
      )}
    </>
  );
}

export function SegmentedButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        "min-h-9 rounded-lg border px-2 text-[11px] font-semibold transition-colors",
        selected
          ? "border-brand/40 bg-accent-soft text-brand"
          : "border-border bg-surface text-text-dim hover:text-text",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/** İçerik araçlarının sayfalara eklediği öğeleri aynı panelden yönetir. */
export function AppliedOverlays({ tool }: { tool: OverlayTool }) {
  const pages = useDocumentStore((state) => state.model.pages);
  const updateOverlay = useDocumentStore((state) => state.updateOverlay);
  const updateOverlayGroup = useDocumentStore((state) => state.updateOverlayGroup);
  const removeOverlay = useDocumentStore((state) => state.removeOverlay);
  const removeOverlaysByTool = useDocumentStore((state) => state.removeOverlaysByTool);
  const undo = useDocumentStore((state) => state.undo);
  const canUndo = useDocumentStore((state) => state.past.length > 0);
  const setPreviewPage = useUiStore((state) => state.setPreviewPage);
  const notify = useUiStore((state) => state.notify);
  const { t } = useTranslation();
  const [editor, setEditor] = useState<{
    pageId: string;
    pageNumber: number;
    draft: Overlay;
    applyToGroup: boolean;
  } | null>(null);

  const entries = useMemo(
    () =>
      pages.flatMap((page, pageIndex) =>
        page.overlays
          .filter((overlay) => overlay.tool === tool)
          .map((overlay) => ({ pageId: page.id, pageNumber: pageIndex + 1, overlay })),
      ),
    [pages, tool],
  );

  const removeOne = (pageId: string, overlayId: string) => {
    if (editor?.draft.id === overlayId) setEditor(null);
    removeOverlay(pageId, overlayId);
    notify("info", t("appliedItemRemoved"));
  };

  const removeAll = () => {
    const count = entries.length;
    setEditor(null);
    removeOverlaysByTool(tool);
    notify("info", t("appliedItemsRemoved", { count }));
  };

  const openEditor = (pageId: string, pageNumber: number, overlay: Overlay) => {
    const groupCount = overlay.groupId
      ? entries.filter((entry) => entry.overlay.groupId === overlay.groupId).length
      : 1;
    setEditor({
      pageId,
      pageNumber,
      draft: { ...overlay },
      applyToGroup: groupCount > 1 && overlay.tool !== "pageNumber",
    });
  };

  const saveEditor = () => {
    if (!editor) return;
    const preserveText = editor.applyToGroup && editor.draft.tool === "pageNumber";
    const changes = editableChanges(editor.draft, preserveText);
    if (editor.applyToGroup && editor.draft.groupId) {
      updateOverlayGroup(editor.draft.groupId, changes);
    } else {
      updateOverlay(editor.pageId, editor.draft.id, changes);
    }
    setEditor(null);
    notify("success", t("appliedItemUpdated"));
  };

  return (
    <Section title={`${t("appliedItems")} · ${entries.length}`}>
      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-2 px-3 py-3 text-[11px] leading-5 text-text-soft">
          {t("noAppliedItems")}
        </div>
      ) : (
        <>
          <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {entries.map(({ pageId, pageNumber, overlay }) => (
              <div key={overlay.id} className="overflow-hidden rounded-lg border border-border bg-surface">
                <div className="flex items-center gap-1.5 px-2 py-2">
                  <span className="grid h-7 min-w-7 shrink-0 place-items-center rounded-md bg-accent-soft px-1 text-[10px] font-bold text-brand tabular-nums">
                    {pageNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewPage(pageId)}
                    className="min-w-0 flex-1 text-left"
                    title={`${t("goToPage")} ${pageNumber}`}
                  >
                    <span className="block truncate text-[11px] font-semibold text-text">
                      {overlaySummary(overlay, tool, t("signature"), t("fromImage"))}
                    </span>
                    <span className="mt-0.5 block text-[9px] text-text-soft">{t("page", { count: pageNumber })}</span>
                  </button>
                  <ItemAction
                    label={t("editAppliedItem")}
                    active={editor?.draft.id === overlay.id}
                    onClick={() => openEditor(pageId, pageNumber, overlay)}
                  >
                    <Pencil size={14} />
                  </ItemAction>
                  <ItemAction label={`${t("goToPage")} ${pageNumber}`} onClick={() => setPreviewPage(pageId)}>
                    <Eye size={14} />
                  </ItemAction>
                  <ItemAction danger label={t("removeAppliedItem")} onClick={() => removeOne(pageId, overlay.id)}>
                    <Trash2 size={14} />
                  </ItemAction>
                </div>

                {editor?.draft.id === overlay.id && (
                  <OverlayEditor
                    draft={editor.draft}
                    pageNumber={editor.pageNumber}
                    groupCount={
                      overlay.groupId
                        ? entries.filter((entry) => entry.overlay.groupId === overlay.groupId).length
                        : 1
                    }
                    applyToGroup={editor.applyToGroup}
                    onApplyToGroup={(applyToGroup) => setEditor((current) => current && { ...current, applyToGroup })}
                    onChange={(draft) => setEditor((current) => current && { ...current, draft })}
                    onCancel={() => setEditor(null)}
                    onSave={saveEditor}
                  />
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={removeAll}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-danger/20 text-[11px] font-semibold text-danger hover:bg-danger/10"
          >
            <Trash2 size={13} /> {t("removeAllApplied")}
          </button>
        </>
      )}

      <button
        type="button"
        disabled={!canUndo}
        onClick={undo}
        className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-[11px] font-semibold text-text-dim hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-35"
      >
        <Undo2 size={13} /> {t("undoLastChange")}
      </button>
    </Section>
  );
}

function ItemAction({
  label,
  onClick,
  active = false,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        "grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors",
        danger
          ? "text-text-dim hover:bg-danger/10 hover:text-danger"
          : active
            ? "bg-accent-soft text-brand"
            : "text-text-dim hover:bg-surface-2 hover:text-brand",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function OverlayEditor({
  draft,
  pageNumber,
  groupCount,
  applyToGroup,
  onApplyToGroup,
  onChange,
  onCancel,
  onSave,
}: {
  draft: Overlay;
  pageNumber: number;
  groupCount: number;
  applyToGroup: boolean;
  onApplyToGroup: (value: boolean) => void;
  onChange: (draft: Overlay) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const patch = (changes: OverlayChanges) => onChange({ ...draft, ...changes } as Overlay);

  const changeImageWidth = (percent: number) => {
    if (draft.kind !== "image") return;
    const ratio = draft.width > 0 ? draft.height / draft.width : 1;
    const width = percent / 100;
    patch({ width, height: Math.min(1, width * ratio) });
  };

  return (
    <div className="border-t border-border bg-surface-2/70 px-3 py-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold text-text">{t("editAppliedItem")}</p>
          <p className="text-[9px] text-text-soft">{t("page", { count: pageNumber })}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="grid h-7 w-7 place-items-center rounded-md text-text-soft hover:bg-surface hover:text-text"
          aria-label={t("cancel")}
          title={t("cancel")}
        >
          <X size={13} />
        </button>
      </div>

      <div className="space-y-3">
        {draft.kind === "text" && (
          <label className="block text-[10px] font-semibold text-text-dim">
            {t("text")}
            <textarea
              rows={2}
              value={draft.text}
              disabled={draft.tool === "pageNumber" && applyToGroup}
              onChange={(event) => patch({ text: event.target.value })}
              className="mt-1 w-full resize-y rounded-md border border-border bg-surface px-2.5 py-2 text-xs text-text outline-none focus:border-brand disabled:cursor-not-allowed disabled:opacity-45"
            />
            {draft.tool === "pageNumber" && applyToGroup && (
              <span className="mt-1 block text-[9px] font-normal leading-4 text-text-soft">
                {t("pageNumberTextKept")}
              </span>
            )}
          </label>
        )}

        <RangeControl
          label={t("size")}
          value={draft.kind === "text" ? Math.round(draft.size) : Math.round(draft.width * 100)}
          min={draft.kind === "text" ? 6 : 5}
          max={draft.kind === "text" ? 144 : 90}
          suffix={draft.kind === "text" ? "pt" : "%"}
          onChange={(value) => (draft.kind === "text" ? patch({ size: value }) : changeImageWidth(value))}
        />

        {draft.kind === "text" && (
          <label className="flex items-center justify-between gap-3 text-[10px] font-semibold text-text-dim">
            {t("color")}
            <span className="flex items-center gap-2">
              <input
                type="color"
                value={draft.color}
                onChange={(event) => patch({ color: event.target.value })}
                className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent p-0"
              />
              <span className="font-mono text-[9px] text-text-soft">{draft.color}</span>
            </span>
          </label>
        )}

        <RangeControl
          label={t("opacity")}
          value={Math.round(draft.opacity * 100)}
          min={5}
          max={100}
          suffix="%"
          onChange={(value) => patch({ opacity: value / 100 })}
        />
        <RangeControl
          label={t("angle")}
          value={Math.round(draft.rotate)}
          min={-180}
          max={180}
          suffix="°"
          onChange={(value) => patch({ rotate: value })}
        />
        <RangeControl
          label={t("horizontalPosition")}
          value={Math.round(draft.x * 100)}
          min={0}
          max={draft.kind === "image" ? Math.max(0, Math.round((1 - draft.width) * 100)) : 100}
          suffix="%"
          onChange={(value) => patch({ x: value / 100 })}
        />
        <RangeControl
          label={t("verticalPosition")}
          value={Math.round(draft.y * 100)}
          min={0}
          max={draft.kind === "image" ? Math.max(0, Math.round((1 - draft.height) * 100)) : 100}
          suffix="%"
          onChange={(value) => patch({ y: value / 100 })}
        />

        {groupCount > 1 && (
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-brand/15 bg-accent-soft/55 px-2.5 py-2 text-[10px] leading-4 text-text-dim">
            <input
              type="checkbox"
              checked={applyToGroup}
              onChange={(event) => onApplyToGroup(event.target.checked)}
              className="mt-0.5 accent-[var(--accent)]"
            />
            <span>{t("applyToSameGroup", { count: groupCount })}</span>
          </label>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-[11px] font-semibold text-text-dim hover:text-text"
          >
            <X size={13} /> {t("cancel")}
          </button>
          <button
            type="button"
            disabled={draft.kind === "text" && !draft.text.trim()}
            onClick={onSave}
            className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand text-[11px] font-semibold text-accent-text hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save size={13} /> {t("saveChanges")}
          </button>
        </div>
      </div>
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid grid-cols-[4.8rem_1fr_2.8rem] items-center gap-2 text-[10px] font-semibold text-text-dim">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={Math.min(max, Math.max(min, value))}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-[var(--accent)]"
      />
      <span className="text-right font-mono text-[9px] font-normal text-text">{value}{suffix}</span>
    </label>
  );
}

function editableChanges(overlay: Overlay, preserveText = false): OverlayChanges {
  const common = {
    x: overlay.x,
    y: overlay.y,
    opacity: overlay.opacity,
    rotate: overlay.rotate,
  };
  if (overlay.kind === "text") {
    return {
      ...common,
      ...(preserveText ? {} : { text: overlay.text }),
      size: overlay.size,
      color: overlay.color,
    };
  }
  return { ...common, width: overlay.width, height: overlay.height };
}

function overlaySummary(
  overlay: Overlay,
  tool: OverlayTool,
  signatureLabel: string,
  imageLabel: string,
): string {
  if (tool === "signature") return signatureLabel;
  if (overlay.kind === "image") return imageLabel;
  return overlay.text;
}
