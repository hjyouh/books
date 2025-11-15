import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 모든 네트워크 인터페이스에서 접속 가능
    port: 5173,
    strictPort: false, // 포트가 사용 중이면 다른 포트 사용
    open: false, // 자동으로 브라우저 열지 않음
    hmr: {
      overlay: false, // 에러 오버레이 비활성화
      protocol: 'ws',
      host: 'localhost',
    },
    watch: {
      usePolling: false,
    },
  },
})

