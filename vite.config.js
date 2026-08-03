import { defineConfig } from "vite";


const apiTarget = process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8000";


export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: apiTarget,
        changeOrigin: true,
      },
    },
  },
});
