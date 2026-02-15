import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: './',
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/@imgly/background-removal-data/dist/*',
          dest: 'imgly'
        }
      ]
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
              return "vendor";
            }
            if (id.includes("@radix-ui") || id.includes("lucide-react") || id.includes("class-variance-authority") || id.includes("clsx") || id.includes("tailwind-merge")) {
              return "ui";
            }
            if (id.includes("@supabase")) {
              return "supabase";
            }
            if (id.includes("fabric")) {
              return "fabric";
            }
            if (id.includes("@tanstack") || id.includes("recharts") || id.includes("zod") || id.includes("react-hook-form") || id.includes("date-fns")) {
              return "utils";
            }
            if (id.includes("openai") || id.includes("@huggingface")) {
              return "ai";
            }
            if (id.includes("jszip") || id.includes("file-saver") || id.includes("react-easy-crop")) {
              return "media";
            }
            if (id.includes("@capacitor")) {
              return "capacitor";
            }
            // Group other remaining large dependencies if needed
          }
        },
      },
    },
  },
  define: {
    'process.env': {},
    'global': 'window',
  },
}));
