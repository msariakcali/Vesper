/** Tarayıcıdaki dosya seçme ve indirme işlemlerinin ortak arayüzü. */

export interface PickedFile {
  name: string;
  bytes: Uint8Array;
}

export interface OutputFile {
  name: string;
  data: Uint8Array;
}

export interface Platform {
  readonly kind: "web";

  /** PDF seçtirir. Kullanıcı iptal ederse boş dizi döner. */
  pickPdfFiles(multiple?: boolean): Promise<PickedFile[]>;

  /** Görsel seçtirir (sayfa ekleme, filigran, imza için). */
  pickImageFiles(multiple?: boolean): Promise<PickedFile[]>;

  /** Üretilen dosyayı tarayıcının indirme akışına gönderir. */
  saveBytes(
    data: Uint8Array,
    suggestedName: string,
    filter?: { name: string; extensions: string[] },
  ): Promise<string | null>;

  /** Çok sayıda çıktıyı tarayıcıda sırayla indirir. */
  saveManyToDir(files: OutputFile[]): Promise<number>;

  /** Sayfaya bırakılan dosyaları dinler. Aboneliği iptal eden fonksiyon döner. */
  onFileDrop(handler: (files: PickedFile[]) => void): Promise<() => void>;
}

export const PDF_FILTER = { name: "PDF Belgesi", extensions: ["pdf"] };
export const IMAGE_FILTER = {
  name: "Görsel",
  extensions: ["png", "jpg", "jpeg"],
};
