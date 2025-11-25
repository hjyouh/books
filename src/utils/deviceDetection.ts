/**
 * 디바이스 감지 유틸리티
 */

export const isMobileDevice = (): boolean => {
  // User Agent 체크
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
  const isMobileUA = mobileRegex.test(userAgent)
  
  // 화면 너비 체크 (768px 이하)
  const isMobileWidth = window.innerWidth <= 768
  
  return isMobileUA || isMobileWidth
}

/**
 * 실제 모바일 기기인지 확인 (웹 브라우저에서 시뮬레이션하는 것이 아닌)
 */
export const isActualMobileDevice = (): boolean => {
  // User Agent 체크
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
  
  // 실제 모바일 기기인 경우만 true 반환
  // 웹 브라우저의 개발자 도구에서 모바일 시뮬레이션하는 경우는 false
  if (!mobileRegex.test(userAgent)) {
    return false
  }
  
  // 터치 지원 여부와 포인터 타입으로 실제 모바일 기기 판단
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches
  
  return hasTouchScreen && isCoarsePointer
}

export const getDeviceType = (): 'mobile' | 'web' => {
  return isMobileDevice() ? 'mobile' : 'web'
}

