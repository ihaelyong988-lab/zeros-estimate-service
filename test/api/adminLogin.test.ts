import type { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ==========================================
// 관리자 로그인 라우트 회귀 테스트
// ==========================================
// 이 비밀번호 하나가 전 고객 PII·전 파일을 여는 유일한 관문이라, 무제한 대입이
// 가능하면 관문 자체가 없는 것과 같다. 라우트와 레이트리밋 저장소가 모두 모듈
// 최상단 상태를 들고 있으므로 테스트마다 vi.resetModules() + 동적 import 로 새로 적재한다.

const ADMIN_PW = 'test-admin-password';
const ORIGINAL_SECRET = process.env.OTP_SERVER_SECRET;
const ORIGINAL_ADMIN_PW = process.env.ZEROS_ADMIN_PASSWORD;

// null = ZEROS_ADMIN_PASSWORD 미설정 상태. undefined 를 쓰면 기본 매개변수가 삼켜 버린다.
async function loadRoute(adminPassword: string | null = ADMIN_PW) {
  vi.resetModules();
  process.env.OTP_SERVER_SECRET = 'test-otp-server-secret-0123456789';
  if (adminPassword === null) delete process.env.ZEROS_ADMIN_PASSWORD;
  else process.env.ZEROS_ADMIN_PASSWORD = adminPassword;
  return import('@/app/api/admin/login/route');
}

type Handler = (req: NextRequest) => Promise<Response>;

function login(POST: Handler, password: unknown, ip = '198.51.100.7'): Promise<Response> {
  const req = new Request('http://localhost/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ password }),
  });
  return POST(req as unknown as NextRequest);
}

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.OTP_SERVER_SECRET;
  else process.env.OTP_SERVER_SECRET = ORIGINAL_SECRET;
  if (ORIGINAL_ADMIN_PW === undefined) delete process.env.ZEROS_ADMIN_PASSWORD;
  else process.env.ZEROS_ADMIN_PASSWORD = ORIGINAL_ADMIN_PW;
});

describe('POST /api/admin/login — 기존 분기', () => {
  it('올바른 비밀번호면 검증을 통과하는 관리자 토큰을 발급한다', async () => {
    const { POST } = await loadRoute();
    const res = await login(POST, ADMIN_PW);
    expect(res.status).toBe(200);
    const { adminToken } = (await res.json()) as { adminToken: string };
    const { checkAdminSession } = await import('@/lib/otp/token');
    expect(checkAdminSession(adminToken)).toBe(true);
  });

  it('틀린 비밀번호는 401 이고 메시지를 유지한다', async () => {
    const { POST } = await loadRoute();
    const res = await login(POST, 'wrong');
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('비밀번호가 올바르지 않습니다.');
  });

  it('본문이 JSON 이 아니면 400 이다', async () => {
    const { POST } = await loadRoute();
    const req = new Request('http://localhost/api/admin/login', { method: 'POST', body: '{' });
    const res = await (POST as Handler)(req as unknown as NextRequest);
    expect(res.status).toBe(400);
  });

  it('ZEROS_ADMIN_PASSWORD 미설정이면 503 이고, 시도 제한이 이 진단을 가리지 않는다', async () => {
    const { POST } = await loadRoute(null);
    for (let i = 0; i < 8; i += 1) {
      const res = await login(POST, 'anything', '203.0.113.9');
      expect(res.status).toBe(503);
    }
  });
});

describe('POST /api/admin/login — 시도 제한', () => {
  it('같은 IP 로 5회를 넘기면 429 와 Retry-After 를 준다', async () => {
    const { POST } = await loadRoute();
    const ip = '198.51.100.21';
    for (let i = 0; i < 5; i += 1) {
      expect((await login(POST, `wrong-${i}`, ip)).status).toBe(401);
    }
    const blocked = await login(POST, 'wrong-5', ip);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('제한에 걸린 IP 는 올바른 비밀번호도 통과하지 못한다', async () => {
    const { POST } = await loadRoute();
    const ip = '198.51.100.22';
    for (let i = 0; i < 5; i += 1) await login(POST, `wrong-${i}`, ip);
    expect((await login(POST, ADMIN_PW, ip)).status).toBe(429);
  });

  it('제한은 IP 단위다 — 다른 IP 는 영향받지 않는다', async () => {
    const { POST } = await loadRoute();
    const ip = '198.51.100.23';
    for (let i = 0; i < 6; i += 1) await login(POST, `wrong-${i}`, ip);
    expect((await login(POST, 'wrong', ip)).status).toBe(429);
    expect((await login(POST, 'wrong', '198.51.100.24')).status).toBe(401);
  });

  it('x-forwarded-for 를 위조해도 마지막 홉으로 집계해 제한을 우회하지 못한다', async () => {
    const { POST } = await loadRoute();
    for (let i = 0; i < 5; i += 1) {
      expect((await login(POST, 'wrong', `10.0.0.${i}, 198.51.100.25`)).status).toBe(401);
    }
    const blocked = await login(POST, 'wrong', '10.0.0.99, 198.51.100.25');
    expect(blocked.status).toBe(429);
  });
});
