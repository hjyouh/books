import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { User, onAuthStateChanged } from 'firebase/auth'
import ReviewApplicationModal from '../components/ReviewApplicationModal'
import './WebBookDetailPage.css'

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

const WebBookDetailPage: React.FC = () => {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const [book, setBook] = useState<Book | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFullImage, setShowFullImage] = useState(false)
  const [showReviewApplication, setShowReviewApplication] = useState(false)

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
        setTimeout(() => {
          document.body.classList.remove('page-sliding-left', 'page-sliding-right')
        }, 350)
        
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
      <div className="book-detail-page web-book-detail">
        <div className="loading-container">
          <p>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="book-detail-page web-book-detail">
        <div className="error-container">
          <p>도서를 찾을 수 없습니다.</p>
          <button onClick={() => navigate('/')}>홈으로 돌아가기</button>
        </div>
      </div>
    )
  }

  return (
    <div className="book-detail-page web-book-detail">
      {/* 웹용 헤더 */}
      <header className="web-book-detail-header">
        <button onClick={() => navigate('/')} className="back-button">← 뒤로</button>
        <h1>{book.title}</h1>
        {book.purchaseUrl && (
          <button onClick={handlePurchaseClick} className="purchase-button">
            구매하기
          </button>
        )}
      </header>

      {/* 메인 컨텐츠 */}
      <main className="web-book-detail-main">
        <div className="web-book-content-wrapper">
          {/* 책 표지 */}
          <div 
            className="web-book-cover"
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
          <div className="web-book-info-section">
            <h2 className="web-book-title">{book.title}</h2>
            <div className="web-book-info-item">
              <span className="web-info-label">저자명:</span>
              <span className="web-info-value">{book.author || '-'}</span>
            </div>
            <div className="web-book-info-item">
              <span className="web-info-label">장르:</span>
              <span className="web-info-value">{book.genre || '-'}</span>
            </div>
            <div className="web-book-info-item">
              <span className="web-info-label">출판사:</span>
              <span className="web-info-value">{book.publisher || '-'}</span>
            </div>
            <div className="web-book-info-item">
              <span className="web-info-label">출간일:</span>
              <span className="web-info-value">
                {book.publishedDate 
                  ? (() => {
                      const date = new Date(book.publishedDate)
                      return date.toLocaleDateString('ko-KR')
                    })()
                  : '-'}
              </span>
            </div>
            {book.purchaseUrl && (
              <button onClick={handlePurchaseClick} className="web-purchase-button">
                구매하기
              </button>
            )}
            {book.category === '서평도서' && (
              <button onClick={handleReviewApplyClick} className="web-review-button">
                서평 신청
              </button>
            )}
          </div>
        </div>

        {/* 도서 소개 */}
        <div className="web-book-description-section">
          <h2 className="web-book-description-title">도서 소개</h2>
          <div 
            className="web-book-description-content"
            dangerouslySetInnerHTML={{ __html: book.description || '도서 설명이 없습니다.' }}
          />
        </div>
      </main>

      {/* 전체 화면 이미지 뷰어 */}
      {showFullImage && book.imageUrl && (
        <div className="full-image-overlay web-full-image-overlay" onClick={handleCloseFullImage}>
          <button 
            className="full-image-close web-full-image-close" 
            onClick={handleCloseFullImage}
            aria-label="닫기"
          >
            ✕
          </button>
          <img 
            src={book.imageUrl} 
            alt={book.title}
            className="full-image web-full-image"
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

export default WebBookDetailPage

