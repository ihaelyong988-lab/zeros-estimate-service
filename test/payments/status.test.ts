import { describe, expect, it } from 'vitest';
import {
  billedAmount,
  derivePaymentStatus,
  outstandingAmount,
  paidAmount,
} from '@/lib/payments/status';
import { makePayment } from '../fixtures';

// ==========================================
// 결제 상태·미수금 파생 회귀 테스트
// ==========================================
// 견적의 결제 상태는 저장 필드가 아니라 Payment 행에서 파생한다.

describe('derivePaymentStatus', () => {
  it('결제 행이 없으면 미결제다', () => {
    expect(derivePaymentStatus([])).toBe('미결제');
  });

  it('전부 미결제면 미결제다', () => {
    expect(derivePaymentStatus([makePayment(), makePayment()])).toBe('미결제');
  });

  it('결제대기만 있으면 결제대기다', () => {
    expect(derivePaymentStatus([makePayment({ payment_status: '결제대기' })])).toBe('결제대기');
  });

  it('결제완료가 있으면 결제완료다', () => {
    expect(derivePaymentStatus([makePayment({ payment_status: '결제완료' })])).toBe('결제완료');
  });

  it('결제대기와 결제완료가 함께 있어도 결제완료다', () => {
    // 중복 결제 행이 남아도 상태가 뒤집히지 않는다.
    const rows = [
      makePayment({ payment_status: '결제대기' }),
      makePayment({ payment_status: '결제완료' }),
    ];
    expect(derivePaymentStatus(rows)).toBe('결제완료');
    expect(derivePaymentStatus([...rows].reverse())).toBe('결제완료');
  });

  it('완료·대기가 없고 환불만 있으면 환불이다', () => {
    expect(derivePaymentStatus([makePayment({ payment_status: '환불' })])).toBe('환불');
  });
});

describe('미수금 = 청구액 − 수납액', () => {
  it('환불 행은 청구에서 제외한다', () => {
    const rows = [
      makePayment({ amount: 300_000, payment_status: '결제완료' }),
      makePayment({ amount: 500_000, payment_status: '결제대기' }),
      makePayment({ amount: 200_000, payment_status: '환불' }),
    ];
    expect(billedAmount(rows)).toBe(800_000);
    expect(paidAmount(rows)).toBe(300_000);
    expect(outstandingAmount(rows)).toBe(500_000);
  });

  it('전액 수납이면 미수금은 0이다', () => {
    expect(outstandingAmount([makePayment({ amount: 300_000, payment_status: '결제완료' })])).toBe(0);
  });

  it('결제 행이 없으면 청구·수납·미수금 모두 0이다', () => {
    expect([billedAmount([]), paidAmount([]), outstandingAmount([])]).toEqual([0, 0, 0]);
  });
});
