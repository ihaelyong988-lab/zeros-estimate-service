import { describe, expect, it } from 'vitest';
import { resolveRequestsLoad } from '@/lib/requests/loadOutcome';
import { DataRequestError } from '@/lib/supabase/client';
import { Estimate, NotificationLog } from '@/types/estimate';

// ==========================================
// 내 접수현황 조회 결과 판정 회귀 테스트
// ==========================================
// 세션 만료 시 견적은 200(허용목록 행) · 알림은 401 이 난다. 두 요청을 Promise.all 로 묶어
// 401 하나로 전체를 catch 로 보내면, 빈 배열이 "접수된 사전진단 내역이 없습니다"로 표시되어
// 접수 건이 사라진 것처럼 보인다(2026-08-01 P2-3). 실패는 0건과 분리해 알린다.

const PHONE = '010-1234-5678';

const estimate = (over: Partial<Estimate> = {}): Estimate => ({
  id: 'est-1',
  estimate_no: 'ZR-2026-0001',
  customer_name: '홍길동',
  phone: PHONE,
  status: '접수완료',
  work_type: '배관 SPOOL Module',
  site_type: '공장',
  created_at: '2026-07-30T01:00:00.000Z',
  ...over,
} as Estimate);

const log = (over: Partial<NotificationLog> = {}): NotificationLog => ({
  id: 'log-1',
  estimate_no: 'ZR-2026-0001',
  phone: PHONE,
  template_code: 'ZR_REG_COMPLETE',
  content: '접수가 완료되었습니다.',
  sent_at: '2026-07-30T01:05:00.000Z',
  ...over,
} as NotificationLog);

const ok = <T,>(value: T): PromiseSettledResult<T> => ({ status: 'fulfilled', value });
const fail = <T,>(reason: unknown): PromiseSettledResult<T> => ({ status: 'rejected', reason });

describe('resolveRequestsLoad', () => {
  it('둘 다 성공하면 본인 번호 건만 남기고 오류는 없다', () => {
    const r = resolveRequestsLoad(
      ok([estimate(), estimate({ id: 'est-2', phone: '010-9999-8888' })]),
      ok([log(), log({ id: 'log-2', phone: '010-9999-8888' })]),
      PHONE
    );
    expect(r.estimates.map((e) => e.id)).toEqual(['est-1']);
    expect(r.logs.map((l) => l.id)).toEqual(['log-1']);
    expect(r.error).toBeNull();
  });

  it('번호 표기가 달라도(하이픈·공백) 같은 번호로 판정한다', () => {
    const r = resolveRequestsLoad(ok([estimate({ phone: '01012345678' })]), ok([]), PHONE);
    expect(r.estimates).toHaveLength(1);
  });

  it('알림만 401 이면 견적 목록은 그대로 표시하고 오류만 얹는다', () => {
    const r = resolveRequestsLoad(
      ok([estimate()]),
      fail(new DataRequestError('로그인 세션이 만료되었습니다.', 401)),
      PHONE
    );
    expect(r.estimates).toHaveLength(1);
    expect(r.logs).toEqual([]);
    expect(r.error).toEqual({
      message: '진행 이력을 불러오지 못했습니다. 로그인 세션이 만료되었습니다.',
      authRequired: true,
    });
  });

  it('세션 만료(견적 200 허용목록 + 알림 401)를 0건으로 위장하지 않는다', () => {
    // 서버가 돌려준 익명 허용목록 행 — phone 이 비어 있어 본인 건 필터에서 0 건이 된다.
    const r = resolveRequestsLoad(
      ok([estimate({ id: 'est-anon', phone: '' })]),
      fail(new DataRequestError('로그인 세션이 만료되었습니다.', 401)),
      PHONE
    );
    expect(r.estimates).toEqual([]);
    expect(r.error).not.toBeNull();
    expect(r.error?.authRequired).toBe(true);
  });

  it('견적 조회가 실패하면 접수 내역 안내와 서버 사유를 함께 낸다', () => {
    const r = resolveRequestsLoad(
      fail(new DataRequestError('로그인 세션이 만료되었습니다.', 401)),
      ok([log()]),
      PHONE
    );
    expect(r.estimates).toEqual([]);
    expect(r.logs).toHaveLength(1);
    expect(r.error?.message).toBe('접수 내역을 불러오지 못했습니다. 로그인 세션이 만료되었습니다.');
    expect(r.error?.authRequired).toBe(true);
  });

  it('서버 오류(500)는 재인증이 아니라 재시도 대상이다', () => {
    const r = resolveRequestsLoad(
      fail(new DataRequestError('데이터 요청에 실패했습니다.', 500)),
      fail(new DataRequestError('데이터 요청에 실패했습니다.', 500)),
      PHONE
    );
    expect(r.error?.authRequired).toBe(false);
    expect(r.error?.message).toBe('접수 내역을 불러오지 못했습니다. 데이터 요청에 실패했습니다.');
  });

  it('사유를 알 수 없는 실패는 안내 문구만 낸다', () => {
    const r = resolveRequestsLoad(fail(undefined), ok([]), PHONE);
    expect(r.error?.message).toBe('접수 내역을 불러오지 못했습니다.');
    expect(r.error?.authRequired).toBe(false);
  });
});
