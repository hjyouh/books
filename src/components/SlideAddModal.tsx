import React, { useState, useEffect } from 'react'
import { collection, addDoc, doc, updateDoc, Timestamp, getDocs, getDoc, query, orderBy, where } from 'firebase/firestore'
import { db } from '../firebase'
import ColorPaletteMenu from './ColorPaletteMenu'
import './SlideAddModal.css'
// 아이콘 이미지 import
import calendarIcon from '../assets/icons/calendar.png'
import colorPaletteIcon from '../assets/icons/color-palette.png'
import changeImageIcon from '../assets/icons/Chage-image.png'
import trashIcon64 from '../assets/icons/Trash.png'

interface SlideData {
  id?: string
  title?: string
  subtitle?: string
  imageUrl?: string
  linkUrl?: string
  linkType?: 'book' | 'ad' | 'custom'
  order?: number
  isActive?: boolean
  postingStart?: Timestamp | null
  postingEnd?: Timestamp | null
  bookCategory?: string
  selectedBookId?: string
}

interface SlideAddModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  editSlide?: SlideData | null
  defaultSlideType?: 'main' | 'ad' // 기본 슬라이드 타입 (메인/광고)
}

interface SlideFormData {
  slideType: 'main' | 'ad' // 슬라이드 구분 (메인슬라이드/광고 슬라이드)
  title: string
  subtitle: string
  imageUrl: string
  linkUrl: string
  linkType: 'book' | 'custom' // 링크 타입 (도서 페이지/커스텀링크)
  bookCategory?: string // 도서 구분 (서평/출간/추천)
  selectedBookId?: string // 선택된 도서 ID
  titleColor?: string // 제목 색상
  subtitleColor?: string // 부제목 색상
  postingStart: string
  postingEnd: string
}

const toDateInputValue = (value: any): string => {
  if (!value) return ''
  try {
    if (value.toDate) {
      return value.toDate().toISOString().split('T')[0]
    }
    if (value.seconds) {
      return new Date(value.seconds * 1000).toISOString().split('T')[0]
    }
    if (typeof value === 'string' && value.includes('-')) {
      return value
    }
  } catch (error) {
    console.error('날짜 변환 오류:', error)
  }
  return ''
}

declare global {
  interface Window {
    cloudinary: any
  }
}

