'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ActiveTab = 'about' | 'performance' | 'request' | 'home';

export interface ShellContextType {
  isUserMode: boolean;
  setIsUserMode: (mode: boolean) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedMenu: string;
  setSelectedMenu: (menu: string) => void;
  selectedBudget: string;
  setSelectedBudget: (budget: string) => void;
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

export const ShellProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isUserMode, setIsUserMode] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedMenu, setSelectedMenu] = useState<string>('');
  const [selectedBudget, setSelectedBudget] = useState<string>('');
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
        activeTab,
        setActiveTab,
        selectedMenu,
        setSelectedMenu,
        selectedBudget,
        setSelectedBudget,
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

