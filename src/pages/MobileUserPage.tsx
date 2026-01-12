import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, updateProfile, User } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where, QueryDocumentSnapshot, QuerySnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import MobileHeader from '../components/MobileHeader';
import './UserPage.css';

interface UserProfile {
  id?: string;
  name?: string;
  nickname?: string;
  email?: string;
  phone?: string;
  address?: string;
  blog?: string;
  instagram?: string;
  level?: string;
  createdAt?: any;
}

type ReviewStatus = '서평신청' | '도서발송' | '서평대기' | '서평완료';

interface UserReviewApplication {
  id: string;
  bookTitle: string;
  bookAuthor: string;
  status: ReviewStatus;
  requestedAt: Date | null;
  shippedAt: Date | null;
  reviewDueAt: Date | null;
  completedAt: Date | null;
  memo?: string;
  applicantName?: string;
  applicantPhone?: string;
  applicantAddress?: string;
}

interface ReviewStats {
  total: number;
  waiting: number;
  shipping: number;
  pending: number;
  completed: number;
}

const statusOrder: ReviewStatus[] = ['서평신청', '도서발송', '서평대기', '서평완료'];

const initialStats: ReviewStats = {
  total: 0,
  waiting: 0,
  shipping: 0,
  pending: 0,
  completed: 0,
};

