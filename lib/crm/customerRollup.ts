import type { Customer, Estimate } from '@/types/estimate';
import { supplyAmountOf } from '@/lib/quote/amounts';

// ==========================================
// 고객 누적치 파생 (견적 배열이 유일한 근거)
// ==========================================
// 저장된 카운터(total_requests·total_won·total_revenue)는 가·감산 누락으로 오염될 수 있다.
// 화면 표시는 이 모듈로 매번 다시 계산한 값을 쓴다(저장 카운터는 표시 근거가 아니다).
// 서버 라우트도 import 하므로 'use client' 를 넣지 않는다.

export type CustomerGrade = Customer['customer_grade'];

export interface CustomerRollup {
  total_requests: number;
  total_won: number;
  total_revenue: number;
}

export const CUSTOMER_GRADES: readonly CustomerGrade[] = [
  '신규',
  '재문의',
  '중요고객',
  '수주고객',
  '보류고객',
];

/** 휴대폰 번호 비교 키 — 하이픈·공백 표기 차이를 흡수한다(널 안전). */
export const phoneDigits = (phone?: string | null): string => (phone ?? '').replace(/\D/g, '');

/**
 * 한 고객(휴대폰 번호)의 누적치를 견적 배열에서 파생 계산한다.
 * - total_revenue 는 수주성공 건만 집계하고, 확정 계약금액이 없으면 공급가액으로 대체한다.
 * - 번호가 비어 있으면(식별 불가) 전 건 매칭을 막기 위해 0을 반환한다.
 */
export function rollupCustomer(phone: string, estimates: Estimate[]): CustomerRollup {
  const key = phoneDigits(phone);
  const empty: CustomerRollup = { total_requests: 0, total_won: 0, total_revenue: 0 };
  if (!key || !estimates || estimates.length === 0) return empty;

  const mine = estimates.filter(e => phoneDigits(e?.phone) === key);
  const won = mine.filter(e => e.status === '수주성공');

  return {
    total_requests: mine.length,
    total_won: won.length,
    total_revenue: won.reduce((s, e) => s + (e.confirmed_contract_amount || supplyAmountOf(e)), 0),
  };
}

/**
 * 고객 등급.
 * - 관리자가 지정한 등급(manual)이 있으면 그대로 유지한다(백필 없이 기존 값 보존 — 2026-07-31 결정④).
 *   저장된 문자열이 현행 등급 집합에 없으면(구 값·빈 문자열) 자동 산출로 넘어간다.
 * - 자동 산출: 수주 이력 > 재문의 > 신규.
 */
export function gradeOf(
  manual: string | undefined,
  rolled: { total_requests: number; total_won: number },
): CustomerGrade {
  if (manual && (CUSTOMER_GRADES as readonly string[]).includes(manual)) {
    return manual as CustomerGrade;
  }
  if (rolled.total_won > 0) return '수주고객';
  if (rolled.total_requests > 1) return '재문의';
  return '신규';
}
