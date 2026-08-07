import { describe, expect, it } from 'vitest';
import { readSource } from '../support/sourceScan';

// C4(슬라이더 focus-visible)·C5(motion-reduce)·C6(본문 대비)는 원인이 컴포넌트 클래스 문자열이라
// DOM 렌더 없이 재현할 수 없다. test/ui/appShellSource.test.ts 와 같은 방식으로 소스를 채점한다.
// C4·C5 는 게이트 룰(R4·R5)과 같은 판정이라 test/ui/a11ySourceRules.test.ts 가 게이트 정의를 빌려 채점한다.
const { source, locate } = readSource('components/layout/RightSidebar.tsx');

/** 폰트 크기를 직접 지정한 줄 = 글자를 렌더하는 줄(본문·캡션). 아이콘·눈금 색과 구분하는 기준이다. */
const setsFontSize = (line: string) => /text-\[[\d.]+px\]|\btext-(xs|sm|base|lg|xl|2xl)\b/.test(line);

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

describe('RightSidebar 예상 견적 슬라이더 (C4)', () => {
  it('슬라이더 라벨은 모바일 랜딩(app/page.tsx)과 같은 문구를 쓴다', () => {
    expect(source).toContain('aria-label="예상 견적 조절 슬라이더"');
  });
});
