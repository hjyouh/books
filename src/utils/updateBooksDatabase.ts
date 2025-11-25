// 도서 데이터베이스 업데이트 유틸리티
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

interface BookDocument {
  id: string
  title: string
  author: string
  category?: string
  genre?: string
  description?: string
  imageUrl?: string
  rating?: number
  reviewCount?: number
  status?: string
  createdAt?: any
  publisher?: string
  publishedDate?: string
}

/**
 * 기존 도서 문서들을 최신 스키마로 업데이트합니다.
 * 누락된 필드를 기본값으로 채워넣습니다.
 */
export const updateBooksToLatestSchema = async () => {
  try {
    console.log('도서 데이터베이스 업데이트 시작...')
    
    const booksRef = collection(db, 'books')
    const q = query(booksRef, orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    
    const updates: Promise<void>[] = []
    let updatedCount = 0
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data() as BookDocument
      const docRef = doc(db, 'books', docSnapshot.id)
      
      const updateData: Partial<BookDocument> = {}
      let needsUpdate = false
      
      // category 기본값: '기타'
      if (!data.category) {
        updateData.category = '기타'
        needsUpdate = true
      }
      
      // genre 기본값: '기타'
      if (!data.genre) {
        updateData.genre = '기타'
        needsUpdate = true
      }
      
      // description 기본값: ''
      if (!data.description) {
        updateData.description = ''
        needsUpdate = true
      }
      
      // rating 기본값: 0
      if (data.rating === undefined || data.rating === null) {
        updateData.rating = 0
        needsUpdate = true
      }
      
      // reviewCount 기본값: 0
      if (data.reviewCount === undefined || data.reviewCount === null) {
        updateData.reviewCount = 0
        needsUpdate = true
      }
      
      // status 기본값: '서평도서'
      if (!data.status) {
        updateData.status = '서평도서'
        needsUpdate = true
      }
      
      // updatedAt 타임스탬프 업데이트
      if (needsUpdate) {
        updateData.updatedAt = new Date()
        updates.push(
          updateDoc(docRef, updateData).then(() => {
            console.log(`도서 "${data.title || docSnapshot.id}" 업데이트 완료`)
            updatedCount++
          })
        )
      }
    })
    
    await Promise.all(updates)
    
    console.log(`도서 데이터베이스 업데이트 완료: ${updatedCount}개 문서 업데이트됨`)
    return {
      success: true,
      updatedCount,
      totalCount: querySnapshot.docs.length
    }
  } catch (error) {
    console.error('도서 데이터베이스 업데이트 오류:', error)
    throw error
  }
}

/**
 * 관리자 페이지에서 수동으로 호출할 수 있는 업데이트 함수
 */
export const runBooksUpdate = async (): Promise<void> => {
  try {
    const result = await updateBooksToLatestSchema()
    alert(`도서 데이터베이스 업데이트 완료!\n${result.updatedCount}개 문서가 업데이트되었습니다.`)
  } catch (error: any) {
    console.error('업데이트 실행 오류:', error)
    alert(`업데이트 중 오류가 발생했습니다: ${error.message}`)
  }
}

