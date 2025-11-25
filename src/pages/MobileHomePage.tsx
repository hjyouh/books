import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { User } from 'firebase/auth'
import { Book } from '../App'
import './MobileHomePage.css'

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

interface MobileHomePageProps {
  slides: Slide[] | null;
  adSlides: Slide[] | null;
  reviewBooks: Book[];
  publishedBooks: Book[];
  recommendedBooks: Book[];
  user: User | null;
  isAdmin: boolean;
  headerName: string;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  onLoginClick: () => void;
  onLogout: () => void;
  onSwitchToWeb: () => void;
}

const MobileHomePage: React.FC<MobileHomePageProps> = ({
  slides,
  adSlides,
  reviewBooks,
  publishedBooks,
  recommendedBooks,
  user,
  isAdmin,
  headerName,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  onLoginClick,
  onLogout,
  onSwitchToWeb
}) => {
  const navigate = useNavigate()
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [currentAdSlideIndex, setCurrentAdSlideIndex] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const heroCarouselRef = useRef<HTMLElement | null>(null)

  // 터치 시작
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
    setIsDragging(true)
    setDragOffset(0)
  }

  // 터치 이동
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return
    e.preventDefault()
    e.stopPropagation()
    const currentTouch = e.targetTouches[0].clientX
    const diff = touchStart - currentTouch
    setDragOffset(diff)
    setTouchEnd(currentTouch)
  }

  // 터치 종료
  const handleTouchEnd = () => {
    if (!touchStart) {
      setIsDragging(false)
      setDragOffset(0)
      return
    }

    if (touchEnd === null) {
      setIsDragging(false)
      setDragOffset(0)
      setTouchStart(null)
      return
    }

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe && slides) {
      setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % slides.length)
    }
    if (isRightSwipe && slides) {
      setCurrentSlideIndex((prevIndex) => 
        prevIndex === 0 ? slides.length - 1 : prevIndex - 1
      )
    }

    setIsDragging(false)
    setDragOffset(0)
    setTouchStart(null)
    setTouchEnd(null)
  }

  // 슬라이드 클릭 핸들러
  const handleSlideClick = async (slide: Slide) => {
    if (!slide.linkUrl) return
    
    if (slide.linkType === 'book') {
      try {
        let bookId = slide.linkUrl
        if (bookId.includes('/')) {
          bookId = bookId.split('/').pop() || bookId
        }
        
        // 모바일에서는 페이지 전환 애니메이션 없이 바로 이동
        navigate(`/book/${bookId}`)
      } catch (error) {
        console.error('도서 로딩 오류:', error)
      }
    } else {
      window.open(slide.linkUrl, '_blank', 'noopener,noreferrer')
    }
  }

  // 도서 클릭 핸들러
  const handleBookClick = (book: Book) => {
    if (book.id) {
      // 모바일에서는 페이지 전환 애니메이션 없이 바로 이동
      navigate(`/book/${book.id}`)
    }
  }

  return (
    <div className="publishing-website mobile-viewport">
      {/* 헤더 */}
      <header className="main-header">
        <div className="header-content">
          <button
            className="mobile-hamburger-btn"
            aria-label="메뉴"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12H21M3 6H21M3 18H21" stroke="#ffffff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          <div className="mobile-header-title">
            <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>도서 출판</h1>
          </div>
          <button
            onClick={onSwitchToWeb}
            className="icon-btn mobile-view-btn"
            aria-label="웹 뷰로 전환"
            title="웹 뷰로 전환"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff'
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6H20V4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H8V18H4V6ZM20 8H8C6.9 8 6 8.9 6 10V20C6 21.1 6.9 22 8 22H20C21.1 22 22 21.1 22 20V10C22 8.9 21.1 8 20 8ZM20 20H8V10H20V20Z" fill="currentColor"/>
            </svg>
          </button>
          {/* 모바일 사이드바 메뉴 */}
          <div 
            className="mobile-menu-overlay"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="mobile-dropdown-menu">
            <div className="mobile-menu-items">
              {!user && (
                <button
                  className="mobile-menu-item"
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    onLoginClick()
                  }}
                >
                  로그인
                </button>
              )}
              {user && (
                <>
                  <div className="mobile-menu-user-info">
                    안녕하세요, {headerName}님
                  </div>
                  <Link 
                    to="/user" 
                    className="mobile-menu-item"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    마이페이지
                  </Link>
                  {isAdmin && (
                    <Link 
                      to="/admin" 
                      className="mobile-menu-item"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      관리자
                    </Link>
                  )}
                  <button
                    className="mobile-menu-item"
                    onClick={() => {
                      setIsMobileMenuOpen(false)
                      onLogout()
                    }}
                  >
                    로그아웃
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 모바일 콘텐츠 영역 (헤더 제외, 메뉴 열릴 때 이동) */}
      <div 
        className="mobile-content-wrapper"
        onClick={() => {
          // 메뉴가 열려있을 때 콘텐츠 영역 클릭 시 메뉴 닫기
          if (isMobileMenuOpen) {
            setIsMobileMenuOpen(false)
          }
        }}
      >
      {/* 메인 캐러셀 - 메인슬라이드 */}
      {slides && slides.length > 0 ? (
        <section 
          ref={heroCarouselRef}
          className="hero-carousel card-slider"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            touchAction: 'pan-x',
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div 
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
                  onClick={() => {
                    if (!isDragging && Math.abs(dragOffset) < 10) {
                      handleSlideClick(slide)
                    }
                  }}
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
        </section>
      ) : null}

      {/* 서평도서 섹션 */}
      {reviewBooks.length > 0 && (
        <section className={`book-section mobile-book-section ${reviewBooks.length === 1 ? 'single-book-section' : ''}`}>
          <div className="section-header">
            <h2>서평도서</h2>
          </div>
          <div className={`books-carousel ${reviewBooks.length === 1 ? 'single-carousel' : ''}`}>
            <div className={`books-container mobile-books-container ${reviewBooks.length === 1 ? 'single-card-container' : ''}`}>
              {reviewBooks.slice(0, 6).map((book, index) => (
                <div key={book.id || index} className="book-card mobile-book-card" onClick={() => handleBookClick(book)}>
                  <div className="mobile-book-card-content">
                    {book.imageUrl ? (
                      <img src={book.imageUrl} alt={book.title} className="mobile-book-cover-image" />
                    ) : (
                      <div className="mobile-placeholder-cover">책 이미지</div>
                    )}
                    <div className="mobile-book-overlay">
                      <div className="mobile-book-author">{book.author}</div>
                      <div className="mobile-book-info">
                        <h3 className="mobile-book-title">{book.title}</h3>
                        <p className="mobile-book-subtitle">{book.description ? book.description.substring(0, 30) + '...' : '부제'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 출간도서 섹션 */}
      {publishedBooks.length > 0 && (
        <section className={`book-section mobile-book-section ${publishedBooks.length === 1 ? 'single-book-section' : ''}`}>
          <div className="section-header">
            <h2>출간도서</h2>
          </div>
          <div className={`books-carousel ${publishedBooks.length === 1 ? 'single-carousel' : ''}`}>
            <div className={`books-container mobile-books-container ${publishedBooks.length === 1 ? 'single-card-container' : ''}`}>
              {publishedBooks.slice(0, 6).map((book, index) => (
                <div key={book.id || index} className="book-card mobile-book-card" onClick={() => handleBookClick(book)}>
                  <div className="mobile-book-card-content">
                    {book.imageUrl ? (
                      <img src={book.imageUrl} alt={book.title} className="mobile-book-cover-image" />
                    ) : (
                      <div className="mobile-placeholder-cover">책 이미지</div>
                    )}
                    <div className="mobile-book-overlay">
                      <div className="mobile-book-author">{book.author}</div>
                      <div className="mobile-book-info">
                        <h3 className="mobile-book-title">{book.title}</h3>
                        <p className="mobile-book-subtitle">{book.description ? book.description.substring(0, 30) + '...' : '부제'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
              transform: `translateX(calc(-${currentAdSlideIndex} * 100vw))`
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
        <section className={`book-section mobile-book-section ${recommendedBooks.length === 1 ? 'single-book-section' : ''}`}>
          <div className="section-header">
            <h2>추천도서</h2>
          </div>
          <div className={`books-carousel ${recommendedBooks.length === 1 ? 'single-carousel' : ''}`}>
            <div className={`books-container mobile-books-container ${recommendedBooks.length === 1 ? 'single-card-container' : ''}`}>
              {recommendedBooks.slice(0, 6).map((book, index) => (
                <div key={book.id || index} className="book-card mobile-book-card" onClick={() => handleBookClick(book)}>
                  <div className="mobile-book-card-content">
                    {book.imageUrl ? (
                      <img src={book.imageUrl} alt={book.title} className="mobile-book-cover-image" />
                    ) : (
                      <div className="mobile-placeholder-cover">책 이미지</div>
                    )}
                    <div className="mobile-book-overlay">
                      <div className="mobile-book-author">{book.author}</div>
                      <div className="mobile-book-info">
                        <h3 className="mobile-book-title">{book.title}</h3>
                        <p className="mobile-book-subtitle">{book.description ? book.description.substring(0, 30) + '...' : '부제'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
      </div>
    </div>
  )
}

export default MobileHomePage

