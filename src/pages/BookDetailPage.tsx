import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db, auth } from '../firebase'
import { User, onAuthStateChanged } from 'firebase/auth'
import ReviewApplicationModal from '../components/ReviewApplicationModal'
import './BookDetailPage.css'

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

const BookDetailPage: React.FC = () => {
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
      <div className="book-detail-page">
        <div className="loading-container">
          <p>로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="book-detail-page">
        <div className="error-container">
          <p>도서를 찾을 수 없습니다.</p>
          <button onClick={() => navigate('/')}>홈으로 돌아가기</button>
        </div>
      </div>
    )
  }

  return (
    <div className="book-detail-page">
      {/* 헤더 */}
      <header className="book-detail-header">
        <button className="back-button" onClick={() => {
          // 모바일에서는 페이지 전환 애니메이션 없이 바로 이동
          const isMobile = window.innerWidth <= 768
          if (!isMobile) {
            // 웹에서는 슬라이드 애니메이션 사용
            document.body.classList.add('page-sliding-right')
            setTimeout(() => {
              setTimeout(() => {
                document.body.classList.remove('page-sliding-right')
              }, 350)
              navigate(-1)
            }, 50)
          } else {
            // 모바일에서는 바로 이동
            document.body.classList.remove('page-sliding-right')
            navigate('/')
          }
        }}>
          ←
        </button>
        <div className="header-title-section">
          <div className="header-left">
            <div className="header-info-item">
              <h1 className="book-title-header">{book.title}</h1>
            </div>
            <div className="header-info-item">
              <p className="book-author-header">{book.author}</p>
            </div>
          </div>
          <div className="header-right">
            <div className="header-info-item">
              <span className="info-label">장르:</span>
              <span className="info-value">{book.genre || '-'}</span>
            </div>
            <div className="header-info-item">
              <span className="info-value">
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
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="book-detail-main">

        {/* 책 이미지와 연속된 내용 섹션 */}
        <div className="book-content-flow-section">
          {/* 1. 표지 이미지 영역 */}
          <div 
            className="book-image-flow"
            onClick={() => book.imageUrl && setShowFullImage(true)}
            style={{ cursor: book.imageUrl ? 'pointer' : 'default' }}
          >
            {book.imageUrl ? (
              <img src={book.imageUrl} alt={book.title} />
            ) : (
              <div className="book-image-placeholder">책 이미지</div>
            )}
          </div>
          
          {/* 2. Text 시작 영역 (이미지 옆) */}
          <div className="book-description-start">
            <div 
              className="book-description-full"
              dangerouslySetInnerHTML={{ __html: book.description || '도서 설명이 없습니다.' }}
            />
          </div>
        </div>
        
        {/* 3. Text 연속으로 넣는 영역 (이미지 아래, 전체 너비) */}
        <div className="book-description-continue">
          {/* 이 영역은 CSS로 이미지 아래에 자동으로 배치됩니다 */}
        </div>
      </main>

      {/* 하단 액션 버튼 */}
      <footer className="book-detail-footer">
        <div className="footer-buttons-container">
          {book.category === '서평도서' && (
            <button className="review-apply-button" onClick={handleReviewApplyClick}>
              서평 신청
            </button>
          )}
          {book.purchaseUrl && (
            <button className="purchase-link-button" onClick={handlePurchaseClick}>
              구매링크
            </button>
          )}
        </div>
      </footer>

      {/* 전체 화면 이미지 뷰어 */}
      {showFullImage && book.imageUrl && (
        <div className="full-image-overlay" onClick={handleCloseFullImage}>
          <button className="full-image-close" onClick={handleCloseFullImage}>
            ×
          </button>
          <img 
            src={book.imageUrl} 
            alt={book.title}
            className="full-image"
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

export default BookDetailPage

