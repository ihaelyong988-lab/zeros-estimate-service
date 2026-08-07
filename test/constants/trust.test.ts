import { describe, expect, it } from 'vitest';
import { PERFORMANCE_LABEL, TRUST, TRUST_LABEL, TRUST_VALUE } from '@/lib/constants/trust';

// ==========================================
// 신뢰 지표 246 — 출처 라벨 분리 (확정②)
// ==========================================
// 결함: 사업소개가 '누적 검증 246건'을, 실적 탭이 DB 실측 건수를 같은 이름 계열로 보여
//       같은 방문자가 탭 두 번에 서로 다른 두 숫자를 같은 지표로 읽는다.
// 처방: 숫자 246은 유지하고 라벨로 모집단을 가른다 — 30년 현장 실적 누적 vs 온라인 접수.

describe('신뢰 지표 대표값', () => {
  it('누적 검증 건수 246은 유지한다', () => {
    expect(TRUST.cumulativeReviews).toBe(246);
    expect(TRUST_VALUE.cumulative).toBe('246건');
  });

  it('표시 문자열은 수치에서 파생한다', () => {
    expect(TRUST_VALUE.cumulative).toBe(`${TRUST.cumulativeReviews}건`);
  });
});

describe('출처 라벨 분리 — 246(30년 실적) vs 실적 화면(온라인 접수)', () => {
  it('누적 검증 라벨이 30년 실적 출처를 드러낸다', () => {
    expect(TRUST_LABEL.cumulative).toContain('30년');
  });

  it('실적 화면 라벨이 온라인 접수 출처를 드러낸다', () => {
    expect(PERFORMANCE_LABEL.intake).toContain('온라인');
  });

  it('두 라벨은 서로를 포함하지 않는다', () => {
    // 한쪽이 다른 쪽의 부분 문자열이면 화면에서 같은 지표의 축약형으로 읽힌다.
    expect(TRUST_LABEL.cumulative).not.toBe(PERFORMANCE_LABEL.intake);
    expect(TRUST_LABEL.cumulative.includes(PERFORMANCE_LABEL.intake)).toBe(false);
    expect(PERFORMANCE_LABEL.intake.includes(TRUST_LABEL.cumulative)).toBe(false);
  });

  it('실적 화면 라벨에 246의 출처 표현이 섞이지 않는다', () => {
    // '30년'이 실적 화면 라벨에 붙으면 DB 실측 건수가 30년 누적으로 읽힌다.
    expect(PERFORMANCE_LABEL.intake).not.toContain('30년');
  });
});
