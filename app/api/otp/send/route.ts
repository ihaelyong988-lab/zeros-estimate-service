import type { NextRequest } from 'next/server';
import { createChallenge } from '@/lib/otp/token';
import { sendSms } from '@/lib/sms/send';
import { rateLimit, clientIp } from '@/lib/otp/rateLimit';

// POST /api/otp/send  { phone }
// 인증번호를 생성해 문자로 발송하고, challenge 토큰을 반환한다.
export async function POST(req: NextRequest) {
  let body: { phone?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const phone = (body.phone || '').replace(/[^0-9]/g, '');
  if (!/^01[0-9]{8,9}$/.test(phone)) {
    return Response.json({ error: '올바른 휴대폰 번호를 입력해 주세요.' }, { status: 400 });
  }

  // 발송 남용 완화 — 번호당 1시간 5회, IP당 1시간 20회
  const ip = clientIp(req);
  const byPhone = rateLimit(`send:phone:${phone}`, 5, 60 * 60 * 1000);
  const byIp = rateLimit(`send:ip:${ip}`, 20, 60 * 60 * 1000);
  if (!byPhone.ok || !byIp.ok) {
    return Response.json(
      { error: '인증번호 발송 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 429, headers: { 'Retry-After': String(Math.max(byPhone.retryAfterSec, byIp.retryAfterSec)) } }
    );
  }

  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6자리
  const token = createChallenge(phone, code);
  const text = `[ZEROS] 인증번호 [${code}]를 입력해 주세요. (3분 이내 유효)`;

  let result;
  try {
    result = await sendSms(phone, text);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'SMS 발송 중 오류가 발생했습니다.' },
      { status: 502 }
    );
  }

  // 테스트 모드(키 미설정)일 때만 인증번호를 응답에 포함해 화면에서 확인 가능하게 한다.
  // 실제 SMS 발송 시에는 절대 노출하지 않는다.
  return Response.json({
    token,
    testMode: result.testMode,
    ...(result.testMode ? { devCode: code } : {}),
  });
}
