import type { Estimate, EstimateCategory, EstimateStatus, WorkType } from '@/types/estimate';
import { calculatePerformanceMetrics, type PerformanceMetrics } from '@/lib/calculations';

// ─────────────────────────────────────────────────────────────────────────────
// 공개 실적 화면(components/PerformanceInsights.tsx)의 집계 로직.
// 화면에서 분리한 이유 = 집계의 모집단 정의를 테스트로 고정하기 위함이다(AGENTS §14-1).
// 화면은 색·여백만 책임지고, "무엇을 세는가"는 여기 한 곳에서 정한다.
// ─────────────────────────────────────────────────────────────────────────────

// 좌측 메뉴와 동일한 8대 공종 순서 (LeftSidebar workCategories와 일치)
export const WORK_TYPES: WorkType[] = [
  '배관공사',
  '장비설치',
  'Utility 배관',
  '공장증설',
  '노후배관교체',
  '기계실개선',
  '생산설비 배관 연결',
  'CAPEX 개·증설 검토',
];

// 견적규모 4등급 (LeftSidebar budgetCategories와 일치)
export const BUDGET_COLS: { key: EstimateCategory; label: string; range: string }[] = [
  { key: 'small', label: '온라인 간편검토', range: '≤1,000만' },
  { key: 'medium', label: '출장견적', range: '1,000만~1억' },
  { key: 'large', label: '프로젝트 사전진단', range: '>1억' },
  { key: 'unknown', label: '공사규모·금액', range: '온라인 컨설팅' },
];

/**
 * 공개 실적을 지표로 내보내기 위한 최소 표본 수.
 *
 * 2026-08-08: 테스트행(`est-test-*`) 99건이 모집단을 채우고 있어 공개 화면이
 * '온라인 접수 101건'을 표시했다. 실접수는 2건이었다 — 방문자에게 사실과 다른
 * 실적을 보여주던 상태다. 테스트행을 지우니 이번엔 표본 2건으로 분포·평균·비율을
 * 그리게 되는데, 1건이 50%가 되는 그래프는 실적이 아니라 오해다.
 *
 * 그래서 "몇 건부터 지표로 말할 수 있는가"를 화면이 아니라 여기서 정하고
 * test/performance/insights.test.ts 가 채점한다. 화면은 이 판정만 따른다.
 */
export const PERFORMANCE_MIN_SAMPLE = 10;

// 검토가 끝난 것으로 보는 상태 — '검토 비율'의 분자다.
const REVIEW_DONE_STATUSES: readonly EstimateStatus[] = [
  '견적서 송부완료',
  '수주성공',
  '수주실패',
];

const REVIEW_DONE: ReadonlySet<string> = new Set<string>(REVIEW_DONE_STATUSES);

export interface TradeCard {
  name: WorkType;
  count: number;
  /** 전체 대비 비중(%) — 소수 첫째 자리 */
  share: number;
  /** 접수 → 견적서 송부 평균 소요일. 송부 이력이 없으면 null */
  avgDays: number | null;
  topSite: string;
}

export interface PerformanceAggregate {
  metrics: PerformanceMetrics;
  matrix: Record<string, Record<string, number>>;
  rowTotal: Record<string, number>;
  colTotal: Record<string, number>;
  matrixMax: number;
  grandTotal: number;
  distribution: { name: WorkType; value: number }[];
  cards: TradeCard[];
  reviewDoneCount: number;
  /** 검토 비율(%) — 정수 */
  reviewDoneRate: number;
  /** 모집단 밖이라 지표에서 빠진 접수 건수 */
  excludedCount: number;
  /** 표본이 PERFORMANCE_MIN_SAMPLE 에 도달해 지표를 공개해도 되는가 */
  isPublishable: boolean;
}

const WORK_TYPE_SET: ReadonlySet<string> = new Set<string>(WORK_TYPES);
const BUDGET_KEY_SET: ReadonlySet<string> = new Set<string>(BUDGET_COLS.map((c) => c.key));

