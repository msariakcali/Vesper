/**
 * Platform katmanı: dosya sistemi işlemleri tek bir arayüzün arkasında.
 *
 * Tauri varsa native diyaloglar ve gerçek disk erişimi kullanılır; yoksa
 * tarayıcı fallback'i (input[type=file] + Blob indirme) devreye girer.
 * Bu sayede `pnpm dev` ile Rust derlemesi beklemeden geliştirme yapılabilir.
 */

export interface PickedFile {
  name: string;
  /** Yalnızca masaüstünde dolu — tarayıcıda dosya yolu erişilebilir değil. */
  path?: string;
  bytes: Uint8Array;
}

export interface OutputFile {
  name: string;
  data: Uint8Array;
}

export interface LibraryFile {
  name: string;
  path: string;
  size: number;
  modifiedAt: number;
}

export interface Platform {
  readonly kind: "tauri" | "web";

  /** PDF seçtirir. Kullanıcı iptal ederse boş dizi döner. */
  pickPdfFiles(multiple?: boolean): Promise<PickedFile[]>;

  /** Görsel seçtirir (sayfa ekleme, filigran, imza için). */
  pickImageFiles(multiple?: boolean): Promise<PickedFile[]>;

  /** Masaüstünde sabit kütüphaneye, web'de indirme klasörüne tek dosya yazar. */
  saveBytes(
    data: Uint8Array,
    suggestedName: string,
    filter?: { name: string; extensions: string[] },
  ): Promise<string | null>;

  /** Çok sayıda çıktıyı masaüstünde sabit kütüphaneye yazar. */
  saveManyToDir(files: OutputFile[]): Promise<number>;

  /** OS'ten pencereye bırakılan dosyaları dinler. Aboneliği iptal eden fonksiyon döner. */
  onFileDrop(handler: (files: PickedFile[]) => void): Promise<() => void>;

  /** Uygulama bir PDF'e çift tıklanarak açıldıysa o dosyaları döner. */
  getStartupFiles(): Promise<PickedFile[]>;

  /** Daha önce kaydedilmiş tam yolları yeniden okur (yalnızca masaüstü). */
  readFilesByPaths(paths: string[]): Promise<PickedFile[]>;

  /** İkinci uygulama örneğinden yönlendirilen PDF yollarını dinler. */
  onOpenFiles(handler: (files: PickedFile[]) => void): Promise<() => void>;

  /** Sabit belge kütüphanesinin yolu ve içeriği. */
  getLibraryDir(): Promise<string | null>;
  listLibraryFiles(): Promise<LibraryFile[]>;
  deleteLibraryFile(name: string): Promise<void>;
  openLibraryDir(): Promise<void>;
}

export const PDF_FILTER = { name: "PDF Belgesi", extensions: ["pdf"] };
export const IMAGE_FILTER = {
  name: "Görsel",
  extensions: ["png", "jpg", "jpeg"],
};
