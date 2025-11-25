// 회원 데이터베이스 업데이트 유틸리티
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore'
import { db } from '../firebase'

interface MemberDocument {
  id: string
  uid: string
  name: string
  nickname: string
  phone: string
  email: string
  address: string
  blog?: string
  instagram?: string
  level?: string
  isAdmin?: boolean
  createdAt?: any
}

/**
 * 기존 회원 문서들을 최신 스키마로 업데이트합니다.
 * 누락된 필드를 기본값으로 채워넣습니다.
 */
export const updateMembersToLatestSchema = async () => {
  try {
    console.log('회원 데이터베이스 업데이트 시작...')
    
    const membersRef = collection(db, 'users')
    const q = query(membersRef, orderBy('createdAt', 'desc'))
    const querySnapshot = await getDocs(q)
    
    const updates: Promise<void>[] = []
    let updatedCount = 0
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data() as MemberDocument
      const docRef = doc(db, 'users', docSnapshot.id)
      
      const updateData: Partial<MemberDocument> = {}
      let needsUpdate = false
      
      // blog 기본값: ''
      if (data.blog === undefined || data.blog === null) {
        updateData.blog = ''
        needsUpdate = true
      }
      
      // instagram 기본값: ''
      if (data.instagram === undefined || data.instagram === null) {
        updateData.instagram = ''
        needsUpdate = true
      }
      
      // level 기본값: 'customer' (isAdmin이 true면 'admin')
      if (!data.level) {
        updateData.level = data.isAdmin ? 'admin' : 'customer'
        needsUpdate = true
      }
      
      // isAdmin 기본값: false (level이 'admin'이면 true)
      if (data.isAdmin === undefined || data.isAdmin === null) {
        updateData.isAdmin = data.level === 'admin'
        needsUpdate = true
      }
      
      // updatedAt 타임스탬프 업데이트
      if (needsUpdate) {
        updateData.updatedAt = new Date()
        updates.push(
          updateDoc(docRef, updateData).then(() => {
            console.log(`회원 "${data.name || data.nickname || docSnapshot.id}" 업데이트 완료`)
            updatedCount++
          })
        )
      }
    })
    
    await Promise.all(updates)
    
    console.log(`회원 데이터베이스 업데이트 완료: ${updatedCount}개 문서 업데이트됨`)
    return {
      success: true,
      updatedCount,
      totalCount: querySnapshot.docs.length
    }
  } catch (error) {
    console.error('회원 데이터베이스 업데이트 오류:', error)
    throw error
  }
}

/**
 * 관리자 페이지에서 수동으로 호출할 수 있는 업데이트 함수
 */
export const runMembersUpdate = async (): Promise<void> => {
  try {
    const result = await updateMembersToLatestSchema()
    alert(`회원 데이터베이스 업데이트 완료!\n${result.updatedCount}개 문서가 업데이트되었습니다.`)
  } catch (error: any) {
    console.error('업데이트 실행 오류:', error)
    alert(`업데이트 중 오류가 발생했습니다: ${error.message}`)
  }
}

