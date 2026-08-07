import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lintSource } from '../../.claude/hooks/ui-quality-gate.mjs';

// 소스 스캔 테스트들이 각자 갖고 있던 "파일을 읽어 줄 단위로 정규식을 돌린다" 보일러플레이트를 모은다.
// 게이트 판정(R1~R7)도 여기서 빌려주므로 룰 정의는 ui-quality-gate.mjs 한 곳에만 산다 —
// 테스트가 같은 정규식을 다시 쓰면 한쪽만 고쳐졌을 때 게이트와 테스트가 조용히 어긋난다.

/** 저장소 루트. 테스트마다 `../../` 를 세지 않도록 상대경로를 여기서 해석한다. */
const repoRoot = new URL('../../', import.meta.url);

interface GateViolation {
  id: string;
  line: number;
}

/** 저장소 루트 기준 상대경로(`app/page.tsx`)로 소스를 읽어 스캔 도구를 붙인다. */
export function readSource(relPath: string) {
  const source = readFileSync(fileURLToPath(new URL(relPath, repoRoot)), 'utf8');
  const lines = source.split(/\r?\n/);
  const at = (no: number) => `${no}: ${(lines[no - 1] ?? '').trim()}`;

  return {
    /** 파일 전문 — 여러 줄에 걸친 패턴(주입 CSS 블록 등)을 볼 때 쓴다. */
    source,
    lines,
    /** 위반 줄을 "번호: 내용" 으로 만들어 실패 메시지에서 바로 위치를 알 수 있게 한다. */
    locate: (predicate: (line: string) => boolean, from = 0, to = lines.length): string[] =>
      lines
        .slice(from, to)
        .map((line, index) => ({ line, no: from + index + 1 }))
        .filter(({ line }) => predicate(line))
        .map(({ no }) => at(no)),
    occurrences: (needle: string): number => source.split(needle).length - 1,
    /** 템플릿 보간(`${NAME}`) 사용 횟수. */
    interpolations: (name: string): number =>
      (source.match(new RegExp(`\\$\\{${name}\\}`, 'g')) ?? []).length,
    /** 게이트 룰 위반 줄 — 테스트가 룰을 다시 구현하지 않기 위한 통로. */
    gateViolations: (ruleId: string): string[] =>
      (lintSource(relPath, source) as GateViolation[])
        .filter((violation) => violation.id === ruleId)
        .map((violation) => at(violation.line)),
  };
}
