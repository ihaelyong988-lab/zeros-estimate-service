import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatPhone, isPhoneValid, phoneDigits, requestOtpChallenge, submitOtpCode,
} from '@/lib/otp/verifyClient';

// ==========================================
// 휴대폰 본인인증 클라이언트 회귀 테스트
// ==========================================
// 접수 게이트·로그인 모달·마이페이지 탭 세 화면이 이 한 벌을 공유한다(2026-08-08 통합).
// 여기가 틀어지면 세 화면의 인증이 동시에 막힌다 — 접수가 아예 안 된다.

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

afterEach(() => { vi.unstubAllGlobals(); });

describe('formatPhone', () => {
  it('11자리를 010-0000-0000 으로 끊는다', () => {
    expect(formatPhone('01012345678')).toBe('010-1234-5678');
  });

  it('입력 도중에는 끊긴 만큼만 표시한다', () => {
    expect(formatPhone('010')).toBe('010');
    expect(formatPhone('0101')).toBe('010-1');
    expect(formatPhone('0101234')).toBe('010-1234');
  });

  it('숫자가 아닌 문자는 버리고 11자리를 넘기지 않는다', () => {
    expect(formatPhone('010-1234-5678')).toBe('010-1234-5678');
    expect(formatPhone('010abc12345678999')).toBe('010-1234-5678');
  });
});

describe('isPhoneValid', () => {
  it('국내 휴대폰 10~11자리만 통과시킨다', () => {
    expect(isPhoneValid('01012345678')).toBe(true);
    expect(isPhoneValid('0111234567')).toBe(true);
  });

  it('자릿수·접두가 어긋나면 막는다', () => {
    expect(isPhoneValid('0101234567 8')).toBe(false);
    expect(isPhoneValid('0212345678')).toBe(false);
    expect(isPhoneValid('010123456')).toBe(false);
    expect(isPhoneValid('010123456789')).toBe(false);
  });

  it('연속 호출에도 판정이 흔들리지 않는다(전역 플래그 오염 방지)', () => {
    for (let i = 0; i < 3; i += 1) expect(isPhoneValid('01012345678')).toBe(true);
  });
});

describe('phoneDigits', () => {
  it('표시 문자열에서 숫자만 남긴다', () => {
    expect(phoneDigits('010-1234-5678')).toBe('01012345678');
  });
});

describe('requestOtpChallenge', () => {
  it('서버가 준 token 을 그대로 넘기고 testMode 를 smsPending 으로 환산한다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { token: 'tok-1', testMode: true })));
    await expect(requestOtpChallenge('01012345678')).resolves.toEqual({ token: 'tok-1', smsPending: true });
  });

  it('testMode 가 없으면 안내 배너를 띄우지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { token: 'tok-1' })));
    await expect(requestOtpChallenge('01012345678')).resolves.toEqual({ token: 'tok-1', smsPending: false });
  });

  it('숫자만 담아 /api/otp/send 로 보낸다', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { token: 't' }));
    vi.stubGlobal('fetch', fetchMock);
    await requestOtpChallenge('01012345678');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/otp/send');
    expect(JSON.parse(String(init.body))).toEqual({ phone: '01012345678' });
  });

  it('서버 사유를 버리지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(429, { error: '잠시 후 다시 시도해 주세요.' })));
    await expect(requestOtpChallenge('01012345678')).rejects.toThrow('잠시 후 다시 시도해 주세요.');
  });

  it('사유가 없으면 기본 문구로 알린다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(500, {})));
    await expect(requestOtpChallenge('01012345678')).rejects.toThrow('인증번호 발송에 실패했습니다.');
  });
});

describe('submitOtpCode', () => {
  it('verifiedToken 과 sessionToken 을 둘 다 넘긴다', async () => {
    // 2026-08-01 P2-2: 이 경로가 끊겨 접수는 403, 견적서 다운로드는 401 이 됐다.
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { verifiedToken: 'v-1', sessionToken: 's-1' })));
    await expect(submitOtpCode({ phone: '01012345678', code: '123456', token: 'tok-1' }))
      .resolves.toEqual({ verifiedToken: 'v-1', sessionToken: 's-1' });
  });

  it('phone·code·token 을 그대로 /api/otp/verify 로 보낸다', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { verifiedToken: 'v', sessionToken: 's' }));
    vi.stubGlobal('fetch', fetchMock);
    await submitOtpCode({ phone: '01012345678', code: '123456', token: 'tok-1' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/otp/verify');
    expect(JSON.parse(String(init.body))).toEqual({ phone: '01012345678', code: '123456', token: 'tok-1' });
  });

  it('서버 사유를 버리지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(401, { error: '인증번호가 일치하지 않습니다.' })));
    await expect(submitOtpCode({ phone: '01012345678', code: '000000', token: 't' }))
      .rejects.toThrow('인증번호가 일치하지 않습니다.');
  });

  it('사유가 없으면 기본 문구로 알린다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(500, {})));
    await expect(submitOtpCode({ phone: '01012345678', code: '000000', token: 't' }))
      .rejects.toThrow('인증에 실패했습니다.');
  });
});
