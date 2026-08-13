import { ArrowRight, Combine, FilePlus2, ScanText, ShieldCheck, Sparkles } from "lucide-react";
import { useOpenDialog } from "../../hooks/useFiles";

const IDEAS = [
  { icon: ScanText, title: "Sayfaları düzenle", text: "Sırala, döndür, ayıkla" },
  { icon: Combine, title: "PDF'leri birleştir", text: "Tek bir akışta topla" },
  { icon: Sparkles, title: "İçeriğini zenginleştir", text: "Metin, imza ve filigran" },
];

export function EmptyState() {
  const openDialog = useOpenDialog();

  return (
    <div className="flex min-h-full items-center justify-center p-6 lg:p-10">
      <div className="w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-[var(--shadow)]">
        <div className="grid min-h-[31rem] md:grid-cols-[1.04fr_0.96fr]">
          <section className="relative flex flex-col justify-between overflow-hidden bg-[#24212f] p-8 text-white lg:p-11">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#8266ff]/35 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-10 h-52 w-52 rounded-full bg-[#f0719b]/15 blur-3xl" />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/7 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-white/65 uppercase">
                <Sparkles size={12} className="text-[#ab98ff]" />
                Yeni çalışma
              </span>
              <h2 className="mt-6 max-w-md text-[2.1rem] font-bold leading-[1.12] tracking-[-0.045em]">
                PDF düzenlemek artık karmaşık görünmek zorunda değil.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/55">
                Belgeni aç; sayfalarını görsel bir tuvalde sırala ve ihtiyacın olan aracı üst panelden seç.
              </p>
            </div>

            <div className="relative mt-9 flex items-center gap-2 text-[10px] text-white/42">
              <ShieldCheck size={14} className="text-[#75dab5]" />
              Dosyaların cihazında işlenir ve çalışma alanında kalır.
            </div>
          </section>

          <section className="flex flex-col justify-center p-7 lg:p-10">
            <button
              type="button"
              onClick={() => void openDialog()}
              className="group flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-brand/35 bg-accent-soft/55 px-6 text-center transition hover:-translate-y-0.5 hover:border-brand/65 hover:bg-accent-soft hover:shadow-lg"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-white shadow-[0_10px_28px_rgb(114_87_232/0.28)] transition group-hover:scale-105">
                <FilePlus2 size={23} />
              </span>
              <span className="mt-4 text-sm font-bold tracking-[-0.015em]">PDF'ini buraya bırak</span>
              <span className="mt-1 text-[11px] text-text-dim">veya bilgisayarından seçmek için tıkla</span>
              <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-brand">
                Belge seç <ArrowRight size={12} />
              </span>
            </button>

            <div className="mt-7">
              <p className="mb-3 text-[9px] font-bold tracking-[0.16em] text-text-soft uppercase">
                Neler yapabilirsin?
              </p>
              <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
                {IDEAS.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="rounded-xl border border-border bg-sidebar-header p-3">
                    <Icon size={15} className="text-brand" />
                    <p className="mt-2 text-[10px] font-bold leading-tight">{title}</p>
                    <p className="mt-1 text-[9px] leading-tight text-text-soft">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
