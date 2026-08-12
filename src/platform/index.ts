import { tauriPlatform } from "./tauri";
import { webPlatform } from "./web";
import type { Platform } from "./types";

/** Tauri WebView'ı kendini `__TAURI_INTERNALS__` ile belli eder. */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export const platform: Platform = isTauri() ? tauriPlatform : webPlatform;

export * from "./types";
