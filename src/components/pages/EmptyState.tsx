import { useState } from "react";
import {
  ArrowRight,
  Check,
  Combine,
  Download,
  FilePlus2,
  FolderOpen,
  Languages,
  LayoutGrid,
  PenLine,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useOpenDialog } from "../../hooks/useFiles";
import { useUiStore } from "../../store/uiStore";
import { type TranslationKey, useTranslation } from "../../i18n";
import { Seal, Wordmark } from "../brand/Wordmark";
import { PlateStage, usePlateCycle, type Plate } from "./PlateStage";

/** Kahraman levhalar. Koordinatlar gerçek: Greenwich başlangıç meridyeni,
 *  Boğaziçi derinlik haritası, sayfalardan küre için 0°/0° (Null Island). */
const PLATES: { id: string; captionKey: TranslationKey; coords: string }[] = [
  { id: "plate-04-paper-world", captionKey: "plate04Caption", coords: "00°00′N 000°00′E" },
  { id: "plate-01-orbit", captionKey: "plate01Caption", coords: "43°12′N 030°00′W" },
  { id: "plate-03-chart", captionKey: "plate03Caption", coords: "41°01′N 028°58′E" },
  { id: "plate-02-globe", captionKey: "plate02Caption", coords: "51°28′N 000°00′E" },
  { id: "plate-05-coast", captionKey: "plate05Caption", coords: "36°51′S 174°46′E" },
];

const WORKFLOW = [
  { icon: FolderOpen, label: "workflowOpen" },
  { icon: SlidersHorizontal, label: "workflowEdit" },
  { icon: Download, label: "workflowDownload" },
] as const;

const FEATURES = [
  { image: "tile-edit", icon: LayoutGrid, title: "edit", text: "editFeature" },
  { image: "tile-merge", icon: Combine, title: "mergeFeatureTitle", text: "mergeFeature" },
  { image: "tile-finish", icon: PenLine, title: "enrich", text: "enrichFeature" },
] as const;

