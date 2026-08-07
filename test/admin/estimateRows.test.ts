import { describe, expect, it } from 'vitest';
import { matchesSearch, isAdminSessionExpired, type SearchableEstimate } from '@/components/admin/EstimateList';
import { makeEstimate } from '../fixtures';

// ==========================================
// 접수 목록 검색·세션 판정 회귀 테스트 (2026-08-07 A4)
// ==========================================
// /api/data 는 관리자 토큰이 만료돼도 견적 테이블만은 PII 를 제거한 행을 200 으로 돌려준다
// (공개 실적 화면이 살아 있어야 하므로 그 설계는 유지된다). 그 행에는
// customer_name·site_address·estimate_no 가 아예 없어서, 화면이 그대로 .toLowerCase() 를
// 부르면 목록 전체가 TypeError 로 죽었다. 관리자 토큰 TTL 이 8시간이라 매일 재현된다.
//  - 검색은 필드가 없어도 던지지 않는다.
//  - 그런 응답은 "빈 목록"이 아니라 세션 만료로 판정한다(공개 행을 정상 데이터처럼 그리지 않는다).

/** 관리자 토큰 만료 시 서버가 돌려주는 PII 제거 행(허용목록 밖 필드가 통째로 없다). */
const publicRow: SearchableEstimate = {};

describe('matchesSearch', () => {
  it('PII 가 제거된 행에서도 던지지 않고 불일치로 처리한다', () => {
    expect(() => matchesSearch(publicRow, '한화')).not.toThrow();
    expect(matchesSearch(publicRow, '한화')).toBe(false);
  });

  it('필드가 하나만 남은 행도 남은 필드로만 판정한다', () => {
    const partial: SearchableEstimate = { estimate_no: 'ZR-20260807-001' };
    expect(matchesSearch(partial, '20260807')).toBe(true);
    expect(matchesSearch(partial, '화성')).toBe(false);
  });

  it('고객명·회사명·현장주소·접수번호 어느 하나만 맞아도 통과한다', () => {
    const est = makeEstimate({
      customer_name: '홍길동',
      company_name: '테스트산업',
      site_address: '경기도 화성시 테스트로 1',
      estimate_no: 'ZR-20260807-007',
    });
    expect(matchesSearch(est, '홍길동')).toBe(true);
    expect(matchesSearch(est, '테스트산업')).toBe(true);
    expect(matchesSearch(est, '화성시')).toBe(true);
    expect(matchesSearch(est, 'ZR-20260807-007')).toBe(true);
    expect(matchesSearch(est, '없는값')).toBe(false);
  });

  it('대소문자를 무시한다', () => {
    const est = makeEstimate({ customer_name: 'Kim Manager', estimate_no: 'zr-20260807-002' });
    expect(matchesSearch(est, 'kim')).toBe(true);
    expect(matchesSearch(est, 'KIM MANAGER')).toBe(true);
    expect(matchesSearch(est, 'ZR-20260807-002')).toBe(true);
  });

  it('빈 검색어면 전부 통과한다 — PII 가 없는 행도 포함', () => {
    expect(matchesSearch(makeEstimate(), '')).toBe(true);
    expect(matchesSearch(publicRow, '')).toBe(true);
  });

  it('문자열이 아닌 값이 실려 와도 던지지 않는다', () => {
    // 행은 jsonb 그대로 들어오므로 타입이 어긋난 옛 데이터가 섞일 수 있다.
    const broken = { customer_name: null, site_address: 12345 } as unknown as SearchableEstimate;
    expect(() => matchesSearch(broken, '홍길동')).not.toThrow();
    expect(matchesSearch(broken, '홍길동')).toBe(false);
  });
});

describe('isAdminSessionExpired', () => {
  it('관리자 필드가 통째로 빠진 응답은 세션 만료로 판정한다', () => {
    expect(isAdminSessionExpired([publicRow, publicRow])).toBe(true);
  });

  it('정상 관리자 행이면 만료가 아니다', () => {
    expect(isAdminSessionExpired([makeEstimate(), makeEstimate()])).toBe(false);
  });

  it('0건 목록을 만료로 오판하지 않는다', () => {
    expect(isAdminSessionExpired([])).toBe(false);
  });

  it('관리자 필드가 빠진 옛 행이 섞여 있어도 정상 목록을 잠그지 않는다', () => {
    expect(isAdminSessionExpired([makeEstimate(), publicRow])).toBe(false);
  });
});
