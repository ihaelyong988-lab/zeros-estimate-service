import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// C4(슬라이더 focus-visible)·C5(motion-reduce)·C6(본문 대비)는 원인이 컴포넌트 클래스 문자열이라
// DOM 렌더 없이 재현할 수 없다. test/ui/appShellSource.test.ts 와 같은 방식으로 소스를 채점한다.
const SOURCE_PATH = fileURLToPath(
  new URL('../../components/layout/RightSidebar.tsx', import.meta.url)
);
const source = readFileSync(SOURCE_PATH, 'utf8');
const lines = source.split(/\r?\n/);

/** 위반 줄을 "번호: 내용" 으로 만들어 실패 메시지에서 바로 위치를 알 수 있게 한다. */
function locate(predicate: (line: string) => boolean): string[] {
  return lines
    .map((line, index) => ({ line, no: index + 1 }))
    .filter(({ line }) => predicate(line))
    .map(({ line, no }) => `${no}: ${line.trim()}`);
}

/** 폰트 크기를 직접 지정한 줄 = 글자를 렌더하는 줄(본문·캡션). 아이콘·눈금 색과 구분하는 기준이다. */
const setsFontSize = (line: string) => /text-\[[\d.]+px\]|\btext-(xs|sm|base|lg|xl|2xl)\b/.test(line);

const hasAnimation = (line: string) =>
  /\banimate-(pulse|spin|ping|bounce|in)\b|\banimate-\[/.test(line);

describe('RightSidebar 본문 대비 (C6 · §10 가독성 4.5:1)', () => {
  it('글자를 렌더하는 줄에 text-gray-light(#9AA3AF) 를 쓰지 않는다', () => {
    expect(locate((line) => /text-gray-light\b/.test(line) && setsFontSize(line))).toEqual([]);
  });

  it('비본문 색(접기 아이콘·중앙값 눈금·toneDot)은 그대로 둔다', () => {
    // 지정된 결함만 고친다 — 장식 색까지 끌어올리면 위계가 무너진다.
    expect(locate((line) => /text-gray-light\b/.test(line))).toHaveLength(1);
    expect(locate((line) => /bg-gray-light\b/.test(line))).toHaveLength(2);
  });
});

describe('RightSidebar 예상 견적 슬라이더 (C4 · focus-visible)', () => {
  it('focus:outline-none 을 쓰는 줄은 focus-visible 대체 스타일을 동반한다', () => {
    expect(
      locate((line) => /focus:outline-none/.test(line) && !/focus-visible:/.test(line))
    ).toEqual([]);
  });

  it('슬라이더 라벨은 모바일 랜딩(app/page.tsx)과 같은 문구를 쓴다', () => {
    expect(source).toContain('aria-label="예상 견적 조절 슬라이더"');
  });
});

describe('RightSidebar 모션 가드 (C5 · prefers-reduced-motion)', () => {
  it('animate 유틸리티는 motion-reduce:animate-none 을 동반한다', () => {
    expect(
      locate((line) => hasAnimation(line) && !line.includes('motion-reduce:animate-none'))
    ).toEqual([]);
  });
});
