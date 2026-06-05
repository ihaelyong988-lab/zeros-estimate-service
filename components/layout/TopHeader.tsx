'use client';

import React from 'react';
import { useShell, ActiveTab } from '@/lib/context/ShellContext';
import { Building2, LogOut, Smartphone } from 'lucide-react';

export const TopHeader: React.FC = () => {
  const {
    isUserMode,
    setIsUserMode,
    logoutAdmin,
    activeTab,
    setActiveTab,
    setSelectedMenu,
    setSelectedBudget,
    setShowSimulator,
  } = useShell();

  const handleTabClick = (tab: ActiveTab) => {
    setIsUserMode(true);
    setActiveTab(tab);
    if (tab === 'home') {
      setSelectedMenu('');
      setSelectedBudget('');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b border-border bg-bg/95 backdrop-blur-md px-8 flex items-center justify-between select-none">
      
      {/* 1. 좌측 로고 영역 - 완벽한 기하학적 대칭 정렬 */}
      <div 
        className="flex items-center gap-3 cursor-pointer select-none"
        onClick={() => handleTabClick('home')}
        style={{ touchAction: 'manipulation' }}
      >
        {/* 완벽한 36px 정사각 로고박스 */}
        <div className="w-9 h-9 bg-navy rounded-custom flex items-center justify-center shrink-0 shadow-sm shadow-navy/10 hover:scale-102 transition-all">
          <Building2 className="w-4.5 h-4.5 text-bg" />
        </div>
        <div className="flex flex-col justify-center">
          <span className="font-black text-[18px] tracking-wider text-navy leading-none uppercase font-sans">ZEROS</span>
          <span className="text-[12px] text-gray-light font-black tracking-widest leading-none mt-1">무료 출장 견적 컨설팅</span>
        </div>
      </div>

      {/* 2. 중앙 탭 네비게이션 - 데스크탑 전용 */}
      <nav className="hidden md:flex items-center gap-1">
        <button
          onClick={() => handleTabClick('home')}
          style={{ touchAction: 'manipulation' }}
          className={`relative px-3.5 py-2 text-[13.5px] font-bold uppercase tracking-wide transition-colors duration-200 cursor-pointer after:absolute after:left-3.5 after:right-3.5 after:-bottom-px after:h-[2px] after:bg-navy after:transition-opacity after:duration-200 ${
            isUserMode && activeTab === 'home'
              ? 'text-navy after:opacity-100'
              : 'text-gray hover:text-navy after:opacity-0 hover:after:opacity-50'
          }`}
        >
          견적 검토 홈
        </button>
        <button
          onClick={() => handleTabClick('about')}
          style={{ touchAction: 'manipulation' }}
          className={`relative px-3.5 py-2 text-[13.5px] font-bold uppercase tracking-wide transition-colors duration-200 cursor-pointer after:absolute after:left-3.5 after:right-3.5 after:-bottom-px after:h-[2px] after:bg-navy after:transition-opacity after:duration-200 ${
            isUserMode && activeTab === 'about'
              ? 'text-navy after:opacity-100'
              : 'text-gray hover:text-navy after:opacity-0 hover:after:opacity-50'
          }`}
        >
          진단 절차
        </button>
        <button
          onClick={() => handleTabClick('performance')}
          style={{ touchAction: 'manipulation' }}
          className={`relative px-3.5 py-2 text-[13.5px] font-bold uppercase tracking-wide transition-colors duration-200 cursor-pointer after:absolute after:left-3.5 after:right-3.5 after:-bottom-px after:h-[2px] after:bg-navy after:transition-opacity after:duration-200 ${
            isUserMode && activeTab === 'performance'
              ? 'text-navy after:opacity-100'
              : 'text-gray hover:text-navy after:opacity-0 hover:after:opacity-50'
          }`}
        >
          실적 집계
        </button>
        <button
          onClick={() => handleTabClick('request')}
          style={{ touchAction: 'manipulation' }}
          className={`relative px-3.5 py-2 text-[13.5px] font-bold uppercase tracking-wide transition-colors duration-200 cursor-pointer after:absolute after:left-3.5 after:right-3.5 after:-bottom-px after:h-[2px] after:bg-navy after:transition-opacity after:duration-200 ${
            isUserMode && activeTab === 'request'
              ? 'text-navy after:opacity-100'
              : 'text-gray hover:text-navy after:opacity-0 hover:after:opacity-50'
          }`}
        >
          예상견적 의뢰하기
        </button>
      </nav>

      {/* 3. 우측 컨트롤 영역 - 높이 및 마진 100% 동기화 (h-9) */}
      <div className="flex items-center gap-3">
        {/* 모바일 시뮬레이터 버튼 - 높이 h-9로 토글과 통일 */}
        <button
          onClick={() => setShowSimulator(true)}
          style={{ touchAction: 'manipulation' }}
          className="h-9 flex items-center gap-1.5 border border-[#E0701A]/30 hover:border-[#E0701A]/60 rounded-custom bg-[#E0701A]/5 text-accent hover:bg-[#E0701A]/10 px-4 py-2 text-[12px] font-black transition-all duration-150 active:scale-95 cursor-pointer shadow-sm"
        >
          <Smartphone className="w-3.5 h-3.5" />
          모바일 앱 시뮬레이터
        </button>

        {/* 관리자 모드일 때만 로그아웃 버튼 노출 (고객 화면에는 관리자 흔적 없음) */}
        {!isUserMode && (
          <button
            onClick={() => logoutAdmin()}
            style={{ touchAction: 'manipulation' }}
            className="h-9 flex items-center gap-1.5 border border-danger/30 hover:border-danger/60 rounded-custom bg-danger/5 text-danger hover:bg-danger/10 px-4 py-2 text-[12px] font-black transition-all duration-150 active:scale-95 cursor-pointer shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            관리자 로그아웃
          </button>
        )}
      </div>
    </header>
  );
};
