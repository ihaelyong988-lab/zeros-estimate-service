// 셸(AppShell)의 URL ↔ 화면상태 변환 판정부. DOM·React 없이 채점할 수 있도록 순수 함수로 분리한다.
// 실제 pushState·popstate 바인딩은 AppShell 이 맡는다.

export type ShellTab = 'business' | 'performance' | 'request' | 'home' | 'sop' | 'review' | 'process';

export const SHELL_TABS: ShellTab[] = ['business', 'performance', 'request', 'home', 'sop', 'review', 'process'];

export type ShellAdminView =
  | 'dashboard'
  | 'estimates'
  | 'visits'
  | 'customers'
  | 'performance'
  | 'notifications';

export const SHELL_ADMIN_VIEWS: ShellAdminView[] = [
  'dashboard',
  'estimates',
  'visits',
  'customers',
  'performance',
  'notifications',
];

/** 모바일 홈 위에 겹쳐 뜨는 화면. 'home' 이면 겹침 없음. */
export type ShellHomeSubView = 'home' | 'account' | 'decision';

export interface ShellUrlInput {
  isUserMode: boolean;
  adminView: ShellAdminView;
  isMobileLayout: boolean;
  /** 모바일에서 홈 위에 겹쳐 뜬 화면 — 'account' · 'decision' 만 URL 에 실린다. */
  homeSubView: ShellHomeSubView;
  activeTab: ShellTab;
  selectedMenu: string;
  selectedBudget: string;
  /** 시뮬레이터 진입(?mobile=true)은 어떤 화면으로 옮겨도 유지한다. */
  keepMobileFlag: boolean;
}

export interface ShellUrlState {
  isUserMode: boolean;
  adminView: ShellAdminView;
  activeTab: ShellTab;
  homeSubView: ShellHomeSubView;
  selectedMenu: string;
  selectedBudget: string;
}

/** 현재 화면상태를 주소로 옮긴다. 반환값은 pathname 을 포함한 완성 URL. */
export function buildShellUrl(pathname: string, input: ShellUrlInput): string {
  const params = new URLSearchParams();
  if (input.keepMobileFlag) params.set('mobile', 'true');

  if (!input.isUserMode) {
    params.set('mode', 'admin');
    if (input.adminView !== 'dashboard') params.set('view', input.adminView);
  } else if (input.isMobileLayout && input.homeSubView === 'decision') {
    params.set('tab', 'decision');
  } else if (input.isMobileLayout && input.homeSubView === 'account') {
    params.set('tab', 'account');
  } else {
    // 탭과 선택(공종·견적규모)은 서로 배타가 아니다 — 좌측 사이드바는 공종을 고를 때
    // activeTab 을 'review' 로 함께 바꾼다. 배타 분기면 tab 만 남아 선택이 주소에서 사라진다.
    if (input.activeTab !== 'home') params.set('tab', input.activeTab);
    if (input.selectedMenu) params.set('menu', input.selectedMenu);
    else if (input.selectedBudget) params.set('budget', input.selectedBudget);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** 주소를 화면상태로 되돌린다(뒤로가기·직접 진입 공통). */
export function parseShellUrl(search: string): ShellUrlState {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  const menu = params.get('menu') || '';
  const budget = params.get('budget') || '';
  const viewParam = params.get('view') as ShellAdminView | null;

  if (params.get('mode') === 'admin') {
    return {
      isUserMode: false,
      adminView: viewParam && SHELL_ADMIN_VIEWS.includes(viewParam) ? viewParam : 'dashboard',
      activeTab: 'home',
      homeSubView: 'home',
      selectedMenu: '',
      selectedBudget: '',
    };
  }

  if (tab === 'decision' || tab === 'account') {
    return {
      isUserMode: true,
      adminView: 'dashboard',
      activeTab: 'home',
      homeSubView: tab,
      selectedMenu: '',
      selectedBudget: '',
    };
  }

  // 탭과 선택을 함께 읽는다(생성부와 대칭) — 모르는 탭 값은 홈으로 떨어뜨린다.
  const activeTab = tab && SHELL_TABS.includes(tab as ShellTab) ? (tab as ShellTab) : 'home';

  return {
    isUserMode: true,
    adminView: 'dashboard',
    activeTab,
    homeSubView: 'home',
    selectedMenu: menu,
    selectedBudget: menu ? '' : budget,
  };
}

/** 같은 주소를 다시 쌓으면 뒤로가기 한 번이 헛돈다 — 현재 주소·직전에 쌓은 주소와 모두 다를 때만 push. */
export function shouldPushShellUrl(nextUrl: string, currentUrl: string, lastPushedUrl: string): boolean {
  return nextUrl !== currentUrl && nextUrl !== lastPushedUrl;
}

/**
 * 종료 팝업 '닫기' 후 뒤로가기 가드를 다시 쌓아야 하는지.
 * window.close() 는 스크립트가 연 창이 아니면 브라우저가 막는다 — 창이 그대로 살아 있으면
 * 소진된 가드를 복구해야 다음 뒤로가기에서 화면과 주소가 어긋나지 않는다.
 */
export function shouldRearmExitGuard(status: {
  windowClosed: boolean;
  documentHidden: boolean;
  /** 아직 가드 엔트리(스택 바닥)에 서 있는가 — 그 사이 다른 화면으로 옮겼으면 중복 엔트리를 만들지 않는다. */
  atGuardEntry: boolean;
}): boolean {
  return status.atGuardEntry && !status.windowClosed && !status.documentHidden;
}
