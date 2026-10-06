import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: "0.0.0.0", port: 5173, allowedHosts: true },
  plugins: [react()],
  resolve: {
    alias: {
      "@convex": path.resolve(import.meta.dirname, "./convex"),
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: { chunkSizeWarningLimit: 1000 },
});
