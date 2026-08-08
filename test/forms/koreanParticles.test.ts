import { describe, expect, it } from 'vitest';
import { readSource } from '../support/sourceScan';

// ==========================================
// 한글 조사 오류 (2026-08-08 라이브 접수 실측에서 발견)
// ==========================================
// 라이브에서 간편 견적을 끝까지 제출해 보니 완료 화면이 **"접수하신 자료은 이력관리에"** 였다.
// 원인: 조사 `은` 을 조건문 **밖**에 뒀는데 받침 유무가 채널마다 달랐다 —
//   visit  → "자료·예약은"  (약: 받침 ㄱ → 은, 우연히 맞음)
//   quick  → "자료은"       (료: 받침 없음 → 는이어야 함)  ← 더 흔한 경로가 깨져 있었다
//
// 이 결함은 **어떤 게이트도 못 잡는다.** lint·tsc·대비·접근성 룰은 문법을 보지 않고,
// 소스 스캔도 `자료{...}은` 처럼 보간이 끼면 앞 글자를 못 읽는다.
// 그래서 ①이 줄은 아래에서 문자열째 고정하고 ②리터럴 문장은 받침 규칙으로 기계 채점한다.

const 받침없음 = (ch: string): boolean => {
  const code = ch.charCodeAt(0) - 0xac00;
  return code >= 0 && code <= 11172 && code % 28 === 0;
};

describe('완료 화면 조사 — 채널별 분기 안에 있다', () => {
  const { source } = readSource('components/forms/RequestWizard.tsx');

  it('간편 견적은 "자료는", 예약방문은 "자료·예약은" 이다', () => {
    // 조사를 분기 밖으로 빼면 한쪽이 반드시 깨진다. 그 형태를 여기서 막는다.
    expect(source).toContain("접수하신 자료{channel === 'visit' ? '·예약은' : '는'} 이력관리에");
    expect(source).not.toContain("? '·예약' : ''}은");
  });
});

describe('고객 화면 리터럴 문장 — 받침 없는 말 뒤에 "은" 을 쓰지 않는다', () => {
  // 안전한 방향만 채점한다. `X은`(X 받침 없음)은 조사로만 쓰이므로 오탐이 거의 없다.
  // 반대 방향(`X는`, X 받침 있음)은 동사 어미("있는"·"먹는")와 구분되지 않아 넣지 않는다.
  const FILES = [
    'components/forms/RequestWizard.tsx',
    'components/forms/PhoneVerifyGate.tsx',
    'components/MyRequestsView.tsx',
    'app/page.tsx',
  ] as const;

  /**
   * 주석을 걷어낸다 — 결함을 설명하는 주석이 그 결함 문구를 인용하면 스스로 걸린다
   * (실제로 이 테스트의 첫 실행이 위 완료화면 주석의 "자료은" 예시를 잡았다).
   * 화면에 나가는 것은 주석이 아니므로 채점 대상이 아니다.
   */
  const stripComments = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[^\n]*?\/\/[^\n]*$/gm, ' ');

  it.each(FILES)('%s', (file) => {
    const source = stripComments(readSource(file).source);
    const bad: string[] = [];
    for (const m of source.matchAll(/([가-힣])은(?=[\s.,)·"'<])/g)) {
      if (받침없음(m[1])) {
        const at = Math.max(0, (m.index ?? 0) - 12);
        bad.push(source.slice(at, (m.index ?? 0) + 6).replace(/\s+/g, ' '));
      }
    }
    expect(bad).toEqual([]);
  });
});
