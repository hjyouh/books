import React from 'react';
import { useNavigate } from 'react-router-dom';
import leftWhiteIcon from '../assets/icons/left-white.png';
import './MobileHeader.css';

interface MobileHeaderProps {
  title: string;
  onBack?: () => void;
  backTo?: string;
  titleFontSize?: number; // 제목 폰트 크기 (기본값: 20px)
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ title, onBack, backTo = '/', titleFontSize = 20 }) => {
  const navigate = useNavigate();

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
      <h1 className="mobile-header-title" style={{ fontSize: `${titleFontSize}px` }}>{title}</h1>
    </header>
  );
};

export default MobileHeader;

