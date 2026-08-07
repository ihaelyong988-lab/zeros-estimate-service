import { kstToday } from '@/lib/utils/date';
import type { SiteType, WorkType } from '@/types/estimate';

// ─────────────────────────────────────────────────────────────────────────────
// 예상견적 의뢰 폼(RequestWizard)의 순수 로직.
// 불변식: 고객이 고르지 않은 값을 사실처럼 저장하지 않는다.
// (구 폼은 공사 종류를 묻지 않고 '배관공사/공장/신규설치/1개월 이내'를 저장해,
//  프로덕션 접수가 전부 같은 공종으로 남았다 — B1.)
// ─────────────────────────────────────────────────────────────────────────────

// 견적문의 진입 채널 — visit: 견적·출장요청 자료등록 · quick: 무료 견적 신청
export type RequestChannel = 'visit' | 'quick';

// 아직 고르지 않은 상태 = 빈 값. 기본 선택을 두지 않는다.
export type SelectedWorkType = WorkType | '';
export type SelectedSiteType = SiteType | '';

// 허용값의 단일 소스는 types/estimate.ts 다. Record 로 받아 두면 타입에 값이
// 늘거나 줄 때 여기서 컴파일 오류가 나 목록 누락을 막는다.
const WORK_TYPE_PRESENCE: Record<WorkType, true> = {
  '배관공사': true,
  '장비설치': true,
  '배관+장비설치': true,
  'Utility 배관': true,
  '공장증설': true,
  '노후배관교체': true,
  '기계실개선': true,
  '생산설비 배관 연결': true,
  'CAPEX 개·증설 검토': true,
  '기타': true,
};

const SITE_TYPE_PRESENCE: Record<SiteType, true> = {
  '공장': true,
  '상가': true,
  '건물': true,
  '식품': true,
  '제약·바이오': true,
  '물류센터': true,
  '기계실': true,
  '기타': true,
};

export const WORK_TYPE_OPTIONS = Object.keys(WORK_TYPE_PRESENCE) as WorkType[];
export const SITE_TYPE_OPTIONS = Object.keys(SITE_TYPE_PRESENCE) as SiteType[];

// 고객이 고르지 않은 항목에 남기는 값 — 운영자가 미입력임을 바로 알 수 있게 한다.
export const UNSPECIFIED = '미정';

// 문자 인증이 설정되기 전 상태 안내 — 로그인 모달·마이페이지와 같은 문구를 쓴다.
export const SMS_PENDING_NOTICE = '문자 인증 준비 중입니다. 관리자에게 문의해 주세요.';

// 고객이 고른 업종 → 저장할 업종 구분(customer_type).
// 구 폼은 묻지도 않고 '일반'을 넣어 접수가 전부 같은 업종으로 남았다(B1과 같은 유형 — N3).
// 고른 '기타'와 미선택('미정')은 서로 다른 사실이므로 구분해 남긴다.
export const deriveCustomerType = (industry: string): string => industry.trim() || UNSPECIFIED;

// 이메일 형식 — 로컬부·도메인·2자 이상 최상위 도메인을 요구한다.
// 지나치게 엄격하면 정상 주소가 막히므로 실무에서 쓰는 범위까지만 허용한다.
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

export const isValidEmail = (value: string): boolean => EMAIL_RE.test(value.trim());

// 이메일 회신처 검사 — 통과면 null, 아니면 고객에게 보여줄 문구(문구 원천 1곳).
export const validateRequestEmail = (value: string): string | null => {
  if (!value.trim()) return '이메일 회신처를 입력해 주세요.';
  if (!isValidEmail(value)) return '이메일 주소 형식을 확인해 주세요. 예) name@example.com';
  return null;
};

// 희망 방문일 상한 — 출장 일정을 잡을 수 있는 범위.
export const VISIT_DATE_MAX_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

// YYYY-MM-DD 에 일수를 더한다. 날짜만 다루므로 UTC 자정 기준으로 계산해 시차 영향을 받지 않는다.
const shiftDate = (date: string, days: number): string => {
  const base = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(base)) return '';
  return new Date(base + days * DAY_MS).toISOString().slice(0, 10);
};

// date input 의 min·max. 기준일은 KST 오늘이다(§13 — toISOString 직접 사용 금지).
export const visitDateRange = (today: string = kstToday()): { min: string; max: string } => ({
  min: today,
  max: shiftDate(today, VISIT_DATE_MAX_DAYS),
});

