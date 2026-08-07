import { describe, expect, it } from 'vitest';
import type { Estimate, EstimateStatus } from '@/types/estimate';
import {
  contractTransitionOf,
  contractFieldsForStatusChange,
} from '@/components/admin/KanbanBoard';
import { makeEstimate, makeLineItem } from '../fixtures';

// ==========================================
// 수주성공 전이 · 확정 계약금액 회귀 테스트 (2026-08-07 B7)
// ==========================================
// 칸반에서 카드를 '수주성공'으로 드롭하면 확정 계약금액·수주 확정일이 기록되는데
// (lib/supabase/client.ts updateEstimate), 잘못 드롭한 뒤 상태를 되돌려도 그 값이 남아
// 이후 실제 계약액을 덮어썼다 — 매출(PerformanceDashboard)·고객 누적치(customerRollup)가
// 함께 오염된다. 전이 판정과 금액 패치를 순수 함수로 고정한다.

const NOW = '2026-08-07T01:00:00.000Z';
const LATER = '2026-08-09T04:30:00.000Z';

/** 화면·서비스가 실제로 하는 병합 순서 그대로 전이를 적용한다. */
const applyTransition = (
  est: Estimate,
  next: EstimateStatus,
  opts: { amount?: number; now?: string } = {},
): Estimate => ({
  ...est,
  ...contractFieldsForStatusChange(est, next, opts),
  status: next,
});

describe('contractTransitionOf', () => {
  it('수주성공으로 들어오면 enter', () => {
    expect(contractTransitionOf('견적서 송부완료', '수주성공')).toBe('enter');
    expect(contractTransitionOf('접수완료', '수주성공')).toBe('enter');
  });

  it('수주성공에서 나가면 leave', () => {
    expect(contractTransitionOf('수주성공', '수주실패')).toBe('leave');
    expect(contractTransitionOf('수주성공', '보류')).toBe('leave');
    expect(contractTransitionOf('수주성공', '견적서 송부완료')).toBe('leave');
  });

  it('수주성공을 유지하거나 무관한 전이는 none', () => {
    expect(contractTransitionOf('수주성공', '수주성공')).toBe('none');
    expect(contractTransitionOf('검토중', '견적서 작성중')).toBe('none');
  });
});

describe('contractFieldsForStatusChange — 수주성공 진입', () => {
  it('운영자가 입력한 계약금액과 수주 확정일을 설정한다', () => {
    const est = makeEstimate({ status: '견적서 송부완료', estimated_amount: 30_000_000 });
    const after = applyTransition(est, '수주성공', { amount: 28_500_000, now: NOW });

    expect(after.confirmed_contract_amount).toBe(28_500_000);
    expect(after.contract_won_at).toBe(NOW);
  });

  it('입력값이 없으면 공급가액(VAT 별도)을 계약금액 근거로 쓴다', () => {
    const est = makeEstimate({
      status: '견적서 송부완료',
      line_items: [makeLineItem({ qty: 2, unit_price: 5_000_000 })],
      // 구 저장값(VAT 포함) — supplyAmountOf 가 공급가액으로 정규화한다
      estimated_amount: 11_000_000,
    });
    const after = applyTransition(est, '수주성공', { now: NOW });

    expect(after.confirmed_contract_amount).toBe(10_000_000);
  });

  it('이미 확정된 계약금액이 있으면 파생값보다 우선한다', () => {
    const est = makeEstimate({
      status: '견적서 송부완료',
      estimated_amount: 30_000_000,
      confirmed_contract_amount: 27_000_000,
    });
    const after = applyTransition(est, '수주성공', { now: NOW });

    expect(after.confirmed_contract_amount).toBe(27_000_000);
  });

  it('금액 근거가 전혀 없으면 계약금액 키를 넣지 않는다(0 저장 금지)', () => {
    const est = makeEstimate({ status: '견적서 송부완료', estimated_amount: undefined });
    const patch = contractFieldsForStatusChange(est, '수주성공', { now: NOW });

    expect(Object.keys(patch)).not.toContain('confirmed_contract_amount');
    expect(patch.contract_won_at).toBe(NOW);
  });
});

describe('contractFieldsForStatusChange — 수주성공 이탈', () => {
  const won = () =>
    makeEstimate({
      status: '수주성공',
      estimated_amount: 30_000_000,
      confirmed_contract_amount: 30_000_000,
      contract_won_at: NOW,
    });

  it('확정 계약금액과 수주 확정일을 되돌린다', () => {
    const after = applyTransition(won(), '견적서 송부완료');

    expect(after.confirmed_contract_amount).toBeUndefined();
    expect(after.contract_won_at).toBeUndefined();
    expect(after.estimated_amount).toBe(30_000_000); // 견적금액은 건드리지 않는다
  });

  it('두 필드의 키를 남긴 채 undefined 로 돌려준다 — 키가 없으면 병합에서 값이 살아남는다', () => {
    const patch = contractFieldsForStatusChange(won(), '보류');

    expect(Object.keys(patch)).toContain('confirmed_contract_amount');
    expect(Object.keys(patch)).toContain('contract_won_at');
  });

  it('저장 직렬화 후에도 두 필드가 남지 않는다', () => {
    const after = applyTransition(won(), '취소');
    const persisted = JSON.parse(JSON.stringify(after)) as Estimate;

    expect('confirmed_contract_amount' in persisted).toBe(false);
    expect('contract_won_at' in persisted).toBe(false);
  });
});

describe('contractFieldsForStatusChange — 멱등', () => {
  it('수주성공 진입을 두 번 적용해도 결과가 같다', () => {
    const est = makeEstimate({ status: '견적서 송부완료', estimated_amount: 30_000_000 });
    const first = applyTransition(est, '수주성공', { amount: 28_500_000, now: NOW });
    const second = applyTransition(first, '수주성공', { amount: 28_500_000, now: LATER });

    expect(second).toEqual(first);
  });

  it('수주성공 이탈을 두 번 적용해도 결과가 같다', () => {
    const est = makeEstimate({
      status: '수주성공',
      confirmed_contract_amount: 30_000_000,
      contract_won_at: NOW,
    });
    const first = applyTransition(est, '보류');
    const second = applyTransition(first, '보류');

    expect(second).toEqual(first);
  });

  it('수주성공과 무관한 전이는 계약 필드를 건드리지 않는다', () => {
    const est = makeEstimate({ status: '검토중', estimated_amount: 30_000_000 });
    const patch = contractFieldsForStatusChange(est, '견적서 작성중', { now: NOW });

    expect(patch).toEqual({});
  });
});
