type ReviewStatus = '서평신청' | '도서발송' | '서평대기' | '서평완료';

interface UserReviewApplication {
  id: string;
  status: ReviewStatus;
  requestedAt: Date | null;
}

export interface MonthlyStats {
  monthlyCount: number;
  totalCount: number;
  canApply: boolean;
}

const MAX_REVIEWS = 3;

/**
 * 월별 서평 신청 수 계산
 * @param apps 전체 서평 신청 목록
 * @returns 월별 통계 정보
 */
export const calculateMonthlyStats = (apps: UserReviewApplication[]): MonthlyStats => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // 현재 월의 신청 수
  const monthlyApps = apps.filter((app) => {
    if (!app.requestedAt) return false;
    const appDate = new Date(app.requestedAt);
    return appDate.getMonth() === currentMonth && appDate.getFullYear() === currentYear;
  });

  // 미완료 서평 개수 계산 (서평완료가 아닌 것들)
  const incompleteCount = apps.filter((app) => app.status !== '서평완료').length;

  // 신청 가능 여부: 미완료가 3개 미만이어야 함
  const canApply = incompleteCount < MAX_REVIEWS;

  return {
    monthlyCount: monthlyApps.length,
    totalCount: incompleteCount, // 전체 미완료 수 표시
    canApply,
  };
};

