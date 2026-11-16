import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Em dev o Vite (5173) repassa /api e /img para o Fastify (3001)
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { exclude: ["maplibre-gl"] },
  server: { port: 5173, proxy: { "/api": "http://localhost:3001", "/img": "http://localhost:3001", "/mapas": "http://localhost:3001" } },
});
