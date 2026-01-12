import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, where, QueryDocumentSnapshot, QuerySnapshot } from 'firebase/firestore';
import { createPortal } from 'react-dom';
import { auth, db } from '../firebase';
import MobileHeader from '../components/MobileHeader';
import closeIcon from '../assets/icons/Close.png';
import { calculateMonthlyStats } from '../utils/reviewStats';
import './UserPage.css';
import './ReviewConfirmModal.css';

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
  bookId?: string;
  status: ReviewStatus;
  requestedAt: Date | null;
  shippedAt: Date | null;
  reviewDueAt: Date | null;
  completedAt: Date | null;
  memo?: string;
  applicantName?: string;
  applicantPhone?: string;
  applicantAddress?: string;
  bookImageUrl?: string;
  bookDescription?: string;
  bookGenre?: string;
  bookPublisher?: string;
  bookPublishedDate?: string;
}

interface ReviewStats {
  total: number;
  waiting: number;
  shipping: number;
  pending: number;
  completed: number;
}

const initialStats: ReviewStats = {
  total: 0,
  waiting: 0,
  shipping: 0,
  pending: 0,
  completed: 0,
};

const MobileReviewManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [authUser, setAuthUser] = useState<User | null>(auth.currentUser);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewApplications, setReviewApplications] = useState<UserReviewApplication[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats>(initialStats);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<UserReviewApplication | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Chrome 확장 프로그램 에러 무시
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      if (args[0]?.toString().includes('message channel closed')) {
        return; // 이 에러는 무시
      }
      originalError.apply(console, args);
    };

    return () => {
      console.error = originalError;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;

      if (!currentUser) {
        setAuthUser(null);
        setProfile(null);
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
        } else {
          setProfile({
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
      bookId: data.도서ID || '',
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
    const unsubscribe1 = onSnapshot(
      uidQuery, 
      processSnapshot, 
      (error) => {
        console.error('서평 신청 내역 로딩 오류:', error);
        setReviewLoading(false);
      }
    );
    unsubscribes.push(unsubscribe1);

    const profileId = profile?.id;
    if (profileId) {
      const customIdQuery = query(applicationsRef, where('applicantId', '==', profileId));
      const unsubscribe2 = onSnapshot(
        customIdQuery, 
        processSnapshot, 
        (error) => {
          console.error('서평 신청 내역 로딩 오류(applicantId):', error);
        }
      );
      unsubscribes.push(unsubscribe2);
    }

    return () => {
      unsubscribes.forEach((unsub) => {
        try {
          unsub();
        } catch (error) {
          // 리스너 정리 중 에러 무시 (이미 정리된 경우)
          console.warn('리스너 정리 중 경고:', error);
        }
      });
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

  // 월별 서평 신청 수 계산
  const monthlyStats = calculateMonthlyStats(reviewApplications);

  const [bookData, setBookData] = useState<any>(null);
  const [bookLoading, setBookLoading] = useState(false);

  const handleWriteReview = async (application: UserReviewApplication) => {
    console.log('서평 클릭:', application);
    setSelectedApplication(application);
    setShowReviewModal(true);
    setBookData(null);
    
    // 도서 정보 가져오기
    if (application.bookId) {
      setBookLoading(true);
      try {
        const bookDoc = await getDoc(doc(db, 'books', application.bookId));
        if (bookDoc.exists()) {
          setBookData({ id: bookDoc.id, ...bookDoc.data() });
        } else {
          console.log('도서 정보를 찾을 수 없습니다:', application.bookId);
        }
      } catch (error) {
        console.error('도서 정보 로딩 오류:', error);
      } finally {
        setBookLoading(false);
      }
    } else {
      console.log('bookId가 없습니다. 기본 정보만 표시합니다.');
      setBookLoading(false);
    }
  };

  const handleReviewConfirm = () => {
    if (selectedApplication) {
      // 서평 작성 페이지로 이동
      navigate(`/review/write/${selectedApplication.id}`);
      setShowReviewModal(false);
      setSelectedApplication(null);
      setBookData(null);
    }
  };

  const handleReviewCancel = () => {
    setShowReviewModal(false);
    setSelectedApplication(null);
    setBookData(null);
  };

  const formatDate = (value: Date | null) => {
    if (!value) return '-';
    return value.toLocaleDateString('ko-KR');
  };


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
          <div className="mobile-user-header-wrapper">
            <MobileHeader 
              title="서평 관리"
              backTo="/"
              titleFontSize={20}
            />
          </div>

          <div className="mobile-user-review-container">
            <div className="mobile-review-monthly-stats">
              <span className="mobile-review-monthly-text">
                월별 서평 신청 수: 3중 <span className={monthlyStats.totalCount >= 3 ? 'monthly-count-over' : 'monthly-count-under'}>{monthlyStats.totalCount}</span>개 신청
              </span>
            </div>
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
              <div className="mobile-review-list-container" ref={listContainerRef}>
                <div className="mobile-review-list">
                  {reviewApplications.map((application) => {
                    return (
                      <div className="mobile-review-card" key={application.id}>
                        <div className="mobile-review-card-header">
                          <div className="mobile-review-card-title-row">
                            <h3>{application.bookTitle}</h3>
                          </div>
                          <div className="mobile-review-card-author-row">
                            <p className="mobile-review-card-subtitle">{application.bookAuthor}</p>
                            <span className={`mobile-review-apply-text ${application.status === '서평신청' ? 'active' : ''}`}>서평신청</span>
                          </div>
                        </div>
                        <div className="mobile-review-card-meta">
                          <div className="mobile-review-card-meta-content">
                            <div className="mobile-review-card-meta-dates">
                              <span>신청일: {formatDate(application.requestedAt)}</span>
                              <span>발송일: {formatDate(application.shippedAt)}</span>
                              <span>완료일: {formatDate(application.completedAt)}</span>
                            </div>
                            {(application.status === '도서발송' || application.status === '서평대기' || application.status === '서평완료') && (
                              <span 
                                className={`mobile-review-icon-text ${application.status === '서평대기' ? 'active' : ''}`}
                                onClick={() => handleWriteReview(application)}
                                style={{ cursor: 'pointer' }}
                              >
                                서평
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* 서평 작성 확인 모달 */}
      {showReviewModal && selectedApplication && typeof document !== 'undefined' && createPortal(
        <div className="mobile-review-confirm-overlay" onClick={handleReviewCancel}>
          <div className="mobile-review-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="mobile-review-confirm-close" 
              onClick={handleReviewCancel}
              aria-label="닫기"
            >
              <img src={closeIcon} alt="닫기" style={{ width: '16px', height: '16px' }} />
            </button>

            {bookLoading ? (
              <div className="mobile-review-confirm-loading">도서 정보를 불러오는 중...</div>
            ) : (
              <>
                {/* 도서 정보 */}
                {(bookData || selectedApplication) && (
                  <div className="mobile-review-confirm-book-info">
                    {bookData?.imageUrl && (
                      <div className="mobile-review-confirm-book-cover">
                        <img src={bookData.imageUrl} alt={bookData.title || selectedApplication.bookTitle} />
                      </div>
                    )}
                    <div className="mobile-review-confirm-book-details">
                      <h3 className="mobile-review-confirm-book-title">
                        {bookData?.title || selectedApplication.bookTitle}
                      </h3>
                      <p className="mobile-review-confirm-book-author">
                        {bookData?.author || selectedApplication.bookAuthor}
                      </p>
                      {bookData?.genre && (
                        <p className="mobile-review-confirm-book-meta">장르: {bookData.genre}</p>
                      )}
                      {bookData?.publisher && (
                        <p className="mobile-review-confirm-book-meta">출판사: {bookData.publisher}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 확인 메시지 */}
                <div className="mobile-review-confirm-message">
                  <p>서평을 하시겠습니까?</p>
                </div>

                {/* Yes/No */}
                <div className="mobile-review-confirm-actions">
                  <span 
                    className="mobile-review-confirm-yes"
                    onClick={handleReviewConfirm}
                  >
                    예
                  </span>
                  <span 
                    className="mobile-review-confirm-no"
                    onClick={handleReviewCancel}
                  >
                    아니오
                  </span>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MobileReviewManagementPage;

