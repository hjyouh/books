import React, { useState, useEffect } from 'react'
import { collection, addDoc, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import CloudinaryUploadWidget from './CloudinaryUploadWidget'
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
    coverImageUrl: ''
  })
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false) // 필드 변경 감지
  const [initialData, setInitialData] = useState<BookFormData | null>(null) // 초기 데이터 저장
  const widgetRef = React.useRef<any>(null)
  
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
        coverImageUrl: editBook.imageUrl || ''
      }
      setFormData(initialFormData)
      setInitialData(initialFormData)
      setImagePreview(editBook.imageUrl || null)
      setHasChanges(false)
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  React.useEffect(() => {
    // Cloudinary 스크립트 로드 확인 및 위젯 초기화
    const initWidget = () => {
      if (window.cloudinary) {
        widgetRef.current = window.cloudinary.createUploadWidget(
        {
          cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
          uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
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
      }
    }

    if (window.cloudinary) {
      initWidget()
    } else {
      // Cloudinary 스크립트가 아직 로드되지 않은 경우 대기
      const checkCloudinary = setInterval(() => {
        if (window.cloudinary) {
          initWidget()
          clearInterval(checkCloudinary)
        }
      }, 100)

      // 5초 후 타임아웃
      setTimeout(() => clearInterval(checkCloudinary), 5000)
    }
  }, [])

  const openUploadWidget = () => {
    console.log('+ 버튼 클릭됨')
    console.log('widgetRef.current:', widgetRef.current)
    console.log('window.cloudinary:', window.cloudinary)
    
    if (widgetRef.current) {
      console.log('위젯 열기 시도 (기존 위젯 사용)')
      try {
        widgetRef.current.open()
      } catch (error) {
        console.error('위젯 열기 오류:', error)
        // 위젯 재생성 시도
        initNewWidget()
      }
    } else if (window.cloudinary) {
      console.log('새 위젯 생성 및 열기')
      initNewWidget()
    } else {
      console.error('Cloudinary가 로드되지 않았습니다.')
      alert('이미지 업로드 서비스를 불러올 수 없습니다. 페이지를 새로고침해주세요.')
      
      // Cloudinary 스크립트 동적 로드 시도
      if (!document.querySelector('script[src*="cloudinary"]')) {
        const script = document.createElement('script')
        script.src = 'https://upload-widget.cloudinary.com/global/all.js'
        script.async = true
        script.onload = () => {
          console.log('Cloudinary 스크립트 로드 완료')
          setTimeout(() => {
            initNewWidget()
          }, 500)
        }
        document.head.appendChild(script)
      }
    }
  }
  
  const initNewWidget = () => {
    if (!window.cloudinary) {
      console.error('Cloudinary가 아직 로드되지 않았습니다.')
      return
    }
    
    try {
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
          uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
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
      coverImageUrl: url
    }))
    setImagePreview(url)
  }

  const handleCloudinaryError = (error: string) => {
    console.error('Cloudinary 업로드 오류:', error)
    alert(error)
  }

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      coverImageUrl: ''
    }))
    setImagePreview(null)
  }

  // 필수 필드 검증 함수
  const isFormValid = () => {
    return (
      formData.category.trim() !== '' &&
      formData.title.trim() !== '' &&
      formData.author.trim() !== '' &&
      formData.genre.trim() !== '' &&
      formData.publisher.trim() !== '' &&
      formData.publishedDate.trim() !== ''
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
          description: formData.description.trim(),
          imageUrl: formData.coverImageUrl,
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
          description: formData.description.trim(),
          imageUrl: formData.coverImageUrl, // Cloudinary URL 사용
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
      coverImageUrl: ''
    })
    setImagePreview(null)
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
            <div className="cover-controls">
              {!imagePreview ? (
                <button 
                  type="button"
                  className="cover-add-btn"
                  onClick={openUploadWidget}
                  disabled={loading}
                  title="이미지 추가"
                >
                  +
                </button>
              ) : (
                <>
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
                </>
              )}
            </div>
            <div className="cover-preview-area">
              {imagePreview ? (
                <img src={imagePreview} alt="책 표지" className="cover-preview-image" />
              ) : (
                <div className="cover-placeholder">
                  책표지
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
                  className="form-input-inline"
                />
              </div>

              <div className="form-row description-row">
                <label htmlFor="description">도서 설명</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="도서에 대한 간단한 설명을 입력하세요"
                  className="form-textarea-inline"
                />
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
