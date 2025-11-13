import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, auth } from '../firebase'
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc, Timestamp, getDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import MemberEditModal from '../components/MemberEditModal'
import NewSignupModal from '../components/NewSignupModal'
import BookAddModal from '../components/BookAddModal'
import BookEditModal from '../components/BookEditModal'
import SlideAddModal from '../components/SlideAddModal'
import { categoryColors, statCardColors } from '../utils/pastelColors'
import { runSlidesUpdate } from '../utils/updateSlidesDatabase'
import './AdminPage.css'

type MenuItem = 'home' | 'main-slide' | 'books' | 'ad-management' | 'member-management' | 'review-management'

interface MemberData {
  id: string;
  uid: string;
  name: string;
  nickname: string;
  phone: string;
  email: string;
  address: string;
  blog?: string;
  instagram?: string;
  level: string;
  createdAt: any;
  isAdmin?: boolean;
}

interface BookData {
  id: string;
  title: string;
  author: string;
  category: string;
  genre: string;
  description: string;
  imageUrl?: string;
  rating: number;
  reviewCount: number;
  status: string;
  createdAt: any;
  publisher?: string;
  publishedDate?: string;
}

interface SlideData {
  id: string;
  slideType?: 'main' | 'ad'; // 슬라이드 구분 (메인슬라이드/광고 슬라이드)
  title: string;
  subtitle: string;
  imageUrl: string;
  linkUrl: string;
  linkType: 'book' | 'custom'; // 도서 페이지, 커스텀 링크
  order: number;
  isActive: boolean;
  createdAt: any;
  updatedAt?: any;
  titleColor?: string; // 제목 색상
  subtitleColor?: string; // 부제목 색상
  postingStart?: Timestamp | null;
  postingEnd?: Timestamp | null;
}

interface ReviewApplicationData {
  서평ID: string;
  회원ID: string;
  도서ID: string;
  신청일: any;
  처리상태: '서평신청' | '도서발송' | '서평대기' | '서평완료';
  발송일: any | null;
  완료일: any | null;
  관리자메모: string;
  bookTitle: string;
  bookAuthor: string;
  applicantName: string;
  applicantPhone: string;
  applicantEmail: string;
  applicantAddress: string;
  applicantId?: string;
  applicantNickname?: string;
  applicantBlog?: string;
  applicantInstagram?: string;
  서평갯수?: number;
  createdAt: any;
  updatedAt: any;
}

