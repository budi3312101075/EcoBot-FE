import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Backend EcoBot (endpoint /api/chat) berada di origin yang sama pada HTML sumber.
// Saat dev, request diteruskan ke VITE_API_TARGET.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_API_TARGET || "http://localhost:3000";
  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": { target, changeOrigin: true },
        "/aqr-img": { target, changeOrigin: true },
      },
    },
  };
});
