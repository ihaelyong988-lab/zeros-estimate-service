import { describe, expect, it } from 'vitest';
import { nextRovingIndex, rovingTabStop } from '@/lib/a11y/rovingTabindex';

// radiogroup 키보드 계약(ARIA APG)의 판정부만 순수 함수로 분리해 검증한다.
// 실제 focus() 호출·keydown 바인딩은 DOM 이라 여기서 다루지 않는다(modalDialog 와 같은 분리).
describe('rovingTabStop', () => {
  const options = ['배관공사', '장비설치', '공장증설'] as const;

  it('선택된 항목 하나만 tab stop 이 된다', () => {
    expect(rovingTabStop(options, '배관공사')).toBe(0);
    expect(rovingTabStop(options, '장비설치')).toBe(1);
    expect(rovingTabStop(options, '공장증설')).toBe(2);
  });

  it('아직 고르지 않았으면 첫 항목이 tab stop 이다', () => {
    expect(rovingTabStop(options, '')).toBe(0);
  });

  it('목록에 없는 값이면 첫 항목으로 되돌린다 — 그룹이 통째로 Tab 에서 사라지지 않게', () => {
    const loose: string[] = ['배관공사', '장비설치'];
    expect(rovingTabStop(loose, '폐지된 공종')).toBe(0);
  });

  it('항목이 없어도 판정은 깨지지 않는다', () => {
    expect(rovingTabStop<string>([], '')).toBe(0);
  });
});

describe('nextRovingIndex', () => {
  const COUNT = 10; // 공사 종류 10개

  it('→ · ↓ 는 다음 항목으로 이동한다', () => {
    expect(nextRovingIndex(COUNT, 0, 'ArrowRight')).toBe(1);
    expect(nextRovingIndex(COUNT, 4, 'ArrowDown')).toBe(5);
  });

  it('← · ↑ 는 이전 항목으로 이동한다', () => {
    expect(nextRovingIndex(COUNT, 5, 'ArrowLeft')).toBe(4);
    expect(nextRovingIndex(COUNT, 9, 'ArrowUp')).toBe(8);
  });

  it('마지막 항목에서 → 를 누르면 첫 항목으로 되감는다', () => {
    expect(nextRovingIndex(COUNT, 9, 'ArrowRight')).toBe(0);
    expect(nextRovingIndex(COUNT, 9, 'ArrowDown')).toBe(0);
  });

  it('첫 항목에서 ← 를 누르면 마지막 항목으로 되감는다', () => {
    expect(nextRovingIndex(COUNT, 0, 'ArrowLeft')).toBe(9);
    expect(nextRovingIndex(COUNT, 0, 'ArrowUp')).toBe(9);
  });

  it('항목이 둘이면 방향키가 두 항목을 오간다 — 현장 유형 8개·시간대 2개 공통', () => {
    expect(nextRovingIndex(2, 0, 'ArrowRight')).toBe(1);
    expect(nextRovingIndex(2, 1, 'ArrowRight')).toBe(0);
    expect(nextRovingIndex(2, 0, 'ArrowUp')).toBe(1);
    expect(nextRovingIndex(8, 7, 'ArrowRight')).toBe(0);
  });

  it('항목이 하나면 제자리에 머문다', () => {
    expect(nextRovingIndex(1, 0, 'ArrowRight')).toBe(0);
    expect(nextRovingIndex(1, 0, 'ArrowLeft')).toBe(0);
  });

  it('이동 키가 아니면 null — Tab · Enter · Space 는 기본 동작에 맡긴다', () => {
    expect(nextRovingIndex(COUNT, 3, 'Tab')).toBeNull();
    expect(nextRovingIndex(COUNT, 3, 'Enter')).toBeNull();
    expect(nextRovingIndex(COUNT, 3, ' ')).toBeNull();
    expect(nextRovingIndex(COUNT, 3, 'Home')).toBeNull();
  });

  it('항목이 없으면 이동 대상도 없다', () => {
    expect(nextRovingIndex(0, 0, 'ArrowRight')).toBeNull();
  });

  it('포커스 인덱스가 범위 밖이면 진행 방향의 끝에서 시작한다', () => {
    expect(nextRovingIndex(COUNT, -1, 'ArrowRight')).toBe(0);
    expect(nextRovingIndex(COUNT, -1, 'ArrowLeft')).toBe(9);
    expect(nextRovingIndex(COUNT, 99, 'ArrowDown')).toBe(0);
    expect(nextRovingIndex(COUNT, 99, 'ArrowUp')).toBe(9);
  });
});
