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
