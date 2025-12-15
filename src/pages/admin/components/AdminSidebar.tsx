import React from 'react'
import { MenuItem } from '../types'
import '../../AdminPage.css'

interface AdminSidebarProps {
  activeMenu: MenuItem
  onMenuClick: (menuId: MenuItem) => void
  isMobileMenuOpen: boolean
  onCloseMobileMenu: () => void
}

const menuItems = [
  { id: 'home' as MenuItem, label: '홈', icon: '🏠' },
  { id: 'main-slide' as MenuItem, label: '메인슬라이드', icon: '📺' },
  { id: 'books' as MenuItem, label: '도서관리', icon: '📚' },
  { id: 'ad-management' as MenuItem, label: '광고관리', icon: '📢' },
  { id: 'member-management' as MenuItem, label: '회원관리', icon: '👥' },
  { id: 'review-management' as MenuItem, label: '서평관리', icon: '💬' }
]

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeMenu,
  onMenuClick,
  isMobileMenuOpen,
  onCloseMobileMenu
}) => {
  return (
    <aside className={`admin-sidebar ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
      <div className="sidebar-title">Admin</div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
            onClick={() => {
              onMenuClick(item.id)
              onCloseMobileMenu()
            }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

export default AdminSidebar

