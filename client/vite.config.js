import { defineConfig } from "vite";

// 小工具：同时给 dev/preview 都加同一组 rewrite 规则
function spaRewrites(html = "care.html") {
  return {
    rewrites: [
      { from: /^\/$/, to: `/${html}` },
      { from: /^\/care(?:\/.*)?$/, to: "/care.html" },
      { from: /^\/tv(?:\/.*)?$/, to: "/tv.html" },
    ],
  };
}

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // 你的 LiveKit token 后端
      "/tele": "http://localhost:8300",
      // 若后面还有别的后端网关，可一起代理：
      "/api": "http://localhost:8300",
    },
    historyApiFallback: spaRewrites("care.html"),
  },
  preview: {
    port: 5174,
    historyApiFallback: spaRewrites("care.html"),
  },
  build: {
    rollupOptions: {
      // 多入口：care.html / tv.html
      input: {
        care: "care.html",
        tv: "tv.html",
      },
    },
  },
});
