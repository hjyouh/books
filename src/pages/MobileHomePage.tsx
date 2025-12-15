import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User } from 'firebase/auth'
import { Book } from '../App'
import { Carousel } from 'react-bootstrap'
import './MobileHomePage.css'
// 아이콘 이미지 import
import mobileMenuIcon from '../assets/icons/mobile-menu-white.png'
import browserIcon from '../assets/icons/browser-white.png'
import dashboardIcon from '../assets/icons/dashboard.png'
import logInIcon from '../assets/icons/log-in.png'
import logOutIcon from '../assets/icons/log-out.png'
import leftWhiteIcon from '../assets/icons/left-white.png'
import rightWhiteIcon from '../assets/icons/right-white.png'

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
  // 도서 섹션 스크롤 위치 추적
  const reviewBooksRef = React.useRef<HTMLDivElement | null>(null)
  const publishedBooksRef = React.useRef<HTMLDivElement | null>(null)
  const recommendedBooksRef = React.useRef<HTMLDivElement | null>(null)
  const [reviewBooksScroll, setReviewBooksScroll] = React.useState({ canScrollLeft: false, canScrollRight: false })
  const [publishedBooksScroll, setPublishedBooksScroll] = React.useState({ canScrollLeft: false, canScrollRight: false })
  const [recommendedBooksScroll, setRecommendedBooksScroll] = React.useState({ canScrollLeft: false, canScrollRight: false })

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

  // HTML 태그 제거 함수
  const stripHtmlTags = (html: string | undefined): string => {
    if (!html) return ''
    // HTML 태그를 정규식으로 제거
    return html.replace(/<[^>]*>/g, '').trim()
  }

  // 도서 섹션 스크롤 가능 여부 확인 함수
  const checkScrollable = (container: HTMLDivElement | null, setState: (state: { canScrollLeft: boolean, canScrollRight: boolean }) => void) => {
    if (!container) return
    const { scrollLeft, scrollWidth, clientWidth } = container
    // 스크롤이 가능한지 확인 (스크롤 가능한 너비가 실제 보이는 너비보다 큰지)
    const isScrollable = scrollWidth > clientWidth
    setState({
      canScrollLeft: isScrollable && scrollLeft > 1, // 1px 여유를 둠 (반올림 오차 방지)
      canScrollRight: isScrollable && scrollLeft < scrollWidth - clientWidth - 1
    })
  }

  // 도서 섹션 스크롤 핸들러
  const handleBookSectionScroll = (section: 'review' | 'published' | 'recommended') => {
    const refs = {
      review: reviewBooksRef,
      published: publishedBooksRef,
      recommended: recommendedBooksRef
    }
    const setters = {
      review: setReviewBooksScroll,
      published: setPublishedBooksScroll,
      recommended: setRecommendedBooksScroll
    }
    checkScrollable(refs[section].current, setters[section])
  }

  // 도서 섹션 스크롤 함수
  const scrollBookSection = (section: 'review' | 'published' | 'recommended', direction: 'left' | 'right') => {
    const refs = {
      review: reviewBooksRef,
      published: publishedBooksRef,
      recommended: recommendedBooksRef
    }
    const container = refs[section].current
    if (!container) return
    
    const scrollAmount = 300 // 한 번에 스크롤할 거리
    const newScrollLeft = direction === 'left' 
      ? container.scrollLeft - scrollAmount 
      : container.scrollLeft + scrollAmount
    
    container.scrollTo({ left: newScrollLeft, behavior: 'smooth' })
    
    // 스크롤 후 상태 업데이트
    setTimeout(() => handleBookSectionScroll(section), 100)
  }

  // 컴포넌트 마운트 및 도서 데이터 변경 시 스크롤 가능 여부 확인
  React.useEffect(() => {
    const checkAllSections = () => {
      // DOM이 완전히 렌더링된 후 확인
      setTimeout(() => {
        checkScrollable(reviewBooksRef.current, setReviewBooksScroll)
        checkScrollable(publishedBooksRef.current, setPublishedBooksScroll)
        checkScrollable(recommendedBooksRef.current, setRecommendedBooksScroll)
      }, 200)
    }
    
    // 초기 확인
    checkAllSections()
    
    // 리사이즈 시 재확인
    window.addEventListener('resize', checkAllSections)
    return () => window.removeEventListener('resize', checkAllSections)
  }, [reviewBooks, publishedBooks, recommendedBooks])

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
              padding: '0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img src={mobileMenuIcon} alt="메뉴" style={{ width: '24px', height: '24px' }} />
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
              background: 'none',
              border: 'none',
              padding: '0',
              cursor: 'pointer'
            }}
          >
            <img src={browserIcon} alt="웹 뷰" style={{ width: '24px', height: '24px' }} />
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
                  <img src={logInIcon} alt="로그인" style={{ width: '36px', height: '36px', marginRight: '8px', verticalAlign: 'middle' }} />
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
                      <img src={dashboardIcon} alt="관리자" style={{ width: '36px', height: '36px', marginRight: '8px', verticalAlign: 'middle' }} />
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
                    <img src={logOutIcon} alt="로그아웃" style={{ width: '36px', height: '36px', marginRight: '8px', verticalAlign: 'middle' }} />
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
        <section className="hero-carousel card-slider">
          <Carousel
            activeIndex={currentSlideIndex}
            onSelect={(selectedIndex: number) => setCurrentSlideIndex(selectedIndex)}
            controls={slides.length > 1}
            indicators={slides.length > 1}
            interval={null}
            touch={true}
            className="mobile-main-carousel"
          >
            {slides.map((slide, index) => (
              <Carousel.Item key={`${slide.id}-${index}`}>
                <div
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
              </Carousel.Item>
            ))}
          </Carousel>
        </section>
      ) : null}

      {/* 서평도서 섹션 */}
      {reviewBooks.length > 0 && (
        <section className={`book-section mobile-book-section ${reviewBooks.length === 1 ? 'single-book-section' : ''}`}>
          <div className="section-header">
            <h2>서평도서</h2>
          </div>
          <div className={`books-carousel ${reviewBooks.length === 1 ? 'single-carousel' : ''}`}>
            <div 
              className={`books-container mobile-books-container ${reviewBooks.length === 1 ? 'single-card-container' : ''}`}
              ref={reviewBooksRef}
              onScroll={() => handleBookSectionScroll('review')}
            >
              {reviewBooks.slice(0, 6).map((book, index) => (
                <div key={book.id || index} className="book-card mobile-book-card" onClick={() => handleBookClick(book)}>
                  <div className="mobile-book-card-content">
                    {book.imageUrl ? (
                      <img src={book.imageUrl} alt={book.title} className="mobile-book-cover-image" />
                    ) : (
                      <div className="mobile-placeholder-cover">책 이미지</div>
                    )}
                    <div className="mobile-book-overlay">
                      <div className="mobile-book-info">
                        <h3 className="mobile-book-title">{stripHtmlTags(book.title)}</h3>
                        <div className="mobile-book-author">{stripHtmlTags(book.author)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {(reviewBooksScroll.canScrollLeft || reviewBooksScroll.canScrollRight) && (
              <div className="carousel-arrows">
                {reviewBooksScroll.canScrollLeft && (
                  <button 
                    className="arrow-left" 
                    onClick={() => scrollBookSection('review', 'left')}
                  >
                    <img src={leftWhiteIcon} alt="이전" />
                  </button>
                )}
                {reviewBooksScroll.canScrollRight && (
                  <button 
                    className="arrow-right" 
                    onClick={() => scrollBookSection('review', 'right')}
                  >
                    <img src={rightWhiteIcon} alt="다음" />
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 출간도서 섹션 */}
      {publishedBooks.length > 0 && (
        <section className={`book-section mobile-book-section published-books-section ${publishedBooks.length === 1 ? 'single-book-section' : ''}`}>
          <div className="section-header">
            <h2>출간도서</h2>
          </div>
          <div className={`books-carousel ${publishedBooks.length === 1 ? 'single-carousel' : ''}`}>
            <div 
              className={`books-container mobile-books-container ${publishedBooks.length === 1 ? 'single-card-container' : ''}`}
              ref={publishedBooksRef}
              onScroll={() => handleBookSectionScroll('published')}
            >
              {publishedBooks.slice(0, 6).map((book, index) => (
                <div key={book.id || index} className="book-card mobile-book-card" onClick={() => handleBookClick(book)}>
                  <div className="mobile-book-card-content">
                    {book.imageUrl ? (
                      <img src={book.imageUrl} alt={book.title} className="mobile-book-cover-image" />
                    ) : (
                      <div className="mobile-placeholder-cover">책 이미지</div>
                    )}
                    <div className="mobile-book-overlay">
                      <div className="mobile-book-info">
                        <h3 className="mobile-book-title">{stripHtmlTags(book.title)}</h3>
                        <div className="mobile-book-author">{stripHtmlTags(book.author)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {(publishedBooksScroll.canScrollLeft || publishedBooksScroll.canScrollRight) && (
              <div className="carousel-arrows">
                {publishedBooksScroll.canScrollLeft && (
                  <button 
                    className="arrow-left" 
                    onClick={() => scrollBookSection('published', 'left')}
                  >
                    <img src={leftWhiteIcon} alt="이전" />
                  </button>
                )}
                {publishedBooksScroll.canScrollRight && (
                  <button 
                    className="arrow-right" 
                    onClick={() => scrollBookSection('published', 'right')}
                  >
                    <img src={rightWhiteIcon} alt="다음" />
                  </button>
                )}
              </div>
            )}
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
                  style={{ background: 'none', border: 'none', padding: '0', cursor: 'pointer' }}
                >
                  <img src={leftWhiteIcon} alt="이전" style={{ width: '24px', height: '24px' }} />
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
                  style={{ background: 'none', border: 'none', padding: '0', cursor: 'pointer' }}
                >
                  <img src={rightWhiteIcon} alt="다음" style={{ width: '24px', height: '24px' }} />
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
            <div 
              className={`books-container mobile-books-container ${recommendedBooks.length === 1 ? 'single-card-container' : ''}`}
              ref={recommendedBooksRef}
              onScroll={() => handleBookSectionScroll('recommended')}
            >
              {recommendedBooks.slice(0, 6).map((book, index) => (
                <div key={book.id || index} className="book-card mobile-book-card" onClick={() => handleBookClick(book)}>
                  <div className="mobile-book-card-content">
                    {book.imageUrl ? (
                      <img src={book.imageUrl} alt={book.title} className="mobile-book-cover-image" />
                    ) : (
                      <div className="mobile-placeholder-cover">책 이미지</div>
                    )}
                    <div className="mobile-book-overlay">
                      <div className="mobile-book-info">
                        <h3 className="mobile-book-title">{stripHtmlTags(book.title)}</h3>
                        <div className="mobile-book-author">{stripHtmlTags(book.author)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {(recommendedBooksScroll.canScrollLeft || recommendedBooksScroll.canScrollRight) && (
              <div className="carousel-arrows">
                {recommendedBooksScroll.canScrollLeft && (
                  <button 
                    className="arrow-left" 
                    onClick={() => scrollBookSection('recommended', 'left')}
                  >
                    <img src={leftWhiteIcon} alt="이전" />
                  </button>
                )}
                {recommendedBooksScroll.canScrollRight && (
                  <button 
                    className="arrow-right" 
                    onClick={() => scrollBookSection('recommended', 'right')}
                  >
                    <img src={rightWhiteIcon} alt="다음" />
                  </button>
                )}
              </div>
            )}
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

