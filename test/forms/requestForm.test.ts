import { describe, expect, it, vi } from 'vitest';
import {
  DRAFT_VERSION,
  SITE_TYPE_OPTIONS,
  UNSPECIFIED,
  VISIT_DATE_MAX_DAYS,
  WORK_TYPE_OPTIONS,
  buildRequestScopeFields,
  deriveCustomerType,
  isValidEmail,
  parseRequestDraft,
  patchRequestForm,
  resetRequestFormData,
  validateRequestEmail,
  validateRequestStep1,
  validateVisitDate,
  visitDateRange,
  type RequestScopeSubmitInput,
} from '@/lib/forms/requestForm';

// ==========================================
// 의뢰 폼 공사 정보(B1) 회귀 테스트
// ==========================================
// 불변식: 고객이 고르지 않은 값을 사실처럼 저장하지 않는다.
// 프로덕션 접수 2건이 전부 '배관공사/공장'으로 저장된 원인 = 입력 없는 임의 기본값.

const step1 = (over: Partial<RequestScopeSubmitInput> = {}): RequestScopeSubmitInput => ({
  site_address: '경기도 화성시 향남읍 식품공단로 42',
  work_type: '노후배관교체',
  site_type: '식품',
  work_purpose: '',
  desired_schedule: '',
  visit_date: '',
  ...over,
});

describe('WORK_TYPE_OPTIONS · SITE_TYPE_OPTIONS', () => {
  it('types/estimate.ts 의 허용값을 그대로 노출한다', () => {
    expect(WORK_TYPE_OPTIONS).toEqual([
      '배관공사',
      '장비설치',
      '배관+장비설치',
      'Utility 배관',
      '공장증설',
      '노후배관교체',
      '기계실개선',
      '생산설비 배관 연결',
      'CAPEX 개·증설 검토',
      '기타',
    ]);
    expect(SITE_TYPE_OPTIONS).toEqual([
      '공장',
      '상가',
      '건물',
      '식품',
      '제약·바이오',
      '물류센터',
      '기계실',
      '기타',
    ]);
  });

  it('중복 항목이 없다', () => {
    expect(new Set(WORK_TYPE_OPTIONS).size).toBe(WORK_TYPE_OPTIONS.length);
    expect(new Set(SITE_TYPE_OPTIONS).size).toBe(SITE_TYPE_OPTIONS.length);
  });
});

describe('validateRequestStep1', () => {
  it('공사 종류를 고르지 않으면 STEP1 을 통과하지 못한다', () => {
    expect(validateRequestStep1(step1({ work_type: '' }), 'quick')).toBe('공사 종류를 선택해 주세요.');
  });

  it('현장 유형을 고르지 않으면 STEP1 을 통과하지 못한다', () => {
    expect(validateRequestStep1(step1({ site_type: '' }), 'quick')).toBe('현장 유형을 선택해 주세요.');
  });

  it('공사 종류·현장 유형을 고르면 통과한다', () => {
    expect(validateRequestStep1(step1(), 'quick')).toBeNull();
    expect(validateRequestStep1(step1(), 'visit')).toBeNull();
  });

  it('현장 주소 문구는 채널에 따라 다르다', () => {
    expect(validateRequestStep1(step1({ site_address: '   ' }), 'visit')).toBe('출장 지역(현장 주소)을 입력해 주세요.');
    expect(validateRequestStep1(step1({ site_address: '' }), 'quick')).toBe('지역(현장 주소)을 입력해 주세요.');
  });

  it('주소가 비어 있으면 주소를 먼저 알린다', () => {
    const empty = step1({ site_address: '', work_type: '', site_type: '' });
    expect(validateRequestStep1(empty, 'quick')).toBe('지역(현장 주소)을 입력해 주세요.');
  });
});

describe('buildRequestScopeFields', () => {
  it('고객이 고른 값을 그대로 싣는다', () => {
    const fields = buildRequestScopeFields(step1({ work_type: '기계실개선', site_type: '물류센터' }), 'quick');
    expect(fields?.work_type).toBe('기계실개선');
    expect(fields?.site_type).toBe('물류센터');
  });

  it('고르지 않은 공사 목적·희망 일정에 임의 기본값을 넣지 않는다', () => {
    const fields = buildRequestScopeFields(step1(), 'quick');
    expect(fields?.work_purpose).toBe(UNSPECIFIED);
    expect(fields?.work_purpose).not.toBe('신규설치');
    expect(fields?.desired_schedule).toBe(UNSPECIFIED);
    expect(fields?.desired_schedule).not.toBe('1개월 이내');
  });

  it('출장 채널은 고객이 고른 희망 방문일을 희망 일정으로 싣는다', () => {
    const fields = buildRequestScopeFields(step1({ visit_date: '2026-08-20' }), 'visit');
    expect(fields?.desired_schedule).toBe('2026-08-20');
  });

  it('무료 견적 채널은 방문일이 있어도 희망 일정으로 쓰지 않는다', () => {
    const fields = buildRequestScopeFields(step1({ visit_date: '2026-08-20' }), 'quick');
    expect(fields?.desired_schedule).toBe(UNSPECIFIED);
  });

  it('공사 종류·현장 유형이 비어 있으면 페이로드를 만들지 않는다', () => {
    expect(buildRequestScopeFields(step1({ work_type: '' }), 'quick')).toBeNull();
    expect(buildRequestScopeFields(step1({ site_type: '' }), 'quick')).toBeNull();
  });
});

