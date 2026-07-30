import crypto from 'crypto';

// ==========================================
// 휴대폰 인증(OTP) - 무상태(stateless) 토큰
// ==========================================
// 별도 DB 없이 HMAC 서명 토큰으로 인증번호 발급/검증을 처리한다.
// - challenge 토큰: 발급 시 클라이언트에 전달(인증번호 자체는 들어있지 않고 해시만 포함)
// - verified 토큰: 인증 성공 시 발급, "이 번호는 인증됨"을 증명

// OTP_SERVER_SECRET 미설정 시 추측 가능한 상수로 폴백하면 토큰(관리자·세션·OTP) 위조가
// 가능해진다. 따라서 미설정이면 프로세스마다 무작위 키로 폴백한다 — 서명 자체는 되지만
// 인스턴스 간 검증이 성립하지 않아 어떤 토큰도 신뢰되지 않는다(fail-closed). 즉 env를
// 반드시 설정해야 로그인·인증이 동작하며, 상수 시크릿 유출로 인한 위조는 원천 차단된다.
const SECRET = process.env.OTP_SERVER_SECRET || crypto.randomBytes(32).toString('base64');

if (!process.env.OTP_SERVER_SECRET) {
  console.error('[보안] OTP_SERVER_SECRET 미설정 — 무작위 임시 키로 폴백합니다. 프로덕션에서는 반드시 환경변수를 설정하세요.');
}

const CHALLENGE_TTL_MS = 3 * 60 * 1000;   // 인증번호 유효 3분
const VERIFIED_TTL_MS = 30 * 60 * 1000;   // 인증 완료 상태 유효 30분

function hmac(input: string): string {
  return crypto.createHmac('sha256', SECRET).update(input).digest('base64url');
}

function sign(payload: Record<string, unknown>): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hmac(body)}`;
}

// 서명 검증. 위조·손상 토큰은 예외 없이 null 로만 응답한다.
// 길이 비교는 반드시 바이트 기준이어야 한다 — 문자수로 비교하면 멀티바이트 문자가 섞인
// 토큰이 통과한 뒤 timingSafeEqual(바이트 버퍼)에서 RangeError 로 500 이 난다.
function unsign(token: string): Record<string, unknown> | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(hmac(body));
    if (sigBuf.length !== expectedBuf.length) return null;
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
    const obj = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!obj || typeof obj !== 'object') return null;
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
  // 길이 비교는 unsign 과 동일하게 바이트 기준(문자수 비교 시 timingSafeEqual 이 RangeError).
  const hBuf = Buffer.from(obj.h as string);
  const expectedBuf = Buffer.from(codeHash(phone, code));
  if (hBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(hBuf, expectedBuf);
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

// ==========================================
// 고객 로그인 세션 토큰 (파일 열람 등 보호 자원 접근용)
// ==========================================
// verified 토큰(30분)과 별개로, 로그인 유지 기간 동안 유효한 세션 토큰.
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30일

// 고객 세션 토큰 — OTP 인증 성공 시 발급, 본인 견적서 다운로드에 사용
export function createSession(phone: string): string {
  return sign({ t: 'sess', phone, exp: Date.now() + SESSION_TTL_MS });
}

export function checkSession(token: string, phone: string): boolean {
  const obj = unsign(token);
  return !!(obj && obj.t === 'sess' && obj.phone === phone);
}

// ==========================================
// 관리자 세션 토큰
// ==========================================
// 관리자 토큰은 전체 고객 PII·파일 열람 권한이라 고객 세션(30일)과 수명을 분리한다.
//  - TTL 8시간: 탈취 토큰의 유효 창을 근무 1일 이내로 제한한다.
//  - 비밀번호 바인딩: 발급 시점 ZEROS_ADMIN_PASSWORD 의 해시 프리픽스를 페이로드에 넣고
//    검증 때 현재 비밀번호의 프리픽스와 대조한다. 비밀번호를 바꾸면 프리픽스가 달라져
//    기존 토큰이 전부 즉시 무효가 된다(= 서버 측 일괄 폐기 수단).
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8시간

// 비밀번호 원문은 토큰에 넣지 않는다. 해시 앞 16자만 식별자로 사용한다.
// 미설정(빈 값)이면 ''를 돌려주고 검증은 항상 실패시킨다 — 로그인 자체가 503 인 fail-closed 상태와 일치.
function adminPasswordTag(): string {
  const pw = process.env.ZEROS_ADMIN_PASSWORD || '';
  if (!pw) return '';
  return crypto.createHash('sha256').update(pw).digest('base64url').slice(0, 16);
}

// 관리자 세션 토큰 — 비밀번호 검증 성공 시 발급, 전체 파일 열람에 사용
export function createAdminSession(): string {
  return sign({ t: 'adm', k: adminPasswordTag(), exp: Date.now() + ADMIN_SESSION_TTL_MS });
}

export function checkAdminSession(token: string): boolean {
  const tag = adminPasswordTag();
  if (!tag) return false; // ZEROS_ADMIN_PASSWORD 미설정 = 관리자 권한 없음(fail-closed)
  const obj = unsign(token);
  return !!(obj && obj.t === 'adm' && obj.k === tag);
}
