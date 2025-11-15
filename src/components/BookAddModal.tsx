import React, { useState, useEffect } from 'react'
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import './BookAddModal.css'

interface BookData {
  id?: string
  category?: string
  title?: string
  author?: string
  genre?: string
  publisher?: string
  publishedDate?: string
  description?: string
  imageUrl?: string
  postingStart?: string
  postingEnd?: string
  purchaseUrl?: string
}

interface BookAddModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  editBook?: BookData | null // 수정 모드용 기존 도서 데이터
}

interface BookFormData {
  category: string
  title: string
  author: string
  genre: string
  publisher: string
  publishedDate: string
  description: string
  coverImageUrl: string
  postingStart: string
  postingEnd: string
  purchaseUrl: string
}

const BookAddModal: React.FC<BookAddModalProps> = ({ isOpen, onClose, onSuccess, editBook }) => {
  const [formData, setFormData] = useState<BookFormData>({
    category: '서평도서',
    title: '',
    author: '',
    genre: '',
    publisher: '',
    publishedDate: '',
    description: '',
    coverImageUrl: '',
    postingStart: '',
    postingEnd: '',
    purchaseUrl: ''
  })
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false) // 필드 변경 감지
  const [initialData, setInitialData] = useState<BookFormData | null>(null) // 초기 데이터 저장
  const widgetRef = React.useRef<any>(null)
  const editorRef = React.useRef<HTMLDivElement | null>(null)
  const [isEditorFullscreen, setIsEditorFullscreen] = useState<boolean>(false)
  const [dateError, setDateError] = useState<string>('')
  const fontFamilies = ['SUIT', 'Segoe UI', 'Pretendard', 'Noto Sans KR', 'Nanum Gothic', 'Arial', 'Georgia']
  const fontSizes = [
    { label: '10pt', cmd: '2' },
    { label: '12pt', cmd: '3' },
    { label: '14pt', cmd: '4' },
    { label: '18pt', cmd: '5' },
    { label: '24pt', cmd: '6' }
  ]
  const [selectedFont, setSelectedFont] = useState<string>(fontFamilies[0])
  const [selectedFontSize, setSelectedFontSize] = useState<string>(fontSizes[2].cmd)
  
  const isEditMode = !!editBook

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (isEditMode && editBook && isOpen) {
      const initialFormData: BookFormData = {
        category: editBook.category || '서평도서',
        title: editBook.title || '',
        author: editBook.author || '',
        genre: editBook.genre || '',
        publisher: editBook.publisher || '',
        publishedDate: editBook.publishedDate || '',
        description: editBook.description || '',
        coverImageUrl: editBook.imageUrl || '',
        postingStart: editBook.postingStart || '',
        postingEnd: editBook.postingEnd || '',
        purchaseUrl: editBook.purchaseUrl || ''
      }
      setFormData(initialFormData)
      setInitialData(initialFormData)
      setImagePreview(editBook.imageUrl || null)
      setHasChanges(false)
      // 에디터 내용은 모달이 열린 후 설정되도록 useEffect에서 처리됨
    } else if (!isEditMode && isOpen) {
      // 추가 모드일 때 폼 초기화
      resetForm()
    }
  }, [editBook, isOpen, isEditMode])

  // 필드 변경 감지
  useEffect(() => {
    if (isEditMode && initialData) {
      const changed = JSON.stringify(formData) !== JSON.stringify(initialData)
      setHasChanges(changed)
    }
  }, [formData, initialData, isEditMode])

  useEffect(() => {
    if (isOpen && editorRef.current) {
      // 모달이 열릴 때 에디터 내용 설정
      const description = isEditMode && editBook ? (editBook.description || '') : (formData.description || '')
      editorRef.current.innerHTML = description
    }
  }, [isOpen, editBook, isEditMode, formData.description])

  useEffect(() => {
    if (formData.postingStart && formData.postingEnd) {
      if (formData.postingStart > formData.postingEnd) {
        setDateError('포스팅 종료일은 시작일보다 빠를 수 없습니다.')
      } else {
        setDateError('')
      }
    } else {
      setDateError('')
    }
  }, [formData.postingStart, formData.postingEnd])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Cloudinary 위젯 초기화는 필요할 때만 수행 (지연 초기화)
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const initTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Cloudinary 콜백 함수들 (먼저 선언)
  const handleCloudinaryUpload = React.useCallback((url: string) => {
    setFormData(prev => ({
      ...prev,
      coverImageUrl: url
    }))
    setImagePreview(url)
  }, [])

  const handleCloudinaryError = React.useCallback((error: string) => {
    console.error('Cloudinary 업로드 오류:', error)
    alert(error)
  }, [])

  // 모달이 닫힐 때 위젯 정리
  React.useEffect(() => {
    if (!isOpen) {
      // 모달이 닫힐 때 위젯 정리
      if (widgetRef.current && typeof widgetRef.current.destroy === 'function') {
        try {
          widgetRef.current.destroy()
        } catch (error) {
          // 무시 (이미 정리되었을 수 있음)
        }
        widgetRef.current = null
      }
      // 타이머 정리
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current)
        initTimeoutRef.current = null
      }
    }
  }, [isOpen])

  // 위젯 초기화 함수 (필요할 때만 호출)
  const initWidget = React.useCallback(() => {
    // 모달이 닫혔으면 중단
    if (!isOpen) {
      return
    }

    // 이미 위젯이 있으면 재생성하지 않음
    if (widgetRef.current) {
      return
    }

    const cloudinary = (window as any).cloudinary
    if (!cloudinary || typeof cloudinary.createUploadWidget !== 'function') {
      return
    }

    // 환경 변수 확인
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
    
    if (!cloudName || !uploadPreset) {
      console.warn('Cloudinary 환경 변수가 설정되지 않았습니다.')
      return
    }

    try {
      const widget = cloudinary.createUploadWidget(
        {
          cloudName: cloudName,
          uploadPreset: uploadPreset,
          cropping: true,
          croppingAspectRatio: 0.75, // 3:4 비율 (3/4 = 0.75)
          maxFiles: 1, // 1장만 업로드 가능
          multiple: false, // 다중 업로드 비활성화
          maxFileSize: 10000000, // 10MB 제한
        },
        (error: any, result: any) => {
          if (!error && result && result.event === 'success') {
            handleCloudinaryUpload(result.info.secure_url)
          } else if (error) {
            handleCloudinaryError(error.message || '이미지 업로드 중 오류가 발생했습니다.')
          }
        }
      )
      
      // 위젯이 제대로 생성되었는지 확인
      if (widget && typeof widget === 'object' && widget !== null) {
        widgetRef.current = widget
      } else {
        console.warn('Cloudinary 위젯 생성 실패: 유효하지 않은 위젯 객체')
        widgetRef.current = null
      }
    } catch (error) {
      console.error('Cloudinary 위젯 생성 오류:', error)
      widgetRef.current = null
    }
  }, [isOpen, handleCloudinaryUpload, handleCloudinaryError])

  const openUploadWidget = () => {
    // 위젯이 있고 open 메서드가 있으면 열기
    if (widgetRef.current && typeof widgetRef.current.open === 'function') {
      try {
        widgetRef.current.open()
        return
      } catch (error) {
        console.error('위젯 열기 오류:', error)
        // 위젯이 손상되었을 수 있으므로 재생성
        widgetRef.current = null
      }
    }
    
    // 위젯이 없으면 초기화 시도
    const cloudinary = (window as any).cloudinary
    
    if (cloudinary && typeof cloudinary.createUploadWidget === 'function') {
      // 위젯 초기화
      initWidget()
      // 초기화 후 약간의 지연을 두고 열기 시도
      setTimeout(() => {
        if (widgetRef.current && typeof widgetRef.current.open === 'function') {
          try {
            widgetRef.current.open()
          } catch (error) {
            console.error('위젯 열기 오류:', error)
          }
        }
      }, 200)
      return
    }
    
    // Cloudinary가 로드되지 않았으면 스크립트 로드 시도
    console.log('Cloudinary 스크립트 로드 중...')
    
    // 이미 스크립트가 로드 중이거나 로드되어 있는지 확인
    const existingScript = document.querySelector('script[src*="cloudinary"]')
    if (existingScript) {
      // 스크립트가 있으면 로드를 기다림
      const checkCloudinary = setInterval(() => {
        const cloudinary = (window as any).cloudinary
        if (cloudinary && typeof cloudinary.createUploadWidget === 'function') {
          clearInterval(checkCloudinary)
          initWidget()
          setTimeout(() => {
            if (widgetRef.current && typeof widgetRef.current.open === 'function') {
              try {
                widgetRef.current.open()
              } catch (error) {
                console.error('위젯 열기 오류:', error)
              }
            }
          }, 200)
        }
      }, 100)
      
      setTimeout(() => {
        clearInterval(checkCloudinary)
      }, 5000)
    } else {
      // 스크립트가 없으면 새로 로드
      const script = document.createElement('script')
      script.src = 'https://upload-widget.cloudinary.com/global/all.js'
      script.async = true
      script.onload = () => {
        console.log('Cloudinary 스크립트 로드 완료')
        setTimeout(() => {
          const cloudinary = (window as any).cloudinary
          if (cloudinary && typeof cloudinary.createUploadWidget === 'function') {
            initWidget()
            setTimeout(() => {
              if (widgetRef.current && typeof widgetRef.current.open === 'function') {
                try {
                  widgetRef.current.open()
                } catch (error) {
                  console.error('위젯 열기 오류:', error)
                }
              }
            }, 200)
          }
        }, 500)
      }
      script.onerror = () => {
        console.error('Cloudinary 스크립트 로드 실패')
        alert('이미지 업로드 서비스를 불러올 수 없습니다. 페이지를 새로고침해주세요.')
      }
      document.head.appendChild(script)
    }
  }

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      coverImageUrl: ''
    }))
    setImagePreview(null)
  }

  const handleEditorInput = () => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    setFormData(prev => {
      if (prev.description === html) return prev
      return {
        ...prev,
        description: html
      }
    })
  }

  const execEditorCommand = (command: string, value?: string) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    handleEditorInput()
  }

  const handleFontChange = (family: string) => {
    setSelectedFont(family)
    execEditorCommand('fontName', family)
  }

  const handleFontSizeChange = (sizeCmd: string) => {
    setSelectedFontSize(sizeCmd)
    execEditorCommand('fontSize', sizeCmd)
  }

  const handleHighlight = (color: string) => {
    execEditorCommand('hiliteColor', color)
  }

  const handleInsertLink = () => {
    const url = prompt('링크 URL을 입력하세요')
    if (url) {
      execEditorCommand('createLink', url)
    }
  }

  const handleInsertImage = () => {
    const url = prompt('이미지 URL을 입력하세요')
    if (url) {
      execEditorCommand('insertImage', url)
    }
  }

  const toggleEditorFullscreen = () => {
    setIsEditorFullscreen(prev => !prev)
    requestAnimationFrame(() => {
      editorRef.current?.focus()
    })
  }

  // 필수 필드 검증 함수
  const isFormValid = () => {
    return (
      formData.category.trim() !== '' &&
      formData.title.trim() !== '' &&
      formData.author.trim() !== '' &&
      formData.genre.trim() !== '' &&
      formData.publisher.trim() !== '' &&
      formData.publishedDate.trim() !== '' &&
      (!formData.postingStart || !formData.postingEnd || formData.postingStart <= formData.postingEnd)
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isFormValid()) {
      alert('필수 필드를 모두 입력해주세요.')
      return
    }

    setLoading(true)
    
    try {
      if (isEditMode && editBook?.id) {
        // 수정 모드
        const bookRef = doc(db, 'books', editBook.id)
        await updateDoc(bookRef, {
          category: formData.category,
          title: formData.title.trim(),
          author: formData.author.trim(),
          genre: formData.genre.trim(),
          publisher: formData.publisher.trim(),
          publishedDate: formData.publishedDate.trim(),
          description: formData.description,
          imageUrl: formData.coverImageUrl,
          postingStart: formData.postingStart,
          postingEnd: formData.postingEnd,
          purchaseUrl: formData.purchaseUrl.trim(),
          updatedAt: Timestamp.now()
        })
        console.log('도서가 성공적으로 수정되었습니다. ID:', editBook.id)
        alert('도서가 성공적으로 수정되었습니다!')
      } else {
        // 추가 모드
        const bookData = {
          category: formData.category,
          title: formData.title.trim(),
          author: formData.author.trim(),
          genre: formData.genre.trim(),
          publisher: formData.publisher.trim(),
          publishedDate: formData.publishedDate.trim(),
          description: formData.description,
          imageUrl: formData.coverImageUrl, // Cloudinary URL 사용
          postingStart: formData.postingStart || null,
          postingEnd: formData.postingEnd || null,
          purchaseUrl: formData.purchaseUrl.trim() || null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          status: 'active', // 활성 상태
          rating: 0, // 초기 평점
          reviewCount: 0 // 초기 리뷰 수
        }
        const docRef = await addDoc(collection(db, 'books'), bookData)
        console.log('도서가 성공적으로 추가되었습니다. ID:', docRef.id)
        alert('도서가 성공적으로 추가되었습니다!')
        resetForm()
      }
      
      // 모달 닫기
      onClose()
      
      // 콜백 호출로 목록 새로고침 보장
      if (onSuccess) {
        onSuccess()
      }
      
      // 추가로 약간의 지연 후 새로고침 (확실하게)
      setTimeout(() => {
        if (onSuccess) {
          onSuccess()
        }
      }, 500)
      
    } catch (error: any) {
      console.error('도서 추가 오류:', error)
      
      // 구체적인 에러 메시지 제공
      let errorMessage = '도서 추가 중 오류가 발생했습니다.'
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Firestore 쓰기 권한이 없습니다. Firebase 설정을 확인해주세요.'
      } else if (error.code === 'unavailable') {
        errorMessage = '네트워크 연결을 확인해주세요.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      category: '서평도서',
      title: '',
      author: '',
      genre: '',
      publisher: '',
      publishedDate: '',
      description: '',
      coverImageUrl: '',
      postingStart: '',
      postingEnd: '',
      purchaseUrl: ''
    })
    setImagePreview(null)
    // 에디터 초기화는 모달이 열려있을 때만 수행
    if (isOpen && editorRef.current) {
      editorRef.current.innerHTML = ''
    }
  }

  const handleClose = () => {
    if (!isEditMode) {
      resetForm()
    }
    onClose()
  }
  
  const handleCancel = () => {
    // 취소 시 초기 데이터로 복원
    if (isEditMode && initialData) {
      setFormData(initialData)
      setImagePreview(initialData.coverImageUrl || null)
      setHasChanges(false)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="book-modal-overlay" onClick={handleClose}>
      <div className="book-modal-new-layout" onClick={(e) => e.stopPropagation()}>
        <div className="book-modal-header">
          <h2>{isEditMode ? '도서 관리' : '새 도서 추가'}</h2>
          <button className="book-modal-close" onClick={handleClose}>
            ×
          </button>
        </div>
        
        <div className="book-modal-content">
          {/* 좌측: 책 표지 영역 */}
          <div className="book-cover-section">
            <div className="cover-preview-area">
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="책 표지" className="cover-preview-image" />
                  <div className="cover-action-overlay">
                    <button 
                      type="button"
                      className="cover-change-btn"
                      onClick={openUploadWidget}
                      title="이미지 변경"
                    >
                      +
                    </button>
                    <button 
                      type="button"
                      className="cover-delete-btn"
                      onClick={removeImage}
                      title="이미지 삭제"
                    >
                      🗑️
                    </button>
                  </div>
                </>
              ) : (
                <div className="cover-placeholder">
                  <div className="cover-placeholder-text">
                    <span>책표지</span>
                    <small>(3:4 사이즈로)</small>
                  </div>
                  <button 
                    type="button"
                    className="cover-add-btn"
                    onClick={openUploadWidget}
                    disabled={loading}
                    title="이미지 추가"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 우측: 폼 영역 */}
          <div className="book-form-section">
            <form onSubmit={handleSubmit} className="book-modal-form-new">
              <div className="form-row">
                <label htmlFor="category">카테고리</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="form-select-inline"
                >
                  <option value="서평도서">서평도서</option>
                  <option value="추천도서">추천도서</option>
                  <option value="출간도서">출간도서</option>
                </select>
              </div>

              <div className="form-row">
                <label htmlFor="title">책 제목</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="책 제목을 입력하세요"
                  className="form-input-inline"
                  required
                />
              </div>

              <div className="form-row">
                <label htmlFor="author">저자명</label>
                <input
                  type="text"
                  id="author"
                  name="author"
                  value={formData.author}
                  onChange={handleInputChange}
                  placeholder="저자명을 입력하세요"
                  className="form-input-inline"
                  required
                />
              </div>

              <div className="form-row">
                <label htmlFor="genre">장르</label>
                <select
                  id="genre"
                  name="genre"
                  value={formData.genre}
                  onChange={handleInputChange}
                  className="form-select-inline"
                  required
                >
                  <option value="">장르를 선택하세요</option>
                  <option value="소설">소설</option>
                  <option value="에세이">에세이</option>
                  <option value="자기계발">자기계발</option>
                  <option value="경영/경제">경영/경제</option>
                  <option value="인문학">인문학</option>
                  <option value="과학">과학</option>
                  <option value="역사">역사</option>
                  <option value="예술">예술</option>
                  <option value="여행">여행</option>
                  <option value="건강">건강</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              <div className="form-row">
                <label htmlFor="publisher">출판사</label>
                <input
                  type="text"
                  id="publisher"
                  name="publisher"
                  value={formData.publisher}
                  onChange={handleInputChange}
                  placeholder="출판사를 입력하세요"
                  className="form-input-inline"
                  required
                />
              </div>

              <div className="form-row">
                <label htmlFor="publishedDate">출간일</label>
                <input
                  type="date"
                  id="publishedDate"
                  name="publishedDate"
                  value={formData.publishedDate}
                  onChange={handleInputChange}
                  className="form-input-inline form-date-input"
                />
              </div>

              <div className="form-row">
                <label htmlFor="purchaseUrl">구매 링크</label>
                <input
                  type="url"
                  id="purchaseUrl"
                  name="purchaseUrl"
                  value={formData.purchaseUrl}
                  onChange={handleInputChange}
                  placeholder="https://example.com"
                  className="form-input-inline"
                />
              </div>

              <div className="form-row posting-row">
                <label>포스팅 기간</label>
                <div className="posting-period-fields">
                  <input
                    type="date"
                    name="postingStart"
                    value={formData.postingStart}
                    onChange={handleInputChange}
                    className="form-input-inline form-date-input"
                    placeholder="시작일"
                  />
                  <span className="posting-separator">~</span>
                  <input
                    type="date"
                    name="postingEnd"
                    value={formData.postingEnd}
                    onChange={handleInputChange}
                    className="form-input-inline form-date-input"
                    placeholder="종료일"
                  />
                </div>
              </div>
              {dateError && <p className="posting-error">{dateError}</p>}

              <div className={`form-row description-row ${isEditorFullscreen ? 'fullscreen' : ''}`}>
                <div className="description-label-wrapper">
                  <label htmlFor="description">도서 설명</label>
                  <button
                    type="button"
                    className={`editor-expand-trigger ${isEditorFullscreen ? 'active' : ''}`}
                    onClick={toggleEditorFullscreen}
                    title={isEditorFullscreen ? '작게 보기' : '넓게 편집'}
                  >
                    ⛶
                  </button>
                </div>
                {isEditorFullscreen && <div className="editor-backdrop" onClick={toggleEditorFullscreen} />}
                <div className={`editor-container ${isEditorFullscreen ? 'fullscreen' : ''}`}>
                  {isEditorFullscreen && (
                    <button
                      type="button"
                      className="editor-close-btn"
                      onClick={toggleEditorFullscreen}
                      title="닫기"
                    >
                      ×
                    </button>
                  )}
                  <div className="editor-toolbar">
                    <button type="button" onClick={() => execEditorCommand('bold')} title="굵게(B)">
                      B
                    </button>
                    <button type="button" onClick={() => execEditorCommand('italic')} title="기울임(I)">
                      I
                    </button>
                    <button type="button" onClick={() => execEditorCommand('underline')} title="밑줄(U)">
                      U
                    </button>
                    <div className="editor-select">
                      <select value={selectedFont} onChange={(e) => handleFontChange(e.target.value)} title="글꼴">
                        {fontFamilies.map(font => (
                          <option key={font} value={font}>{font}</option>
                        ))}
                      </select>
                    </div>
                    <div className="editor-select">
                      <select value={selectedFontSize} onChange={(e) => handleFontSizeChange(e.target.value)} title="글자 크기">
                        {fontSizes.map(size => (
                          <option key={size.cmd} value={size.cmd}>{size.label}</option>
                        ))}
                      </select>
                    </div>
                    <label className="editor-color-picker" title="글자 색상">
                      <input
                        type="color"
                        onChange={(e) => execEditorCommand('foreColor', e.target.value)}
                      />
                      A
                    </label>
                    <label className="editor-color-picker" title="배경 색상">
                      <input
                        type="color"
                        onChange={(e) => handleHighlight(e.target.value)}
                      />
                      ■
                    </label>
                    <div className="editor-divider" />
                    <button type="button" onClick={() => execEditorCommand('justifyLeft')} title="왼쪽 정렬">
                      L
                    </button>
                    <button type="button" onClick={() => execEditorCommand('justifyCenter')} title="가운데 정렬">
                      C
                    </button>
                    <button type="button" onClick={() => execEditorCommand('justifyRight')} title="오른쪽 정렬">
                      R
                    </button>
                    <div className="editor-divider" />
                    <button type="button" onClick={() => execEditorCommand('insertUnorderedList')} title="불릿 목록">
                      ••
                    </button>
                    <button type="button" onClick={() => execEditorCommand('insertOrderedList')} title="번호 목록">
                      1.
                    </button>
                    <button type="button" onClick={() => execEditorCommand('outdent')} title="내어쓰기">
                      ⇤
                    </button>
                    <button type="button" onClick={() => execEditorCommand('indent')} title="들여쓰기">
                      ⇥
                    </button>
                    <div className="editor-divider" />
                    <button type="button" onClick={() => execEditorCommand('formatBlock', '<blockquote>')} title="인용">
                      ❝
                    </button>
                    <button type="button" onClick={() => execEditorCommand('formatBlock', '<h4>')} title="소제목">
                      H4
                    </button>
                    <div className="editor-divider" />
                    <button type="button" onClick={handleInsertLink} title="링크">
                      🔗
                    </button>
                    <button type="button" onClick={handleInsertImage} title="이미지">
                      🖼
                    </button>
                  </div>
                  <div
                    id="description"
                    ref={editorRef}
                    className={`form-textarea-inline editor-surface ${isEditorFullscreen ? 'fullscreen' : ''}`}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleEditorInput}
                  />
                </div>
              </div>

              <div className="form-submit-container">
                {isEditMode ? (
                  <>
                    <button 
                      type="button"
                      className="book-cancel-button"
                      onClick={handleCancel}
                      disabled={loading}
                    >
                      취소
                    </button>
                    <button 
                      type="submit" 
                      className="book-add-button"
                      disabled={loading || !isFormValid() || !hasChanges}
                    >
                      {loading ? '수정 중...' : '수정완료'}
                    </button>
                  </>
                ) : (
                  <button 
                    type="submit" 
                    className="book-add-button"
                    disabled={loading || !isFormValid()}
                  >
                    {loading ? '등록 중...' : '등록'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BookAddModal
