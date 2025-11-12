/**
 * 파스텔 톤 색상 팔레트
 * 언제든지 import해서 사용할 수 있는 색상 상수
 * 
 * 사용 예시:
 * ```ts
 * import { pastelColors, categoryColors, statCardColors } from '../utils/pastelColors'
 * 
 * // 개별 색상 사용
 * const color = pastelColors.lightBlue
 * 
 * // 카테고리별 색상 사용
 * const reviewColor = categoryColors.review
 * 
 * // 통계 카드 색상 사용
 * <div style={{ backgroundColor: statCardColors[0] }}>...</div>
 * ```
 */

export const pastelColors = {
  // 핑크 계열
  lightPink: '#ffafb0',
  pinkLavender: '#ffafd8',
  lightPink2: '#FFCCCC',
  
  // 오렌지/피치 계열
  lightOrange: '#eeb764',
  lightPeach: '#f2cfa5',
  lightPeach2: '#ffe4af',
  lightOrange2: '#FFCC99',
  lightOrange3: '#FFD980',
  
  // 옐로우 계열
  lightYellow: '#fcffb0',
  lightYellow2: '#fdfa87',
  lightYellow3: '#fffe9e',
  lightYellow4: '#FFFF99',
  
  // 블루 계열
  lightBlue: '#acc4ff',
  lightBlue2: '#b5c7ed',
  lightCyan: '#c4f4fe',
  lightBlue3: '#CCE5FF',
  lightCyan2: '#99FFFF',
  
  // 그린 계열
  lightGreen: '#bee9b4',
  lightGreen2: '#afffba',
  veryLightGreen: '#e2ffaf',
  lightGreen3: '#CCFFCC',
  lightGreen4: '#CCFF99',
  
  // 퍼플/라벤더 계열
  lightPurple: '#caa6fe',
  lightPinkPurple: '#fcc6f7',
  lightPurple2: '#CC99FF',
  lightLavender: '#dfd4e4',
  
  // 그레이/뮤트 계열
  mutedTeal: '#83a7a3',
  mutedOlive: '#acb890',
} as const

/**
 * 카테고리별 추천 색상
 */
export const categoryColors = {
  // 서평도서 (파란색 계열)
  review: pastelColors.lightBlue,
  review2: pastelColors.lightBlue2,
  review3: pastelColors.lightCyan,
  review4: pastelColors.lightBlue3,
  
  // 출간도서 (초록색 계열)
  published: pastelColors.lightGreen,
  published2: pastelColors.lightGreen2,
  published3: pastelColors.veryLightGreen,
  published4: pastelColors.lightGreen3,
  
  // 추천도서 (주황/피치 계열)
  recommended: pastelColors.lightOrange,
  recommended2: pastelColors.lightPeach,
  recommended3: pastelColors.lightOrange2,
  recommended4: pastelColors.lightOrange3,
  
  // 기타 (퍼플/핑크 계열)
  other: pastelColors.lightPurple,
  other2: pastelColors.lightPinkPurple,
  other3: pastelColors.lightPurple2,
} as const

/**
 * 통계 카드용 색상
 */
export const statCardColors = [
  pastelColors.lightPink,
  pastelColors.lightCyan,
  pastelColors.lightYellow,
  pastelColors.lightPurple,
] as const

/**
 * 버튼용 색상
 */
export const buttonColors = {
  primary: pastelColors.lightBlue,
  primaryHover: pastelColors.lightBlue2,
  secondary: pastelColors.lightGreen,
  secondaryHover: pastelColors.lightGreen2,
  danger: pastelColors.lightPink,
  dangerHover: '#FF9AA2',
  warning: pastelColors.lightOrange,
  warningHover: pastelColors.lightOrange2,
} as const

/**
 * 랜덤 파스텔 색상 가져오기
 */
export const getRandomPastelColor = (): string => {
  const colors = Object.values(pastelColors)
  return colors[Math.floor(Math.random() * colors.length)]
}

/**
 * 인덱스 기반 파스텔 색상 가져오기
 */
export const getPastelColorByIndex = (index: number): string => {
  const colors = Object.values(pastelColors)
  return colors[index % colors.length]
}

