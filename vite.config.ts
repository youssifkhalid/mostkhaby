import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
    headers: {
      "Service-Worker-Allowed": "/",
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    target: "esnext",
    rollupOptions: {
      input: {
        main: "index.html",
        sw: "public/service-worker.ts",
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "sw") {
            return "[name].js";
          }
          return "assets/[name]-[hash].js";
        },
      },
    },
  },
});
