import { describe, expect, it } from 'vitest';
import { draftLineItems } from '@/lib/quote/quoteDraft';
import { sumSubtotal, totalOf } from '@/lib/quote/amounts';
import type { ExpectedBudgetRange, WorkType } from '@/types/estimate';
import { makeEstimate, makeLineItem } from '../fixtures';

// ==========================================
// 견적 초안 10% 증식 차단 회귀 테스트
// ==========================================
// 결함 이력: 초안 라인 합계(40,150,000)를 VAT 포함 총액(44,165,000)으로 저장한 뒤
// 그 값을 다시 기준액으로 삼아 초안을 재생성해 43,970,000 → 48,367,000 으로 증식했다.
// 처방: 기준액은 supplyAmountOf(공급가액)로만 읽고, 초안 합계는 기준액과 원 단위로 일치시킨다.

const WORK_TYPES: WorkType[] = [
  '배관공사',
  '장비설치',
  '배관+장비설치',
  'Utility 배관',
  '공장증설',
  '노후배관교체',
  '기계실개선',
  '생산설비 배관 연결',
  'CAPEX 개·증설 검토',
  '기타',
];

const BASE_AMOUNTS = [8_000_000, 12_345_678, 40_000_000, 99_999_999, 150_000_000];

describe('draftLineItems — 잔차 정산', () => {
  it('전 공종·전 기준액에서 라인 합계가 기준액과 원 단위로 일치한다', () => {
    for (const work_type of WORK_TYPES) {
      for (const base of BASE_AMOUNTS) {
        const est = makeEstimate({ work_type, estimated_amount: base });
        expect({ work_type, base, sum: sumSubtotal(draftLineItems(est)) }).toEqual({
          work_type,
          base,
          sum: base,
        });
      }
    }
  });

  it('예산대역으로 기준액을 폴백해도 합계가 정확히 일치한다', () => {
    const cases: Array<[ExpectedBudgetRange, number]> = [
      ['≤1,000만', 8_000_000],
      ['1,000만~1억', 40_000_000],
      ['≥1억', 120_000_000],
    ];
    for (const [expected_budget_range, base] of cases) {
      const est = makeEstimate({ expected_budget_range, estimated_amount: undefined });
      expect(sumSubtotal(draftLineItems(est))).toBe(base);
    }
  });

  it('예산대역이 모름이면 견적규모로 기준액을 잡는다', () => {
    const est = makeEstimate({
      expected_budget_range: '모름',
      estimate_category: 'large',
      estimated_amount: undefined,
    });
    expect(sumSubtotal(draftLineItems(est))).toBe(150_000_000);
  });

  it('0원·음수 라인을 만들지 않는다', () => {
    const items = draftLineItems(makeEstimate({ estimated_amount: 8_000_000 }));
    expect(items.length).toBeGreaterThan(0);
    for (const it_ of items) {
      expect(it_.qty).toBeGreaterThanOrEqual(1);
      expect(it_.unit_price).toBeGreaterThanOrEqual(10_000);
    }
  });
});

describe('draftLineItems — 재생성 증식 차단', () => {
  it('초안을 저장한 견적으로 다시 초안을 만들어도 기준액이 유지된다', () => {
    const first = draftLineItems(makeEstimate({ estimated_amount: 40_000_000 }));
    expect(sumSubtotal(first)).toBe(40_000_000);

    const saved = makeEstimate({
      estimated_amount: sumSubtotal(first), // 공급가액으로 저장
      line_items: first,
    });
    expect(sumSubtotal(draftLineItems(saved))).toBe(40_000_000);
  });

  it('3사이클을 돌려도 합계가 40,000,000 을 유지한다', () => {
    let est = makeEstimate({ estimated_amount: 40_000_000 });
    const sums: number[] = [];
    for (let cycle = 0; cycle < 3; cycle++) {
      const items = draftLineItems(est);
      sums.push(sumSubtotal(items));
      est = makeEstimate({ estimated_amount: sumSubtotal(items), line_items: items });
    }
    expect(sums).toEqual([40_000_000, 40_000_000, 40_000_000]);
  });

  it('구 저장값(VAT 포함 총액)을 가진 견적도 공급가액 기준으로 초안을 만든다', () => {
    // 결함 재현 조건: 라인 합계 40,150,000 을 총액 44,165,000 으로 저장한 구 데이터.
    const legacy = makeEstimate({
      estimated_amount: totalOf(40_150_000), // 44,165,000
      line_items: [makeLineItem({ qty: 1, unit_price: 40_150_000 })],
    });
    // 고치기 전에는 44,165,000 을 기준액으로 삼아 43,970,000 짜리 초안을 만들었고,
    // 그 값이 다시 총액으로 저장되며 48,367,000 이 됐다.
    expect(sumSubtotal(draftLineItems(legacy))).toBe(40_150_000);
  });
});

// ==========================================
// 공수 단가 보존 (2026-07-31 적대 검증 발견)
// ==========================================
// 잔차 정산이 '식'(수량 1) 항목만 골라 차액을 흡수하는데, 공수 행도 수량이 1로
// 반올림되면 그 풀에 섞여 들어갔다. 그 결과 고객 견적서에 표준 노임단가가 아닌
// "1공수 × 300,000" 같은 근거 없는 단가가 찍혔다(기준액 111만~227만원 구간).
// 합계 일치와 공수 단가 보존은 동시에 성립해야 한다.

describe('공수 단가는 잔차 정산에 흡수되지 않는다', () => {
  const LABOR_UNIT_PRICE = 450_000;
  const 공종들 = [
    '배관공사', '장비설치', '배관+장비설치', 'Utility 배관',
    '공장증설', '노후배관교체', '기계실개선', '생산설비 배관 연결', '기타',
  ] as const;
  // 검증에서 변형이 확인된 구간 + 경계값
  const 기준액들 = [1_000_000, 1_300_000, 1_500_000, 2_000_000, 2_270_000, 8_000_000, 40_000_000];

  for (const work of 공종들) {
    for (const base of 기준액들) {
      it(`${work} · 기준액 ${base.toLocaleString()}원 — 공수 단가 보존 + 합계 일치`, () => {
        const est = makeEstimate({ work_type: work, estimated_amount: base });
        const items = draftLineItems(est);

        const labor = items.filter(it => it.unit === '공수');
        for (const line of labor) {
          expect(line.unit_price).toBe(LABOR_UNIT_PRICE);
        }
        expect(sumSubtotal(items)).toBe(base);
      });
    }
  }
});
