# Faz 3-7 Uygulama Rehberi

Bu belge, PDF Editör projesinde tamamlanmış olan **Faz 0-2**'nin (iskelet, PDF açma/sayfa ızgarası, çekirdek akış: ayıkla/sil/döndür/sırala/kaydet/undo) üzerine inşa edilecek **Faz 3-7**'yi uygulayacak kişi için yazılmıştır. Her özellik için: hangi dosyanın oluşturulacağı/değiştirileceği, veri modelinin nasıl genişleyeceği, bileşenin tam tasarımı (renkler, boşluklar, Tailwind sınıfları), etkileşim akışı, kenar durumları ve doğrulama adımları verilmiştir.

**Bu belgeyi okumadan önce şu dosyalara göz atın** — burada anlatılan her şey onların üzerine kuruludur:
- `src/core/model/types.ts` — `PageRef`, `Overlay`, `DocumentModel`
- `src/core/model/buildPdf.ts` — tüm çıktıların geçtiği tek nokta
- `src/core/ops/pageRange.ts` — `"3-7, 10"` ayrıştırıcı
- `src/store/documentStore.ts` — undo/redo'lu belge durumu
- `src/store/uiStore.ts` — tema, aktif araç, toast, önizleme durumu
- `src/platform/*` — dosya sistemi soyutlaması (Tauri + web fallback)
- `src/components/tools/ExtractPanel.tsx` — panel tasarımının referans örneği
- `src/components/layout/ToolSidebar.tsx` — araç kayıt mekanizması

---

## 0. Tasarım Sistemi Referansı (renkler dahil her şey)

### 0.1 Renk tokenleri — ASLA hardcoded hex kullanma

Tüm UI renkleri `src/styles.css` içinde CSS custom property olarak tanımlı ve `@theme inline` ile Tailwind sınıflarına bağlanmış durumda. Yeni bir bileşen yazarken **her zaman** bu Tailwind sınıflarını kullan, asla `#rrggbb` yazma — açık/koyu tema otomatik çalışır.

| Tailwind sınıfı | Kullanım amacı | Açık tema | Koyu tema |
|---|---|---|---|
| `bg-bg` | Sayfa zemini | `#f4f5f7` | `#0e1014` |
| `bg-surface` | Kart/panel/üst bar zemini | `#ffffff` | `#171a21` |
| `bg-surface-2` | İkincil zemin (input, rozet, hover) | `#eceef2` | `#1f232c` |
| `border-border` | Tüm kenarlıklar | `#dcdfe6` | `#2a2f3a` |
| `text-text` | Ana metin | `#14161c` | `#e7e9ee` |
| `text-text-dim` | İkincil/açıklama metni | `#626b7c` | `#939cad` |
| `bg-accent` / `text-accent` / `border-accent` | Vurgu (turuncu-kırmızı, PDF ikon rengi) | `#d9452b` | `#f2603f` |
| `bg-accent-soft` | Vurgu zemin (seçili durum arka planı) | `#fdece8` | `#2d1a15` |
| `text-accent-text` | Vurgu üzerindeki metin | `#ffffff` | `#1a0e0a` |
| `text-danger` | Sil/hata | `#c02626` | `#f2564b` |
| `text-ok` | Başarı | `#1a7f4b` | `#3ecf8e` |

**Kritik ayrım:** Bunlar *uygulama arayüzü* renkleridir. **PDF içeriğine çizilen** renkler (filigran metni, sayfa numarası, imza) bunlardan tamamen bağımsızdır — kullanıcı `<input type="color">` ile seçer, pdf-lib'e `rgb(r,g,b)` (0-1 aralığında) olarak geçirilir. Varsayılan içerik renkleri için aşağıda Faz 5'te sabit hex değerler önerilmiştir (örn. filigran için `#808080`); bunlar tema tokenlerine **bağlanmamalı**, çünkü PDF çıktısı kullanıcının ekran temasından bağımsız olmalı.

### 0.2 Bileşen kalıpları

Her araç paneli şu iskeleti izler (bkz. `ExtractPanel.tsx`):

```tsx
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold tracking-wide text-text-dim uppercase">{title}</h3>
      {children}
    </div>
  );
}
```

Butonlar için `src/components/ui/Button.tsx` kullanılır — `variant`: `primary` (turuncu, ana eylem), `default` (nötr), `ghost` (şeffaf, ikon barları), `danger` (kırmızı metin, sil işlemleri). Yeni bir buton türü **eklemeyin** — dört varyant tüm ihtiyaçları karşılıyor.

Metin girişleri:
```tsx
className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm text-text"
```

