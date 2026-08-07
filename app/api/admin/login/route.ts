import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { createAdminSession } from '@/lib/otp/token';
import { rateLimit, clientIp } from '@/lib/otp/rateLimit';

// POST /api/admin/login  { password }
// 관리자 비밀번호를 서버에서만 검증한다(클라이언트 번들에 비밀번호 노출 금지).
// 성공 시 관리자 세션 토큰(8시간)을 발급 — 파일 서명 API가 이 토큰을 요구한다.
// 비밀번호 변경: 환경변수 ZEROS_ADMIN_PASSWORD 설정(로컬 .env.local + Vercel).
// 미설정 시 추측 가능한 기본값으로 폴백하지 않는다 — 아예 로그인을 거부한다(fail-closed).
const ADMIN_PASSWORD = process.env.ZEROS_ADMIN_PASSWORD || '';

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export async function POST(req: NextRequest) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  if (!ADMIN_PASSWORD) {
    return Response.json(
      { error: '서버에 관리자 비밀번호(ZEROS_ADMIN_PASSWORD)가 설정되지 않았습니다. 관리자에게 문의해 주세요.' },
      { status: 503 }
    );
  }

  // 브루트포스 완화 — 이 비밀번호 하나가 전 고객 PII·전 파일을 여는 유일한 관문이라
  // 대입 시도 자체를 IP 기준으로 제한한다(15분 5회). 비밀번호 미설정(503) 진단은
  // 시도 제한보다 앞에 둬 라이브 프로브가 env 상태를 계속 읽을 수 있게 한다.
  // 서버리스에서는 인스턴스별 인메모리 베스트에포트다(§13 H-5와 동일 한계 — 완전 방어는 공유 저장소).
  const byIp = rateLimit(`admin:ip:${clientIp(req)}`, 5, 15 * 60 * 1000);
  if (!byIp.ok) {
    return Response.json(
      { error: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 429, headers: { 'Retry-After': String(byIp.retryAfterSec) } }
    );
  }

  const password = body.password || '';
  if (!password || !safeEqual(password, ADMIN_PASSWORD)) {
    return Response.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }

  return Response.json({ adminToken: createAdminSession() });
}
