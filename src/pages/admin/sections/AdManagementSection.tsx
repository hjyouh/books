import React from 'react'
import { SlideData } from '../types'
import { formatPostingDate } from '../utils'
import { runSlidesUpdate } from '../../../utils/updateSlidesDatabase'
import editIcon from '../../../assets/icons/edit.png'
import leftArrowIcon from '../../../assets/icons/left-white.png'
import rightArrowIcon from '../../../assets/icons/right-white.png'
import trashIcon from '../../../assets/icons/Trash.png'
import addImageIcon from '../../../assets/icons/add-image.png'
import dbUpdateIcon from '../../../assets/icons/Cloud-check.png'
import onButtonIcon from '../../../assets/icons/on-button.png'
import offButtonIcon from '../../../assets/icons/off-button.png'
import '../../AdminPage.css'

interface AdManagementSectionProps {
  slides: SlideData[]
  onSlideToggle: (slideId: string, activate: boolean, slideType?: 'main' | 'ad') => Promise<void>
  onSlideMoveUp: (slideId: string, slideType?: 'main' | 'ad') => Promise<void>
  onSlideMoveDown: (slideId: string, slideType?: 'main' | 'ad') => Promise<void>
  onSlideDelete: (slideId: string) => Promise<void>
  onSlideEdit: (slide: SlideData) => void
  onSlideAdd: () => void
  onRefresh: () => void
}

const AdManagementSection: React.FC<AdManagementSectionProps> = ({
  slides,
  onSlideToggle,
  onSlideMoveUp,
  onSlideMoveDown,
  onSlideDelete,
  onSlideEdit,
  onSlideAdd,
  onRefresh
}) => {
  const activeAdSlides = slides.filter(slide => slide.isActive && slide.slideType === 'ad').sort((a, b) => {
    if (a.order === b.order) {
      return a.id.localeCompare(b.id)
    }
    return a.order - b.order
  })
  
  const inactiveAdSlides = slides.filter(slide => !slide.isActive && slide.slideType === 'ad').sort((a, b) => {
    if (a.order === b.order) {
      return a.id.localeCompare(b.id)
    }
    return a.order - b.order
  })

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

  const handleDbUpdate = async () => {
    if (confirm('광고 슬라이드 데이터베이스를 최신 스키마로 업데이트하시겠습니까?')) {
      await runSlidesUpdate()
      onRefresh()
    }
  }

  return (
    <div className="content-section slide-management-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>📢 광고슬라이드 관리</h2>
        <button 
          onClick={handleDbUpdate}
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
                      onChange={() => onSlideToggle(slide.id, false, 'ad')}
                    />
                    <span className="toggle-slider">
                      <img 
                        src={slide.isActive ? onButtonIcon : offButtonIcon} 
                        alt={slide.isActive ? "활성" : "비활성"} 
                        style={{ width: '64px', height: '64px' }} 
                      />
                    </span>
                  </label>
                  {renderPostingPeriod(slide)}
                  <div className="slide-action-buttons">
                    <button 
                      type="button"
                      className="slide-edit-icon-bottom"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSlideEdit(slide)
                      }}
                      title="편집"
                    >
                      <img src={editIcon} alt="편집" style={{ width: '24px', height: '24px' }} />
                    </button>
                    <button 
                      type="button"
                      className="slide-move-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (index > 0) {
                          onSlideMoveUp(slide.id, 'ad')
                        }
                      }}
                      disabled={index === 0}
                      title="왼쪽으로 이동"
                    >
                      <img src={leftArrowIcon} alt="왼쪽 이동" style={{ width: '24px', height: '24px' }} />
                    </button>
                    <button 
                      type="button"
                      className="slide-move-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (index < activeAdSlides.length - 1) {
                          onSlideMoveDown(slide.id, 'ad')
                        }
                      }}
                      disabled={index === activeAdSlides.length - 1}
                      title="오른쪽으로 이동"
                    >
                      <img src={rightArrowIcon} alt="오른쪽 이동" style={{ width: '24px', height: '24px' }} />
                    </button>
                    <button 
                      type="button"
                      className="slide-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSlideDelete(slide.id)
                      }}
                      title="삭제"
                    >
                      <img src={trashIcon} alt="삭제" style={{ width: '24px', height: '24px' }} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* 새 광고 슬라이드 추가 영역 */}
          <div 
            className="slide-card add-slide-card"
            onClick={onSlideAdd}
          >
            <div className="add-slide-area">
              <div className="add-slide-icon">
                <img src={addImageIcon} alt="슬라이드 추가" style={{ width: '64px', height: '64px' }} />
              </div>
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
                        onChange={() => onSlideToggle(slide.id, true, 'ad')}
                      />
                      <span className="toggle-slider">
                        <img 
                          src={slide.isActive ? onButtonIcon : offButtonIcon} 
                          alt={slide.isActive ? "활성" : "비활성"} 
                          style={{ width: '64px', height: '64px' }} 
                        />
                      </span>
                    </label>
                    {renderPostingPeriod(slide)}
                    <div className="slide-action-buttons">
                      <button 
                        type="button"
                        className="slide-edit-icon-bottom"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSlideEdit(slide)
                        }}
                        title="편집"
                      >
                        <img src={editIcon} alt="편집" style={{ width: '24px', height: '24px' }} />
                      </button>
                      <button 
                        type="button"
                        className="slide-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          onSlideDelete(slide.id)
                        }}
                        title="삭제"
                      >
                        <img src={trashIcon} alt="삭제" style={{ width: '24px', height: '24px' }} />
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
}

export default AdManagementSection

