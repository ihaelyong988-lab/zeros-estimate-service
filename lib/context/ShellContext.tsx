'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';

export type ActiveTab = 'about' | 'performance' | 'request' | 'home' | 'sop' | 'review';

const TAB_VALUES: ActiveTab[] = ['about', 'performance', 'request', 'home', 'sop', 'review'];

// 현재 URL의 ?tab= 값을 탭으로 해석 (없거나 모르는 값이면 home)
const parseTabFromUrl = (): ActiveTab => {
  const t = new URLSearchParams(window.location.search).get('tab');
  return TAB_VALUES.includes(t as ActiveTab) ? (t as ActiveTab) : 'home';
};

const getMainPanel = () =>
  document.querySelector('[data-main-scroll="true"]') as HTMLElement | null;

export interface ShellContextType {
  isUserMode: boolean;
  setIsUserMode: (mode: boolean) => void;
  isAdminAuthed: boolean;
  setAdminAuthed: (authed: boolean) => void;
  logoutAdmin: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedMenu: string;
  setSelectedMenu: (menu: string) => void;
  selectedBudget: string;
  setSelectedBudget: (budget: string) => void;
  // 랜딩 쇼케이스가 자동 순회 중인 공종명 — 최상단 칩바 하이라이트/자동스크롤 연동용
  landingTradeName: string;
  setLandingTradeName: (name: string) => void;
  // 순회 중인 공종의 시그니처 색(활성 칩 className) — 칩 바탕색을 쇼케이스 색과 일치시킴
  landingTradeChipClass: string;
  setLandingTradeChipClass: (cls: string) => void;
  adminView: 'dashboard' | 'estimates' | 'visits' | 'customers' | 'performance' | 'notifications';
  setAdminView: (view: 'dashboard' | 'estimates' | 'visits' | 'customers' | 'performance' | 'notifications') => void;
  adminSubView: 'table' | 'kanban';
  setAdminSubView: (view: 'table' | 'kanban') => void;
  selectedEstimateId: string | null;
  setSelectedEstimateId: (id: string | null) => void;
  sliderVal: number;
  setSliderVal: (val: number) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  showSimulator: boolean;
  setShowSimulator: (show: boolean) => void;
}

const ShellContext = createContext<ShellContextType | undefined>(undefined);

// 관리자 인증 상태 저장 키 (브라우저별로 1회 로그인 유지)
const ADMIN_AUTH_KEY = 'zeros_admin_authed';

export const ShellProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isUserMode, setIsUserMode] = useState<boolean>(true);

  // 관리자 인증 여부 — localStorage에서 복원 (기기당 한 번 로그인하면 유지)
  const [isAdminAuthed, setIsAdminAuthedState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
  });

  const setAdminAuthed = (authed: boolean) => {
    setIsAdminAuthedState(authed);
    if (typeof window !== 'undefined') {
      if (authed) localStorage.setItem(ADMIN_AUTH_KEY, 'true');
      else localStorage.removeItem(ADMIN_AUTH_KEY);
    }
  };

  const logoutAdmin = () => {
    setAdminAuthed(false);
    setIsUserMode(true);
  };
  const [activeTab, setActiveTabState] = useState<ActiveTab>('home');
  const activeTabRef = useRef<ActiveTab>('home');
  // 탭별 메인 패널 스크롤 위치 — 뒤로가기 복귀 시 보던 위치(예: 랜딩 3페이지)로 되돌린다.
  // URL(?tab=) ↔ 탭 상태 동기화 자체는 AppShell의 applyUrlState/pushState가 담당한다.
  const tabScrollRef = useRef<Partial<Record<ActiveTab, number>>>({});

  // 뒤로가기·앞으로가기로 탭이 복귀하면, 떠날 때 저장해 둔 스크롤 위치를 복원한다.
  useEffect(() => {
    const restoreScrollForUrlTab = () => {
      const tab = parseTabFromUrl();
      // AppShell의 popstate 핸들러가 탭 상태를 되돌려 렌더를 마친 뒤 복원
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const pos = tabScrollRef.current[tab];
          if (pos != null) getMainPanel()?.scrollTo({ top: pos });
        });
      });
    };
    window.addEventListener('popstate', restoreScrollForUrlTab);
    return () => window.removeEventListener('popstate', restoreScrollForUrlTab);
  }, []);

  // 탭을 떠날 때 현재 스크롤 위치를 기억해 둔다.
  // useCallback으로 함수 정체성을 고정 — 이 setter를 의존성으로 쓰는 AppShell의
  // URL 동기화 이펙트가 렌더마다 재실행(applyUrlState 오발동)되는 것을 방지한다.
  const setActiveTab = useCallback((tab: ActiveTab) => {
    if (typeof window !== 'undefined' && tab !== activeTabRef.current) {
      tabScrollRef.current[activeTabRef.current] = getMainPanel()?.scrollTop ?? 0;
    }
    activeTabRef.current = tab;
    setActiveTabState(tab);
  }, []);
  const [selectedMenu, setSelectedMenu] = useState<string>('');
  const [selectedBudget, setSelectedBudget] = useState<string>('');
  const [landingTradeName, setLandingTradeName] = useState<string>('');
  const [landingTradeChipClass, setLandingTradeChipClass] = useState<string>('bg-steel border-steel text-bg');
  const [adminView, setAdminView] = useState<'dashboard' | 'estimates' | 'visits' | 'customers' | 'performance' | 'notifications'>('dashboard');
  const [adminSubView, setAdminSubView] = useState<'table' | 'kanban'>('table');
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);
  const [sliderVal, setSliderVal] = useState<number>(50);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showSimulator, setShowSimulator] = useState<boolean>(false);

  return (
    <ShellContext.Provider
      value={{
        isUserMode,
        setIsUserMode,
        isAdminAuthed,
        setAdminAuthed,
        logoutAdmin,
        activeTab,
        setActiveTab,
        selectedMenu,
        setSelectedMenu,
        selectedBudget,
        setSelectedBudget,
        landingTradeName,
        setLandingTradeName,
        landingTradeChipClass,
        setLandingTradeChipClass,
        adminView,
        setAdminView,
        adminSubView,
        setAdminSubView,
        selectedEstimateId,
        setSelectedEstimateId,
        sliderVal,
        setSliderVal,
        mobileMenuOpen,
        setMobileMenuOpen,
        showSimulator,
        setShowSimulator,
      }}
    >
      {children}
    </ShellContext.Provider>
  );
};

export const useShell = () => {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error('useShell must be used within a ShellProvider');
  }
  return context;
};
