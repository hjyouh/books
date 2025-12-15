import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User } from 'firebase/auth'
import { db } from '../firebase'
import ReviewApplicationModal from './ReviewApplicationModal'
import './BookDetailModal.css'

interface Book {
  id?: string;
  title: string;
  author: string;
  rating: number;
  review: string;
  createdAt?: any;
  category?: string;
  genre?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  imageUrl?: string;
  status?: string;
  reviewCount?: number;
  purchaseUrl?: string;
  likes?: number;
  likedUsers?: string[];
  comments?: Array<{ userId: string; userNickname?: string; userDisplayId?: string; text: string; createdAt?: any; id?: string }>;
}

interface BookDetailModalProps {
  isOpen: boolean
  onClose: () => void
  book: Book | null
  user: User | null
  preventCloseRef?: React.MutableRefObject<boolean> // 외부에서 모달 닫기 방지 플래그 전달
}

const BookDetailModal: React.FC<BookDetailModalProps> = ({ isOpen, onClose, book, user, preventCloseRef: externalPreventCloseRef }) => {
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showReviewApplication, setShowReviewApplication] = useState(false)
  const navigate = useNavigate()
  const internalPreventCloseRef = useRef(false)
  const preventCloseRef = externalPreventCloseRef || internalPreventCloseRef // 외부 ref가 있으면 사용, 없으면 내부 ref 사용
  const onCloseRef = useRef(onClose) // onClose를 ref로 저장하여 항상 최신 값 유지
  
  // onClose가 변경될 때마다 ref 업데이트
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])
  
  // onClose를 래핑
  const safeOnClose = () => {
    if (preventCloseRef.current) {
      return
    }
    onCloseRef.current()
  }

  // 모달 닫기 처리
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (preventCloseRef.current) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    
    const target = e.target as HTMLElement
    
    // 모달 내부 요소 클릭 시 모달이 닫히지 않도록
    if (target.closest('.book-detail-modal') || 
        target.closest('.review-apply-btn') ||
        target.closest('.book-detail-content')) {
      return
    }
    
    // 오버레이 자체를 클릭한 경우에만 모달 닫기
    if (e.target === e.currentTarget) {
      safeOnClose()
      setShowLoginPrompt(false)
      setShowReviewApplication(false)
    }
  }
  
  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (preventCloseRef.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }
  
  const handleOverlayMouseUp = (e: React.MouseEvent) => {
    if (preventCloseRef.current) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const shouldShowModal = isOpen || preventCloseRef.current
  
  if (!shouldShowModal || !book) return null

  const handleReviewApplyClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!user) {
      setShowLoginPrompt(true)
    } else {
      // 로그인된 사용자의 경우 서평 신청 모달 표시
      setShowReviewApplication(true)
    }
  }

  const handleLoginButtonClick = () => {
    navigate('/login')
    safeOnClose()
    setShowLoginPrompt(false)
  }

  const handleCloseReviewApplication = () => {
    setShowReviewApplication(false)
  }

  return (
    <div className="book-detail-overlay" onClick={handleOverlayClick} onMouseDown={handleOverlayMouseDown} onMouseUp={handleOverlayMouseUp}>
      <div className="book-detail-modal" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
        <button className="book-detail-close" onClick={() => { safeOnClose(); setShowLoginPrompt(false); setShowReviewApplication(false); }}>
          ×
        </button>
        
        <div className="book-detail-content">
          {/* 왼쪽: 도서 표지 */}
          <div className="book-cover-section">
            <div className="book-cover-image">
              {book.imageUrl ? (
                <img src={book.imageUrl} alt={book.title} />
              ) : (
                <div className="placeholder-cover">
                  <div className="placeholder-text">
                    <h3>{book.title}</h3>
                    <p>POET'S HEART</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 도서 상세 정보 */}
          <div className="book-details-section">
            {/* 도서 구분 - 우측 정렬 */}
            {book.category && (
              <div className="detail-item category-item">
                <span className="category-label">{book.category}</span>
              </div>
            )}

            {/* 책 제목 */}
            <div className="detail-item detail-item-inline book-title-item">
              <span className="detail-label">책 제목</span>
              <span className="detail-value">: {book.title}</span>
            </div>

            {/* 저자명 */}
            <div className="detail-item detail-item-inline">
              <span className="detail-label">저자명</span>
              <span className="detail-value">: {book.author}</span>
            </div>

            {/* 장르 */}
            <div className="detail-item detail-item-inline">
              <span className="detail-label">장르</span>
              <span className="detail-value">: {book.genre || '문학'}</span>
            </div>

            {/* 출판사 */}
            <div className="detail-item detail-item-inline">
              <span className="detail-label">출판사</span>
              <span className="detail-value">: {book.publisher || '문학사'}</span>
            </div>

            {/* 출간일 */}
            {book.publishedDate && (
              <div className="detail-item detail-item-inline">
                <span className="detail-label">출간일</span>
                <span className="detail-value">: {book.publishedDate}</span>
              </div>
            )}

            {/* 구매 링크 */}
            {book.purchaseUrl && (
              <div className="detail-item detail-item-inline detail-item-link">
                <span className="detail-label">구매 링크</span>
                <span className="detail-value">: {book.purchaseUrl}</span>
                <a 
                  href={book.purchaseUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="purchase-link-button"
                >
                  구매 링크
                </a>
              </div>
            )}

            {/* 도서 설명 - 스크롤 가능 영역 */}
            <div className="detail-item description-item">
              <h4>도서 설명</h4>
              <div className="description-content">
                <div 
                  className="description-text" 
                  dangerouslySetInnerHTML={{ __html: book.description || '현대문학의 흐름과 특징을 체계적으로 분석한 전문서' }}
                />
              </div>
              {/* 서평 신청 버튼 - 도서 설명 영역 안에 배치 */}
              {book.category === '서평도서' && (
                <button 
                  type="button" 
                  className="review-apply-btn" 
                  onClick={handleReviewApplyClick}
                >
                  서평 신청
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 로그인 유도 모달 */}
        {showLoginPrompt && (
          <div className="login-prompt-overlay" onClick={handleOverlayClick}>
            <div className="login-prompt-modal">
              <button className="login-prompt-close" onClick={() => setShowLoginPrompt(false)}>
                ×
              </button>
              <div className="login-prompt-content">
                <div className="login-prompt-icon">
                  →
                </div>
                <h3 className="login-prompt-title">서평 신청</h3>
                <p className="login-prompt-message-main">서평 신청을 하려면 로그인이 필요합니다</p>
                <p className="login-prompt-message-sub">로그인 후 회원 정보가 자동으로 입력됩니다</p>
                <button className="login-prompt-button" onClick={handleLoginButtonClick}>
                  → 로그인하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 서평 신청 모달 */}
        <ReviewApplicationModal
          isOpen={showReviewApplication}
          onClose={handleCloseReviewApplication}
          book={book}
          user={user}
        />
      </div>
    </div>
  )
}

export default BookDetailModal
