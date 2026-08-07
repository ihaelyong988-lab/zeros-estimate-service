import { describe, expect, it } from 'vitest';
import {
  RULES,
  lintSource,
  countByRule,
  compareBaseline,
  parseFlags,
} from '../../.claude/hooks/ui-quality-gate.mjs';

// 게이트는 마감을 막는 장치라 스스로 약해져도 아무도 눈치채지 못한다.
// 룰별 위반/정상 샘플과 베이스라인 비교를 고정해 등급 약화·오탐 재발을 잡는다.

interface Violation {
  id: string;
  file: string;
  line: number;
  rule: string;
  severity: string;
  fix: string;
}

const lint = (src: string, file = 'components/Sample.tsx'): Violation[] =>
  lintSource(file, src) as Violation[];
const ids = (src: string, file = 'components/Sample.tsx'): string[] =>
  lint(src, file).map((v) => v.id);

describe('룰 등급', () => {
  it('R1 은 무조건 차단 등급을 유지한다', () => {
    const r1 = RULES.find((r: { id: string }) => r.id === 'R1');
    expect(r1?.severity).toBe('block');
  });

  it('AGENTS §11-2 가 요구하는 7룰이 모두 정의돼 있다', () => {
    expect(RULES.map((r: { id: string }) => r.id)).toEqual([
      'R1',
      'R2',
      'R3',
      'R4',
      'R5',
      'R6',
      'R7',
    ]);
  });

  it('신설 룰의 등급은 경고 아래로 내려가지 않는다', () => {
    const grade = Object.fromEntries(
      RULES.map((r: { id: string; severity: string }) => [r.id, r.severity])
    );
    expect(grade.R4).toBe('regression');
    expect(grade.R5).toBe('regression');
    expect(grade.R6).toBe('warn');
    expect(grade.R7).toBe('warn');
  });
});

describe('R1 에러 메시지 announce', () => {
  it('error 렌더에 role=alert 가 없으면 잡는다', () => {
    expect(ids('export const A = () => <div>{error && <p>{error}</p>}</div>;')).toContain('R1');
  });

  it('role=alert 가 있으면 통과한다', () => {
    expect(
      ids('export const A = () => <div>{error && <p role="alert">{error}</p>}</div>;')
    ).not.toContain('R1');
  });

  it('aria-live 도 announce 수단으로 인정한다', () => {
    expect(
      ids('export const A = () => <div>{errorMsg && <p aria-live="polite">{errorMsg}</p>}</div>;')
    ).not.toContain('R1');
  });

  it('에러 렌더가 없으면 잡지 않는다', () => {
    expect(ids('export const A = () => <div>정상</div>;')).not.toContain('R1');
  });
});

describe('R2 본문 대비 (줄 단위 판정)', () => {
  it('본문에 text-gray-light 를 쓰면 잡는다', () => {
    expect(ids('<p className="text-gray-light">검토 결과를 확인합니다</p>')).toContain('R2');
  });

  it('헥스 표기 #9AA3AF 도 같은 위반으로 잡는다', () => {
    expect(ids('<p className="text-[#9AA3AF]">검토 결과를 확인합니다</p>')).toContain('R2');
  });

  it('aria-hidden 장식 줄은 예외로 둔다', () => {
    expect(ids('<span aria-hidden className="text-[#9AA3AF]">·</span>')).not.toContain('R2');
  });

  it('장식 구분자만 있는 파일을 위반으로 올리지 않는다 (파일 단위 오탐 재발 방지)', () => {
    const src = [
      '<section>',
      '  <span aria-hidden className="text-gray-light">·</span>',
      '  <p className="text-gray">본문</p>',
      '</section>',
    ].join('\n');
    expect(ids(src)).toEqual([]);
  });

  it('위반 줄 번호를 보고한다', () => {
    const src = ['<div>', '  <p className="text-gray">본문</p>', '  <p className="text-[#9AA3AF]">본문</p>', '</div>'].join(
      '\n'
    );
    const found = lint(src).filter((v) => v.id === 'R2');
    expect(found).toHaveLength(1);
    expect(found[0].line).toBe(3);
  });
});

describe('R3 터치 타깃', () => {
  it('44px 미만 클릭 요소를 잡는다', () => {
    expect(ids('<button className="w-8 h-8 cursor-pointer" />')).toContain('R3');
  });

  it('44px 이상이면 통과한다', () => {
    expect(ids('<button className="w-11 h-11 cursor-pointer" />')).not.toContain('R3');
  });
});

describe('R4 focus-visible', () => {
  it('focus:outline-none 만 있으면 잡는다', () => {
    expect(ids('<button className="focus:outline-none" />')).toContain('R4');
  });

  it('같은 className 에 focus-visible 대체 스타일이 있으면 통과한다', () => {
    expect(ids('<button className="focus:outline-none focus-visible:ring-2" />')).not.toContain(
      'R4'
    );
  });

  it('className 이 여러 줄이어도 같은 속성 안이면 통과한다 (줄 단위 오탐 방지)', () => {
    const src = [
      '<button',
      '  className="rounded px-4 focus:outline-none',
      '    focus-visible:ring-2 focus-visible:ring-navy"',
      '/>',
    ].join('\n');
    expect(ids(src)).not.toContain('R4');
  });

  it('중괄호 템플릿 className 도 한 덩어리로 본다', () => {
    const src = [
      '<button',
      '  className={`px-4 ${active ? "bg-navy" : ""} focus:outline-none',
      '    focus-visible:ring-2`}',
      '/>',
    ].join('\n');
    expect(ids(src)).not.toContain('R4');
  });
});

