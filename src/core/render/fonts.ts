import fontkit from "@pdf-lib/fontkit";
import type { PDFDocument, PDFFont } from "pdf-lib";
import notoSansUrl from "../../assets/fonts/NotoSans-Regular.ttf?url";

let cachedBytes: ArrayBuffer | null = null;

async function loadFontBytes(): Promise<ArrayBuffer> {
  if (!cachedBytes) {
    // Vitest tarayıcı sunucusu çalıştırmadığı için ?url yolu fetch edilemez;
    // aynı gerçek font dosyasını doğrudan diskten okuyarak uçtan uca PDF
    // testlerinin mock kullanmadan çalışmasını sağlıyoruz.
    if (import.meta.env.MODE === "test") {
      const { readFile } = await import("node:fs/promises");
      const bytes = await readFile(new URL("../../assets/fonts/NotoSans-Regular.ttf", import.meta.url));
      cachedBytes = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      return cachedBytes;
    }
    const response = await fetch(notoSansUrl);
    if (!response.ok) throw new Error("Türkçe yazı tipi yüklenemedi.");
    cachedBytes = await response.arrayBuffer();
  }
  return cachedBytes;
}

/** Yalnızca kullanılan glifleri içeren Unicode Noto Sans fontunu gömer. */
export async function embedUnicodeFont(doc: PDFDocument): Promise<PDFFont> {
  doc.registerFontkit(fontkit);
  return doc.embedFont(await loadFontBytes(), { subset: true });
}
