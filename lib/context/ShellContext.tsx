'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ActiveTab = 'about' | 'performance' | 'request' | 'home' | 'sop';

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
  const [isAdminAuthed, setIsAdminAuthedState] = useState<boolean>(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsAdminAuthedState(localStorage.getItem(ADMIN_AUTH_KEY) === 'true');
  }, []);

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
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedMenu, setSelectedMenu] = useState<string>('');
  const [selectedBudget, setSelectedBudget] = useState<string>('');
  const [landingTradeName, setLandingTradeName] = useState<string>('');
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