// 희망 방문일 검사 — 피커의 min·max 는 키보드 입력으로 우회되므로 판정은 여기서 한다.
export const validateVisitDate = (value: string, today: string = kstToday()): string | null => {
  if (!value.trim()) return '희망 방문일을 선택해 주세요.';
  const { min, max } = visitDateRange(today);
  const rangeNotice = `희망 방문일은 오늘부터 ${VISIT_DATE_MAX_DAYS}일 이내로 선택해 주세요.`;
  if (Number.isNaN(Date.parse(`${value}T00:00:00Z`))) return rangeNotice;
  // 값이 모두 YYYY-MM-DD 라 문자열 비교가 곧 날짜 비교다.
  if (value < min || value > max) return rangeNotice;
  return null;
};

// 접수 후 다시 신청할 때 보존하는 항목 — 로그인 고객의 신원뿐이다.
export interface RequestIdentityFields {
  customer_name: string;
  company_name: string;
  phone: string;
  email: string;
  site_address: string;
}

// '새 등록하기' 초기화. 첨부파일·개인정보 동의를 포함한 직전 접수 내용은 남기지 않는다 —
// 물려주면 고객이 올리지 않은 자료가 다음 접수에 실린다(B9-c).
export const resetRequestFormData = <T extends RequestIdentityFields>(defaults: T, prev: T): T => ({
  ...defaults,
  customer_name: prev.customer_name,
  company_name: prev.company_name,
  phone: prev.phone,
  email: prev.email,
  site_address: prev.site_address,
});

// 폼 값 갱신 + 임시저장을 한 번에. 저장을 호출부 재량으로 두면 빠지는 곳이 생긴다
// (방문 시간대 버튼만 저장에서 누락돼 있었다 — B9-d).
export const patchRequestForm = <T extends object>(
  prev: T,
  patch: Partial<T>,
  persist: (next: T) => void,
): T => {
  const next = { ...prev, ...patch };
  persist(next);
  return next;
};

export interface RequestScopeSubmitInput {
  site_address: string;
  work_type: SelectedWorkType;
  site_type: SelectedSiteType;
  work_purpose: string;
  desired_schedule: string;
  visit_date: string;
}

// STEP1(사업·현장) 필수값 검사 — 통과면 null, 아니면 고객에게 보여줄 문구.
export const validateRequestStep1 = (
  v: RequestScopeSubmitInput,
  channel: RequestChannel | null,
): string | null => {
  if (!v.site_address.trim()) {
    return channel === 'visit' ? '출장 지역(현장 주소)을 입력해 주세요.' : '지역(현장 주소)을 입력해 주세요.';
  }
  if (!v.work_type) return '공사 종류를 선택해 주세요.';
  if (!v.site_type) return '현장 유형을 선택해 주세요.';
  return null;
};

export interface RequestScopeFields {
  work_type: WorkType;
  site_type: SiteType;
  work_purpose: string;
  desired_schedule: string;
}

// 제출 페이로드의 공사 정보. 고객이 고른 값만 싣고, 고르지 않은 항목은 '미정'으로 남긴다.
// 미선택이면 null 을 돌려 검증을 건너뛴 저장 경로를 타입으로 막는다.
export const buildRequestScopeFields = (
  v: RequestScopeSubmitInput,
  channel: RequestChannel | null,
): RequestScopeFields | null => {
  if (!v.work_type || !v.site_type) return null;
  const schedule = channel === 'visit' && v.visit_date ? v.visit_date : v.desired_schedule;
  return {
    work_type: v.work_type,
    site_type: v.site_type,
    work_purpose: v.work_purpose.trim() || UNSPECIFIED,
    desired_schedule: schedule.trim() || UNSPECIFIED,
  };
};

// 임시저장(draft) 버전. 표식이 없는 구 draft 에는 고객이 고르지 않은 공사 정보가
// 들어 있으므로 복구 대상에서 뺀다 — 되살리면 고객 선택으로 둔갑한다.
export const DRAFT_VERSION = 2;

const LEGACY_SCOPE_KEYS = ['work_type', 'site_type', 'work_purpose', 'desired_schedule'] as const;

export const parseRequestDraft = <T extends object>(raw: string | null): Partial<T> => {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  const draft = { ...(parsed as Record<string, unknown>) };
  if (draft.draft_version !== DRAFT_VERSION) {
    for (const key of LEGACY_SCOPE_KEYS) delete draft[key];
  }
  delete draft.draft_version;
  return draft as Partial<T>;
};

// 임시저장 기록 — 버전 표식을 함께 남겨야 다음 복구에서 고객 선택으로 인정된다.
export const serializeRequestDraft = (values: object): string =>
  JSON.stringify({ ...values, draft_version: DRAFT_VERSION });
