import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { User } from 'firebase/auth'
import BookDetailModal from '../components/BookDetailModal'
import { Book } from '../App'
import './WebHomePage.css'

interface Slide {
  id: string;
  slideType?: 'main' | 'ad';
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  linkType: 'book' | 'custom';
  order: number;
  isActive: boolean;
  postingStart?: any;
  postingEnd?: any;
  titleColor?: string;
  subtitleColor?: string;
}

interface WebHomePageProps {
  slides: Slide[] | null;
  adSlides: Slide[] | null;
  reviewBooks: Book[];
  publishedBooks: Book[];
  recommendedBooks: Book[];
  user: User | null;
  isAdmin: boolean;
  headerName: string;
  selectedBook: Book | null;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  setSelectedBook: (book: Book | null) => void;
  onLogout: () => void;
  onSwitchToMobile: () => void;
}

const WebHomePage: React.FC<WebHomePageProps> = ({
  slides,
  adSlides,
  reviewBooks,
  publishedBooks,
  recommendedBooks,
  user,
  isAdmin,
  headerName,
  selectedBook,
  isModalOpen,
  setIsModalOpen,
  setSelectedBook,
  onLogout,
  onSwitchToMobile
}) => {
  const navigate = useNavigate()
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [currentAdSlideIndex, setCurrentAdSlideIndex] = useState(0)
  const carouselContainerRef = useRef<HTMLDivElement | null>(null)

  // 슬라이드 클릭 핸들러
  const handleSlideClick = async (slide: Slide) => {
    if (!slide.linkUrl) return
    
    if (slide.linkType === 'book') {
      try {
        let bookId = slide.linkUrl
        if (bookId.includes('/')) {
          bookId = bookId.split('/').pop() || bookId
        }
        
        const bookDoc = await getDoc(doc(db, 'books', bookId))
        if (bookDoc.exists()) {
          const bookData = { id: bookDoc.id, ...bookDoc.data() } as Book
          setSelectedBook(bookData)
          setIsModalOpen(true)
        }
      } catch (error) {
        console.error('도서 로딩 오류:', error)
      }
    } else {
      window.open(slide.linkUrl, '_blank', 'noopener,noreferrer')
    }
  }

  // 도서 클릭 핸들러
  const handleBookClick = (book: Book) => {
    setSelectedBook(book)
    setIsModalOpen(true)
  }

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedBook(null)
  }

  return (
    <div className="publishing-website">
      {/* 헤더 */}
      <header className="main-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">📚</div>
            <div className="logo-text">
              <h1 style={{ fontSize: '16px', margin: 0, fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>출판도서</h1>
              <p style={{ fontSize: '16px', margin: '2px 0 0 0', fontWeight: 600, color: '#374151', lineHeight: 1.2 }}>Publishing House</p>
            </div>
          </div>
          <div className="header-actions">
            {/* 모바일 뷰 전환 버튼 */}
            <button
              onClick={onSwitchToMobile}
              className="icon-btn mobile-view-btn"
              aria-label="모바일 뷰로 전환"
              title="모바일 뷰로 전환"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 2H7C5.9 2 5 2.9 5 4V20C5 21.1 5.9 22 7 22H17C18.1 22 19 21.1 19 20V4C19 2.9 18.1 2 17 2ZM17 20H7V4H17V20Z" fill="currentColor"/>
                <path d="M12 17.5C12.83 17.5 13.5 16.83 13.5 16C13.5 15.17 12.83 14.5 12 14.5C11.17 14.5 10.5 15.17 10.5 16C10.5 16.83 11.17 17.5 12 17.5Z" fill="currentColor"/>
              </svg>
            </button>
            {user ? (
              <>
                <div className="user-menu">
                  <Link to="/user" className="user-greeting">
                    안녕하세요, {headerName}님
                  </Link>
                  {isAdmin && <Link to="/admin" className="admin-link">관리자</Link>}
                </div>
                <button
                  onClick={onLogout}
                  className="icon-btn logout-icon-btn"
                  aria-label="로그아웃"
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: '8px'
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9M16 17L21 12M21 12L16 7M21 12H9" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="icon-btn login-icon-btn"
                aria-label="로그인"
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: '8px',
                  textDecoration: 'none'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15M10 17L5 12M5 12L10 7M5 12H15" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 메인 캐러셀 - 메인슬라이드 */}
      {slides && slides.length > 0 ? (
        <section 
          className="hero-carousel card-slider"
          style={{
            overscrollBehavior: 'contain',
            overscrollBehaviorX: 'contain',
            overscrollBehaviorY: 'none'
          }}
        >
          <div 
            ref={carouselContainerRef}
            className="carousel-container card-slider-container"
            style={{
              overscrollBehavior: 'contain',
              overscrollBehaviorX: 'contain',
              overscrollBehaviorY: 'none',
              touchAction: 'pan-x'
            }}
          >
            {slides.map((slide, index) => {
              const isActive = index === currentSlideIndex
              const isPrev = index === (currentSlideIndex - 1 + slides.length) % slides.length
              const isNext = index === (currentSlideIndex + 1) % slides.length
              
              return (
                <div
                  key={`${slide.id}-${index}`}
                  className={`carousel-slide ${isActive ? 'active' : ''} ${isPrev ? 'prev' : ''} ${isNext ? 'next' : ''}`}
                  onClick={() => handleSlideClick(slide)}
                  style={{ cursor: slide.linkUrl ? 'pointer' : 'default' }}
                >
                  <div className="slide-content">
                    {slide.imageUrl ? (
                      <div 
                        className="slide-bg"
                        style={{
                          backgroundImage: `url(${slide.imageUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          width: '100%',
                          height: '100%'
                        }}
                      ></div>
                    ) : (
                      <div className="slide-bg library-bg"></div>
                    )}
                    <div className="slide-text">
                      <h2 style={{ color: slide.titleColor || '#FFFFFF' }}>
                        {slide.title}
                      </h2>
                      <p style={{ color: slide.subtitleColor || '#FFFFFF' }}>
                        {slide.subtitle}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="carousel-controls">
            <button 
              type="button"
              className="carousel-prev"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (carouselContainerRef.current) {
                  const container = carouselContainerRef.current
                  const slideWidth = 540 + 20
                  const newIndex = currentSlideIndex === 0 ? (slides?.length || 1) - 1 : currentSlideIndex - 1
                  container.scrollLeft = newIndex * slideWidth
                  setCurrentSlideIndex(newIndex)
                } else {
                  setCurrentSlideIndex((prevIndex) => 
                    prevIndex === 0 ? (slides?.length || 1) - 1 : prevIndex - 1
                  )
                }
              }}
            >
              ‹
            </button>
            <button 
              type="button"
              className="carousel-next"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (carouselContainerRef.current) {
                  const container = carouselContainerRef.current
                  const slideWidth = 540 + 20
                  const newIndex = (currentSlideIndex + 1) % (slides?.length || 1)
                  container.scrollLeft = newIndex * slideWidth
                  setCurrentSlideIndex(newIndex)
                } else {
                  setCurrentSlideIndex((prevIndex) => 
                    (prevIndex + 1) % (slides?.length || 1)
                  )
                }
              }}
            >
              ›
            </button>
          </div>
          <div className="carousel-dots">
            {slides && slides.length > 0 && slides.map((_, index) => {
              const displayIndex = currentSlideIndex % slides.length
              return (
                <span
                  key={`dot-${index}`}
                  className={`dot ${index === displayIndex ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (carouselContainerRef.current) {
                      const container = carouselContainerRef.current
                      const slideWidth = 540 + 20
                      container.scrollLeft = index * slideWidth
                    }
                    setCurrentSlideIndex(index)
                  }}
                ></span>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* 서평도서 섹션 */}
      {reviewBooks.length > 0 && (
        <section className="book-section">
          <div className="section-header">
            <h2>서평도서</h2>
            <Link to="/reviews" className="more-link">더보기 &gt;</Link>
          </div>
          <div className="books-carousel">
            <div className="books-container">
              {reviewBooks.slice(0, 6).map((book, index) => (
                <div key={book.id || index} className="book-card" onClick={() => handleBookClick(book)}>
                  <div className="book-cover">
                    {book.imageUrl ? (
                      <img src={book.imageUrl} alt={book.title} />
                    ) : (
                      <div className="placeholder-cover"></div>
                    )}
                    <div className="book-info">
                      <h3>{book.title}</h3>
                      <p className="author">{book.author}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="carousel-arrows">
              <button className="arrow-left">‹</button>
              <button className="arrow-right">›</button>
            </div>
            <div className="carousel-dots">
              <span className="dot active"></span>
              <span className="dot"></span>
            </div>
          </div>
        </section>
      )}

      {/* 출간도서 섹션 */}
      {publishedBooks.length > 0 && (
        <section className="book-section">
          <div className="section-header">
            <h2>출간도서</h2>
            <Link to="/published" className="more-link">더보기 &gt;</Link>
          </div>
          <div className="books-carousel">
            <div className="books-container">
              {publishedBooks.slice(0, 6).map((book, index) => (
                <div key={book.id || index} className="book-card" onClick={() => handleBookClick(book)}>
                  <div className="book-cover">
                    {book.imageUrl ? (
                      <img src={book.imageUrl} alt={book.title} />
                    ) : (
                      <div className="placeholder-cover"></div>
                    )}
                    <div className="book-info">
                      <h3>{book.title}</h3>
                      <p className="author">{book.author}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="carousel-arrows">
              <button className="arrow-left">‹</button>
              <button className="arrow-right">›</button>
            </div>
            <div className="carousel-dots">
              <span className="dot active"></span>
              <span className="dot"></span>
            </div>
          </div>
        </section>
      )}

      {/* 광고 슬라이드 섹션 */}
      {adSlides && adSlides.length > 0 ? (
        <section className="hero-carousel">
          <div 
            className="carousel-container"
            style={{
              transform: `translateX(calc(-${currentAdSlideIndex} * (540px + 16px)))`
            }}
          >
            {(adSlides.length > 1 ? [...adSlides, ...adSlides] : adSlides).map((slide, index) => (
              <div
                key={`ad-${slide.id}-${index}`}
                className="carousel-slide"
                onClick={() => handleSlideClick(slide)}
                style={{ cursor: slide.linkUrl ? 'pointer' : 'default' }}
              >
                <div className="slide-content">
                  {slide.imageUrl ? (
                    <div 
                      className="slide-bg"
                      style={{
                        backgroundImage: `url(${slide.imageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        width: '100%',
                        height: '100%'
                      }}
                    ></div>
                  ) : (
                    <div className="slide-bg library-bg"></div>
                  )}
                  <div className="slide-text">
                    <h2 style={{ color: slide.titleColor || '#FFFFFF' }}>
                      {slide.title}
                    </h2>
                    <p style={{ color: slide.subtitleColor || '#FFFFFF' }}>
                      {slide.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {adSlides.length > 1 && (
            <>
              <div className="carousel-controls">
                <button 
                  className="carousel-prev"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setCurrentAdSlideIndex((prevIndex) => 
                      prevIndex === 0 ? adSlides.length - 1 : prevIndex - 1
                    )
                  }}
                >
                  ‹
                </button>
                <button 
                  className="carousel-next"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setCurrentAdSlideIndex((prevIndex) => 
                      (prevIndex + 1) % adSlides.length
                    )
                  }}
                >
                  ›
                </button>
              </div>
              <div className="carousel-dots">
                {adSlides.map((_, index) => {
                  const displayIndex = currentAdSlideIndex % adSlides.length
                  return (
                    <span
                      key={index}
                      className={`dot ${index === displayIndex ? 'active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setCurrentAdSlideIndex(index)
                      }}
                    ></span>
                  )
                })}
              </div>
            </>
          )}
        </section>
      ) : null}

      {/* 추천도서 섹션 */}
      {recommendedBooks.length > 0 && (
        <section className="book-section">
          <div className="section-header">
            <h2>추천도서</h2>
            <Link to="/recommended" className="more-link">더보기 &gt;</Link>
          </div>
          <div className="books-carousel">
            <div className="books-container">
              {recommendedBooks.slice(0, 6).map((book, index) => (
                <div key={book.id || index} className="book-card" onClick={() => handleBookClick(book)}>
                  <div className="book-cover">
                    {book.imageUrl ? (
                      <img src={book.imageUrl} alt={book.title} />
                    ) : (
                      <div className="placeholder-cover"></div>
                    )}
                    <div className="book-info">
                      <h3>{book.title}</h3>
                      <p className="author">{book.author}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="carousel-arrows">
              <button className="arrow-left">‹</button>
              <button className="arrow-right">›</button>
            </div>
            <div className="carousel-dots">
              <span className="dot active"></span>
              <span className="dot"></span>
            </div>
          </div>
        </section>
      )}

      {/* 푸터 */}
      <footer className="main-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>출판사 정보</h3>
            <p>주식회사 출판도서</p>
            <p>대표: 김출판</p>
            <p>사업자등록번호: 123-45-67890</p>
          </div>
          <div className="footer-section">
            <h3>연락처</h3>
            <p>전화: 02-1234-5678</p>
            <p>팩스: 02-1234-5679</p>
            <p>이메일: info@publishing.com</p>
          </div>
          <div className="footer-section">
            <h3>위치</h3>
            <p>서울특별시 강남구</p>
            <p>테헤란로 123, 456호</p>
            <p>우편번호: 06234</p>
          </div>
          <div className="footer-section">
            <h3>사업자 정보</h3>
            <p>통신판매업신고: 2024-서울강남-1234</p>
            <p>개인정보보호책임자: 이개인</p>
            <p>고객센터: 1588-1234</p>
          </div>
        </div>
      </footer>

      {/* 도서 상세 모달 */}
      <BookDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        book={selectedBook}
        user={user}
      />
    </div>
  )
}

export default WebHomePage

