// client/vite.config.js
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // 后端端口统一：
  // tv-svc     : 8200  —— 提供 /api/**（设备、推荐等）
  // tele-assist: 8300  —— 提供 /tele/**（LiveKit token）
  // assistant  : 8400  —— 只管 /ws 以及少量 HTTP（/whoami /health/ready 等）
  const TV_ORIGIN  = env.VITE_TV_ORIGIN  || 'http://localhost:8200';
  const TA_ORIGIN  = env.VITE_TA_ORIGIN  || 'http://localhost:8300';
  const AS_ORIGIN  = env.VITE_AS_ORIGIN  || 'http://localhost:8400';
  const WS_KEY     = env.VITE_WS_KEY || ''; // 可为空

  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        // 业务 REST —— 走 tv-svc
        '/api': {
          target: TV_ORIGIN,
          changeOrigin: true,
        },
        // Tele-assist（LiveKit token）—— 走 tele-assist-svc
        '/tele': {
          target: TA_ORIGIN,
          changeOrigin: true,
        },
        // WebSocket —— 走 assistant-svc
        '/ws': {
          target: AS_ORIGIN.replace('http', 'ws'),
          ws: true,
          changeOrigin: true,
          // 给后端一并转发 header（后端也接受 URL 上的 ?key=dev，这里双保险）
          headers: WS_KEY ? { 'x-api-key': WS_KEY } : {},
        },
      },
    },
  };
});