const MobileUserPage: React.FC = () => {
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState<User | null>(auth.currentUser);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<UserProfile>({});
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'reviews'>('profile');
  const [reviewApplications, setReviewApplications] = useState<UserReviewApplication[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>(initialStats);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [isEditable, setIsEditable] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      if (!currentUser) {
        setAuthUser(null);
        setProfile(null);
        setFormData({});
        setLoading(false);
        navigate('/login', { replace: true });
        return;
      }

      setAuthUser(currentUser);
      setLoading(true);

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data() as UserProfile;
          setProfile({
            ...data,
            email: data.email || currentUser.email || undefined,
          });
          setFormData({
            ...data,
            email: data.email || currentUser.email || undefined,
          });
        } else {
          setProfile({
            email: currentUser.email || undefined,
            name: currentUser.displayName || undefined,
          });
          setFormData({
            email: currentUser.email || undefined,
            name: currentUser.displayName || undefined,
          });
        }
      } catch (error) {
        console.error('사용자 정보 로딩 오류:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [navigate]);

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setIsDirty(true);
    setStatusMessage('');
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!authUser) return;

    setIsSaving(true);
    setStatusMessage('');

    try {
      const userRef = doc(db, 'users', authUser.uid);
      await updateDoc(userRef, {
        name: formData.name || '',
        nickname: formData.nickname || '',
        phone: formData.phone || '',
        address: formData.address || '',
        blog: formData.blog || '',
        instagram: formData.instagram || '',
      });

      if (authUser) {
        const nextDisplayName = formData.nickname || formData.name || authUser.displayName || '';
        try {
          await updateProfile(authUser, { displayName: nextDisplayName });
        } catch (error) {
          console.error('displayName 업데이트 실패:', error);
        }
      }

      setProfile((prev) => ({
        ...prev,
        ...formData,
      }));
      setIsDirty(false);
      setStatusMessage('변경 사항이 저장되었습니다.');
    } catch (error) {
      console.error('사용자 정보 업데이트 실패:', error);
      setStatusMessage('저장에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  const transformApplication = (docSnap: QueryDocumentSnapshot): UserReviewApplication => {
    const data = docSnap.data() as any;
    const convertDate = (value: any): Date | null => {
      if (!value) return null;
      if (value.toDate) return value.toDate();
      if (value.seconds) return new Date(value.seconds * 1000);
      return null;
    };

    return {
      id: docSnap.id,
      bookTitle: data.bookTitle || '',
      bookAuthor: data.bookAuthor || '',
      status: (data.처리상태 || '서평신청') as ReviewStatus,
      requestedAt: convertDate(data.신청일),
      shippedAt: convertDate(data.발송일),
      reviewDueAt: convertDate(data.서평마감일),
      completedAt: convertDate(data.완료일),
      memo: data.관리자메모 || '',
      applicantName: data.applicantName || '',
      applicantPhone: data.applicantPhone || '',
      applicantAddress: data.applicantAddress || '',
    };
  };

  useEffect(() => {
    if (!authUser) return;

    const aggregated = new Map<string, UserReviewApplication>();
    setReviewLoading(true);

    const applicationsRef = collection(db, 'reviewApplications');
    const unsubscribes: Array<() => void> = [];

    const processSnapshot = (snapshot: QuerySnapshot) => {
      let updated = false;

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'removed') {
          if (aggregated.delete(change.doc.id)) {
            updated = true;
          }
        } else {
          aggregated.set(change.doc.id, transformApplication(change.doc));
          updated = true;
        }
      });

      if (!updated && aggregated.size === 0) {
        snapshot.docs.forEach((doc) => {
          aggregated.set(doc.id, transformApplication(doc));
        });
        if (snapshot.size > 0) {
          updated = true;
        }
      }

      if (updated) {
        const apps = Array.from(aggregated.values()).sort((a, b) => {
          const aTime = a.requestedAt ? a.requestedAt.getTime() : 0;
          const bTime = b.requestedAt ? b.requestedAt.getTime() : 0;
          return bTime - aTime;
        });
        setReviewApplications(apps);
        setReviewStats(calculateReviewStats(apps));
      }

      if (aggregated.size === 0) {
        setReviewApplications([]);
        setReviewStats(initialStats);
      }

      setReviewLoading(false);
    };

    const uidQuery = query(applicationsRef, where('회원ID', '==', authUser.uid));
    unsubscribes.push(onSnapshot(uidQuery, processSnapshot, (error) => {
      console.error('서평 신청 내역 로딩 오류:', error);
      setReviewLoading(false);
    }));

    const profileId = profile?.id;
    if (profileId) {
      const customIdQuery = query(applicationsRef, where('applicantId', '==', profileId));
      unsubscribes.push(onSnapshot(customIdQuery, processSnapshot, (error) => {
        console.error('서평 신청 내역 로딩 오류(applicantId):', error);
      }));
    }

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [authUser, profile?.id]);

  const calculateReviewStats = (apps: UserReviewApplication[]): ReviewStats => {
    const total = apps.length;
    const waiting = apps.filter((app) => app.status === '서평대기').length;
    const shipping = apps.filter((app) => app.status === '도서발송').length;
    const pending = apps.filter((app) => app.status === '서평신청').length;
    const completed = apps.filter((app) => app.status === '서평완료').length;

    return {
      total,
      waiting,
      shipping,
      pending,
      completed,
    };
  };

  const handleWriteReview = (application: UserReviewApplication) => {
    navigate(`/review/write/${application.id}`);
  };

  const formatDate = (value: Date | null) => {
    if (!value) return '-';
    return value.toLocaleDateString('ko-KR');
  };

  const displayedName = formData.nickname || formData.name || profile?.nickname || profile?.name || authUser?.displayName || greetingFallback();

  function greetingFallback() {
    if (authUser?.email) {
      return authUser.email.split('@')[0];
    }
    return '사용자';
  }

  const renderMobileProfileSection = () => (
    <div className="mobile-user-profile">
      <div className="mobile-user-info-section">
        <div className="info-display-item">
          <span className="info-display-label">이름:</span>
          <input
            type="text"
            className={`info-display-input ${isEditable && isDirty && formData.name !== profile?.name ? 'modified' : ''}`}
            value={formData.name || '-'}
            onChange={(e) => handleInputChange('name', e.target.value)}
            disabled={!isEditable}
          />
        </div>
        <div className="info-display-item">
          <span className="info-display-label">닉네임:</span>
          <input
            type="text"
            className={`info-display-input ${isEditable && isDirty && formData.nickname !== profile?.nickname ? 'modified' : ''}`}
            value={formData.nickname || '-'}
            onChange={(e) => handleInputChange('nickname', e.target.value)}
            disabled={!isEditable}
          />
        </div>
        <div className="info-display-item">
          <span className="info-display-label">이메일:</span>
          <input
            type="email"
            className="info-display-input"
            value={formData.email || '-'}
            disabled
          />
        </div>
        <div className="info-display-item">
          <span className="info-display-label">휴대폰:</span>
          <input
            type="tel"
            className={`info-display-input ${isEditable && isDirty && formData.phone !== profile?.phone ? 'modified' : ''}`}
            value={formData.phone || '-'}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            disabled={!isEditable}
          />
        </div>
        <div className="info-display-item">
          <span className="info-display-label">주소:</span>
          <input
            type="text"
            className={`info-display-input ${isEditable && isDirty && formData.address !== profile?.address ? 'modified' : ''}`}
            value={formData.address || '-'}
            onChange={(e) => handleInputChange('address', e.target.value)}
            disabled={!isEditable}
          />
        </div>
        <div className="info-display-item">
          <span className="info-display-label">블로그:</span>
          <input
            type="url"
            className={`info-display-input ${isEditable && isDirty && formData.blog !== profile?.blog ? 'modified' : ''}`}
            value={formData.blog || '-'}
            onChange={(e) => handleInputChange('blog', e.target.value)}
            disabled={!isEditable}
          />
        </div>
        <div className="info-display-item">
          <span className="info-display-label">인스타그램:</span>
          <input
            type="text"
            className={`info-display-input ${isEditable && isDirty && formData.instagram !== profile?.instagram ? 'modified' : ''}`}
            value={formData.instagram || '-'}
            onChange={(e) => handleInputChange('instagram', e.target.value)}
            disabled={!isEditable}
          />
        </div>
      </div>
      <div className="mobile-user-edit-section">
        <span
          className="mobile-edit-toggle-text"
          onClick={() => setIsEditable(!isEditable)}
        >
          {isEditable ? '수정 취소' : '수정'}
        </span>
        {isEditable && (
          <span
            className={`mobile-save-text ${!isDirty || isSaving ? 'disabled' : ''}`}
            onClick={async (e) => {
              if (!isDirty || isSaving) return;
              e.preventDefault();
              await handleSave(e as any);
              setIsEditable(false);
            }}
          >
            {isSaving ? '저장 중...' : '수정 완료'}
          </span>
        )}
      </div>
    </div>
  );

  const renderMobileReviewSection = () => (
    <div className="mobile-user-review-container">
      <div className="mobile-review-stats">
        <div className="mobile-review-stat-card">
          <span className="mobile-review-stat-value">{reviewStats.total}</span>
          <span className="mobile-review-stat-label">총 신청수</span>
        </div>
        <div className="mobile-review-stat-card">
          <span className="mobile-review-stat-value">{reviewStats.waiting}</span>
          <span className="mobile-review-stat-label">서평대기</span>
        </div>
        <div className="mobile-review-stat-card">
          <span className="mobile-review-stat-value">{reviewStats.shipping}</span>
          <span className="mobile-review-stat-label">발송중</span>
        </div>
        <div className="mobile-review-stat-card">
          <span className="mobile-review-stat-value">{reviewStats.pending}</span>
          <span className="mobile-review-stat-label">진행중</span>
        </div>
        <div className="mobile-review-stat-card">
          <span className="mobile-review-stat-value">{reviewStats.completed}</span>
          <span className="mobile-review-stat-label">완료된 서평</span>
        </div>
      </div>

      {reviewLoading ? (
        <div className="mobile-review-loading">서평 신청 내역을 불러오는 중입니다...</div>
      ) : reviewApplications.length === 0 ? (
        <div className="mobile-review-empty">아직 신청된 서평이 없습니다. 원하는 도서를 선택하여 서평을 신청해보세요.</div>
      ) : (
        <div className="mobile-review-list">
          {reviewApplications.map((application) => {
            return (
              <div className="mobile-review-card" key={application.id}>
                <div className="mobile-review-card-header">
                  <h3>{application.bookTitle}</h3>
                  <p className="mobile-review-card-subtitle">{application.bookAuthor}</p>
                  <span className={`mobile-review-status-badge status-${application.status}`}>{application.status}</span>
                </div>
                <div className="mobile-review-card-meta">
                  <span>신청일: {formatDate(application.requestedAt)}</span>
                  <span>발송일: {formatDate(application.shippedAt)}</span>
                  <span>완료일: {formatDate(application.completedAt)}</span>
                </div>
                {application.status === '서평대기' && (
                  <button
                    type="button"
                    className="mobile-review-write-btn"
                    onClick={() => handleWriteReview(application)}
                  >
                    서평 작성하기
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="user-page publishing-website mobile-viewport">
        <div className="user-card loading">
          <div className="spinner" />
          <p>사용자 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return null;
  }

  return (
    <div className="user-page publishing-website mobile-viewport">
      <div className="user-dashboard">
        <main className="user-main">
          {activeSection === 'profile' && (
            <div className="mobile-user-header-wrapper">
              <MobileHeader 
                title={displayedName}
                backTo="/"
                titleFontSize={20}
              />
              <span className="mobile-header-subtitle">회원정보</span>
            </div>
          )}

          {activeSection === 'profile' ? renderMobileProfileSection() : renderMobileReviewSection()}
        </main>
      </div>
      {activeSection === 'reviews' && (
        <>
          <div className="mobile-user-header-wrapper">
            <MobileHeader 
              title="서평 관리"
              backTo="/"
              titleFontSize={16}
            />
          </div>
          <button
            className="mobile-review-management-btn"
            onClick={() => setActiveSection('profile')}
            style={{ background: '#6b7280' }}
          >
            <span style={{ fontSize: '12px' }}>회원정보</span>
          </button>
        </>
      )}
    </div>
  );
};

export default MobileUserPage;

