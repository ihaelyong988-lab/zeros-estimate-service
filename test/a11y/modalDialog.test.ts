import { describe, expect, it } from 'vitest';
import { nextTrapTarget } from '@/lib/a11y/modalDialog';

// 포커스 트랩의 판정부(어느 요소로 보낼지)만 순수 함수로 분리해 검증한다.
// 실제 focus() 호출·keydown 바인딩은 DOM 이라 여기서 다루지 않는다.
describe('nextTrapTarget', () => {
  const items = ['first', 'mid', 'last'];

  it('포커스 가능한 요소가 없으면 이동 대상도 없다', () => {
    expect(nextTrapTarget([], null, false)).toBeNull();
    expect(nextTrapTarget([], null, true)).toBeNull();
  });

  it('마지막 요소에서 Tab 을 누르면 첫 요소로 되돌린다', () => {
    expect(nextTrapTarget(items, 'last', false)).toBe('first');
  });

  it('첫 요소에서 Shift+Tab 을 누르면 마지막 요소로 되돌린다', () => {
    expect(nextTrapTarget(items, 'first', true)).toBe('last');
  });

  it('가운데 요소는 브라우저 기본 이동에 맡긴다', () => {
    expect(nextTrapTarget(items, 'mid', false)).toBeNull();
    expect(nextTrapTarget(items, 'mid', true)).toBeNull();
  });

  it('첫 요소의 Tab · 마지막 요소의 Shift+Tab 은 기본 이동에 맡긴다', () => {
    expect(nextTrapTarget(items, 'first', false)).toBeNull();
    expect(nextTrapTarget(items, 'last', true)).toBeNull();
  });

  it('포커스가 모달 밖에 있으면 진행 방향의 끝 요소로 끌어온다', () => {
    expect(nextTrapTarget(items, null, false)).toBe('first');
    expect(nextTrapTarget(items, null, true)).toBe('last');
    expect(nextTrapTarget(items, 'outside', false)).toBe('first');
    expect(nextTrapTarget(items, 'outside', true)).toBe('last');
  });

  it('포커스 가능한 요소가 하나면 그 자리에 묶어 둔다', () => {
    expect(nextTrapTarget(['only'], 'only', false)).toBe('only');
    expect(nextTrapTarget(['only'], 'only', true)).toBe('only');
  });
});
