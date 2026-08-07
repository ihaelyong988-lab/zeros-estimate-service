import { describe, expect, it } from 'vitest';
import { readSource } from '../support/sourceScan';

// C2(모바일 홈 다크 네이비 제거)·C10(헤더 터치 타깃)은 원인이 컴포넌트 상태 분기의 클래스 문자열이라
// DOM 렌더 없이 재현할 수 없다. test/ui/pageSource.test.ts 와 같은 방식으로 소스를 채점해 재발을 막는다.
const { lines, locate, interpolations } = readSource('components/layout/AppShell.tsx');

/** 모바일 레이아웃 분기 구간만 잘라낸다 — 스플래시(다크 네이비 유지)·데스크톱은 조문 밖이다. */
function mobileBranchRange(): [number, number] {
  const start = lines.findIndex((line) => line.includes('1. 모바일 전용 네이티브 앱 레이아웃 렌더링'));
  const end = lines.findIndex((line) => line.includes('2. 데스크탑 레이아웃 렌더링'));
  if (start < 0 || end < 0) throw new Error('모바일 분기 구간 앵커 주석을 찾지 못했다');
  return [start, end];
}

describe('AppShell 모바일 홈 랜딩 화이트 셸 (C2 · §10-A 공통 1항)', () => {
  it('다크 네이비 배경 리터럴을 쓰지 않는다', () => {
    // 조문이 #041B33 을 문자열째 금지한다. 같은 계열로 파생된 셸 색(#061F3C·#031225·#071F3C)도 함께 막는다.
    const [start, end] = mobileBranchRange();
    expect(locate((line) => /#041B33|#061F3C|#031225|#071F3C/i.test(line), start, end)).toEqual([]);
  });

  it('반투명 흰색(white/*) 글자·테두리를 남기지 않는다', () => {
    // 반투명 흰색은 다크 배경 전용이다 — 화이트 셸에 남으면 글자·헤어라인이 보이지 않는다.
    const [start, end] = mobileBranchRange();
    expect(locate((line) => /\bwhite\//.test(line), start, end)).toEqual([]);
  });

  it('랜딩 셸 표면에 조문 헤어라인 #E4EAF2 를 쓴다', () => {
    const [start, end] = mobileBranchRange();
    expect(locate((line) => line.includes('#E4EAF2'), start, end).length).toBeGreaterThan(0);
  });
});

describe('AppShell 헤더 터치 타깃 (C10)', () => {
  it('36px 아이콘 버튼(w-9 h-9)이 남지 않는다', () => {
    expect(locate((line) => /\bw-9 h-9\b/.test(line))).toEqual([]);
  });

  it('헤더 텍스트 버튼 3곳(로고·간편 로그인·AI NATIVE)에 44px 클래스를 붙인다', () => {
    expect(interpolations('HEADER_TOUCH_CLASS')).toBe(3);
  });

  it('아이콘 전용 버튼 2곳(메뉴 열기·닫기)에 44×44 클래스를 붙인다', () => {
    expect(interpolations('ICON_TOUCH_CLASS')).toBe(2);
  });
});
