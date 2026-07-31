import { describe, expect, it } from 'vitest';
import {
  DataRequestError,
  SESSION_TOKEN_TTL_MS,
  VERIFIED_TOKEN_TTL_MS,
  isAuthRequiredError,
  isEstimateAuthed,
  parseVerifiedRecord,
  pickEstimateAuth,
} from '@/lib/supabase/client';

// ==========================================
// 접수 인증 토큰 전송 판정 회귀 테스트
// ==========================================
// 서버(/api/data op=createEstimate)는 접수 번호와 같은 번호로 발급된
// verifiedToken(30분) 또는 sessionToken(30일) 중 하나를 요구한다.
// 토큰을 싣지 못하면 문자키가 등록되는 순간 모든 접수가 403 으로 막힌다.

const NOW = Date.parse('2026-08-01T09:00:00+09:00');
const PHONE = '010-1234-5678';

const record = (over: Record<string, unknown> = {}) => ({
  phone: PHONE,
  verifiedToken: 'vt',
  verifiedAt: NOW,
  ...over,
});

const session = (over: Record<string, unknown> = {}) => ({
  phone: PHONE,
  sessionToken: 'st',
  verifiedAt: new Date(NOW).toISOString(),
  ...over,
});

describe('pickEstimateAuth', () => {
  it('인증 직후에는 verifiedToken 을 싣는다', () => {
    expect(pickEstimateAuth(PHONE, record(), null, NOW)).toEqual({ verifiedToken: 'vt' });
  });

  it('로그인 세션만 있으면 sessionToken 을 싣는다', () => {
    expect(pickEstimateAuth(PHONE, null, session(), NOW)).toEqual({ sessionToken: 'st' });
  });

  it('둘 다 있으면 둘 다 싣는다 — 서버가 하나만 통과해도 접수된다', () => {
    expect(pickEstimateAuth(PHONE, record(), session(), NOW)).toEqual({
      verifiedToken: 'vt',
      sessionToken: 'st',
    });
  });

  it('하이픈 유무가 달라도 같은 번호로 본다', () => {
    expect(pickEstimateAuth('01012345678', record(), null, NOW)).toEqual({ verifiedToken: 'vt' });
  });

  it('다른 번호로 발급된 토큰은 싣지 않는다', () => {
    const other = { phone: '010-9999-0000' };
    expect(pickEstimateAuth(PHONE, record(other), session(other), NOW)).toEqual({});
  });

  it('접수 번호가 비어 있으면 아무 토큰도 싣지 않는다', () => {
    expect(pickEstimateAuth('', record(), session(), NOW)).toEqual({});
  });

  it('30분이 지난 verifiedToken 은 싣지 않는다', () => {
    const stale = record({ verifiedAt: NOW - VERIFIED_TOKEN_TTL_MS });
    expect(pickEstimateAuth(PHONE, stale, null, NOW)).toEqual({});
  });

  it('30일이 지난 sessionToken 은 싣지 않는다', () => {
    const stale = session({ verifiedAt: new Date(NOW - SESSION_TOKEN_TTL_MS).toISOString() });
    expect(pickEstimateAuth(PHONE, null, stale, NOW)).toEqual({});
  });

  it('발급 시각을 모르면 만료로 단정하지 않는다 — 판정은 서버에 맡긴다', () => {
    const noStamp = pickEstimateAuth(PHONE, record({ verifiedAt: undefined }), session({ verifiedAt: undefined }), NOW);
    expect(noStamp).toEqual({ verifiedToken: 'vt', sessionToken: 'st' });
  });

  it('번호만 저장된 구 기록은 인증으로 인정하지 않는다', () => {
    const legacy = pickEstimateAuth(PHONE, { phone: PHONE }, null, NOW);
    expect(legacy).toEqual({});
    expect(isEstimateAuthed(legacy)).toBe(false);
  });
});

describe('isEstimateAuthed', () => {
  it('실어 보낼 토큰이 하나라도 있으면 인증 완료다', () => {
    expect(isEstimateAuthed({ verifiedToken: 'vt' })).toBe(true);
    expect(isEstimateAuthed({ sessionToken: 'st' })).toBe(true);
  });

  it('토큰이 없으면 인증 완료가 아니다', () => {
    expect(isEstimateAuthed({})).toBe(false);
  });
});

describe('parseVerifiedRecord', () => {
  it('저장된 기록을 그대로 복원한다', () => {
    const raw = JSON.stringify({ phone: PHONE, verifiedToken: 'vt', verifiedAt: NOW });
    expect(parseVerifiedRecord(raw)).toEqual({ phone: PHONE, verifiedToken: 'vt', verifiedAt: NOW });
  });

  it('값이 없거나 형식이 깨졌으면 기록 없음으로 본다', () => {
    expect(parseVerifiedRecord(null)).toBeNull();
    expect(parseVerifiedRecord('')).toBeNull();
    expect(parseVerifiedRecord('{')).toBeNull();
    expect(parseVerifiedRecord('"문자열"')).toBeNull();
  });

  it('타입이 다른 필드는 버린다', () => {
    const raw = JSON.stringify({ phone: 12345, verifiedToken: { a: 1 }, verifiedAt: '어제' });
    expect(parseVerifiedRecord(raw)).toEqual({ phone: undefined, verifiedToken: undefined, verifiedAt: undefined });
  });
});

describe('isAuthRequiredError', () => {
  it('401·403 은 재인증이 필요한 오류다', () => {
    expect(isAuthRequiredError(new DataRequestError('만료', 401))).toBe(true);
    expect(isAuthRequiredError(new DataRequestError('본인 인증이 필요합니다.', 403))).toBe(true);
  });

  it('그 밖의 실패는 재인증 대상이 아니다', () => {
    expect(isAuthRequiredError(new DataRequestError('서버 오류', 500))).toBe(false);
    expect(isAuthRequiredError(new Error('네트워크 오류'))).toBe(false);
    expect(isAuthRequiredError('403')).toBe(false);
  });

  it('서버 메시지를 그대로 전달한다 — 화면이 원인을 보여줄 수 있다', () => {
    expect(new DataRequestError('본인 인증이 필요합니다.', 403).message).toBe('본인 인증이 필요합니다.');
  });
});
