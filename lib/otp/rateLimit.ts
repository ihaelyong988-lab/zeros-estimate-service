// ==========================================
// 경량 인메모리 레이트리밋 (OTP 브루트포스 완화)
// ==========================================
// OTP challenge 는 무상태(HMAC) 토큰이라 서버 저장 시도 카운터가 없어, 같은 번호로
// 인증번호 6자리(10^6)를 무제한 재시도할 수 있었다. 별도 저장소 없이 프로세스 메모리로
// 시도 횟수를 제한한다. 서버리스에서는 인스턴스별·베스트에포트지만 자동 대입 비용을
// 크게 높인다(완전한 방어는 Redis 등 공유 저장소 필요 — 후속 과제).

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// 메모리 누수 방지 — 접근 시 만료 버킷을 정리한다.
function sweep(now: number) {
  if (store.size < 500) return;
  for (const [k, b] of store) {
    if (now > b.resetAt) store.delete(k);
  }
}

export interface RateResult {
  ok: boolean;
  retryAfterSec: number;
}

/** key 기준으로 windowMs 동안 max 회까지 허용. 초과 시 ok=false. */
export function rateLimit(key: string, max: number, windowMs: number): RateResult {
  const now = Date.now();
  sweep(now);
  const b = store.get(key);
  if (!b || now > b.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (b.count >= max) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/** 요청 IP 추출(프록시 헤더 우선). 없으면 'unknown'. */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}
