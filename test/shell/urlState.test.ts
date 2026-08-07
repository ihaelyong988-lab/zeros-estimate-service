import { describe, expect, it } from 'vitest';
import {
  buildShellUrl,
  parseShellUrl,
  shouldPushShellUrl,
  shouldRearmExitGuard,
  type ShellUrlInput,
} from '@/lib/shell/urlState';

// 셸의 URL 동기화 판정부만 검증한다. pushState·popstate 바인딩은 DOM 이라 여기서 다루지 않는다.
const base: ShellUrlInput = {
  isUserMode: true,
  adminView: 'dashboard',
  isMobileLayout: false,
  homeSubView: 'home',
  activeTab: 'home',
  selectedMenu: '',
  selectedBudget: '',
  keepMobileFlag: false,
};

describe('buildShellUrl', () => {
  it('홈 기본 상태는 쿼리 없이 경로만 남긴다', () => {
    expect(buildShellUrl('/', base)).toBe('/');
  });

  it('홈이 아닌 탭은 tab 으로 실린다', () => {
    expect(buildShellUrl('/', { ...base, activeTab: 'performance' })).toBe('/?tab=performance');
  });

  it('홈에서 고른 공종·견적규모는 menu·budget 으로 실린다', () => {
    expect(buildShellUrl('/', { ...base, selectedMenu: '배관공사' })).toBe('/?menu=%EB%B0%B0%EA%B4%80%EA%B3%B5%EC%82%AC');
    expect(buildShellUrl('/', { ...base, selectedBudget: 'large' })).toBe('/?budget=large');
  });

  it('공종과 견적규모가 함께 들어오면 공종이 이긴다', () => {
    expect(buildShellUrl('/', { ...base, selectedMenu: 'skid', selectedBudget: 'large' })).toBe('/?menu=skid');
  });

  // C8 — 좌측 사이드바는 공종 선택 시 activeTab 을 'review' 로 함께 바꾼다.
  // 배타 분기면 tab 만 실려 공종이 주소에서 사라지고, 뒤로가기·새로고침이 선택을 잃는다.
  it('검토 탭에서 고른 공종은 tab 과 함께 실린다', () => {
    expect(buildShellUrl('/', { ...base, activeTab: 'review', selectedMenu: 'skid' })).toBe('/?tab=review&menu=skid');
  });

  it('검토 탭에서 고른 견적규모도 tab 과 함께 실린다', () => {
    expect(buildShellUrl('/', { ...base, activeTab: 'review', selectedBudget: 'medium' })).toBe(
      '/?tab=review&budget=medium'
    );
  });

  it('관리자 모드는 mode=admin 으로만 실리고 공종·견적규모는 싣지 않는다', () => {
    expect(buildShellUrl('/', { ...base, isUserMode: false, selectedMenu: 'skid' })).toBe('/?mode=admin');
    expect(buildShellUrl('/', { ...base, isUserMode: false, adminView: 'estimates' })).toBe(
      '/?mode=admin&view=estimates'
    );
  });

  it('모바일 겹침 화면(마이페이지·의사결정)은 탭 하나로만 표현한다', () => {
    const mobile = { ...base, isMobileLayout: true };
    expect(buildShellUrl('/', { ...mobile, homeSubView: 'account' })).toBe('/?tab=account');
    expect(buildShellUrl('/', { ...mobile, homeSubView: 'decision', activeTab: 'review' })).toBe('/?tab=decision');
  });

  it('데스크톱에서는 겹침 화면 값이 주소에 실리지 않는다', () => {
    expect(buildShellUrl('/', { ...base, homeSubView: 'account' })).toBe('/');
  });

  it('시뮬레이터 진입 표식은 화면이 바뀌어도 유지한다', () => {
    expect(buildShellUrl('/', { ...base, keepMobileFlag: true, activeTab: 'sop' })).toBe('/?mobile=true&tab=sop');
  });
});

