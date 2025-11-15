import { useState, useEffect, useRef } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { db, auth } from './firebase'
import { collection, addDoc, getDocs, Timestamp, doc, getDoc, onSnapshot, query, orderBy, where, updateDoc } from 'firebase/firestore'
import { onAuthStateChanged, User, signOut } from 'firebase/auth'
import NewSignupPage from './pages/NewSignupPage'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import UserPage from './pages/UserPage'
import BookDetailPage from './pages/BookDetailPage'
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
  postingStart?: Timestamp | null;
  postingEnd?: Timestamp | null;
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
  // 터치 스와이프를 위한 상태
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
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
  const [isInitialLoad, setIsInitialLoad] = useState(true) // 초기 로딩 상태
  const [isMobileView, setIsMobileView] = useState(false) // 모바일 뷰 전환 상태
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // 모바일 뷰 전환 시 body와 html에 클래스 추가/제거 및 localStorage에 저장
  useEffect(() => {
    if (isMobileView) {
      document.body.classList.add('mobile-view-active')
      document.documentElement.classList.add('mobile-view-active')
      localStorage.setItem('isMobileView', 'true')
    } else {
      document.body.classList.remove('mobile-view-active')
      document.documentElement.classList.remove('mobile-view-active')
      localStorage.setItem('isMobileView', 'false')
    }
    
    return () => {
      document.body.classList.remove('mobile-view-active')
      document.documentElement.classList.remove('mobile-view-active')
    }
  }, [isMobileView])

  // 페이지 로드 시 모바일 뷰 상태 복원
  useEffect(() => {
    const savedMobileView = localStorage.getItem('isMobileView')
    if (savedMobileView === 'true') {
      setIsMobileView(true)
      document.body.classList.add('mobile-view-active')
      document.documentElement.classList.add('mobile-view-active')
    }
  }, [])

  // 실제 모바일 기기에서 접속했을 때 자동으로 모바일 뷰 활성화
  useEffect(() => {
    const checkMobileDevice = () => {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768
      if (isMobile && !isMobileView) {
        // 모바일 기기에서는 자동으로 모바일 뷰 활성화하지 않음 (사용자가 직접 전환)
      }
    }
    
    checkMobileDevice()
    window.addEventListener('resize', checkMobileDevice)
    
    return () => window.removeEventListener('resize', checkMobileDevice)
  }, [isMobileView])

  const timestampToMillis = (value: any): number | null => {
    if (!value) return null
    try {
      if (value.toDate) return value.toDate().getTime()
      if (value.seconds) return value.seconds * 1000
      if (value instanceof Date) return value.getTime()
      if (typeof value === 'string') {
        const parsed = Date.parse(value)
        return isNaN(parsed) ? null : parsed
      }
    } catch (error) {
      console.error('슬라이드 기간 변환 오류:', error)
    }
    return null
  }

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
        
        const nowMs = Date.now()
        const updatePromises: Promise<void>[] = []
        slidesData.forEach((slide) => {
          const endMs = timestampToMillis((slide as any).postingEnd)
          const shouldBeActive = endMs === null || endMs >= nowMs

          if (typeof slide.isActive === 'boolean' && slide.isActive !== shouldBeActive) {
            updatePromises.push(
              updateDoc(doc(db, 'slides', slide.id), {
                isActive: shouldBeActive,
                updatedAt: Timestamp.now()
              }).catch((error) => console.error('슬라이드 상태 자동 업데이트 오류:', error))
            )
            slide.isActive = shouldBeActive
          }
        })

        if (updatePromises.length > 0) {
          Promise.all(updatePromises).catch((error) => console.error('슬라이드 상태 비동기 업데이트 오류:', error))
        }

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
        
        // 슬라이드 너비 계산 (모바일에서는 전체 화면, 데스크톱에서는 3.5개가 보이도록)
        if (typeof window !== 'undefined') {
          const viewportWidth = window.innerWidth
          if (viewportWidth <= 768) {
            // 모바일: 전체 화면 너비
            slideWidthRef.current = viewportWidth
          } else {
            // 데스크톱: 3.5개가 보이도록
            const padding = 80 // 좌우 패딩 40px * 2
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

  // 자동 슬라이드 전환 (5초 간격) - 한 슬라이드씩 이동하여 빈칸 없이 표시 (메인 슬라이드)
  useEffect(() => {
    if (!slides || slides.length === 0) return
    if (isMobileView) {
      // 모바일 뷰에서는 자동 전환 완전히 비활성화
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current)
        slideIntervalRef.current = null
      }
      return
    }

    // 기존 인터벌 클리어
    if (slideIntervalRef.current) {
      clearInterval(slideIntervalRef.current)
    }

    // 5초마다 다음 슬라이드로 이동 (한 슬라이드씩)
    slideIntervalRef.current = setInterval(() => {
      setCurrentSlideIndex((prevIndex) => {
        // null 체크 강화
        if (!slides || slides.length === 0) return prevIndex
        // 무한 루프: 마지막 슬라이드에서 다음은 첫 번째 슬라이드
        return (prevIndex + 1) % slides.length
      })
    }, 5000)

    return () => {
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current)
        slideIntervalRef.current = null
      }
    }
  }, [slides, isMobileView])

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
        // null 체크 강화
        if (!adSlides || adSlides.length === 0) return prevIndex
        // 무한 루프: 마지막 슬라이드에서 다음은 첫 번째 슬라이드
        return (prevIndex + 1) % adSlides.length
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

  // 터치 시작
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
    setIsDragging(true)
    setDragOffset(0)
    // 자동 슬라이드 일시 정지
    if (slideIntervalRef.current) {
      clearInterval(slideIntervalRef.current)
    }
  }

  // 터치 이동
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return
    e.preventDefault() // 스크롤 방지
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
      // 모바일에서는 자동 슬라이드 재시작하지 않음
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

    // 모바일에서는 자동 슬라이드 재시작하지 않음
    // if (slides && slides.length > 0 && !isMobileView) {
    //   slideIntervalRef.current = setInterval(() => {
    //     setCurrentSlideIndex((prevIndex) => (prevIndex + 1) % slides.length)
    //   }, 5000)
    // }
  }

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
        
        if (isMobileView) {
          // 모바일 뷰: 페이지로 이동 (슬라이드 애니메이션)
          document.body.classList.add('page-sliding-left')
          setTimeout(() => {
            window.location.href = `/book/${bookId}`
          }, 50)
        } else {
          // 웹 뷰: Firestore에서 도서 찾아서 모달 표시
          const bookDoc = await getDoc(doc(db, 'books', bookId))
          if (bookDoc.exists()) {
            const bookData = { id: bookDoc.id, ...bookDoc.data() } as Book
            setSelectedBook(bookData)
            setIsModalOpen(true)
          } else {
            console.error('도서를 찾을 수 없습니다:', bookId)
          }
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

  // 도서 카드 클릭 핸들러 (Router 내부에서 navigate 사용)
  const handleBookClick = (book: Book, navigate?: any) => {
    if (isMobileView) {
      // 모바일 뷰: 페이지로 이동 (슬라이드 애니메이션)
      if (book.id) {
        document.body.classList.add('page-sliding-left')
        setTimeout(() => {
          if (navigate) {
            navigate(`/book/${book.id}`)
          } else {
            window.location.href = `/book/${book.id}`
          }
        }, 50)
      }
    } else {
      // 웹 뷰: 모달 표시
      setSelectedBook(book)
      setIsModalOpen(true)
    }
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
      
      // 홈페이지로 돌아올 때 모바일 뷰 상태 복원
      setTimeout(() => {
        if (window.location.pathname === '/') {
          const savedMobileView = localStorage.getItem('isMobileView')
          if (savedMobileView === 'true') {
            setIsMobileView(true)
            document.body.classList.add('mobile-view-active')
            document.documentElement.classList.add('mobile-view-active')
          }
        }
      }, 100)
    }
    
    // 모바일 뷰 복원 이벤트 리스너
    const handleRestoreMobileView = () => {
      const savedMobileView = localStorage.getItem('isMobileView')
      if (savedMobileView === 'true') {
        setIsMobileView(true)
        document.body.classList.add('mobile-view-active')
        document.documentElement.classList.add('mobile-view-active')
      }
    }
    
    // popstate 이벤트 리스너 (뒤로가기/앞으로가기)
    window.addEventListener('popstate', handleRouteChange)
    window.addEventListener('restoreMobileView', handleRestoreMobileView)
    
    // 초기 로드 시에도 모바일 뷰 상태 확인
    handleRouteChange()
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange)
      window.removeEventListener('restoreMobileView', handleRestoreMobileView)
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

  // Router 내부 컴포넌트 (navigate 사용)
  const HomePage = () => {
    const navigate = useNavigate()
    
    // 슬라이드 클릭 핸들러 (navigate 사용)
    const handleSlideClickWithNavigate = async (slide: Slide) => {
      if (!slide.linkUrl) return
      
      if (slide.linkType === 'book') {
        try {
          let bookId = slide.linkUrl
          if (bookId.includes('/')) {
            bookId = bookId.split('/').pop() || bookId
          }
          
          if (isMobileView) {
            document.body.classList.add('page-sliding-left')
            setTimeout(() => {
              navigate(`/book/${bookId}`)
            }, 50)
          } else {
            const bookDoc = await getDoc(doc(db, 'books', bookId))
            if (bookDoc.exists()) {
              const bookData = { id: bookDoc.id, ...bookDoc.data() } as Book
              setSelectedBook(bookData)
              setIsModalOpen(true)
            }
          }
        } catch (error) {
          console.error('도서 로딩 오류:', error)
        }
      } else {
        window.open(slide.linkUrl, '_blank', 'noopener,noreferrer')
      }
    }
    
    return (
      <div className={`publishing-website ${isMobileView ? 'mobile-viewport' : ''}`}>
            {/* 헤더 */}
            <header className="main-header">
              <div className="header-content">
                {isMobileView ? (
                  <>
                    {/* 모바일 뷰: 햄버거 메뉴 + 도서 출판 제목 */}
                    <button
                      className="mobile-hamburger-btn"
                      aria-label="메뉴"
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
                    {/* 모바일 뷰: Web view 전환 버튼 */}
                    <button
                      onClick={() => setIsMobileView(false)}
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
                  </>
                ) : (
                  <>
                    <div className="logo-section">
                      <div className="logo-icon">📚</div>
                      <div className="logo-text">
                        <h1 style={{ fontSize: '16px', margin: 0, fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>출판도서</h1>
                        <p style={{ fontSize: '16px', margin: '2px 0 0 0', fontWeight: 600, color: '#374151', lineHeight: 1.2 }}>Publishing House</p>
                      </div>
                    </div>
                    <div className="header-actions">
                      {/* 스마트폰 뷰 전환 버튼 */}
                      <button
                        onClick={() => setIsMobileView(true)}
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
                  </>
                )}
              </div>
            </header>

            {/* 메인 캐러셀 - 메인슬라이드 관리 데이터 사용 */}
            {slides && slides.length > 0 ? (
            <section 
              className="hero-carousel card-slider"
              onTouchStart={(e) => {
                if (isMobileView) {
                  e.preventDefault()
                  handleTouchStart(e)
                }
              }}
              onTouchMove={(e) => {
                if (isMobileView) {
                  e.preventDefault()
                  handleTouchMove(e)
                }
              }}
              onTouchEnd={(e) => {
                if (isMobileView) {
                  e.preventDefault()
                  e.stopPropagation()
                  handleTouchEnd()
                }
              }}
            >
              <div 
                className="carousel-container card-slider-container"
              >
                {/* Stacked Card Slider - 가로 방향 */}
                {slides.map((slide, index) => {
                  const isActive = index === currentSlideIndex
                  const isPrev = index === (currentSlideIndex - 1 + slides.length) % slides.length
                  const isNext = index === (currentSlideIndex + 1) % slides.length
                  
                  return (
                  <div
                    key={`${slide.id}-${index}`}
                    className={`carousel-slide ${isActive ? 'active' : ''} ${isPrev ? 'prev' : ''} ${isNext ? 'next' : ''}`}
                    onClick={() => {
                      // 스와이프 중이 아닐 때만 클릭 처리
                      if (!isDragging && Math.abs(dragOffset) < 10) {
                        handleSlideClickWithNavigate(slide)
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
              <div className="carousel-controls">
                <button 
                  type="button"
                  className="carousel-prev"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setCurrentSlideIndex((prevIndex) => 
                      prevIndex === 0 ? (slides?.length || 1) - 1 : prevIndex - 1
                    )
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
                        e.preventDefault()
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
            {reviewBooks.length > 0 && (
            <section className={`book-section ${isMobileView ? 'mobile-book-section' : ''} ${isMobileView && reviewBooks.length === 1 ? 'single-book-section' : ''}`}>
              <div className="section-header">
                <h2>서평도서</h2>
                {!isMobileView && <Link to="/reviews" className="more-link">더보기 &gt;</Link>}
              </div>
              <div className={`books-carousel ${isMobileView && reviewBooks.length === 1 ? 'single-carousel' : ''}`}>
                <div className={`books-container ${isMobileView ? 'mobile-books-container' : ''} ${isMobileView && reviewBooks.length === 1 ? 'single-card-container' : ''}`}>
                  {reviewBooks.slice(0, 6).map((book, index) => (
                    <div key={book.id || index} className={`book-card ${isMobileView ? 'mobile-book-card' : ''}`} onClick={() => handleBookClick(book, navigate)}>
                      {isMobileView ? (
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
                      ) : (
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
                      )}
                    </div>
                  ))}
                </div>
                {!isMobileView && (
                  <>
                    <div className="carousel-arrows">
                      <button className="arrow-left">‹</button>
                      <button className="arrow-right">›</button>
                    </div>
                    <div className="carousel-dots">
                      <span className="dot active"></span>
                      <span className="dot"></span>
                    </div>
                  </>
                )}
              </div>
            </section>
            )}

            {publishedBooks.length > 0 && (
            <>
            {/* 출간도서 섹션 */}
            <section className={`book-section ${isMobileView ? 'mobile-book-section' : ''} ${isMobileView && publishedBooks.length === 1 ? 'single-book-section' : ''}`}>
              <div className="section-header">
                <h2>출간도서</h2>
                {!isMobileView && <Link to="/published" className="more-link">더보기 &gt;</Link>}
              </div>
              <div className={`books-carousel ${isMobileView && publishedBooks.length === 1 ? 'single-carousel' : ''}`}>
                <div className={`books-container ${isMobileView ? 'mobile-books-container' : ''} ${isMobileView && publishedBooks.length === 1 ? 'single-card-container' : ''}`}>
                  {publishedBooks.slice(0, 6).map((book, index) => (
                    <div key={book.id || index} className={`book-card ${isMobileView ? 'mobile-book-card' : ''}`} onClick={() => handleBookClick(book, navigate)}>
                      {isMobileView ? (
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
                      ) : (
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
                      )}
                    </div>
                  ))}
                </div>
                {!isMobileView && (
                  <>
                    <div className="carousel-arrows">
                      <button className="arrow-left">‹</button>
                      <button className="arrow-right">›</button>
                    </div>
                    <div className="carousel-dots">
                      <span className="dot active"></span>
                      <span className="dot"></span>
                    </div>
                  </>
                )}
              </div>
            </section>
            </>
            )}

            {/* 광고 슬라이드 섹션 */}
            {adSlides && adSlides.length > 0 ? (
            <section className="hero-carousel">
              <div 
                className="carousel-container"
                style={{
                  transform: typeof window !== 'undefined' && window.innerWidth <= 768
                    ? `translateX(calc(-${currentAdSlideIndex} * 100vw))`
                    : `translateX(calc(-${currentAdSlideIndex} * (460px + 16px)))`
                }}
              >
                {/* 광고 슬라이드를 두 번 복제하여 빈칸 없이 무한 루프 (슬라이드가 1개일 때는 복제하지 않음) */}
                {(adSlides.length > 1 ? [...adSlides, ...adSlides] : adSlides).map((slide, index) => (
                  <div
                    key={`ad-${slide.id}-${index}`}
                    className="carousel-slide"
                    onClick={() => handleSlideClickWithNavigate(slide)}
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

            {recommendedBooks.length > 0 && (
            <>
            {/* 추천도서 섹션 */}
            <section className={`book-section ${isMobileView ? 'mobile-book-section' : ''} ${isMobileView && recommendedBooks.length === 1 ? 'single-book-section' : ''}`}>
              <div className="section-header">
                <h2>추천도서</h2>
                {!isMobileView && <Link to="/recommended" className="more-link">더보기 &gt;</Link>}
              </div>
              <div className={`books-carousel ${isMobileView && recommendedBooks.length === 1 ? 'single-carousel' : ''}`}>
                <div className={`books-container ${isMobileView ? 'mobile-books-container' : ''} ${isMobileView && recommendedBooks.length === 1 ? 'single-card-container' : ''}`}>
                  {recommendedBooks.slice(0, 6).map((book, index) => (
                    <div key={book.id || index} className={`book-card ${isMobileView ? 'mobile-book-card' : ''}`} onClick={() => handleBookClick(book, navigate)}>
                      {isMobileView ? (
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
                      ) : (
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
                      )}
                    </div>
                  ))}
                </div>
                {!isMobileView && (
                  <>
                    <div className="carousel-arrows">
                      <button className="arrow-left">‹</button>
                      <button className="arrow-right">›</button>
                    </div>
                    <div className="carousel-dots">
                      <span className="dot active"></span>
                      <span className="dot"></span>
                    </div>
                  </>
                )}
              </div>
            </section>
            </>
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

            {/* 웹 뷰: 도서 상세 모달 */}
            {!isMobileView && (
              <BookDetailModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                book={selectedBook}
                user={user}
              />
            )}
          </div>
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
    </Router>
  )
}

export default App

