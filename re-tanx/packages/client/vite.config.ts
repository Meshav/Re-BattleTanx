import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    fs: { allow: ["../.."] },
    proxy: { "/ws": { target: "ws://localhost:8787", ws: true }, "/auth": "http://localhost:8787", "/leaderboard": "http://localhost:8787", "/history": "http://localhost:8787" },
  },
  build: { target: "es2022", chunkSizeWarningLimit: 900 },
});