describe('parseShellUrl', () => {
  it('빈 주소는 홈으로 읽는다', () => {
    expect(parseShellUrl('')).toEqual({
      isUserMode: true,
      adminView: 'dashboard',
      activeTab: 'home',
      homeSubView: 'home',
      selectedMenu: '',
      selectedBudget: '',
    });
  });

  it('모르는 탭 값은 홈으로 떨어뜨린다', () => {
    expect(parseShellUrl('?tab=nope').activeTab).toBe('home');
  });

  // C8 복원부 — 생성부가 tab+menu 를 함께 실으므로 복원도 둘 다 읽어야 한다.
  it('tab 과 menu 가 함께 있으면 둘 다 복원한다', () => {
    expect(parseShellUrl('?tab=review&menu=skid')).toMatchObject({
      activeTab: 'review',
      selectedMenu: 'skid',
      selectedBudget: '',
    });
  });

  it('tab 과 budget 이 함께 있으면 둘 다 복원한다', () => {
    expect(parseShellUrl('?tab=review&budget=medium')).toMatchObject({
      activeTab: 'review',
      selectedMenu: '',
      selectedBudget: 'medium',
    });
  });

  it('menu 가 있으면 budget 은 버린다', () => {
    expect(parseShellUrl('?menu=skid&budget=large')).toMatchObject({ selectedMenu: 'skid', selectedBudget: '' });
  });

  it('관리자 주소는 관리자 모드와 화면을 복원한다', () => {
    expect(parseShellUrl('?mode=admin&view=visits')).toMatchObject({ isUserMode: false, adminView: 'visits' });
    expect(parseShellUrl('?mode=admin&view=nope')).toMatchObject({ isUserMode: false, adminView: 'dashboard' });
  });

  it('겹침 화면 주소는 홈 탭 위 겹침으로 복원한다', () => {
    expect(parseShellUrl('?tab=account')).toMatchObject({ activeTab: 'home', homeSubView: 'account' });
    expect(parseShellUrl('?tab=decision')).toMatchObject({ activeTab: 'home', homeSubView: 'decision' });
  });
});

describe('buildShellUrl → parseShellUrl 왕복', () => {
  const cases: { name: string; input: ShellUrlInput }[] = [
    { name: '홈', input: base },
    { name: '검토 탭 + 공종', input: { ...base, activeTab: 'review', selectedMenu: 'CAPEX 개·증설 검토' } },
    { name: '검토 탭 + 견적규모', input: { ...base, activeTab: 'review', selectedBudget: 'unknown' } },
    { name: '홈 + 공종', input: { ...base, selectedMenu: '노후배관교체' } },
    { name: '실적 탭', input: { ...base, activeTab: 'performance' } },
    { name: '관리자 견적 접수관리', input: { ...base, isUserMode: false, adminView: 'estimates' } },
    { name: '모바일 마이페이지', input: { ...base, isMobileLayout: true, homeSubView: 'account' } },
  ];

  it.each(cases)('$name 은 왕복해도 상태가 같다', ({ input }) => {
    const url = buildShellUrl('/', input);
    const search = url.includes('?') ? url.slice(url.indexOf('?')) : '';
    expect(parseShellUrl(search)).toMatchObject({
      isUserMode: input.isUserMode,
      activeTab: input.isUserMode && !(input.isMobileLayout && input.homeSubView !== 'home') ? input.activeTab : 'home',
      selectedMenu: input.isUserMode && input.homeSubView === 'home' ? input.selectedMenu : '',
      selectedBudget:
        input.isUserMode && input.homeSubView === 'home' && !input.selectedMenu ? input.selectedBudget : '',
    });
  });
});

describe('shouldPushShellUrl', () => {
  it('현재 주소와 같으면 쌓지 않는다', () => {
    expect(shouldPushShellUrl('/?tab=review', '/?tab=review', '/')).toBe(false);
  });

  it('직전에 쌓은 주소와 같으면 쌓지 않는다', () => {
    expect(shouldPushShellUrl('/?tab=review', '/', '/?tab=review')).toBe(false);
  });

  it('둘 다와 다르면 쌓는다', () => {
    expect(shouldPushShellUrl('/?tab=review&menu=skid', '/?tab=review', '/?tab=review')).toBe(true);
  });
});

// C7 — window.close() 는 스크립트가 연 창이 아니면 차단된다. 이때 소진된 뒤로가기 가드를
// 다시 쌓지 않으면 다음 뒤로가기에서 화면과 주소가 어긋난다.
describe('shouldRearmExitGuard', () => {
  const alive = { windowClosed: false, documentHidden: false, atGuardEntry: true };

  it('창이 닫히지 않고 살아 있으면 가드를 다시 쌓는다', () => {
    expect(shouldRearmExitGuard(alive)).toBe(true);
  });

  it('실제로 닫혔으면 손대지 않는다', () => {
    expect(shouldRearmExitGuard({ ...alive, windowClosed: true })).toBe(false);
  });

  it('백그라운드로 내려갔으면 손대지 않는다', () => {
    expect(shouldRearmExitGuard({ ...alive, documentHidden: true })).toBe(false);
  });

  it('그 사이 다른 화면으로 옮겼으면 손대지 않는다', () => {
    expect(shouldRearmExitGuard({ ...alive, atGuardEntry: false })).toBe(false);
  });
});
