/**
 * Sayfa aralığı ifadelerini ayrıştırır: "1-5, 8, 11-13".
 *
 * Uygulamanın çekirdek akışında kullanıcı kesmek istediği sayfaları böyle
 * yazıyor, bu yüzden hataya toleranslı ama net geri bildirim veren bir
 * ayrıştırıcı gerekiyor.
 */

export interface RangeParseResult {
  /** 0-tabanlı sayfa indeksleri, artan sırada ve tekrarsız. */
  indices: number[];
  /** Ayrıştırılamayan veya sınır dışı kalan parçalar. */
  errors: string[];
}

const SEPARATORS = /[,;\s]+/;
/** "3-7", "3 - 7", "3–7" (en tire) hepsini kabul et. */
const RANGE_PATTERN = /^(\d+)\s*[-–—]\s*(\d+)$/;
const SINGLE_PATTERN = /^(\d+)$/;

/**
 * @param input Kullanıcının yazdığı ifade
 * @param pageCount Belgedeki toplam sayfa sayısı (sınır denetimi için)
 */
export function parsePageRange(input: string, pageCount: number): RangeParseResult {
  const errors: string[] = [];
  const selected = new Set<number>();

  const trimmed = input.trim();
  if (trimmed === "") return { indices: [], errors };

  // "tümü" / "all" kısayolu.
  if (/^(tümü|tumu|hepsi|all)$/i.test(trimmed)) {
    return { indices: Array.from({ length: pageCount }, (_, i) => i), errors };
  }

  for (const rawPart of trimmed.split(SEPARATORS)) {
    const part = rawPart.trim();
    if (part === "") continue;

    const rangeMatch = RANGE_PATTERN.exec(part);
    if (rangeMatch) {
      const from = Number(rangeMatch[1]);
      const to = Number(rangeMatch[2]);
      // Ters yazılmış aralığı (7-3) düzelt — yazım hatası olarak kabul etmiyoruz.
      const start = Math.min(from, to);
      const end = Math.max(from, to);
      if (start < 1 || end > pageCount) {
        errors.push(`${part} (belge ${pageCount} sayfa)`);
        continue;
      }
      for (let n = start; n <= end; n += 1) selected.add(n - 1);
      continue;
    }

    const singleMatch = SINGLE_PATTERN.exec(part);
    if (singleMatch) {
      const n = Number(singleMatch[1]);
      if (n < 1 || n > pageCount) {
        errors.push(`${part} (belge ${pageCount} sayfa)`);
        continue;
      }
      selected.add(n - 1);
      continue;
    }

    errors.push(part);
  }

  return { indices: [...selected].sort((a, b) => a - b), errors };
}

/**
 * İndeks listesini okunabilir ifadeye çevirir (seçimden aralık kutusunu doldurmak için).
 * [0,1,2,4,7,8] -> "1-3, 5, 8-9"
 */
export function formatPageRange(indices: number[]): string {
  if (indices.length === 0) return "";
  const sorted = [...new Set(indices)].sort((a, b) => a - b);

  const parts: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i <= sorted.length; i += 1) {
    const current = sorted[i];
    if (current !== prev + 1) {
      parts.push(start === prev ? `${start + 1}` : `${start + 1}-${prev + 1}`);
      start = current;
    }
    prev = current;
  }

  return parts.join(", ");
}
