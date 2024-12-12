import { defineConfig } from "vite";

export default defineConfig({
  build: {
    sourcemap: true,
    target: "esnext"
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext"
    },
  },
});
