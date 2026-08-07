import { describe, expect, it } from 'vitest';
import { aggregatePerformance, BUDGET_COLS, WORK_TYPES } from '@/lib/performance/insights';
import type { EstimateCategory } from '@/types/estimate';
import { makeEstimate } from '../fixtures';

// ==========================================
// 공개 실적 집계 — 모집단 정의 고정 (B4)
// ==========================================
// 결함: 분모(히트맵 8공종 합계)와 분자(검토 완료 건수)의 모집단이 달라
//       ① 검토 비율이 100%를 넘고 ② KPI '견적 건수'와 히트맵 합계가 갈렸다.
// 의뢰 폼은 10종(배관+장비설치·기타 포함)을 받으므로 8종 밖 접수 1건이면 발동한다.

const sum = (rec: Record<string, number>) => Object.values(rec).reduce((a, b) => a + b, 0);

describe('모집단 = 히트맵 축(8대 공종 × 견적규모 4등급)에 매핑되는 행', () => {
  it('8종 밖 공종이 섞여도 검토 비율이 100%를 넘지 않는다', () => {
    const rows = [
      makeEstimate({ work_type: '배관공사', status: '접수완료' }),
      makeEstimate({ work_type: '배관공사', status: '검토중' }),
      // 8종 밖 — 히트맵에 행이 없으므로 분모에서 빠진다. 분자에도 들어가면 안 된다.
      makeEstimate({ work_type: '배관+장비설치', status: '수주성공' }),
      makeEstimate({ work_type: '기타', status: '견적서 송부완료' }),
      makeEstimate({ work_type: '기타', status: '수주실패' }),
    ];

    const agg = aggregatePerformance(rows);

    expect(agg.reviewDoneRate).toBeLessThanOrEqual(100);
    expect(agg.reviewDoneRate).toBe(0);
    expect(agg.reviewDoneCount).toBe(0);
    expect(agg.grandTotal).toBe(2);
  });

  it('검토 비율의 분자·분모가 같은 모수를 쓴다', () => {
    const rows = [
      makeEstimate({ work_type: '배관공사', status: '견적서 송부완료' }),
      makeEstimate({ work_type: '장비설치', status: '수주성공' }),
      makeEstimate({ work_type: '기계실개선', status: '접수완료' }),
      makeEstimate({ work_type: '공장증설', status: '검토중' }),
      makeEstimate({ work_type: '기타', status: '수주성공' }),
      makeEstimate({ work_type: '배관+장비설치', status: '견적서 송부완료' }),
    ];

    const agg = aggregatePerformance(rows);

    expect(agg.grandTotal).toBe(4);
    expect(agg.reviewDoneCount).toBe(2);
    expect(agg.reviewDoneRate).toBe(50);
  });

  it("KPI '견적 건수'와 히트맵 합계가 같은 값이다", () => {
    const rows = [
      makeEstimate({ work_type: '배관공사', estimate_category: 'small' }),
      makeEstimate({ work_type: '노후배관교체', estimate_category: 'large' }),
      makeEstimate({ work_type: '기타', estimate_category: 'medium' }),
      makeEstimate({ work_type: '배관+장비설치', estimate_category: 'unknown' }),
    ];

    const agg = aggregatePerformance(rows);

    expect(agg.metrics.totalCount).toBe(agg.grandTotal);
    expect(sum(agg.rowTotal)).toBe(agg.grandTotal);
    expect(sum(agg.colTotal)).toBe(agg.grandTotal);
  });

  it('견적규모 4등급 밖의 값은 열 합계를 깨지 않는다', () => {
    const rows = [
      makeEstimate({ work_type: '배관공사', estimate_category: 'small' }),
      // 구 데이터·오염 행: 4등급 중 어느 열에도 들어가지 않는다
      makeEstimate({ work_type: '배관공사', estimate_category: 'legacy' as unknown as EstimateCategory }),
    ];

    const agg = aggregatePerformance(rows);

    expect(agg.grandTotal).toBe(1);
    expect(sum(agg.colTotal)).toBe(agg.grandTotal);
    expect(sum(agg.rowTotal)).toBe(agg.grandTotal);
    expect(agg.metrics.totalCount).toBe(agg.grandTotal);
  });

  it('평균 소요도 히트맵과 같은 모수로 계산한다', () => {
    const rows = [
      makeEstimate({
        work_type: '배관공사',
        status: '견적서 송부완료',
        created_at: '2026-07-01T00:00:00.000Z',
        estimate_sent_at: '2026-07-03T00:00:00.000Z',
      }),
      // 8종 밖 — 소요 40일. 모수에 섞이면 평균이 20일로 부풀려진다.
      makeEstimate({
        work_type: '기타',
        status: '견적서 송부완료',
        created_at: '2026-07-01T00:00:00.000Z',
        estimate_sent_at: '2026-08-10T00:00:00.000Z',
      }),
    ];

    expect(aggregatePerformance(rows).metrics.averageProcessDays).toBe(2);
  });
});

