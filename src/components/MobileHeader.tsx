import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import leftWhiteIcon from '../assets/icons/left-white.png';
import './MobileHeader.css';

interface MobileHeaderProps {
  title: string;
  onBack?: () => void;
  backTo?: string;
  titleFontSize?: number; // 제목 폰트 크기 (기본값: 16px, 최대: 18px)
}

// 문자열을 바이트 단위로 계산하는 함수
const getByteLength = (str: string): number => {
  let byteLength = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i);
    byteLength += char.charCodeAt(0) > 127 ? 2 : 1;
  }
  return byteLength;
};

// 제목을 최대 15자(30 byte)로 제한하는 함수
const truncateTitle = (title: string, maxLength: number = 15, maxBytes: number = 30): string => {
  const titleBytes = getByteLength(title);
  
  // 제목이 제한을 넘지 않으면 그대로 반환
  if (title.length <= maxLength && titleBytes <= maxBytes) {
    return title;
  }
  
  let result = '';
  let byteCount = 0;
  
  for (let i = 0; i < title.length; i++) {
    const char = title.charAt(i);
    const charBytes = char.charCodeAt(0) > 127 ? 2 : 1;
    
    // 다음 문자를 추가하면 제한을 넘는지 확인
    if (result.length >= maxLength || byteCount + charBytes > maxBytes) {
      break;
    }
    
    result += char;
    byteCount += charBytes;
  }
  
  // 잘린 경우에만 "..." 추가
  return result + (result.length < title.length ? '...' : '');
};

const MobileHeader: React.FC<MobileHeaderProps> = ({ title, onBack, backTo = '/', titleFontSize = 16 }) => {
  const navigate = useNavigate();

  // 제목을 15자(30 byte)로 제한
  const truncatedTitle = useMemo(() => truncateTitle(title), [title]);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(backTo);
    }
  };

  return (
    <header className="mobile-header">
      <button 
        className="mobile-header-back-button" 
        onClick={handleBack}
        aria-label="뒤로가기"
      >
        <img src={leftWhiteIcon} alt="뒤로가기" style={{ width: '16px', height: '16px' }} />
      </button>
      <h1 
        className="mobile-header-title" 
        title={title} // 전체 제목을 툴팁으로 표시
      >
        {truncatedTitle}
      </h1>
    </header>
  );
};

export default MobileHeader;

