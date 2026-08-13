import { webPlatform } from "./web";
import type { Platform } from "./types";

/** Forma'nın web sürümü: bütün dosya işlemleri kullanıcının tarayıcısında kalır. */
export const platform: Platform = webPlatform;

export * from "./types";
