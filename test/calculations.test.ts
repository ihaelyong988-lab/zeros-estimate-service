import { describe, expect, it } from 'vitest';
import { calculatePerformanceMetrics, sumExpectedRevenue } from '@/lib/calculations';
import { makeEstimate, makeLineItem, makePayment } from './fixtures';

// ==========================================
// KPI 집계 회귀 테스트
// ==========================================
// 결정①: 미수금 = Payment 행 기준(청구 − 수납). 계약금 전액을 미수로 잡던 방식은 폐기.
// 금액 지표 단위 = 공급가액(VAT 별도) 단일 기준.

describe('미수금 = Payment 행 기준', () => {
  it('계약 3억 + 서비스 수수료 30만원 미결제면 미수금은 30만원이다', () => {
    const est = makeEstimate({
      id: 'est-won-1',
      status: '수주성공',
      confirmed_contract_amount: 300_000_000,
      payment_required: true,
      payment_status: '미결제',
    });
    const fee = makePayment({
      estimate_id: 'est-won-1',
      payment_type: '프로젝트 사전진단비',
      amount: 300_000,
      payment_status: '미결제',
    });

    const m = calculatePerformanceMetrics([est], [fee]);
    expect(m.outstandingAmount).toBe(300_000); // 계약금 300,000,000 이 아니다
    expect(m.confirmedRevenue).toBe(300_000_000);
  });

  it('이 데이터셋에 없는 견적의 결제 행은 집계하지 않는다', () => {
    const est = makeEstimate({ id: 'est-live-1', status: '수주성공' });
    const rows = [
      makePayment({ estimate_id: 'est-live-1', amount: 300_000, payment_status: '미결제' }),
      makePayment({ estimate_id: 'est-deleted-9', amount: 500_000, payment_status: '미결제' }),
    ];
    expect(calculatePerformanceMetrics([est], rows).outstandingAmount).toBe(300_000);
  });

  it('결제 행을 넘기지 않으면 미수금은 0이다', () => {
    const est = makeEstimate({ status: '수주성공', confirmed_contract_amount: 300_000_000 });
    expect(calculatePerformanceMetrics([est]).outstandingAmount).toBe(0);
  });
});

describe('금액 지표 단위 = 공급가액', () => {
  it('구 저장값(VAT 포함)과 신 저장값이 섞여도 공급가액으로 합산한다', () => {
    const legacy = makeEstimate({
      status: '견적서 송부완료',
      estimated_amount: 44_000_000, // 공급가 40,000,000 + VAT
      line_items: [makeLineItem({ qty: 1, unit_price: 40_000_000 })],
    });
    const current = makeEstimate({ status: '견적서 작성중', estimated_amount: 10_000_000 });

    const m = calculatePerformanceMetrics([legacy, current]);
    expect(m.expectedRevenue).toBe(50_000_000); // 54,000,000 아님
    expect(m.averageQuoteAmount).toBe(40_000_000); // 송부완료 1건 기준
  });
});

describe('평균 소요일', () => {
  it('접수일 → 송부일 경과일수를 집계한다', () => {
    const est = makeEstimate({
      status: '견적서 송부완료',
      created_at: '2026-07-10T00:00:00.000Z',
      estimate_sent_at: '2026-07-13T00:00:00.000Z',
    });
    expect(calculatePerformanceMetrics([est]).averageProcessDays).toBe(3);
  });

  it('송부일이 접수일보다 빠른 오염 데이터에서도 음수가 되지 않는다', () => {
    const est = makeEstimate({
      status: '견적서 송부완료',
      created_at: '2026-07-20T00:00:00.000Z',
      estimate_sent_at: '2026-07-10T00:00:00.000Z',
    });
    expect(calculatePerformanceMetrics([est]).averageProcessDays).toBeGreaterThanOrEqual(0);
  });
});

describe('빈 데이터셋', () => {
  it('0건 입력에서 모든 지표가 NaN 없이 유한수다', () => {
    const m = calculatePerformanceMetrics([], []);
    const notFinite = Object.entries(m).filter(([, v]) => !Number.isFinite(v));
    expect(notFinite).toEqual([]);
    expect(m.totalCount).toBe(0);
    expect(m.quoteConversionRate).toBe(0);
    expect(m.wonConversionRate).toBe(0);
    expect(m.averageQuoteAmount).toBe(0);
    expect(m.averageProcessDays).toBe(0);
  });
});

// ==========================================
// 예상매출 단일 산식 (sumExpectedRevenue)
// ==========================================
// 같은 산식이 관리자 대시보드·우측 패널·KPI 3곳에 각각 하드코딩돼 있었다.
// 한 곳으로 모은 뒤, 화면이 갈라지지 않도록 여기서 고정한다(AGENTS §14-4).

describe('예상매출 단일 산식', () => {
  it('견적서 작성중·송부완료만 합산하고 다른 상태는 제외한다', () => {
    const rows = [
      makeEstimate({ id: 'a', status: '견적서 작성중', estimated_amount: 10_000_000 }),
      makeEstimate({ id: 'b', status: '견적서 송부완료', estimated_amount: 20_000_000 }),
      makeEstimate({ id: 'c', status: '접수완료', estimated_amount: 99_000_000 }),
      makeEstimate({ id: 'd', status: '수주성공', estimated_amount: 88_000_000 }),
    ];
    expect(sumExpectedRevenue(rows)).toBe(30_000_000);
  });

  it('구 저장값(VAT 포함)이 섞여 있어도 공급가액으로 정규화해 합산한다', () => {
    // 품목 합계 10,000,000 인데 저장값이 11,000,000(VAT 포함) = 구 방식으로 오염된 행
    const polluted = makeEstimate({
      status: '견적서 송부완료',
      estimated_amount: 11_000_000,
      line_items: [makeLineItem({ qty: 1, unit_price: 10_000_000 })],
    });
    expect(sumExpectedRevenue([polluted])).toBe(10_000_000);
  });

  it('KPI 지표의 expectedRevenue와 항상 같은 값을 낸다', () => {
    const rows = [
      makeEstimate({ id: 'a', status: '견적서 작성중', estimated_amount: 7_000_000 }),
      makeEstimate({ id: 'b', status: '견적서 송부완료', estimated_amount: 3_500_000 }),
      makeEstimate({ id: 'c', status: '수주실패', estimated_amount: 50_000_000 }),
    ];
    expect(sumExpectedRevenue(rows)).toBe(calculatePerformanceMetrics(rows).expectedRevenue);
  });

  it('빈 배열이면 0이다', () => {
    expect(sumExpectedRevenue([])).toBe(0);
  });
});
