import React from 'react'
import { MenuItem } from '../types'
import '../../AdminPage.css'

interface AdminHeaderProps {
  activeMenu: MenuItem
  isMobileMenuOpen: boolean
  onToggleMobileMenu: () => void
  onCloseMobileMenu: () => void
  onLogout: () => void
  onAddMember?: () => void
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeMenu,
  isMobileMenuOpen,
  onToggleMobileMenu,
  onCloseMobileMenu,
  onLogout,
  onAddMember
}) => {
  return (
    <>
      <header className="admin-header">
        <div className="admin-nav">
          <button className="hamburger-btn" onClick={onToggleMobileMenu}>
            ☰
          </button>
          <h1 style={{ 
            position: 'absolute', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 1,
            margin: 0,
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: '#333',
            padding: '0.25rem 0'
          }}>
            {activeMenu === 'member-management' ? '회원 관리' : '관리자 페이지'}
          </h1>
          <div className="header-right">
            {activeMenu === 'member-management' && onAddMember && (
              <button 
                className="add-member-btn" 
                onClick={onAddMember}
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
            <button className="logout-btn" onClick={onLogout}>
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 메뉴 오버레이 */}
      {isMobileMenuOpen && (
        <div 
          className="mobile-menu-overlay" 
          onClick={onCloseMobileMenu}
        />
      )}
    </>
  )
}

export default AdminHeader

