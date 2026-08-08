// ==========================================
// 휴대폰 본인인증 클라이언트 (순수 · 브라우저)
// ==========================================
// 접수 게이트(PhoneVerifyGate)·로그인 모달(CustomerLoginModal)·마이페이지 탭(MyRequestsView)
// 세 화면이 같은 OTP 왕복을 각자 복사해 들고 있었다. 한 곳만 고치면 나머지 두 화면의 인증이
// 조용히 갈라진다 — 요청·판정은 여기 한 곳에만 둔다.
// 서버 라우트: POST /api/otp/send · POST /api/otp/verify (`lib/otp/token.ts` 가 서명한다).

/** 휴대폰 번호를 010-0000-0000 형태로 표시 포맷팅 */
export function formatPhone(v: string): string {
  const d = v.replace(/[^0-9]/g, '').slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

/** 표시 문자열에서 숫자만 남긴다 — 서버로는 항상 숫자만 보낸다. */
export function phoneDigits(v: string): string {
  return v.replace(/[^0-9]/g, '');
}

/** 국내 휴대폰 10~11자리. 전역 플래그가 없어 재사용해도 lastIndex 오염이 없다. */
const PHONE_PATTERN = /^01[0-9]{8,9}$/;

export function isPhoneValid(digits: string): boolean {
  return PHONE_PATTERN.test(digits);
}

export interface OtpChallenge {
  token: string;
  /** 문자 발송 키 미설정(테스트 모드) — 화면은 안내 배너를 띄운다. */
  smsPending: boolean;
}

export interface OtpSession {
  /** 접수 1건을 서버가 승인하는 단발 토큰. */
  verifiedToken: string;
  /** 로그인 유지(30일) — 본인 견적서 파일 열람 시 서버가 재검증한다. */
  sessionToken: string;
}

export async function requestOtpChallenge(digits: string): Promise<OtpChallenge> {
  const res = await fetch('/api/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: digits }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '인증번호 발송에 실패했습니다.');
  return { token: data.token, smsPending: data.testMode === true };
}

export async function submitOtpCode(input: { phone: string; code: string; token: string }): Promise<OtpSession> {
  const res = await fetch('/api/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '인증에 실패했습니다.');
  // 두 토큰을 모두 넘긴다 — 끊기면 접수가 403, 견적서 다운로드가 401 이 된다(2026-08-01 P2-2).
  return { verifiedToken: data.verifiedToken, sessionToken: data.sessionToken };
}
