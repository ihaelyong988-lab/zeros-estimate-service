// ─────────────────────────────────────────────────────────────────────────────
// 신뢰 지표 단일 소스 (2026-07-31 1단계 F5)
// 같은 주장이 화면마다 다른 숫자로 나오던 문제를 끊기 위해, 신뢰도·누적 표본·회신
// 소요·평균 절감률을 여기 한 곳에서만 정의한다. 화면은 숫자를 직접 적지 않는다.
//
// 대표값 선정 근거
//  - 신뢰도 98.4% : 사업소개·AI Native SOP·우측 검토 패널에 공통으로 쓰이던 값.
//                   구 97.8%(홈/견적검토 밴드)와 공종별 99.2~99.9%는 폐지 —
//                   공종마다 소수 첫째 자리까지 다르게 붙던 값은 근거 없는 차등이다.
//  - 회신 24시간 : 공종 상세·SOP·관리자 패널에 이미 쓰이던 값. 구 "2.1일 이내"는 폐지.
//  - 누적 246건  : 사업소개·SOP·우측 패널 공통. "246건+"의 '+'는 삭제(같은 값 두 표기 금지).
//
// 값을 바꿀 땐 여기만 고친다. 화면에 숫자를 다시 적으면 분산이 재발한다.
// ─────────────────────────────────────────────────────────────────────────────

export const TRUST = {
  /** AI 검증 신뢰도(%) */
  confidenceRate: 98.4,
  /** 누적 검증 건수(건) */
  cumulativeReviews: 246,
  /** 1차 검토 회신 소요(시간) */
  firstReplyHours: 24,
} as const;

/** 지표 라벨 — 같은 숫자를 화면마다 다른 이름으로 부르지 않도록 고정한다. */
export const TRUST_LABEL = {
  confidence: 'AI 신뢰도',
  cumulative: '누적 검증',
  firstReply: '1차 검토 회신',
  saving: '평균 절감 효과',
} as const;

/** 표시 문자열 — 위 수치에서 파생한다(문자열로 수치를 다시 적지 않는다). */
export const TRUST_VALUE = {
  confidence: `${TRUST.confidenceRate}%`,
  cumulative: `${TRUST.cumulativeReviews}건`,
  /** 예: "24시간 이내" */
  firstReply: `${TRUST.firstReplyHours}시간 이내`,
  /** 문장 안에 넣을 때: "…24시간 내 …" */
  firstReplyShort: `${TRUST.firstReplyHours}시간`,
} as const;

/**
 * 평균 절감률(%) — 화면에 실제 렌더되는 공종별 절감률의 산술평균으로만 만든다.
 * 요약값을 따로 하드코딩하면 개별 공종 수치와 어긋난다
 * (구 -31.5%는 공장증설 단일 공종 값을 요약값 자리에 복사해 둔 것이었다).
 * 소수 첫째 자리 반올림.
 */
export const averageSavingRate = (rates: number[]): number =>
  rates.length === 0 ? 0 : Math.round((rates.reduce((sum, r) => sum + r, 0) / rates.length) * 10) / 10;
