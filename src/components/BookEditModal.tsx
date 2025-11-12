import React, { useState, useEffect } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import CloudinaryUploadWidget from './CloudinaryUploadWidget'
import './BookEditModal.css'

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

interface BookEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: BookData | null;
  onUpdate: () => void;
}

const BookEditModal: React.FC<BookEditModalProps> = ({
  isOpen,
  onClose,
  book,
  onUpdate
}) => {
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    category: '',
    genre: '',
    description: '',
    publisher: '',
    publishedDate: '',
    status: 'active'
  })
  const [imageUrl, setImageUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 도서 데이터가 변경될 때 폼 데이터 업데이트
  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title || '',
        author: book.author || '',
        category: book.category || '',
        genre: book.genre || '',
        description: book.description || '',
        publisher: book.publisher || '',
        publishedDate: book.publishedDate || '',
        status: book.status || 'active'
      })
      setImageUrl(book.imageUrl || '')
    }
  }, [book])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCloudinaryUpload = (url: string) => {
    setImageUrl(url)
  }

  const handleCloudinaryError = (error: string) => {
    setError(`이미지 업로드 오류: ${error}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!book) return

    try {
      setLoading(true)
      setError('')

      // 필수 필드 검증
      if (!formData.title.trim()) {
        setError('도서 제목을 입력해주세요.')
        return
      }
      if (!formData.author.trim()) {
        setError('저자를 입력해주세요.')
        return
      }
      if (!formData.category.trim()) {
        setError('카테고리를 선택해주세요.')
        return
      }
      if (!formData.genre.trim()) {
        setError('장르를 선택해주세요.')
        return
      }

      // Firebase에 도서 정보 업데이트
      const bookRef = doc(db, 'books', book.id)
      await updateDoc(bookRef, {
        title: formData.title.trim(),
        author: formData.author.trim(),
        category: formData.category.trim(),
        genre: formData.genre.trim(),
        description: formData.description.trim(),
        publisher: formData.publisher.trim(),
        publishedDate: formData.publishedDate.trim(),
        status: formData.status,
        imageUrl: imageUrl,
        updatedAt: new Date()
      })

      console.log('도서 정보가 성공적으로 업데이트되었습니다.')
      onUpdate() // 부모 컴포넌트에서 목록 새로고침
      onClose() // 모달 닫기
    } catch (error) {
      console.error('도서 수정 오류:', error)
      setError('도서 정보 수정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const removeImage = () => {
    setImageUrl('')
  }

  if (!isOpen || !book) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content book-edit-modal">
        <div className="modal-header">
          <h2>📚 도서 정보 수정</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="book-edit-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="title">도서 제목 *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="도서 제목을 입력하세요"
              />
            </div>

            <div className="form-group">
              <label htmlFor="author">저자 *</label>
              <input
                type="text"
                id="author"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                required
                placeholder="저자명을 입력하세요"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="category">카테고리 *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
              >
                <option value="">카테고리를 선택하세요</option>
                <option value="서평도서">서평도서</option>
                <option value="추천도서">추천도서</option>
                <option value="출간도서">출간도서</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="genre">장르 *</label>
              <select
                id="genre"
                name="genre"
                value={formData.genre}
                onChange={handleInputChange}
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
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="publisher">출판사</label>
              <input
                type="text"
                id="publisher"
                name="publisher"
                value={formData.publisher}
                onChange={handleInputChange}
                placeholder="출판사명"
              />
            </div>

            <div className="form-group">
              <label htmlFor="status">상태</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
              >
                <option value="active">판매중</option>
                <option value="inactive">판매중단</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="publishedDate">출간일</label>
            <input
              type="date"
              id="publishedDate"
              name="publishedDate"
              value={formData.publishedDate}
              onChange={handleInputChange}
            />
          </div>

          <div className="form-group">
            <label>도서 설명</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              placeholder="도서에 대한 간단한 설명을 입력하세요"
            />
          </div>

          <div className="form-group">
            <label>도서 표지 이미지 (선택사항)</label>
            <CloudinaryUploadWidget
              onUpload={handleCloudinaryUpload}
              onError={handleCloudinaryError}
              disabled={loading}
            />
            {imageUrl && (
              <div className="image-preview-container">
                <img src={imageUrl} alt="도서 표지 미리보기" className="image-preview" />
                <button type="button" onClick={removeImage} className="remove-image-button">
                  ×
                </button>
              </div>
            )}
            <p className="image-upload-hint">Cloudinary를 통해 이미지를 업로드합니다</p>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              취소
            </button>
            <button type="submit" disabled={loading} className="submit-button">
              {loading ? '수정 중...' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BookEditModal
