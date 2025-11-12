import { useState, useEffect, CSSProperties, FormEvent } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, firebaseConfig } from '../firebase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignupRedirect: () => void;
  onLoginSuccess?: () => void;
}

interface LoginErrors {
  identifier?: string;
  password?: string;
  general?: string;
}

const modalBackdropStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
  padding: '20px'
};

const modalContainerStyle: CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  width: '100%',
  maxWidth: '420px',
  boxShadow: '0 24px 55px rgba(15, 23, 42, 0.25)',
  overflow: 'hidden'
};

const headerStyle: CSSProperties = {
  padding: '24px 28px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px'
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: '22px',
  fontWeight: 700,
  color: '#1f2937'
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  fontSize: '14px',
  color: '#6b7280'
};

const formStyle: CSSProperties = {
  padding: '12px 28px 28px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px'
};

const inputGroupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
};

const labelStyle: CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151'
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  border: '1px solid #d1d5db',
  fontSize: '14px',
  backgroundColor: '#f9fafb',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
};

const errorTextStyle: CSSProperties = {
  fontSize: '12px',
  color: '#ef4444'
};

const loginButtonStyle: CSSProperties = {
  width: '100%',
  padding: '14px',
  borderRadius: '12px',
  border: 'none',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  background: 'linear-gradient(135deg, #667eea, #764ba2)',
  color: '#ffffff',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
};

const footerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '8px',
  fontSize: '13px',
  color: '#6b7280'
};

const linkButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: '#667eea',
  fontWeight: 600,
  cursor: 'pointer'
};

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSignupRedirect, onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIdentifier('');
      setPassword('');
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const closeWithReset = () => {
    if (isSubmitting) return;
    setErrors({});
    onClose();
  };

  const validate = () => {
    const nextErrors: LoginErrors = {};
    if (!identifier.trim()) {
      nextErrors.identifier = '이메일 또는 ID를 입력해주세요.';
    }
    if (!password.trim()) {
      nextErrors.password = '비밀번호를 입력해주세요.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

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
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (readError) {
        console.error('REST 오류 본문 읽기 실패:', readError);
      }
      throw new Error(`REST 요청 실패 (status: ${response.status}) ${errorText}`);
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
    setErrors({});

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const emailToUse = await resolveEmailByIdentifier(identifier);
      await signInWithEmailAndPassword(auth, emailToUse, password);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
      closeWithReset();
    } catch (error: any) {
      console.error('로그인 실패:', error);
      let message = '로그인에 실패했습니다. 정보를 확인해주세요.';
      const rawMessage = typeof error?.message === 'string' ? error.message : '';
      const errorDetails = error?.code ? ` (code: ${error.code})` : '';
      if (error?.code === 'auth/wrong-password') {
        message = '비밀번호가 올바르지 않습니다.';
      } else if (error?.code === 'auth/user-not-found') {
        message = '등록되지 않은 계정입니다.';
      } else if (error?.code === 'auth/too-many-requests') {
        message = '잠시 후 다시 시도해주세요. 로그인 시도가 너무 많습니다.';
      } else if (typeof error?.message === 'string' && error.message.includes('INTERNAL ASSERTION FAILED')) {
        message = '서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.';
      } else if (typeof error?.message === 'string' && error.message.toLowerCase().includes('network')) {
        message = '네트워크 연결을 확인한 뒤 다시 시도해주세요.';
      } else if (error?.message) {
        message = `${message} 상세: ${error.message}`;
      }
      const combinedMessage = rawMessage
        ? `${message}${errorDetails ? ` ${errorDetails}` : ''}\n상세 오류: ${rawMessage}`
        : `${message}${errorDetails}`;
      setErrors((prev) => ({ ...prev, general: combinedMessage }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={modalBackdropStyle} onClick={closeWithReset}>
      <div style={modalContainerStyle} onClick={(event) => event.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>로그인</h2>
          <p style={subtitleStyle}>이메일 또는 ID와 비밀번호를 입력해주세요.</p>
        </div>

        <form style={formStyle} onSubmit={handleSubmit}>
          <div style={inputGroupStyle}>
            <label style={labelStyle} htmlFor="login-identifier">이메일 또는 ID</label>
            <input
              id="login-identifier"
              type="text"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="이메일을 입력하세요"
              style={{
                ...inputStyle,
                borderColor: errors.identifier ? '#ef4444' : '#d1d5db'
              }}
            />
            {errors.identifier && <span style={errorTextStyle}>{errors.identifier}</span>}
          </div>

          <div style={inputGroupStyle}>
            <label style={labelStyle} htmlFor="login-password">패스워드</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="패스워드를 입력하세요"
              style={{
                ...inputStyle,
                borderColor: errors.password ? '#ef4444' : '#d1d5db'
              }}
            />
            {errors.password && <span style={errorTextStyle}>{errors.password}</span>}
          </div>

          {errors.general && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '12px',
              padding: '10px 12px',
              color: '#b91c1c',
              fontSize: '12px',
              whiteSpace: 'pre-wrap'
            }}>
              {errors.general}
            </div>
          )}

          <button
            type="submit"
            style={loginButtonStyle}
            disabled={isSubmitting}
            onMouseDown={(event) => event.currentTarget.style.transform = 'scale(0.99)'}
            onMouseUp={(event) => event.currentTarget.style.transform = 'scale(1)'}
          >
            {isSubmitting ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <div style={{ padding: '0 28px 24px' }}>
          <div style={footerStyle}>
            <span>아직 계정이 없으신가요?</span>
            <button type="button" style={linkButtonStyle} onClick={onSignupRedirect}>
              회원가입
            </button>
          </div>
          <button
            type="button"
            onClick={closeWithReset}
            style={{
              marginTop: '16px',
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #d1d5db',
              backgroundColor: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              cursor: 'pointer'
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
