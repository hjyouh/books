import React, { useState, useEffect } from 'react'
import { User } from 'firebase/auth'
import { doc, getDoc, addDoc, updateDoc, collection, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import './ReviewApplicationModal.css'

interface Book {
  id?: string;
  title: string;
  author: string;
  rating: number;
  review: string;
  createdAt: any;
  category?: string;
  genre?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  imageUrl?: string;
  status?: string;
  reviewCount?: number;
}

interface UserInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
}

interface ReviewApplicationData {
  // 기본 필드 (이미지의 필드 구조)
  회원ID: string;
  도서ID: string;
  신청일: any;
  처리상태: '서평신청' | '도서발송' | '서평대기' | '서평완료';
  발송일: any | null;
  완료일: any | null;
  관리자메모: string;
  리뷰완료여부: boolean;
  서평ID: string;
  서평갯수: number;
  
  // 추가 정보
  bookTitle: string;
  bookAuthor: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string;
  applicantAddress: string;
  
  // 시스템 필드
  createdAt: any;
  updatedAt: any;
}

interface ReviewApplicationModalProps {
  isOpen: boolean
  onClose: () => void
  book: Book | null
  user: User | null
}

const ReviewApplicationModal: React.FC<ReviewApplicationModalProps> = ({ 
  isOpen, 
  onClose, 
  book, 
  user 
}) => {
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: '',
    phone: '',
    email: '',
    address: ''
  })
  const [isInfoConfirmed, setIsInfoConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reviewCount, setReviewCount] = useState({ current: 0, max: 3 })

  useEffect(() => {
    if (isOpen && user) {
      fetchUserInfo()
      fetchReviewCount()
    }
  }, [isOpen, user])

  const fetchUserInfo = async () => {
    if (!user) return

    try {
      setLoading(true)
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      
      if (userDoc.exists()) {
        const userData = userDoc.data()
        setUserInfo({
          name: userData.name || user.displayName || '',
          phone: userData.phone || '',
          email: user.email || '',
          address: userData.address || ''
        })
      } else {
        // 기본 정보 설정
        setUserInfo({
          name: user.displayName || '',
          phone: '',
          email: user.email || '',
          address: ''
        })
      }
    } catch (error) {
      console.error('사용자 정보 가져오기 오류:', error)
      // 기본 정보 설정
      setUserInfo({
        name: user.displayName || '',
        phone: '',
        email: user.email || '',
        address: ''
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchReviewCount = async () => {
    if (!user) return

    try {
      // 사용자의 미완료 서평 수 조회 (실제 구현에서는 Firestore 쿼리 사용)
      // 임시로 랜덤 값 사용
      setReviewCount({
        current: Math.floor(Math.random() * 3),
        max: 3
      })
    } catch (error) {
      console.error('서평 수 조회 오류:', error)
    }
  }

  const handleInputChange = (field: keyof UserInfo, value: string) => {
    setUserInfo(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAutoFillAddress = () => {
    // 주소 자동입력 기능 (실제로는 주소 API 연동)
    setUserInfo(prev => ({
      ...prev,
      address: '서울시 강남구 테헤란로 123'
    }))
  }

  const handleSubmit = async () => {
    if (!user || !book || !isInfoConfirmed) return

    try {
      setSubmitting(true)
      
      // 서평 신청 데이터 생성 (이미지의 필드 구조에 맞춤)
      const reviewApplication: ReviewApplicationData = {
        // 기본 필드 (이미지의 필드 구조)
        회원ID: user.uid,
        도서ID: book.id || '',
        신청일: Timestamp.now(),
        처리상태: '서평신청', // 서평신청/도서발송/서평대기/서평완료
        발송일: null, // 나중에 관리자가 설정
        완료일: null, // 나중에 관리자가 설정
        관리자메모: '', // 나중에 관리자가 입력
        리뷰완료여부: false, // 기본값 false
        서평ID: '', // 나중에 생성
        서평갯수: 0, // 기본값 0
        
        // 추가 정보
        bookTitle: book.title,
        bookAuthor: book.author,
        applicantName: userInfo.name,
        applicantPhone: userInfo.phone,
        applicantEmail: userInfo.email,
        applicantAddress: userInfo.address,
        
        // 시스템 필드
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      // Firestore에 서평 신청 저장
      const docRef = await addDoc(collection(db, 'reviewApplications'), reviewApplication)
      
      // 생성된 문서 ID를 서평ID로 업데이트
      await updateDoc(docRef, {
        서평ID: docRef.id
      })
      
      console.log('서평 신청이 완료되었습니다:', reviewApplication)
      alert('서평 신청이 완료되었습니다!')
      onClose()
      
    } catch (error) {
      console.error('서평 신청 오류:', error)
      alert('서평 신청 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen || !book || !user) return null

  return (
    <div className="review-application-overlay" onClick={handleOverlayClick}>
      <div className="review-application-modal">
        <button className="review-application-close" onClick={onClose}>
          ×
        </button>
        
        <div className="review-application-content">
          <h2 className="review-application-title">서평을 신청 하시겠습니까?</h2>
          
          <div className="review-application-info">
            <p className="user-info-message">
              {userInfo.name}님의 정보가 자동으로 입력되었습니다. 필요시 수정하세요.
            </p>
            <p className="review-count-info">
              미완료 서평: <span className="current-count">{reviewCount.current}</span>개 / 최대 {reviewCount.max}개
            </p>
          </div>

          <div className="form-section">
            <div className="form-group">
              <label htmlFor="name">이름</label>
              <input
                type="text"
                id="name"
                value={userInfo.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="form-input"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">연락처</label>
              <input
                type="tel"
                id="phone"
                value={userInfo.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="form-input"
                placeholder="010-1234-5678"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">email</label>
              <input
                type="email"
                id="email"
                value={userInfo.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="form-input"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">주소</label>
              <div className="address-input-group">
                <input
                  type="text"
                  id="address"
                  value={userInfo.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="form-input"
                  placeholder="서울시 강남구 테헤란로 123"
                  disabled={loading}
                />
                <button 
                  type="button" 
                  className="auto-fill-btn"
                  onClick={handleAutoFillAddress}
                  disabled={loading}
                >
                  자동입력
                </button>
              </div>
            </div>
          </div>

          <div className="confirmation-section">
            <label className="confirmation-checkbox">
              <input
                type="checkbox"
                checked={isInfoConfirmed}
                onChange={(e) => setIsInfoConfirmed(e.target.checked)}
                disabled={loading}
              />
              <span className="checkmark"></span>
              상기 내용이 맞으신가요?
            </label>
          </div>

          <div className="modal-actions">
            <button 
              className="submit-btn"
              onClick={handleSubmit}
              disabled={!isInfoConfirmed || loading || submitting}
            >
              {submitting ? '신청 중...' : '신청'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReviewApplicationModal
