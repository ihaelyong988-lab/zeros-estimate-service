import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { REQUEST_CTA_LABEL } from '@/lib/constants/cta';

// 접근성 결함(C4 focus 대체스타일 · C5 reduced-motion · C6 본문 대비)은 컴포넌트 상태 분기가 아니라
// 클래스 문자열 자체가 원인이라 소스 스캔으로 고정한다. DOM 렌더 없이 재발을 잡는 게 목적.
const SOURCE_PATH = fileURLToPath(new URL('../../app/page.tsx', import.meta.url));
const source = readFileSync(SOURCE_PATH, 'utf8');
const lines = source.split(/\r?\n/);

/** 위반 줄을 "번호: 내용" 으로 만들어 실패 메시지에서 바로 위치를 알 수 있게 한다. */
function locate(predicate: (line: string) => boolean): string[] {
  return lines
    .map((line, index) => ({ line, no: index + 1 }))
    .filter(({ line }) => predicate(line))
    .map(({ line, no }) => `${no}: ${line.trim()}`);
}

describe('app/page.tsx 접근성 소스 규칙', () => {
  it('focus:outline-none 은 focus-visible 대체 스타일 없이 쓰지 않는다', () => {
    const violations = locate(
      (line) => line.includes('focus:outline-none') && !line.includes('focus-visible:')
    );
    expect(violations).toEqual([]);
  });

  it('animate-* 유틸리티에는 motion-reduce:animate-none 가드가 붙는다', () => {
    // animate-none 자체는 가드이므로 매칭 대상에서 빠진다. animate-[...] 임의값·animate-in 도 포함한다.
    const animated = /\banimate-(bounce|pulse|spin|ping|in)\b|\banimate-\[/;
    const violations = locate(
      (line) => animated.test(line) && !line.includes('motion-reduce:animate-none')
    );
    expect(violations).toEqual([]);
  });

  it('주입 CSS 의 animation 에는 prefers-reduced-motion 가드가 붙는다', () => {
    // <style> 로 넣는 규칙은 Tailwind 유틸리티가 아니라 게이트가 못 본다. 두 주입 형태를 모두 본다.
    const blocks = [
      ...[...source.matchAll(/__html:\s*`([\s\S]*?)`/g)].map((m) => m[1]),
      ...[...source.matchAll(/<style>\{`([\s\S]*?)`\}<\/style>/g)].map((m) => m[1]),
    ];
    const violations = blocks.filter(
      (css) => /animation:\s*(?!none)/.test(css) && !css.includes('prefers-reduced-motion')
    );
    expect(violations).toEqual([]);
  });

  it('본문 텍스트에 대비 미달색 #9AA3AF 를 쓰지 않는다', () => {
    // 구분자·가운뎃점처럼 의미 없는 장식은 §10 본문 금지 대상이 아니다.
    const decorationOnly = /<[^<>]*>([\s·|/•\-—]*)</;
    const violations = locate((line) => {
      if (!line.includes('#9AA3AF')) return false;
      if (line.includes('aria-hidden')) return false;
      const inner = line.match(decorationOnly);
      return !(inner && inner[1].trim().length > 0 && /^[\s·|/•\-—]+$/.test(inner[1]));
    });
    expect(violations).toEqual([]);
  });
});

// 「무료 …(신청|의뢰)」 꼴의 CTA 문구를 모두 뽑는다. 「무료 제공」·「무료 라이선스」처럼
// 신청/의뢰로 끝나지 않는 서술은 CTA 가 아니므로 걸리지 않는다.
const CTA_PHRASE = /무료(?:\s+[가-힣]+)*\s+(?:신청|의뢰)(?:하기)?/g;

describe('app/page.tsx CTA 문구 통일 (B5)', () => {
  it('상수가 §10 확정 문구를 값으로 가진다', () => {
    expect(REQUEST_CTA_LABEL).toBe('무료 견적 검토 신청');
  });

  it('기준 지점(§10 확정 문구 리터럴)이 상수와 일치한다', () => {
    // 확정 문구는 조문이 박아둔 리터럴로 남기고, 상수는 그 값을 복제한다.
    // 둘 중 하나만 바뀌면 여기서 깨져 조문과 코드가 어긋난 채 배포되지 않는다.
    const anchor = lines.find((line) => line.includes('<ArrowRight className="w-4 h-4" />'));
    expect(anchor?.trim()).toBe(`${REQUEST_CTA_LABEL} <ArrowRight className="w-4 h-4" />`);
  });

  it('허용 CTA 문구 1종 외 변형 리터럴이 0건이다', () => {
    const variants = locate((line) => {
      const found = line.match(CTA_PHRASE);
      return found !== null && found.some((phrase) => phrase !== REQUEST_CTA_LABEL);
    });
    expect(variants).toEqual([]);
  });

  it('통일 대상 CTA 5곳이 리터럴이 아니라 상수를 참조한다', () => {
    const references = locate((line) => line.includes('{REQUEST_CTA_LABEL}'));
    expect(references).toHaveLength(5);
  });
});
