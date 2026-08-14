import { webPlatform } from "./web";
import type { Platform } from "./types";

/** Bütün dosya işlemleri kullanıcının tarayıcısında kalır. */
export const platform: Platform = webPlatform;

export * from "./types";
