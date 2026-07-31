import type { Estimate, Payment } from '@/types/estimate';

// ==========================================
// 결제 상태·미수금 파생 (Payment 행이 유일한 근거)
// ==========================================
// 견적의 결제 상태는 저장 필드가 아니라 Payment 행에서 파생한다.
// 미수금 = 청구액 − 수납액 (계약금 전액 방식 폐기, 2026-07-31 결정①).
// 서버 라우트도 import 하므로 'use client' 를 넣지 않는다.

export type PaymentStatus = Estimate['payment_status'];

const statusOf = (p: Payment | undefined | null): PaymentStatus | undefined => p?.payment_status;

/**
 * Payment 행 배열 → 견적 단위 결제 상태.
 *
 * 우선순위(결제완료 > 결제대기 > 환불 > 미결제) 근거:
 * 1. 수납된 금액이 하나라도 있으면 회계상 '결제완료' 건으로 취급한다(부분 수납 포함).
 * 2. 수납이 없고 진행 중인 결제가 있으면 관리자 액션 대상인 '결제대기'가 화면 신호로 유효하다.
 * 3. 완료·대기가 모두 없고 환불만 남으면 청구가 소멸한 '환불' 건이다.
 * 4. 행이 없거나 전부 미결제면 '미결제'.
 */
export function derivePaymentStatus(payments: Payment[]): PaymentStatus {
  if (!payments || payments.length === 0) return '미결제';
  const has = (s: PaymentStatus) => payments.some(p => statusOf(p) === s);
  if (has('결제완료')) return '결제완료';
  if (has('결제대기')) return '결제대기';
  if (has('환불')) return '환불';
  return '미결제';
}

/** 청구액 = 환불로 소멸하지 않은 행의 합계(미결제 + 결제대기 + 결제완료) */
export function billedAmount(payments: Payment[]): number {
  if (!payments || payments.length === 0) return 0;
  return payments
    .filter(p => statusOf(p) !== '환불')
    .reduce((s, p) => s + (p?.amount || 0), 0);
}

/** 수납액 = 결제완료 행의 합계 */
export function paidAmount(payments: Payment[]): number {
  if (!payments || payments.length === 0) return 0;
  return payments
    .filter(p => statusOf(p) === '결제완료')
    .reduce((s, p) => s + (p?.amount || 0), 0);
}

/** 미수금 = 청구액 − 수납액 (음수는 0으로 절삭) */
export function outstandingAmount(payments: Payment[]): number {
  return Math.max(0, billedAmount(payments) - paidAmount(payments));
}
