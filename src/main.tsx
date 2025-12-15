import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.tsx'

// 브라우저 확장 프로그램 및 WebSocket 관련 콘솔 에러 필터링
const originalError = console.error
console.error = (...args: any[]) => {
  const errorMessage = args[0]?.toString() || ''
  const fullMessage = args.map(arg => String(arg)).join(' ')
  // 확장 프로그램 및 WebSocket 관련 에러는 무시
  if (
    errorMessage.includes('message port closed') ||
    errorMessage.includes('content.js') ||
    errorMessage.includes('Extension context invalidated') ||
    errorMessage.includes('message channel closed') ||
    errorMessage.includes('asynchronous response') ||
    errorMessage.includes('A listener indicated an asynchronous response') ||
    errorMessage.includes('message channel closed before a response') ||
    fullMessage.includes('message channel closed before a response') ||
    fullMessage.includes('asynchronous response by returning true') ||
    errorMessage.includes('WebSocket') ||
    errorMessage.includes('ws://localhost') ||
    errorMessage.includes('Failed to load resource')
  ) {
    return
  }
  originalError.apply(console, args)
}

// Promise rejection 에러도 필터링
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = event.reason?.toString() || ''
  const errorStack = event.reason?.stack?.toString() || ''
  const fullError = errorMessage + ' ' + errorStack
  if (
    errorMessage.includes('message port closed') ||
    errorMessage.includes('content.js') ||
    errorMessage.includes('Extension context invalidated') ||
    errorMessage.includes('message channel closed') ||
    errorMessage.includes('asynchronous response') ||
    errorMessage.includes('A listener indicated an asynchronous response') ||
    errorMessage.includes('message channel closed before a response') ||
    fullError.includes('message channel closed before a response') ||
    fullError.includes('asynchronous response by returning true') ||
    errorMessage.includes('WebSocket') ||
    errorMessage.includes('ws://localhost')
  ) {
    event.preventDefault()
  }
})

// WebSocket 연결 오류 필터링 (Vite HMR 관련)
window.addEventListener('error', (event) => {
  const errorMessage = event.message?.toString() || ''
  if (
    errorMessage.includes('WebSocket') ||
    errorMessage.includes('ws://localhost') ||
    (event.target && (event.target as HTMLElement).tagName === 'SCRIPT' && errorMessage.includes('Failed to load'))
  ) {
    event.preventDefault()
    return false
  }
}, true)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

