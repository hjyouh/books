import React from 'react'
import { createPortal } from 'react-dom'
import './MemberDetailModal.css'

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
  level: string;
  createdAt: any;
  isAdmin?: boolean;
}

interface MemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberData | null;
}

const MemberDetailModal: React.FC<MemberDetailModalProps> = ({ isOpen, onClose, member }) => {
  if (!isOpen || !member) return null
  if (typeof document === 'undefined') return null

  // 날짜 포맷팅 함수 (25/11/11 13:35 형식)
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

  return createPortal(
    <div className="modal-overlay member-detail-modal-overlay" onClick={onClose}>
      <div className="modal-content member-detail-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>회원 상세 정보</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="member-detail-body">
          <div className="detail-section">
            <div className="detail-row">
              <div className="detail-label">ID</div>
              <div className="detail-value">{member.id || '-'}</div>
            </div>

            <div className="detail-row">
              <div className="detail-label">이름</div>
              <div className="detail-value">{member.name || '-'}</div>
            </div>

            <div className="detail-row">
              <div className="detail-label">닉네임</div>
              <div className="detail-value">{member.nickname || '-'}</div>
            </div>

            <div className="detail-row">
              <div className="detail-label">휴대폰</div>
              <div className="detail-value">{member.phone || '-'}</div>
            </div>

            <div className="detail-row">
              <div className="detail-label">Email</div>
              <div className="detail-value">{member.email || '-'}</div>
            </div>

            <div className="detail-row">
              <div className="detail-label">주소</div>
              <div className="detail-value">{member.address || '-'}</div>
            </div>

            <div className="detail-row">
              <div className="detail-label">가입일시</div>
              <div className="detail-value">{formatMemberDate(member.createdAt)}</div>
            </div>

            <div className="detail-row">
              <div className="detail-label">블로그</div>
              <div className="detail-value">
                {member.blog ? (
                  <a 
                    href={member.blog.startsWith('http') ? member.blog : `https://${member.blog}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="detail-link"
                  >
                    {member.blog}
                  </a>
                ) : (
                  <span className="no-data">-</span>
                )}
              </div>
            </div>

            <div className="detail-row">
              <div className="detail-label">인스타그램</div>
              <div className="detail-value">
                {member.instagram ? (
                  <a 
                    href={member.instagram.startsWith('http') ? member.instagram : `https://${member.instagram}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="detail-link"
                  >
                    {member.instagram}
                  </a>
                ) : (
                  <span className="no-data">-</span>
                )}
              </div>
            </div>

            <div className="detail-row">
              <div className="detail-label">관리자</div>
              <div className="detail-value">
                {member.isAdmin ? (
                  <span className="admin-badge">관리자</span>
                ) : (
                  <span className="no-data">일반 회원</span>
                )}
              </div>
            </div>

            <div className="detail-row">
              <div className="detail-label">등급</div>
              <div className="detail-value">{member.level || '-'}</div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="close-modal-btn" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default MemberDetailModal

