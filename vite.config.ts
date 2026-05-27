// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    client: {
      // Ajustado para o subdiretório do GitHub Pages — usar mesma base que Vite
      base: "/rhof/",
    },
    ssr: false,
    spa: {
      enabled: true,
      prerender: {
        outputPath: "/index",
      },
    },
  },
  vite: {
    // Ajustado para o subdiretório do GitHub Pages
    base: "/rhof/", 
    environments: {
      client: {
        build: {
          outDir: "dist",
          rollupOptions: {
            output: {
              manualChunks(id) {
                if (!id.includes("node_modules")) {
                  return;
                }

                if (id.includes("xlsx")) return "xlsx";
                if (id.includes("jspdf")) return "jspdf";
                if (id.includes("firebase")) return "firebase";
                if (id.includes("recharts")) return "recharts";
                if (id.includes("@floating-ui")) return "floating-ui";

                if (id.includes("@tanstack")) return "tanstack";
                if (id.includes("@radix-ui")) return "radix";
                if (id.includes("react-dom")) return "react-dom";
                if (id.includes("react-router") || id.includes("react/jsx-runtime") || id.endsWith("/react")) return "react";
                if (id.includes("lucide-react")) return "icons";
                if (id.includes("react-hook-form") || id.includes("cmdk") || id.includes("sonner") || id.includes("vaul") || id.includes("react-day-picker") || id.includes("react-resizable-panels") || id.includes("embla-carousel-react") || id.includes("input-otp")) {
                  return "ui-kit";
                }
                if (id.includes("date-fns") || id.includes("zod") || id.includes("clsx") || id.includes("class-variance-authority") || id.includes("tailwind-merge")) {
                  return "utils";
                }

                return "vendor";
              },
            },
          },
        },
      },
    },
  },
});
