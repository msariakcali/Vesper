import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],

  // pdf.js worker'ı ve pdf-lib'i optimize edilmiş bağımlılıklar arasında tut,
  // aksi halde dev sırasında her sayfa yenilemesinde yeniden paketlenirler.
  optimizeDeps: {
    include: ["pdfjs-dist", "pdf-lib"],
  },

  worker: {
    format: "es",
  },
  server: {
    port: 5173,
  },
}));