/** 히트맵 두 축(공종·견적규모)에 모두 자리가 있는 행 = 이 화면의 모집단이다. */
const isScoped = (e: Estimate): boolean =>
  WORK_TYPE_SET.has(e.work_type) && BUDGET_KEY_SET.has(e.estimate_category);

export function aggregatePerformance(estimates: Estimate[]): PerformanceAggregate {
  // 모집단을 집계 시작에서 한 번만 확정한다. 이후 모든 지표가 이 배열만 본다 —
  // 분자(검토 완료)와 분모(히트맵 합계)의 모수가 갈리면 검토 비율이 100%를 넘고
  // KPI '견적 건수'와 히트맵 합계가 서로 다른 값을 가리킨다(B4).
  // 의뢰 폼은 10종을 받으므로 8종 밖 접수 1건이면 바로 발동하는 결함이었다.
  const scoped = estimates.filter(isScoped);
  const metrics = calculatePerformanceMetrics(scoped);

  // 공종 × 규모 매트릭스 (건수)
  const matrix: Record<string, Record<string, number>> = {};
  const rowTotal: Record<string, number> = {};
  const colTotal: Record<string, number> = {};
  WORK_TYPES.forEach((w) => {
    matrix[w] = {};
    rowTotal[w] = 0;
    BUDGET_COLS.forEach((c) => { matrix[w][c.key] = 0; });
  });
  BUDGET_COLS.forEach((c) => { colTotal[c.key] = 0; });

  // 공종별 부가 지표
  const detail: Record<string, { count: number; daysSum: number; daysN: number; sites: Record<string, number> }> = {};
  WORK_TYPES.forEach((w) => { detail[w] = { count: 0, daysSum: 0, daysN: 0, sites: {} }; });

  let matrixMax = 0;
  const grandTotal = scoped.length;

  scoped.forEach((e) => {
    const w = e.work_type;
    const c = e.estimate_category;
    matrix[w][c] += 1;
    rowTotal[w] += 1;
    colTotal[c] += 1;
    if (matrix[w][c] > matrixMax) matrixMax = matrix[w][c];

    const d = detail[w];
    d.count += 1;
    if (e.estimate_sent_at) {
      const days = Math.round(
        (new Date(e.estimate_sent_at).getTime() - new Date(e.created_at).getTime()) / 86_400_000,
      );
      if (days >= 0) { d.daysSum += days; d.daysN += 1; }
    }
    if (e.site_type) d.sites[e.site_type] = (d.sites[e.site_type] || 0) + 1;
  });

  // 분포 차트용 — 순서는 히트맵(WORK_TYPES)과 동일 고정(2026-07-12 캡쳐 지시: 행렬 직관 일치, 내림차순 폐지)
  const distribution = WORK_TYPES.map((w) => ({ name: w, value: rowTotal[w] }));

  // 세부 카드용
  const cards = WORK_TYPES.map((w) => {
    const d = detail[w];
    const topSite = Object.entries(d.sites).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    return {
      name: w,
      count: d.count,
      share: grandTotal > 0 ? Math.round((d.count / grandTotal) * 1000) / 10 : 0,
      avgDays: d.daysN > 0 ? Math.round(d.daysSum / d.daysN) : null,
      topSite,
    };
  }).sort((a, b) => b.count - a.count);

  const reviewDoneCount = scoped.filter((e) => REVIEW_DONE.has(e.status)).length;
  const reviewDoneRate = grandTotal > 0 ? Math.round((reviewDoneCount / grandTotal) * 100) : 0;

  return {
    metrics, matrix, rowTotal, colTotal, matrixMax, grandTotal,
    distribution, cards, reviewDoneCount, reviewDoneRate,
    excludedCount: estimates.length - scoped.length,
    // 모집단(scoped) 기준이다. 화면이 그리는 것과 판정이 세는 것이 갈리면
    // 빈 히트맵 위에 큰 숫자만 뜬다.
    isPublishable: grandTotal >= PERFORMANCE_MIN_SAMPLE,
  };
}
