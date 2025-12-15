// 공통 유틸리티 함수들

export const formatPostingDate = (value: any): string => {
  if (!value) return ''
  try {
    let date: Date | null = null
    if (value.toDate) {
      date = value.toDate()
    } else if (value.seconds) {
      date = new Date(value.seconds * 1000)
    } else if (value instanceof Date) {
      date = value
    } else if (typeof value === 'string') {
      const parsed = Date.parse(value)
      if (!isNaN(parsed)) {
        date = new Date(parsed)
      }
    }
    if (!date) return ''
    const year = String(date.getFullYear()).slice(-2)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  } catch (error) {
    console.error('포스팅 기간 표시 오류:', error)
    return ''
  }
}

export const formatDate = (timestamp: any): string => {
  if (!timestamp) return '-'
  try {
    let date: Date
    if (timestamp.toDate) {
      date = timestamp.toDate()
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000)
    } else if (timestamp instanceof Date) {
      date = timestamp
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp)
    } else {
      return '-'
    }
    
    if (isNaN(date.getTime())) return '-'
    
    const year = String(date.getFullYear()).slice(-2)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  } catch (error) {
    return '-'
  }
}

export const formatMemberDate = (timestamp: any): string => {
  if (!timestamp) return '-'
  try {
    let date: Date
    if (timestamp.toDate) {
      date = timestamp.toDate()
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000)
    } else {
      return '-'
    }

    const year = date.getFullYear().toString().slice(-2)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    return `${year}/${month}/${day} ${hours}:${minutes}`
  } catch (error) {
    return '-'
  }
}

export const formatReviewCount = (count: number | undefined): string => {
  const reviewCount = count || 0
  return `${reviewCount}/3`
}

export const truncateText = (text: string, maxLength: number = 200): string => {
  if (!text || text === '-') return text || '-'
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export const truncateMiddle = (text: string, maxLength: number): string => {
  if (!text || text === '-') return '-'
  if (text.length <= maxLength) return text
  const front = Math.floor(maxLength / 2)
  const back = maxLength - front - 3
  return text.substring(0, front) + '...' + text.substring(text.length - back)
}

export const truncateDescriptionToLines = (text: string, maxLines: number = 5): string => {
  if (!text || text === '-') return text || '-'
  
  let plainText = text
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
  
  plainText = plainText.replace(/<[^>]*>/g, '')
  
  plainText = plainText
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#160;/g, ' ')
  
  plainText = plainText.replace(/\n{3,}/g, '\n\n')
  
  plainText = plainText.trim()
  if (!plainText) return '-'
  
  const lines = plainText.split(/\r?\n/)
  
  const filteredLines = lines.filter((line, index) => {
    if (index === 0 || index === lines.length - 1) {
      return line.trim().length > 0
    }
    return true
  })
  
  if (filteredLines.length <= maxLines) {
    return filteredLines.join('\n')
  }
  
  return filteredLines.slice(0, maxLines).join('\n') + '...'
}





