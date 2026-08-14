import { useState } from "react";
import {
  ArrowRight,
  Check,
  Combine,
  Download,
  FilePlus2,
  Files,
  FolderOpen,
  Languages,
  LayoutGrid,
  Layers3,
  LockKeyhole,
  Moon,
  PenLine,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import { useOpenDialog } from "../../hooks/useFiles";
import { useUiStore } from "../../store/uiStore";
import { useTranslation } from "../../i18n";

const FEATURES = [
  { icon: LayoutGrid, title: "edit", text: "editFeature" },
  { icon: Combine, title: "mergeFeatureTitle", text: "mergeFeature" },
  { icon: PenLine, title: "enrich", text: "enrichFeature" },
] as const;

const WORKFLOW = [
  { icon: FolderOpen, label: "workflowOpen" },
  { icon: SlidersHorizontal, label: "workflowEdit" },
  { icon: Download, label: "workflowDownload" },
] as const;

export function EmptyState() {
  const openDialog = useOpenDialog();
  const [dragActive, setDragActive] = useState(false);
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const setLanguage = useUiStore((state) => state.setLanguage);
  const { language, t } = useTranslation();

  return (
    <div className="start-screen min-h-full overflow-y-auto bg-bg text-text">
      <header className="start-header border-b border-border">
        <div className="mx-auto flex h-16 max-w-[72rem] items-center px-5 sm:px-8">
          <div className="flex items-center gap-3" aria-label="Forma PDF">
            <span className="brand-mark grid h-9 w-9 place-items-center rounded-[10px] text-accent-text">
              <Layers3 size={18} strokeWidth={2.15} />
            </span>
            <span>
              <span className="block text-[15px] font-bold leading-none tracking-[-0.025em]">Forma</span>
              <span className="mt-1 block text-[9px] font-semibold tracking-[0.14em] text-text-soft uppercase">PDF Workspace</span>
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <span className="mr-2 hidden items-center gap-1.5 text-[10px] font-semibold text-text-soft sm:flex">
              <ShieldCheck size={13} className="text-ok" />
              {t("secureBrowser")}
            </span>
            <label className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 text-text-dim">
              <Languages size={14} aria-hidden="true" />
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as "en" | "tr")}
                className="cursor-pointer border-0 bg-transparent text-[11px] font-semibold text-text outline-none"
                aria-label="Language"
              >
                <option value="en">EN</option>
                <option value="tr">TR</option>
              </select>
            </label>
            <button
              type="button"
              onClick={toggleTheme}
              className="grid h-9 w-9 place-items-center rounded-lg border border-transparent text-text-dim transition hover:border-border hover:bg-surface hover:text-text"
              aria-label={t("switchTheme")}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[72rem] flex-col justify-center px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8 max-w-[46rem]">
          <span className="text-[11px] font-bold tracking-[0.12em] text-brand uppercase">{t("browserPdfStudio")}</span>
          <h1 className="mt-3 text-[clamp(2.15rem,4.8vw,3.65rem)] font-bold leading-[1.06] tracking-[-0.047em]">
            {t("heroTitle")} <span className="text-text-dim">{t("heroAccent")}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[14px] leading-6 text-text-dim sm:text-[15px]">
            {t("heroDescription")}
          </p>

          <ol className="mt-6 flex flex-wrap items-center gap-y-2 text-[10px] font-bold text-text-soft" aria-label={t("workflowLabel")}>
            {WORKFLOW.map(({ icon: Icon, label }, index) => (
              <li key={label} className="flex items-center">
                <span className="flex items-center gap-1.5">
                  <Icon size={13} className="text-brand" />
                  {t(label)}
                </span>
                {index < WORKFLOW.length - 1 && <ArrowRight size={12} className="mx-3 text-border" aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </div>

        <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
          <button
            type="button"
            onClick={() => void openDialog()}
            onDragEnter={() => setDragActive(true)}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={() => setDragActive(false)}
            className={[
              "upload-stage group relative flex min-h-[22rem] flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-surface px-7 py-10 text-center shadow-[var(--shadow)] transition",
              dragActive
                ? "border-brand bg-accent-soft shadow-[var(--shadow-float)]"
                : "border-border hover:border-brand/45 hover:shadow-[var(--shadow-float)]",
            ].join(" ")}
          >
            <span className="grid h-14 w-14 place-items-center rounded-xl border border-brand/15 bg-accent-soft text-brand transition group-hover:-translate-y-0.5">
              <FilePlus2 size={24} strokeWidth={1.8} />
            </span>
            <span className="mt-5 text-[18px] font-bold tracking-[-0.025em]">{t("dropPdf")}</span>
            <span className="mt-2 max-w-sm text-[12px] leading-5 text-text-dim">{t("dropDescription")}</span>
            <span className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-[12px] font-bold text-accent-text shadow-sm transition group-hover:bg-brand-strong">
              {t("chooseFile")} <ArrowRight size={14} />
            </span>
            <span className="mt-5 inline-flex items-center gap-1.5 text-[10px] font-semibold text-text-soft">
              <LockKeyhole size={12} /> {t("secureBrowser")}
            </span>
          </button>

          <aside className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
            <div className="flex items-start gap-3 border-b border-border pb-5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-text-dim">
                <Files size={17} />
              </span>
              <div>
                <h2 className="text-[13px] font-bold tracking-[-0.01em]">{t("oneWorkspace")}</h2>
                <p className="mt-1 text-[11px] leading-5 text-text-soft">{t("workflowDescription")}</p>
              </div>
            </div>

            <div className="divide-y divide-border">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex gap-3 py-4 last:pb-0">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-brand">
                    <Icon size={15} strokeWidth={1.9} />
                  </span>
                  <div>
                    <h3 className="text-[12px] font-bold">{t(title)}</h3>
                    <p className="mt-1 text-[11px] leading-4 text-text-soft">{t(text)}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-semibold text-text-soft">
          {[t("noAccount"), t("noUpload"), t("noWatermark")].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <Check size={12} className="text-ok" strokeWidth={2.5} />
              {item}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}
