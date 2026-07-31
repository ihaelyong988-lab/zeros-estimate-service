import { describe, expect, it } from 'vitest';
import { gradeOf, phoneDigits, rollupCustomer } from '@/lib/crm/customerRollup';
import type { Estimate } from '@/types/estimate';
import { makeEstimate, makeLineItem } from '../fixtures';

// ==========================================
// 고객 누적치·등급 회귀 테스트
// ==========================================
// 누적치는 저장 카운터가 아니라 견적 배열에서 매번 파생 계산한다
// (가산만 하고 차감을 빠뜨린 저장 카운터가 삭제 후에도 남던 결함).
// 결정④: 등급은 백필 없이 수동 지정값을 폴백으로 유지한다.

const PHONE = '010-1234-5678';

describe('phoneDigits', () => {
  it('표기 차이를 흡수하고 널에서도 크래시하지 않는다', () => {
    expect(phoneDigits('010-1234-5678')).toBe('01012345678');
    expect(phoneDigits(' 010 1234 5678 ')).toBe('01012345678');
    expect(phoneDigits(undefined)).toBe('');
    expect(phoneDigits(null)).toBe('');
  });
});

describe('rollupCustomer', () => {
  const base: Estimate[] = [
    makeEstimate({ id: 'est-a', phone: PHONE, status: '검토중', estimated_amount: 50_000_000 }),
    makeEstimate({ id: 'est-b', phone: '01012345678', status: '견적서 송부완료' }),
    makeEstimate({
      id: 'est-c',
      phone: PHONE,
      status: '수주성공',
      confirmed_contract_amount: 30_000_000,
      estimated_amount: 28_000_000,
    }),
  ];

  it('견적 3건 중 1건 수주면 3건·1건·계약액으로 집계한다', () => {
    expect(rollupCustomer(PHONE, base)).toEqual({
      total_requests: 3,
      total_won: 1,
      total_revenue: 30_000_000,
    });
  });

  it('견적을 배열에서 제거하면 누적치가 함께 줄어든다', () => {
    const afterDelete = base.filter(e => e.id !== 'est-c'); // 수주 건 삭제
    expect(rollupCustomer(PHONE, afterDelete)).toEqual({
      total_requests: 2,
      total_won: 0,
      total_revenue: 0,
    });
  });

  it('수주 건의 계약금액을 바꾸면 매출이 즉시 반영된다', () => {
    const revised = base.map(e =>
      e.id === 'est-c' ? { ...e, confirmed_contract_amount: 45_000_000 } : e,
    );
    expect(rollupCustomer(PHONE, revised).total_revenue).toBe(45_000_000);
  });

  it('다른 번호의 견적은 섞이지 않는다', () => {
    const mixed = [...base, makeEstimate({ phone: '010-9999-0000', status: '수주성공' })];
    expect(rollupCustomer(PHONE, mixed).total_requests).toBe(3);
  });

  it('확정 계약금액이 없으면 공급가액으로 대체한다', () => {
    const estimates = [
      makeEstimate({
        phone: PHONE,
        status: '수주성공',
        estimated_amount: 11_000_000, // 구 저장값(VAT 포함)
        line_items: [makeLineItem({ qty: 1, unit_price: 10_000_000 })],
      }),
    ];
    expect(rollupCustomer(PHONE, estimates).total_revenue).toBe(10_000_000);
  });

  it('번호가 비었거나 견적이 없으면 0이다', () => {
    const zero = { total_requests: 0, total_won: 0, total_revenue: 0 };
    expect(rollupCustomer('', base)).toEqual(zero);
    expect(rollupCustomer(PHONE, [])).toEqual(zero);
  });
});

describe('gradeOf', () => {
  it('수동 지정 등급을 그대로 유지한다', () => {
    // 신규 접수가 관리자 지정 등급을 덮어쓰지 않는다.
    expect(gradeOf('중요고객', { total_requests: 1, total_won: 0 })).toBe('중요고객');
    expect(gradeOf('보류고객', { total_requests: 5, total_won: 3 })).toBe('보류고객');
  });

  it('지정 등급이 없으면 수주 이력으로 산출한다', () => {
    expect(gradeOf(undefined, { total_requests: 3, total_won: 1 })).toBe('수주고객');
    expect(gradeOf(undefined, { total_requests: 2, total_won: 0 })).toBe('재문의');
    expect(gradeOf(undefined, { total_requests: 1, total_won: 0 })).toBe('신규');
    expect(gradeOf('', { total_requests: 0, total_won: 0 })).toBe('신규');
  });

  it('현행 등급 집합에 없는 구 값은 자동 산출로 넘어간다', () => {
    expect(gradeOf('VIP', { total_requests: 4, total_won: 2 })).toBe('수주고객');
  });
});