export function EmptyState() {
  const openDialog = useOpenDialog();
  const [dragActive, setDragActive] = useState(false);
  const setLanguage = useUiStore((state) => state.setLanguage);
  const { language, t } = useTranslation();
  const { index, goTo } = usePlateCycle(PLATES.length);

  const plates: Plate[] = PLATES.map((plate) => ({
    id: plate.id,
    src: `/media/${plate.id}.jpg`,
    alt: t(plate.captionKey),
    coords: plate.coords,
    caption: t(plate.captionKey),
  }));
  const current = plates[index];

  return (
    <div className="start-screen min-h-full overflow-y-auto bg-bg text-text">
      <header className="start-header sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex h-16 max-w-[76rem] items-center px-5 sm:px-8">
          <a href="/" className="flex items-center gap-2.5" aria-label="worldinpdf">
            <span className="text-brand">
              <Seal size={22} />
            </span>
            <Wordmark size={19} />
          </a>

          <div className="ml-auto flex items-center gap-1.5">
            <span className="mr-2 hidden items-center gap-1.5 font-mono text-[10px] tracking-[0.04em] text-text-soft sm:flex">
              <ShieldCheck size={13} className="text-ok" />
              {t("secureBrowser")}
            </span>
            <label className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-text-dim">
              <Languages size={14} aria-hidden="true" />
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value as "en" | "tr")}
                className="cursor-pointer border-0 bg-transparent font-mono text-[11px] text-text outline-none"
                aria-label="Language"
              >
                <option value="en">EN</option>
                <option value="tr">TR</option>
              </select>
            </label>
          </div>
        </div>
      </header>

      {/* ---- Levha sahnesi: görsel her zaman koyu, bu yüzden içerideki
              renk simgeleri .on-plate ile yerel olarak koyu temaya sabitlenir. ---- */}
      <section className="on-plate relative isolate flex min-h-[min(48rem,calc(100vh_-_4rem))] flex-col overflow-hidden">
        <PlateStage plates={plates} index={index} />

        <div className="relative z-10 mx-auto flex w-full max-w-[76rem] flex-1 flex-col px-5 py-12 sm:px-8 sm:py-16">
          <div className="flex flex-1 flex-col justify-center">
            <div className="max-w-[38rem]">
              <p className="flex items-center gap-2.5 font-mono text-[10px] tracking-[0.16em] text-text-soft uppercase">
                <span className="h-px w-7 bg-brass" aria-hidden="true" />
                {t("browserPdfStudio")}
              </p>

              <h1 className="mt-6 font-display text-[clamp(2.6rem,5.6vw,4.4rem)] leading-[0.98] font-bold tracking-[-0.02em] text-text">
                {t("heroTitle")}
                {/* İtalik satır her genişlikte kendi satırında dursun: roman/italik
                    karşıtlığı başlığın taşıyıcı fikri, kırılıma bırakılamaz. */}
                <em className="mt-0.5 block font-normal text-brass italic">{t("heroAccent")}</em>
              </h1>

              <p className="mt-6 max-w-[33rem] text-[15px] leading-[1.65] text-text-dim">
                {t("heroDescription")}
              </p>

              {/* Sürükle-bırak levhası: masaya iğnelenmiş harita gibi taksimatlı çerçeve.
                  Fotoğraf arka planı koyu olsa da bu kart .on-plate'in koyu jetonlarını
                  miras almaz — her zaman gerçek açık tema renklerini kullanır. */}
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
                  "upload-stage tick-frame group mt-9 flex w-full flex-col items-start gap-5 rounded-sm border p-5 text-left sm:flex-row sm:items-center sm:gap-6 sm:p-6",
                  "bg-[#e7e1d4] shadow-[0_22px_54px_rgb(15_33_41/0.22),0_2px_8px_rgb(15_33_41/0.12)]",
                  dragActive ? "border-[#0b6e6b] bg-[#dcebe7]" : "border-[#c9bfa8]",
                ].join(" ")}
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#0b6e6b]/40 text-[#0b6e6b] transition group-hover:border-[#0b6e6b]">
                  <FilePlus2 size={20} strokeWidth={1.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[19px] leading-tight font-bold tracking-[-0.015em] text-[#0f2129]">
                    {t("dropPdf")}
                  </span>
                  <span className="mt-1.5 block text-[12.5px] leading-[1.5] text-[#4b5c63]">
                    {t("dropDescription")}
                  </span>
                </span>
                <span className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm bg-[#0b6e6b] px-5 text-[12px] font-semibold tracking-[0.02em] text-[#fbf8f2] transition group-hover:bg-[#075150]">
                  {t("chooseFile")} <ArrowRight size={15} />
                </span>
              </button>

              <ol className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 sm:gap-x-0" aria-label={t("workflowLabel")}>
                {WORKFLOW.map(({ icon: Icon, label }, step) => (
                  <li key={label} className="flex items-center">
                    <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.08em] text-text-dim uppercase">
                      <Icon size={14} className="text-brand" strokeWidth={1.8} />
                      {t(label)}
                    </span>
                    {step < WORKFLOW.length - 1 && (
                      <span className="route-line mx-3 hidden h-px w-8 sm:block sm:w-12" aria-hidden="true" />
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Levha künyesi: her görselin gerçek konumu ve sıra taksimatı. */}
          <div className="mt-12 flex flex-wrap items-end justify-between gap-6 border-t border-[rgb(232_241_241/0.14)] pt-5">
            <div className="font-mono text-[10px] tracking-[0.1em] text-text-soft uppercase">
              <span className="text-brass">{t("plateLabel", { count: index + 1 })}</span>
              <span className="mx-2.5 opacity-40">/</span>
              <span className="text-text-dim">{current.caption}</span>
              <span className="mx-2.5 opacity-40">/</span>
              <span className="tabular-nums">{current.coords}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {plates.map((plate, position) => (
                <button
                  key={plate.id}
                  type="button"
                  onClick={() => goTo(position)}
                  aria-label={t("showPlate", { count: position + 1 })}
                  aria-current={position === index}
                  className="py-2"
                >
                  <span
                    className={["plate-tick block rounded-full", position === index ? "w-11" : "w-5"].join(" ")}
                    data-active={position === index}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---- Araç şeridi ---- */}
      <section className="mx-auto max-w-[76rem] px-5 py-16 sm:px-8 sm:py-20">
        <div className="max-w-[34rem]">
          <p className="font-mono text-[10px] tracking-[0.16em] text-text-soft uppercase">{t("workflowLabel")}</p>
          <h2 className="mt-4 font-display text-[clamp(1.7rem,3vw,2.4rem)] leading-[1.1] font-bold tracking-[-0.015em]">
            {t("oneWorkspace")}
          </h2>
          <p className="mt-4 text-[14px] leading-[1.65] text-text-dim">{t("workflowDescription")}</p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {FEATURES.map(({ image, icon: Icon, title, text }) => (
            <article
              key={title}
              className="feature-tile overflow-hidden rounded-sm border border-border bg-surface shadow-[var(--shadow)]"
            >
              <div className="aspect-[4/3] overflow-hidden bg-surface-2">
                <img
                  src={`/media/${image}.jpg`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-5">
                <h3 className="flex items-center gap-2 text-[13px] font-semibold tracking-[-0.005em]">
                  <Icon size={15} className="text-brand" strokeWidth={1.9} />
                  {t(title)}
                </h3>
                <p className="mt-2 text-[12.5px] leading-[1.6] text-text-dim">{t(text)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[76rem] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-6 sm:px-8">
          <span className="font-mono text-[11px] tracking-[0.04em] text-text-dim">worldinpdf.com</span>
          <div className="ml-auto flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] tracking-[0.04em] text-text-soft">
            {[t("noAccount"), t("noUpload"), t("noWatermark")].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <Check size={12} className="text-ok" strokeWidth={2.4} />
                {item}
              </span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
