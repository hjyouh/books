import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    open: false,
    hmr: {
      overlay: false,
      clientPort: 5173,
      protocol: 'ws',  // WebSocket 연결 실패 시 자동 재연결 시도 (기본값: true)
    },
    watch: {
      usePolling: false,
      // 파일 변경 감지 지연 시간 증가 (너무 빠른 새로고침 방지)
      interval: 1000,
    },
  },
  // WebSocket 연결 오류를 콘솔에 표시하지 않도록 설정
  logLevel: 'warn',
  // 빌드 최적화 설정
  build: {
    // 소스맵 생성 비활성화 (개발 중 불필요한 새로고침 방지)
    sourcemap: false,
  },
})

