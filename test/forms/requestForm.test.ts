import { describe, expect, it } from 'vitest';
import {
  DRAFT_VERSION,
  SITE_TYPE_OPTIONS,
  UNSPECIFIED,
  WORK_TYPE_OPTIONS,
  buildRequestScopeFields,
  parseRequestDraft,
  validateRequestStep1,
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
