import { describe, expect, it } from 'vitest';
import {
  lineAmount,
  sumSubtotal,
  supplyAmountOf,
  totalAmountOf,
  totalOf,
  vatOf,
} from '@/lib/quote/amounts';
import { makeEstimate, makeLineItem } from '../fixtures';

// ==========================================
// 금액 단위 불변식 회귀 테스트
// ==========================================
// 불변식: Estimate.estimated_amount = 공급가액(VAT 별도) 단일 정의.
// VAT·총액은 저장하지 않고 파생 계산한다. 이 파일이 그 단일 정의를 고정한다.

describe('lineAmount · sumSubtotal', () => {
  it('라인 금액 = 수량 × 단가', () => {
    expect(lineAmount(makeLineItem({ qty: 3, unit_price: 450_000 }))).toBe(1_350_000);
    expect(lineAmount(makeLineItem({ qty: 0, unit_price: 450_000 }))).toBe(0);
  });

  it('합계는 라인 금액의 총합이고 빈 배열은 0이다', () => {
    expect(sumSubtotal([])).toBe(0);
    expect(
      sumSubtotal([
        makeLineItem({ qty: 1, unit_price: 10_000_000 }),
        makeLineItem({ qty: 2, unit_price: 450_000 }),
      ]),
    ).toBe(10_900_000);
  });
});

describe('vatOf · totalOf', () => {
  it('부가세 10%, 총액 = 공급가액 + 부가세', () => {
    expect(vatOf(40_000_000)).toBe(4_000_000);
    expect(totalOf(40_000_000)).toBe(44_000_000);
  });

  it('원 단위로 반올림한다', () => {
    // 1,234,567 × 0.1 = 123,456.7 → 123,457
    expect(vatOf(1_234_567)).toBe(123_457);
    expect(totalOf(1_234_567)).toBe(1_358_024);
  });
});

describe('supplyAmountOf', () => {
  it('라인아이템이 없으면 저장값이 곧 공급가액이다', () => {
    expect(supplyAmountOf(makeEstimate({ estimated_amount: 30_000_000 }))).toBe(30_000_000);
  });

  it('저장 금액이 없으면 0이다', () => {
    expect(supplyAmountOf(makeEstimate())).toBe(0);
  });

  it('저장값이 0이면 라인 합계를 공급가액으로 쓴다', () => {
    const est = makeEstimate({
      estimated_amount: 0,
      line_items: [makeLineItem({ qty: 1, unit_price: 12_000_000 })],
    });
    expect(supplyAmountOf(est)).toBe(12_000_000);
  });

  it('저장값이 라인 합계의 총액과 일치하면 구 저장값으로 보고 공급가액으로 정규화한다', () => {
    const est = makeEstimate({
      estimated_amount: 44_000_000, // 공급가 40,000,000 + VAT 4,000,000 (구 저장 방식)
      line_items: [makeLineItem({ qty: 1, unit_price: 40_000_000 })],
    });
    expect(supplyAmountOf(est)).toBe(40_000_000);
    expect(totalAmountOf(est)).toBe(44_000_000); // 이중 과세(48,400,000) 없음
  });

  it('VAT 반올림 ±1원 오차가 있어도 구 저장값으로 인식한다', () => {
    const supply = 1_234_567;
    const est = makeEstimate({
      estimated_amount: totalOf(supply) + 1, // 1,358,025
      line_items: [makeLineItem({ qty: 1, unit_price: supply })],
    });
    expect(supplyAmountOf(est)).toBe(supply);
  });

  it('라인 합계의 총액과 어긋나는 저장값은 관리자 정정 공급가액으로 유지한다', () => {
    const est = makeEstimate({
      estimated_amount: 25_000_000, // totalOf(10,000,000) = 11,000,000 과 불일치
      line_items: [makeLineItem({ qty: 1, unit_price: 10_000_000 })],
    });
    expect(supplyAmountOf(est)).toBe(25_000_000);
  });
});

describe('totalAmountOf', () => {
  it('항상 공급가액 + 부가세를 반환한다', () => {
    expect(totalAmountOf(makeEstimate({ estimated_amount: 40_000_000 }))).toBe(44_000_000);
  });
});
