import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "/",
  plugins: [
    react({
      // Babel optimizations: remove console.log in prod, fast refresh
      babel: {
        plugins: process.env.NODE_ENV === "production"
          ? [["transform-remove-console", { exclude: ["error", "warn"] }]]
          : [],
      },
    }),
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
        manualChunks: {
          // Core framework
          "vendor-react": ["react", "react-dom"],
          // Routing + state
          "vendor-query": ["@tanstack/react-query", "wouter"],
          // Supabase (large dep)
          "vendor-supabase": ["@supabase/supabase-js"],
          // UI components
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-select",
            "@radix-ui/react-toast",
          ],
          // Charts/extras (lazy)
          "vendor-charts": ["recharts"],
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
