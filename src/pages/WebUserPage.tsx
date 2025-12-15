import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, updateProfile, User } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where, QueryDocumentSnapshot, QuerySnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
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

const WebUserPage: React.FC = () => {
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
    const message = `"${application.bookTitle}" 서평 작성이 필요합니다. 준비 중인 서평 작성 페이지로 이동해주세요.`;
    alert(message);
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

  const renderWebProfileSection = () => (
    <form className="user-form" onSubmit={handleSave}>
      <div className="user-form__group">
        <label htmlFor="name">이름</label>
        <input
          id="name"
          type="text"
          value={formData.name || ''}
          onChange={(event) => handleInputChange('name', event.target.value)}
          placeholder="이름을 입력하세요"
        />
      </div>

      <div className="user-form__group">
        <label htmlFor="nickname">닉네임</label>
        <input
          id="nickname"
          type="text"
          value={formData.nickname || ''}
          onChange={(event) => handleInputChange('nickname', event.target.value)}
          placeholder="닉네임을 입력하세요"
        />
      </div>

      <div className="user-form__group">
        <label htmlFor="email">이메일</label>
        <input id="email" type="email" value={formData.email || ''} disabled />
      </div>

      <div className="user-form__group">
        <label htmlFor="phone">휴대폰</label>
        <input
          id="phone"
          type="text"
          value={formData.phone || ''}
          onChange={(event) => handleInputChange('phone', event.target.value)}
          placeholder="010-0000-0000"
        />
      </div>

      <div className="user-form__group">
        <label htmlFor="address">주소</label>
        <input
          id="address"
          type="text"
          value={formData.address || ''}
          onChange={(event) => handleInputChange('address', event.target.value)}
          placeholder="주소를 입력하세요"
        />
      </div>

      <div className="user-form__group">
        <label htmlFor="blog">블로그</label>
        <input
          id="blog"
          type="url"
          value={formData.blog || ''}
          onChange={(event) => handleInputChange('blog', event.target.value)}
          placeholder="https:// 예) https://blog.example.com"
        />
      </div>

      <div className="user-form__group">
        <label htmlFor="instagram">인스타그램</label>
        <input
          id="instagram"
          type="text"
          value={formData.instagram || ''}
          onChange={(event) => handleInputChange('instagram', event.target.value)}
          placeholder="@ 아이디 형식으로 입력하세요"
        />
      </div>

      {statusMessage && (
        <p className="user-form__status">{statusMessage}</p>
      )}

      <div className="user-form__actions">
        <button type="submit" disabled={!isDirty || isSaving}>
          {isSaving ? '저장 중...' : '수정 완료'}
        </button>
      </div>
    </form>
  );

  const renderWebReviewSection = () => (
    <div className="user-review-container">
      <div className="user-review-stats">
        <div className="review-stat-card">
          <span className="review-stat-value">{reviewStats.total}</span>
          <span className="review-stat-label">총 신청수</span>
        </div>
        <div className="review-stat-card">
          <span className="review-stat-value">{reviewStats.waiting}</span>
          <span className="review-stat-label">서평대기</span>
        </div>
        <div className="review-stat-card">
          <span className="review-stat-value">{reviewStats.shipping}</span>
          <span className="review-stat-label">발송중</span>
        </div>
        <div className="review-stat-card">
          <span className="review-stat-value">{reviewStats.pending}</span>
          <span className="review-stat-label">진행중</span>
        </div>
        <div className="review-stat-card">
          <span className="review-stat-value">{reviewStats.completed}</span>
          <span className="review-stat-label">완료된 서평</span>
        </div>
      </div>

      {reviewLoading ? (
        <div className="review-loading">서평 신청 내역을 불러오는 중입니다...</div>
      ) : reviewApplications.length === 0 ? (
        <div className="review-empty">아직 신청된 서평이 없습니다. 원하는 도서를 선택하여 서평을 신청해보세요.</div>
      ) : (
        <div className="review-list">
          {reviewApplications.map((application) => {
            const currentIndex = statusOrder.indexOf(application.status);
            return (
              <div className="review-card" key={application.id}>
                <div className="review-card-header">
                  <div>
                    <h3>{application.bookTitle}</h3>
                    <p className="review-card-subtitle">{application.bookAuthor}</p>
                  </div>
                  <div className="review-card-header-meta">
                    <span className={`review-status-badge status-${application.status}`}>{application.status}</span>
                    <div className="review-applicant-info">
                      <span>신청자 : {application.applicantName || '-'}</span>
                      <span>연락처 : {application.applicantPhone || '-'}</span>
                      <span>배송지 : {application.applicantAddress || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="review-card-meta-inline">
                  <span>신청일 : {formatDate(application.requestedAt)}</span>
                  <span>발송일 : {formatDate(application.shippedAt)}</span>
                  <span>완료일 : {formatDate(application.completedAt)}</span>
                </div>

                <div className="review-timeline">
                  {statusOrder.map((status, index) => {
                    const isComplete = index <= currentIndex;
                    const isCurrent = index === currentIndex;
                    const label = ['서평 신청', '도서 발송', '서평 대기', '서평 완료'][index];

                    return (
                      <div
                        key={status}
                        className={`timeline-step ${isComplete ? 'complete' : 'upcoming'} ${isCurrent ? 'current' : ''}`}
                      >
                        <div className="timeline-circle">
                          <span>{index + 1}</span>
                        </div>
                        <span className="timeline-label">{label}</span>
                      </div>
                    );
                  })}
                </div>

                {application.status === '서평대기' && (
                  <div className="review-card-footer">
                    <button
                      type="button"
                      className="review-write-btn"
                      onClick={() => handleWriteReview(application)}
                    >
                      <span className="review-write-icon">✏️</span>
                      서평 작성하기
                    </button>
                  </div>
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
      <div className="user-page">
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
    <div className="user-page">
      <div className="user-dashboard">
        <aside className="user-sidebar">
          <div className="user-sidebar__section">
            <p className="user-sidebar__title">회원 관리</p>
            <button
              className={`user-sidebar__item ${activeSection === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveSection('profile')}
            >
              회원 정보
            </button>
            <button
              className={`user-sidebar__item ${activeSection === 'reviews' ? 'active' : ''}`}
              onClick={() => setActiveSection('reviews')}
            >
              서평 관리
            </button>
          </div>
        </aside>

        <main className="user-main">
          <div className="user-main-top">
            <span className="user-main-section-label">{activeSection === 'profile' ? '회원 정보' : '서평 관리'}</span>
            <Link to="/" className="home-link" aria-label="홈으로 이동">
              <img src="/home-icon.svg" alt="홈" />
            </Link>
          </div>

          <div className="user-main__header">
            <div className="user-main__headline">
              <h1>{displayedName} 회원정보</h1>
              <span>{profile?.email || authUser?.email || ''}</span>
            </div>
          </div>

          {activeSection === 'profile' ? renderWebProfileSection() : renderWebReviewSection()}
        </main>
      </div>
    </div>
  );
};

export default WebUserPage;