// 임시저장에서 복구되는 폼 값 중 이 테스트가 보는 부분만
interface DraftShape {
  site_address: string;
  email: string;
  work_type: string;
  site_type: string;
  work_purpose: string;
  desired_schedule: string;
}

describe('parseRequestDraft', () => {
  it('구 버전 임시저장의 공사 정보 기본값은 복구하지 않는다', () => {
    const legacy = JSON.stringify({
      site_address: '경기도 화성시',
      email: 'name@example.com',
      work_type: '배관공사',
      site_type: '공장',
      work_purpose: '신규설치',
      desired_schedule: '1개월 이내',
    });
    const restored = parseRequestDraft<DraftShape>(legacy);
    expect(restored.site_address).toBe('경기도 화성시');
    expect(restored.email).toBe('name@example.com');
    expect(restored.work_type).toBeUndefined();
    expect(restored.site_type).toBeUndefined();
    expect(restored.work_purpose).toBeUndefined();
    expect(restored.desired_schedule).toBeUndefined();
  });

  it('현재 버전 임시저장은 고객이 고른 공사 정보를 그대로 복구한다', () => {
    const draft = JSON.stringify({
      draft_version: DRAFT_VERSION,
      work_type: '공장증설',
      site_type: '제약·바이오',
    });
    const restored = parseRequestDraft<DraftShape>(draft);
    expect(restored.work_type).toBe('공장증설');
    expect(restored.site_type).toBe('제약·바이오');
  });

  it('버전 표식은 폼 값으로 복구하지 않는다', () => {
    const restored = parseRequestDraft(JSON.stringify({ draft_version: DRAFT_VERSION, email: 'a@b.c' }));
    expect('draft_version' in restored).toBe(false);
  });

  it('없거나 깨진 임시저장은 빈 값으로 본다', () => {
    expect(parseRequestDraft(null)).toEqual({});
    expect(parseRequestDraft('{')).toEqual({});
    expect(parseRequestDraft('[1,2]')).toEqual({});
    expect(parseRequestDraft('"문자열"')).toEqual({});
  });
});

// ==========================================
// B9-a 이메일 형식 검증
// ==========================================
// 구 검사는 공백 여부뿐이라 'name' 한 글자로도 접수됐고, 회신처가 닿지 않는 건이 남았다.

describe('isValidEmail · validateRequestEmail', () => {
  it('형식이 아닌 값을 거부한다', () => {
    for (const bad of ['name', 'name@', '@example.com', 'name@example', 'name@example.', 'name @example.com', '홍길동@example.com', 'name@exa mple.com', 'name@.com']) {
      expect(isValidEmail(bad), bad).toBe(false);
    }
  });

  it('정상 주소를 통과시킨다', () => {
    for (const ok of ['name@example.com', 'first.last+tag@sub.example.co.kr', 'a_b-c%d@example-corp.com', '  name@example.com  ']) {
      expect(isValidEmail(ok), ok).toBe(true);
    }
  });

  it('빈 값과 형식 오류를 다른 문구로 알린다', () => {
    expect(validateRequestEmail('')).toBe('이메일 회신처를 입력해 주세요.');
    expect(validateRequestEmail('   ')).toBe('이메일 회신처를 입력해 주세요.');
    expect(validateRequestEmail('name@example')).toBe('이메일 주소 형식을 확인해 주세요. 예) name@example.com');
    expect(validateRequestEmail('name@example.com')).toBeNull();
  });
});

// ==========================================
// B9-b 희망 방문일 범위
// ==========================================
// 피커의 min·max 는 키보드 입력으로 우회되므로 판정은 이 순수 함수가 한다.

describe('visitDateRange · validateVisitDate', () => {
  const TODAY = '2026-08-07';
  const RANGE_NOTICE = `희망 방문일은 오늘부터 ${VISIT_DATE_MAX_DAYS}일 이내로 선택해 주세요.`;

  it('오늘부터 상한일까지를 범위로 준다', () => {
    expect(visitDateRange(TODAY)).toEqual({ min: '2026-08-07', max: '2026-11-05' });
  });

  it('고르지 않으면 선택을 요구한다', () => {
    expect(validateVisitDate('', TODAY)).toBe('희망 방문일을 선택해 주세요.');
  });

  it('지난 날짜를 거부한다', () => {
    expect(validateVisitDate('2026-08-06', TODAY)).toBe(RANGE_NOTICE);
    expect(validateVisitDate('2025-01-01', TODAY)).toBe(RANGE_NOTICE);
  });

  it('상한을 넘는 미래를 거부한다', () => {
    expect(validateVisitDate('2026-11-06', TODAY)).toBe(RANGE_NOTICE);
    expect(validateVisitDate('2031-03-02', TODAY)).toBe(RANGE_NOTICE);
  });

  it('날짜가 아닌 입력을 거부한다', () => {
    expect(validateVisitDate('2026-13-40', TODAY)).toBe(RANGE_NOTICE);
    expect(validateVisitDate('내일', TODAY)).toBe(RANGE_NOTICE);
  });

  it('오늘과 상한일은 통과시킨다', () => {
    expect(validateVisitDate(TODAY, TODAY)).toBeNull();
    expect(validateVisitDate('2026-11-05', TODAY)).toBeNull();
    expect(validateVisitDate('2026-09-01', TODAY)).toBeNull();
  });

  it('기준일을 넘기지 않으면 KST 오늘을 쓴다', () => {
    const kstToday = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect(visitDateRange().min).toBe(kstToday);
    expect(validateVisitDate(kstToday)).toBeNull();
  });
});