const AdminPage: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<MenuItem>('main-slide')
  const [members, setMembers] = useState<MemberData[]>([])
  const [books, setBooks] = useState<BookData[]>([])
  const [slides, setSlides] = useState<SlideData[]>([])
  const [reviewApplications, setReviewApplications] = useState<ReviewApplicationData[]>([])
  const [loading, setLoading] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberData | null>(null)
  const [isSignupModalOpen, setIsSignupModalOpen] = useState(false)
  const [isBookModalOpen, setIsBookModalOpen] = useState(false)
  const [isBookEditModalOpen, setIsBookEditModalOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<BookData | null>(null)
  const [isSlideModalOpen, setIsSlideModalOpen] = useState(false)
  const [isSlideEditModalOpen, setIsSlideEditModalOpen] = useState(false)
  const [selectedSlide, setSelectedSlide] = useState<SlideData | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('전체')
  const [openCategoryDropdown, setOpenCategoryDropdown] = useState<string | null>(null)
  const [selectedBookFilter, setSelectedBookFilter] = useState<string>('전체')
  const [selectedApplications, setSelectedApplications] = useState<Set<string>>(new Set())
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('')
  const navigate = useNavigate()

  const menuItems = [
    { id: 'home' as MenuItem, label: '홈', icon: '🏠' },
    { id: 'main-slide' as MenuItem, label: '메인슬라이드', icon: '📺' },
    { id: 'books' as MenuItem, label: '도서관리', icon: '📚' },
    { id: 'ad-management' as MenuItem, label: '광고관리', icon: '📢' },
    { id: 'member-management' as MenuItem, label: '회원관리', icon: '👥' },
    { id: 'review-management' as MenuItem, label: '서평관리', icon: '💬' }
  ]

  const handleMenuClick = (menuId: MenuItem) => {
    if (menuId === 'home') {
      navigate('/')
    } else {
      setActiveMenu(menuId)
      if (menuId === 'member-management') {
        fetchMembers()
      } else if (menuId === 'books') {
        fetchBooks()
      } else if (menuId === 'review-management') {
        fetchReviewApplications()
      }
    }
  }

  // 회원 데이터 가져오기
  const fetchMembers = async () => {
    try {
      setLoading(true)
      const usersRef = collection(db, 'users')
      const q = query(usersRef, orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)
      
      console.log('Firestore 쿼리 결과:', querySnapshot.docs.length, '개 문서')
      
      const membersData = querySnapshot.docs.map(doc => {
        const data = doc.data()
        console.log('문서 ID:', doc.id, '데이터:', data)
        return {
          uid: doc.id, // Firestore 문서 ID를 uid로 사용
          ...data
        } as MemberData
      })
      
      console.log('처리된 회원 데이터:', membersData)
      setMembers(membersData)
    } catch (error) {
      console.error('회원 데이터 가져오기 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  // 도서 데이터 가져오기
  const fetchBooks = async () => {
    try {
      setLoading(true)
      const booksRef = collection(db, 'books')
      const q = query(booksRef, orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)
      
      console.log('도서 쿼리 결과:', querySnapshot.docs.length, '개 문서')
      
      const booksData = querySnapshot.docs.map(doc => {
        const data = doc.data()
        console.log('도서 문서 ID:', doc.id, '데이터:', data)
        return {
          id: doc.id,
          ...data
        } as BookData
      })
      
      console.log('처리된 도서 데이터:', booksData)
      setBooks(booksData)
    } catch (error) {
      console.error('도서 데이터 가져오기 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  // 슬라이드 데이터 가져오기
  const fetchSlides = async () => {
    try {
      setLoading(true)
      const slidesRef = collection(db, 'slides')
      const q = query(slidesRef, orderBy('order', 'asc'))
      const querySnapshot = await getDocs(q)
      
      const slidesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SlideData[]

      const nowMs = Date.now()
      const toMs = (value: any): number | null => {
        if (!value) return null
        try {
          if (value.toDate) {
            return value.toDate().getTime()
          }
          if (value.seconds) {
            return value.seconds * 1000
          }
          if (value instanceof Date) {
            return value.getTime()
          }
          if (typeof value === 'string') {
            const parsed = Date.parse(value)
            return isNaN(parsed) ? null : parsed
          }
        } catch (error) {
          console.error('포스팅 기간 변환 오류:', error)
        }
        return null
      }

      const updatePromises: Promise<void>[] = []
      const normalizedSlides = slidesData.map(slide => {
        const endMs = toMs(slide.postingEnd)
        const shouldBeActive = endMs === null || endMs >= nowMs

        if (typeof slide.isActive === 'boolean' && slide.isActive !== shouldBeActive) {
          updatePromises.push(
            updateDoc(doc(db, 'slides', slide.id), {
              isActive: shouldBeActive,
              updatedAt: Timestamp.now()
            }).catch(error => console.error('슬라이드 상태 자동 업데이트 오류:', error))
          )
          return {
            ...slide,
            isActive: shouldBeActive
          }
        }

        return slide
      })

      if (updatePromises.length > 0) {
        await Promise.all(updatePromises)
      }
      
      setSlides(normalizedSlides)
    } catch (error) {
      console.error('슬라이드 데이터 가져오기 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  // 서평 신청 데이터 가져오기
  const fetchReviewApplications = async () => {
    try {
      setLoading(true)
      const applicationsRef = collection(db, 'reviewApplications')
      const q = query(applicationsRef, orderBy('신청일', 'desc'))
      const querySnapshot = await getDocs(q)
      
      const applicationsData: ReviewApplicationData[] = []
      
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data()
        
        // 회원 정보 가져오기
        let memberInfo: Partial<MemberData> = {}
        try {
          // 회원ID가 users 컬렉션의 문서 ID이므로 직접 가져오기
          const memberDocRef = doc(db, 'users', data.회원ID)
          const memberDocSnap = await getDoc(memberDocRef)
          
          if (memberDocSnap.exists()) {
            const memberData = memberDocSnap.data()
            memberInfo = {
              id: memberData.id || data.회원ID,
              name: memberData.name || data.applicantName || '',
              nickname: memberData.nickname || '',
              phone: memberData.phone || data.applicantPhone || '',
              blog: memberData.blog || '',
              instagram: memberData.instagram || ''
            }
          }
        } catch (error) {
          console.error('회원 정보 가져오기 오류:', error)
        }
        
        applicationsData.push({
          서평ID: docSnap.id,
          회원ID: data.회원ID || '',
          도서ID: data.도서ID || '',
          신청일: data.신청일 || data.createdAt,
          처리상태: data.처리상태 || '서평신청',
          발송일: data.발송일 || null,
          완료일: data.완료일 || null,
          관리자메모: data.관리자메모 || '',
          bookTitle: data.bookTitle || '',
          bookAuthor: data.bookAuthor || '',
          applicantName: memberInfo.name || data.applicantName || '',
          applicantPhone: memberInfo.phone || data.applicantPhone || '',
          applicantEmail: data.applicantEmail || '',
          applicantAddress: data.applicantAddress || '',
          applicantId: memberInfo.id || '',
          applicantNickname: memberInfo.nickname || '',
          applicantBlog: memberInfo.blog || '',
          applicantInstagram: memberInfo.instagram || '',
          서평갯수: data.서평갯수 || 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        })
      }
      
      // 30일 동안의 서평 신청 갯수 계산 (메모리에서 계산)
      const thirtyDaysAgoMs = Date.now() - 30 * 24 * 60 * 60 * 1000
      
      // 회원별로 30일 이내 신청 갯수 계산
      const userApplicationCounts = new Map<string, number>()
      
      applicationsData.forEach((app) => {
        // 신청일을 밀리초로 변환
        let 신청일Ms = 0
        try {
          if (app.신청일) {
            if (app.신청일.toDate) {
              신청일Ms = app.신청일.toDate().getTime()
            } else if (app.신청일.seconds) {
              신청일Ms = app.신청일.seconds * 1000
            }
          }
        } catch (error) {
          console.error('날짜 변환 오류:', error)
        }
        
        // 30일 이내인 경우만 카운트
        if (신청일Ms >= thirtyDaysAgoMs) {
          const currentCount = userApplicationCounts.get(app.회원ID) || 0
          userApplicationCounts.set(app.회원ID, currentCount + 1)
        }
      })
      
      // 각 신청에 서평 갯수 할당
      const applicationsWithCount = applicationsData.map((app) => {
        app.서평갯수 = userApplicationCounts.get(app.회원ID) || 0
        return app
      })
      
      setReviewApplications(applicationsWithCount)
    } catch (error) {
      console.error('서평 신청 데이터 가져오기 오류:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeMenu === 'member-management') {
      fetchMembers()
    } else if (activeMenu === 'books') {
      fetchBooks()
    } else if (activeMenu === 'main-slide' || activeMenu === 'ad-management') {
      fetchSlides()
    } else if (activeMenu === 'review-management') {
      fetchReviewApplications()
    }
  }, [activeMenu])

  // 외부 클릭 시 풀다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.category-dropdown-container')) {
        setOpenCategoryDropdown(null)
      }
    }

    if (openCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [openCategoryDropdown])

  // 모달 열기/닫기 함수들
  const openEditModal = (member: MemberData) => {
    setSelectedMember(member)
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedMember(null)
  }

  const handleMemberUpdate = () => {
    fetchMembers() // 회원 목록 새로고침
  }

  // 회원 상세 모달 열기/닫기 함수들
  const handleDeleteMember = async (member: MemberData) => {
    if (!member?.uid) {
      return
    }

    const confirmed = window.confirm(`정말 ${member.name || member.id || '이 회원'}을 삭제하시겠습니까?`)
    if (!confirmed) {
      return
    }

    try {
      setLoading(true)
      const memberRef = doc(db, 'users', member.uid)
      await deleteDoc(memberRef)
      alert('회원이 삭제되었습니다.')
      fetchMembers()
    } catch (error) {
      console.error('회원 삭제 오류:', error)
      alert('회원 삭제 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 회원 추가 모달 관련 함수들
  const openSignupModal = () => {
    setIsSignupModalOpen(true)
  }

  const closeSignupModal = () => {
    setIsSignupModalOpen(false)
  }

  const handleSignupSuccess = () => {
    fetchMembers() // 회원 목록 새로고침
  }

  const handleBookAddSuccess = () => {
    // 도서 목록 새로고침
    console.log('도서가 추가/수정되었습니다. 목록을 새로고침합니다.')
    // 즉시 새로고침
    fetchBooks()
    // 추가로 약간의 지연 후 한 번 더 새로고침 (Firestore 지연 대응)
    setTimeout(() => {
      console.log('지연된 새로고침 실행')
      fetchBooks()
    }, 1000)
  }

  const closeBookEditModal = () => {
    setIsBookEditModalOpen(false)
    setSelectedBook(null)
  }

  const handleBookUpdate = () => {
    fetchBooks() // 도서 목록 새로고침
  }

  const formatPostingDate = (value: any): string => {
    if (!value) return ''
    try {
      let date: Date | null = null
      if (value.toDate) {
        date = value.toDate()
      } else if (value.seconds) {
        date = new Date(value.seconds * 1000)
      } else if (value instanceof Date) {
        date = value
      } else if (typeof value === 'string') {
        const parsed = Date.parse(value)
        if (!isNaN(parsed)) {
          date = new Date(parsed)
        }
      }
      if (!date) return ''
      const year = String(date.getFullYear()).slice(-2)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}/${month}/${day}`
    } catch (error) {
      console.error('포스팅 기간 표시 오류:', error)
      return ''
    }
  }

  const renderPostingPeriod = (slide: SlideData) => {
    const start = formatPostingDate(slide.postingStart)
    const end = formatPostingDate(slide.postingEnd)
    if (!start && !end) {
      return (
        <div className="slide-posting-period">
          <span>기간 미등록</span>
        </div>
      )
    }
    return (
      <div className="slide-posting-period">
        <span>{start || '--/--/--'}</span>
        <span>{end || '--/--/--'}</span>
      </div>
    )
  }

  // 슬라이드 관련 함수들
  const handleSlideToggle = async (slideId: string, activate: boolean, slideType?: 'main' | 'ad') => {
    try {
      const slideRef = doc(db, 'slides', slideId)
      const targetSlides = slideType ? slides.filter(s => s.slideType === slideType) : slides
      const maxOrder = Math.max(...targetSlides.map(s => s.order || 0), 0)
      
      if (activate) {
        // 활성화: 상단으로 이동 (최대 order + 1)
        await updateDoc(slideRef, {
          isActive: true,
          order: maxOrder + 1,
          updatedAt: Timestamp.now()
        })
      } else {
        // 비활성화: OFF 영역으로 이동 (order는 유지하되 최소값으로 조정)
        const inactiveMaxOrder = Math.max(...targetSlides.filter(s => !s.isActive).map(s => s.order || 0), 0)
        await updateDoc(slideRef, {
          isActive: false,
          order: inactiveMaxOrder + 1,
          updatedAt: Timestamp.now()
        })
      }
      
      fetchSlides()
    } catch (error) {
      console.error('슬라이드 토글 오류:', error)
      alert('슬라이드 상태 변경 중 오류가 발생했습니다.')
    }
  }

  const moveSlideUp = async (slideId: string, slideType?: 'main' | 'ad') => {
    const targetSlides = slideType 
      ? slides.filter(s => s.isActive && s.slideType === slideType).sort((a, b) => a.order - b.order)
      : slides.filter(s => s.isActive && (s.slideType === 'main' || !s.slideType)).sort((a, b) => a.order - b.order)
    const currentIndex = targetSlides.findIndex(s => s.id === slideId)
    
    if (currentIndex > 0) {
      const currentSlide = targetSlides[currentIndex]
      const prevSlide = targetSlides[currentIndex - 1]
      
      try {
        const currentRef = doc(db, 'slides', currentSlide.id)
        const prevRef = doc(db, 'slides', prevSlide.id)
        
        const tempOrder = currentSlide.order
        await updateDoc(currentRef, {
          order: prevSlide.order,
          updatedAt: Timestamp.now()
        })
        await updateDoc(prevRef, {
          order: tempOrder,
          updatedAt: Timestamp.now()
        })
        
        fetchSlides()
      } catch (error) {
        console.error('슬라이드 이동 오류:', error)
        alert('슬라이드 이동 중 오류가 발생했습니다.')
      }
    }
  }

  const moveSlideDown = async (slideId: string, slideType?: 'main' | 'ad') => {
    const targetSlides = slideType 
      ? slides.filter(s => s.isActive && s.slideType === slideType).sort((a, b) => a.order - b.order)
      : slides.filter(s => s.isActive && (s.slideType === 'main' || !s.slideType)).sort((a, b) => a.order - b.order)
    const currentIndex = targetSlides.findIndex(s => s.id === slideId)
    
    if (currentIndex < targetSlides.length - 1) {
      const currentSlide = targetSlides[currentIndex]
      const nextSlide = targetSlides[currentIndex + 1]
      
      try {
        const currentRef = doc(db, 'slides', currentSlide.id)
        const nextRef = doc(db, 'slides', nextSlide.id)
        
        const tempOrder = currentSlide.order
        await updateDoc(currentRef, {
          order: nextSlide.order,
          updatedAt: Timestamp.now()
        })
        await updateDoc(nextRef, {
          order: tempOrder,
          updatedAt: Timestamp.now()
        })
        
        fetchSlides()
      } catch (error) {
        console.error('슬라이드 이동 오류:', error)
        alert('슬라이드 이동 중 오류가 발생했습니다.')
      }
    }
  }

  const handleDeleteSlide = async (slideId: string) => {
    if (window.confirm('정말 이 슬라이드를 삭제하시겠습니까?')) {
      try {
        const slideRef = doc(db, 'slides', slideId)
        await deleteDoc(slideRef)
        fetchSlides()
      } catch (error) {
        console.error('슬라이드 삭제 오류:', error)
        alert('슬라이드 삭제 중 오류가 발생했습니다.')
      }
    }
  }

  const handleSlideAddSuccess = () => {
    fetchSlides()
  }

  // 도서 필터링
  const getFilteredBooks = () => {
    if (activeFilter === '전체') {
      return books
    } else if (activeFilter === '서평') {
      return books.filter(book => book.category === '서평도서')
    } else if (activeFilter === '출간') {
      return books.filter(book => book.category === '출간도서')
    } else if (activeFilter === '추천') {
      return books.filter(book => book.category === '추천도서')
    }
    return books
  }

  // 도서 위로 이동
  const moveBookUp = async (bookId: string) => {
    const filteredBooks = getFilteredBooks()
    const currentIndex = filteredBooks.findIndex(book => book.id === bookId)
    
    if (currentIndex > 0) {
      const book = filteredBooks[currentIndex]
      const prevBook = filteredBooks[currentIndex - 1]
      
      // 두 도서의 createdAt을 교환 (실제로는 order 필드를 사용하는 것이 좋지만, 간단하게 createdAt을 조정)
      try {
        const bookRef = doc(db, 'books', book.id)
        const prevBookRef = doc(db, 'books', prevBook.id)
        
        // 순서를 바꾸기 위해 createdAt을 교환
        const tempCreatedAt = book.createdAt
        await updateDoc(bookRef, {
          createdAt: prevBook.createdAt
        })
        await updateDoc(prevBookRef, {
          createdAt: tempCreatedAt
        })
        
        fetchBooks()
      } catch (error) {
        console.error('도서 이동 오류:', error)
        alert('도서 이동 중 오류가 발생했습니다.')
      }
    }
  }

  // 도서 아래로 이동
  const moveBookDown = async (bookId: string) => {
    const filteredBooks = getFilteredBooks()
    const currentIndex = filteredBooks.findIndex(book => book.id === bookId)
    
    if (currentIndex < filteredBooks.length - 1) {
      const book = filteredBooks[currentIndex]
      const nextBook = filteredBooks[currentIndex + 1]
      
      try {
        const bookRef = doc(db, 'books', book.id)
        const nextBookRef = doc(db, 'books', nextBook.id)
        
        // 순서를 바꾸기 위해 createdAt을 교환
        const tempCreatedAt = book.createdAt
        await updateDoc(bookRef, {
          createdAt: nextBook.createdAt
        })
        await updateDoc(nextBookRef, {
          createdAt: tempCreatedAt
        })
        
        fetchBooks()
      } catch (error) {
        console.error('도서 이동 오류:', error)
        alert('도서 이동 중 오류가 발생했습니다.')
      }
    }
  }

  // 도서 삭제
  const handleDeleteBook = async (bookId: string) => {
    if (window.confirm('정말 이 도서를 삭제하시겠습니까?')) {
      try {
        const bookRef = doc(db, 'books', bookId)
        await deleteDoc(bookRef)
        fetchBooks()
      } catch (error) {
        console.error('도서 삭제 오류:', error)
        alert('도서 삭제 중 오류가 발생했습니다.')
      }
    }
  }

  // 카테고리 태그 색상 (파스텔 톤)
  const getCategoryColor = (category: string) => {
    if (category === '추천도서') return categoryColors.recommended
    if (category === '출간도서') return categoryColors.published
    if (category === '서평도서') return categoryColors.review
    return categoryColors.other
  }

  // 카테고리 표시 이름
  const getCategoryLabel = (category: string) => {
    if (category === '추천도서') return '추천'
    if (category === '출간도서') return '출간'
    if (category === '서평도서') return '서평'
    return category
  }

  // 텍스트 자르기 함수 (기본값 200자, 회원 정보용으로도 사용)
  const truncateText = (text: string, maxLength: number = 200): string => {
    if (!text || text === '-') return text || '-'
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  // 카테고리 변경
  const handleCategoryChange = async (bookId: string, newCategory: string) => {
    try {
      const bookRef = doc(db, 'books', bookId)
      await updateDoc(bookRef, {
        category: newCategory
      })
      setOpenCategoryDropdown(null)
      fetchBooks()
    } catch (error) {
      console.error('카테고리 변경 오류:', error)
      alert('카테고리 변경 중 오류가 발생했습니다.')
    }
  }

  // 도서 통계 계산
  const getBookStats = () => {
    const totalBooks = books.length
    const reviewBooks = books.filter(book => book.category === '서평도서').length
    const publishedBooks = books.filter(book => book.category === '출간도서').length
    const recommendedBooks = books.filter(book => book.category === '추천도서').length
    return { totalBooks, reviewBooks, publishedBooks, recommendedBooks }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (error) {
      console.error('로그아웃 오류:', error)
      alert('로그아웃 중 오류가 발생했습니다.')
    }
  }

  // 날짜 포맷팅 함수
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '-'
    try {
      if (timestamp.toDate) {
        return timestamp.toDate().toISOString().split('T')[0]
      } else if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toISOString().split('T')[0]
      }
      return '-'
    } catch (error) {
      return '-'
    }
  }

  // 회원 가입일 포맷팅 함수 (25/11/11 13:35 형식)
  const formatMemberDate = (timestamp: any): string => {
    if (!timestamp) return '-'
    try {
      let date: Date
      if (timestamp.toDate) {
        date = timestamp.toDate()
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000)
      } else {
        return '-'
      }

      const year = date.getFullYear().toString().slice(-2)
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')

      return `${year}/${month}/${day} ${hours}:${minutes}`
    } catch (error) {
      return '-'
    }
  }

  // 중간 생략 함수 (앞뒤를 보여주고 중간 생략)
  const truncateMiddle = (text: string, maxLength: number): string => {
    if (!text || text === '-') return '-'
    if (text.length <= maxLength) return text
    const front = Math.floor(maxLength / 2)
    const back = maxLength - front - 3 // 3은 '...' 길이
    return text.substring(0, front) + '...' + text.substring(text.length - back)
  }

  // 선택된 항목들 Excel 다운로드 함수 (CSV 형식으로 다운로드)
  const handleBulkExcelDownload = async () => {
    if (selectedApplications.size === 0) {
      alert('다운로드할 항목을 선택해주세요.')
      return
    }

    try {
      const selectedApps = reviewApplications.filter(app => selectedApplications.has(app.서평ID))
      
      // CSV 데이터 준비
      const headers = ['회원ID', '이름', '닉네임', '휴대폰', '도서명', '신청일', '서평신청갯수', '처리상태', '발송일', '완료일', '블로그링크', '인스타링크', '관리자메모']
      
      const rows = selectedApps.map(app => [
        app.applicantId || app.회원ID,
        app.applicantName,
        app.applicantNickname || '-',
        app.applicantPhone,
        app.bookTitle,
        formatDate(app.신청일),
        app.서평갯수 || 0,
        app.처리상태,
        formatDate(app.발송일),
        formatDate(app.완료일),
        app.applicantBlog || '-',
        app.applicantInstagram || '-',
        app.관리자메모 || ''
      ])

      // CSV 형식으로 변환 (BOM 추가로 Excel에서 한글 깨짐 방지)
      const csvRows = rows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      const csvContent = '\uFEFF' + headers.join(',') + '\n' + csvRows.join('\n')

      // 파일 다운로드
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `서평신청_${selectedApps.length}건_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // 다운로드 후 상태를 도서발송으로 업데이트
      const now = Timestamp.now()
      await Promise.all(selectedApps.map(async (app) => {
        try {
          const applicationRef = doc(db, 'reviewApplications', app.서평ID)
          await updateDoc(applicationRef, {
            처리상태: '도서발송',
            발송일: now,
            updatedAt: now
          })
        } catch (error) {
          console.error('도서발송 상태 업데이트 실패:', error)
        }
      }))

      setSelectedApplications(new Set())
      alert(`${selectedApps.length}건의 서평 신청 정보가 다운로드되었습니다.`)
    } catch (error) {
      console.error('엑셀 다운로드 중 오류 발생:', error)
      alert('엑셀 다운로드 중 오류가 발생했습니다.')
    }
  }

  // 체크박스 선택/해제 핸들러
  const handleCheckboxChange = (applicationId: string) => {
    setSelectedApplications(prev => {
      const newSet = new Set(prev)
      if (newSet.has(applicationId)) {
        newSet.delete(applicationId)
      } else {
        newSet.add(applicationId)
      }
      return newSet
    })
  }

  // 처리 상태 업데이트
  const handleStatusChange = async (applicationId: string, newStatus: '서평신청' | '도서발송' | '서평대기' | '서평완료') => {
    try {
      const applicationRef = doc(db, 'reviewApplications', applicationId)
      const updateData: any = {
        처리상태: newStatus,
        updatedAt: Timestamp.now()
      }

      // 상태에 따라 날짜 자동 설정
      if (newStatus === '도서발송' && !reviewApplications.find(app => app.서평ID === applicationId)?.발송일) {
        updateData.발송일 = Timestamp.now()
      }
      if (newStatus === '서평완료' && !reviewApplications.find(app => app.서평ID === applicationId)?.완료일) {
        updateData.완료일 = Timestamp.now()
      }

      await updateDoc(applicationRef, updateData)

      setReviewApplications(prev =>
        prev.map(app =>
          app.서평ID === applicationId
            ? { ...app, 처리상태: newStatus, ...updateData }
            : app
        )
      )
    } catch (error) {
      console.error('처리 상태 업데이트 오류:', error)
      alert('처리 상태 업데이트 중 오류가 발생했습니다.')
    }
  }

  // 관리자 메모 업데이트
  const handleMemoUpdate = async (applicationId: string, memo: string) => {
    try {
      const applicationRef = doc(db, 'reviewApplications', applicationId)
      await updateDoc(applicationRef, {
        관리자메모: memo,
        updatedAt: Timestamp.now()
      })

      setReviewApplications(prev =>
        prev.map(app =>
          app.서평ID === applicationId
            ? { ...app, 관리자메모: memo }
            : app
        )
      )
    } catch (error) {
      console.error('관리자 메모 업데이트 오류:', error)
      alert('관리자 메모 업데이트 중 오류가 발생했습니다.')
    }
  }

  // 필터링된 서평 신청 목록
  const getFilteredApplications = () => {
    let filtered = reviewApplications
    
    if (selectedBookFilter !== '전체') {
      filtered = filtered.filter(app => app.bookTitle === selectedBookFilter)
    }
    
    return filtered
  }

  // 필터링된 회원 목록
  const getFilteredMembers = () => {
    if (!memberSearchQuery.trim()) {
      return members
    }
    
    const query = memberSearchQuery.toLowerCase().trim()
    return members.filter(member => {
      const name = (member.name || '').toLowerCase()
      const nickname = (member.nickname || '').toLowerCase()
      const email = (member.email || '').toLowerCase()
      const phone = (member.phone || '').toLowerCase()
      const id = (member.id || '').toLowerCase()
      
      return name.includes(query) || 
             nickname.includes(query) || 
             email.includes(query) || 
             phone.includes(query) ||
             id.includes(query)
    })
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const renderContent = () => {
    switch (activeMenu) {
      case 'main-slide':
        const activeSlides = slides.filter(slide => slide.isActive).sort((a, b) => a.order - b.order)
        const inactiveSlides = slides.filter(slide => !slide.isActive).sort((a, b) => a.order - b.order)
        
        return (
          <div className="content-section slide-management-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>📺 메인슬라이드 관리</h2>
              <button 
                onClick={async () => {
                  if (confirm('슬라이드 데이터베이스를 최신 스키마로 업데이트하시겠습니까?')) {
                    await runSlidesUpdate()
                    fetchSlides() // 업데이트 후 목록 새로고침
                  }
                }}
                style={{
                  padding: '8px 16px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}
              >
                DB 업데이트
              </button>
            </div>
            
            {/* ON AIR 슬라이드 영역 */}
            <div className="slide-section on-air-section">
              <div className="slide-section-header">
                        <h3>ON AIR 슬라이드 (16:9 비율 권장)</h3>
                <span className="slide-count">{activeSlides.length}개 활성</span>
              </div>
              <div className="slides-grid">
                {activeSlides.map((slide, index) => (
                  <div key={slide.id} className="slide-card">
                    <div className="slide-image-container">
                      {slide.imageUrl ? (
                        <img src={slide.imageUrl} alt={slide.title} className="slide-image" />
                      ) : (
                        <div className="slide-placeholder">
                          <span>카이드 이미지</span>
                        </div>
                      )}
                      {(slide.title || slide.subtitle) && (
                        <div className="slide-content-overlay">
                          {slide.title && (
                            <h4 
                              className="slide-title"
                              style={{ color: (slide as any).titleColor || '#FFFFFF' }}
                            >
                              {slide.title}
                            </h4>
                          )}
                          {slide.subtitle && (
                            <p 
                              className="slide-subtitle"
                              style={{ color: (slide as any).subtitleColor || '#FFFFFF' }}
                            >
                              {slide.subtitle}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="slide-actions">
                      <div className="slide-controls">
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={slide.isActive}
                            onChange={() => handleSlideToggle(slide.id, false, 'main')}
                          />
                          <span className="toggle-slider">활성</span>
                        </label>
                        {renderPostingPeriod(slide)}
                        <div className="slide-action-buttons">
                          <button 
                            type="button"
                            className="slide-edit-icon-bottom"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedSlide(slide)
                              setIsSlideEditModalOpen(true)
                            }}
                            title="편집"
                          >
                            ✏️
                          </button>
                          <button 
                            type="button"
                            className="slide-move-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              moveSlideUp(slide.id, 'main')
                            }}
                            disabled={index === 0}
                            title="왼쪽으로 이동"
                          >
                            ←
                          </button>
                          <button 
                            type="button"
                            className="slide-move-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              moveSlideDown(slide.id, 'main')
                            }}
                            disabled={index === activeSlides.length - 1}
                            title="오른쪽으로 이동"
                          >
                            →
                          </button>
                          <button 
                            type="button"
                            className="slide-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteSlide(slide.id)
                            }}
                            title="삭제"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* 새 슬라이드 추가 영역 */}
                <div 
                  className="slide-card add-slide-card"
                  onClick={() => {
                    setSelectedSlide(null)
                    setIsSlideModalOpen(true)
                  }}
                >
                  <div className="add-slide-area">
                    <div className="add-slide-icon">📷+</div>
                    <p>슬라이드 추가</p>
                    <button className="add-slide-button">+ 새 슬라이드 추가</button>
                  </div>
                </div>
              </div>
            </div>

            {/* OFF 슬라이드 영역 */}
            <div className="slide-section off-section">
              <div className="slide-section-header">
                <h3>OFF 슬라이드</h3>
                <span className="slide-count">{inactiveSlides.length}개 비활성</span>
              </div>
              {inactiveSlides.length === 0 ? (
                <div className="empty-slides-message">비활성 슬라이드가 없습니다.</div>
              ) : (
                <div className="slides-grid">
                  {inactiveSlides.map((slide) => (
                    <div key={slide.id} className="slide-card">
                      <div className="slide-image-container">
                        {slide.imageUrl ? (
                          <img src={slide.imageUrl} alt={slide.title} className="slide-image" />
                        ) : (
                          <div className="slide-placeholder">
                            <span>카이드 이미지</span>
                          </div>
                        )}
                        {(slide.title || slide.subtitle) && (
                          <div className="slide-content-overlay">
                            {slide.title && (
                              <h4 
                                className="slide-title"
                                style={{ color: (slide as any).titleColor || '#FFFFFF' }}
                              >
                                {slide.title}
                              </h4>
                            )}
                            {slide.subtitle && (
                              <p 
                                className="slide-subtitle"
                                style={{ color: (slide as any).subtitleColor || '#FFFFFF' }}
                              >
                                {slide.subtitle}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="slide-actions">
                        <div className="slide-controls">
                          <label className="toggle-switch inactive">
                            <input
                              type="checkbox"
                              checked={slide.isActive}
                              onChange={() => handleSlideToggle(slide.id, true)}
                            />
                            <span className="toggle-slider">비활성</span>
                          </label>
                          {renderPostingPeriod(slide)}
                          <div className="slide-action-buttons">
                            <button 
                              type="button"
                              className="slide-edit-icon-bottom"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedSlide(slide)
                                setIsSlideEditModalOpen(true)
                              }}
                              title="편집"
                            >
                              ✏️
                            </button>
                            <button 
                              type="button"
                              className="slide-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteSlide(slide.id)
                              }}
                              title="삭제"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      case 'books':
        const filteredBooks = getFilteredBooks()
        const stats = getBookStats()
        return (
          <div className="content-section books-section">
            <div className="books-header">
              <div className="header-left">
                <h2>📚 도서 관리</h2>
            <div className="book-stats-container">
              <div className="book-stat-card" style={{ backgroundColor: statCardColors[0] }}>
                <div className="stat-label">등록된 도서</div>
                <div className="stat-value">{stats.totalBooks}</div>
              </div>
              <div className="book-stat-card" style={{ backgroundColor: statCardColors[1] }}>
                <div className="stat-label">서평도서</div>
                <div className="stat-value">{stats.reviewBooks}</div>
              </div>
              <div className="book-stat-card" style={{ backgroundColor: statCardColors[2] }}>
                <div className="stat-label">출간도서</div>
                <div className="stat-value">{stats.publishedBooks}</div>
              </div>
              <div className="book-stat-card" style={{ backgroundColor: statCardColors[3] }}>
                <div className="stat-label">추천도서</div>
                <div className="stat-value">{stats.recommendedBooks}</div>
              </div>
            </div>
              </div>
              <button 
                className="add-book-btn" 
                onClick={() => setIsBookModalOpen(true)}
              >
                + 도서 추가
              </button>
            </div>
            <div className="book-filters">
              <button 
                className={`filter-tab ${activeFilter === '전체' ? 'active' : ''}`}
                onClick={() => setActiveFilter('전체')}
              >
                전체
              </button>
              <button 
                className={`filter-tab ${activeFilter === '서평' ? 'active' : ''}`}
                onClick={() => setActiveFilter('서평')}
              >
                서평
              </button>
              <button 
                className={`filter-tab ${activeFilter === '출간' ? 'active' : ''}`}
                onClick={() => setActiveFilter('출간')}
              >
                출간
              </button>
              <button 
                className={`filter-tab ${activeFilter === '추천' ? 'active' : ''}`}
                onClick={() => setActiveFilter('추천')}
              >
                추천
              </button>
            </div>
            <div className="book-card-list">
              {loading ? (
                <div className="loading-message">로딩 중...</div>
              ) : filteredBooks.length === 0 ? (
                <div className="empty-message">등록된 도서가 없습니다.</div>
              ) : (
                filteredBooks.map((book, index) => (
                  <div 
                    key={book.id} 
                    className="book-card-item"
                    onClick={() => {
                      setSelectedBook(book)
                      setIsBookModalOpen(true)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="book-card-left">
                      <div className="book-image-container">
                        {book.imageUrl ? (
                          <img 
                            src={book.imageUrl} 
                            alt={book.title}
                            className="book-card-image"
                          />
                        ) : (
                          <div className="book-placeholder">
                            📚
                          </div>
                        )}
                      </div>
                      <div className="book-info" style={{ display: 'block', visibility: 'visible', opacity: 1, flex: 1, minWidth: 0 }}>
                        <h3 className="book-title" style={{ fontSize: '24px', fontWeight: 700, color: '#000000', margin: '0 0 0.5rem 0', lineHeight: 1.4, display: 'block' }}>{book.title}</h3>
                        <p className="book-author" style={{ fontSize: '20px', fontWeight: 500, color: '#000000', margin: '0 0 0.5rem 0', lineHeight: 1.4, display: 'block' }}>{book.author}</p>
                        <p className="book-description" style={{ fontSize: '18px', color: '#000000', margin: 0, lineHeight: 1.6, display: 'block' }}>{truncateText(book.description || '도서 설명이 없습니다.')}</p>
                      </div>
                    </div>
                    <div className="book-card-right">
                        <div className="category-dropdown-container" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="category-tag" 
                            style={{ backgroundColor: getCategoryColor(book.category || '') }}
                            onClick={() => setOpenCategoryDropdown(openCategoryDropdown === book.id ? null : book.id)}
                          >
                            {getCategoryLabel(book.category || '')}
                            <span className="dropdown-arrow">▼</span>
                          </button>
                        {openCategoryDropdown === book.id && (
                          <div className="category-dropdown-menu">
                            <button 
                              className={`dropdown-item ${book.category === '서평도서' ? 'active' : ''}`}
                              onClick={() => handleCategoryChange(book.id, '서평도서')}
                            >
                              서평
                            </button>
                            <button 
                              className={`dropdown-item ${book.category === '출간도서' ? 'active' : ''}`}
                              onClick={() => handleCategoryChange(book.id, '출간도서')}
                            >
                              출간
                            </button>
                            <button 
                              className={`dropdown-item ${book.category === '추천도서' ? 'active' : ''}`}
                              onClick={() => handleCategoryChange(book.id, '추천도서')}
                            >
                              추천
                            </button>
                          </div>
                        )}
                      </div>
                        <div className="book-actions" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="move-btn move-up"
                            title="위로 이동"
                            onClick={() => moveBookUp(book.id)}
                            disabled={index === 0}
                          >
                            ↑
                          </button>
                          <button 
                            className="move-btn move-down"
                            title="아래로 이동"
                            onClick={() => moveBookDown(book.id)}
                            disabled={index === filteredBooks.length - 1}
                          >
                            ↓
                          </button>
                          <button 
                            className="delete-book-btn"
                            title="삭제"
                            onClick={() => handleDeleteBook(book.id)}
                          >
                            🗑️
                          </button>
                        </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      case 'ad-management':
        const activeAdSlides = slides.filter(slide => slide.isActive && slide.slideType === 'ad').sort((a, b) => a.order - b.order)
        const inactiveAdSlides = slides.filter(slide => !slide.isActive && slide.slideType === 'ad').sort((a, b) => a.order - b.order)
        
        return (
          <div className="content-section slide-management-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>📢 광고슬라이드 관리</h2>
              <button 
                onClick={async () => {
                  if (confirm('광고 슬라이드 데이터베이스를 최신 스키마로 업데이트하시겠습니까?')) {
                    await runSlidesUpdate()
                    fetchSlides() // 업데이트 후 목록 새로고침
                  }
                }}
                style={{
                  padding: '8px 16px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500
                }}
              >
                DB 업데이트
              </button>
            </div>
            
            {/* ON AIR 광고 슬라이드 영역 */}
            <div className="slide-section on-air-section">
              <div className="slide-section-header">
                <h3>ON AIR 광고 슬라이드 (16:9 비율 권장)</h3>
                <span className="slide-count">{activeAdSlides.length}개 활성</span>
              </div>
              <div className="slides-grid">
                {activeAdSlides.map((slide, index) => (
                  <div key={slide.id} className="slide-card">
                    <div className="slide-image-container">
                      {slide.imageUrl ? (
                        <img src={slide.imageUrl} alt={slide.title} className="slide-image" />
                      ) : (
                        <div className="slide-placeholder">
                          <span>카이드 이미지</span>
                        </div>
                      )}
                      {(slide.title || slide.subtitle) && (
                        <div className="slide-content-overlay">
                          {slide.title && (
                            <h4 
                              className="slide-title"
                              style={{ color: (slide as any).titleColor || '#FFFFFF' }}
                            >
                              {slide.title}
                            </h4>
                          )}
                          {slide.subtitle && (
                            <p 
                              className="slide-subtitle"
                              style={{ color: (slide as any).subtitleColor || '#FFFFFF' }}
                            >
                              {slide.subtitle}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="slide-actions">
                      <div className="slide-controls">
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={slide.isActive}
                            onChange={() => handleSlideToggle(slide.id, false, 'ad')}
                          />
                          <span className="toggle-slider">활성</span>
                        </label>
                        {renderPostingPeriod(slide)}
                        <div className="slide-action-buttons">
                          <button 
                            type="button"
                            className="slide-edit-icon-bottom"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedSlide(slide)
                              setIsSlideEditModalOpen(true)
                            }}
                            title="편집"
                          >
                            ✏️
                          </button>
                          <button 
                            type="button"
                            className="slide-move-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              moveSlideUp(slide.id, 'ad')
                            }}
                            disabled={index === 0}
                            title="왼쪽으로 이동"
                          >
                            ←
                          </button>
                          <button 
                            type="button"
                            className="slide-move-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              moveSlideDown(slide.id, 'ad')
                            }}
                            disabled={index === activeAdSlides.length - 1}
                            title="오른쪽으로 이동"
                          >
                            →
                          </button>
                          <button 
                            type="button"
                            className="slide-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteSlide(slide.id)
                            }}
                            title="삭제"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* 새 광고 슬라이드 추가 영역 */}
                <div 
                  className="slide-card add-slide-card"
                  onClick={() => {
                    setSelectedSlide(null)
                    setIsSlideModalOpen(true)
                  }}
                >
                  <div className="add-slide-area">
                    <div className="add-slide-icon">📷+</div>
                    <p>광고 슬라이드 추가</p>
                    <button className="add-slide-button">+ 새 광고 슬라이드 추가</button>
                  </div>
                </div>
              </div>
            </div>

            {/* OFF 광고 슬라이드 영역 */}
            <div className="slide-section off-section">
              <div className="slide-section-header">
                <h3>OFF 광고 슬라이드</h3>
                <span className="slide-count">{inactiveAdSlides.length}개 비활성</span>
              </div>
              {inactiveAdSlides.length === 0 ? (
                <div className="empty-slides-message">비활성 광고 슬라이드가 없습니다.</div>
              ) : (
                <div className="slides-grid">
                  {inactiveAdSlides.map((slide) => (
                    <div key={slide.id} className="slide-card">
                      <div className="slide-image-container">
                        {slide.imageUrl ? (
                          <img src={slide.imageUrl} alt={slide.title} className="slide-image" />
                        ) : (
                          <div className="slide-placeholder">
                            <span>카이드 이미지</span>
                          </div>
                        )}
                        {(slide.title || slide.subtitle) && (
                          <div className="slide-content-overlay">
                            {slide.title && (
                              <h4 
                                className="slide-title"
                                style={{ color: (slide as any).titleColor || '#FFFFFF' }}
                              >
                                {slide.title}
                              </h4>
                            )}
                            {slide.subtitle && (
                              <p 
                                className="slide-subtitle"
                                style={{ color: (slide as any).subtitleColor || '#FFFFFF' }}
                              >
                                {slide.subtitle}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="slide-actions">
                        <div className="slide-controls">
                          <label className="toggle-switch inactive">
                            <input
                              type="checkbox"
                              checked={slide.isActive}
                              onChange={() => handleSlideToggle(slide.id, true, 'ad')}
                            />
                            <span className="toggle-slider">비활성</span>
                          </label>
                          {renderPostingPeriod(slide)}
                          <div className="slide-action-buttons">
                            <button 
                              type="button"
                              className="slide-edit-icon-bottom"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedSlide(slide)
                                setIsSlideEditModalOpen(true)
                              }}
                              title="편집"
                            >
                              ✏️
                            </button>
                            <button 
                              type="button"
                              className="slide-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteSlide(slide.id)
                              }}
                              title="삭제"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      case 'member-management':
        const filteredMembers = getFilteredMembers()
        return (
          <div className="member-management-page">
            <div className="member-table-container">
              <table className="member-table">
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox" />
                    </th>
                    <th>ID</th>
                    <th>이름</th>
                    <th>닉네임</th>
                    <th>휴대폰</th>
                    <th>Email</th>
                    <th>주소</th>
                    <th>가입일시</th>
                    <th>블로그</th>
                    <th>인스타그램</th>
                    <th>관리자</th>
                    <th>수정</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="loading-cell">로딩 중...</td>
                    </tr>
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="empty-cell">
                        {memberSearchQuery ? '검색 결과가 없습니다.' : '등록된 회원이 없습니다.'}
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => (
                      <tr key={member.uid}>
                        <td>
                          <input type="checkbox" />
                        </td>
                        <td
                          data-full-text={member.id || '-'}
                          title="클릭하여 상세 정보 보기"
                        >
                          <a
                            href="#"
                            className="table-link"
                            onClick={(e) => {
                              e.preventDefault()
                              openEditModal(member)
                            }}
                          >
                            {truncateText(member.id || '-', 12)}
                          </a>
                        </td>
                        <td data-full-text={member.name || '-'}>
                          {truncateText(member.name || '-', 8)}
                        </td>
                        <td data-full-text={member.nickname || '-'}>
                          {truncateText(member.nickname || '-', 12)}
                        </td>
                        <td data-full-text={member.phone || '-'}>
                          {truncateMiddle(member.phone || '-', 15)}
                        </td>
                        <td data-full-text={member.email || '-'}>
                          {truncateText(member.email || '-', 25)}
                        </td>
                        <td data-full-text={member.address || '-'}>
                          {truncateMiddle(member.address || '-', 20)}
                        </td>
                        <td data-full-text={formatMemberDate(member.createdAt)}>
                          {formatMemberDate(member.createdAt)}
                        </td>
                        <td data-full-text={member.blog || '-'}>
                          {member.blog ? (
                            <a href={member.blog.startsWith('http') ? member.blog : `https://${member.blog}`} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="link">
                              {truncateMiddle(member.blog, 20)}
                            </a>
                          ) : (
                            <span className="no-data">-</span>
                          )}
                        </td>
                        <td data-full-text={member.instagram || '-'}>
                          {member.instagram ? (
                            <a href={member.instagram.startsWith('http') ? member.instagram : `https://${member.instagram}`} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="link">
                              {truncateMiddle(member.instagram, 15)}
                            </a>
                          ) : (
                            <span className="no-data">-</span>
                          )}
                        </td>
                        <td>
                          {member.isAdmin ? (
                            <span className="admin-badge">관</span>
                          ) : (
                            <span className="no-data">-</span>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              type="button"
                              className="edit-icon" 
                              title="수정"
                              onClick={() => openEditModal(member)}
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="delete-icon"
                              title="삭제"
                              onClick={() => handleDeleteMember(member)}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      case 'review-management':
        const filteredApplications = getFilteredApplications()
        const uniqueBookTitles = Array.from(new Set(reviewApplications.map(app => app.bookTitle))).sort()
        
        return (
          <div className="content-section">
            <h2>Admin - 서평 관리</h2>
            <div className="review-management">
              <div className="review-applications-table-container">
                {/* 필터 컨트롤 - 정보출력 컬럼 위에 배치 */}
                <div 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    marginBottom: '10px',
                    padding: '8px 12px',
                    background: '#f8f9fa',
                    borderRadius: '4px',
                    fontSize: '0.85rem'
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#333' }}>신청 및 발송</span>
                  <div className="book-filter-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ margin: 0, fontSize: '0.85rem' }}>도서명:</label>
                    <select 
                      value={selectedBookFilter}
                      onChange={(e) => setSelectedBookFilter(e.target.value)}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        background: 'white'
                      }}
                    >
                      <option value="전체">전체</option>
                      {uniqueBookTitles.map(title => (
                        <option key={title} value={title}>{title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="monthly-limit-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <label style={{ margin: 0, fontSize: '0.85rem' }}>월별 서평신청 제한:</label>
                    <select
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        background: 'white'
                      }}
                    >
                      <option value="3">3권</option>
                      <option value="5">5권</option>
                      <option value="10">10권</option>
                    </select>
                  </div>
                </div>

                {selectedApplications.size > 0 && (
                  <div 
                    onClick={handleBulkExcelDownload}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                      marginBottom: '10px',
                      padding: '8px 12px',
                      background: '#ffffff',
                      borderRadius: '6px',
                      border: '2px solid #21a366',
                      cursor: 'pointer',
                      width: 'fit-content',
                      marginLeft: 'auto',
                      marginRight: 'auto',
                      boxShadow: '0 2px 4px rgba(33, 163, 102, 0.2)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f0f9f4'
                      e.currentTarget.style.transform = 'scale(1.05)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffffff'
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: '#21a366',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        boxShadow: '0 2px 4px rgba(33, 163, 102, 0.3)'
                      }}
                    >
                      {/* Excel 아이콘 - SVG로 구현 */}
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 40 40"
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        {/* 흰색 문서 배경 (왼쪽 상단이 살짝 접힌 형태) */}
                        <path
                          d="M 8 6 L 8 30 L 26 30 L 26 8 L 12 8 L 8 6 Z"
                          fill="white"
                          stroke="#21a366"
                          strokeWidth="0.5"
                          transform="rotate(-8 17 18)"
                        />
                        {/* 접힌 부분 */}
                        <path
                          d="M 8 6 L 12 8 L 12 12 L 8 10 Z"
                          fill="#e8f5e9"
                          transform="rotate(-8 17 18)"
                        />
                        {/* 녹색 X */}
                        <text
                          x="11"
                          y="21"
                          fontSize="18"
                          fontWeight="bold"
                          fill="#21a366"
                          fontFamily="Arial, sans-serif"
                          transform="rotate(-8 17 18)"
                        >
                          X
                        </text>
                        {/* 격자 무늬 (오른쪽 부분) */}
                        <g transform="rotate(-8 17 18)">
                          <line x1="18" y1="11" x2="23" y2="11" stroke="#21a366" strokeWidth="0.8" />
                          <line x1="18" y1="14" x2="23" y2="14" stroke="#21a366" strokeWidth="0.8" />
                          <line x1="18" y1="17" x2="23" y2="17" stroke="#21a366" strokeWidth="0.8" />
                          <line x1="18" y1="20" x2="23" y2="20" stroke="#21a366" strokeWidth="0.8" />
                          <line x1="18" y1="23" x2="23" y2="23" stroke="#21a366" strokeWidth="0.8" />
                          <line x1="18" y1="9" x2="18" y2="26" stroke="#21a366" strokeWidth="0.8" />
                          <line x1="20.5" y1="9" x2="20.5" y2="26" stroke="#21a366" strokeWidth="0.8" />
                          <line x1="23" y1="9" x2="23" y2="26" stroke="#21a366" strokeWidth="0.8" />
                        </g>
                      </svg>
                    </div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#21a366',
                        marginTop: '2px'
                      }}
                    >
                      다운로드
                    </span>
                  </div>
                )}
                <table className="review-applications-table">
                  <thead>
                    <tr>
                      <th>회원ID</th>
                      <th>이름</th>
                      <th>닉네임</th>
                      <th>휴대폰</th>
                      <th>도서명</th>
                      <th>신청일</th>
                      <th>서평신청갯수</th>
                      <th>처리상태</th>
                      <th>정보출력</th>
                      <th>발송일</th>
                      <th>완료일</th>
                      <th>블로그링크</th>
                      <th>인스타링크</th>
                      <th>관리자메모</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={14} className="loading-cell">로딩 중...</td>
                      </tr>
                    ) : filteredApplications.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="empty-cell">서평 신청 내역이 없습니다.</td>
                      </tr>
                    ) : (
                      filteredApplications.map((app) => (
                        <tr key={app.서평ID}>
                          <td>{app.applicantId || app.회원ID}</td>
                          <td>{app.applicantName || '-'}</td>
                          <td>{app.applicantNickname || '-'}</td>
                          <td>{app.applicantPhone || '-'}</td>
                          <td>
                            <a 
                              href={`#book-${app.도서ID}`}
                              style={{ color: '#667eea', textDecoration: 'none' }}
                            >
                              {app.bookTitle || '-'}
                            </a>
                          </td>
                          <td>{formatDate(app.신청일)}</td>
                          <td>{app.서평갯수 || 0}</td>
                          <td>
                            <select
                              value={app.처리상태}
                              onChange={(e) => handleStatusChange(app.서평ID, e.target.value as any)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #ddd',
                                fontSize: '0.9rem'
                              }}
                            >
                              <option value="서평신청">서평신청</option>
                              <option value="도서발송">도서발송</option>
                              <option value="서평대기">서평대기</option>
                              <option value="서평완료">서평완료</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedApplications.has(app.서평ID)}
                              onChange={() => handleCheckboxChange(app.서평ID)}
                              style={{ cursor: 'pointer' }}
                            />
                          </td>
                          <td>{formatDate(app.발송일)}</td>
                          <td>{formatDate(app.완료일)}</td>
                          <td>
                            {app.applicantBlog ? (
                              <a 
                                href={app.applicantBlog.startsWith('http') ? app.applicantBlog : `https://${app.applicantBlog}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#667eea', textDecoration: 'none' }}
                              >
                                블로그
                              </a>
                            ) : (
                              <button 
                                style={{
                                  padding: '4px 8px',
                                  background: '#f0f0f0',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem'
                                }}
                              >
                                블로그 링크
                              </button>
                            )}
                          </td>
                          <td>
                            {app.applicantInstagram ? (
                              <a 
                                href={app.applicantInstagram.startsWith('http') ? app.applicantInstagram : `https://${app.applicantInstagram}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: '#667eea', textDecoration: 'none' }}
                              >
                                인스타
                              </a>
                            ) : (
                              <button 
                                style={{
                                  padding: '4px 8px',
                                  background: '#f0f0f0',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.85rem'
                                }}
                              >
                                인스타 링크
                              </button>
                            )}
                          </td>
                          <td>
                            <input
                              type="text"
                              value={app.관리자메모 || ''}
                              onChange={(e) => {
                                // 실시간 업데이트는 debounce 없이 바로 처리
                                const newMemo = e.target.value
                                setReviewApplications(prev =>
                                  prev.map(a =>
                                    a.서평ID === app.서평ID
                                      ? { ...a, 관리자메모: newMemo }
                                      : a
                                  )
                                )
                              }}
                              onBlur={(e) => {
                                if (e.target.value !== app.관리자메모) {
                                  handleMemoUpdate(app.서평ID, e.target.value)
                                }
                              }}
                              placeholder="메모 입력..."
                              style={{
                                width: '150px',
                                padding: '4px 8px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '0.85rem'
                              }}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-nav">
          <button className="hamburger-btn" onClick={toggleMobileMenu}>
            ☰
          </button>
          <h1 style={{ 
            position: 'absolute', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 1,
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 600,
            color: '#333'
          }}>
            {activeMenu === 'member-management' ? '회원 관리' : '관리자 페이지'}
          </h1>
          <div className="header-right">
            {activeMenu === 'member-management' && (
              <button 
                className="add-member-btn" 
                onClick={openSignupModal}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  whiteSpace: 'nowrap',
                  marginRight: '0.5rem'
                }}
              >
                + 회원 추가
              </button>
            )}
            <button className="logout-btn" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 메뉴 오버레이 */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-menu-overlay" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="admin-layout">
        <aside className={`admin-sidebar ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
          <div className="sidebar-title">Admin</div>
          <nav className="sidebar-nav">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
                onClick={() => {
                  handleMenuClick(item.id)
                  setIsMobileMenuOpen(false) // 모바일에서 메뉴 선택 시 닫기
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="admin-main-content">
          {renderContent()}
        </main>
      </div>

      {/* 회원 수정 모달 */}
      <MemberEditModal
        isOpen={isEditModalOpen}
        onClose={closeEditModal}
        member={selectedMember}
        onUpdate={handleMemberUpdate}
      />

      {/* 회원 추가 모달 */}
          <NewSignupModal
            isOpen={isSignupModalOpen}
            onClose={closeSignupModal}
            onSuccess={handleSignupSuccess}
            isAdmin={true}
          />

      {/* 도서 추가 모달 */}
      <BookAddModal
        isOpen={isBookModalOpen}
        onClose={() => {
          setIsBookModalOpen(false)
          setSelectedBook(null)
        }}
        onSuccess={handleBookAddSuccess}
        editBook={selectedBook}
      />

      {/* 도서 수정 모달 */}
      <BookEditModal
        isOpen={isBookEditModalOpen}
        onClose={closeBookEditModal}
        book={selectedBook}
        onUpdate={handleBookUpdate}
      />

      {/* 슬라이드 추가/수정 모달 */}
      <SlideAddModal
        isOpen={isSlideModalOpen || isSlideEditModalOpen}
        onClose={() => {
          setIsSlideModalOpen(false)
          setIsSlideEditModalOpen(false)
          setSelectedSlide(null)
        }}
        onSuccess={handleSlideAddSuccess}
        editSlide={selectedSlide}
        defaultSlideType={activeMenu === 'ad-management' ? 'ad' : 'main'}
      />
    </div>
  )
}

export default AdminPage
