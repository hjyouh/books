import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User } from 'firebase/auth'
import ReviewApplicationModal from './ReviewApplicationModal'
import './BookDetailModal.css'

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

interface BookDetailModalProps {
  isOpen: boolean
  onClose: () => void
  book: Book | null
  user: User | null
}

const BookDetailModal: React.FC<BookDetailModalProps> = ({ isOpen, onClose, book, user }) => {
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [showReviewApplication, setShowReviewApplication] = useState(false)
  const navigate = useNavigate()

  if (!isOpen || !book) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
      setShowLoginPrompt(false)
      setShowReviewApplication(false)
    }
  }

  const handleReviewApplyClick = () => {
    if (!user) {
      setShowLoginPrompt(true)
    } else {
      // 로그인된 사용자의 경우 서평 신청 모달 표시
      setShowReviewApplication(true)
    }
  }

  const handleLoginButtonClick = () => {
    navigate('/login')
    onClose()
    setShowLoginPrompt(false)
  }

  const handleCloseReviewApplication = () => {
    setShowReviewApplication(false)
  }

  return (
    <div className="book-detail-overlay" onClick={handleOverlayClick}>
      <div className="book-detail-modal">
        <button className="book-detail-close" onClick={() => { onClose(); setShowLoginPrompt(false); setShowReviewApplication(false); }}>
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

            <div className="detail-item">
              <h4>장르</h4>
              <p>{book.genre || '문학'}</p>
            </div>

            <div className="detail-item">
              <h4>도서 내용/설명</h4>
              <p>{book.description || '현대문학의 흐름과 특징을 체계적으로 분석한 전문서'}</p>
            </div>

            <div className="detail-item">
              <h4>저자 소개</h4>
              <p>{book.author}는 현대문학 연구의 권위자로, 서울대 문학과 교수로 재직 중입니다.</p>
            </div>

            <div className="detail-item">
              <h4>출판사</h4>
              <p>{book.publisher || '문학사'}</p>
            </div>

            <div className="detail-item">
              <h4>해시태그</h4>
              <div className="hashtags">
                <span className="hashtag">#{book.genre || '현대문학'}</span>
                <span className="hashtag">#문학이론</span>
                <span className="hashtag">#비평</span>
                <span className="hashtag">#분석</span>
              </div>
            </div>

            <div className="modal-actions">
              {book.category === '서평도서' && (
                <button className="review-apply-btn" onClick={handleReviewApplyClick}>
                  서평 신청
                </button>
              )}
              <button className="add-to-favorites-btn">
                +
              </button>
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
