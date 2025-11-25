import { useState, useEffect, FormEvent } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, firebaseConfig } from '../firebase';
import './SimpleLoginModal.css';

interface SimpleLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignupClick: () => void;
  onLoginSuccess?: () => void;
}

interface SaveCredentialsModalProps {
  isOpen: boolean;
  onSave: () => void;
  onDontSave: () => void;
}

const SaveCredentialsModal: React.FC<SaveCredentialsModalProps> = ({ isOpen, onSave, onDontSave }) => {
  if (!isOpen) return null;

  return (
    <div className="save-credentials-overlay" onClick={onDontSave}>
      <div className="save-credentials-modal" onClick={(e) => e.stopPropagation()}>
        <h3>로그인 정보 저장</h3>
        <p>다음에 자동으로 로그인하시겠습니까?</p>
        <div className="save-credentials-buttons">
          <button onClick={onSave} className="save-btn">저장</button>
          <button onClick={onDontSave} className="dont-save-btn">저장 안 함</button>
        </div>
      </div>
    </div>
  );
};

const SimpleLoginModal: React.FC<SimpleLoginModalProps> = ({ isOpen, onClose, onSignupClick, onLoginSuccess }) => {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setId('');
      setPassword('');
      setError('');
      setIsSubmitting(false);
      setShowSaveModal(false);
    }
  }, [isOpen]);

  // 저장된 로그인 정보 불러오기
  useEffect(() => {
    if (isOpen) {
      const savedId = localStorage.getItem('savedUserId');
      const savedPassword = localStorage.getItem('savedPassword');
      if (savedId && savedPassword) {
        setId(savedId);
        setPassword(savedPassword);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const fetchEmailViaRest = async (trimmed: string) => {
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents:runQuery?key=${firebaseConfig.apiKey}`;
    const body = {
      structuredQuery: {
        from: [{ collectionId: 'users' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'id' },
            op: 'EQUAL',
            value: { stringValue: trimmed }
          }
        },
        limit: 1
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error('등록되지 않은 ID입니다.');
    }

    const results = await response.json();
    if (Array.isArray(results)) {
      for (const entry of results) {
        const email = entry?.document?.fields?.email?.stringValue;
        if (email) {
          return email as string;
        }
      }
    }

    throw new Error('등록되지 않은 ID입니다.');
  };

  const resolveEmailByIdentifier = async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.includes('@')) {
      return trimmed;
    }
    return await fetchEmailViaRest(trimmed);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');

    if (!id.trim()) {
      setError('아이디를 입력해주세요.');
      return;
    }

    if (!password.trim()) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      const emailToUse = await resolveEmailByIdentifier(id);
      await signInWithEmailAndPassword(auth, emailToUse, password);
      
      // 로그인 성공 후 처리
      const hasSavedCredentials = localStorage.getItem('savedUserId') !== null;
      if (!hasSavedCredentials) {
        // 첫 로그인인 경우 저장 여부 묻기
        setShowSaveModal(true);
      } else {
        // 이미 저장된 경우 바로 성공 처리
        if (onLoginSuccess) {
          onLoginSuccess();
        }
        onClose();
      }
    } catch (error: any) {
      console.error('로그인 실패:', error);
      let message = '로그인에 실패했습니다.';
      if (error?.code === 'auth/wrong-password') {
        message = '비밀번호가 올바르지 않습니다.';
      } else if (error?.code === 'auth/user-not-found') {
        message = '등록되지 않은 계정입니다.';
      } else if (error?.code === 'auth/too-many-requests') {
        message = '잠시 후 다시 시도해주세요.';
      }
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveCredentials = () => {
    localStorage.setItem('savedUserId', id);
    localStorage.setItem('savedPassword', password);
    setShowSaveModal(false);
    if (onLoginSuccess) {
      onLoginSuccess();
    }
    onClose();
  };

  const handleDontSaveCredentials = () => {
    setShowSaveModal(false);
    if (onLoginSuccess) {
      onLoginSuccess();
    }
    onClose();
  };

  return (
    <>
      <div className="simple-login-overlay" onClick={onClose}>
        <div className="simple-login-modal" onClick={(e) => e.stopPropagation()}>
          <div className="simple-login-header">
            <h2 className="simple-login-title">로그인</h2>
            <button 
              className="simple-login-close"
              onClick={onClose}
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleSubmit} className="simple-login-form">
            <div className="simple-login-input-group">
              <label htmlFor="simple-login-id">아이디</label>
              <input
                id="simple-login-id"
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder=""
                autoComplete="username"
              />
            </div>

            <div className="simple-login-input-group">
              <label htmlFor="simple-login-password">비밀번호</label>
              <input
                id="simple-login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                autoComplete="current-password"
              />
            </div>

            {error && <div className="simple-login-error">{error}</div>}

            <button type="submit" className="simple-login-button" disabled={isSubmitting}>
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>

            <div className="simple-login-footer">
              <button type="button" className="simple-login-link" onClick={() => {}}>
                아이디 찾기
              </button>
              <span className="simple-login-separator">|</span>
              <button type="button" className="simple-login-link" onClick={() => {}}>
                비밀번호 찾기
              </button>
              <span className="simple-login-separator">|</span>
              <button type="button" className="simple-login-link" onClick={onSignupClick}>
                회원가입
              </button>
            </div>
          </form>
        </div>
      </div>

      <SaveCredentialsModal
        isOpen={showSaveModal}
        onSave={handleSaveCredentials}
        onDontSave={handleDontSaveCredentials}
      />
    </>
  );
};

export default SimpleLoginModal;

