import { describe, expect, it } from 'vitest';
import { MENU_DISPLAY_NAMES, menuDisplayName } from '@/lib/constants/menu';
import { WORK_TYPE_OPTIONS } from '@/lib/forms/requestForm';

// ==========================================
// 공종 표기 단일화 (N5)
// ==========================================
// 결함: 같은 WorkType 키가 화면마다 다른 이름으로 나갔다 — 의뢰 폼은 표시명(menuDisplayName),
//       관리자 목록·칸반·상세·인쇄물·마이페이지는 원시 키, 관리자 필터는 제3의 축약형('생산설비 훅업').
// 처방: 표시 문자열의 단일 소스를 MENU_DISPLAY_NAMES 한 곳으로 모으고,
//       유니온 전체를 덮는지(누락 시 실패) 여기서 고정한다. DB 저장 키는 불변이다.

describe('MENU_DISPLAY_NAMES — WorkType 전수 대조', () => {
  it('공사 종류 유니온의 모든 키에 표시명이 있다', () => {
    const missing = WORK_TYPE_OPTIONS.filter((w) => !(w in MENU_DISPLAY_NAMES));
    expect(missing).toEqual([]);
  });

  it('표시명은 빈 문자열이 아니다', () => {
    const blank = WORK_TYPE_OPTIONS.filter((w) => (MENU_DISPLAY_NAMES[w] ?? '').trim() === '');
    expect(blank).toEqual([]);
  });

  it('한 키가 화면마다 다른 이름으로 갈리지 않는다 — menuDisplayName 이 맵 값과 같다', () => {
    for (const w of WORK_TYPE_OPTIONS) {
      expect(menuDisplayName(w)).toBe(MENU_DISPLAY_NAMES[w]);
    }
  });
});

describe('menuDisplayName — 미등록 키 폴백', () => {
  it('등록되지 않은 키는 원본을 그대로 반환한다', () => {
    // 옛 접수 행에 남은 값이나 신설 키가 화면에서 빈칸으로 사라지지 않게 한다.
    expect(menuDisplayName('알 수 없는 공종')).toBe('알 수 없는 공종');
    expect(menuDisplayName('')).toBe('');
  });

  it('확정 표시명(§10-A O-33)을 되돌리지 않는다', () => {
    expect(menuDisplayName('CAPEX 개·증설 검토')).toBe('CAPEX개선,증설');
    expect(menuDisplayName('생산설비 배관 연결')).toBe('공정 배관공사');
    expect(menuDisplayName('배관공사')).toBe('일반 배관공사');
  });
});
