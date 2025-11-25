import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { db, auth } from './firebase'
import { collection, getDocs, Timestamp, doc, getDoc, onSnapshot, query, orderBy, where } from 'firebase/firestore'
import { onAuthStateChanged, User, signOut } from 'firebase/auth'
import NewSignupPage from './pages/NewSignupPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import UserPage from './pages/UserPage'
import BookDetailPage from './pages/BookDetailPage'
import SimpleLoginModal from './components/SimpleLoginModal'
import NewSignupModal from './components/NewSignupModal'
import MobileSignupModal from './components/MobileSignupModal'
import MobileHomePage from './pages/MobileHomePage'
import WebHomePage from './pages/WebHomePage'
import { getDeviceType, isActualMobileDevice } from './utils/deviceDetection'
import './App.css'

export interface Book {
  id?: string;
  title: string;
  author: string;
  rating: number;
  review: string;
  createdAt?: Timestamp;
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
  postingStart?: Timestamp | null;
  postingEnd?: Timestamp | null;
  titleColor?: string;
  subtitleColor?: string;
}

function App() {
  const [books, setBooks] = useState<Book[]>([])
  const [slides, setSlides] = useState<Slide[] | null>(null) // null로 시작하여 초기 렌더링 방지 (메인 슬라이드)
  const [adSlides, setAdSlides] = useState<Slide[] | null>(null) // 광고 슬라이드
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const slideIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const adSlideIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const slideWidthRef = useRef<number>(0)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [headerName, setHeaderName] = useState('사용자')
  const [isInitialLoad, setIsInitialLoad] = useState(true) // 초기 로딩 상태
  const [deviceType, setDeviceType] = useState<'mobile' | 'web'>(() => getDeviceType()) // 디바이스 타입
  const [isActualMobile, setIsActualMobile] = useState(() => isActualMobileDevice()) // 실제 모바일 기기 여부
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 디바이스 타입에 따라 body 클래스 설정
  useEffect(() => {
    if (deviceType === 'mobile') {
      document.body.classList.add('mobile-view-active')
      document.documentElement.classList.add('mobile-view-active')
      
      // 실제 모바일 기기 여부에 따라 클래스 추가
      if (isActualMobile) {
        document.body.classList.add('actual-mobile-device')
        document.documentElement.classList.add('actual-mobile-device')
      } else {
        document.body.classList.remove('actual-mobile-device')
        document.documentElement.classList.remove('actual-mobile-device')
      }
    } else {
      document.body.classList.remove('mobile-view-active')
      document.documentElement.classList.remove('mobile-view-active')
      document.body.classList.remove('actual-mobile-device')
      document.documentElement.classList.remove('actual-mobile-device')
      document.body.classList.remove('menu-open')
      document.documentElement.classList.remove('menu-open')
    }
    
    return () => {
      document.body.classList.remove('mobile-view-active')
      document.documentElement.classList.remove('mobile-view-active')
      document.body.classList.remove('actual-mobile-device')
      document.documentElement.classList.remove('actual-mobile-device')
      document.body.classList.remove('menu-open')
      document.documentElement.classList.remove('menu-open')
    }
  }, [deviceType, isActualMobile])

  // 모바일 메뉴 열림/닫힘 상태에 따라 body 클래스 설정
  useEffect(() => {
    if (deviceType === 'mobile') {
      if (isMobileMenuOpen) {
        document.body.classList.add('menu-open')
        document.documentElement.classList.add('menu-open')
      } else {
        document.body.classList.remove('menu-open')
        document.documentElement.classList.remove('menu-open')
      }
    }
  }, [isMobileMenuOpen, deviceType])

  // 화면 크기 변경 시 디바이스 타입 업데이트
  useEffect(() => {
    const handleResize = () => {
      const newDeviceType = getDeviceType()
      setDeviceType(newDeviceType)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])



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
        
        // App.tsx에서는 슬라이드 상태를 자동으로 변경하지 않음
        // 모든 상태 변경은 AdminPage에서만 수행됨
        // 여기서는 데이터베이스의 현재 상태를 그대로 사용

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
          
          // 약간의 지연 후 슬라이드 설정 (초기 렌더링 방지)
          setTimeout(() => {
            setSlides(activeMainSlides.length > 0 ? activeMainSlides : [])
            setAdSlides(activeAdSlides.length > 0 ? activeAdSlides : [])
            // 슬라이드 데이터 로드 완료 (초기 로딩은 별도 useEffect에서 처리)
          }, 100)
        } else {
          // 이후 업데이트는 즉시 반영
          setSlides(activeMainSlides.length > 0 ? activeMainSlides : [])
          setAdSlides(activeAdSlides.length > 0 ? activeAdSlides : [])
        }
        
        // 슬라이드 너비 계산 (모바일에서는 전체 화면, 데스크톱에서는 3.5개가 보이도록)
        if (typeof window !== 'undefined') {
          const viewportWidth = window.innerWidth
          if (viewportWidth <= 768) {
            // 모바일: 전체 화면 너비
            slideWidthRef.current = viewportWidth
          } else {
            // 데스크톱: 3.5개가 보이도록
            const padding = 100 // 좌우 패딩 (왼쪽 20px + 오른쪽 80px)
            const gaps = 48 // 슬라이드 간 간격 16px * 3
            slideWidthRef.current = (viewportWidth - padding - gaps) / 3.5
          }
        }
      },
      (error: any) => {
        console.error('Error fetching slides: ', error)
        setSlides([]) // 에러 시 빈 배열 설정
      }
    )

    return () => unsubscribe()
  }, [])

  // 자동 슬라이드 전환 기능 제거됨
  // 슬라이드 리셋 기능 제거됨


  // 디바이스 타입 전환 핸들러
  const handleSwitchToMobile = () => {
    setDeviceType('mobile')
  }

  const handleSwitchToWeb = () => {
    setDeviceType('web')
  }



  // 사용자 인증 상태 확인 및 관리자 권한 체크
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)
      
      if (user) {
        setIsAdmin(true)
        try {
          // 사용자의 관리자 권한 확인 (level이 "admin"인 경우)
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          let userData: any | null = null

          if (userDoc.exists()) {
            userData = userDoc.data()
          } else {
            // Fallback: lookup by email if document ID != auth UID
            try {
              if (user.email) {
                const usersRef = collection(db, 'users')
                const emailQuery = query(usersRef, where('email', '==', user.email))
                const emailSnapshot = await getDocs(emailQuery)
                if (!emailSnapshot.empty) {
                  userData = emailSnapshot.docs[0].data()
                }
              }

              // Additional fallback: lookup by custom id field (로그인 ID)
              if (!userData && user.displayName) {
                const usersRef = collection(db, 'users')
                const idQuery = query(usersRef, where('id', '==', user.displayName))
                const idSnapshot = await getDocs(idQuery)
                if (!idSnapshot.empty) {
                  userData = idSnapshot.docs[0].data()
                }
              }
            } catch (lookupError) {
              console.error('추가 사용자 정보 조회 오류:', lookupError)
            }
          }

          if (userData) {
            const normalizeString = (value: unknown) =>
              typeof value === 'string' ? value.trim().toLowerCase() : ''

            const levelValue = normalizeString(userData.level)

            const isTruthyFlag = (value: unknown) => {
              if (typeof value === 'boolean') return value
              if (typeof value === 'number') return value === 1
              if (typeof value === 'string') {
                const normalized = value.trim().toLowerCase()
                return ['true', '1', 'yes', 'y', 'on', 'admin', '관리자', '활성'].includes(normalized)
              }
              return false
            }

            const hasAdminRights =
              levelValue === 'admin' ||
              levelValue === '관리자' ||
              isTruthyFlag(userData.isAdmin)

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

  // 페이지 전환 시 슬라이드 애니메이션 클래스 제거 및 상태 정리
  useEffect(() => {
    const handleRouteChange = () => {
      // 애니메이션 클래스 제거
      setTimeout(() => {
        document.body.classList.remove('page-sliding-left', 'page-sliding-right')
      }, 350)
      
      // 슬라이드 인터벌 정리
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current)
        slideIntervalRef.current = null
      }
      if (adSlideIntervalRef.current) {
        clearInterval(adSlideIntervalRef.current)
        adSlideIntervalRef.current = null
      }
    }
    
    // popstate 이벤트 리스너 (뒤로가기/앞으로가기)
    window.addEventListener('popstate', handleRouteChange)
    
    // 초기 로드 시에도 처리
    handleRouteChange()
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange)
      handleRouteChange()
    }
  }, [])

  // 카테고리별 도서 분류
  // 서평도서: 제목이 있고, 빈 문자열이 아니며, 테스트 데이터 제외
  const reviewBooks = books.filter(book => {
    if (book.category !== '서평도서') return false
    if (!book.title || book.title.trim() === '') return false
    const title = book.title.trim()
    // 테스트 데이터 제외
    if (title === 'ABC' || title === '책 이미지' || title === '이것저것') return false
    // author가 없거나 빈 값인 경우도 제외 (유효한 도서만)
    if (!book.author || book.author.trim() === '') return false
    return true
  })
  // 출간도서: 제목이 있고, 빈 문자열이 아니며, 테스트 데이터 제외
  const publishedBooks = books.filter(book => {
    if (book.category !== '출간도서') return false
    if (!book.title || book.title.trim() === '') return false
    const title = book.title.trim()
    // 테스트 데이터 제외
    if (title === 'ABC' || title === '책 이미지' || title === '이것저것') return false
    // author가 없거나 빈 값인 경우도 제외 (유효한 도서만)
    if (!book.author || book.author.trim() === '') return false
    return true
  })
  // 추천도서: 제목이 있고, 빈 문자열이 아니며, 테스트 데이터 제외
  const recommendedBooks = books.filter(book => {
    if (book.category !== '추천도서') return false
    if (!book.title || book.title.trim() === '') return false
    const title = book.title.trim()
    // 테스트 데이터 제외
    if (title === 'ABC' || title === '책 이미지' || title === '이것저것') return false
    // author가 없거나 빈 값인 경우도 제외 (유효한 도서만)
    if (!book.author || book.author.trim() === '') return false
    return true
  })

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

  // Router 내부 컴포넌트
  const HomePage = () => {
    return deviceType === 'mobile' ? (
      <MobileHomePage
        slides={slides}
        adSlides={adSlides}
        reviewBooks={reviewBooks}
        publishedBooks={publishedBooks}
        recommendedBooks={recommendedBooks}
        user={user}
        isAdmin={isAdmin}
        headerName={headerName}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        onLoginClick={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onSwitchToWeb={handleSwitchToWeb}
      />
    ) : (
      <WebHomePage
        slides={slides}
        adSlides={adSlides}
        reviewBooks={reviewBooks}
        publishedBooks={publishedBooks}
        recommendedBooks={recommendedBooks}
                user={user}
        isAdmin={isAdmin}
        headerName={headerName}
        selectedBook={selectedBook}
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        setSelectedBook={(book: Book | null) => setSelectedBook(book)}
        onLogout={handleLogout}
        onSwitchToMobile={handleSwitchToMobile}
      />
    )
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/book/:bookId" element={<BookDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<NewSignupPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/user" element={<UserPage />} />
      </Routes>
      
      {/* 모바일 로그인 모달 */}
      <SimpleLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSignupClick={() => {
          setIsLoginModalOpen(false);
          setIsSignupModalOpen(true);
        }}
        onLoginSuccess={() => {
          setIsLoginModalOpen(false);
        }}
      />
      
      {/* 회원가입 모달 */}
      {deviceType === 'mobile' ? (
        <MobileSignupModal
          isOpen={isSignupModalOpen}
          onClose={() => setIsSignupModalOpen(false)}
          onSuccess={() => {
            setIsSignupModalOpen(false);
          }}
        />
      ) : (
        <NewSignupModal
          isOpen={isSignupModalOpen}
          onClose={() => setIsSignupModalOpen(false)}
          onSuccess={() => {
            setIsSignupModalOpen(false);
          }}
        />
      )}
    </Router>
  )
}

export default App

