import { useEffect, useState } from "react";

export interface Plate {
  id: string;
  src: string;
  alt: string;
  /** Levhanın çekildiği gerçek konum; kahraman alandaki koordinat okuması. */
  coords: string;
  caption: string;
}

/**
 * Levhaları sırayla ilerletir. Kullanıcı bir levhaya kendisi geçtiğinde
 * sayaç sıfırlanır; hareket azaltma tercihi açıksa otomatik geçiş olmaz.
 */
export function usePlateCycle(count: number, intervalMs = 7000) {
  const [index, setIndex] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), intervalMs);
    return () => window.clearInterval(timer);
  }, [count, intervalMs, tick]);

  const goTo = (next: number) => {
    setIndex(next);
    setTick((value) => value + 1);
  };

  return { index, goTo };
}

/** Çapraz geçişli levha sahnesi: görseller üst üste durur, aktif olan açılır. */
export function PlateStage({ plates, index }: { plates: Plate[]; index: number }) {
  return (
    <div className="plate-stage absolute inset-0 overflow-hidden" aria-hidden="true">
      {plates.map((plate, position) => (
        <div key={plate.id} className="plate-layer" data-active={position === index}>
          <img
            src={plate.src}
            alt=""
            decoding="async"
            fetchPriority={position === 0 ? "high" : "low"}
          />
        </div>
      ))}
      <div className="plate-scrim absolute inset-0" />
      <div className="graticule absolute inset-0 opacity-60" style={{ ["--grid-line" as string]: "rgb(232 241 241 / 0.07)" }} />
    </div>
  );
}
