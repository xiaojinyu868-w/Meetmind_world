import { defineConfig } from "vite";


export default defineConfig(({ command }) => ({
  base: command === "build" ? "/echoworld/" : "/",
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
}));