// ==========================================
// B9-c '새 등록하기' 초기화
// ==========================================
// 구 resetWizard 는 화면 상태만 되돌려 직전 첨부파일·개인정보 동의가 다음 접수에 그대로 실렸다.

describe('resetRequestFormData', () => {
  const defaults = {
    customer_name: '',
    company_name: '',
    phone: '',
    email: '',
    site_address: '',
    industry: '',
    work_type: '',
    description: '',
    files: [] as { id: string }[],
    agreePrivacy: false,
    visit_date: '',
  };

  const submitted = {
    ...defaults,
    customer_name: '홍길동',
    company_name: 'ABC식품 (주)',
    phone: '010-1234-5678',
    email: 'name@example.com',
    site_address: '경기도 화성시 향남읍 식품공단로 42',
    industry: '식품 제조',
    work_type: '노후배관교체',
    description: '80A 배관 신규 설치',
    files: [{ id: 'file-1' }],
    agreePrivacy: true,
    visit_date: '2026-08-20',
  };

  it('직전 첨부파일과 개인정보 동의를 물려주지 않는다', () => {
    const next = resetRequestFormData(defaults, submitted);
    expect(next.files).toEqual([]);
    expect(next.agreePrivacy).toBe(false);
  });

  it('직전 접수 내용(업종·공사 종류·참조 사항·방문일)을 물려주지 않는다', () => {
    const next = resetRequestFormData(defaults, submitted);
    expect(next.industry).toBe('');
    expect(next.work_type).toBe('');
    expect(next.description).toBe('');
    expect(next.visit_date).toBe('');
  });

  it('로그인 고객의 신원은 보존한다', () => {
    const next = resetRequestFormData(defaults, submitted);
    expect(next.customer_name).toBe('홍길동');
    expect(next.company_name).toBe('ABC식품 (주)');
    expect(next.phone).toBe('010-1234-5678');
    expect(next.email).toBe('name@example.com');
    expect(next.site_address).toBe('경기도 화성시 향남읍 식품공단로 42');
  });

  it('직전 값을 손대지 않는다', () => {
    resetRequestFormData(defaults, submitted);
    expect(submitted.files).toHaveLength(1);
    expect(defaults.files).toHaveLength(0);
  });
});

// ==========================================
// B9-d 폼 값 변경 시 임시저장 동반
// ==========================================
// 방문 시간대 버튼만 저장 경로에서 빠져 있었다 — 갱신과 저장을 한 함수로 묶어 누락을 구조적으로 막는다.

describe('patchRequestForm', () => {
  it('갱신값을 그대로 임시저장에 넘긴다', () => {
    const persist = vi.fn();
    const next = patchRequestForm({ visit_time: '오전', email: 'name@example.com' }, { visit_time: '오후' }, persist);
    expect(next).toEqual({ visit_time: '오후', email: 'name@example.com' });
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledWith({ visit_time: '오후', email: 'name@example.com' });
  });

  it('직전 값을 손대지 않는다', () => {
    const prev = { visit_time: '오전' };
    patchRequestForm(prev, { visit_time: '오후' }, () => {});
    expect(prev.visit_time).toBe('오전');
  });
});

// ==========================================
// N3 customer_type 파생
// ==========================================
// 구 폼은 고객에게 묻지 않고 '일반'을 저장해, 접수가 전부 같은 업종으로 남았다(B1과 같은 유형).

describe('deriveCustomerType', () => {
  it('고객이 고른 업종을 그대로 쓴다', () => {
    expect(deriveCustomerType('식품 제조')).toBe('식품 제조');
    expect(deriveCustomerType('제약·바이오')).toBe('제약·바이오');
  });

  it('고르지 않으면 임의 기본값 대신 미정으로 남긴다', () => {
    expect(deriveCustomerType('')).toBe(UNSPECIFIED);
    expect(deriveCustomerType('   ')).toBe(UNSPECIFIED);
    expect(deriveCustomerType('')).not.toBe('일반');
  });

  it("고객이 고른 '기타'와 미선택을 구분한다", () => {
    expect(deriveCustomerType('기타')).toBe('기타');
    expect(deriveCustomerType('기타')).not.toBe(UNSPECIFIED);
  });
});
