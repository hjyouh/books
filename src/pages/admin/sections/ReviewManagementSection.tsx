import React, { useState } from 'react'
import { ReviewApplicationData } from '../types'
import { formatDate, formatReviewCount } from '../utils'
import { runReviewsUpdate } from '../../../utils/updateReviewsDatabase'
import { doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../../firebase'
import dbUpdateIcon from '../../../assets/icons/Cloud-check.png'
import excelIcon from '../../../assets/icons/excel.png'
import blogIcon from '../../../assets/icons/blog.png'
import instagramIcon from '../../../assets/icons/instagram.png'
import trashIcon from '../../../assets/icons/Trash.png'
import '../../AdminPage.css'

interface ReviewManagementSectionProps {
  reviewApplications: ReviewApplicationData[]
  loading: boolean
  onApplicationsUpdate: (applications: ReviewApplicationData[]) => void
  onRefresh: () => void
}

// byte 수를 픽셀로 변환하는 함수 (한글 2bytes, 영문 1byte, 폰트 크기 9px 기준)
const bytesToPixels = (bytes: number): number => {
  // 한글 기준으로 계산 (한글 1자 = 2bytes = 약 9px, 영문 1자 = 1byte = 약 5px)
  // padding 5px 좌우 = 10px 추가
  // 한글 기준: bytes / 2 * 9px + 10px (padding)
  // 영문 기준: bytes * 5px + 10px (padding)
  // 평균적으로 bytes * 5px + 10px (padding) 정도로 계산
  return Math.max(bytes * 5 + 10, 30) // 최소 30px
}

// 테이블 전체 너비 계산
const calculateTableWidth = (): number => {
  return 20 + // 체크박스
    bytesToPixels(12) + // ID
    bytesToPixels(12) + // 이름
    bytesToPixels(12) + // 닉네임
    bytesToPixels(16) + // 휴대폰
    bytesToPixels(22) + // 도서명
    bytesToPixels(10) + // 신청일
    bytesToPixels(10) + // 신청갯수
    bytesToPixels(18) + // 처리상태
    bytesToPixels(10) + // 정보출력
    bytesToPixels(10) + // 발송일
    bytesToPixels(10) + // 서평완료
    34 +                // blog
    34 +                // insta
    250                 // 관리자메모 (50자 입력 가능)
}

// 텍스트를 byte 수에 맞게 자르는 함수
const truncateByBytes = (text: string, maxBytes: number): string => {
  if (!text || text === '-') return text || '-'
  
  let byteCount = 0
  let result = ''
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const charBytes = char.charCodeAt(0) > 127 ? 2 : 1 // 한글은 2bytes, 영문은 1byte
    
    if (byteCount + charBytes > maxBytes) {
      break
    }
    
    result += char
    byteCount += charBytes
  }
  
  if (byteCount < text.length * (text.match(/[가-힣]/) ? 2 : 1)) {
    return result + '..'
  }
  
  return result
}

