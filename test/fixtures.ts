import type { Estimate, EstimateLineItem, Payment } from '@/types/estimate';

// ==========================================
// 테스트 픽스처 팩토리 (전 기수 공용)
// ==========================================
// Estimate·Payment·EstimateLineItem 의 필수 필드를 전부 채운 기본값 + Partial 오버라이드.
// 테스트마다 타입 오류를 피하려고 필드를 다시 나열하지 않도록 여기서만 관리한다.

let seq = 0;
const nextSeq = () => ++seq;

/** 견적 픽스처 — 필요한 필드만 override 로 덮어쓴다. */
export function makeEstimate(over: Partial<Estimate> = {}): Estimate {
  const n = nextSeq();
  return {
    id: `est-test-${n}`,
    estimate_no: `ZP-20260731-${String(n).padStart(3, '0')}`,
    created_at: '2026-07-31T00:00:00.000Z',
    customer_name: '홍길동',
    company_name: '테스트산업',
    phone: '010-1234-5678',
    email: 'test@example.com',
    site_address: '경기도 화성시 테스트로 1',
    customer_type: '법인',
    work_type: '배관공사',
    site_type: '공장',
    work_purpose: '노후 배관 교체',
    expected_budget_range: '1,000만~1억',
    desired_schedule: '2026-09',
    urgency: false,
    description: '테스트 견적 요청',
    estimate_category: 'medium',
    status: '접수완료',
    payment_required: false,
    payment_status: '미결제',
    ...over,
  };
}

/** 견적서 라인아이템 픽스처 */
export function makeLineItem(over: Partial<EstimateLineItem> = {}): EstimateLineItem {
  const n = nextSeq();
  return {
    id: `li-test-${n}`,
    name: '배관 자재비',
    spec: 'SUS 304 50A',
    qty: 1,
    unit: '식',
    unit_price: 1_000_000,
    ...over,
  };
}

/** 결제 행 픽스처 */
export function makePayment(over: Partial<Payment> = {}): Payment {
  const n = nextSeq();
  return {
    id: `pay-test-${n}`,
    estimate_id: 'est-test-1',
    payment_type: '출장견적비',
    amount: 300_000,
    payment_status: '미결제',
    created_at: '2026-07-31T00:00:00.000Z',
    ...over,
  };
}
