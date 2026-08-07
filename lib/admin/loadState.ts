import { isAuthRequiredError } from '@/lib/supabase/client';

// ==========================================
// 관리자 화면 조회 실패 판정 (순수 함수)
// ==========================================
// 관리자 토큰 TTL 이 8시간이라 세션 만료는 매일 재현된다. 그때 집계를 0 으로, 목록을
// "없습니다" 로 그리면 운영자는 그것을 사실로 읽는다 — 미수금 0 은 회수 활동을 멈춘다.
// 조회가 실패하면 값이 아니라 원인을 표시한다. 실패 종류(재로그인 필요 / 그 외)도 구분한다.

export interface AdminLoadError {
  message: string;       // 화면에 그대로 표시할 문구
  authRequired: boolean; // 401·403 = 다시 눌러도 실패 → 인증부터 다시 받아야 한다
}

// 접수 목록(EstimateList)과 같은 문구를 쓴다 — 같은 원인에 화면마다 다른 말을 하지 않는다.
export const ADMIN_SESSION_EXPIRED_MESSAGE = '관리자 세션이 만료되었습니다. 다시 로그인해 주세요.';

// 값이 확정되지 않은 자리 표기. 조회에 실패한 칸에 0 을 넣으면 그 0 이 사실로 읽힌다.
export const UNRESOLVED = '—';

// 서버가 알려준 사유를 보존한다 — 사유를 버리면 운영자가 원인을 알 수 없다.
const reasonText = (reason: unknown): string => {
  if (reason instanceof Error) return reason.message.trim();
  if (typeof reason === 'string') return reason.trim();
  return '';
};

// 조회 실패를 화면 상태로 환산한다.
//  - 인증 오류(401·403)는 재로그인 경로를 알린다. 서버 사유는 덧붙이지 않는다(문구 2문장 유지).
//  - 그 외 오류는 무엇을 못 불러왔는지 + 서버 사유를 함께 알린다.
export function resolveAdminLoadError(headline: string, reason: unknown): AdminLoadError {
  if (isAuthRequiredError(reason)) {
    return { message: ADMIN_SESSION_EXPIRED_MESSAGE, authRequired: true };
  }
  const detail = reasonText(reason);
  return { message: detail ? `${headline} ${detail}` : headline, authRequired: false };
}