Sayısal/aralık girdileri `font-mono` alır (bkz. `ExtractPanel`'deki aralık kutusu).

### 0.3 Araç kaydı

`src/components/layout/ToolSidebar.tsx` içindeki `TOOLS` dizisine yeni giriş eklemek yeterli — `ToolId` tipi `src/store/uiStore.ts` içinde **zaten** tüm kalan araçları içeriyor: `"split" | "merge" | "watermark" | "pageNumbers" | "insert" | "convert"`. Yeni bir tip eklemenize gerek yok, sadece `TOOLS` dizisine satır ekleyin ve `lucide-react`'ten uygun bir ikon seçin (öneriler aşağıda her bölümde verildi).

---

## FAZ 3: Birleştir, Böl, Sayfa Ekle

### 3.1 Birleştir (Merge)

**Önemli tasarım kararı:** Birden çok PDF zaten `useAddFiles` ile açıldığında `model.pages` dizisinde art arda ekleniyor (`documentStore.addSources`). Yani "birleştirme" mekanik olarak zaten çalışıyor — **Kaydet** butonu tüm sayfaları tek PDF olarak yazıyor. Bu yüzden `MergePanel` yeni bir sayfa-manipülasyon mantığı **gerektirmez**; sadece süreci rehberli hale getirir. Yeni store metodu eklemeyin — mevcut `movePagesTo` yeter.

**Dosya:** `src/components/tools/MergePanel.tsx`

**Tasarım:**
```
┌─ Birleştirilecek belgeler ──────────────┐
│ [📄] rapor-1.pdf      6 sayfa    [↑][↓] │
│ [📄] rapor-2.pdf      3 sayfa    [↑][↓] │
│ [📄] ek.pdf           2 sayfa    [↑][↓] │
└──────────────────────────────────────────┘
[+ Daha fazla PDF ekle]

┌─ Toplam: 11 sayfa ──────────────────────┐
[Birleştir ve Farklı Kaydet]  (variant="primary", icon=Combine)
```

- Belge listesi `Object.values(model.sources)` üzerinden, her satırın sırası **o kaynağın ilk sayfasının `model.pages` içindeki konumuna** göre belirlenir:
  ```ts
  const sourceOrder = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const page of pages) {
      if (!seen.has(page.sourceId)) { seen.add(page.sourceId); order.push(page.sourceId); }
    }
    return order;
  }, [pages]);
  ```
- `↑`/`↓` düğmeleri, tıklanan kaynağa ait **tüm sayfaları** (`pages.filter(p => p.sourceId === id).map(p => p.id)`) komşu kaynak bloğunun başına/sonuna taşımak için `movePagesTo(ids, targetIndex)` çağırır. `targetIndex` hesaplaması: önceki/sonraki kaynağın ilk sayfasının `pages` içindeki indeksi.
- `+ Daha fazla PDF ekle` → `useOpenDialog()` (zaten var, `multiple=true`).
- `Birleştir ve Farklı Kaydet` → `useExportPages()(model.pages, "birlestirilmis.pdf")` — bkz. `useSaveAll` ile birebir aynı kalıp, sadece dosya adı sabit "birlestirilmis.pdf" veya ilk belgenin adından türetilebilir.
- **Kenar durumu:** Tek belge açıkken panel "Birleştirmek için en az 2 PDF açın" mesajı gösterir, buton `disabled`.
- **İkon:** `Combine` (lucide-react).

**Doğrulama:** 3 farklı test PDF'i aç (2+3+2 sayfa), sırayı `↓` ile değiştir, birleştir, çıktıyı tekrar aç → 7 sayfa ve beklenen sıra.

### 3.2 Böl (Split)

**Yeni dosya:** `src/core/ops/split.ts` — saf fonksiyonlar, store'a dokunmaz:

```ts
import type { PageRef } from "../model/types";
import { parsePageRange } from "./pageRange";

/** Her satır bir aralık: "1-5\n6-10\n11-12" -> gruplar */
export function splitByRanges(pages: PageRef[], rangesText: string): { name: string; pages: PageRef[] }[] {
  const lines = rangesText.split("\n").map((l) => l.trim()).filter(Boolean);
  return lines.map((line, i) => {
    const { indices } = parsePageRange(line, pages.length);
    return { name: `parca_${i + 1}`, pages: indices.map((idx) => pages[idx]).filter(Boolean) };
  }).filter((group) => group.pages.length > 0);
}

/** Her N sayfada bir yeni dosya */
export function splitEveryN(pages: PageRef[], n: number): { name: string; pages: PageRef[] }[] {
  const groups: { name: string; pages: PageRef[] }[] = [];
  for (let i = 0; i < pages.length; i += n) {
    groups.push({ name: `parca_${groups.length + 1}`, pages: pages.slice(i, i + n) });
  }
  return groups;
}

/** Her sayfa ayrı dosya */
export function splitEachPage(pages: PageRef[]): { name: string; pages: PageRef[] }[] {
  return pages.map((page, i) => ({ name: `sayfa_${i + 1}`, pages: [page] }));
}
```

**Yeni dosya:** `src/hooks/useSplit.ts` — gruplar → `buildPdf` → `platform.saveManyToDir`:

```ts
export function useSplitExport() {
  const model = useDocumentStore((s) => s.model);
  const setBusy = useUiStore((s) => s.setBusy);
  const notify = useUiStore((s) => s.notify);

  return useCallback(async (groups: { name: string; pages: PageRef[] }[], baseName: string) => {
    if (groups.length === 0) { notify("error", "Bölünecek sayfa bulunamadı."); return; }
    setBusy(`${groups.length} dosya hazırlanıyor…`);
    try {
      const files = await Promise.all(
        groups.map(async (g) => ({
          name: `${baseName.replace(/\.pdf$/i, "")}_${g.name}.pdf`,
          data: await buildPdf(model, g.pages),
        })),
      );
      const count = await platform.saveManyToDir(files);
      if (count > 0) notify("success", `${count} dosya kaydedildi.`);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  }, [model, setBusy, notify]);
}
```

**Dosya:** `src/components/tools/SplitPanel.tsx`

**Tasarım:**
```
┌─ Bölme yöntemi ──────────────────────────┐
○ Aralıklara göre     ○ Her N sayfada bir   ○ Her sayfa ayrı dosya
└────────────────────────────────────────────┘

[Aralıklara göre seçiliyse:]
┌ Her satıra bir aralık yazın ─────────────┐
│ 1-5                                       │
│ 6-10                                      │
│ 11-12                                     │
└────────────────────────────────────────────┘
→ 3 dosya oluşacak: parca_1 (5 sayfa), parca_2 (5 sayfa), parca_3 (2 sayfa)

[Her N sayfada bir seçiliyse:]
Sayfa sayısı: [  5  ▲▼]
→ 3 dosya oluşacak (5, 5, 2 sayfa)

[Her sayfa seçiliyse:]
→ 12 ayrı dosya oluşacak

[Böl ve Klasöre Kaydet]  (variant="primary", icon=SplitSquareHorizontal)
```

- Radyo grubu: `<button>` tabanlı segmented control, seçili olan `bg-accent-soft text-accent border-accent`, diğerleri `bg-surface border-border text-text-dim`.
- Önizleme metni (`→ N dosya oluşacak…`) canlı hesaplanır, `text-xs text-text-dim`.
- **Kenar durumu:** Aralık metni boşsa veya `parsePageRange` hata dönerse buton `disabled`, hata `text-danger` ile gösterilir (bkz. `ExtractPanel`'deki `parsed.errors` deseni).
- **Web platformunda** `saveManyToDir` her dosyayı ayrı ayrı indirir (zaten `web.ts`'te uygulandı) — kullanıcıya "Tarayıcıda her dosya ayrı indirilecek" notu göster (`platform.kind === "web"` kontrolü).
- **İkon:** `SplitSquareHorizontal`.

**Doğrulama:** 12 sayfalık test PDF'inde "her 5 sayfada bir" seç → 3 dosya (5,5,2), her birini aç ve sayfa sayısını doğrula. `vitest` ile `split.ts` için saf fonksiyon testleri yaz (bkz. `pageRange.test.ts` deseni).

### 3.3 Sayfa Ekle (Insert)

Üç alt-mod: boş sayfa, görselden, başka PDF'ten. Üçü de **aynı yolu** kullanır: yeni bayt üret → `addSources` ile mevcut belgeye ekle (pdfjs sayfa sayısını okur, `pagesFromSource` çağırır) → yeni eklenen sayfa kimliklerini bul → `movePagesTo` ile istenen konuma taşı. **Yeni bir store metodu eklemeyin** — `insertPages` metodu zaten `documentStore.ts`'te tanımlı ama onu kullanmak yerine bu akış tercih edilmeli çünkü `addSources` zaten pdfjs doğrulamasını (bozuk dosya, şifreli PDF) ücretsiz sağlıyor.

**Yeni dosya:** `src/core/ops/blankPage.ts`:

```ts
import { PDFDocument } from "pdf-lib";

export const PAGE_SIZES = {
  A4: [595.28, 841.89] as const,
  Letter: [612, 792] as const,
};

export async function createBlankPagePdf(size: keyof typeof PAGE_SIZES = "A4"): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage(PAGE_SIZES[size]);
  return doc.save();
}
```

**Yeni dosya:** `src/core/ops/imageToPdf.ts`:

```ts
import { PDFDocument } from "pdf-lib";

/** Her görseli, görsele sığacak boyutta tam sayfalı bir PDF sayfasına çevirir. */
export async function imagesToPdf(images: { bytes: Uint8Array; mime: string }[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const img of images) {
    const embedded = img.mime === "image/png" ? await doc.embedPng(img.bytes) : await doc.embedJpg(img.bytes);
    const page = doc.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
  }
  return doc.save();
}
```

**Yeni hook:** `src/hooks/useInsert.ts`:

```ts
export function useInsertAt() {
  const addSources = useDocumentStore((s) => s.addSources);
  const movePagesTo = useDocumentStore((s) => s.movePagesTo);

  return useCallback(async (bytes: Uint8Array, name: string, atIndex: number) => {
    const before = useDocumentStore.getState().model.pages.map((p) => p.id);
    await addSources([{ name, bytes }]);
    const after = useDocumentStore.getState().model.pages;
    const newIds = after.filter((p) => !before.includes(p.id)).map((p) => p.id);
    if (newIds.length > 0) movePagesTo(newIds, atIndex);
  }, [addSources, movePagesTo]);
}
```

**Dosya:** `src/components/tools/InsertPanel.tsx`

**Tasarım:**
```
┌─ Ekleme konumu ──────────────────────────┐
○ Başa   ○ Seçili sayfadan önce   ○ Seçili sayfadan sonra   ○ Sona
└────────────────────────────────────────────┘

┌─ Boş sayfa ──────────────────────────────┐
Boyut: [A4 ▾]                    [Boş sayfa ekle]
└────────────────────────────────────────────┘

┌─ Görselden ──────────────────────────────┐
                                  [Görsel seç…]
(seçilen görseller küçük resim listesi + sıralama)
                                  [Sayfa olarak ekle]
└────────────────────────────────────────────┘

┌─ Başka PDF'ten ──────────────────────────┐
                                  [PDF seç…]
└────────────────────────────────────────────┘
```

- Konum radyo grubu üstte ortak; `atIndex` hesaplaması:
  - Başa → `0`
  - Sona → `pages.length`
  - Seçiliden önce/sonra → `pages.indexOf(pages.find(p => selected.has(p.id)))` ± 0/1. Seçim yoksa bu iki seçenek `disabled`.
- **İkon:** `FilePlus`.

**Doğrulama:** Boş A4 sayfası "2. sayfadan sonra" ekle → yeni sayfa doğru konumda, boş ve doğru boyutta (595×842 pt) görünmeli. `core/ops/blankPage.ts` ve `imageToPdf.ts` için vitest ile sayfa sayısı/boyut testleri.

---

## FAZ 4: Görüntüleyici (Büyük Önizleme, Zoom, Arama)

**Mevcut altyapı:** `uiStore.previewPageId` ve `setPreviewPage` zaten var. `PageThumbnail`'deki çift tık zaten `onPreview` çağırıyor. `useKeyboard.ts`'teki Esc tuşu zaten `previewPageId` doluysa kapatıyor. Yani sadece **modal bileşenini yazıp `App.tsx`'e bağlamak** yeterli.

### 4.1 `uiStore.ts`'e eklenecekler

```ts
previewZoom: number;         // varsayılan 1
setPreviewZoom: (zoom: number) => void;
```
(`thumbnailSize` deseniyle birebir aynı şekilde eklenir.)

### 4.2 Yeni dosya: `src/components/viewer/PreviewModal.tsx`

**Tasarım (tam ekran overlay):**
```
┌──────────────────────────────────────────────────────┐
│ ✕                    3 / 12                  [-][100%][+]  🔍[____] │ ← üst çubuk, bg-surface/95 backdrop-blur
│                                                        │
│              ◀              [SAYFA]              ▶    │ ← ortalanmış canvas, siyah zemin (bg-black/90)
│                                                        │
└──────────────────────────────────────────────────────┘
```

- Kök: `fixed inset-0 z-40 bg-black/85 backdrop-blur-sm`, `onClick` (arka plana tıklama) kapatır — ama sayfa/kontrol alanına tıklama `stopPropagation`.
- Üst çubuk: `flex items-center justify-between border-b border-border bg-surface px-4 py-2`.
  - Sol: kapat düğmesi (`X` ikon, `variant="ghost"`).
  - Orta: `{index+1} / {total}` (`text-sm tabular-nums`), altında ok tuşlarıyla gezinme.
  - Sağ: zoom kontrolleri (`-`/`+` düğmeleri + yüzde metni) ve arama kutusu (bkz. 4.3).
- Sayfa render: `core/render/pdfjs.ts`'teki `renderPage(sourceId, bytes, pageIndex, targetWidth, rotation)` fonksiyonu, `targetWidth = 900 * previewZoom` ile çağrılır. Sonuç `ImageBitmap` bir `<canvas>`'a çizilir (aynı `PageThumbnail`'deki `drawImage` deseni, ama `IntersectionObserver` gerekmez — modal zaten görünür).
- Sol/sağ oklar: `◀`/`▶` (`ChevronLeft`/`ChevronRight`), `absolute` konumlu, `bg-black/40 hover:bg-black/60 text-white rounded-full`. Klavye ok tuşlarıyla da çalışmalı (bu bileşen içinde ayrı bir `keydown` dinleyici — global `useKeyboard`'a karıştırmayın, sadece modal açıkken aktif olmalı).
- Zoom: `50%` - `300%` aralığı, adım `25%`. `Ctrl+Scroll` ile de değişebilir (`onWheel`, `event.ctrlKey` kontrolü, `event.preventDefault()`).
- Kapatma: `X` düğmesi, arka plana tık, veya Esc (zaten global handler'da var).

**İkon:** Önizleme aracı ayrı bir sidebar girişi değil — mevcut ızgaradan tetiklenir, `ToolSidebar`'a eklenmez.

### 4.3 Metin Arama — `src/components/viewer/TextSearch.tsx`

**Yeni dosya:** `src/core/render/textCache.ts` — `thumbnailCache.ts` ile aynı desen, ama metin için:

```ts
const cache = new Map<string, string>(); // `${sourceId}:${pageIndex}` -> düz metin

export async function getPageText(sourceId: string, bytes: Uint8Array, pageIndex: number): Promise<string> {
  const key = `${sourceId}:${pageIndex}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const text = await extractPageText(sourceId, bytes, pageIndex); // core/render/pdfjs.ts'te zaten var
  cache.set(key, text);
  return text;
}
```

**Arama akışı:**
1. Kullanıcı arama kutusuna yazar (debounce 300ms).
2. Tüm sayfalar için `getPageText` çağrılır (paralel, `Promise.all`), sorguyla eşleşen sayfa indeksleri bulunur (case-insensitive `includes`).
3. Sonuçlar `{ pageIndex, matchCount }[]` olarak state'te tutulur (bileşen içi `useState`, global store'a **gerek yok**).
4. "◀ 3/8 ▶" şeklinde eşleşme sayacı, ok tuşlarıyla `previewPageId`'yi eşleşen bir sonraki sayfaya taşır.
5. Arama kutusu: `<input>` + sağında `Search` ikonu, `w-56 h-8 rounded-md border border-border bg-surface-2 px-2 text-sm`.

**Kenar durumu:** 300+ sayfalık belgede tüm sayfaları taramak birkaç saniye sürebilir — arama kutusunun yanında küçük bir spinner göster, sonuçlar geldikçe kademeli güncelle (opsiyonel optimizasyon, ilk sürümde atlanabilir).

**Doğrulama:** Test PDF'ine bilinen bir kelime içeren sayfa ekleyip arayın; doğru sayfaya atladığını ve sayaç doğruluğunu kontrol edin.

---

## FAZ 5: İçerik Araçları

### 5.1 Ön koşul: Türkçe font gömme

**Sorun:** pdf-lib'in `StandardFonts.Helvetica` gibi gömülü fontları WinAnsi kodlamalıdır ve `ş, ğ, ı, İ, ö, ü, ç` çizilmeye çalışıldığında **hata fırlatır**. Bu yüzden filigran/sayfa no/metin/imza özelliklerinden **önce** bu adım tamamlanmalı.

**Adımlar:**
1. **Font dosyasını indir:** [Noto Sans](https://fonts.google.com/noto/specimen/Noto+Sans) (OFL-1.1 lisansı, tam Türkçe karakter desteği) → `Regular` ağırlığını indir → `src/assets/fonts/NotoSans-Regular.ttf` olarak kaydet. (Alternatif: DejaVu Sans, Bitstream Vera lisansı.)
2. **Vite ile içe aktar:** Vite, `?url` sonekiyle statik dosyaları bir URL string'i olarak çözer; bu URL hem `pnpm dev`'de hem Tauri'nin bundle ettiği üretim derlemesinde çalışır.
   ```ts
   import notoSansUrl from "../../assets/fonts/NotoSans-Regular.ttf?url";
   ```
3. **Yeni dosya: `src/core/render/fonts.ts`:**
   ```ts
   import fontkit from "@pdf-lib/fontkit";
   import type { PDFDocument, PDFFont } from "pdf-lib";
   import notoSansUrl from "../../assets/fonts/NotoSans-Regular.ttf?url";

   let cachedBytes: ArrayBuffer | null = null;
   async function loadFontBytes(): Promise<ArrayBuffer> {
     if (!cachedBytes) cachedBytes = await fetch(notoSansUrl).then((r) => r.arrayBuffer());
     return cachedBytes;
   }

   /** Unicode font gömer. Yalnızca overlay'i olan belgelerde çağrılmalı — gereksiz maliyet eklememek için. */
   export async function embedUnicodeFont(doc: PDFDocument): Promise<PDFFont> {
     doc.registerFontkit(fontkit);
     const bytes = await loadFontBytes();
     return doc.embedFont(bytes, { subset: true });
   }
   ```
   `subset: true` önemli — yalnızca kullanılan karakterleri gömer, dosya boyutunu küçük tutar.

**Doğrulama:** `vitest` testi: bir PDF'e `embedUnicodeFont` ile `"Şğüöçİı TEST"` yazdır, kaydet, pdf-lib ile geri oku, hata fırlatmadığını doğrula.

### 5.2 `buildPdf.ts`'i overlay uygulayacak şekilde genişletme

**Bu, Faz 5'in mimari temelidir.** Şu anki `buildPdf.ts` yalnızca rotasyonu uyguluyor; `PageRef.overlays` alanı tanımlı ama kullanılmıyor. Aşağıdaki değişiklik `output.addPage(target)` satırından **önce** eklenmelidir:

```ts
// buildPdf.ts içine eklenecek — dosyanın başında:
import { embedUnicodeFont } from "../render/fonts";
import { rgb } from "pdf-lib";

// buildPdf fonksiyonu içinde, döngüden ÖNCE (bir kez):
const hasTextOverlay = pages.some((p) => p.overlays.some((o) => o.kind === "text"));
const font = hasTextOverlay ? await embedUnicodeFont(output) : null;
const embeddedImages = new Map<string, import("pdf-lib").PDFImage>(); // overlay.id -> embedded, tekrar eden imzalar için

// her sayfa için `output.addPage(target)`'den ÖNCE:
for (const overlay of page.overlays) {
  const { width, height } = target.getSize();
  if (overlay.kind === "text") {
    const [r, g, b] = hexToRgb01(overlay.color);
    target.drawText(overlay.text, {
      x: overlay.x * width,
      y: (1 - overlay.y) * height, // PDF koordinatı alttan başlar, UI'da y üstten
      size: overlay.size,
      font: font!,
      color: rgb(r, g, b),
      opacity: overlay.opacity,
      rotate: degrees(overlay.rotate),
    });
  } else {
    let img = embeddedImages.get(overlay.id);
    if (!img) {
      img = overlay.mime === "image/png"
        ? await output.embedPng(overlay.data)
        : await output.embedJpg(overlay.data);
      embeddedImages.set(overlay.id, img);
    }
    target.drawImage(img, {
      x: overlay.x * width,
      y: (1 - overlay.y) * height - overlay.height * height,
      width: overlay.width * width,
      height: overlay.height * height,
      opacity: overlay.opacity,
      rotate: degrees(overlay.rotate),
    });
  }
}
```

`hexToRgb01` yardımcı fonksiyonu (`#rrggbb` → `[0-1, 0-1, 0-1]`), `core/ops/color.ts` içine yazılmalı:
```ts
export function hexToRgb01(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
```

**Not:** `Overlay` tipindeki `x, y` sayfa genişliğine/yüksekliğine **oran** (0-1) olarak tanımlı — bu, rotasyon veya farklı sayfa boyutlarında (A4 vs Letter) overlay'in doğru konumda kalmasını sağlar. UI tarafında (aşağıdaki panellerde) kullanıcı bir önizleme üzerinde tıkladığında piksel koordinatı bu orana çevrilmelidir: `x = clickX / previewWidth`.

### 5.3 Filigran — `src/components/tools/WatermarkPanel.tsx`

**Tasarım:**
```
┌─ Metin ──────────────────────────────────┐
│ [ GİZLİ                                 ] │  ← input, font-mono değil, normal
└────────────────────────────────────────────┘

┌─ Görünüm ────────────────────────────────┐
Boyut: [——●———] 48pt      Renk: [🎨 #808080]
Saydamlık: [——●———] 30%   Açı: [——●———] 45°
└────────────────────────────────────────────┘

┌─ Uygulanacak sayfalar ───────────────────┐
│ [1-tümü metin kutusu, ExtractPanel'deki gibi] │
└────────────────────────────────────────────┘

[Filigranı Uygula]  (variant="primary", icon=Droplets)
```

- Varsayılan renk: `#808080` (gri) — endüstri standardı filigran rengi, saydamlıkla birleşince metnin okunabilirliğini bozmaz.
- Saydamlık slider'ı `opacity: 0-1`, varsayılan `0.3`.
- Açı slider'ı `-90` ile `90` derece arası, varsayılan `45` (klasik diyagonal filigran).
- Konumlandırma: **basit sürüm** — metin sayfa ortasına otomatik yerleştirilir (`x: 0.5 - (tahminiTextWidth/2)/pageWidth, y: 0.5`). Metin genişliği tahmini için `font.widthOfTextAtSize(text, size)` kullanılabilir ama bu, `embedUnicodeFont`'un önceden çağrılmasını gerektirir — panel önizlemesi için basit bir yaklaşık hesap yeterli (karakter sayısı × ortalama karakter genişliği).
- "Filigranı Uygula" butonu **her seçili sayfaya bir `Overlay{kind:"text"}` ekler** — bu, `buildPdf` çıktısına değil, **doğrudan `model.pages[i].overlays`'e** yazılır ve `documentStore`'da yeni bir eylem gerektirir:

**`documentStore.ts`'e eklenecek eylem:**
```ts
addOverlay: (pageIds: string[], overlay: Overlay) => void;

// implementasyon (withHistory deseniyle):
addOverlay: (pageIds, overlay) =>
  set((state) =>
    withHistory(state, (model) => {
      const target = new Set(pageIds);
      return {
        ...model,
        pages: model.pages.map((page) =>
          target.has(page.id) ? { ...page, overlays: [...page.overlays, { ...overlay, id: nextId("ov") }] } : page,
        ),
      };
    }),
  ),
```
Bu tek eylem, filigran/sayfa no/metin/imza'nın **hepsi** tarafından kullanılır — her biri farklı bir `Overlay` nesnesi üretip aynı eylemi çağırır. Ayrıca sayfa ızgarasında overlay'li sayfaları göstermek için `PageThumbnail`'in render çağrısına overlay bilgisini eklemek **gerekmez** (Faz 1-2'de bu karmaşıklığı eklemedik) — kullanıcı sonucu **önizleme modalinde** (Faz 4) veya kaydettikten sonra görür. İsterseniz ileride küçük resimde de overlay önizlemesi eklenebilir ama bu, kapsam dışı bırakılabilir bir "nice-to-have".

**İkon:** `Droplets`.

### 5.4 Sayfa Numarası — `src/components/tools/PageNumberPanel.tsx`

**Tasarım:**
```
┌─ Konum ──────────────────────────────────┐
  ⬉  ⬆  ⬈
  ⬅  ·  ➡     ← 3x3 ızgara, tıklanabilir 9 nokta, seçili nokta accent renkte
  ⬋  ⬇  ⬊
└────────────────────────────────────────────┘

┌─ Biçim ──────────────────────────────────┐
○ 1        ○ 1 / 20        ○ Sayfa 1
└────────────────────────────────────────────┘

Başlangıç: [ 1 ▲▼]     Boyut: [——●———] 11pt

┌─ Uygulanacak sayfalar ───────────────────┐
│ [aralık kutusu]                           │
└────────────────────────────────────────────┘

[Sayfa Numaralarını Ekle]  (variant="primary", icon=Hash)
```

- 9-nokta konum seçici: `grid grid-cols-3 gap-1 w-24`, her hücre `w-7 h-7 rounded border border-border`, seçili `bg-accent border-accent`. Konum, kenar boşluğu `36pt` (yaklaşık 0.5 inç) ile hesaplanır:
  ```ts
  const MARGIN = 36; // pt
  const POSITIONS: Record<string, (w: number, h: number) => { x: number; y: number }> = {
    "bottom-center": (w, h) => ({ x: 0.5, y: 1 - MARGIN / h }),
    "bottom-right": (w, h) => ({ x: 1 - MARGIN / w, y: 1 - MARGIN / h }),
    // ... 9 pozisyon
  };
  ```
  (Not: `Overlay.x/y` sol-üst köşeye göre oran; metin genişliği bilinmeden sağa/ortaya tam hizalama yaklaşık olacaktır — `font.widthOfTextAtSize` ile düzeltilebilir.)
- Format seçenekleri: `"{n}"`, `"{n} / {total}"`, `"Sayfa {n}"` — her sayfa için `label = format.replace("{n}", String(start + index)).replace("{total}", String(pages.length))`.
- **Uygulama:** Filigrandan farklı olarak her sayfaya **farklı metin** gittiği için `addOverlay` tek tek her sayfa için ayrı çağrılır (döngüde), ya da `documentStore`'a `addOverlayPerPage: (entries: {pageId: string, overlay: Overlay}[]) => void` şeklinde toplu bir varyant eklenebilir (performans için, tek `withHistory` çağrısı = tek undo adımı). **Öneri:** toplu varyantı ekleyin, aksi halde 100 sayfalık belgede 100 ayrı undo adımı oluşur — bu kötü bir kullanıcı deneyimi olur.

**İkon:** `Hash`.

### 5.5 Metin Ekleme — `src/components/tools/TextPanel.tsx`

**Etkileşim modeli:** "yerleştirme modu" — panel açıldığında sayfa ızgarası/önizleme "tıkla ve yerleştir" durumuna geçer.

**Akış:**
1. Panelde `[Metin Ekle]` düğmesine basılır → `uiStore`'a `placementMode: 'text' | 'signature' | 'image' | null` eklenir.
2. `placementMode !== null` iken `PreviewModal` (Faz 4) açık sayfa üzerinde imleç `crosshair` olur, tıklanan noktanın `(x/width, y/height)` oranı hesaplanır.
3. Tıklama sonrası küçük bir popover açılır (`absolute`, tıklanan noktanın yanında): metin girişi + boyut + renk + "Ekle"/"İptal".
4. "Ekle" → `addOverlay([currentPageId], { kind: 'text', x, y, text, size, color, opacity: 1, rotate: 0 })`.

**Not:** Bu akış **önizleme modalinin açık olmasını gerektirir** — ana ızgarada küçük resimler üzerinde hassas tıklama yapmak zordur (thumbnail çok küçük). Panel açıldığında otomatik olarak seçili sayfa için önizlemeyi açın (`setPreviewPage`).

**İkon:** `Type`.

### 5.6 İmza ve Görsel — `src/components/tools/SignaturePanel.tsx`

**Tasarım — iki sekme:**
```
[ Çiz ]  [ Yükle ]

── Çiz sekmesi ──
┌──────────────────────────────────────────┐
│                                            │  ← 400x150 beyaz canvas,
│         (parmak/mouse ile imza)           │     border border-border rounded-md
│                                            │
└──────────────────────────────────────────┘
Kalem rengi: [🎨 #000000]     [Temizle]

[Sayfaya Yerleştir]  (variant="primary", icon=PenTool)

── Yükle sekmesi ──
[Görsel Seç…]  (PNG/JPG, imza/kaşe görseli)
```

- Çizim: `<canvas width={400} height={150}>`, `pointerdown/pointermove/pointerup` ile `ctx.lineTo`, çizgi kalınlığı `2.5px`, `ctx.lineCap = "round"`.
- `Temizle`: `ctx.clearRect(0, 0, canvas.width, canvas.height)`.
- `Sayfaya Yerleştir`: canvas'ı `canvas.toBlob(blob => ..., 'image/png')` ile PNG'ye çevirir, `TextPanel`'deki gibi yerleştirme moduna girer (tıklanan yere `Overlay{kind:'image'}` eklenir). Varsayılan boyut oranı: genişlik sayfanın `%25`'i, en-boy oranı canvas'tan korunur.
- Yükle sekmesi: `platform.pickImageFiles(false)` çağrılır, seçilen görsel aynı yerleştirme moduna girer.
- Yerleştirildikten sonra **yeniden boyutlandırma:** Basit sürümde atlanabilir; istenirse önizleme modalinde overlay'in köşesine sürüklenebilir bir tutamaç eklenir (bu, kapsamı büyütür — ilk sürümde sabit boyutla yerleştirip kullanıcının "Sil ve tekrar ekle" yapması yeterli görülebilir).

**İkon:** `PenTool`.

### 5.7 Kırpma / A4 Normalize — `src/components/tools/CropPanel.tsx`

Bu, kapsamın en karmaşık parçasıdır ve **isteğe bağlı/son sıraya bırakılabilir**. Basit bir sürüm:

- "Tüm sayfaları A4'e sığdır" düğmesi — her sayfayı `pdf-lib`'in `embedPage` + yeni A4 sayfası üzerine ölçekleyerek çizme tekniğiyle normalize eder:
  ```ts
  const [targetW, targetH] = PAGE_SIZES.A4;
  const embedded = await output.embedPage(sourcePage);
  const scale = Math.min(targetW / embedded.width, targetH / embedded.height);
  const newPage = output.addPage([targetW, targetH]);
  newPage.drawPage(embedded, {
    x: (targetW - embedded.width * scale) / 2,
    y: (targetH - embedded.height * scale) / 2,
    xScale: scale, yScale: scale,
  });
  ```
- Bu, `buildPdf.ts`'e bir `normalizeToA4?: boolean` seçeneği olarak eklenebilir veya ayrı bir `core/ops/normalize.ts` fonksiyonu olarak model üzerinde çalışıp yeni bir model döndürebilir.
- Serbest kırpma (sürüklenebilir kırpma dikdörtgeni) **gelecek bir iyileştirme** olarak bırakılabilir; `page.setCropBox(x, y, width, height)` (pdf-lib) ile uygulanır.

**İkon:** `Crop`.

---

## FAZ 6: Dönüştürme Araçları

**Tek panel, üç sekme:** `src/components/tools/ConvertPanel.tsx` (üç ayrı dosya yerine tek panelde sekme kullanmak, `ToolSidebar`'da tek giriş = daha az gezinme karmaşıklığı).

### 6.0 Ön koşul: `renderPage`'i DPI-doğru render için genişletme

Mevcut `core/render/pdfjs.ts`'teki `renderPage(sourceId, bytes, pageIndex, targetWidth, rotation)` küçük resimler için "genişliğe sığdır" mantığıyla çalışıyor. Dışa aktarım için **tam DPI** gerekiyor (72 pt = 1 inç, yani `scale = dpi / 72`). Fonksiyonu kopyalamak yerine **tek fonksiyonu iki modu destekleyecek şekilde genişletin**:

```ts
export async function renderPage(
  sourceId: string,
  bytes: Uint8Array,
  pageIndex: number,
  sizing: { targetWidth: number } | { scale: number },
  rotation = 0,
): Promise<RenderedPage> {
  // ...
  const base = page.getViewport({ scale: 1, rotation: page.rotate + rotation });
  const scale = "scale" in sizing ? sizing.scale : sizing.targetWidth / base.width;
  // ... geri kalanı aynı
}
```
Mevcut çağrı yerleri (`thumbnailCache.ts`, `PreviewModal.tsx`) `{ targetWidth }` ile, yeni dışa aktarım kodu `{ scale: dpi / 72 }` ile çağırır.

### 6.1 PDF → Görsel

**Tasarım:**
```
[ PDF → Görsel ]  [ Görsel → PDF ]  [ Metni Çıkar ]   ← sekmeler

DPI: [——●———] 150        Format: ○ PNG  ○ JPEG
[JPEG seçiliyse: Kalite: [——●———] 85%]

┌─ Sayfalar ───────────────────────────────┐
│ [aralık kutusu]                           │
└────────────────────────────────────────────┘

[Görsellere Dönüştür]  (variant="primary", icon=ImageDown)
```

- DPI aralığı `72-300`, varsayılan `150` (ekran için yeterli, dosya boyutu makul).
- Her seçili sayfa için: `renderPage(sourceId, bytes, pageIndex, { scale: dpi / 72 }, rotation)` → `ImageBitmap` → `OffscreenCanvas.convertToBlob({ type, quality })` → `Uint8Array`.
- Dosya adlandırma: `{base}_sayfa_{n}.png`.
- `platform.saveManyToDir(files)` ile klasöre yazılır.

### 6.2 Görsel → PDF

- `platform.pickImageFiles(true)` ile çoklu görsel seçilir.
- Seçilen görseller küçük bir sıralanabilir liste olarak gösterilir (basit sürümde seçim sırası yeterli, drag-reorder isteğe bağlı iyileştirme).
- `imagesToPdf(images)` (Faz 3.3'te tanımlandı) çağrılır → `platform.saveBytes(bytes, "gorsellerden.pdf")`.
- **Not:** Bu özellik Faz 3.3'teki "Sayfa Ekle → Görselden" ile kod paylaşır (`imageToPdf.ts`) — burada fark, sonucun **mevcut belgeye eklenmesi değil, bağımsız yeni bir PDF olarak kaydedilmesidir**.

### 6.3 Metin Çıkarma

- Seçili sayfalar için `extractPageText(sourceId, bytes, pageIndex)` (zaten `core/render/pdfjs.ts`'te var) çağrılır, sonuçlar `"--- Sayfa {n} ---\n{metin}\n\n"` şablonuyla birleştirilir.
- `platform.saveBytes(new TextEncoder().encode(text), "{base}_metin.txt", { name: "Metin Dosyası", extensions: ["txt"] })`.
- **Not:** `platform.saveBytes` imzası zaten opsiyonel `filter` parametresi alıyor — `PDF_FILTER` varsayılanı yerine özel bir filtre geçirmek yeterli, platform katmanında değişiklik gerekmez.

**İkon:** `ConvertPanel` girişi için `FileImage`.

---

## FAZ 7: Cila ve Dağıtım

### 7.1 Ek klavye kısayolları

`useKeyboard.ts`'e eklenecekler (mevcut yapıya aynı `switch` bloğuna satır eklenir):
- Önizleme açıkken: `+`/`-` zoom, `←`/`→` sayfa gezinme (bu, `PreviewModal` bileşeninin **kendi** `keydown` dinleyicisinde olmalı, global handler'da değil — çünkü yalnızca modal açıkken anlamlı).
- `Ctrl+F`: arama kutusuna odaklan (yalnızca önizleme açıkken).
- `Ctrl+E`: aktif aracı `extract` yap (`setActiveTool('extract')`) — hızlı erişim.

### 7.2 Son açılan dosyalar

**Yeni store:** `src/store/recentFilesStore.ts`:
```ts
interface RecentFile { path: string; name: string; openedAt: number }
// localStorage key: "pdf-editor-recent", en fazla 10 kayıt, path yalnızca Tauri'de dolu.
```
- Her başarılı `addSources` çağrısından sonra (Tauri'de, `path` doluysa) bu listeye eklenir — `useAddFiles` hook'una bir satır eklenir.
- `DocumentPanel.tsx`'te, hiç belge açık değilken (`sources.length === 0` dalı) "Son Açılanlar" listesi gösterilir, tıklanınca `platform` üzerinden path okunup `addSources` çağrılır. **Web platformunda** bu bölüm hiç gösterilmez (`path` yok).

### 7.3 Şifreli/bozuk PDF hata yönetimi — doğrulama

Bu zaten büyük ölçüde uygulanmış durumda: `core/render/pdfjs.ts`'teki `PasswordProtectedError` ve `documentStore.addSources`'taki `try/catch` → `errors` dizisi → `useAddFiles`'ta `notify("error", ...)`. Faz 7'de yapılacak tek şey **uçtan uca doğrulama**: parola korumalı bir PDF ile test edip Türkçe hata mesajının (`"Bu PDF parola korumalı ve açılamıyor."`) toast olarak göründüğünü doğrulamak. Kod değişikliği gerekmiyor.

### 7.4 Dosya ilişkilendirme ve tekli örnek

`src-tauri/tauri.conf.json`'da `fileAssociations` zaten tanımlı, `startup_files` Rust komutu zaten var ve `useFileDropAndStartup` bunu çağırıyor. **Eksik olan:** uygulama zaten açıkken bir PDF'e çift tıklanırsa, **yeni bir örnek** açılır (varsayılan Tauri davranışı) — mevcut pencereye dosyayı göndermek için `tauri-plugin-single-instance` eklenmeli:

```bash
pnpm tauri add single-instance
```
```rust
// lib.rs — Builder zincirine EN BAŞA eklenir (diğer pluginlerden önce):
.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
    // args[1..] içindeki .pdf yollarını filtrele, frontend'e event olarak gönder
    let paths: Vec<String> = args.into_iter().skip(1)
        .filter(|a| a.to_lowercase().ends_with(".pdf"))
        .collect();
    if !paths.is_empty() {
        let _ = app.emit("open-files", paths);
    }
    // mevcut pencereyi öne getir
    if let Some(w) = app.get_webview_window("main") { let _ = w.set_focus(); }
}))
```
Frontend'de `useFileDropAndStartup` içine bir `listen("open-files", ...)` dinleyicisi eklenir (Tauri event API, `@tauri-apps/api/event`).

### 7.5 `vitest` kapsamının tamamlanması

Faz 3-6'da yazılan her saf fonksiyon (`split.ts`, `blankPage.ts`, `imageToPdf.ts`, `color.ts`, overlay uygulayan `buildPdf.ts` genişletmesi) için `pageRange.test.ts` ve `buildPdf.test.ts` desenini izleyen testler yazılmalı: gerçek `pdf-lib` ile üretip geri okuyarak sayfa sayısı/boyut/döndürme/metin varlığını doğrulayan testler — mock'lama yok, gerçek PDF baytları üzerinde çalışan testler (mevcut testlerin izlediği yaklaşım).

### 7.6 `tauri build` ile MSI üretimi

```bash
pnpm tauri build
```
- Çıktı: `src-tauri/target/release/bundle/msi/PDF Editör_0.1.0_x64_en-US.msi` (ve/veya `nsis/` altında `.exe` kurulum dosyası — `tauri.conf.json`'daki `bundle.targets: "all"` her ikisini de üretir).
- İlk derleme birkaç dakika sürer (release modu, optimizasyonlar açık). İkon dosyaları zaten `src-tauri/icons/` altında mevcut (proje iskeletiyle geldi) — özel bir logo isteniyorsa `pnpm tauri icon <path-to-1024px-png>` ile yeniden üretilebilir.
- **Doğrulama:** MSI'ı kur, uygulamayı başlat, bir `.pdf` dosyasına sağ tıklayıp "Birlikte Aç → PDF Editör" seçeneğinin listede olduğunu doğrula (dosya ilişkilendirmesi), dosyaya çift tıklayıp uygulamanın açıldığını doğrula.
- İmzasız MSI'da Windows SmartScreen uyarısı çıkar — bu beklenen bir durumdur, kod imzalama sertifikası (yıllık ücretli) olmadan kaçınılmaz; kişisel/iç kullanım için sorun teşkil etmez.

---

## Uygulama Sırası Önerisi

Fazlar birbirine bağımlı değildir (her biri farklı bir araç panelidir), ancak şu sıra en az sürtünmeyi sağlar:

1. **Faz 3.2 (Böl)** — en bağımsız, mevcut `buildPdf`'i hiç değiştirmeden yazılabilir.
2. **Faz 3.1 (Birleştir)** — yeni mantık gerektirmez, en hızlı kazanım.
3. **Faz 3.3 (Sayfa Ekle)** — `addSources` + `movePagesTo` yeniden kullanımı, orta karmaşıklık.
4. **Faz 4 (Görüntüleyici)** — Faz 5'in "tıkla-yerleştir" akışlarının **ön koşuludur**, bu yüzden Faz 5'ten önce bitirilmeli.
5. **Faz 5.1-5.2 (font + `buildPdf` genişletmesi)** — mimari temel, dikkatle test edilmeli (Türkçe karakterler!).
6. **Faz 5.3-5.7 (filigran, sayfa no, metin, imza, kırpma)** — hepsi aynı `addOverlay` eylemini kullanır, sırayla eklenebilir.
7. **Faz 6 (Dönüştürme)** — `renderPage` genişletmesi dışında bağımsız.
8. **Faz 7 (Cila)** — en son, çünkü diğer her şeyin üzerine ince ayar yapar.

Her adımdan sonra `pnpm vitest run` ve `pnpm exec tsc --noEmit` çalıştırılmalı; UI değişiklikleri için `pnpm tauri dev` ile gerçek pencerede elle test edilmelidir (bu belgeyi yazan oturumda native pencereye otomasyon erişimi olmadığından, görsel doğrulama geliştiriciye/kullanıcıya aittir).
