import { describe, expect, it } from 'vitest';
import { PERFORMANCE_LABEL } from '@/lib/constants/trust';
import { readSource } from '../support/sourceScan';

// 실적 화면의 KPI 라벨은 컴포넌트 JSX 안 문자열이라 node 환경 테스트로 렌더할 수 없다.
// 라벨이 어느 모집단을 가리키는지는 소스 스캔으로 고정한다 — 리터럴이 되살아나면 여기서 깨진다.
const { source, locate } = readSource('components/PerformanceInsights.tsx');

describe('실적 화면 KPI 라벨 = 온라인 접수 (확정②)', () => {
  it('KPI 라벨이 리터럴이 아니라 단일 소스 상수를 참조한다', () => {
    const references = locate((line) => line.includes('PERFORMANCE_LABEL.intake'));
    expect(references).toHaveLength(1);
  });

  it('상수를 lib/constants/trust 에서 가져온다', () => {
    expect(source).toContain("from '@/lib/constants/trust'");
    expect(PERFORMANCE_LABEL.intake).toBe('온라인 접수');
  });

  it('구 라벨 리터럴 「견적 건수」가 0건이다', () => {
    expect(locate((line) => line.includes('견적 건수'))).toEqual([]);
  });

  it('30년 실적 누적값(246)이 실적 화면에 섞이지 않는다', () => {
    // 이 화면은 DB 실측만 렌더한다. 신뢰 지표 상수를 끌어오면 두 모집단이 한 화면에서 섞인다.
    expect(locate((line) => /\bTRUST(_LABEL|_VALUE)?\b/.test(line))).toEqual([]);
    expect(locate((line) => line.includes('246'))).toEqual([]);
  });
});
