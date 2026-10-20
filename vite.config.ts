import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, isPreview, mode }) => ({
  base:
    command === "serve" && !isPreview ? "/" : "/AI-Invoice-Processing-Engine/",
  plugins: [react()],
  // Pages always ships the autonomous demo, even if a local .env enables a backend.
  define:
    mode === "pages"
      ? {
          "import.meta.env.VITE_API_MODE": JSON.stringify("demo"),
          "import.meta.env.VITE_API_BASE_URL": JSON.stringify("/api"),
        }
      : undefined,
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
}));
