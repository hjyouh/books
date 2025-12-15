import React, { useState } from 'react'
import { MemberData } from '../types'
import { truncateText, truncateMiddle, formatMemberDate } from '../utils'
import { runMembersUpdate } from '../../../utils/updateMembersDatabase'
import dbUpdateIcon from '../../../assets/icons/Cloud-check.png'
import managerIcon from '../../../assets/icons/manager.png'
import searchIcon from '../../../assets/icons/Search.png'
import '../../AdminPage.css'

interface MemberManagementSectionProps {
  members: MemberData[]
  loading: boolean
  onMemberEdit: (member: MemberData) => void
  onMemberDelete: (member: MemberData) => Promise<void>
  onRefresh: () => void
}

// byte 수를 픽셀로 변환하는 함수 (한글 2bytes, 영문 1byte, 폰트 크기 10px 기준)
const bytesToPixels = (bytes: number): number => {
  // 한글 기준으로 계산 (한글 1자 = 2bytes = 약 9px, 영문 1자 = 1byte = 약 5px)
  // padding 5px 좌우 = 10px 추가
  // 한글 기준: bytes / 2 * 9px + 10px (padding)
  // 영문 기준: bytes * 5px + 10px (padding)
  // 평균적으로 bytes * 5px + 10px (padding) 정도로 계산
  return Math.max(bytes * 5 + 10, 30) // 최소 30px
}

// 테이블 전체 너비 계산
const calculateMemberTableWidth = (): number => {
  return 20 + // 체크박스
    bytesToPixels(20) + // ID
    bytesToPixels(14) + // 이름
    bytesToPixels(20) + // 닉네임
    bytesToPixels(16) + // 휴대폰
    bytesToPixels(26) + // Email
    bytesToPixels(30) + // 주소
    bytesToPixels(14) + // 가입일시
    bytesToPixels(22) + // 블로그
    bytesToPixels(22) + // 인스타그램
    bytesToPixels(10) + // 관리자
    bytesToPixels(20) // 수정
}

