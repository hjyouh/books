// 서평 신청 데이터베이스 업데이트 유틸리티
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

interface ReviewApplicationDocument {
  서평ID: string
  회원ID: string
  도서ID: string
  신청일: any
  처리상태: '서평신청' | '도서발송' | '서평대기' | '서평완료'
  발송일?: any | null
  완료일?: any | null
  관리자메모?: string
  bookTitle: string
  bookAuthor: string
  applicantName: string
  applicantPhone: string
  applicantEmail: string
  applicantAddress: string
  applicantId?: string
  applicantNickname?: string
  applicantBlog?: string
  applicantInstagram?: string
  서평갯수?: number
  createdAt?: any
  updatedAt?: any
}

/**
 * 기존 서평 신청 문서들을 최신 스키마로 업데이트합니다.
 * 누락된 필드를 기본값으로 채워넣습니다.
 */
export const updateReviewsToLatestSchema = async () => {
  try {
    console.log('서평 신청 데이터베이스 업데이트 시작...')
    
    const reviewsRef = collection(db, 'reviewApplications')
    const q = query(reviewsRef, orderBy('신청일', 'desc'))
    const querySnapshot = await getDocs(q)
    
    const updates: Promise<void>[] = []
    let updatedCount = 0
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data() as ReviewApplicationDocument
      const docRef = doc(db, 'reviewApplications', docSnapshot.id)
      
      const updateData: Partial<ReviewApplicationDocument> = {}
      let needsUpdate = false
      
      // 발송일 기본값: null
      if (data.발송일 === undefined) {
        updateData.발송일 = null
        needsUpdate = true
      }
      
      // 완료일 기본값: null
      if (data.완료일 === undefined) {
        updateData.완료일 = null
        needsUpdate = true
      }
      
      // 관리자메모 기본값: ''
      if (data.관리자메모 === undefined || data.관리자메모 === null) {
        updateData.관리자메모 = ''
        needsUpdate = true
      }
      
      // applicantId 기본값: 회원ID와 동일
      if (!data.applicantId) {
        updateData.applicantId = data.회원ID
        needsUpdate = true
      }
      
      // applicantNickname 기본값: ''
      if (data.applicantNickname === undefined || data.applicantNickname === null) {
        updateData.applicantNickname = ''
        needsUpdate = true
      }
      
      // applicantBlog 기본값: ''
      if (data.applicantBlog === undefined || data.applicantBlog === null) {
        updateData.applicantBlog = ''
        needsUpdate = true
      }
      
      // applicantInstagram 기본값: ''
      if (data.applicantInstagram === undefined || data.applicantInstagram === null) {
        updateData.applicantInstagram = ''
        needsUpdate = true
      }
      
      // 서평갯수 기본값: 0
      if (data.서평갯수 === undefined || data.서평갯수 === null) {
        updateData.서평갯수 = 0
        needsUpdate = true
      }
      
      // updatedAt 타임스탬프 업데이트
      if (needsUpdate) {
        updateData.updatedAt = new Date()
        updates.push(
          updateDoc(docRef, updateData).then(() => {
            console.log(`서평 신청 "${data.bookTitle || docSnapshot.id}" 업데이트 완료`)
            updatedCount++
          })
        )
      }
    })
    
    await Promise.all(updates)
    
    console.log(`서평 신청 데이터베이스 업데이트 완료: ${updatedCount}개 문서 업데이트됨`)
    return {
      success: true,
      updatedCount,
      totalCount: querySnapshot.docs.length
    }
  } catch (error) {
    console.error('서평 신청 데이터베이스 업데이트 오류:', error)
    throw error
  }
}

/**
 * 관리자 페이지에서 수동으로 호출할 수 있는 업데이트 함수
 */
export const runReviewsUpdate = async (): Promise<void> => {
  try {
    const result = await updateReviewsToLatestSchema()
    alert(`서평 신청 데이터베이스 업데이트 완료!\n${result.updatedCount}개 문서가 업데이트되었습니다.`)
  } catch (error: any) {
    console.error('업데이트 실행 오류:', error)
    alert(`업데이트 중 오류가 발생했습니다: ${error.message}`)
  }
}