describe('R5 reduced-motion', () => {
  it('animate 유틸리티에 motion-reduce 가드가 없으면 잡는다', () => {
    expect(ids('<div className="animate-pulse" />')).toContain('R5');
  });

  it('가드가 있으면 통과한다', () => {
    expect(ids('<div className="animate-pulse motion-reduce:animate-none" />')).not.toContain('R5');
  });

  it('임의값 animate-[...] 도 잡는다', () => {
    expect(ids('<div className="animate-[spin_4s_linear_infinite]" />')).toContain('R5');
  });

  it('animate-none 자체는 가드이므로 잡지 않는다', () => {
    expect(ids('<div className="animate-none" />')).not.toContain('R5');
  });
});

describe('R6 이모지 아이콘', () => {
  it('이모지 표현 문자를 잡는다', () => {
    expect(ids('<span>❌</span>')).toContain('R6');
  });

  it('이형 선택자(FE0F)가 붙은 기호도 잡는다', () => {
    expect(ids('<span>⚠️</span>')).toContain('R6');
  });

  it('텍스트 표현 딩벳·화살표는 허용한다', () => {
    expect(ids('<span aria-hidden>➔</span>')).not.toContain('R6');
    expect(ids('<span aria-hidden>→</span>')).not.toContain('R6');
    expect(ids('<span aria-hidden>✓</span>')).not.toContain('R6');
  });
});

describe('R7 숫자 정렬', () => {
  it('숫자 포매팅에 tabular-nums 가 없으면 경고한다', () => {
    expect(ids('<span>{amount.toLocaleString()}원</span>')).toContain('R7');
  });

  it('같은 줄에 tabular-nums 가 있으면 통과한다', () => {
    expect(ids('<span className="tabular-nums">{amount.toLocaleString()}원</span>')).not.toContain(
      'R7'
    );
  });

  it('바로 위 줄의 className 에 있어도 통과한다', () => {
    const src = ['<span className="text-navy tabular-nums">', '  {amount.toFixed(1)}%', '</span>'].join(
      '\n'
    );
    expect(ids(src)).not.toContain('R7');
  });
});

describe('countByRule', () => {
  it('룰별 위반 수를 센다', () => {
    const counts = countByRule([{ id: 'R2' }, { id: 'R2' }, { id: 'R5' }]);
    expect(counts.R2).toBe(2);
    expect(counts.R5).toBe(1);
    expect(counts.R1).toBe(0);
  });
});

describe('compareBaseline', () => {
  it('베이스라인보다 늘면 회귀로 잡는다', () => {
    const regressed = compareBaseline({ R4: 3 }, { counts: { R4: 2 } });
    expect(regressed).toEqual([{ id: 'R4', base: 2, now: 3 }]);
  });

  it('줄어들면 항상 통과한다', () => {
    expect(compareBaseline({ R4: 1 }, { counts: { R4: 2 } })).toEqual([]);
  });

  it('같으면 통과한다', () => {
    expect(compareBaseline({ R4: 2 }, { counts: { R4: 2 } })).toEqual([]);
  });

  it('베이스라인이 없으면 판정을 보류한다 (첫 실행에 마감을 막지 않는다)', () => {
    expect(compareBaseline({ R4: 9 }, null)).toEqual([]);
  });

  it('베이스라인에 없는 룰은 0 으로 본다', () => {
    expect(compareBaseline({ R6: 1 }, { counts: { R4: 2 } })).toEqual([
      { id: 'R6', base: 0, now: 1 },
    ]);
  });
});

describe('parseFlags', () => {
  it('플래그를 조합으로 읽는다', () => {
    expect(parseFlags(['--check', '--all'])).toMatchObject({ check: true, all: true });
  });

  it('--pass 와 --all 을 함께 읽는다', () => {
    expect(parseFlags(['--pass', '--all'])).toMatchObject({ pass: true, all: true, check: false });
  });

  it('인자가 없으면 Stop 훅 모드다', () => {
    expect(parseFlags([])).toMatchObject({ stop: true, check: false, pass: false });
  });

  it('--stop 을 명시해도 같다', () => {
    expect(parseFlags(['--stop'])).toMatchObject({ stop: true });
  });

  it('--baseline 은 스냅샷 갱신 모드다', () => {
    expect(parseFlags(['--baseline'])).toMatchObject({ baseline: true, stop: false });
  });

  it('모르는 플래그는 따로 모아 알린다', () => {
    expect(parseFlags(['--nope']).unknown).toEqual(['--nope']);
  });
});