const MemberManagementSection: React.FC<MemberManagementSectionProps> = ({
  members,
  loading,
  onMemberEdit,
  onMemberDelete,
  onRefresh
}) => {
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('')

  // 필터링된 회원 목록
  const getFilteredMembers = () => {
    if (!memberSearchQuery.trim()) {
      return members
    }
    
    const query = memberSearchQuery.toLowerCase().trim()
    return members.filter(member => {
      const name = (member.name || '').toLowerCase()
      const nickname = (member.nickname || '').toLowerCase()
      const email = (member.email || '').toLowerCase()
      const phone = (member.phone || '').toLowerCase()
      const id = (member.id || '').toLowerCase()
      
      return name.includes(query) || 
             nickname.includes(query) || 
             email.includes(query) || 
             phone.includes(query) ||
             id.includes(query)
    })
  }

  const handleDbUpdate = async () => {
    if (confirm('회원 데이터베이스를 최신 스키마로 업데이트하시겠습니까?')) {
      await runMembersUpdate()
      onRefresh()
    }
  }

  const filteredMembers = getFilteredMembers()

  return (
    <div className="member-management-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>👥 회원 관리</h2>
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
      <div className="member-table-container">
        <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ position: 'relative', width: '200px', height: '24px' }}>
            <input
              type="text"
              placeholder="회원 검색 (이름, 닉네임, 이메일, 전화번호, ID)"
              value={memberSearchQuery}
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              style={{
                width: '200px',
                height: '24px',
                padding: '4px 32px 4px 8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '10px',
                boxSizing: 'border-box'
              }}
            />
            <img 
              src={searchIcon} 
              alt="검색" 
              style={{ 
                position: 'absolute', 
                right: '8px', 
                top: '50%', 
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                pointerEvents: 'none'
              }} 
            />
          </div>
        </div>
        <table className="member-table" style={{ width: `${calculateMemberTableWidth()}px`, minWidth: `${calculateMemberTableWidth()}px`, tableLayout: 'fixed', fontSize: '10px', borderCollapse: 'separate', borderSpacing: '0', border: 'none' }}>
          <thead>
            <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
              <th style={{ width: '20px', minWidth: '20px', maxWidth: '20px', padding: '4px 5px', textAlign: 'center', fontSize: '0' }}>
                <input type="checkbox" style={{ cursor: 'pointer' }} />
              </th>
              <th style={{ width: `${bytesToPixels(20)}px`, minWidth: `${bytesToPixels(20)}px`, maxWidth: `${bytesToPixels(20)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>ID</th>
              <th style={{ width: `${bytesToPixels(14)}px`, minWidth: `${bytesToPixels(14)}px`, maxWidth: `${bytesToPixels(14)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>이름</th>
              <th style={{ width: `${bytesToPixels(20)}px`, minWidth: `${bytesToPixels(20)}px`, maxWidth: `${bytesToPixels(20)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>닉네임</th>
              <th style={{ width: `${bytesToPixels(16)}px`, minWidth: `${bytesToPixels(16)}px`, maxWidth: `${bytesToPixels(16)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>휴대폰</th>
              <th style={{ width: `${bytesToPixels(26)}px`, minWidth: `${bytesToPixels(26)}px`, maxWidth: `${bytesToPixels(26)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>Email</th>
              <th style={{ width: `${bytesToPixels(30)}px`, minWidth: `${bytesToPixels(30)}px`, maxWidth: `${bytesToPixels(30)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>주소</th>
              <th style={{ width: `${bytesToPixels(14)}px`, minWidth: `${bytesToPixels(14)}px`, maxWidth: `${bytesToPixels(14)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>가입일시</th>
              <th style={{ width: `${bytesToPixels(22)}px`, minWidth: `${bytesToPixels(22)}px`, maxWidth: `${bytesToPixels(22)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>블로그</th>
              <th style={{ width: `${bytesToPixels(22)}px`, minWidth: `${bytesToPixels(22)}px`, maxWidth: `${bytesToPixels(22)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>인스타그램</th>
              <th style={{ width: `${bytesToPixels(10)}px`, minWidth: `${bytesToPixels(10)}px`, maxWidth: `${bytesToPixels(10)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>관리자</th>
              <th style={{ width: `${bytesToPixels(20)}px`, minWidth: `${bytesToPixels(20)}px`, maxWidth: `${bytesToPixels(20)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>수정</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} style={{ padding: '20px', textAlign: 'center', fontSize: '10px' }}>로딩 중...</td>
              </tr>
            ) : filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ padding: '20px', textAlign: 'center', fontSize: '10px' }}>
                  {memberSearchQuery ? '검색 결과가 없습니다.' : '등록된 회원이 없습니다.'}
                </td>
              </tr>
            ) : (
              filteredMembers.map((member, index) => (
                <tr 
                  key={member.uid}
                  style={{
                    borderBottom: (index + 1) % 5 === 0 && index < filteredMembers.length - 1 
                      ? '1px solid #e0e0e0' 
                      : 'none',
                    minHeight: '24px',
                    lineHeight: '1.2'
                  }}
                >
                  <td style={{ width: '20px', minWidth: '20px', maxWidth: '20px', padding: '2px 5px', textAlign: 'center', fontSize: '0' }}>
                    <input type="checkbox" style={{ cursor: 'pointer' }} />
                  </td>
                  <td 
                    style={{ width: `${bytesToPixels(20)}px`, minWidth: `${bytesToPixels(20)}px`, maxWidth: `${bytesToPixels(20)}px`, padding: '2px 5px', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}
                    data-full-text={member.id || '-'}
                    title="클릭하여 상세 정보 보기"
                  >
                    <a
                      href="#"
                      className="table-link"
                      onClick={(e) => {
                        e.preventDefault()
                        onMemberEdit(member)
                      }}
                      style={{ fontSize: '10px' }}
                    >
                      {truncateText(member.id || '-', 12)}
                    </a>
                  </td>
                  <td 
                    style={{ width: `${bytesToPixels(14)}px`, minWidth: `${bytesToPixels(14)}px`, maxWidth: `${bytesToPixels(14)}px`, padding: '2px 5px', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}
                    data-full-text={member.name || '-'}
                  >
                    {truncateText(member.name || '-', 8)}
                  </td>
                  <td 
                    style={{ width: `${bytesToPixels(20)}px`, minWidth: `${bytesToPixels(20)}px`, maxWidth: `${bytesToPixels(20)}px`, padding: '2px 5px', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}
                    data-full-text={member.nickname || '-'}
                  >
                    {truncateText(member.nickname || '-', 12)}
                  </td>
                  <td 
                    style={{ width: `${bytesToPixels(16)}px`, minWidth: `${bytesToPixels(16)}px`, maxWidth: `${bytesToPixels(16)}px`, padding: '2px 5px', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}
                    data-full-text={member.phone || '-'}
                  >
                    {truncateMiddle(member.phone || '-', 15)}
                  </td>
                  <td 
                    style={{ width: `${bytesToPixels(26)}px`, minWidth: `${bytesToPixels(26)}px`, maxWidth: `${bytesToPixels(26)}px`, padding: '2px 5px', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}
                    data-full-text={member.email || '-'}
                  >
                    {truncateText(member.email || '-', 25)}
                  </td>
                  <td 
                    style={{ width: `${bytesToPixels(30)}px`, minWidth: `${bytesToPixels(30)}px`, maxWidth: `${bytesToPixels(30)}px`, padding: '2px 5px', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}
                    data-full-text={member.address || '-'}
                  >
                    {truncateMiddle(member.address || '-', 20)}
                  </td>
                  <td 
                    style={{ width: `${bytesToPixels(14)}px`, minWidth: `${bytesToPixels(14)}px`, maxWidth: `${bytesToPixels(14)}px`, padding: '2px 5px', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}
                    data-full-text={formatMemberDate(member.createdAt)}
                  >
                    {formatMemberDate(member.createdAt)}
                  </td>
                  <td 
                    style={{ width: `${bytesToPixels(22)}px`, minWidth: `${bytesToPixels(22)}px`, maxWidth: `${bytesToPixels(22)}px`, padding: '2px 5px', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}
                    data-full-text={member.blog || '-'}
                  >
                    {member.blog ? (
                      <a href={member.blog.startsWith('http') ? member.blog : `https://${member.blog}`} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="link"
                         style={{ fontSize: '10px' }}>
                        {truncateMiddle(member.blog, 20)}
                      </a>
                    ) : (
                      <span className="no-data" style={{ fontSize: '10px' }}>-</span>
                    )}
                  </td>
                  <td 
                    style={{ width: `${bytesToPixels(22)}px`, minWidth: `${bytesToPixels(22)}px`, maxWidth: `${bytesToPixels(22)}px`, padding: '2px 5px', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}
                    data-full-text={member.instagram || '-'}
                  >
                    {member.instagram ? (
                      <a href={member.instagram.startsWith('http') ? member.instagram : `https://${member.instagram}`} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="link"
                         style={{ fontSize: '10px' }}>
                        {truncateMiddle(member.instagram, 15)}
                      </a>
                    ) : (
                      <span className="no-data" style={{ fontSize: '10px' }}>-</span>
                    )}
                  </td>
                  <td style={{ width: `${bytesToPixels(10)}px`, minWidth: `${bytesToPixels(10)}px`, maxWidth: `${bytesToPixels(10)}px`, padding: '2px 5px', fontSize: '10px', textAlign: 'center' }}>
                    {member.isAdmin ? (
                      <img src={managerIcon} alt="관리자" style={{ width: '20px', height: '20px' }} />
                    ) : (
                      <span className="no-data" style={{ fontSize: '10px' }}>-</span>
                    )}
                  </td>
                  <td style={{ width: `${bytesToPixels(20)}px`, minWidth: `${bytesToPixels(20)}px`, maxWidth: `${bytesToPixels(20)}px`, padding: '2px 5px', fontSize: '10px', textAlign: 'center' }}>
                    <div className="action-buttons" style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      <button 
                        type="button"
                        className="edit-icon" 
                        title="수정"
                        onClick={() => onMemberEdit(member)}
                        style={{ fontSize: '10px', padding: '2px 4px', cursor: 'pointer', background: 'transparent', border: 'none' }}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="delete-icon"
                        title="삭제"
                        onClick={() => onMemberDelete(member)}
                        style={{ fontSize: '10px', padding: '2px 4px', cursor: 'pointer', background: 'transparent', border: 'none' }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default MemberManagementSection

