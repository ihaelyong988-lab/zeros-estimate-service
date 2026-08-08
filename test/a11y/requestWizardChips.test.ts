import { describe, expect, it } from 'vitest';
import { readSource } from '../support/sourceScan';

// N4 는 "칩 18개가 전부 tab stop" 이라는 렌더 구조 결함이라 DOM 없이 재현할 수 없다.
// 판정부(인덱스 산출)는 rovingTabindex.test.ts 가 덮고, 여기서는 렌더 계약을 소스로 채점한다
// (test/ui/appShellSource.test.ts 와 같은 방식).
const { source, lines, occurrences } = readSource('components/forms/RequestWizard.tsx');

describe('RequestWizard 칩 그룹 — radiogroup 렌더 계약', () => {
  it('칩 렌더는 공용 컴포넌트 한 곳뿐이다 — role 마크업이 여러 벌로 갈라지지 않는다', () => {
    expect(occurrences('role="radiogroup"')).toBe(1);
    // 뒤에 `]` 가 붙은 것은 포커스 이동용 선택자라 렌더 마크업과 구분한다.
    expect(source.match(/role="radio"(?!\])/g) ?? []).toHaveLength(1);
    expect(occurrences('aria-checked=')).toBe(1);
  });

  it('공사 종류 · 현장 유형 · 방문 시간대 세 그룹이 그 컴포넌트를 쓴다', () => {
    expect(occurrences('<RadioChipGroup')).toBe(3);
    expect(source).toContain('options={WORK_TYPE_OPTIONS}');
    expect(source).toContain('options={SITE_TYPE_OPTIONS}');
    expect(source).toContain('options={VISIT_TIME_OPTIONS}');
  });

  it('직접 map 으로 칩을 그리던 옛 렌더 블록이 남아 있지 않다', () => {
    expect(source).not.toContain('WORK_TYPE_OPTIONS.map(');
    expect(source).not.toContain('SITE_TYPE_OPTIONS.map(');
    expect(source).not.toContain("['오전', '오후'] as const).map(");
  });

  it('tab stop 은 그룹당 하나 — 나머지 칩은 -1 이다', () => {
    expect(source).toContain("import { nextRovingIndex, rovingTabStop } from '@/lib/a11y/rovingTabindex'");
    expect(source).toContain('tabIndex={index === tabStop ? 0 : -1}');
    expect(source).toContain('onKeyDown=');
  });

  it('그룹마다 화면에 보이는 라벨을 이름으로 삼는다', () => {
    for (const id of ['work_type_label', 'site_type_label', 'visit_time_label']) {
      expect(source).toContain(`id="${id}"`);
      expect(source).toContain(`labelledBy="${id}"`);
    }
  });
});

describe('RequestWizard 칩 그룹 — 기존 클래스 계약 보존', () => {
  // §10 터치 44px · focus-visible 가시 · motion-reduce 가드 · 게이트 R3/R4/R5.
  // 공용화하면서 이 토큰이 하나라도 빠지면 접근성 계약이 조용히 끊긴다.
  const REQUIRED = [
    'min-h-[44px]',
    'rounded-custom',
    'font-bold',
    'border',
    'transition-all',
    'active:scale-[0.99]',
    'motion-reduce:active:scale-100',
    'cursor-pointer',
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-steel/40',
  ];

  const chipClassLine = (): string => {
    const line = lines.find((l) => l.includes('const CHIP_CLS'));
    if (!line) throw new Error('칩 공통 클래스 상수(CHIP_CLS)를 찾지 못했다');
    return line;
  };

  it('칩 공통 클래스가 44px · focus-visible · motion-reduce 를 그대로 싣는다', () => {
    const line = chipClassLine();
    for (const token of REQUIRED) expect(line).toContain(token);
  });

  it('선택 · 미선택 색 계약이 유지된다', () => {
    expect(source).toContain('border-steel bg-steel/10 text-navy');
    expect(source).toContain('border-border bg-bg text-gray hover:border-steel/60');
  });

  it('그룹별 크기 클래스는 옛 렌더와 같은 값을 쓴다', () => {
    // 공사 종류·현장 유형 = px-2.5 py-2 text-[14.5px] leading-snug · 시간대 = p-3 text-[15px]
    expect(source).toContain('px-2.5 py-2 text-[14.5px] leading-snug');
    expect(source).toContain('p-3 text-[15px]');
  });

  it('칩은 모바일 탭 지연 없이 눌린다', () => {
    expect(source).toContain("touchAction: 'manipulation'");
  });
});
