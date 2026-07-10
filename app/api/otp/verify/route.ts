import type { NextRequest } from 'next/server';
import { checkChallenge, createVerified, createSession } from '@/lib/otp/token';
import { rateLimit, clientIp } from '@/lib/otp/rateLimit';

// POST /api/otp/verify  { phone, code, token }
// 입력한 인증번호를 검증하고, 성공 시 verified 토큰을 반환한다.
export async function POST(req: NextRequest) {
  let body: { phone?: string; code?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const phone = (body.phone || '').replace(/[^0-9]/g, '');
  const code = (body.code || '').replace(/[^0-9]/g, '');
  const token = body.token || '';

  if (!token || code.length < 6) {
    return Response.json({ error: '인증번호 6자리를 입력해 주세요.' }, { status: 400 });
  }

  // 브루트포스 완화 — 번호·IP별 시도 횟수 제한(10분 내 번호당 5회, IP당 30회)
  const ip = clientIp(req);
  const byPhone = rateLimit(`verify:phone:${phone}`, 5, 10 * 60 * 1000);
  const byIp = rateLimit(`verify:ip:${ip}`, 30, 10 * 60 * 1000);
  if (!byPhone.ok || !byIp.ok) {
    return Response.json(
      { error: '인증 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 429, headers: { 'Retry-After': String(Math.max(byPhone.retryAfterSec, byIp.retryAfterSec)) } }
    );
  }

  if (!checkChallenge(token, phone, code)) {
    return Response.json(
      { error: '인증번호가 일치하지 않거나 만료되었습니다. 다시 시도해 주세요.' },
      { status: 400 }
    );
  }

  // sessionToken: 로그인 유지용(30일) — 본인 견적서 파일 열람 시 서버가 재검증한다.
  return Response.json({ verifiedToken: createVerified(phone), sessionToken: createSession(phone) });
}
