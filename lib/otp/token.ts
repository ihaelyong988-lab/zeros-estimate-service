import crypto from 'crypto';

// ==========================================
// 휴대폰 인증(OTP) - 무상태(stateless) 토큰
// ==========================================
// 별도 DB 없이 HMAC 서명 토큰으로 인증번호 발급/검증을 처리한다.
// - challenge 토큰: 발급 시 클라이언트에 전달(인증번호 자체는 들어있지 않고 해시만 포함)
// - verified 토큰: 인증 성공 시 발급, "이 번호는 인증됨"을 증명

const SECRET = process.env.OTP_SERVER_SECRET || 'dev-insecure-secret-please-set-OTP_SERVER_SECRET';

const CHALLENGE_TTL_MS = 3 * 60 * 1000;   // 인증번호 유효 3분
const VERIFIED_TTL_MS = 30 * 60 * 1000;   // 인증 완료 상태 유효 30분

function hmac(input: string): string {
  return crypto.createHmac('sha256', SECRET).update(input).digest('base64url');
}

function sign(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hmac(body)}`;
}

function unsign(token: string): Record<string, unknown> | null {
  if (!token || typeof token !== 'string') return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = hmac(body);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const obj = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (obj.exp && Date.now() > obj.exp) return null;
    return obj;
  } catch {
    return null;
  }
}

function codeHash(phone: string, code: string): string {
  return hmac(`${phone}:${code}`);
}

// 인증번호 발급용 challenge 토큰 생성
export function createChallenge(phone: string, code: string): string {
  return sign({ t: 'chal', phone, h: codeHash(phone, code), exp: Date.now() + CHALLENGE_TTL_MS });
}

// 입력한 인증번호가 challenge와 일치하는지 검증
export function checkChallenge(token: string, phone: string, code: string): boolean {
  const obj = unsign(token);
  if (!obj || obj.t !== 'chal' || obj.phone !== phone || typeof obj.h !== 'string') return false;
  const expected = codeHash(phone, code);
  if (obj.h.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(obj.h as string), Buffer.from(expected));
}

// 인증 완료 토큰 생성
export function createVerified(phone: string): string {
  return sign({ t: 'ok', phone, exp: Date.now() + VERIFIED_TTL_MS });
}

// 인증 완료 토큰 검증 (제출 시 재확인용)
export function checkVerified(token: string, phone: string): boolean {
  const obj = unsign(token);
  return !!(obj && obj.t === 'ok' && obj.phone === phone);
}