const ReviewManagementSection: React.FC<ReviewManagementSectionProps> = ({
  reviewApplications,
  loading,
  onApplicationsUpdate,
  onRefresh
}) => {
  const [selectedBookFilter, setSelectedBookFilter] = useState<string>('전체')
  const [selectedInProgress, setSelectedInProgress] = useState<Set<string>>(new Set())
  const [selectedCompleted, setSelectedCompleted] = useState<Set<string>>(new Set())
  const [monthlyLimit, setMonthlyLimit] = useState<number>(3)
  const [hoveredCell, setHoveredCell] = useState<{ rowId: string; column: string } | null>(null)
  const [showCompletedOnly, setShowCompletedOnly] = useState<boolean>(false) // 진행중 영역에서 서평완료만 필터링
  const [showInProgress, setShowInProgress] = useState<boolean>(true) // 진행중 섹션 표시 여부 (기본: 열림)
  const [showCompleted, setShowCompleted] = useState<boolean>(true) // 서평완료 섹션 표시 여부 (기본: 열림 - 모든 데이터 표시)

  // 처리상태별 색상
  const getStatusColor = (status: string): string => {
    switch (status) {
      case '도서발송':
        return '#C5E0B4' // light green
      case '서평대기':
        return '#FFE38B' // light yellow
      case '서평완료':
        return '#C2C7F4' // light blue
      default:
        return 'transparent' // 서평신청은 기본
    }
  }

  // 진행중과 서평완료 분리
  const inProgressApps = reviewApplications.filter(app => app.처리상태 !== '서평완료')
  const completedApps = reviewApplications.filter(app => app.처리상태 === '서평완료')

  // Last in First Display (최신순)
  const sortedInProgress = [...inProgressApps].sort((a, b) => {
    const aTime = a.신청일?.toDate?.()?.getTime() || a.createdAt?.toDate?.()?.getTime() || 0
    const bTime = b.신청일?.toDate?.()?.getTime() || b.createdAt?.toDate?.()?.getTime() || 0
    return bTime - aTime
  })

  const sortedCompleted = [...completedApps].sort((a, b) => {
    const aTime = a.완료일?.toDate?.()?.getTime() || a.createdAt?.toDate?.()?.getTime() || 0
    const bTime = b.완료일?.toDate?.()?.getTime() || b.createdAt?.toDate?.()?.getTime() || 0
    return bTime - aTime
  })

  // 필터링된 서평 신청 목록
  const getFilteredApplications = (apps: ReviewApplicationData[]) => {
    let filtered = apps
    
    if (selectedBookFilter !== '전체') {
      filtered = filtered.filter(app => app.bookTitle === selectedBookFilter)
    }
    
    return filtered
  }

  // 분리 필터에 따라 표시할 데이터 결정
  const filteredInProgress = getFilteredApplications(sortedInProgress)
  const filteredCompleted = getFilteredApplications(sortedCompleted)

  // 선택된 항목들을 서평완료로 이동
  const handleMoveToCompleted = async () => {
    if (selectedInProgress.size === 0) {
      alert('이동할 항목을 선택해주세요.')
      return
    }

    if (!confirm(`선택한 ${selectedInProgress.size}건을 서평완료로 이동하시겠습니까?`)) {
      return
    }

    try {
      const now = Timestamp.now()
      await Promise.all(Array.from(selectedInProgress).map(async (appId) => {
        try {
          const applicationRef = doc(db, 'reviewApplications', appId)
          await updateDoc(applicationRef, {
            처리상태: '서평완료',
            완료일: now,
            updatedAt: now
          })
        } catch (error) {
          console.error('서평완료 상태 업데이트 실패:', error)
        }
      }))

      setSelectedInProgress(new Set())
      onRefresh()
      alert(`${selectedInProgress.size}건이 서평완료로 이동되었습니다.`)
    } catch (error) {
      console.error('서평완료 이동 중 오류 발생:', error)
      alert('서평완료 이동 중 오류가 발생했습니다.')
    }
  }

  // 선택된 항목들을 진행중으로 이동 (서평완료 섹션에서)
  const handleMoveToInProgress = async () => {
    if (selectedCompleted.size === 0) {
      alert('이동할 항목을 선택해주세요.')
      return
    }

    if (!confirm(`선택한 ${selectedCompleted.size}건을 진행중으로 이동하시겠습니까?`)) {
      return
    }

    try {
      const now = Timestamp.now()
      await Promise.all(Array.from(selectedCompleted).map(async (appId) => {
        try {
          const applicationRef = doc(db, 'reviewApplications', appId)
          await updateDoc(applicationRef, {
            처리상태: '서평대기',
            완료일: null,
            updatedAt: now
          })
        } catch (error) {
          console.error('진행중 상태 업데이트 실패:', error)
        }
      }))

      setSelectedCompleted(new Set())
      onRefresh()
      alert(`${selectedCompleted.size}건이 진행중으로 이동되었습니다.`)
    } catch (error) {
      console.error('진행중 이동 중 오류 발생:', error)
      alert('진행중 이동 중 오류가 발생했습니다.')
    }
  }

  // 선택된 항목들 삭제 (진행중 섹션)
  const handleDeleteSelectedInProgress = async () => {
    if (selectedInProgress.size === 0) {
      alert('삭제할 항목을 선택해주세요.')
      return
    }

    if (!confirm(`선택한 ${selectedInProgress.size}건을 삭제하시겠습니까?\n\n삭제된 데이터는 복구할 수 없습니다.`)) {
      return
    }

    try {
      await Promise.all(Array.from(selectedInProgress).map(async (appId) => {
        try {
          const applicationRef = doc(db, 'reviewApplications', appId)
          await deleteDoc(applicationRef)
        } catch (error) {
          console.error('서평 신청 삭제 실패:', error)
        }
      }))

      setSelectedInProgress(new Set())
      onRefresh()
      alert(`${selectedInProgress.size}건이 삭제되었습니다.`)
    } catch (error) {
      console.error('삭제 중 오류 발생:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  // 선택된 항목들 삭제 (서평완료 섹션)
  const handleDeleteSelectedCompleted = async () => {
    if (selectedCompleted.size === 0) {
      alert('삭제할 항목을 선택해주세요.')
      return
    }

    if (!confirm(`선택한 ${selectedCompleted.size}건을 삭제하시겠습니까?\n\n삭제된 데이터는 복구할 수 없습니다.`)) {
      return
    }

    try {
      await Promise.all(Array.from(selectedCompleted).map(async (appId) => {
        try {
          const applicationRef = doc(db, 'reviewApplications', appId)
          await deleteDoc(applicationRef)
        } catch (error) {
          console.error('서평 신청 삭제 실패:', error)
        }
      }))

      setSelectedCompleted(new Set())
      onRefresh()
      alert(`${selectedCompleted.size}건이 삭제되었습니다.`)
    } catch (error) {
      console.error('삭제 중 오류 발생:', error)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  // 전체 선택/해제 (진행중)
  const handleSelectAllInProgress = (apps: ReviewApplicationData[]) => {
    if (selectedInProgress.size === apps.length && apps.length > 0) {
      setSelectedInProgress(new Set())
    } else {
      setSelectedInProgress(new Set(apps.map(app => app.서평ID)))
    }
  }

  // 전체 선택/해제 (서평완료)
  const handleSelectAllCompleted = (apps: ReviewApplicationData[]) => {
    if (selectedCompleted.size === apps.length && apps.length > 0) {
      setSelectedCompleted(new Set())
    } else {
      setSelectedCompleted(new Set(apps.map(app => app.서평ID)))
    }
  }

  // 선택된 항목들 Excel 다운로드 함수 (진행중)
  const handleExcelDownloadInProgress = async (applicationId?: string) => {
    let appsToDownload: ReviewApplicationData[]
    
    if (applicationId) {
      // 단일 항목 다운로드
      appsToDownload = reviewApplications.filter(app => app.서평ID === applicationId)
    } else {
      // 선택된 항목들 다운로드
      if (selectedInProgress.size === 0) {
        alert('다운로드할 항목을 선택해주세요.')
        return
      }
      appsToDownload = reviewApplications.filter(app => selectedInProgress.has(app.서평ID))
    }

    try {
      // CSV 데이터 준비
      const headers = ['회원ID', '이름', '닉네임', '휴대폰', '도서명', '신청일', '서평신청갯수', '처리상태', '발송일', '완료일', '블로그링크', '인스타링크', '관리자메모']
      
      const rows = appsToDownload.map(app => [
        app.applicantId || app.회원ID,
        app.applicantName,
        app.applicantNickname || '-',
        app.applicantPhone,
        app.bookTitle,
        formatDate(app.신청일),
        app.서평갯수 || 0,
        app.처리상태,
        formatDate(app.발송일),
        formatDate(app.완료일),
        app.applicantBlog || '-',
        app.applicantInstagram || '-',
        app.관리자메모 || ''
      ])

      // CSV 형식으로 변환
      const csvRows = rows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      const csvContent = '\uFEFF' + headers.join(',') + '\n' + csvRows.join('\n')

      // 파일 다운로드
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `서평신청_${appsToDownload.length}건_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // 다운로드 후 상태를 도서발송으로 업데이트 (선택된 항목들만)
      if (!applicationId && selectedInProgress.size > 0) {
        const now = Timestamp.now()
        await Promise.all(appsToDownload.map(async (app) => {
          try {
            const applicationRef = doc(db, 'reviewApplications', app.서평ID)
            await updateDoc(applicationRef, {
              처리상태: '도서발송',
              발송일: now,
              updatedAt: now
            })
          } catch (error) {
            console.error('도서발송 상태 업데이트 실패:', error)
          }
        }))
        setSelectedInProgress(new Set())
        onRefresh()
      }

      alert(`${appsToDownload.length}건의 서평 신청 정보가 다운로드되었습니다.`)
    } catch (error) {
      console.error('엑셀 다운로드 중 오류 발생:', error)
      alert('엑셀 다운로드 중 오류가 발생했습니다.')
    }
  }

  // 체크박스 선택/해제 핸들러 (진행중)
  const handleCheckboxChangeInProgress = (applicationId: string) => {
    setSelectedInProgress(prev => {
      const newSet = new Set(prev)
      if (newSet.has(applicationId)) {
        newSet.delete(applicationId)
      } else {
        newSet.add(applicationId)
      }
      return newSet
    })
  }

  // 체크박스 선택/해제 핸들러 (서평완료)
  const handleCheckboxChangeCompleted = (applicationId: string) => {
    setSelectedCompleted(prev => {
      const newSet = new Set(prev)
      if (newSet.has(applicationId)) {
        newSet.delete(applicationId)
      } else {
        newSet.add(applicationId)
      }
      return newSet
    })
  }

  // 처리 상태 업데이트
  const handleStatusChange = async (applicationId: string, newStatus: '서평신청' | '도서발송' | '서평대기' | '서평완료') => {
    try {
      const applicationRef = doc(db, 'reviewApplications', applicationId)
      const updateData: any = {
        처리상태: newStatus,
        updatedAt: Timestamp.now()
      }

      const app = reviewApplications.find(a => a.서평ID === applicationId)
      if (newStatus === '도서발송' && !app?.발송일) {
        updateData.발송일 = Timestamp.now()
      }
      if (newStatus === '서평완료' && !app?.완료일) {
        updateData.완료일 = Timestamp.now()
      }

      await updateDoc(applicationRef, updateData)

      const updatedApplications = reviewApplications.map(app =>
        app.서평ID === applicationId
          ? { ...app, 처리상태: newStatus, ...updateData }
          : app
      )
      onApplicationsUpdate(updatedApplications)
    } catch (error) {
      console.error('처리 상태 업데이트 오류:', error)
      alert('처리 상태 업데이트 중 오류가 발생했습니다.')
    }
  }

  // 관리자 메모 업데이트
  const handleMemoUpdate = async (applicationId: string, memo: string) => {
    try {
      const applicationRef = doc(db, 'reviewApplications', applicationId)
      await updateDoc(applicationRef, {
        관리자메모: memo,
        updatedAt: Timestamp.now()
      })

      const updatedApplications = reviewApplications.map(app =>
        app.서평ID === applicationId
          ? { ...app, 관리자메모: memo }
          : app
      )
      onApplicationsUpdate(updatedApplications)
    } catch (error) {
      console.error('관리자 메모 업데이트 오류:', error)
      alert('관리자 메모 업데이트 중 오류가 발생했습니다.')
    }
  }

  const handleDbUpdate = async () => {
    if (confirm('서평 신청 데이터베이스를 최신 스키마로 업데이트하시겠습니까?')) {
      await runReviewsUpdate()
      onRefresh()
    }
  }

  const uniqueBookTitles = Array.from(new Set(reviewApplications.map(app => app.bookTitle))).sort()

  // 테이블 행 렌더링 함수
  const renderTableRow = (app: ReviewApplicationData, index: number, totalLength: number, sectionType: 'inProgress' | 'completed' = 'inProgress') => {
    const displayMemberId = app.applicantId && typeof app.applicantId === 'string' && app.applicantId.trim() !== '' 
      ? truncateByBytes(app.applicantId, 10) // 좌우 1byte 여유 = 12 - 2
      : '-'
    
    const fullMemberId = app.applicantId || app.회원ID || '-'
    const fullName = app.applicantName || '-'
    const fullNickname = app.applicantNickname || '-'
    const fullPhone = app.applicantPhone || '-'
    const fullBookTitle = app.bookTitle || '-'

    const isHovered = hoveredCell?.rowId === app.서평ID

    return (
      <tr 
        key={app.서평ID}
        style={{
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          borderBottom: (index + 1) % 5 === 0 && index < totalLength - 1 
            ? '1px solid #e0e0e0' 
            : 'none',
          minHeight: '24px',
          lineHeight: '1.2'
        }}
      >
        {/* 체크박스 */}
        <td style={{ width: '20px', padding: '2px 5px', textAlign: 'center', fontSize: '0' }}>
          <input
            type="checkbox"
            checked={sectionType === 'inProgress' ? selectedInProgress.has(app.서평ID) : selectedCompleted.has(app.서평ID)}
            onChange={() => sectionType === 'inProgress' ? handleCheckboxChangeInProgress(app.서평ID) : handleCheckboxChangeCompleted(app.서평ID)}
            style={{ cursor: 'pointer' }}
          />
        </td>
        
        {/* ID (12 bytes) */}
        <td 
          style={{ 
            width: `${bytesToPixels(12)}px`, 
            minWidth: `${bytesToPixels(12)}px`,
            maxWidth: `${bytesToPixels(12)}px`,
            padding: '2px 5px',
            fontSize: '10px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={isHovered && hoveredCell?.column === 'id' ? fullMemberId : undefined}
          onMouseEnter={() => setHoveredCell({ rowId: app.서평ID, column: 'id' })}
          onMouseLeave={() => setHoveredCell(null)}
        >
          {displayMemberId}
        </td>
        
        {/* 이름 (12 bytes) */}
        <td 
          style={{ 
            width: `${bytesToPixels(12)}px`, 
            minWidth: `${bytesToPixels(12)}px`,
            maxWidth: `${bytesToPixels(12)}px`,
            padding: '2px 5px',
            fontSize: '10px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={isHovered && hoveredCell?.column === 'name' ? fullName : undefined}
          onMouseEnter={() => setHoveredCell({ rowId: app.서평ID, column: 'name' })}
          onMouseLeave={() => setHoveredCell(null)}
        >
          {truncateByBytes(fullName, 10)}
        </td>
        
        {/* 닉네임 (12 bytes) */}
        <td 
          style={{ 
            width: `${bytesToPixels(12)}px`, 
            minWidth: `${bytesToPixels(12)}px`,
            maxWidth: `${bytesToPixels(12)}px`,
            padding: '2px 5px',
            fontSize: '10px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={isHovered && hoveredCell?.column === 'nickname' ? fullNickname : undefined}
          onMouseEnter={() => setHoveredCell({ rowId: app.서평ID, column: 'nickname' })}
          onMouseLeave={() => setHoveredCell(null)}
        >
          {truncateByBytes(fullNickname, 10)}
        </td>
        
        {/* 휴대폰 (16 bytes) */}
        <td 
          style={{ 
            width: `${bytesToPixels(16)}px`, 
            minWidth: `${bytesToPixels(16)}px`,
            maxWidth: `${bytesToPixels(16)}px`,
            padding: '2px 5px',
            fontSize: '10px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={isHovered && hoveredCell?.column === 'phone' ? fullPhone : undefined}
          onMouseEnter={() => setHoveredCell({ rowId: app.서평ID, column: 'phone' })}
          onMouseLeave={() => setHoveredCell(null)}
        >
          {truncateByBytes(fullPhone, 12)}
        </td>
        
        {/* 도서명 (22 bytes) */}
        <td 
          style={{ 
            width: `${bytesToPixels(22)}px`, 
            minWidth: `${bytesToPixels(22)}px`,
            maxWidth: `${bytesToPixels(22)}px`,
            padding: '2px 5px',
            fontSize: '10px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={isHovered && hoveredCell?.column === 'bookTitle' ? fullBookTitle : undefined}
          onMouseEnter={() => setHoveredCell({ rowId: app.서평ID, column: 'bookTitle' })}
          onMouseLeave={() => setHoveredCell(null)}
        >
          <a 
            href={`#book-${app.도서ID}`}
            style={{ color: '#667eea', textDecoration: 'none' }}
          >
            {truncateByBytes(fullBookTitle, 20)}
          </a>
        </td>
        
        {/* 신청일 (10 bytes) */}
        <td style={{ 
          width: `${bytesToPixels(10)}px`, 
          minWidth: `${bytesToPixels(10)}px`,
          maxWidth: `${bytesToPixels(10)}px`,
          padding: '2px 5px', 
          fontSize: '10px', 
          textAlign: 'center' 
        }}>
          {formatDate(app.신청일)}
        </td>
        
        {/* 서평신청갯수 (10 bytes) */}
        <td style={{ 
          width: `${bytesToPixels(10)}px`, 
          minWidth: `${bytesToPixels(10)}px`,
          maxWidth: `${bytesToPixels(10)}px`,
          padding: '2px 5px', 
          fontSize: '10px', 
          textAlign: 'center',
          border: 'none',
          borderTop: 'none',
          borderBottom: 'none'
        }}>
          {formatReviewCount(app.서평갯수)}
        </td>
        
        {/* 처리상태 (18 bytes) */}
        <td style={{ 
          width: `${bytesToPixels(18)}px`, 
          minWidth: `${bytesToPixels(18)}px`,
          maxWidth: `${bytesToPixels(18)}px`,
          padding: '2px 5px', 
          fontSize: '10px', 
          textAlign: 'center',
          position: 'relative'
        }}>
          <select
            value={app.처리상태}
            onChange={(e) => handleStatusChange(app.서평ID, e.target.value as any)}
            style={{
              padding: '2px 20px 2px 4px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              fontSize: '10px',
              width: '100%',
              backgroundColor: getStatusColor(app.처리상태),
              textAlign: 'center',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath fill='%23333' d='M0 2l4 4 4-4z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 4px center',
              backgroundSize: '8px 8px',
              paddingRight: '20px'
            }}
          >
            <option value="서평신청">서평신청</option>
            <option value="도서발송">도서발송</option>
            <option value="서평대기">서평대기</option>
            <option value="서평완료">서평완료</option>
          </select>
        </td>
        
        {/* 정보출력 (10 bytes) */}
        <td 
          style={{ 
            width: `${bytesToPixels(10)}px`, 
            minWidth: `${bytesToPixels(10)}px`,
            maxWidth: `${bytesToPixels(10)}px`,
            padding: '2px 5px', 
            textAlign: 'center', 
            position: 'relative',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const tooltip = document.createElement('div')
            tooltip.id = `excel-tooltip-${app.서평ID}`
            tooltip.style.position = 'fixed'
            tooltip.style.left = `${rect.right + 5}px`
            tooltip.style.top = `${rect.top}px`
            tooltip.style.zIndex = '10000'
            tooltip.style.cursor = 'pointer'
            tooltip.innerHTML = `<img src="${excelIcon}" style="width: 24px; height: 24px; cursor: pointer;" />`
            tooltip.onclick = () => {
              handleExcelDownloadInProgress(app.서평ID)
              tooltip.remove()
            }
            document.body.appendChild(tooltip)
          }}
          onMouseLeave={() => {
            const tooltip = document.getElementById(`excel-tooltip-${app.서평ID}`)
            if (tooltip) tooltip.remove()
          }}
        >
          <input
            type="checkbox"
            checked={sectionType === 'inProgress' ? selectedInProgress.has(app.서평ID) : selectedCompleted.has(app.서평ID)}
            onChange={() => sectionType === 'inProgress' ? handleCheckboxChangeInProgress(app.서평ID) : handleCheckboxChangeCompleted(app.서평ID)}
            style={{ cursor: 'pointer' }}
            onClick={(e) => e.stopPropagation()}
          />
        </td>
        
        {/* 발송일 (10 bytes) */}
        <td style={{ 
          width: `${bytesToPixels(10)}px`, 
          minWidth: `${bytesToPixels(10)}px`,
          maxWidth: `${bytesToPixels(10)}px`,
          padding: '2px 5px', 
          fontSize: '10px', 
          textAlign: 'center' 
        }}>
          {formatDate(app.발송일)}
        </td>
        
        {/* 서평완료 (10 bytes) */}
        <td style={{ 
          width: `${bytesToPixels(10)}px`, 
          minWidth: `${bytesToPixels(10)}px`,
          maxWidth: `${bytesToPixels(10)}px`,
          padding: '2px 5px', 
          fontSize: '10px', 
          textAlign: 'center' 
        }}>
          {formatDate(app.완료일)}
        </td>
        
        {/* blog (24x24) */}
        <td style={{ 
          width: '34px', 
          minWidth: '34px',
          maxWidth: '34px',
          padding: '2px 5px', 
          textAlign: 'center' 
        }}>
          {app.처리상태 === '서평완료' && app.applicantBlog ? (
            <a 
              href={app.applicantBlog.startsWith('http') ? app.applicantBlog : `https://${app.applicantBlog}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={blogIcon} alt="블로그" style={{ width: '24px', height: '24px' }} />
            </a>
          ) : (
            <span style={{ color: '#999', fontSize: '10px' }}>-</span>
          )}
        </td>
        
        {/* insta (24x24) */}
        <td style={{ 
          width: '34px', 
          minWidth: '34px',
          maxWidth: '34px',
          padding: '2px 5px', 
          textAlign: 'center' 
        }}>
          {app.처리상태 === '서평완료' && app.applicantInstagram ? (
            <a 
              href={app.applicantInstagram.startsWith('http') ? app.applicantInstagram : `https://${app.applicantInstagram}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={instagramIcon} alt="인스타그램" style={{ width: '24px', height: '24px' }} />
            </a>
          ) : (
            <span style={{ color: '#999', fontSize: '10px' }}>-</span>
          )}
        </td>
        
        {/* 관리자메모 (250px, 50자 입력 가능) */}
        <td style={{ 
          width: '250px', 
          minWidth: '250px',
          maxWidth: '250px',
          padding: '2px 5px' 
        }}>
          <input
            type="text"
            value={app.관리자메모 || ''}
            maxLength={50}
            onChange={(e) => {
              const newMemo = e.target.value
              const updatedApplications = reviewApplications.map(a =>
                a.서평ID === app.서평ID
                  ? { ...a, 관리자메모: newMemo }
                  : a
              )
              onApplicationsUpdate(updatedApplications)
            }}
            onBlur={(e) => {
              if (e.target.value !== app.관리자메모) {
                handleMemoUpdate(app.서평ID, e.target.value)
              }
            }}
            placeholder="메모 입력..."
            style={{
              width: '100%',
              padding: '2px 4px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '10px'
            }}
          />
        </td>
      </tr>
    )
  }

  return (
    <div className="content-section" style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 상단 고정 영역 */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>💬 서평 관리</h2>
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

        {/* 필터 컨트롤 */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px',
            padding: '4px 6px',
            background: '#f8f9fa',
            borderRadius: '4px',
            fontSize: '0.85rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ margin: 0, fontSize: '12px', fontWeight: 600 }}>서평완료:</label>
            <input
              type="checkbox"
              checked={showCompletedOnly}
              onChange={(e) => setShowCompletedOnly(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
          </div>
          <div className="book-filter-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ margin: 0, fontSize: '12px' }}>도서명:</label>
            <select 
              value={selectedBookFilter}
              onChange={(e) => setSelectedBookFilter(e.target.value)}
              style={{
                padding: '4px 8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px',
                background: 'white'
              }}
            >
              <option value="전체">전체</option>
              {uniqueBookTitles.map(title => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
          </div>
          <div className="monthly-limit-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ margin: 0, fontSize: '12px' }}>월별 서평신청 제한:</label>
            <select
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px',
                background: 'white'
              }}
            >
              <option value="1">1권</option>
              <option value="2">2권</option>
              <option value="3">3권</option>
              <option value="4">4권</option>
              <option value="5">5권</option>
            </select>
          </div>
        </div>
      </div>

      {/* 진행중 영역 및 버튼 영역을 묶는 컨테이너 */}
      <div style={{ 
        flex: showCompleted ? '0 0 auto' : '1', 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: 0, 
        overflow: 'hidden',
        transition: 'flex 0.3s ease'
      }}>
        {/* 진행중 영역 */}
        <div style={{ 
          flex: showCompleted ? '0 0 auto' : '1', 
          overflow: 'hidden', 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: 0 
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-start',
            gap: '8px', 
            marginBottom: '10px',
            padding: '8px',
            background: '#f0f0f0',
            borderRadius: '4px',
            flexShrink: 0
          }}>
            <span style={{ fontWeight: 600, fontSize: '12px', lineHeight: '16px', height: '16px' }}>
              &lt;진행중&gt;
            </span>
            <span style={{ fontSize: '0.85rem', color: '#666' }}>{filteredInProgress.length}건</span>
          </div>
            
            {showInProgress && !showCompleted && (
            <div style={{ 
              flex: '1',
              overflowY: 'auto',
              overflowX: 'auto',
              border: '1px solid #ddd',
              borderRadius: '4px',
              width: '100%',
              minHeight: 0
            }}>
            <table className="review-management-table" style={{ width: `${calculateTableWidth()}px`, minWidth: `${calculateTableWidth()}px`, tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0, fontSize: '10px', border: 'none' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                  <th style={{ width: '20px', minWidth: '20px', maxWidth: '20px', padding: '4px 5px', textAlign: 'center', fontSize: '0' }}>
                    <input
                      type="checkbox"
                      checked={selectedInProgress.size === filteredInProgress.length && filteredInProgress.length > 0}
                      onChange={() => handleSelectAllInProgress(filteredInProgress)}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ width: `${bytesToPixels(12)}px`, minWidth: `${bytesToPixels(12)}px`, maxWidth: `${bytesToPixels(12)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>ID</th>
                  <th style={{ width: `${bytesToPixels(12)}px`, minWidth: `${bytesToPixels(12)}px`, maxWidth: `${bytesToPixels(12)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>이름</th>
                  <th style={{ width: `${bytesToPixels(12)}px`, minWidth: `${bytesToPixels(12)}px`, maxWidth: `${bytesToPixels(12)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>닉네임</th>
                  <th style={{ width: `${bytesToPixels(16)}px`, minWidth: `${bytesToPixels(16)}px`, maxWidth: `${bytesToPixels(16)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>휴대폰</th>
                  <th style={{ width: `${bytesToPixels(22)}px`, minWidth: `${bytesToPixels(22)}px`, maxWidth: `${bytesToPixels(22)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>도서명</th>
                  <th style={{ width: `${bytesToPixels(10)}px`, minWidth: `${bytesToPixels(10)}px`, maxWidth: `${bytesToPixels(10)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>신청일</th>
                  <th style={{ width: `${bytesToPixels(10)}px`, minWidth: `${bytesToPixels(10)}px`, maxWidth: `${bytesToPixels(10)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>신청갯수</th>
                  <th style={{ width: `${bytesToPixels(18)}px`, minWidth: `${bytesToPixels(18)}px`, maxWidth: `${bytesToPixels(18)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>처리상태</th>
                  <th style={{ width: `${bytesToPixels(10)}px`, minWidth: `${bytesToPixels(10)}px`, maxWidth: `${bytesToPixels(10)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>정보출력</th>
                  <th style={{ width: `${bytesToPixels(10)}px`, minWidth: `${bytesToPixels(10)}px`, maxWidth: `${bytesToPixels(10)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>발송일</th>
                  <th style={{ width: `${bytesToPixels(10)}px`, minWidth: `${bytesToPixels(10)}px`, maxWidth: `${bytesToPixels(10)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>서평완료</th>
                  <th style={{ width: '34px', minWidth: '34px', maxWidth: '34px', padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>blog</th>
                  <th style={{ width: '34px', minWidth: '34px', maxWidth: '34px', padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>insta</th>
                  <th style={{ width: '250px', minWidth: '250px', maxWidth: '250px', padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>관리자메모</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={15} style={{ padding: '20px', textAlign: 'center' }}>로딩 중...</td>
                  </tr>
                ) : filteredInProgress.length === 0 ? (
                  <tr>
                    <td colSpan={15} style={{ padding: '20px', textAlign: 'center' }}>
                      진행중인 서평 신청이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredInProgress.map((app, index) => renderTableRow(app, index, filteredInProgress.length, 'inProgress'))
                )}
              </tbody>
            </table>
          </div>
          )}
        </div>

      {/* 선택된 항목들 일괄 다운로드 및 서평완료 이동 버튼 */}
      {selectedInProgress.size > 0 && !showCompleted && (
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          justifyContent: 'center', 
          marginTop: '10px', 
          marginBottom: '10px',
          flexShrink: 0
        }}>
          <button
            onClick={() => handleExcelDownloadInProgress()}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease'
            }}
          >
            <img src={excelIcon} alt="Excel" style={{ width: '20px', height: '20px' }} />
            일괄 다운로드 ({selectedInProgress.size}건)
          </button>
          {showInProgress && (
            <button
              onClick={handleMoveToCompleted}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 600,
                transition: 'all 0.3s ease'
              }}
            >
              서평완료 이동 ({selectedInProgress.size}건)
            </button>
          )}
          <button
            onClick={handleDeleteSelectedInProgress}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease'
            }}
          >
            <img src={trashIcon} alt="삭제" style={{ width: '20px', height: '20px' }} />
            삭제 ({selectedInProgress.size}건)
          </button>
        </div>
      )}
      </div>

      {/* 서평완료 영역 - 항상 하단에 고정 */}
      <div style={{ 
        flexShrink: 0,
        background: 'white', 
        paddingTop: '10px',
        flex: showCompleted ? '1' : '0 0 auto',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden',
        transition: 'flex 0.3s ease'
      }}>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-start',
            gap: '8px', 
            marginBottom: '10px',
            padding: '8px',
            background: '#f0f0f0',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
          onClick={() => {
            if (showCompleted) {
              // down arrow: 서평완료 닫고 진행중 열기
              setShowCompleted(false)
              setShowInProgress(true)
            } else {
              // up arrow: 진행중 닫고 서평완료 열기
              setShowCompleted(true)
              setShowInProgress(false)
            }
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '12px', lineHeight: '16px', height: '16px' }}>
            &lt;서평완료&gt;
          </span>
          <span style={{ fontSize: '0.85rem', color: '#666' }}>{filteredCompleted.length}건</span>
          <span style={{ fontSize: '0.9rem', marginLeft: '4px', userSelect: 'none' }}>
            {showCompleted ? '▼' : '▲'}
          </span>
        </div>
          
          {showCompleted && (
          <div style={{ 
            flex: '1',
            overflowY: 'auto',
            overflowX: 'auto',
            border: '1px solid #ddd',
            borderRadius: '4px',
            width: '100%',
            marginTop: '10px',
            minHeight: 0
          }}>
            <table className="review-management-table" style={{ width: `${calculateTableWidth()}px`, minWidth: `${calculateTableWidth()}px`, tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0, fontSize: '10px', border: 'none' }}>
              <thead>
                <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                  <th style={{ width: '20px', minWidth: '20px', maxWidth: '20px', padding: '4px 5px', textAlign: 'center', fontSize: '0' }}>
                    <input
                      type="checkbox"
                      checked={selectedCompleted.size === filteredCompleted.length && filteredCompleted.length > 0}
                      onChange={() => handleSelectAllCompleted(filteredCompleted)}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ width: `${bytesToPixels(12)}px`, minWidth: `${bytesToPixels(12)}px`, maxWidth: `${bytesToPixels(12)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>ID</th>
                  <th style={{ width: `${bytesToPixels(12)}px`, minWidth: `${bytesToPixels(12)}px`, maxWidth: `${bytesToPixels(12)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>이름</th>
                  <th style={{ width: `${bytesToPixels(12)}px`, minWidth: `${bytesToPixels(12)}px`, maxWidth: `${bytesToPixels(12)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>닉네임</th>
                  <th style={{ width: `${bytesToPixels(16)}px`, minWidth: `${bytesToPixels(16)}px`, maxWidth: `${bytesToPixels(16)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>휴대폰</th>
                  <th style={{ width: `${bytesToPixels(22)}px`, minWidth: `${bytesToPixels(22)}px`, maxWidth: `${bytesToPixels(22)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>도서명</th>
                  <th style={{ width: `${bytesToPixels(10)}px`, minWidth: `${bytesToPixels(10)}px`, maxWidth: `${bytesToPixels(10)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>신청일</th>
                  <th style={{ width: `${bytesToPixels(10)}px`, minWidth: `${bytesToPixels(10)}px`, maxWidth: `${bytesToPixels(10)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>신청갯수</th>
                  <th style={{ width: `${bytesToPixels(18)}px`, minWidth: `${bytesToPixels(18)}px`, maxWidth: `${bytesToPixels(18)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>처리상태</th>
                  <th style={{ width: `${bytesToPixels(10)}px`, minWidth: `${bytesToPixels(10)}px`, maxWidth: `${bytesToPixels(10)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>정보출력</th>
                  <th style={{ width: `${bytesToPixels(10)}px`, minWidth: `${bytesToPixels(10)}px`, maxWidth: `${bytesToPixels(10)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>발송일</th>
                  <th style={{ width: `${bytesToPixels(10)}px`, minWidth: `${bytesToPixels(10)}px`, maxWidth: `${bytesToPixels(10)}px`, padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>서평완료</th>
                  <th style={{ width: '34px', minWidth: '34px', maxWidth: '34px', padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>blog</th>
                  <th style={{ width: '34px', minWidth: '34px', maxWidth: '34px', padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>insta</th>
                  <th style={{ width: '250px', minWidth: '250px', maxWidth: '250px', padding: '4px 5px', fontSize: '10px', textAlign: 'center' }}>관리자메모</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompleted.length === 0 ? (
                  <tr>
                    <td colSpan={15} style={{ padding: '20px', textAlign: 'center' }}>완료된 서평 신청이 없습니다.</td>
                  </tr>
                ) : (
                  filteredCompleted.map((app, index) => renderTableRow(app, index, filteredCompleted.length, 'completed'))
                )}
              </tbody>
            </table>
          </div>
          )}

          {/* 서평완료 섹션의 선택된 항목들 버튼 */}
          {selectedCompleted.size > 0 && showCompleted && (
            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              justifyContent: 'center', 
              marginTop: '10px', 
              marginBottom: '10px',
              flexShrink: 0
            }}>
              <button
                onClick={() => {
                  if (selectedCompleted.size === 0) {
                    alert('다운로드할 항목을 선택해주세요.')
                    return
                  }
                  const appsToDownload = reviewApplications.filter(app => selectedCompleted.has(app.서평ID))
                  // CSV 다운로드 로직
                  const headers = ['회원ID', '이름', '닉네임', '휴대폰', '도서명', '신청일', '서평신청갯수', '처리상태', '발송일', '완료일', '블로그링크', '인스타링크', '관리자메모']
                  const rows = appsToDownload.map(app => [
                    app.applicantId || app.회원ID,
                    app.applicantName,
                    app.applicantNickname || '-',
                    app.applicantPhone,
                    app.bookTitle,
                    formatDate(app.신청일),
                    app.서평갯수 || 0,
                    app.처리상태,
                    formatDate(app.발송일),
                    formatDate(app.완료일),
                    app.applicantBlog || '-',
                    app.applicantInstagram || '-',
                    app.관리자메모 || ''
                  ])
                  const csvRows = rows.map(row => 
                    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
                  )
                  const csvContent = '\uFEFF' + headers.join(',') + '\n' + csvRows.join('\n')
                  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                  const link = document.createElement('a')
                  const url = URL.createObjectURL(blob)
                  link.setAttribute('href', url)
                  link.setAttribute('download', `서평신청_${appsToDownload.length}건_${new Date().toISOString().split('T')[0]}.csv`)
                  link.style.visibility = 'hidden'
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                  URL.revokeObjectURL(url)
                  alert(`${appsToDownload.length}건의 서평 신청 정보가 다운로드되었습니다.`)
                }}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease'
                }}
              >
                <img src={excelIcon} alt="Excel" style={{ width: '20px', height: '20px' }} />
                일괄 다운로드 ({selectedCompleted.size}건)
              </button>
              <button
                onClick={handleMoveToInProgress}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  transition: 'all 0.3s ease'
                }}
              >
                진행중으로 이동 ({selectedCompleted.size}건)
              </button>
              <button
                onClick={handleDeleteSelectedCompleted}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.3s ease'
                }}
              >
                <img src={trashIcon} alt="삭제" style={{ width: '20px', height: '20px' }} />
                삭제 ({selectedCompleted.size}건)
              </button>
            </div>
          )}
      </div>
    </div>
  )
}

export default ReviewManagementSection