const SlideAddModal: React.FC<SlideAddModalProps> = ({ isOpen, onClose, onSuccess, editSlide, defaultSlideType = 'main' }) => {
  const [formData, setFormData] = useState<SlideFormData>({
    slideType: defaultSlideType,
    title: '',
    subtitle: '',
    imageUrl: '',
    linkUrl: '',
    linkType: 'book', // 기본값을 'book'으로 변경
    bookCategory: '',
    selectedBookId: '',
    titleColor: '#FFFFFF',
    subtitleColor: '#FFFFFF',
    postingStart: '',
    postingEnd: ''
  })
  const [books, setBooks] = useState<any[]>([])
  const [filteredBooks, setFilteredBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [initialData, setInitialData] = useState<SlideFormData | null>(null)
  const widgetRef = React.useRef<any>(null)
  
  const isEditMode = !!editSlide

  // 도서 목록 가져오기
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const booksRef = collection(db, 'books')
        const q = query(booksRef, orderBy('createdAt', 'desc'))
        const querySnapshot = await getDocs(q)
        const booksData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setBooks(booksData)
      } catch (error) {
        console.error('도서 목록 가져오기 오류:', error)
      }
    }
    
    if (isOpen) {
      fetchBooks()
    }
  }, [isOpen])

  // 도서 구분별 필터링
  useEffect(() => {
    if (formData.linkType === 'book' && formData.bookCategory) {
      const categoryMap: { [key: string]: string } = {
        '서평': '서평도서',
        '출간': '출간도서',
        '추천': '추천도서'
      }
      const filtered = books.filter(book => book.category === categoryMap[formData.bookCategory || ''])
      setFilteredBooks(filtered)
    } else {
      setFilteredBooks([])
    }
  }, [formData.linkType, formData.bookCategory, books])

  // 선택된 도서 ID로 링크 URL 자동 설정
  useEffect(() => {
    if (formData.linkType === 'book' && formData.selectedBookId) {
      const selectedBook = filteredBooks.find(book => book.id === formData.selectedBookId)
      if (selectedBook) {
        setFormData(prev => ({
          ...prev,
          linkUrl: `/book/${selectedBook.id}`
        }))
      }
    }
  }, [formData.selectedBookId, formData.linkType, filteredBooks])

  // defaultSlideType 변경 시 formData 업데이트 (추가 모드에서만)
  useEffect(() => {
    if (!isEditMode && isOpen && !editSlide) {
      setFormData(prev => ({
        ...prev,
        slideType: defaultSlideType
      }))
    }
  }, [defaultSlideType, isOpen, isEditMode, editSlide])

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (isEditMode && editSlide && isOpen) {
      // linkUrl에서 도서 ID 추출 (예: /book/{id})
      const bookIdMatch = editSlide.linkUrl?.match(/\/book\/(.+)/)
      const bookCategoryMatch = editSlide.linkUrl?.match(/category\/(.+)/)
      
      // linkType 처리: 'ad'는 제거하고 'book'으로 변환, 없으면 기본값 'book'
      let linkType: 'book' | 'custom' = 'book'
      if (editSlide.linkType === 'custom') {
        linkType = 'custom'
      } else if (editSlide.linkType === 'book') {
        linkType = 'book'
      } else if (editSlide.linkType === 'ad') {
        linkType = 'book' // 'ad' 타입은 'book'으로 변환
      }
      // else: 기본값 'book' 사용
      
      const initialFormData: SlideFormData = {
        slideType: (editSlide as any).slideType || defaultSlideType,
        title: editSlide.title || '',
        subtitle: editSlide.subtitle || '',
        imageUrl: editSlide.imageUrl || '',
        linkUrl: editSlide.linkUrl || '',
        linkType: linkType,
        bookCategory: (editSlide as any).bookCategory || (bookCategoryMatch ? bookCategoryMatch[1] : ''),
        selectedBookId: (editSlide as any).selectedBookId || (bookIdMatch ? bookIdMatch[1] : ''),
        titleColor: (editSlide as any).titleColor ? String((editSlide as any).titleColor).toUpperCase() : '#FFFFFF',
        subtitleColor: (editSlide as any).subtitleColor ? String((editSlide as any).subtitleColor).toUpperCase() : '#FFFFFF',
        postingStart: toDateInputValue((editSlide as any).postingStart),
        postingEnd: toDateInputValue((editSlide as any).postingEnd)
      }
      console.log('수정 모드 - 로드된 linkType:', linkType, 'editSlide.linkType:', editSlide.linkType)
      // 확실히 linkType이 'book' 또는 'custom' 중 하나가 되도록 설정
      const finalFormData = {
        ...initialFormData,
        linkType: linkType === 'custom' ? 'custom' : 'book'
      }
      setFormData(finalFormData)
      // 깊은 복사로 initialData 저장 (객체 참조 문제 방지)
      setInitialData(JSON.parse(JSON.stringify(finalFormData)))
      setImagePreview(editSlide.imageUrl || null)
      setHasChanges(false)
    } else if (!isEditMode && isOpen) {
      // 추가 모드: 확실히 'book'으로 초기화
      const defaultFormData: SlideFormData = {
        slideType: defaultSlideType,
        title: '',
        subtitle: '',
        imageUrl: '',
        linkUrl: '',
        linkType: 'book', // 기본값 명시적으로 'book'
        bookCategory: '',
        selectedBookId: '',
        titleColor: '#FFFFFF',
        subtitleColor: '#FFFFFF',
        postingStart: '',
        postingEnd: ''
      }
      console.log('추가 모드 - 초기화 linkType:', defaultFormData.linkType)
      // 확실히 'book'으로 설정
      setFormData({
        ...defaultFormData,
        linkType: 'book'
      })
      setInitialData({
        ...defaultFormData,
        linkType: 'book'
      })
      setImagePreview(null)
      setHasChanges(false)
    }
  }, [editSlide, isOpen, isEditMode])

  // 필드 변경 감지
  useEffect(() => {
    if (isEditMode && initialData) {
      // 색상 값을 대소문자 무시하고 비교 (normalize)
      const normalizeColor = (color: string | undefined) => color?.toUpperCase() || '#FFFFFF'
      
      // 문자열 필드 정규화 함수
      const normalizeString = (str: string | undefined) => (str || '').trim()
      
      // 각 필드를 개별적으로 비교하여 정확한 변경 감지
      const fieldChanges = {
        slideType: String(formData.slideType || '') !== String(initialData.slideType || ''),
        title: normalizeString(formData.title) !== normalizeString(initialData.title),
        subtitle: normalizeString(formData.subtitle) !== normalizeString(initialData.subtitle),
        imageUrl: normalizeString(formData.imageUrl) !== normalizeString(initialData.imageUrl),
        linkUrl: normalizeString(formData.linkUrl) !== normalizeString(initialData.linkUrl),
        linkType: String(formData.linkType || '') !== String(initialData.linkType || ''),
        bookCategory: String(formData.bookCategory || '') !== String(initialData.bookCategory || ''),
        selectedBookId: String(formData.selectedBookId || '') !== String(initialData.selectedBookId || ''),
        titleColor: normalizeColor(formData.titleColor) !== normalizeColor(initialData.titleColor),
        subtitleColor: normalizeColor(formData.subtitleColor) !== normalizeColor(initialData.subtitleColor),
        postingStart: normalizeString(formData.postingStart) !== normalizeString(initialData.postingStart),
        postingEnd: normalizeString(formData.postingEnd) !== normalizeString(initialData.postingEnd)
      }
      
      const changed = Object.values(fieldChanges).some(v => v === true)
      setHasChanges(changed)
      
      // 디버깅을 위한 로그 (항상 출력)
      console.log('변경 감지 상태:', {
        hasChanges: changed,
        fieldChanges,
        formDataTitleColor: formData.titleColor,
        initialDataTitleColor: initialData.titleColor,
        formDataSubtitleColor: formData.subtitleColor,
        initialDataSubtitleColor: initialData.subtitleColor
      })
    } else {
      // 편집 모드가 아니거나 initialData가 없으면 변경사항 없음
      setHasChanges(false)
    }
  }, [formData, initialData, isEditMode])

  // Cloudinary 위젯 초기화
  useEffect(() => {
    if (!isOpen) return

    // 모달이 열릴 때마다 기존 위젯 참조 초기화
    widgetRef.current = null

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

    if (!cloudName || !uploadPreset) {
      console.warn('Cloudinary 환경 변수가 설정되지 않았습니다. VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET 값이 필요합니다.')
      return
    }

    const createWidget = () => {
      if (!window.cloudinary || widgetRef.current) return

      try {
        const widget = window.cloudinary.createUploadWidget(
          {
            cloudName,
            uploadPreset,
            cropping: true,
            croppingAspectRatio: 16 / 9,
            maxFiles: 1,
            multiple: false,
            maxFileSize: 10000000
          },
          (error: any, result: any) => {
            if (!error && result && result.event === 'success') {
              handleCloudinaryUpload(result.info.secure_url)
            } else if (error) {
              handleCloudinaryError(error.message || '이미지 업로드 중 오류가 발생했습니다.')
            }
          }
        )

        if (!widget) {
          console.warn('Cloudinary 위젯 생성에 실패했습니다. 설정을 확인해주세요.')
          return
        }

        widgetRef.current = widget
      } catch (error) {
        console.warn('Cloudinary 위젯 생성 중 오류:', error)
      }
    }
    if (window.cloudinary) {
      createWidget()
      return
    }

    const scriptSelector = 'script[data-cloudinary-widget="true"]'
    let scriptEl = document.querySelector<HTMLScriptElement>(scriptSelector)

    const handleScriptLoad = () => {
      createWidget()
    }

    if (!scriptEl) {
      scriptEl = document.createElement('script')
      scriptEl.src = 'https://upload-widget.cloudinary.com/global/all.js'
      scriptEl.async = true
      scriptEl.dataset.cloudinaryWidget = 'true'
      scriptEl.addEventListener('load', handleScriptLoad)
      scriptEl.addEventListener('error', () => {
        console.warn('Cloudinary 스크립트를 불러오지 못했습니다.')
      })
      document.body.appendChild(scriptEl)
    } else {
      scriptEl.addEventListener('load', handleScriptLoad)
    }

    const checkInterval = window.setInterval(() => {
      if (window.cloudinary) {
        createWidget()
        window.clearInterval(checkInterval)
      }
    }, 150)

    const timeoutId = window.setTimeout(() => {
      window.clearInterval(checkInterval)
    }, 6000)

    return () => {
      scriptEl?.removeEventListener('load', handleScriptLoad)
      window.clearInterval(checkInterval)
      window.clearTimeout(timeoutId)
      if (!isOpen) {
        widgetRef.current = null
      }
    }
  }, [isOpen])

  const openUploadWidget = () => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

    if (!cloudName || !uploadPreset) {
      alert('이미지 업로드가 비활성화되어 있습니다. Cloudinary 설정을 확인해주세요.')
      return
    }

    if (widgetRef.current && typeof widgetRef.current.open === 'function') {
      try {
        widgetRef.current.open()
      } catch (error) {
        console.warn('Cloudinary 위젯 open 중 오류, 새 위젯을 생성합니다.', error)
        widgetRef.current = null
        initNewWidget()
      }
    } else if (window.cloudinary) {
      initNewWidget()
    } else {
      alert('이미지 업로드 서비스를 불러올 수 없습니다. 페이지를 새로고침해주세요.')
      if (!document.querySelector('script[data-cloudinary-widget="true"]')) {
        const script = document.createElement('script')
        script.src = 'https://upload-widget.cloudinary.com/global/all.js'
        script.async = true
        script.dataset.cloudinaryWidget = 'true'
        script.onload = () => {
          setTimeout(() => {
            initNewWidget()
          }, 500)
        }
        document.head.appendChild(script)
      }
    }
  }
  
  const initNewWidget = () => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

    if (!cloudName || !uploadPreset) {
      console.warn('Cloudinary 설정이 없습니다. 위젯을 생성할 수 없습니다.')
      return
    }

    if (!window.cloudinary) return
    
    try {
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName,
          uploadPreset,
          cropping: true,
          croppingAspectRatio: 16 / 9,
          maxFiles: 1,
          multiple: false,
          maxFileSize: 10000000,
        },
        (error: any, result: any) => {
          if (!error && result && result.event === 'success') {
            handleCloudinaryUpload(result.info.secure_url)
          } else if (error) {
            handleCloudinaryError(error.message || '이미지 업로드 중 오류가 발생했습니다.')
          }
        }
      )

      if (!widget) {
        console.warn('Cloudinary 위젯 생성에 실패했습니다.')
        return
      }

      widgetRef.current = widget
      widget.open()
    } catch (error) {
      console.error('위젯 생성 오류:', error)
      alert('이미지 업로드 위젯을 생성할 수 없습니다.')
    }
  }

  const handleCloudinaryUpload = (url: string) => {
    setFormData(prev => ({
      ...prev,
      imageUrl: url
    }))
    setImagePreview(url)
  }

  const handleCloudinaryError = (error: string) => {
    console.warn('Cloudinary 업로드 오류:', error)
    alert(error)
  }

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      imageUrl: ''
    }))
    setImagePreview(null)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      }
      // 링크 타입이 변경되면 관련 필드 초기화
      if (name === 'linkType' && value !== 'book') {
        updated.bookCategory = ''
        updated.selectedBookId = ''
        updated.linkUrl = ''
      }
      // 도서 구분이 변경되면 선택된 도서 초기화
      if (name === 'bookCategory') {
        updated.selectedBookId = ''
        updated.linkUrl = ''
      }
      // 색상 변경 시에도 변경 감지
      if (name === 'titleColor' || name === 'subtitleColor') {
        // hasChanges는 useEffect에서 처리됨
      }
      return updated
    })
  }

  const checkPostingPeriod = () => {
    if (!formData.postingStart || !formData.postingEnd) {
      return false
    }
    const startDate = new Date(formData.postingStart)
    const endDate = new Date(formData.postingEnd)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return false
    }
    const now = new Date()
    return endDate >= now
  }

  const isFormValid = () => {
    if (!formData.postingStart || !formData.postingEnd) {
      return false
    }
    const startDate = new Date(formData.postingStart)
    const endDate = new Date(formData.postingEnd)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
      return false
    }

    if (formData.linkType === 'book') {
      const hasBookSelection =
        (formData.selectedBookId && formData.selectedBookId.trim() !== '') ||
        (formData.linkUrl.trim().startsWith('/book/'))

      return (
        formData.title.trim() !== '' &&
        formData.subtitle.trim() !== '' &&
        formData.imageUrl.trim() !== '' &&
        hasBookSelection
      )
    }
    return (
      formData.title.trim() !== '' &&
      formData.subtitle.trim() !== '' &&
      formData.imageUrl.trim() !== '' &&
      formData.linkUrl.trim() !== ''
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isFormValid()) {
      alert('필수 필드를 모두 입력하고 포스팅 기간을 올바르게 설정해주세요.')
      return
    }

    const postingStartDate = formData.postingStart ? new Date(formData.postingStart) : null
    const postingEndDate = formData.postingEnd ? new Date(formData.postingEnd) : null

    if (postingStartDate && postingEndDate && postingStartDate > postingEndDate) {
      alert('포스팅 시작일이 종료일보다 늦을 수 없습니다.')
      return
    }

    const startTimestamp = postingStartDate ? Timestamp.fromDate(postingStartDate) : null
    const endTimestamp = postingEndDate ? Timestamp.fromDate(postingEndDate) : null

    console.log('포스팅 기간 변환:', {
      postingStartDate,
      postingEndDate,
      startTimestamp,
      endTimestamp
    })

    const shouldBeActive = checkPostingPeriod()
    
    // 포스팅 기간이 지나갔는데 활성화하려는 경우 경고
    const now = new Date()
    if (endTimestamp && endTimestamp.toDate() < now && shouldBeActive) {
      alert('포스팅 기간이 지나갔습니다. 기간을 수정하여 활성화하세요.')
      setLoading(false)
      return
    }

    setLoading(true)
    
    try {
      const baseSlideData = {
        slideType: formData.slideType,
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        imageUrl: formData.imageUrl,
        linkUrl: formData.linkUrl.trim(),
        linkType: formData.linkType,
        titleColor: formData.titleColor,
        subtitleColor: formData.subtitleColor,
        bookCategory: formData.linkType === 'book' ? (formData.bookCategory || null) : null,
        selectedBookId: formData.linkType === 'book' ? (formData.selectedBookId || null) : null,
        postingStart: startTimestamp,
        postingEnd: endTimestamp,
        isActive: shouldBeActive,
        updatedAt: Timestamp.now()
      }

      console.log('저장할 데이터:', baseSlideData)
      console.log('포스팅 기간 포함 여부:', {
        postingStart: baseSlideData.postingStart,
        postingEnd: baseSlideData.postingEnd
      })

      if (isEditMode && editSlide?.id) {
        const slideRef = doc(db, 'slides', editSlide.id)
        await updateDoc(slideRef, baseSlideData)
        
        // 업데이트 후 확인
        const updatedDoc = await getDoc(slideRef)
        const updatedData = updatedDoc.data()
        console.log('업데이트 후 DB 데이터:', updatedData)
        console.log('업데이트 후 포스팅 기간:', {
          postingStart: updatedData?.postingStart,
          postingEnd: updatedData?.postingEnd
        })
        
        alert('슬라이드가 성공적으로 수정되었습니다!')
      } else {
        const slidesSnapshot = await getDocs(collection(db, 'slides'))
        const maxOrder = Math.max(...slidesSnapshot.docs.map(doc => doc.data().order || 0), 0)
        const slideData = {
          ...baseSlideData,
          order: maxOrder + 1,
          createdAt: Timestamp.now()
        }
        await addDoc(collection(db, 'slides'), slideData)
        alert('슬라이드가 성공적으로 추가되었습니다!')
        resetForm()
      }
      
      onClose()
      if (onSuccess) {
        onSuccess()
      }
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        }
      }, 500)
      
    } catch (error: any) {
      console.error('슬라이드 저장 오류:', error)
      alert('슬라이드 저장 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    const defaultData: SlideFormData = {
      slideType: 'main',
      title: '',
      subtitle: '',
      imageUrl: '',
      linkUrl: '',
      linkType: 'book', // 기본값을 'book'으로 변경
      bookCategory: '',
      selectedBookId: '',
      titleColor: '#FFFFFF',
      subtitleColor: '#FFFFFF',
      postingStart: '',
      postingEnd: ''
    }
    setFormData(defaultData)
    setImagePreview(null)
    console.log('폼 초기화 - linkType:', defaultData.linkType) // 디버깅
  }

  const handleClose = () => {
    if (!isEditMode) {
      resetForm()
    }
    onClose()
  }
  
  const handleCancel = () => {
    if (isEditMode && initialData) {
      // 깊은 복사로 formData 복원 (객체 참조 문제 방지)
      setFormData(JSON.parse(JSON.stringify(initialData)))
      setImagePreview(initialData.imageUrl || null)
      setHasChanges(false)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="slide-modal-overlay" onClick={handleClose}>
      <div className="slide-modal-layout" onClick={(e) => e.stopPropagation()}>
        <div className="slide-modal-header">
          <h2>{isEditMode ? '슬라이드 수정' : '새 슬라이드 추가'}</h2>
          <button type="button" className="slide-modal-close" onClick={handleClose}>
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="slide-modal-form">
          {/* 1. 슬라이드 구분 */}
          <div className="slide-form-row-inline-label">
            <label htmlFor="slideType">슬라이드 구분</label>
            <select
              id="slideType"
              name="slideType"
              value={formData.slideType}
              onChange={handleInputChange}
              required
            >
              <option value="main">메인슬라이드</option>
              <option value="ad">광고 슬라이드</option>
            </select>
          </div>

          {/* 2. 제목 */}
          <div className="slide-form-row-inline-label">
            <label htmlFor="title">제목</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="슬라이드 제목을 입력하세요"
              required
            />
          </div>

          {/* 3. 부제목 */}
          <div className="slide-form-row-inline-label">
            <label htmlFor="subtitle">부제목</label>
            <input
              type="text"
              id="subtitle"
              name="subtitle"
              value={formData.subtitle}
              onChange={handleInputChange}
              placeholder="슬라이드 부제목을 입력하세요"
              required
            />
          </div>

          {/* 4. 링크 타입 */}
          <div className="slide-form-row-inline-label">
            <label htmlFor="linkType">링크 타입</label>
            <select
              id="linkType"
              name="linkType"
              value={formData.linkType || 'book'}
              onChange={handleInputChange}
              required
            >
              <option value="book">도서 페이지</option>
              <option value="custom">커스텀링크</option>
            </select>
          </div>

          {/* 5. 도서 구분과 도서 선택 (링크 타입이 'book'일 때만 표시, 한 줄로) */}
          {formData.linkType === 'book' && (
            <div className="slide-form-row-inline-label">
              <label htmlFor="bookCategory">도서 구분</label>
              <select
                id="bookCategory"
                name="bookCategory"
                value={formData.bookCategory}
                onChange={handleInputChange}
                required
                style={{ flex: '0 0 150px' }}
              >
                <option value="">도서 구분을 선택하세요</option>
                <option value="서평">서평</option>
                <option value="출간">출간</option>
                <option value="추천">추천</option>
              </select>
              <label htmlFor="selectedBookId" style={{ minWidth: '80px', marginLeft: '12px' }}>도서 선택</label>
              <select
                id="selectedBookId"
                name="selectedBookId"
                value={formData.selectedBookId}
                onChange={handleInputChange}
                required
                disabled={!formData.bookCategory || filteredBooks.length === 0}
                style={{ flex: 1 }}
              >
                <option value="">
                  {!formData.bookCategory 
                    ? '도서 구분을 먼저 선택하세요' 
                    : filteredBooks.length === 0 
                      ? '해당 구분의 도서가 없습니다'
                      : '도서를 선택하세요'}
                </option>
                {filteredBooks.map(book => (
                  <option key={book.id} value={book.id}>
                    {book.title} - {book.author}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 6. 포스팅 기간 */}
          <div className="slide-form-row-inline-label posting-period-row">
            <label htmlFor="postingStart">포스팅 기간</label>
            <div className="posting-period-inputs">
              <div className="date-input-wrapper">
                <input
                  type="date"
                  id="postingStart"
                  name="postingStart"
                  value={formData.postingStart}
                  onChange={handleInputChange}
                  required
                  className="posting-date-input"
                  onFocus={(e) => {
                    const input = e.target as HTMLInputElement
                    // showPicker는 사용자 제스처가 필요하므로 onFocus에서는 호출하지 않음
                  }}
                />
                <img 
                  src={calendarIcon} 
                  alt="캘린더" 
                  className="calendar-icon"
                  onClick={() => {
                    const input = document.getElementById('postingStart') as HTMLInputElement
                    input?.showPicker?.() || input?.click()
                  }}
                />
              </div>
              <span className="posting-period-separator">~</span>
              <div className="date-input-wrapper">
                <input
                  type="date"
                  id="postingEnd"
                  name="postingEnd"
                  value={formData.postingEnd}
                  onChange={handleInputChange}
                  required
                  className="posting-date-input"
                  onFocus={(e) => {
                    const input = e.target as HTMLInputElement
                    // showPicker는 사용자 제스처가 필요하므로 onFocus에서는 호출하지 않음
                  }}
                />
                <img 
                  src={calendarIcon} 
                  alt="캘린더" 
                  className="calendar-icon"
                  onClick={() => {
                    const input = document.getElementById('postingEnd') as HTMLInputElement
                    input?.showPicker?.() || input?.click()
                  }}
                />
              </div>
            </div>
          </div>

          {/* 7. 링크 URL (링크 타입이 'custom'일 때만 표시) */}
          {formData.linkType === 'custom' && (
            <div className="slide-form-row-inline-label">
              <label htmlFor="linkUrl">링크 URL</label>
              <input
                type="url"
                id="linkUrl"
                name="linkUrl"
                value={formData.linkUrl}
                onChange={handleInputChange}
                placeholder="클릭 시 이동할 URL을 입력하세요"
                required
              />
            </div>
          )}

          {/* 8. 제목 색상과 부제목 색상 (한 줄로 배치) */}
          <div className="slide-form-row-inline-label">
            <label htmlFor="titleColor">제목 색상</label>
            <div className="color-picker-wrapper" style={{ flex: '0 0 auto' }}>
              <ColorPaletteMenu
                currentColor={formData.titleColor}
                onColorChange={(color) => {
                  setFormData(prev => ({
                    ...prev,
                    titleColor: color.toUpperCase()
                  }))
                }}
              />
            </div>
            <label htmlFor="subtitleColor" style={{ minWidth: '70px', marginLeft: '12px' }}>부제목 색상</label>
            <div className="color-picker-wrapper" style={{ flex: '0 0 auto' }}>
              <ColorPaletteMenu
                currentColor={formData.subtitleColor}
                onColorChange={(color) => {
                  setFormData(prev => ({
                    ...prev,
                    subtitleColor: color.toUpperCase()
                  }))
                }}
              />
            </div>
          </div>

          <div className="slide-image-section">
            <label>슬라이드 이미지 (16:9 비율 권장)</label>
            <div className="slide-image-upload-area">
              {!imagePreview ? (
                <button 
                  type="button"
                  className="slide-upload-btn"
                  onClick={openUploadWidget}
                  disabled={loading}
                >
                  +
                </button>
              ) : (
                <>
                  <div className="slide-preview-container">
                    <img src={imagePreview} alt="슬라이드 이미지" className="slide-preview-image" />
                    {(formData.title || formData.subtitle) && (
                      <div className="slide-preview-overlay">
                        {formData.title && (
                          <h4 
                            className="slide-preview-title"
                            style={{ color: formData.titleColor }}
                          >
                            {formData.title}
                          </h4>
                        )}
                        {formData.subtitle && (
                          <p 
                            className="slide-preview-subtitle"
                            style={{ color: formData.subtitleColor }}
                          >
                            {formData.subtitle}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="slide-image-controls">
                    <button 
                      type="button"
                      className="slide-change-btn"
                      onClick={openUploadWidget}
                      title="이미지 변경"
                    >
                      <img src={changeImageIcon} alt="이미지 변경" style={{ width: '40px', height: '40px' }} />
                    </button>
                    <button 
                      type="button"
                      className="slide-delete-img-btn"
                      onClick={removeImage}
                      title="이미지 삭제"
                    >
                      <img src={trashIcon64} alt="이미지 삭제" style={{ width: '40px', height: '40px' }} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="slide-form-submit">
            {isEditMode ? (
              <>
                <button 
                  type="button"
                  className="slide-cancel-btn"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  취소
                </button>
                <button 
                  type="submit" 
                  className="slide-submit-btn"
                  disabled={loading || !isFormValid() || !hasChanges}
                >
                  {loading ? '수정 중...' : '수정완료'}
                </button>
              </>
            ) : (
              <button 
                type="submit" 
                className="slide-submit-btn"
                disabled={loading || !isFormValid()}
              >
                {loading ? '등록 중...' : '등록'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default SlideAddModal

