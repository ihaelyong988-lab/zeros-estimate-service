import { Estimate, NotificationLog } from '@/types/estimate';
import { isAuthRequiredError } from '@/lib/supabase/client';

// ==========================================
// 내 접수현황 조회 결과 판정 (순수 함수)
// ==========================================
// 조회는 견적·알림 두 요청으로 이뤄진다. 세션이 만료되면 견적은 200(익명 허용목록 행, phone 없음)
// 이고 알림만 401 이라, 두 요청을 Promise.all 로 묶으면 401 하나가 전체를 catch 로 보내고 화면은
// 빈 배열을 "접수된 사전진단 내역이 없습니다"로 확정 표시했다 — 의뢰를 마친 고객에게 접수 건이
// 사라진 것처럼 보였다(2026-08-01 P2-3). 조회는 Promise.allSettled 로 하고, 성공한 쪽 표시와
// 실패 안내를 이 함수가 함께 판정한다. "0건"과 "조회 실패"는 절대 같은 화면으로 합치지 않는다.

export interface RequestsLoadError {
  message: string;      // 화면에 그대로 표시할 문구(안내 + 서버 사유)
  authRequired: boolean; // 401·403 = 다시 눌러도 실패 → 인증부터 다시 받아야 한다
}

export interface RequestsLoadResult {
  estimates: Estimate[];
  logs: NotificationLog[];
  error: RequestsLoadError | null;
}

const digitsOf = (v?: string | null): string => (v || '').replace(/\D/g, '');

// 서버가 알려준 사유를 그대로 보존한다 — 사유를 버리면 고객도 운영자도 원인을 알 수 없다.
const reasonText = (reason: unknown): string => {
  if (reason instanceof Error) return reason.message.trim();
  if (typeof reason === 'string') return reason.trim();
  return '';
};

const compose = (headline: string, reason: unknown): string => {
  const detail = reasonText(reason);
  return detail ? `${headline} ${detail}` : headline;
};

const failure = (headline: string, reason: unknown): RequestsLoadError => ({
  message: compose(headline, reason),
  authRequired: isAuthRequiredError(reason),
});

// 견적·알림 조회 결과를 화면 상태로 환산한다.
//  - 성공한 쪽은 본인 번호 건만 남겨 그대로 표시한다(한쪽 실패가 다른 쪽을 지우지 않는다).
//  - 실패가 있으면 error 를 채운다. estimates 가 0건이어도 error 가 있으면 "0건"이 아니다.
export function resolveRequestsLoad(
  estimateResult: PromiseSettledResult<Estimate[]>,
  logResult: PromiseSettledResult<NotificationLog[]>,
  phone: string
): RequestsLoadResult {
  const target = digitsOf(phone);

  const estimates = estimateResult.status === 'fulfilled'
    ? estimateResult.value.filter((e) => digitsOf(e.phone) === target)
    : [];
  const logs = logResult.status === 'fulfilled'
    ? logResult.value.filter((l) => digitsOf(l.phone) === target)
    : [];

  let error: RequestsLoadError | null = null;
  if (estimateResult.status === 'rejected') {
    error = failure('접수 내역을 불러오지 못했습니다.', estimateResult.reason);
  } else if (logResult.status === 'rejected') {
    // 견적은 표시되고 진행 이력만 비어 있는 상태 — 안내 문구도 실패한 범위만 말한다.
    error = failure('진행 이력을 불러오지 못했습니다.', logResult.reason);
  }

  return { estimates, logs, error };
}
