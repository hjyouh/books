import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import './MemberEditModal.css'

interface MemberData {
  uid: string;
  id: string;
  name: string;
  nickname: string;
  phone: string;
  email: string;
  address: string;
  blog?: string;
  instagram?: string;
  isAdmin?: boolean;
}

interface MemberEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberData | null;
  onUpdate: () => void;
}

const MemberEditModal: React.FC<MemberEditModalProps> = ({ isOpen, onClose, member, onUpdate }) => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    nickname: '',
    phone: '',
    email: '',
    address: '',
    blog: '',
    instagram: '',
    isAdmin: false
  })
  const [loading, setLoading] = useState(false)

  // 모달이 열릴 때 회원 데이터로 폼 초기화
  useEffect(() => {
    if (member && isOpen) {
      setFormData({
        id: member.id || '',
        name: member.name || '',
        nickname: member.nickname || '',
        phone: member.phone || '',
        email: member.email || '',
        address: member.address || '',
        blog: member.blog || '',
        instagram: member.instagram || '',
        isAdmin: member.isAdmin || false
      })
    }
  }, [member, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!member) return

    try {
      setLoading(true)
      const memberRef = doc(db, 'users', member.uid)
      await updateDoc(memberRef, {
        name: formData.name,
        nickname: formData.nickname,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        blog: formData.blog || '',
        instagram: formData.instagram || '',
        isAdmin: formData.isAdmin
      })

      alert('회원 정보가 성공적으로 수정되었습니다.')
      onUpdate() // 목록 새로고침
      onClose()
    } catch (error) {
      console.error('회원 정보 수정 오류:', error)
      alert('회원 정보 수정 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !member) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="member-edit-overlay" onClick={onClose}>
      <div className="member-edit-modal" onClick={(e) => e.stopPropagation()}>
        <header className="member-edit-modal__header">
          <h2>회원 정보 수정</h2>
          <button type="button" className="member-edit-modal__close" onClick={onClose}>
            ×
          </button>
        </header>

        <form className="member-edit-form" onSubmit={handleSubmit}>
          <div className="member-edit-form__fields">
            <div className="member-edit-field">
              <label htmlFor="id">ID</label>
              <input
                id="id"
                name="id"
                type="text"
                value={formData.id}
                readOnly
                className="member-edit-input readonly"
              />
            </div>

            <div className="member-edit-field">
              <label htmlFor="name">이름</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                className="member-edit-input"
                required
              />
            </div>

            <div className="member-edit-field">
              <label htmlFor="nickname">닉네임</label>
              <input
                id="nickname"
                name="nickname"
                type="text"
                value={formData.nickname}
                onChange={handleInputChange}
                className="member-edit-input"
                required
              />
            </div>

            <div className="member-edit-field">
              <label htmlFor="phone">휴대폰</label>
              <input
                id="phone"
                name="phone"
                type="text"
                value={formData.phone}
                onChange={handleInputChange}
                className="member-edit-input"
                placeholder="010-0000-0000"
                required
              />
            </div>

            <div className="member-edit-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                className="member-edit-input"
                required
              />
            </div>

            <div className="member-edit-field">
              <label htmlFor="address">주소</label>
              <input
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleInputChange}
                className="member-edit-input"
                required
              />
            </div>

            <div className="member-edit-field">
              <label htmlFor="blog">블로그</label>
              <input
                id="blog"
                name="blog"
                type="url"
                value={formData.blog}
                onChange={handleInputChange}
                className="member-edit-input"
                placeholder="https://"
              />
            </div>

            <div className="member-edit-field">
              <label htmlFor="instagram">인스타그램</label>
              <input
                id="instagram"
                name="instagram"
                type="text"
                value={formData.instagram}
                onChange={handleInputChange}
                className="member-edit-input"
                placeholder="@username 또는 링크"
              />
            </div>

            <div className="member-edit-field member-edit-field--inline">
              <label htmlFor="isAdmin">관리자 권한</label>
              <label className="member-edit-toggle">
                <input
                  id="isAdmin"
                  name="isAdmin"
                  type="checkbox"
                  checked={formData.isAdmin}
                  onChange={handleInputChange}
                />
                <span className="member-edit-toggle__slider" />
                <span className="member-edit-toggle__label">{formData.isAdmin ? '활성' : '비활성'}</span>
              </label>
            </div>
          </div>

          <div className="member-edit-actions">
            <button
              type="button"
              className="member-edit-actions__button member-edit-actions__button--ghost"
              onClick={onClose}
            >
              취소
            </button>
            <button
              type="submit"
              className="member-edit-actions__button member-edit-actions__button--primary"
              disabled={loading}
            >
              {loading ? '수정 중...' : '수정 완료'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export default MemberEditModal
