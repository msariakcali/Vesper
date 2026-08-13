import {
  ArrowRight,
  Check,
  Combine,
  Download,
  FilePlus2,
  Layers3,
  LockKeyhole,
  Moon,
  ScanText,
  Sparkles,
  Sun,
  WandSparkles,
} from "lucide-react";
import { useOpenDialog } from "../../hooks/useFiles";
import { useUiStore } from "../../store/uiStore";

const FEATURES = [
  { icon: ScanText, title: "Düzenle", text: "Sayfaları sırala, döndür, sil ve ayıkla." },
  { icon: Combine, title: "Birleştir", text: "Birden fazla PDF'i tek belgede topla." },
  { icon: WandSparkles, title: "Zenginleştir", text: "Metin, imza, filigran ve numara ekle." },
];

export function EmptyState() {
  const openDialog = useOpenDialog();
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  return (
    <div className="website-home min-h-full overflow-y-auto bg-[#f8f7fc] text-[#24222d] dark:bg-[#16151c] dark:text-[#f5f3f8]">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#f8f7fc]/85 backdrop-blur-xl dark:border-white/8 dark:bg-[#16151c]/85">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center px-5 sm:px-8">
          <a href="#top" className="flex items-center gap-3" aria-label="Forma ana sayfa">
            <span className="brand-mark grid h-9 w-9 place-items-center rounded-xl text-white">
              <Layers3 size={18} strokeWidth={2.2} />
            </span>
            <span>
              <span className="block text-sm font-black leading-none tracking-[-0.03em]">Forma</span>
              <span className="mt-1 block text-[8px] font-bold tracking-[0.2em] text-[#8c8798] uppercase">PDF Studio</span>
            </span>
          </a>

          <nav className="ml-auto hidden items-center gap-7 text-[11px] font-semibold text-[#716c7b] md:flex dark:text-white/55" aria-label="Ana menü">
            <a href="#neler-yapilir" className="transition hover:text-[#7257e8]">Özellikler</a>
            <a href="#guvenlik" className="transition hover:text-[#7257e8]">Gizlilik</a>
            <span className="rounded-full border border-[#7257e8]/20 bg-[#7257e8]/7 px-3 py-1.5 text-[#7257e8] dark:text-[#aa98ff]">
              Ücretsiz
            </span>
          </nav>

          <button
            type="button"
            onClick={toggleTheme}
            className="ml-3 grid h-9 w-9 place-items-center rounded-xl text-[#746f7e] transition hover:bg-black/5 hover:text-[#24222d] dark:text-white/55 dark:hover:bg-white/8 dark:hover:text-white"
            aria-label="Temayı değiştir"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            onClick={() => void openDialog()}
            className="ml-2 inline-flex h-9 items-center gap-2 rounded-xl bg-[#24212f] px-4 text-[10px] font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#302c40] dark:bg-[#7257e8] dark:hover:bg-[#8169ec]"
          >
            PDF yükle <ArrowRight size={13} />
          </button>
        </div>
      </header>

      <main id="top">
        <section className="relative overflow-hidden px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
          <div className="hero-orb hero-orb-one" />
          <div className="hero-orb hero-orb-two" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#7257e8]/15 bg-white/70 px-3 py-1.5 text-[9px] font-bold tracking-[0.13em] text-[#7257e8] uppercase shadow-sm backdrop-blur dark:bg-white/6 dark:text-[#aa98ff]">
                <Sparkles size={12} /> Tarayıcıda çalışan PDF stüdyosu
              </span>
              <h1 className="mt-7 max-w-3xl text-[clamp(2.8rem,6.5vw,5.5rem)] font-black leading-[0.98] tracking-[-0.065em]">
                PDF'inle işin,
                <span className="hero-gradient-text block">birkaç dakikada bitsin.</span>
              </h1>
              <p className="mt-7 max-w-xl text-sm leading-7 text-[#706b79] sm:text-base dark:text-white/52">
                Dosyanı yükle, sayfaları görsel olarak düzenle, kesintisiz oku ve tamamlandığında tek tıkla indir. Hesap açmak yok, beklemek yok.
              </p>

              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-semibold text-[#625d6d] dark:text-white/48">
                {[
                  "Kayıt gerektirmez",
                  "Dosya sunucuya yüklenmez",
                  "Filigransız indirme",
                ].map((item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <span className="grid h-4 w-4 place-items-center rounded-full bg-[#18a779]/10 text-[#18a779]">
                      <Check size={10} strokeWidth={3} />
                    </span>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void openDialog()}
              className="upload-stage group relative min-h-[25rem] overflow-hidden rounded-[2rem] border border-white/80 bg-white/72 p-5 text-left shadow-[0_30px_90px_rgb(66_51_115/0.14)] backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-[0_38px_100px_rgb(66_51_115/0.2)] dark:border-white/10 dark:bg-white/6"
            >
              <div className="absolute inset-5 rounded-[1.45rem] border border-dashed border-[#7257e8]/28 transition group-hover:border-[#7257e8]/65 group-hover:bg-[#7257e8]/[0.025]" />
              <div className="relative flex min-h-[22.5rem] flex-col items-center justify-center px-6 text-center">
                <span className="upload-icon grid h-[4.5rem] w-[4.5rem] place-items-center rounded-[1.4rem] bg-[#7257e8] text-white shadow-[0_16px_38px_rgb(114_87_232/0.32)] transition duration-300 group-hover:scale-105 group-hover:rotate-2">
                  <FilePlus2 size={29} strokeWidth={1.8} />
                </span>
                <span className="mt-6 text-lg font-black tracking-[-0.035em]">PDF'ini buraya bırak</span>
                <span className="mt-2 max-w-xs text-[11px] leading-5 text-[#817b8a] dark:text-white/44">
                  Dosyanı sürükleyip bırak veya bilgisayarından seç. Birden fazla PDF yükleyebilirsin.
                </span>
                <span className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-[#24212f] px-5 text-[10px] font-bold text-white shadow-lg dark:bg-[#7257e8]">
                  Dosya seç <ArrowRight size={13} />
                </span>
                <span className="mt-4 text-[9px] font-semibold text-[#aaa5b1]">PDF · Tarayıcında güvenle işlenir</span>
              </div>
            </button>
          </div>
        </section>

        <section id="neler-yapilir" className="border-y border-black/5 bg-white/65 px-5 py-20 dark:border-white/7 dark:bg-white/[0.025] sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <span className="text-[9px] font-black tracking-[0.18em] text-[#7257e8] uppercase dark:text-[#aa98ff]">Tek çalışma alanı</span>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl">Yükle, düzenle, oku, indir.</h2>
              <p className="mt-4 text-sm leading-6 text-[#7a7582] dark:text-white/48">Karmaşık menüler arasında kaybolmadan PDF işlerinin tamamını aynı yerde bitir.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }, index) => (
                <article key={title} className="rounded-[1.4rem] border border-black/5 bg-white p-6 shadow-[0_12px_40px_rgb(55_42_90/0.06)] dark:border-white/8 dark:bg-white/5">
                  <div className="flex items-start justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#efebff] text-[#7257e8] dark:bg-[#7257e8]/15 dark:text-[#aa98ff]">
                      <Icon size={19} strokeWidth={1.8} />
                    </span>
                    <span className="text-[10px] font-black text-[#d7d3df] dark:text-white/15">0{index + 1}</span>
                  </div>
                  <h3 className="mt-7 text-base font-black tracking-[-0.025em]">{title}</h3>
                  <p className="mt-2 text-[11px] leading-5 text-[#817c89] dark:text-white/42">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="guvenlik" className="px-5 py-20 sm:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-10 rounded-[2rem] bg-[#24212f] px-7 py-10 text-white shadow-2xl sm:px-12 lg:grid-cols-[auto_1fr_auto]">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#7257e8] shadow-[0_14px_35px_rgb(114_87_232/0.32)]">
              <LockKeyhole size={23} />
            </span>
            <div>
              <h2 className="text-xl font-black tracking-[-0.035em]">Belgen senin cihazında kalır.</h2>
              <p className="mt-2 max-w-2xl text-[11px] leading-5 text-white/48">Forma işlemleri tarayıcında gerçekleştirir. Dosyanı bir sunucuya göndermeden düzenler ve sonucu doğrudan cihazına indirir.</p>
            </div>
            <button type="button" onClick={() => void openDialog()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 text-[10px] font-black text-[#24212f] transition hover:-translate-y-0.5">
              <Download size={14} /> Hemen başla
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/5 px-5 py-7 dark:border-white/7 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-[9px] font-semibold text-[#9892a0] sm:flex-row">
          <span>© 2026 Forma PDF Studio</span>
          <span>Dosyanı yükle · Düzenle ve oku · İndir</span>
        </div>
      </footer>
    </div>
  );
}
