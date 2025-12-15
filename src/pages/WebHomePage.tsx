import React, { useState, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { User } from 'firebase/auth'
import BookDetailModal from '../components/BookDetailModal'
import { Book } from '../App'
import './WebHomePage.css'
// 아이콘 이미지 import
import mobileIcon from '../assets/icons/mobile.png'
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

interface WebHomePageProps {
  slides: Slide[] | null;
  adSlides: Slide[] | null;
  reviewBooks: Book[];
  publishedBooks: Book[];
  recommendedBooks: Book[];
  user: User | null;
  isAdmin: boolean;
  headerName: string;
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
  onLogout,
  onSwitchToMobile
}) => {
  const navigate = useNavigate()
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  // 모달 상태를 로컬로 관리 (App.tsx 리렌더링 방지)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [currentAdSlideIndex, setCurrentAdSlideIndex] = useState(0)
  const carouselContainerRef = useRef<HTMLDivElement | null>(null)
  // 도서 섹션 스크롤 위치 추적
  const reviewBooksRef = useRef<HTMLDivElement | null>(null)
  const publishedBooksRef = useRef<HTMLDivElement | null>(null)
  const recommendedBooksRef = useRef<HTMLDivElement | null>(null)
  const [reviewBooksScroll, setReviewBooksScroll] = useState({ canScrollLeft: false, canScrollRight: false })
  const [publishedBooksScroll, setPublishedBooksScroll] = useState({ canScrollLeft: false, canScrollRight: false })
  const [recommendedBooksScroll, setRecommendedBooksScroll] = useState({ canScrollLeft: false, canScrollRight: false })

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

  // 도서 클릭 핸들러 - 모달만 표시
  const handleBookClick = (e: React.MouseEvent | React.KeyboardEvent, book: Book) => {
    // 모든 기본 동작 차단
    e.preventDefault()
    e.stopPropagation()
    
    // 모달만 표시 (페이지 새로고침 없이)
    setSelectedBook(book)
    setIsModalOpen(true)
  }

  // 하트 클릭 시 모달이 닫히지 않도록 ref 추가
  const preventModalCloseRef = useRef(false)
  
  // 모달 닫기 핸들러 - 하트 클릭 시에는 호출되지 않도록 함
  const handleCloseModal = useCallback(() => {
    // 하트 처리 중이면 모달을 닫지 않음
    if (preventModalCloseRef.current) {
      console.log('handleCloseModal 호출 차단됨 (하트 처리 중)')
      return
    }
    console.log('handleCloseModal 호출됨')
    setIsModalOpen(false)
    setSelectedBook(null)
  }, [])

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
    <div className="publishing-website">
      {/* 헤더 */}
      <header className="main-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">📚</div>
            <div className="logo-text">
              <h1 style={{ fontSize: '16px', margin: 0, fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>출판도서</h1>
              <p style={{ fontSize: '16px', margin: '2px 0 0 0', fontWeight: 600, color: '#374151', lineHeight: 1.2 }}>Publishing Books</p>
            </div>
          </div>
          <div className="header-actions">
            {/* 모바일 뷰 전환 버튼 */}
            <button
              onClick={onSwitchToMobile}
              className="icon-btn mobile-view-btn"
              aria-label="모바일 뷰로 전환"
              title="모바일 뷰로 전환"
              style={{
                background: 'none',
                border: 'none',
                padding: '0',
                cursor: 'pointer'
              }}
            >
              <img src={mobileIcon} alt="모바일 뷰" style={{ width: '36px', height: '36px' }} />
            </button>
            {user ? (
              <>
                <div className="user-menu">
                  <Link to="/user" className="user-greeting">
                    안녕하세요, {headerName}님
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="admin-link">
                      <img src={dashboardIcon} alt="관리자" style={{ width: '36px', height: '36px', marginRight: '4px', verticalAlign: 'middle' }} />
                      관리자
                    </Link>
                  )}
                </div>
                <button
                  onClick={onLogout}
                  className="icon-btn logout-icon-btn"
                  aria-label="로그아웃"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0',
                    cursor: 'pointer'
                  }}
                >
                  <img src={logOutIcon} alt="로그아웃" style={{ width: '36px', height: '36px' }} />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="icon-btn login-icon-btn"
                aria-label="로그인"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0',
                  cursor: 'pointer',
                  textDecoration: 'none'
                }}
              >
                <img src={logInIcon} alt="로그인" style={{ width: '36px', height: '36px' }} />
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
              style={{ background: 'none', border: 'none', padding: '0', cursor: 'pointer' }}
            >
              <img src={leftWhiteIcon} alt="이전" style={{ width: '24px', height: '24px' }} />
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
              style={{ background: 'none', border: 'none', padding: '0', cursor: 'pointer' }}
            >
              <img src={rightWhiteIcon} alt="다음" style={{ width: '24px', height: '24px' }} />
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
            <div 
              className="books-container"
              ref={reviewBooksRef}
              onScroll={() => handleBookSectionScroll('review')}
            >
              {reviewBooks.slice(0, 6).map((book, index) => (
                <div 
                  key={book.id || index} 
                  className="book-card" 
                  onClick={(e) => handleBookClick(e, book)}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleBookClick(e as any, book)
                    }
                  }}
                >
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
            <div 
              className="books-container"
              ref={publishedBooksRef}
              onScroll={() => handleBookSectionScroll('published')}
            >
              {publishedBooks.slice(0, 6).map((book, index) => (
                <div 
                  key={book.id || index} 
                  className="book-card" 
                  onClick={(e) => handleBookClick(e, book)}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleBookClick(e as any, book)
                    }
                  }}
                >
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
        <section className="book-section">
          <div className="section-header">
            <h2>추천도서</h2>
            <Link to="/recommended" className="more-link">더보기 &gt;</Link>
          </div>
          <div className="books-carousel">
            <div 
              className="books-container"
              ref={recommendedBooksRef}
              onScroll={() => handleBookSectionScroll('recommended')}
            >
              {recommendedBooks.slice(0, 6).map((book, index) => (
                <div 
                  key={book.id || index} 
                  className="book-card" 
                  onClick={(e) => handleBookClick(e, book)}
                  role="button"
                  tabIndex={0}
                  style={{ cursor: 'pointer' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleBookClick(e as any, book)
                    }
                  }}
                >
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
        preventCloseRef={preventModalCloseRef}
      />
    </div>
  )
}

export default WebHomePage

