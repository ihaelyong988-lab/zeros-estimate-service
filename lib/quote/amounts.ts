import type { Estimate, EstimateLineItem } from '@/types/estimate';

// ==========================================
// 금액 단위 단일 진실 (Single Source of Truth)
// ==========================================
// 불변식: `Estimate.estimated_amount` = **공급가액(VAT 별도)**.
// VAT·총액은 저장하지 않고 항상 여기서 파생 계산한다.
// 화면·서버 라우트·엑셀 출력 모두 `supplyAmountOf` / `totalAmountOf` 로만 금액을 읽는다.
// (`est.estimated_amount` 직접 참조 금지 — 구 저장값이 VAT 포함일 수 있어 이중 과세된다.)
// 서버 라우트도 import 하므로 'use client' 를 넣지 않는다.

/** 라인 한 줄 금액 = 수량 × 단가 */
export const lineAmount = (it: EstimateLineItem) => (it.qty || 0) * (it.unit_price || 0);

/** 라인아이템 합계(공급가액) */
export const sumSubtotal = (items: EstimateLineItem[]) =>
  items.reduce((s, it) => s + lineAmount(it), 0);

/** 부가세 = 공급가액의 10%(원 단위 반올림) */
export const vatOf = (supply: number) => Math.round(supply * 0.1);

/** 총액 = 공급가액 + 부가세 */
export const totalOf = (supply: number) => supply + vatOf(supply);

/**
 * 공급가액(VAT 별도) 확정값.
 * - 라인아이템이 있으면 합계를 신뢰한다(관리자가 편집한 최신 근거).
 * - 저장값이 라인 합계의 VAT 포함 총액과 일치하면 구 저장 방식으로 보고 공급가액으로 정규화한다.
 *   (부가세 반올림 오차 ±1원 허용)
 * - 라인아이템이 없으면 저장값을 그대로 공급가액으로 본다.
 */
export function supplyAmountOf(est: Pick<Estimate, 'estimated_amount' | 'line_items'>): number {
  const items = est.line_items;
  const stored = est.estimated_amount || 0;
  if (items && items.length > 0) {
    const sub = sumSubtotal(items);
    if (stored === 0) return sub;
    if (Math.abs(stored - totalOf(sub)) <= 1) return sub; // 구 저장값(VAT 포함) 자동 정규화
    return stored;
  }
  return stored;
}

/** 총액(VAT 포함) 확정값 */
export const totalAmountOf = (est: Pick<Estimate, 'estimated_amount' | 'line_items'>) =>
  totalOf(supplyAmountOf(est));
