'use client';

import React from 'react';
import { useShell, ActiveTab } from '@/lib/context/ShellContext';
import { Building2, ShieldCheck, User, Smartphone } from 'lucide-react';

export const TopHeader: React.FC = () => {
  const {
    isUserMode,
    setIsUserMode,
    activeTab,
    setActiveTab,
    setSelectedMenu,
    setSelectedBudget,
    setAdminView,
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
    <header className="sticky top-0 z-40 w-full h-16 border-b border-border bg-bg/95 backdrop-blur-md px-6 flex items-center justify-between shadow-sm select-none">
      
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
      <nav className="hidden md:flex items-center gap-2">
        <button
          onClick={() => handleTabClick('home')}
          style={{ touchAction: 'manipulation' }}
          className={`px-4 py-2 text-[13.5px] font-black transition-all duration-200 uppercase tracking-wide cursor-pointer rounded-custom ${
            isUserMode && activeTab === 'home'
              ? 'text-navy bg-transparent shadow-none'
              : 'text-gray hover:bg-bg-subtle hover:text-navy'
          }`}
        >
          견적 검토 홈
        </button>
        <button
          onClick={() => handleTabClick('about')}
          style={{ touchAction: 'manipulation' }}
          className={`px-4 py-2 text-[13.5px] font-black transition-all duration-200 uppercase tracking-wide cursor-pointer rounded-custom ${
            isUserMode && activeTab === 'about'
              ? 'text-navy bg-transparent shadow-none'
              : 'text-gray hover:bg-bg-subtle hover:text-navy'
          }`}
        >
          회사소개
        </button>
        <button
          onClick={() => handleTabClick('performance')}
          style={{ touchAction: 'manipulation' }}
          className={`px-4 py-2 text-[13.5px] font-black transition-all duration-200 uppercase tracking-wide cursor-pointer rounded-custom ${
            isUserMode && activeTab === 'performance'
              ? 'text-navy bg-transparent shadow-none'
              : 'text-gray hover:bg-bg-subtle hover:text-navy'
          }`}
        >
          실적
        </button>
        <button
          onClick={() => handleTabClick('request')}
          style={{ touchAction: 'manipulation' }}
          className={`px-5 py-2 text-[13.5px] font-black rounded-custom transition-all duration-200 tracking-tight flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer uppercase ${
            isUserMode && activeTab === 'request'
              ? 'bg-accent text-bg shadow-custom-md scale-[1.01]'
              : 'bg-steel text-bg hover:bg-navy'
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

        {/* 고객/관리자 모드 토글러 - 높이 h-9로 시뮬레이터와 통일 */}
        <div className="h-9 flex items-center bg-bg-subtle border border-border p-0.5 rounded-custom select-none">
          <button
            onClick={() => {
              setIsUserMode(true);
              setActiveTab('home');
            }}
            style={{ touchAction: 'manipulation' }}
            className={`h-full flex items-center gap-1.5 px-3.5 py-1 text-[12px] font-black rounded-custom transition-all duration-150 cursor-pointer ${
              isUserMode
                ? 'bg-bg text-steel shadow-sm border border-border/40'
                : 'text-gray hover:text-navy'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            고객 모드
          </button>
          <button
            onClick={() => {
              setIsUserMode(false);
              setAdminView('dashboard');
            }}
            style={{ touchAction: 'manipulation' }}
            className={`h-full flex items-center gap-1.5 px-3.5 py-1 text-[12px] font-black rounded-custom transition-all duration-150 cursor-pointer ${
              !isUserMode
                ? 'bg-navy text-bg shadow-sm'
                : 'text-gray hover:text-navy'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            관리자 모드
          </button>
        </div>
      </div>
    </header>
  );
};
