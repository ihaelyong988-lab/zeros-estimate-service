import crypto from 'crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ==========================================
// 무상태 HMAC 토큰 회귀 테스트
// ==========================================
// token.ts 는 모듈 최상단에서 OTP_SERVER_SECRET 을 읽고, 관리자 태그는 호출 시점의
// ZEROS_ADMIN_PASSWORD 를 읽는다. env 를 바꾼 효과를 보려면 모듈 레지스트리를 비우고
// 다시 적재해야 하므로 vi.resetModules() + 동적 import 로 로드한다.

const SECRET = 'test-otp-server-secret-0123456789';
const ADMIN_PW = 'test-admin-password';
const PHONE = '01012345678';
const CODE = '123456';

const ORIGINAL_SECRET = process.env.OTP_SERVER_SECRET;
const ORIGINAL_ADMIN_PW = process.env.ZEROS_ADMIN_PASSWORD;

async function loadToken(opts: { secret?: string; adminPassword?: string } = {}) {
  vi.resetModules();
  process.env.OTP_SERVER_SECRET = opts.secret ?? SECRET;
  if (opts.adminPassword === undefined) delete process.env.ZEROS_ADMIN_PASSWORD;
  else process.env.ZEROS_ADMIN_PASSWORD = opts.adminPassword;
  return import('@/lib/otp/token');
}

function payloadOf(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
}

// 서명 1바이트만 뒤집는다 — 길이가 같아야 timingSafeEqual 경로까지 실제로 태울 수 있다.
function tamperSignature(token: string): string {
  const [body, sig] = token.split('.');
  return `${body}.${sig.slice(0, -1)}${sig.endsWith('A') ? 'B' : 'A'}`;
}

// 다른 시크릿으로 서명한 위조 토큰(공격자가 페이로드를 임의로 만든 상황).
function forge(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', 'attacker-secret').update(body).digest('base64url');
  return `${body}.${sig}`;
}

afterEach(() => {
  vi.useRealTimers();
  if (ORIGINAL_SECRET === undefined) delete process.env.OTP_SERVER_SECRET;
  else process.env.OTP_SERVER_SECRET = ORIGINAL_SECRET;
  if (ORIGINAL_ADMIN_PW === undefined) delete process.env.ZEROS_ADMIN_PASSWORD;
  else process.env.ZEROS_ADMIN_PASSWORD = ORIGINAL_ADMIN_PW;
});

describe('OTP challenge 토큰', () => {
  it('발급한 토큰은 같은 번호·인증번호로 검증된다', async () => {
    const { createChallenge, checkChallenge } = await loadToken();
    expect(checkChallenge(createChallenge(PHONE, CODE), PHONE, CODE)).toBe(true);
  });

  it('인증번호나 번호가 다르면 거부한다', async () => {
    const { createChallenge, checkChallenge } = await loadToken();
    const token = createChallenge(PHONE, CODE);
    expect(checkChallenge(token, PHONE, '999999')).toBe(false);
    expect(checkChallenge(token, '01099998888', CODE)).toBe(false);
  });

  it('3분이 지나면 만료된다', async () => {
    const { createChallenge, checkChallenge } = await loadToken();
    const token = createChallenge(PHONE, CODE);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 3 * 60 * 1000 + 1000);
    expect(checkChallenge(token, PHONE, CODE)).toBe(false);
  });

  it('서명을 위조하면 거부한다', async () => {
    const { createChallenge, checkChallenge } = await loadToken();
    const token = createChallenge(PHONE, CODE);
    expect(checkChallenge(tamperSignature(token), PHONE, CODE)).toBe(false);
    expect(checkChallenge('', PHONE, CODE)).toBe(false);
    expect(checkChallenge('본문없음', PHONE, CODE)).toBe(false);
  });
});

describe('인증 완료·고객 세션 토큰', () => {
  it('왕복 검증이 성립하고 다른 번호는 거부한다', async () => {
    const { createVerified, checkVerified, createSession, checkSession } = await loadToken();
    expect(checkVerified(createVerified(PHONE), PHONE)).toBe(true);
    expect(checkVerified(createVerified(PHONE), '01099998888')).toBe(false);
    expect(checkSession(createSession(PHONE), PHONE)).toBe(true);
    expect(checkSession(createSession(PHONE), '01099998888')).toBe(false);
  });

  it('종류가 다른 토큰은 서로 통용되지 않는다', async () => {
    const { createVerified, checkSession, createSession, checkVerified } = await loadToken();
    expect(checkSession(createVerified(PHONE), PHONE)).toBe(false);
    expect(checkVerified(createSession(PHONE), PHONE)).toBe(false);
  });

  it('30분이 지난 인증 완료 토큰은 거부한다', async () => {
    const { createVerified, checkVerified } = await loadToken();
    const token = createVerified(PHONE);
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 30 * 60 * 1000 + 1000);
    expect(checkVerified(token, PHONE)).toBe(false);
  });
});

describe('관리자 세션 토큰', () => {
  it('발급한 토큰은 검증을 통과한다', async () => {
    const { createAdminSession, checkAdminSession } = await loadToken({ adminPassword: ADMIN_PW });
    expect(checkAdminSession(createAdminSession())).toBe(true);
  });

  it('8시간이 지나면 만료된다', async () => {
    const { createAdminSession, checkAdminSession } = await loadToken({ adminPassword: ADMIN_PW });
    const token = createAdminSession();
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 8 * 60 * 60 * 1000 + 1000);
    expect(checkAdminSession(token)).toBe(false);
  });

  it('위조·변조 토큰은 거부한다', async () => {
    const { createAdminSession, checkAdminSession } = await loadToken({ adminPassword: ADMIN_PW });
    const token = createAdminSession();
    const tag = payloadOf(token).k;
    expect(checkAdminSession(tamperSignature(token))).toBe(false);
    expect(checkAdminSession(forge({ t: 'adm', k: tag, exp: Date.now() + 60_000 }))).toBe(false);
  });

  it('비밀번호를 바꾸면 기존 토큰이 무효가 된다', async () => {
    const before = await loadToken({ adminPassword: ADMIN_PW });
    const token = before.createAdminSession();
    const after = await loadToken({ adminPassword: `${ADMIN_PW}-changed` });
    expect(after.checkAdminSession(token)).toBe(false);
  });

  it('ZEROS_ADMIN_PASSWORD 미설정이면 어떤 토큰도 통과하지 못한다', async () => {
    const issued = await loadToken({ adminPassword: ADMIN_PW });
    const token = issued.createAdminSession();
    const unset = await loadToken({ adminPassword: undefined });
    expect(unset.checkAdminSession(token)).toBe(false);
    expect(unset.checkAdminSession(unset.createAdminSession())).toBe(false);
  });

  it('페이로드에 비밀번호의 무염 SHA-256 프리픽스를 담지 않는다', async () => {
    const { createAdminSession } = await loadToken({ adminPassword: ADMIN_PW });
    const unsalted = crypto.createHash('sha256').update(ADMIN_PW).digest('base64url').slice(0, 16);
    expect(payloadOf(createAdminSession()).k).not.toBe(unsalted);
  });

  it('같은 비밀번호라도 서버 시크릿이 다르면 태그가 달라진다 — 오프라인 대입 차단', async () => {
    const a = await loadToken({ adminPassword: ADMIN_PW, secret: SECRET });
    const b = await loadToken({ adminPassword: ADMIN_PW, secret: `${SECRET}-other` });
    expect(payloadOf(b.createAdminSession()).k).not.toBe(payloadOf(a.createAdminSession()).k);
  });
});
