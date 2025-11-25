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

interface MobileSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const MobileSignupModal: React.FC<MobileSignupModalProps> = ({ isOpen, onClose, onSuccess }) => {
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
    // 블로그 URL 자동 검증
    if (name === 'blog') {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        // URL 형식 검증 (http:// 또는 https://로 시작하거나, 도메인 형식이면 유효)
        const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        const isValid = urlPattern.test(trimmedValue) || trimmedValue.startsWith('http://') || trimmedValue.startsWith('https://');
        setUrlValidation(prev => ({
          ...prev,
          blog: { isValid, isChecking: false }
        }));
      } else {
        setUrlValidation(prev => ({
          ...prev,
          blog: { isValid: false, isChecking: false }
        }));
      }
    }
    
    // 인스타그램 URL 자동 검증
    if (name === 'instagram') {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        // @로 시작하거나 URL 형식이면 유효한 것으로 간주
        const isValid = trimmedValue.startsWith('@') || 
                       trimmedValue.startsWith('http://') || 
                       trimmedValue.startsWith('https://') ||
                       /^[a-zA-Z0-9._]+$/.test(trimmedValue);
        setUrlValidation(prev => ({
          ...prev,
          instagram: { isValid, isChecking: false }
        }));
      } else {
        setUrlValidation(prev => ({
          ...prev,
          instagram: { isValid: false, isChecking: false }
        }));
      }
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

  const checkPhoneDuplicate = async (phone: string): Promise<boolean> => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('phone', '==', phone));
      const querySnapshot = await getDocs(q);
      return querySnapshot.empty;
    } catch (error) {
      console.error('휴대폰 중복 확인 중 오류:', error);
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

  const handlePhoneAuth = async () => {
    if (!formData.phone.trim()) {
      alert('휴대폰 번호를 입력해주세요');
      return;
    }

    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      alert('010-0000-0000 형식으로 입력해 주세요');
      setIsPhoneVerified(false);
      setErrors(prev => ({ ...prev, phone: '올바른 형식으로 입력해 주세요' }));
      return;
    }

    // 중복 체크
    const isNotDuplicate = await checkPhoneDuplicate(formData.phone.trim());
    if (!isNotDuplicate) {
      alert('이미 등록된 휴대폰 번호입니다.');
      setIsPhoneVerified(false);
      setErrors(prev => ({ ...prev, phone: '이미 등록된 번호입니다' }));
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

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

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

  const getButtonStyle = (_type: 'default' | 'verified', isVerified: boolean) => {
    if (isVerified) {
      return {
        backgroundColor: '#3b82f6',
        color: 'white',
        border: '2px solid #3b82f6',
        padding: '6px 8px',
        borderRadius: '6px',
        fontSize: '10px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        minWidth: '60px',
        width: 'auto',
        height: '36px',
        boxSizing: 'border-box' as const,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap'
      };
    } else {
      return {
        backgroundColor: 'transparent',
        color: '#d1d5db',
        border: '2px solid rgba(209, 213, 219, 0.3)',
        padding: '6px 8px',
        borderRadius: '6px',
        fontSize: '10px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        minWidth: '60px',
        width: 'auto',
        height: '36px',
        boxSizing: 'border-box' as const,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap'
      };
    }
  };

  const getAddressButtonStyle = (confirmed: boolean) => {
    return {
      backgroundColor: confirmed ? '#3b82f6' : 'transparent',
      color: confirmed ? '#ffffff' : '#d1d5db',
      border: confirmed ? '2px solid #3b82f6' : '2px solid rgba(209, 213, 219, 0.3)',
      padding: '6px 8px',
      borderRadius: '6px',
      fontSize: '10px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s',
      minWidth: '60px',
      width: 'auto',
      height: '36px',
      whiteSpace: 'nowrap',
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
        backgroundColor: '#ff6b35',
        color: 'white',
        border: '2px solid #ff6b35',
        padding: '0 8px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s',
        height: '36px',
        boxSizing: 'border-box' as const,
        boxShadow: '0 8px 25px rgba(255, 107, 53, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        whiteSpace: 'nowrap'
      };
    } else {
      return {
        backgroundColor: 'transparent',
        color: '#d1d5db',
        border: '2px solid rgba(209, 213, 219, 0.3)',
        padding: '0 8px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s',
        height: '36px',
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
      alignItems: 'flex-start',
      zIndex: 2000,
      padding: '10px',
      paddingTop: '80px'
    }} onClick={onClose}>
      <div style={{
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '340px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* 헤더 */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(209, 213, 219, 0.3)',
          borderRadius: '12px 12px 0 0'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#d1d5db' }}>회원가입</h2>
            <span style={{ fontSize: '13px', color: '#ffd700', lineHeight: 1.2 }}>
              중복확인/확인/아이콘 버튼을 눌러 확인해 주세요
            </span>
          </div>
          <button style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            color: '#d1d5db',
            cursor: 'pointer',
            padding: '0',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background-color 0.2s'
          }} onClick={onClose}>×</button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} style={{ padding: '12px 15px' }}>
          
          {/* ID 필드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'nowrap' }}>
            <label style={{ fontWeight: '600', color: '#d1d5db', fontSize: '12px', minWidth: '70px', flexShrink: 0, textAlign: 'left' }}>
              회원ID *
            </label>
            <input
              type="text"
              name="id"
              value={formData.id}
              onChange={handleInputChange}
              placeholder="ID를 6자 이상으로 입력해 주세요"
              style={{
                width: '170px',
                padding: '8px 8px',
                border: errors.id ? '2px solid #e53e3e' : '2px solid rgba(209, 213, 219, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#d1d5db',
                height: '36px',
                boxSizing: 'border-box',
                flexShrink: 0
              }}
              autoComplete="off"
            />
            <button 
              type="button" 
              style={{
                ...getButtonStyle('default', isIdChecked),
              }}
              onClick={handleDuplicateCheck}
              disabled={loading}
            >
              {isIdChecked ? '✓ 확인됨' : '중복확인'}
            </button>
          </div>
          {errors.id && <div style={{ color: '#e53e3e', fontSize: '12px', marginBottom: '10px', marginLeft: '72px' }}>{errors.id}</div>}

          {/* 비밀번호 필드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'nowrap' }}>
            <label style={{ fontWeight: '600', color: '#d1d5db', fontSize: '12px', minWidth: '70px', flexShrink: 0, textAlign: 'left' }}>
              비밀번호 *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="비밀번호 입력"
              style={{
                width: '170px',
                padding: '8px 8px',
                border: errors.password ? '2px solid #e53e3e' : '2px solid rgba(209, 213, 219, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#d1d5db',
                height: '36px',
                boxSizing: 'border-box',
                flexShrink: 0
              }}
              autoComplete="new-password"
            />
          </div>
          
          {/* 비밀번호 확인 필드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'nowrap' }}>
            <label style={{ fontWeight: '600', color: '#d1d5db', fontSize: '12px', minWidth: '70px', flexShrink: 0, textAlign: 'left' }}>
              비밀번호확인 *
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="비밀번호를 다시 입력해 주세요"
              style={{
                width: '170px',
                padding: '8px 8px',
                border: errors.confirmPassword ? '2px solid #e53e3e' : '2px solid rgba(209, 213, 219, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#d1d5db',
                height: '36px',
                boxSizing: 'border-box',
                flexShrink: 0
              }}
              autoComplete="new-password"
            />
            <span style={{ 
              fontSize: '18px', 
              color: (formData.password && formData.password === formData.confirmPassword) ? '#3b82f6' : '#d1d5db', 
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '36px',
              width: '60px'
            }}>✓</span>
          </div>
          {(errors.password || errors.confirmPassword) && (
            <div style={{ color: '#e53e3e', fontSize: '10px', marginBottom: '6px', marginLeft: '56px' }}>
              {errors.password || errors.confirmPassword}
            </div>
          )}

          {/* 이름 필드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'nowrap' }}>
            <label style={{ fontWeight: '600', color: '#d1d5db', fontSize: '12px', minWidth: '70px', flexShrink: 0, textAlign: 'left' }}>
              이름 *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="이름 입력"
              style={{
                width: '170px',
                padding: '8px 8px',
                border: errors.name ? '2px solid #e53e3e' : '2px solid rgba(209, 213, 219, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#d1d5db',
                height: '36px',
                boxSizing: 'border-box',
                flexShrink: 0
              }}
            />
            <button 
              type="button" 
              style={{
                ...getButtonStyle('default', formData.name.trim() !== ''),
                fontSize: '10px',
                padding: '6px 8px',
                minWidth: '60px',
                width: 'auto',
                height: '36px',
                whiteSpace: 'nowrap'
              }}
              disabled
            >
              {formData.name.trim() ? '✓ 확인됨' : '중복확인'}
            </button>
          </div>
          {errors.name && (
            <div style={{ color: '#e53e3e', fontSize: '10px', marginBottom: '8px', marginLeft: '56px' }}>
              {errors.name}
            </div>
          )}
          
          {/* 닉네임 필드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'nowrap' }}>
            <label style={{ fontWeight: '600', color: '#d1d5db', fontSize: '12px', minWidth: '70px', flexShrink: 0, textAlign: 'left' }}>
              닉네임 *
            </label>
            <input
              type="text"
              name="nickname"
              value={formData.nickname}
              onChange={handleInputChange}
              placeholder="닉네임 입력"
              style={{
                width: '170px',
                padding: '8px 8px',
                border: errors.nickname ? '2px solid #e53e3e' : '2px solid rgba(209, 213, 219, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#d1d5db',
                height: '36px',
                boxSizing: 'border-box',
                flexShrink: 0
              }}
            />
            <button 
              type="button" 
              style={{
                ...getButtonStyle('default', formData.nickname.trim() !== ''),
                fontSize: '10px',
                padding: '6px 8px',
                minWidth: '60px',
                width: 'auto',
                height: '36px',
                whiteSpace: 'nowrap'
              }}
              disabled
            >
              {formData.nickname.trim() ? '✓ 확인됨' : '중복확인'}
            </button>
          </div>
          {errors.nickname && (
            <div style={{ color: '#e53e3e', fontSize: '10px', marginBottom: '8px', marginLeft: '56px' }}>
              {errors.nickname}
            </div>
          )}

          {/* 휴대폰 필드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'nowrap' }}>
            <label style={{ fontWeight: '600', color: '#d1d5db', fontSize: '12px', minWidth: '70px', flexShrink: 0, textAlign: 'left' }}>
              휴대폰 *
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="휴대폰 번호를 010-0000-0000 형식으로 입력"
              style={{
                width: '170px',
                padding: '8px 8px',
                border: errors.phone ? '2px solid #e53e3e' : '2px solid rgba(209, 213, 219, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#d1d5db',
                height: '36px',
                boxSizing: 'border-box',
                flexShrink: 0
              }}
            />
            <button 
              type="button" 
              style={{
                ...getButtonStyle('default', isPhoneVerified),
              }}
              onClick={handlePhoneAuth}
            >
              {isPhoneVerified ? '✓ 확인됨' : '번호확인'}
            </button>
          </div>
          {errors.phone && <div style={{ color: '#e53e3e', fontSize: '12px', marginBottom: '10px', marginLeft: '72px' }}>{errors.phone}</div>}

          {/* 이메일 필드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'nowrap' }}>
            <label style={{ fontWeight: '600', color: '#d1d5db', fontSize: '12px', minWidth: '70px', flexShrink: 0, textAlign: 'left' }}>
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Email: aaa@aaa.com"
              style={{
                width: '170px',
                padding: '8px 8px',
                border: errors.email ? '2px solid #e53e3e' : '2px solid rgba(209, 213, 219, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#d1d5db',
                height: '36px',
                boxSizing: 'border-box',
                flexShrink: 0
              }}
            />
            <button 
              type="button" 
              style={{
                ...getButtonStyle('default', isEmailChecked),
              }}
              onClick={handleEmailCheck}
              disabled={loading}
            >
              {isEmailChecked ? '✓ 확인됨' : '중복확인'}
            </button>
          </div>
          {errors.email && <div style={{ color: '#e53e3e', fontSize: '12px', marginBottom: '10px', marginLeft: '72px' }}>{errors.email}</div>}

          {/* 주소 필드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'nowrap' }}>
            <label style={{ fontWeight: '600', color: '#d1d5db', fontSize: '12px', minWidth: '70px', flexShrink: 0, textAlign: 'left' }}>
              주소 *
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="주소: 서명신청시 배송지: 필요"
              style={{
                width: '170px',
                padding: '8px 8px',
                border: errors.address ? '2px solid #e53e3e' : '2px solid rgba(209, 213, 219, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#d1d5db',
                height: '36px',
                boxSizing: 'border-box',
                flexShrink: 0
              }}
            />
            <button 
              type="button" 
              style={{
                ...getAddressButtonStyle(isAddressConfirmed),
              }}
              onClick={handleAddressSearch}
            >
              주소찾기
            </button>
          </div>
          {errors.address && <div style={{ color: '#e53e3e', fontSize: '12px', marginBottom: '10px', marginLeft: '72px' }}>{errors.address}</div>}

          {/* 블로그 필드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'nowrap' }}>
            <label style={{ fontWeight: '600', color: '#d1d5db', fontSize: '12px', minWidth: '70px', flexShrink: 0, textAlign: 'left' }}>
              블로그
            </label>
            <input
              type="url"
              name="blog"
              value={formData.blog}
              onChange={handleInputChange}
              placeholder="블로그 https://포함 입력 후 우측 아이콘 눌러 확인"
              style={{
                width: '170px',
                padding: '8px 8px',
                border: '2px solid rgba(209, 213, 219, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#d1d5db',
                height: '36px',
                boxSizing: 'border-box',
                flexShrink: 0
              }}
            />
            <button 
              type="button" 
              onClick={() => handleUrlValidation('blog')}
              disabled={urlValidation.blog.isChecking}
              style={{
                backgroundColor: urlValidation.blog.isValid ? '#3b82f6' : 'transparent',
                color: urlValidation.blog.isValid ? 'white' : '#d1d5db',
                border: urlValidation.blog.isValid ? '2px solid #3b82f6' : '2px solid rgba(209, 213, 219, 0.3)',
                padding: '8px',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: urlValidation.blog.isChecking ? 'wait' : 'pointer',
                minWidth: '60px',
                width: '60px',
                height: '36px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              {urlValidation.blog.isChecking ? '⏳' : urlValidation.blog.isValid ? '✓' : '→'}
            </button>
          </div>

          {/* 인스타그램 필드 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', flexWrap: 'nowrap' }}>
            <label style={{ fontWeight: '600', color: '#d1d5db', fontSize: '12px', minWidth: '70px', flexShrink: 0, textAlign: 'left' }}>
              인스타그램
            </label>
            <input
              type="text"
              name="instagram"
              value={formData.instagram}
              onChange={handleInputChange}
              placeholder="인스타그램: @인스타그램 ID 입력후 아이콘 확인"
              style={{
                width: '170px',
                padding: '8px 8px',
                border: '2px solid rgba(209, 213, 219, 0.3)',
                borderRadius: '6px',
                fontSize: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#d1d5db',
                height: '36px',
                boxSizing: 'border-box',
                flexShrink: 0
              }}
            />
            <button 
              type="button" 
              onClick={() => handleUrlValidation('instagram')}
              disabled={urlValidation.instagram.isChecking}
              style={{
                backgroundColor: urlValidation.instagram.isValid ? '#3b82f6' : 'transparent',
                color: urlValidation.instagram.isValid ? 'white' : '#d1d5db',
                border: urlValidation.instagram.isValid ? '2px solid #3b82f6' : '2px solid rgba(209, 213, 219, 0.3)',
                padding: '8px',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: urlValidation.instagram.isChecking ? 'wait' : 'pointer',
                minWidth: '60px',
                width: '60px',
                height: '36px',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              {urlValidation.instagram.isChecking ? '⏳' : urlValidation.instagram.isValid ? '✓' : '→'}
            </button>
          </div>

          {/* 버튼 그룹 */}
          <div style={{
            display: 'flex',
            gap: '6px',
            justifyContent: 'center',
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(209, 213, 219, 0.3)',
            flexWrap: 'nowrap'
          }}>
            <button 
              type="button" 
              style={{
                width: '80px',
                padding: '0 8px',
                background: 'transparent',
                color: '#d1d5db',
                border: '2px solid rgba(209, 213, 219, 0.3)',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              onClick={resetForm} 
              disabled={loading}
            >
              초기화
            </button>
            <button 
              type="button" 
              style={{
                width: '80px',
                padding: '0 8px',
                background: 'transparent',
                color: '#d1d5db',
                border: '2px solid rgba(209, 213, 219, 0.3)',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
              onClick={onClose} 
              disabled={loading}
            >
              취소
            </button>
            <button 
              type="submit" 
              style={{ 
                ...getSignupButtonStyle(), 
                width: '80px',
                flexShrink: 0
              }}
              disabled={loading}
            >
              {loading ? '가입 중...' : '회원 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MobileSignupModal;

