import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// C5(motion-reduce)·C6(본문 대비)는 원인이 컴포넌트 클래스 문자열이라 DOM 렌더 없이 재현할 수 없다.
// test/ui/appShellSource.test.ts 와 같은 방식으로 소스를 채점한다.
const SOURCE_PATH = fileURLToPath(
  new URL('../../components/layout/MobileSimulator.tsx', import.meta.url)
);
const source = readFileSync(SOURCE_PATH, 'utf8');
const lines = source.split(/\r?\n/);

function locate(predicate: (line: string) => boolean): string[] {
  return lines
    .map((line, index) => ({ line, no: index + 1 }))
    .filter(({ line }) => predicate(line))
    .map(({ line, no }) => `${no}: ${line.trim()}`);
}

const hasAnimation = (line: string) =>
  /\banimate-(pulse|spin|ping|bounce|in)\b|\banimate-\[/.test(line);

describe('MobileSimulator 본문 대비 (C6 · §10 가독성 4.5:1)', () => {
  it('text-gray-light(#9AA3AF) 를 쓰지 않는다', () => {
    expect(locate((line) => /text-gray-light\b/.test(line))).toEqual([]);
  });
});

describe('MobileSimulator 모션 가드 (C5 · prefers-reduced-motion)', () => {
  it('진입 애니메이션 2곳은 motion-reduce:animate-none 을 동반한다', () => {
    expect(
      locate((line) => hasAnimation(line) && !line.includes('motion-reduce:animate-none'))
    ).toEqual([]);
  });
});
