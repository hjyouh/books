// 메인슬라이드 데이터베이스 업데이트 유틸리티
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

interface SlideDocument {
  id: string
  slideType?: 'main' | 'ad'
  title?: string
  subtitle?: string
  imageUrl?: string
  linkUrl?: string
  linkType?: 'book' | 'ad' | 'custom'
  order?: number
  isActive?: boolean
  createdAt?: any
  updatedAt?: any
  titleColor?: string
  subtitleColor?: string
}

/**
 * 기존 슬라이드 문서들을 최신 스키마로 업데이트합니다.
 * 누락된 필드를 기본값으로 채워넣습니다.
 */
export const updateSlidesToLatestSchema = async () => {
  try {
    console.log('슬라이드 데이터베이스 업데이트 시작...')
    
    const slidesRef = collection(db, 'slides')
    const q = query(slidesRef, orderBy('order', 'asc'))
    const querySnapshot = await getDocs(q)
    
    const updates: Promise<void>[] = []
    let updatedCount = 0
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data() as SlideDocument
      const docRef = doc(db, 'slides', docSnapshot.id)
      
      const updateData: Partial<SlideDocument> = {}
      let needsUpdate = false
      
      // slideType 기본값: 'main' (없을 때만 설정, 'ad'는 유지)
      if (!data.slideType) {
        updateData.slideType = 'main'
        needsUpdate = true
      }
      // slideType이 'ad'인 경우는 그대로 유지 (업데이트하지 않음)
      
      // linkType 처리: 'ad' 타입을 'book'으로 변환, 없으면 'book'
      if (!data.linkType || data.linkType === 'ad') {
        updateData.linkType = 'book'
        needsUpdate = true
      }
      
      // titleColor 기본값: '#FFFFFF'
      if (!data.titleColor) {
        updateData.titleColor = '#FFFFFF'
        needsUpdate = true
      }
      
      // subtitleColor 기본값: '#FFFFFF'
      if (!data.subtitleColor) {
        updateData.subtitleColor = '#FFFFFF'
        needsUpdate = true
      }
      
      // order가 없으면 최대값 + 1로 설정
      if (data.order === undefined || data.order === null) {
        const maxOrder = Math.max(
          ...querySnapshot.docs.map(d => d.data().order || 0),
          0
        )
        updateData.order = maxOrder + 1
        needsUpdate = true
      }
      
      // isActive 기본값: true
      if (data.isActive === undefined || data.isActive === null) {
        updateData.isActive = true
        needsUpdate = true
      }
      
      // updatedAt 타임스탬프 업데이트
      if (needsUpdate) {
        updateData.updatedAt = new Date()
        updates.push(
          updateDoc(docRef, updateData).then(() => {
            console.log(`슬라이드 "${data.title || docSnapshot.id}" 업데이트 완료`)
            updatedCount++
          })
        )
      }
    })
    
    await Promise.all(updates)
    
    console.log(`슬라이드 데이터베이스 업데이트 완료: ${updatedCount}개 문서 업데이트됨`)
    return {
      success: true,
      updatedCount,
      totalCount: querySnapshot.docs.length
    }
  } catch (error) {
    console.error('슬라이드 데이터베이스 업데이트 오류:', error)
    throw error
  }
}

/**
 * 관리자 페이지에서 수동으로 호출할 수 있는 업데이트 함수
 */
export const runSlidesUpdate = async (): Promise<void> => {
  try {
    const result = await updateSlidesToLatestSchema()
    alert(`슬라이드 데이터베이스 업데이트 완료!\n${result.updatedCount}개 문서가 업데이트되었습니다.`)
  } catch (error: any) {
    console.error('업데이트 실행 오류:', error)
    alert(`업데이트 중 오류가 발생했습니다: ${error.message}`)
  }
}

