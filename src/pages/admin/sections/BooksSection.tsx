import React, { useState, useEffect } from 'react'
import { BookData } from '../types'
import { truncateText, truncateDescriptionToLines } from '../utils'
import { categoryColors, statCardColors } from '../../../utils/pastelColors'
import { runBooksUpdate } from '../../../utils/updateBooksDatabase'
import { doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../../firebase'
import dbUpdateIcon from '../../../assets/icons/Cloud-check.png'
import '../../AdminPage.css'

interface BooksSectionProps {
  books: BookData[]
  loading: boolean
  onBookAdd: () => void
  onBookEdit: (book: BookData) => void
  onRefresh: () => void
}

const BooksSection: React.FC<BooksSectionProps> = ({
  books,
  loading,
  onBookAdd,
  onBookEdit,
  onRefresh
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('전체')
  const [openCategoryDropdown, setOpenCategoryDropdown] = useState<string | null>(null)

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

  // 도서 통계 계산
  const getBookStats = () => {
    const totalBooks = books.length
    const reviewBooks = books.filter(book => book.category === '서평도서').length
    const publishedBooks = books.filter(book => book.category === '출간도서').length
    const recommendedBooks = books.filter(book => book.category === '추천도서').length
    return { totalBooks, reviewBooks, publishedBooks, recommendedBooks }
  }

  // 도서 위로 이동
  const moveBookUp = async (bookId: string) => {
    const filteredBooks = getFilteredBooks()
    const currentIndex = filteredBooks.findIndex(book => book.id === bookId)
    
    if (currentIndex > 0) {
      const book = filteredBooks[currentIndex]
      const prevBook = filteredBooks[currentIndex - 1]
      
      try {
        const bookRef = doc(db, 'books', book.id)
        const prevBookRef = doc(db, 'books', prevBook.id)
        
        const tempCreatedAt = book.createdAt
        await updateDoc(bookRef, {
          createdAt: prevBook.createdAt
        })
        await updateDoc(prevBookRef, {
          createdAt: tempCreatedAt
        })
        
        onRefresh()
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
        
        const tempCreatedAt = book.createdAt
        await updateDoc(bookRef, {
          createdAt: nextBook.createdAt
        })
        await updateDoc(nextBookRef, {
          createdAt: tempCreatedAt
        })
        
        onRefresh()
      } catch (error) {
        console.error('도서 이동 오류:', error)
        alert('도서 이동 중 오류가 발생했습니다.')
      }
    }
  }

  // 도서 삭제
  const handleDeleteBook = async (bookId: string) => {
    const book = books.find(b => b.id === bookId)
    const bookTitle = book?.title || '이 도서'
    const confirmed = window.confirm(`정말 "${bookTitle}" 도서를 삭제하시겠습니까?\n\n삭제된 데이터는 복구할 수 없습니다.`)
    if (!confirmed) {
      return
    }
    
    try {
      const bookRef = doc(db, 'books', bookId)
      await deleteDoc(bookRef)
      alert('도서가 삭제되었습니다.')
      onRefresh()
    } catch (error) {
      console.error('도서 삭제 오류:', error)
      alert('도서 삭제 중 오류가 발생했습니다.')
    }
  }

  // 카테고리 태그 색상
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

  // 카테고리 변경
  const handleCategoryChange = async (bookId: string, newCategory: string) => {
    try {
      const bookRef = doc(db, 'books', bookId)
      await updateDoc(bookRef, {
        category: newCategory
      })
      setOpenCategoryDropdown(null)
      onRefresh()
    } catch (error) {
      console.error('카테고리 변경 오류:', error)
      alert('카테고리 변경 중 오류가 발생했습니다.')
    }
  }

  const filteredBooks = getFilteredBooks()
  const stats = getBookStats()

  const handleDbUpdate = async () => {
    if (confirm('도서 데이터베이스를 최신 스키마로 업데이트하시겠습니까?')) {
      await runBooksUpdate()
      onRefresh()
    }
  }

  return (
    <div className="content-section books-section">
      <div className="books-header">
        <div className="header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>📚 도서 관리</h2>
            <button 
              onClick={handleDbUpdate}
              style={{
                padding: '4px',
                background: 'transparent',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}
            >
              <img src={dbUpdateIcon} alt="DB 업데이트" style={{ width: '36px', height: '36px' }} />
              <span style={{ fontSize: '10px', fontWeight: 500, color: '#333', textAlign: 'center' }}>DB UPDATE</span>
            </button>
          </div>
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
          onClick={onBookAdd}
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
              onClick={() => onBookEdit(book)}
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
                <div className="book-title-author-section">
                  <h3 className="book-title">{truncateText(book.title, 14)}</h3>
                  <p className="book-author">{book.author}</p>
                </div>
              </div>
              <div className="book-card-middle">
                <div className="book-description-section">
                  <p className="book-description" style={{ whiteSpace: 'pre-wrap' }}>
                    {truncateDescriptionToLines(book.description || '도서 설명이 없습니다.', 5)}
                  </p>
                </div>
              </div>
              <div className="book-card-right">
                <div className="book-right-top">
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
                </div>
                <div className="book-right-bottom">
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
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default BooksSection

