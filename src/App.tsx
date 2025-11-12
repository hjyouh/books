import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { db, auth } from './firebase'
import { collection, addDoc, getDocs, Timestamp, doc, getDoc, onSnapshot, query, orderBy } from 'firebase/firestore'
import { onAuthStateChanged, User, signOut } from 'firebase/auth'
import NewSignupPage from './pages/NewSignupPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import UserPage from './pages/UserPage'
import BookDetailModal from './components/BookDetailModal'
import './App.css'

interface Book {
  id?: string;
  title: string;
  author: string;
  rating: number;
  review: string;
  createdAt: Timestamp;
  category?: string;
  genre?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  imageUrl?: string;
  status?: string;
  reviewCount?: number;
}

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
  titleColor?: string;
  subtitleColor?: string;
}

function App() {
  const [books, setBooks] = useState<Book[]>([])
  const [slides, setSlides] = useState<Slide[] | null>(null) // null로 시작하여 초기 렌더링 방지 (메인 슬라이드)
  const [adSlides, setAdSlides] = useState<Slide[] | null>(null) // 광고 슬라이드
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [currentAdSlideIndex, setCurrentAdSlideIndex] = useState(0)
  const slideIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const adSlideIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const slideWidthRef = useRef<number>(0)
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    rating: 5,
    review: ''
  })
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [headerName, setHeaderName] = useState('사용자')
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true) // 초기 로딩 상태

  // Firestore에서 책 목록 실시간으로 가져오기
  useEffect(() => {
    const booksRef = collection(db, 'books')
    const q = query(booksRef, orderBy('createdAt', 'desc'))
    
    // 실시간 리스너 설정
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const booksData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Book[]
        setBooks(booksData)
        setLoading(false)
        // 도서 데이터 로드 완료 (초기 로딩은 별도 useEffect에서 처리)
      },
      (error: any) => {
        console.error('Error fetching books: ', error)
        setLoading(false)
        // 도서 데이터 로드 완료 (초기 로딩은 별도 useEffect에서 처리)
      }
    )

    // 초기 로딩 상태 설정
    setLoading(true)

    // 컴포넌트 언마운트 시 리스너 해제
    return () => unsubscribe()
  }, [slides])

  // 슬라이드 데이터 가져오기 (활성화된 슬라이드만, order 순서대로)
  useEffect(() => {
    const slidesRef = collection(db, 'slides')
    const q = query(slidesRef, orderBy('order', 'asc'))
    
    let isFirstSnapshot = true // 첫 번째 스냅샷인지 확인
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const slidesData = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data()
          })) as Slide[]
        
        // 활성화된 메인 슬라이드만 필터링하고 정렬
        const activeMainSlides = slidesData
          .filter(slide => slide.isActive && (slide.slideType === 'main' || !slide.slideType))
          .sort((a, b) => a.order - b.order)
        
        // 디버깅: 슬라이드 개수 확인
        console.log('전체 슬라이드:', slidesData.length)
        console.log('슬라이드 데이터:', slidesData.map(s => ({ id: s.id, isActive: s.isActive, slideType: s.slideType, order: s.order })))
        console.log('활성 메인 슬라이드:', activeMainSlides.length, activeMainSlides.map(s => ({ id: s.id, order: s.order })))
        
        // 활성화된 광고 슬라이드만 필터링하고 정렬
        const activeAdSlides = slidesData
          .filter(slide => slide.isActive && slide.slideType === 'ad')
          .sort((a, b) => a.order - b.order)
        
        // 첫 번째 스냅샷에서만 처리 (초기 로딩 완료 표시)
        if (isFirstSnapshot) {
          isFirstSnapshot = false
          
          // 슬라이드가 로드되면 인덱스를 0으로 초기화 (첫 번째 슬라이드부터 시작)
          if (activeMainSlides.length > 0) {
            setCurrentSlideIndex(0)
          }
          if (activeAdSlides.length > 0) {
            setCurrentAdSlideIndex(0)
          }
          
          // 약간의 지연 후 슬라이드 설정 (초기 렌더링 방지)
          setTimeout(() => {
            setSlides(activeMainSlides.length > 0 ? activeMainSlides : [])
            setAdSlides(activeAdSlides.length > 0 ? activeAdSlides : [])
            // 슬라이드 데이터 로드 완료 (초기 로딩은 별도 useEffect에서 처리)
          }, 100)
        } else {
          // 이후 업데이트는 즉시 반영
          if (activeMainSlides.length > 0) {
            setCurrentSlideIndex(0)
          }
          if (activeAdSlides.length > 0) {
            setCurrentAdSlideIndex(0)
          }
          setSlides(activeMainSlides.length > 0 ? activeMainSlides : [])
          setAdSlides(activeAdSlides.length > 0 ? activeAdSlides : [])
        }
        
        // 슬라이드 너비 계산 (3.5개가 보이도록)
        if (typeof window !== 'undefined') {
          const viewportWidth = window.innerWidth
          const padding = 80 // 좌우 패딩 40px * 2
          const gaps = 48 // 슬라이드 간 간격 16px * 3
          slideWidthRef.current = (viewportWidth - padding - gaps) / 3.5
        }
      },
      (error: any) => {
        console.error('Error fetching slides: ', error)
        setSlides([]) // 에러 시 빈 배열 설정
      }
    )

    return () => unsubscribe()
  }, [])

  // 자동 슬라이드 전환 (5초 간격) - 한 슬라이드씩 이동하여 빈칸 없이 표시 (메인 슬라이드)
  useEffect(() => {
    if (!slides || slides.length === 0) return

    // 기존 인터벌 클리어
    if (slideIntervalRef.current) {
      clearInterval(slideIntervalRef.current)
    }

    // 5초마다 다음 슬라이드로 이동 (한 슬라이드씩)
    slideIntervalRef.current = setInterval(() => {
      setCurrentSlideIndex((prevIndex) => {
        // 무한 루프: 마지막 슬라이드에서 다음은 첫 번째 슬라이드
        return (prevIndex + 1) % slides!.length
      })
    }, 5000)

    return () => {
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current)
      }
    }
  }, [slides])

  // 자동 광고 슬라이드 전환 (5초 간격) - 한 슬라이드씩 이동하여 빈칸 없이 표시 (광고 슬라이드)
  useEffect(() => {
    if (!adSlides || adSlides.length === 0) return

    // 기존 인터벌 클리어
    if (adSlideIntervalRef.current) {
      clearInterval(adSlideIntervalRef.current)
    }

    // 5초마다 다음 슬라이드로 이동 (한 슬라이드씩)
    adSlideIntervalRef.current = setInterval(() => {
      setCurrentAdSlideIndex((prevIndex) => {
        // 무한 루프: 마지막 슬라이드에서 다음은 첫 번째 슬라이드
        return (prevIndex + 1) % adSlides!.length
      })
    }, 5000)

    return () => {
      if (adSlideIntervalRef.current) {
        clearInterval(adSlideIntervalRef.current)
      }
    }
  }, [adSlides])

  // 슬라이드가 끝에 도달했을 때 처음으로 리셋 (빈칸 없이 무한 루프) - 메인 슬라이드
  useEffect(() => {
    if (!slides || slides.length === 0) return
    
    // 슬라이드가 두 번째 세트의 시작(슬라이드 개수와 같을 때)에 도달하면
    // transform을 리셋하여 첫 번째 세트로 이동 (애니메이션 없이)
    if (slides && currentSlideIndex >= slides.length) {
      // 잠시 후 transform을 리셋하여 첫 번째 세트로 점프
      const timer = setTimeout(() => {
        setCurrentSlideIndex(0)
      }, 500) // 전환 애니메이션 시간 후 리셋
      return () => clearTimeout(timer)
    }
  }, [currentSlideIndex, slides])

  // 광고 슬라이드가 끝에 도달했을 때 처음으로 리셋 (빈칸 없이 무한 루프)
  useEffect(() => {
    if (!adSlides || adSlides.length === 0) return
    
    // 슬라이드가 두 번째 세트의 시작(슬라이드 개수와 같을 때)에 도달하면
    // transform을 리셋하여 첫 번째 세트로 이동 (애니메이션 없이)
    if (adSlides && currentAdSlideIndex >= adSlides.length) {
      // 잠시 후 transform을 리셋하여 첫 번째 세트로 점프
      const timer = setTimeout(() => {
        setCurrentAdSlideIndex(0)
      }, 500) // 전환 애니메이션 시간 후 리셋
      return () => clearTimeout(timer)
    }
  }, [currentAdSlideIndex, adSlides])

  // 슬라이드 클릭 시 링크로 이동
  const handleSlideClick = async (slide: Slide) => {
    if (!slide.linkUrl) return
    
    if (slide.linkType === 'book') {
      // 도서 페이지 링크인 경우 - linkUrl에서 bookId를 추출하거나 직접 사용
      try {
        // linkUrl 형식: /book/{bookId} 또는 book/{bookId} 또는 직접 bookId
        let bookId = slide.linkUrl
        if (bookId.includes('/')) {
          bookId = bookId.split('/').pop() || bookId
        }
        
        // Firestore에서 해당 도서 찾기
        const bookDoc = await getDoc(doc(db, 'books', bookId))
        if (bookDoc.exists()) {
          const bookData = { id: bookDoc.id, ...bookDoc.data() } as Book
          setSelectedBook(bookData)
          setIsModalOpen(true)
        } else {
          console.error('도서를 찾을 수 없습니다:', bookId)
        }
      } catch (error) {
        console.error('도서 로딩 오류:', error)
      }
    } else {
      // 커스텀 링크인 경우
      window.open(slide.linkUrl, '_blank', 'noopener,noreferrer')
    }
  }

  // 새 책 추가하기 (실시간 리스너가 자동으로 업데이트하므로 별도 새로고침 불필요)
  const addBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBook.title || !newBook.author) return

    try {
      const docRef = await addDoc(collection(db, 'books'), {
        ...newBook,
        createdAt: Timestamp.now()
      })
      console.log('Document written with ID: ', docRef.id)
      
      // 폼 초기화
      setNewBook({
        title: '',
        author: '',
        rating: 5,
        review: ''
      })
      
      // 실시간 리스너가 자동으로 업데이트하므로 별도 새로고침 불필요
    } catch (error) {
      console.error('Error adding document: ', error)
    } finally {
      setLoading(false)
    }
  }


  // 사용자 인증 상태 확인 및 관리자 권한 체크
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      
      if (user) {
        try {
          // 사용자의 관리자 권한 확인 (level이 "admin"인 경우)
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const hasAdminRights =
              userData.level === 'admin' ||
              userData.isAdmin === true
            setIsAdmin(hasAdminRights)
            setHeaderName(
              userData.nickname ||
              userData.name ||
              user.displayName ||
              (user.email ? user.email.split('@')[0] : '사용자')
            )
          } else {
            setIsAdmin(false)
            setHeaderName(user.displayName || (user.email ? user.email.split('@')[0] : '사용자'))
          }
        } catch (error) {
          console.error('관리자 권한 확인 오류:', error)
          setIsAdmin(false)
          setHeaderName(user.displayName || (user.email ? user.email.split('@')[0] : '사용자'))
        }
      } else {
        setIsAdmin(false)
        setHeaderName('사용자')
      }
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      setHeaderName(prev => user.displayName || prev || (user.email ? user.email.split('@')[0] : '사용자'))
    }
  }, [user, user?.displayName, user?.email])

  // 로그아웃 함수
  const handleLogout = async () => {
    try {
      await signOut(auth)
      console.log('로그아웃 성공')
    } catch (error) {
      console.error('로그아웃 오류:', error)
    }
  }

  // 도서 카드 클릭 핸들러
  const handleBookClick = (book: Book) => {
    setSelectedBook(book)
    setIsModalOpen(true)
  }

  // 모달 닫기 핸들러
  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedBook(null)
  }

  // 초기 로딩 완료 확인 - 도서와 슬라이드 데이터가 모두 로드되었는지 확인
  useEffect(() => {
    // 도서 데이터가 로드되었고 슬라이드 데이터도 로드되었으면 초기 로딩 완료
    if (slides !== null && adSlides !== null && !loading) {
      // 약간의 지연 후 초기 로딩 완료 표시 (이미지 로딩 시간 확보)
      const timer = setTimeout(() => {
        setIsInitialLoad(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [slides, adSlides, loading])

  // 카테고리별 도서 분류
  const reviewBooks = books.filter(book => book.category === '서평도서')
  const publishedBooks = books.filter(book => book.category === '출간도서')
  const recommendedBooks = books.filter(book => book.category === '추천도서')

  // 초기 로딩 중일 때는 흰색 페이지만 표시
  if (isInitialLoad) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#ffffff',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}></div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={
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
                  {user ? (
                    <>
                      <div className="user-menu">
                        <Link to="/user" className="user-greeting">
                          안녕하세요, {headerName}님
                        </Link>
                        {isAdmin && <Link to="/admin" className="admin-link">관리자</Link>}
                      </div>
                      <button
                        onClick={handleLogout}
                        className="icon-btn logout-icon-btn"
                        aria-label="로그아웃"
                      >
                        <img src="/logout-icon.svg" alt="로그아웃" />
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/login"
                      className="icon-btn login-icon-btn"
                      aria-label="로그인"
                    >
                      <img src="/login-icon.svg" alt="로그인" />
                    </Link>
                  )}
                </div>
              </div>
            </header>

            {/* 메인 캐러셀 - 메인슬라이드 관리 데이터 사용 */}
            {slides && slides.length > 0 ? (
            <section className="hero-carousel">
              <h2 className="carousel-section-title">메인슬라이드</h2>
              <div 
                className="carousel-container"
                style={{
                  transform: currentSlideIndex === 0 
                    ? `translateX(0)` 
                    : `translateX(calc(-${currentSlideIndex} * (calc((100vw - 20px) / 4.5) + 16px)))`
                }}
              >
                {/* 슬라이드를 두 번 복제하여 빈칸 없이 무한 루프 */}
                {[...slides, ...slides].map((slide, index) => (
                  <div
                    key={`${slide.id}-${index}`}
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
              <div className="carousel-controls">
                <button 
                  className="carousel-prev"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentSlideIndex((prevIndex) => 
                      prevIndex === 0 ? (slides?.length || 1) - 1 : prevIndex - 1
                    )
                  }}
                >
                  ‹
                </button>
                <button 
                  className="carousel-next"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentSlideIndex((prevIndex) => 
                      (prevIndex + 1) % (slides?.length || 1)
                    )
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
                        e.stopPropagation()
                        setCurrentSlideIndex(index)
                      }}
                    ></span>
                  )
                })}
              </div>
            </section>
            ) : null}

            {/* 서평도서 섹션 */}
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

            {/* 출간도서 섹션 */}
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

            {/* 광고 슬라이드 섹션 */}
            {adSlides && adSlides.length > 0 ? (
            <section className="hero-carousel">
              <h2 className="carousel-section-title">홍보합니다.</h2>
              <div 
                className="carousel-container"
                style={{
                  transform: currentAdSlideIndex === 0 
                    ? `translateX(0)` 
                    : `translateX(calc(-${currentAdSlideIndex} * (calc((100vw - 40px) / 4.5) + 16px)))`
                }}
              >
                {/* 광고 슬라이드를 두 번 복제하여 빈칸 없이 무한 루프 (슬라이드가 1개일 때는 복제하지 않음) */}
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
                        e.stopPropagation()
                        setCurrentAdSlideIndex((prevIndex) => 
                          prevIndex === 0 ? (adSlides?.length || 1) - 1 : prevIndex - 1
                        )
                      }}
                    >
                      ‹
                    </button>
                    <button 
                      className="carousel-next"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCurrentAdSlideIndex((prevIndex) => 
                          (prevIndex + 1) % (adSlides?.length || 1)
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
        } />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<NewSignupPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/user" element={<UserPage />} />
      </Routes>
    </Router>
  )
}

export default App

