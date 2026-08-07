// ARIA APG radiogroup 의 키보드 계약 판정부. DOM 없이 검증할 수 있도록 순수 함수로 분리했다
// (같은 디렉터리 modalDialog.ts 의 nextTrapTarget 과 같은 분리 방식).
//
// 왜: 칩을 전부 tab stop 으로 두면 키보드 사용자가 다음 입력칸까지 Tab 을 18번 눌러야 한다.
// radiogroup 의 기대치는 tab stop 1개 + 방향키 이동이다.

// 칩이 그리드로 줄바꿈돼 있어도 좌우·상하를 같은 한 줄 순회로 다룬다.
const FORWARD_KEYS = ['ArrowRight', 'ArrowDown'];
const BACKWARD_KEYS = ['ArrowLeft', 'ArrowUp'];

/** 그룹에서 유일하게 Tab 으로 들어오는 항목 — 선택된 항목, 아직 고르지 않았으면 첫 항목. */
export function rovingTabStop<T extends string>(options: readonly T[], selected: T | ''): number {
  const index = options.indexOf(selected as T);
  // 목록에서 사라진 값이 남아 있어도 그룹이 Tab 순서에서 통째로 빠지면 안 된다.
  return index < 0 ? 0 : index;
}

/** 방향키가 가리키는 항목. 끝에서 되감는다. 이동 키가 아니면 null(브라우저 기본 동작 유지). */
export function nextRovingIndex(count: number, current: number, key: string): number | null {
  if (count <= 0) return null;
  const forward = FORWARD_KEYS.includes(key);
  if (!forward && !BACKWARD_KEYS.includes(key)) return null;
  // 포커스가 항목 밖에 있으면 진행 방향의 끝에서 시작한다.
  if (current < 0 || current >= count) return forward ? 0 : count - 1;
  return forward ? (current + 1) % count : (current - 1 + count) % count;
}
