/**
 * Marka mührü ve kelime markası.
 *
 * Mühür bir küre grafikülü: meridyen kemeri, ekvator ve iki paralel.
 * Paraleller kürenin dışına taşar — aynı anda hem enlem çizgileri hem de
 * üst üste dizilmiş sayfa satırları okunur. "Dünya" ile "belge" tek işarette.
 */
export function Seal({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.55}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.6" />
      <ellipse cx="12" cy="12" rx="3.7" ry="8.6" />
      <path d="M4 7.6h16" />
      <path d="M1.9 12h20.2" />
      <path d="M4 16.4h16" />
    </svg>
  );
}

/**
 * worldinpdf — "in" italik ve vurgu renginde: adın ortasındaki edat,
 * markanın vaadini (dünya *içinde* değil, dünya *PDF'in içinde*) taşıyor.
 * "pdf" diğer harflerden büyük ve kırmızı: neyi düzenlediğimiz ilk bakışta belli olsun.
 */
export function Wordmark({ size = 17 }: { size?: number }) {
  return (
    <span
      className="font-display leading-none tracking-[-0.015em] text-text"
      style={{ fontSize: size, fontVariationSettings: '"opsz" 96' }}
    >
      <span className="font-bold">world</span>
      <span className="font-normal italic text-brand">in</span>
      <span className="font-bold text-[#c1272d]" style={{ fontSize: "1.3em" }}>
        pdf
      </span>
    </span>
  );
}
