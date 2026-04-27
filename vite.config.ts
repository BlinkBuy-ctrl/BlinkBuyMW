import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(__dirname, "."),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    // ── Code splitting for optimal chunking ──────────────────────────────
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
            if (id.includes("@tanstack") || id.includes("wouter")) return "vendor-query";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("recharts")) return "vendor-charts";
            if (id.includes("@radix-ui")) return "vendor-radix";
          }
        },
      },
    },
    // Compress assets
    minify: "esbuild",
    sourcemap: false,
    // Raise chunk warning limit (we're intentionally splitting)
    chunkSizeWarningLimit: 500,
  },
  // Enable optimized dependency pre-bundling
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "wouter",
      "@tanstack/react-query",
      "@supabase/supabase-js",
      "lucide-react",
    ],
  },
});
