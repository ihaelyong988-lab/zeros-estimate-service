import { describe, expect, it } from 'vitest';
import { readSource } from '../support/sourceScan';

// 게이트(.claude/hooks/ui-quality-gate.mjs)가 룰의 단일 소스다. 테스트는 정규식을 다시 쓰지 않고
// 그 판정을 빌린다 — 두 벌로 두면 한쪽만 고쳐졌을 때 어긋난 줄이 조용히 배포된다.
//
// 이 표에 실린 파일은 전수 베이스라인(R4 11 · R5 8)과 무관하게 **0건**으로 못박는다.
// 게이트는 회귀분만 차단하므로, 이미 깨끗한 화면이 다시 더러워지는 것은 여기서만 막힌다.
//
// R2(본문 대비)·R3(터치 타깃)은 이 표에 넣지 않는다. 게이트와 각 파일 테스트의 예외 기준이
// 서로 다르고(장식 판정 근거가 aria-hidden / 요소 안쪽 텍스트 / 폰트크기 지정으로 갈린다)
// 실제로 판정이 엇갈리는 줄이 있다 — app/page.tsx:1624(장식 가운뎃점) · RightSidebar.tsx:283
// (아이콘 버튼). 합치면 어느 한쪽 판정이 바뀌므로 각 파일 테스트에 그대로 둔다.
const PINNED = [
  { file: 'app/page.tsx', rules: ['R4', 'R5'] },
  { file: 'components/layout/RightSidebar.tsx', rules: ['R4', 'R5'] },
] as const;

describe.each(PINNED)('$file — 게이트 룰 위반 0건 고정', ({ file, rules }) => {
  const scan = readSource(file);

  it.each(rules)('%s 위반이 없다', (ruleId) => {
    expect(scan.gateViolations(ruleId)).toEqual([]);
  });
});