describe('8종만 있을 때 기존 집계값과 동일 (회귀)', () => {
  const rows = [
    makeEstimate({ work_type: '배관공사', estimate_category: 'small', status: '접수완료', site_type: '공장' }),
    makeEstimate({
      work_type: '배관공사', estimate_category: 'small', status: '견적서 송부완료', site_type: '공장',
      created_at: '2026-07-01T00:00:00.000Z', estimate_sent_at: '2026-07-03T00:00:00.000Z',
    }),
    makeEstimate({
      work_type: '장비설치', estimate_category: 'medium', status: '수주성공', site_type: '물류센터',
      created_at: '2026-07-01T00:00:00.000Z', estimate_sent_at: '2026-07-02T00:00:00.000Z',
    }),
    makeEstimate({ work_type: '기계실개선', estimate_category: 'large', status: '검토중', site_type: '기계실' }),
    makeEstimate({ work_type: '공장증설', estimate_category: 'unknown', status: '수주실패', site_type: '공장' }),
  ];

  it('합계·행합·열합·최대값이 그대로다', () => {
    const agg = aggregatePerformance(rows);

    expect(agg.grandTotal).toBe(5);
    expect(agg.metrics.totalCount).toBe(5);
    expect(agg.rowTotal).toEqual({
      '배관공사': 2, '장비설치': 1, 'Utility 배관': 0, '공장증설': 1,
      '노후배관교체': 0, '기계실개선': 1, '생산설비 배관 연결': 0, 'CAPEX 개·증설 검토': 0,
    });
    expect(agg.colTotal).toEqual({ small: 2, medium: 1, large: 1, unknown: 1 });
    expect(agg.matrix['배관공사']).toEqual({ small: 2, medium: 0, large: 0, unknown: 0 });
    expect(agg.matrixMax).toBe(2);
  });

  it('검토 비율·평균 소요가 그대로다', () => {
    const agg = aggregatePerformance(rows);

    expect(agg.reviewDoneCount).toBe(3);
    expect(agg.reviewDoneRate).toBe(60);
    expect(agg.metrics.averageProcessDays).toBe(1.5);
  });

  it('분포는 히트맵과 같은 공종 순서를 유지한다', () => {
    const agg = aggregatePerformance(rows);

    expect(agg.distribution.map((d) => d.name)).toEqual(WORK_TYPES);
    expect(agg.distribution.map((d) => d.value)).toEqual([2, 1, 0, 1, 0, 1, 0, 0]);
  });

  it('세부 카드는 건수 내림차순이고 비중·평균 검토일·대표 현장이 그대로다', () => {
    const agg = aggregatePerformance(rows);

    expect(agg.cards[0]).toEqual({
      name: '배관공사', count: 2, share: 40, avgDays: 2, topSite: '공장',
    });
    expect(agg.cards.find((c) => c.name === '장비설치')).toEqual({
      name: '장비설치', count: 1, share: 20, avgDays: 1, topSite: '물류센터',
    });
    expect(agg.cards.find((c) => c.name === 'Utility 배관')).toEqual({
      name: 'Utility 배관', count: 0, share: 0, avgDays: null, topSite: '—',
    });
  });
});

describe('빈 데이터', () => {
  it('0으로 나누지 않는다', () => {
    const agg = aggregatePerformance([]);

    expect(agg.grandTotal).toBe(0);
    expect(agg.reviewDoneRate).toBe(0);
    expect(agg.matrixMax).toBe(0);
    expect(agg.cards.every((c) => c.share === 0)).toBe(true);
  });
});

describe('축 정의', () => {
  it('공종 8종·견적규모 4등급 축이 화면 조문과 일치한다', () => {
    expect(WORK_TYPES).toHaveLength(8);
    expect(BUDGET_COLS.map((c) => c.key)).toEqual(['small', 'medium', 'large', 'unknown']);
  });
});
