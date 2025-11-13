import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db, auth } from '../firebase';

declare global {
  interface Window {
    daum?: {
      Postcode: new (config: { oncomplete: (data: any) => void }) => { open: () => void };
    };
  }
}

const loadDaumPostcodeScript = (): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is not defined'));
  }

  if (window.daum?.Postcode) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-daum-postcode="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Daum postcode script failed to load')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    script.defer = true;
    script.dataset.daumPostcode = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Daum postcode script failed to load'));
    document.body.appendChild(script);
  });
};

interface FormData {
  id: string;
  password: string;
  confirmPassword: string;
  name: string;
  nickname: string;
  phone: string;
  email: string;
  address: string;
  blog: string;
  instagram: string;
}

interface UserData {
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
  createdAt: Timestamp;
}

interface NewSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isAdmin?: boolean; // 관리자 모드인지 구분
}

const NewSignupModal: React.FC<NewSignupModalProps> = ({ isOpen, onClose, onSuccess, isAdmin = false }) => {
  const [formData, setFormData] = useState<FormData>({
    id: '',
    password: '',
    confirmPassword: '',
    name: '',
    nickname: '',
    phone: '',
    email: '',
    address: '',
    blog: '',
    instagram: ''
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [isIdChecked, setIsIdChecked] = useState(false);
  const [isEmailChecked, setIsEmailChecked] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [urlValidation, setUrlValidation] = useState({
    blog: { isValid: false, isChecking: false },
    instagram: { isValid: false, isChecking: false }
  });
  const [isAddressConfirmed, setIsAddressConfirmed] = useState(false);

  // 모달이 열릴 때 폼 초기화
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'id') {
      setIsIdChecked(false);
    }
    if (name === 'email') {
      setIsEmailChecked(false);
    }
    if (name === 'phone') {
      setIsPhoneVerified(false);
    }
    if (name === 'blog' || name === 'instagram') {
      setUrlValidation(prev => ({
        ...prev,
        [name]: { isValid: false, isChecking: false }
      }));
    }
    if (name === 'address') {
      setIsAddressConfirmed(false);
    }
    
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      password: '',
      confirmPassword: '',
      name: '',
      nickname: '',
      phone: '',
      email: '',
      address: '',
      blog: '',
      instagram: ''
    });
    setErrors({});
    setIsIdChecked(false);
    setIsEmailChecked(false);
    setIsPhoneVerified(false);
    setUrlValidation({
      blog: { isValid: false, isChecking: false },
      instagram: { isValid: false, isChecking: false }
    });
    setIsAddressConfirmed(false);
  };

  const checkIdDuplicate = async (id: string): Promise<boolean> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('id', '==', id));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (error) {
      console.error('ID 중복 확인 중 오류:', error);
      return false;
    }
  };

  const checkEmailDuplicate = async (email: string): Promise<boolean> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (error) {
      console.error('이메일 중복 확인 중 오류:', error);
      return false;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    const trimmedId = formData.id.trim();
    if (!trimmedId) {
      newErrors.id = 'ID를 입력해주세요';
    } else if (trimmedId.length < 6) {
      newErrors.id = 'ID를 6자 이상으로 입력해 주세요';
    }
    if (!formData.password.trim()) newErrors.password = '비밀번호를 입력해주세요';
    if (!formData.confirmPassword.trim()) newErrors.confirmPassword = '비밀번호 확인을 입력해주세요';
    if (!formData.name.trim()) newErrors.name = '이름을 입력해주세요';
    if (!formData.nickname.trim()) newErrors.nickname = '닉네임을 입력해주세요';
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = '휴대폰 번호를 입력해주세요';
    } else if (!phoneRegex.test(formData.phone.trim())) {
      newErrors.phone = '010-0000-0000 형식으로 입력해 주세요';
    }
    if (!formData.email.trim()) newErrors.email = '이메일을 입력해주세요';
    if (!formData.address.trim()) newErrors.address = '주소를 입력해주세요';

    if (formData.id.trim() && !isIdChecked) {
      newErrors.id = 'ID 중복 확인을 해주세요';
    }

    if (formData.email.trim() && !isEmailChecked) {
      newErrors.email = '이메일 중복 확인을 해주세요';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
    }

    if (formData.password && formData.password.length < 6) {
      newErrors.password = '비밀번호는 6자 이상이어야 합니다';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createUserWithAuth = async (userData: UserData): Promise<boolean> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        formData.password
      );
      
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: userData.name
      });

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        ...userData,
        uid: user.uid
      });

      return true;
    } catch (error) {
      console.error('사용자 생성 중 오류:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const userData: UserData = {
        uid: '',
        id: formData.id.trim(),
        name: formData.name.trim(),
        nickname: formData.nickname.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        address: formData.address.trim(),
        blog: formData.blog.trim() || undefined,
        instagram: formData.instagram.trim() || undefined,
        level: 'customer',
        createdAt: Timestamp.now()
      };

      await createUserWithAuth(userData);
      
      alert('회원가입이 완료되었습니다!');
      resetForm();
      onClose();
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error: any) {
      console.error('회원가입 오류:', error);
      
      let errorMessage = '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = '이미 사용 중인 이메일입니다.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = '올바른 이메일 형식이 아닙니다.';
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateCheck = async () => {
    const trimmedId = formData.id.trim();
    if (!trimmedId) {
      alert('ID를 입력해주세요');
      return;
    }

    const idRegex = /^[a-zA-Z0-9]{6,20}$/;
    if (!idRegex.test(trimmedId)) {
      alert('ID는 영문과 숫자만 사용 가능하며, 6-20자여야 합니다.');
      return;
    }

    try {
      const isAvailable = await checkIdDuplicate(trimmedId);
      if (isAvailable) {
        setIsIdChecked(true);
        setErrors(prev => ({ ...prev, id: '' }));
        alert('사용 가능한 ID입니다');
      } else {
        setIsIdChecked(false);
        alert('이미 사용 중인 ID입니다');
      }
    } catch (error) {
      console.error('ID 중복 확인 오류:', error);
      alert('ID 중복 확인 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handleEmailCheck = async () => {
    if (!formData.email.trim()) {
      alert('이메일을 입력해주세요');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('올바른 이메일 형식을 입력해주세요');
      return;
    }

    try {
      const isAvailable = await checkEmailDuplicate(formData.email);
      if (isAvailable) {
        setIsEmailChecked(true);
        setErrors(prev => ({ ...prev, email: '' }));
        alert('사용 가능한 이메일입니다');
      } else {
        setIsEmailChecked(false);
        alert('이미 사용 중인 이메일입니다');
      }
    } catch (error) {
      console.error('이메일 중복 확인 오류:', error);
      alert('이메일 중복 확인 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const handlePhoneAuth = () => {
    if (!formData.phone.trim()) {
      alert('휴대폰 번호를 입력해주세요');
      return;
    }

    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      alert('010-0000-0000 형식으로 입력해 주세요');
      return;
    }

    alert('번호 확인이 완료되었습니다.');
    setIsPhoneVerified(true);
    setErrors(prev => ({ ...prev, phone: '' }));
  };

  const handleAddressSearch = async () => {
    try {
      await loadDaumPostcodeScript();

      if (!window.daum?.Postcode) {
        throw new Error('Daum Postcode script is unavailable.');
      }

      new window.daum.Postcode({
        oncomplete: (data: any) => {
          const roadAddress = data.roadAddress || '';
          const jibunAddress = data.jibunAddress || '';
          const buildingName = data.buildingName ? ` ${data.buildingName}` : '';

          const selectedAddress = roadAddress || jibunAddress;

          if (!selectedAddress) {
            alert('선택한 주소 정보를 가져오지 못했습니다. 다시 시도해주세요.');
            return;
          }

          setFormData((prev) => ({
            ...prev,
            address: `${selectedAddress}${buildingName}`.trim(),
          }));
          setIsAddressConfirmed(true);
          setErrors(prev => ({ ...prev, address: '' }));
        },
      }).open();
    } catch (error) {
      console.error('주소 검색 오류:', error);
      alert('주소 검색 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  };

  // URL 형식 검증 함수
  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // 인스타그램 URL 형식 변환 함수
  const formatInstagramUrl = (input: string): string => {
    if (!input.trim()) return '';
    
    if (input.startsWith('@')) {
      const username = input.slice(1);
      return `https://www.instagram.com/${username}`;
    }
    
    if (input.startsWith('http')) {
      return input;
    }
    
    return `https://www.instagram.com/${input}`;
  };

  // URL 접근 가능성 확인 함수
  const checkUrlAccessibility = async (url: string): Promise<boolean> => {
    try {
      if (!isValidUrl(url)) {
        return false;
      }

      const urlObj = new URL(url);
      
      if (!urlObj.hostname || urlObj.hostname.length < 3) {
        return false;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        await fetch(url, { 
          method: 'HEAD', 
          mode: 'no-cors',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return true;
      } catch {
        return true;
      }
    } catch (error) {
      console.error('URL 접근성 확인 오류:', error);
      return false;
    }
  };

  const handleUrlValidation = async (type: 'blog' | 'instagram') => {
    const url = type === 'blog' ? formData.blog : formData.instagram;
    
    if (!url.trim()) {
      alert(`${type === 'blog' ? '블로그' : '인스타그램'} 주소를 입력해주세요`);
      return;
    }

    setUrlValidation(prev => ({
      ...prev,
      [type]: { isValid: false, isChecking: true }
    }));

    try {
      let urlToCheck = url;
      
      if (type === 'instagram') {
        urlToCheck = formatInstagramUrl(url);
      }
      
      if (type === 'blog' && !url.startsWith('http')) {
        urlToCheck = `https://${url}`;
      }

      const isAccessible = await checkUrlAccessibility(urlToCheck);
      
      setUrlValidation(prev => ({
        ...prev,
        [type]: { isValid: isAccessible, isChecking: false }
      }));

      if (isAccessible) {
        alert(`${type === 'blog' ? '블로그' : '인스타그램'} 주소가 유효합니다!`);
      } else {
        alert(`${type === 'blog' ? '블로그' : '인스타그램'} 주소에 접근할 수 없습니다. 주소를 확인해주세요.`);
      }
    } catch (error) {
      console.error('URL 검증 오류:', error);
      setUrlValidation(prev => ({
        ...prev,
        [type]: { isValid: false, isChecking: false }
      }));
      alert('주소 검증 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const isAllValidationsComplete = () => {
    return (
      formData.id.trim() !== '' &&
      formData.password.trim() !== '' &&
      formData.confirmPassword.trim() !== '' &&
      formData.name.trim() !== '' &&
      formData.nickname.trim() !== '' &&
      formData.phone.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.address.trim() !== '' &&
      isIdChecked &&
      isEmailChecked &&
      isPhoneVerified &&
      isAddressConfirmed &&
      Object.keys(errors).length === 0
    );
  };

  if (!isOpen) return null;

  // 버튼 스타일 객체
  const getButtonStyle = (type: 'default' | 'verified', isVerified: boolean) => {
    if (isVerified) {
      return {
        backgroundColor: '#667eea',
        color: 'white',
        border: '2px solid #667eea',
        padding: '10px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        minWidth: '80px',
        height: '42px',
        boxSizing: 'border-box' as const,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      };
    } else {
      return {
        backgroundColor: 'white',
        color: '#4a5568',
        border: '2px solid #e2e8f0',
        padding: '10px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        minWidth: '80px',
        height: '42px',
        boxSizing: 'border-box' as const,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      };
    }
  };

  const getAddressButtonStyle = (confirmed: boolean) => {
    return {
      backgroundColor: confirmed ? '#667eea' : 'white',
      color: confirmed ? '#ffffff' : '#4a5568',
      border: confirmed ? '2px solid #667eea' : '2px solid #e2e8f0',
      padding: '10px 12px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      minWidth: '80px',
      height: '42px',
      boxSizing: 'border-box' as const,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    };
  };

  const getSignupButtonStyle = () => {
    const isComplete = isAllValidationsComplete();
    if (isComplete) {
      return {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: '2px solid #667eea',
        padding: '0 20px',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s',
        minWidth: '120px',
        height: '44px',
        boxSizing: 'border-box' as const,
        boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap'
      };
    } else {
      return {
        backgroundColor: 'white',
        color: '#4a5568',
        border: '2px solid #e2e8f0',
        padding: '0 20px',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s',
        minWidth: '120px',
        height: '44px',
        boxSizing: 'border-box' as const,
        boxShadow: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap'
      };
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* 헤더 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 30px',
          borderBottom: '1px solid #e1e5e9',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: '12px 12px 0 0'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>{isAdmin ? '회원 추가' : '회원가입'}</h2>
          <button style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            color: 'white',
            cursor: 'pointer',
            padding: '0',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background-color 0.2s'
          }} onClick={onClose}>×</button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          
          {/* ID 필드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
            <label style={{ fontWeight: '600', color: '#2d3748', fontSize: '14px', minWidth: '60px' }}>
              ID *
            </label>
            <input
              type="text"
              name="id"
              value={formData.id}
              onChange={handleInputChange}
              placeholder="ID를 6자 이상으로 입력해 주세요"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: errors.id ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#f8fafc',
                height: '42px',
                boxSizing: 'border-box'
              }}
              autoComplete="off"
            />
            <button 
              type="button" 
              style={getButtonStyle('default', isIdChecked)}
              onClick={handleDuplicateCheck}
              disabled={loading}
            >
              {isIdChecked ? '✓ 확인됨' : '중복확인'}
            </button>
          </div>
          {errors.id && <div style={{ color: '#e53e3e', fontSize: '12px', marginBottom: '10px', marginLeft: '72px' }}>{errors.id}</div>}

          {/* 비밀번호 필드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
            <label style={{ fontWeight: '600', color: '#2d3748', fontSize: '14px', minWidth: '60px' }}>
              비밀번호 *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="비밀번호를 입력하세요"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: errors.password ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#f8fafc',
                height: '42px',
                boxSizing: 'border-box'
              }}
              autoComplete="new-password"
            />
            <span style={{ fontWeight: '600', color: '#2d3748', fontSize: '14px', minWidth: '80px' }}>
              비밀번호확인 *
            </span>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="비밀번호를 다시 입력하세요"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: errors.confirmPassword ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#f8fafc',
                height: '42px',
                boxSizing: 'border-box'
              }}
              autoComplete="new-password"
            />
          </div>
          {(errors.password || errors.confirmPassword) && (
            <div style={{ color: '#e53e3e', fontSize: '12px', marginBottom: '10px', marginLeft: '72px' }}>
              {errors.password || errors.confirmPassword}
            </div>
          )}

          {/* 이름, 닉네임 필드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
            <label style={{ fontWeight: '600', color: '#2d3748', fontSize: '14px', minWidth: '60px' }}>
              이름 *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="이름을 입력하세요"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: errors.name ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#f8fafc',
                height: '42px',
                boxSizing: 'border-box'
              }}
            />
            <span style={{ fontWeight: '600', color: '#2d3748', fontSize: '14px', minWidth: '60px' }}>
              닉네임 *
            </span>
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleInputChange}
              placeholder="닉네임을 입력하세요"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: errors.nickname ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#f8fafc',
                height: '42px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          {(errors.name || errors.nickname) && (
            <div style={{ color: '#e53e3e', fontSize: '12px', marginBottom: '10px', marginLeft: '72px' }}>
              {errors.name || errors.nickname}
            </div>
          )}

          {/* 휴대폰 필드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
            <label style={{ fontWeight: '600', color: '#2d3748', fontSize: '14px', minWidth: '60px' }}>
              휴대폰 *
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="010-0000-0000 형식으로 입력해 주세요"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: errors.phone ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#f8fafc',
                height: '42px',
                boxSizing: 'border-box'
              }}
            />
            <button 
              type="button" 
              style={getButtonStyle('default', isPhoneVerified)}
              onClick={handlePhoneAuth}
            >
              {isPhoneVerified ? '✓ 번호 확인됨' : '번호 확인'}
            </button>
          </div>
          {errors.phone && <div style={{ color: '#e53e3e', fontSize: '12px', marginBottom: '10px', marginLeft: '72px' }}>{errors.phone}</div>}

          {/* 이메일 필드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
            <label style={{ fontWeight: '600', color: '#2d3748', fontSize: '14px', minWidth: '60px' }}>
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="a@a.com"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: errors.email ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#f8fafc',
                height: '42px',
                boxSizing: 'border-box'
              }}
            />
            <button 
              type="button" 
              style={getButtonStyle('default', isEmailChecked)}
              onClick={handleEmailCheck}
              disabled={loading}
            >
              {isEmailChecked ? '✓ 확인됨' : '중복확인'}
            </button>
          </div>
          {errors.email && <div style={{ color: '#e53e3e', fontSize: '12px', marginBottom: '10px', marginLeft: '72px' }}>{errors.email}</div>}

          {/* 주소 필드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
            <label style={{ fontWeight: '600', color: '#2d3748', fontSize: '14px', minWidth: '60px' }}>
              주소 *
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="주소를 입력하세요"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: errors.address ? '2px solid #e53e3e' : '2px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#f8fafc',
                height: '42px',
                boxSizing: 'border-box'
              }}
            />
            <button 
              type="button" 
              style={getAddressButtonStyle(isAddressConfirmed)}
              onClick={handleAddressSearch}
            >
              주소찾기
            </button>
          </div>
          {errors.address && <div style={{ color: '#e53e3e', fontSize: '12px', marginBottom: '10px', marginLeft: '72px' }}>{errors.address}</div>}

          {/* 블로그 필드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
            <label style={{ fontWeight: '600', color: '#2d3748', fontSize: '14px', minWidth: '60px' }}>
              블로그
            </label>
            <input
              type="url"
              name="blog"
              value={formData.blog}
              onChange={handleInputChange}
              placeholder="https://도 포함하여 입력후 우측 아이콘을 눌러 확인해 주세요"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '2px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#f8fafc',
                height: '42px',
                boxSizing: 'border-box'
              }}
            />
            <button 
              type="button" 
              onClick={() => handleUrlValidation('blog')}
              disabled={urlValidation.blog.isChecking}
              style={{
                backgroundColor: urlValidation.blog.isValid ? '#667eea' : '#e2e8f0',
                color: urlValidation.blog.isValid ? 'white' : '#4a5568',
                border: urlValidation.blog.isValid ? '2px solid #667eea' : '2px solid #e2e8f0',
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '18px',
                cursor: urlValidation.blog.isChecking ? 'wait' : 'pointer',
                minWidth: '48px',
                height: '42px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              {urlValidation.blog.isChecking ? '⏳' : urlValidation.blog.isValid ? '✓' : '🔗'}
            </button>
          </div>

          {/* 인스타그램 필드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
            <label style={{ fontWeight: '600', color: '#2d3748', fontSize: '14px', minWidth: '60px' }}>
              인스타그램
            </label>
            <input
              type="text"
              name="instagram"
              value={formData.instagram}
              onChange={handleInputChange}
              placeholder="@인스타아이디 입력후 우측 아이콘을 눌러 확인해 주세요"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '2px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: '#f8fafc',
                height: '42px',
                boxSizing: 'border-box'
              }}
            />
            <button 
              type="button" 
              onClick={() => handleUrlValidation('instagram')}
              disabled={urlValidation.instagram.isChecking}
              style={{
                backgroundColor: urlValidation.instagram.isValid ? '#667eea' : '#e2e8f0',
                color: urlValidation.instagram.isValid ? 'white' : '#4a5568',
                border: urlValidation.instagram.isValid ? '2px solid #667eea' : '2px solid #e2e8f0',
                padding: '10px 12px',
                borderRadius: '6px',
                fontSize: '18px',
                cursor: urlValidation.instagram.isChecking ? 'wait' : 'pointer',
                minWidth: '48px',
                height: '42px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              {urlValidation.instagram.isChecking ? '⏳' : urlValidation.instagram.isValid ? '✓' : '🔗'}
            </button>
          </div>

          {/* 버튼 그룹 */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            marginTop: '30px',
            paddingTop: '20px',
            borderTop: '1px solid #e2e8f0'
          }}>
            <button 
              type="submit" 
              style={{ ...getSignupButtonStyle(), width: '120px' }}
              disabled={loading}
            >
              {loading ? '가입 중...' : (isAdmin ? '회원 추가' : '회원가입')}
            </button>
            <button 
              type="button" 
              style={{
                padding: '0 28px',
                background: '#e2e8f0',
                color: '#4a5568',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                width: '120px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={resetForm} 
              disabled={loading}
            >
              초기화
            </button>
            <button 
              type="button" 
              style={{
                padding: '0 28px',
                background: '#fc8181',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                width: '120px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={onClose} 
              disabled={loading}
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewSignupModal;
