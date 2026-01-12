import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { db, auth } from '../firebase';
import './UserPage.css';

const WebReviewWritePage: React.FC = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [application, setApplication] = useState<any>(null);
  const [reviewContent, setReviewContent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!isMounted) return;
      
      if (!currentUser) {
        navigate('/login', { replace: true });
        return;
      }
      setAuthUser(currentUser);
    }, (error) => {
      console.error('인증 상태 확인 오류:', error);
      if (isMounted) {
        setError('인증 상태를 확인하는 중 오류가 발생했습니다.');
        setLoading(false);
      }
    });
    
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchApplication = async () => {
      if (!applicationId || !authUser) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const appDocRef = doc(db, 'reviewApplications', applicationId);
        const appDocSnap = await getDoc(appDocRef);

        if (!isMounted) return;

        if (!appDocSnap.exists()) {
          setError('서평 신청 내역을 찾을 수 없습니다.');
          setLoading(false);
          return;
        }

        const data = appDocSnap.data();
        
        // 권한 확인: 본인의 서평인지 확인
        if (data.회원ID !== authUser.uid && data.applicantId !== authUser.uid) {
          setError('권한이 없습니다.');
          setLoading(false);
          return;
        }

        // 서평대기 상태인지 확인
        if (data.처리상태 !== '서평대기') {
          setError('서평 작성 가능한 상태가 아닙니다.');
          setLoading(false);
          return;
        }

        if (isMounted) {
          setApplication({
            id: appDocSnap.id,
            ...data
          });
          setLoading(false);
        }
      } catch (error) {
        console.error('서평 신청 내역 로딩 오류:', error);
        if (isMounted) {
          setError('서평 신청 내역을 불러오는 중 오류가 발생했습니다.');
          setLoading(false);
        }
      }
    };

    if (authUser) {
      fetchApplication();
    } else {
      setLoading(false);
    }
    
    return () => {
      isMounted = false;
    };
  }, [applicationId, authUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reviewContent.trim()) {
      setError('서평 내용을 입력해주세요.');
      return;
    }

    if (!applicationId || !application) return;

    setSubmitting(true);
    setError('');

    try {
      const appDocRef = doc(db, 'reviewApplications', applicationId);
      await updateDoc(appDocRef, {
        서평내용: reviewContent.trim(),
        처리상태: '서평완료',
        완료일: Timestamp.now()
      });

      alert('서평이 성공적으로 작성되었습니다!');
      navigate('/reviews');
    } catch (error) {
      console.error('서평 작성 오류:', error);
      setError('서평 작성 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="user-page">
        <div className="user-card loading">
          <div className="spinner" />
          <p>서평 신청 내역을 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="user-page">
        <div className="user-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#ef4444', marginBottom: '20px' }}>{error}</p>
          <button
            onClick={() => navigate('/reviews')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            서평 관리로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-page" style={{ padding: '24px' }}>
      <div className="user-dashboard" style={{ 
        maxWidth: '100%', 
        width: '100%', 
        display: 'block',
        gridTemplateColumns: 'none'
      }}>
        <main className="user-main" style={{ width: '100%', padding: '48px 56px', margin: 0 }}>
          <div className="user-main-top">
            <span className="user-main-section-label">서평 작성</span>
            <button
              onClick={() => navigate('/reviews')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600'
              }}
            >
              돌아가기
            </button>
          </div>

          {application && (
            <div style={{ marginTop: '32px', width: '100%' }}>
              <div style={{
                background: '#f9fafb',
                padding: '24px',
                borderRadius: '12px',
                marginBottom: '24px',
                border: '1px solid #e5e7eb'
              }}>
                <h2 style={{ margin: '0 0 16px 0', fontSize: '20px', color: '#111827' }}>
                  {application.bookTitle}
                </h2>
                <p style={{ margin: '0 0 8px 0', color: '#6b7280', fontSize: '14px' }}>
                  저자: {application.bookAuthor}
                </p>
                <p style={{ margin: '0', color: '#6b7280', fontSize: '14px' }}>
                  신청일: {application.신청일?.toDate?.()?.toLocaleDateString('ko-KR') || '-'}
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <div style={{ marginBottom: '24px', width: '100%' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    서평 내용 *
                  </label>
                  <textarea
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    placeholder="서평 내용을 입력해주세요..."
                    style={{
                      width: '100%',
                      minHeight: 'calc(100vh - 400px)',
                      padding: '12px',
                      border: error ? '2px solid #ef4444' : '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                    required
                  />
                  {error && (
                    <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {error}
                    </p>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    type="button"
                    onClick={() => navigate('/reviews')}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#ffffff',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                    disabled={submitting}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#3b82f6',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      opacity: submitting ? 0.6 : 1
                    }}
                    disabled={submitting}
                  >
                    {submitting ? '작성 중...' : '서평 작성 완료'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default WebReviewWritePage;

