import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { User, onAuthStateChanged } from 'firebase/auth'
import ReviewApplicationModal from '../components/ReviewApplicationModal'
import MobileHeader from '../components/MobileHeader'
import './MobileBookDetailPage.css'
// 아이콘 import
import closeWhiteIcon from '../assets/icons/Close-white.png'
import bookstoreWhiteIcon from '../assets/icons/bookstore-white.png'
import writeIcon from '../assets/icons/write.png'

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
  purchaseUrl?: string;
}

const MobileBookDetailPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const [book, setBook] = useState<Book | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFullImage, setShowFullImage] = useState(false)
  const [showReviewApplication, setShowReviewApplication] = useState(false)

  // 모바일 뷰 상태 복원
  useEffect(() => {
    const savedMobileView = localStorage.getItem('isMobileView')
    if (savedMobileView === 'true') {
      document.body.classList.add('mobile-view-active')
    }
    
    return () => {
      // 페이지를 떠날 때는 모바일 뷰 클래스를 유지 (뒤로가기 시에도 유지)
    }
  }, [])

  // 사용자 인증 상태 확인
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  // 도서 데이터 가져오기
  useEffect(() => {
    const fetchBook = async () => {
      if (!bookId) {
        navigate('/')
        return
      }

      try {
        setLoading(true)
        // 모바일에서는 슬라이드 애니메이션 클래스 제거 (즉시)
        const isMobile = window.innerWidth <= 768
        if (!isMobile) {
          setTimeout(() => {
            document.body.classList.remove('page-sliding-left', 'page-sliding-right')
          }, 350)
        } else {
          document.body.classList.remove('page-sliding-left', 'page-sliding-right')
        }
        
        const bookDoc = await getDoc(doc(db, 'books', bookId))
        if (bookDoc.exists()) {
          const bookData = { id: bookDoc.id, ...bookDoc.data() } as Book
          setBook(bookData)
        } else {
          console.error('도서를 찾을 수 없습니다:', bookId)
          navigate('/')
        }
      } catch (error) {
        console.error('도서 로딩 오류:', error)
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    fetchBook()
  }, [bookId, navigate])

  // 컴포넌트 언마운트 시 애니메이션 클래스 제거
  useEffect(() => {
    return () => {
      document.body.classList.remove('page-sliding-left', 'page-sliding-right')
    }
  }, [])

  const handleReviewApplyClick = () => {
    if (!user) {
      navigate('/login')
    } else {
      setShowReviewApplication(true)
    }
  }

  const handlePurchaseClick = () => {
    if (book?.purchaseUrl) {
      window.open(book.purchaseUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleCloseFullImage = () => {
    setShowFullImage(false)
  }

  if (loading) {
    return (
      <div className="book-detail-page mobile-book-detail">
        <div className="loading-container">
          <p>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="book-detail-page mobile-book-detail">
        <div className="error-container">
          <p>도서를 찾을 수 없습니다.</p>
          <button onClick={() => navigate('/')}>홈으로 돌아가기</button>
        </div>
      </div>
    )
  }

  return (
    <div className="book-detail-page mobile-book-detail">
      {/* 헤더 */}
      <MobileHeader 
        title={book.title}
        titleFontSize={16}
        onBack={() => {
          const isMobile = window.innerWidth <= 768
          if (!isMobile) {
            document.body.classList.add('page-sliding-right')
            setTimeout(() => {
              setTimeout(() => {
                document.body.classList.remove('page-sliding-right')
              }, 350)
              navigate(-1)
            }, 50)
          } else {
            document.body.classList.remove('page-sliding-right')
            navigate('/')
          }
        }}
      />

      {/* 메인 컨텐츠 */}
      <main className="book-detail-main mobile-book-detail-main">
        {/* 책 표지와 도서 정보 나란히 */}
        <div className="mobile-book-cover-info-wrapper">
          {/* 책 표지 */}
          <div 
            className="mobile-book-cover"
            onClick={() => book.imageUrl && setShowFullImage(true)}
            style={{ cursor: book.imageUrl ? 'pointer' : 'default' }}
          >
            {book.imageUrl ? (
              <img src={book.imageUrl} alt={book.title} />
            ) : (
              <div className="book-image-placeholder">책 이미지</div>
            )}
          </div>

          {/* 도서 정보 */}
          <div className="mobile-book-info-section">
            <div className="mobile-book-info-item">
              <span className="mobile-info-label">저자명:</span>
              <span className="mobile-info-value">{book.author || '-'}</span>
            </div>
            <div className="mobile-book-info-item">
              <span className="mobile-info-label">장르:</span>
              <span className="mobile-info-value">{book.genre || '-'}</span>
            </div>
            <div className="mobile-book-info-item">
              <span className="mobile-info-label">출판사:</span>
              <span className="mobile-info-value">{book.publisher || '-'}</span>
            </div>
            <div className="mobile-book-info-item">
              <span className="mobile-info-label">출간일:</span>
              <span className="mobile-info-value">
                {book.publishedDate 
                  ? (() => {
                      const date = new Date(book.publishedDate)
                      const year = String(date.getFullYear()).slice(-2)
                      const month = String(date.getMonth() + 1).padStart(2, '0')
                      const day = String(date.getDate()).padStart(2, '0')
                      return `${year}/${month}/${day}`
                    })()
                  : '-'}
              </span>
            </div>
            {book.purchaseUrl && (
              <div className="mobile-book-info-item mobile-purchase-item">
                <span className="mobile-info-label">도서구매:</span>
                <button 
                  className="mobile-purchase-link-button"
                  onClick={handlePurchaseClick}
                  aria-label="구매링크"
                >
                  <img src={bookstoreWhiteIcon} alt="구매링크" style={{ width: '30px', height: '30px' }} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 도서 소개 */}
        <div className="mobile-book-description-section">
          <h2 className="mobile-book-description-title">도서 소개</h2>
          <div 
            className="mobile-book-description-content"
            dangerouslySetInnerHTML={{ __html: book.description || '도서 설명이 없습니다.' }}
          />
        </div>
      </main>

      {/* 서평신청 플로팅 버튼 */}
      {book.category === '서평도서' && (
        <button 
          className="mobile-review-floating-button" 
          onClick={handleReviewApplyClick}
          aria-label="서평 신청"
        >
          <img src={writeIcon} alt="서평 신청" />
          <span className="mobile-review-button-text">서평신청</span>
        </button>
      )}

      {/* 전체 화면 이미지 뷰어 */}
      {showFullImage && book.imageUrl && (
        <div className="full-image-overlay mobile-full-image-overlay" onClick={handleCloseFullImage}>
          <button 
            className="full-image-close mobile-full-image-close" 
            onClick={handleCloseFullImage}
            aria-label="닫기"
          >
            <img src={closeWhiteIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
          </button>
          <img 
            src={book.imageUrl} 
            alt={book.title}
            className="full-image mobile-full-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 서평 신청 모달 */}
      <ReviewApplicationModal
        isOpen={showReviewApplication}
        onClose={() => setShowReviewApplication(false)}
        book={book}
        user={user}
      />
    </div>
  )
}

export default MobileBookDetailPage

