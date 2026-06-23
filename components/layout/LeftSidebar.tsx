'use client';

import React from 'react';
import { useShell } from '@/lib/context/ShellContext';
import {
  ChevronRight,
  TrendingUp,
  LayoutGrid,
  FileText,
  CalendarRange,
  Users2,
  Cpu,
  Gauge
} from 'lucide-react';
import { WorkType } from '@/types/estimate';
import { menuDisplayName } from '@/lib/constants/menu';

export const LeftSidebar: React.FC = () => {
  const {
    isUserMode,
    activeTab,
    setActiveTab,
    selectedMenu,
    setSelectedMenu,
    selectedBudget,
    setSelectedBudget,
    adminView,
    setAdminView,
    setMobileMenuOpen,
  } = useShell();

  // 8대 공사영역 카테고리
  // 제목은 공용 맵(menuDisplayName)에서 가져온다 — 우측 결과 패널과 단일 소스로 일치.
  const workCategories: { label: WorkType; desc: string }[] = [
    { label: '배관공사', desc: '일반/용수/가스 배관 라인' },
    { label: '장비설치', desc: '펌프, 탱크, 콤프레셔 안착' },
    { label: 'Utility 배관', desc: '공장 유틸리티 배관 라인' },
    { label: '공장증설', desc: '생산라인 증설 및 분기 배관' },
    { label: '노후배관교체', desc: '노후 배관 철거 및 신설' },
    { label: '기계실개선', desc: '기계실 배관 효율 및 동선 개선' },
    { label: '생산설비 배관 연결', desc: '제조 설비 훅업(Hook-up) 연결' },
    { label: 'CAPEX 개·증설 검토', desc: '사전 도면 및 견적 한도 검토' },
  ];

  // 외주 제작 카테고리 (사전제작 / 모듈화 공급)
  const fabricationCategories: { key: string; label: string; desc: string }[] = [
    { key: 'spool', label: '배관 SPOOL Module 검토', desc: 'ISO 도면 기반 스풀 사전제작' },
    { key: 'skid', label: 'SKID . SPOOL제작 견적', desc: '단일 프레임 패키지 모듈화' },
    { key: 'structure', label: 'Structure제작,설치', desc: '가대·플랫폼 철구조물 가공' },
  ];

  // 견적규모별 카테고리
  const budgetCategories = [
    { value: 'small', label: '온라인 간편검토', range: '≤1,000만' },
    { value: 'medium', label: '출장견적', range: '1,000만~1억' },
    { value: 'large', label: '프로젝트 사전진단', range: '>1억' },
    { value: 'unknown', label: '공사규모·금액 미정', range: '온라인 컨설팅' },
  ];

  const scrollMainPanelToTop = () => {
    window.requestAnimationFrame(() => {
      const mainScroll = document.querySelector('[data-main-scroll="true"]') as HTMLElement | null;
      mainScroll?.scrollTo({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const handleMenuClick = (menu: string) => {
    if (activeTab !== 'review') {
      setActiveTab('review');
    }
    setSelectedMenu(menu);
    setSelectedBudget(''); // 영역 필터 해제
    setMobileMenuOpen(false); // 모바일 드로어 자동 닫기
    scrollMainPanelToTop();
  };

  const handleBudgetClick = (budgetVal: string) => {
    if (activeTab !== 'review') {
      setActiveTab('review');
    }
    setSelectedBudget(budgetVal);
    setSelectedMenu(''); // 영역 필터 해제
    setMobileMenuOpen(false); // 모바일 드로어 자동 닫기
    scrollMainPanelToTop();
  };

  return (
    <aside className={`w-full xl:w-72 xl:h-full p-5 flex flex-col gap-6 select-none shrink-0 overflow-y-auto no-scrollbar ${isUserMode ? 'bg-gradient-to-b from-[#16365F] to-[#0E2240]' : 'bg-bg-subtle'}`}>
      {isUserMode ? (
        // ==================== 고객 모드 메뉴 ====================
        <>
          {/* 공사 영역 카테고리 */}
          <div>
            <div className="px-2 mb-3">
              <h3 className="inline-block text-[11.5px] font-bold text-white tracking-[0.04em] pb-1.5 border-b-2 border-[#5AA9FF]">견적공사 카테고리</h3>
            </div>
            <div className="flex flex-col gap-1">
              {workCategories.map((cat) => {
                const isActive = selectedMenu === cat.label && !selectedBudget && activeTab === 'review';
                return (
                  <button
                    key={cat.label}
                    onClick={() => handleMenuClick(cat.label)}
                    style={{ touchAction: 'manipulation' }}
                    className={`w-full text-left pl-3 pr-2 py-2 rounded-r-custom transition-colors duration-150 flex flex-col border-l-2 ${
                      isActive
                        ? 'bg-[rgba(90,169,255,0.16)] border-[#5AA9FF] text-white'
                        : 'border-transparent hover:bg-white/5 text-[#D7E2F2] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[13.5px] ${isActive ? 'font-bold' : 'font-medium'}`}>{menuDisplayName(cat.label)}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#5AA9FF]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 외주 제작 카테고리 */}
          <div>
            <div className="px-2 mb-3">
              <h3 className="inline-block text-[11.5px] font-bold text-white tracking-[0.04em] pb-1.5 border-b-2 border-[#F4A93C]">외주제작 견적 컨설팅</h3>
            </div>
            <div className="flex flex-col gap-1">
              {fabricationCategories.map((cat) => {
                const isActive = selectedMenu === cat.key && !selectedBudget && activeTab === 'review';
                return (
                  <button
                    key={cat.key}
                    onClick={() => handleMenuClick(cat.key)}
                    style={{ touchAction: 'manipulation' }}
                    className={`w-full text-left pl-3 pr-2 py-2 rounded-r-custom transition-colors duration-150 flex flex-col border-l-2 ${
                      isActive
                        ? 'bg-[rgba(244,169,60,0.16)] border-[#F4A93C] text-white'
                        : 'border-transparent hover:bg-white/5 text-[#D7E2F2] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[13.5px] ${isActive ? 'font-bold' : 'font-medium'}`}>{menuDisplayName(cat.key)}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#F4A93C]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 견적 규모 카테고리 */}
          <div>
            <div className="px-2 mb-3">
              <h3 className="inline-block text-[11.5px] font-bold text-white tracking-[0.04em] pb-1.5 border-b-2 border-[#34D399]">예상 견적총액별 방안</h3>
            </div>
            <div className="flex flex-col gap-1">
              {budgetCategories.map((cat) => {
                const isActive = selectedBudget === cat.value && !selectedMenu && activeTab === 'review';
                return (
                  <button
                    key={cat.value}
                    onClick={() => handleBudgetClick(cat.value)}
                    style={{ touchAction: 'manipulation' }}
                    className={`w-full text-left pl-3 pr-2 py-2 rounded-r-custom transition-colors duration-150 flex items-center justify-between border-l-2 ${
                      isActive
                        ? 'bg-[rgba(52,211,153,0.15)] border-[#34D399] text-white'
                        : 'border-transparent hover:bg-white/5 text-[#D7E2F2] hover:text-white'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className={`text-[13.5px] ${isActive ? 'font-bold' : 'font-medium'}`}>{menuDisplayName(cat.value)}</span>
                      <span className="text-[11.5px] text-[#8AA0C2] font-medium mt-0.5">{cat.range}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#34D399]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 빠른 메뉴 */}
          <div>
            <div className="px-2 mb-3">
              <h3 className="inline-block text-[11.5px] font-bold text-white tracking-[0.04em] pb-1.5 border-b-2 border-[#6B8CB8]">빠른 메뉴</h3>
            </div>
            <div className="flex flex-col gap-1 px-2 text-[12px] text-[#8AA0C2] font-medium">
              * 바로가기 기능 준비 중입니다.
            </div>
          </div>
        </>
      ) : (
        // ==================== 관리자 모드 메뉴 ====================
        <>
          <div className="flex flex-col gap-1.5">
            <div className="px-2 mb-2 flex items-center gap-1.5 text-navy">
              <Gauge className="w-4 h-4 text-navy" />
              <h3 className="text-[12px] font-black uppercase tracking-wider">사전진단 관리</h3>
            </div>

            <button
              onClick={() => {
                setAdminView('dashboard');
                setMobileMenuOpen(false);
              }}
              style={{ touchAction: 'manipulation' }}
              className={`w-full text-left px-3 py-2.5 rounded-custom transition-all duration-150 flex items-center gap-2.5 text-[13.5px] font-bold ${
                adminView === 'dashboard'
                  ? 'bg-navy text-bg shadow-md'
                  : 'hover:bg-bg/40 text-gray hover:text-navy'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              관리자 대시보드
            </button>

            <button
              onClick={() => {
                setAdminView('estimates');
                setMobileMenuOpen(false);
              }}
              style={{ touchAction: 'manipulation' }}
              className={`w-full text-left px-3 py-2.5 rounded-custom transition-all duration-150 flex items-center gap-2.5 text-[13.5px] font-bold ${
                adminView === 'estimates'
                  ? 'bg-navy text-bg shadow-md'
                  : 'hover:bg-bg/40 text-gray hover:text-navy'
              }`}
            >
              <FileText className="w-4 h-4" />
              견적 접수관리
            </button>

            <button
              onClick={() => {
                setAdminView('visits');
                setMobileMenuOpen(false);
              }}
              style={{ touchAction: 'manipulation' }}
              className={`w-full text-left px-3 py-2.5 rounded-custom transition-all duration-150 flex items-center gap-2.5 text-[13.5px] font-bold ${
                adminView === 'visits'
                  ? 'bg-navy text-bg shadow-md'
                  : 'hover:bg-bg/40 text-gray hover:text-navy'
              }`}
            >
              <CalendarRange className="w-4 h-4" />
              현장방문 관리
            </button>

            <button
              onClick={() => {
                setAdminView('customers');
                setMobileMenuOpen(false);
              }}
              style={{ touchAction: 'manipulation' }}
              className={`w-full text-left px-3 py-2.5 rounded-custom transition-all duration-150 flex items-center gap-2.5 text-[13.5px] font-bold ${
                adminView === 'customers'
                  ? 'bg-navy text-bg shadow-md'
                  : 'hover:bg-bg/40 text-gray hover:text-navy'
              }`}
            >
              <Users2 className="w-4 h-4" />
              고객 정보 관리
            </button>

            <button
              onClick={() => {
                setAdminView('performance');
                setMobileMenuOpen(false);
              }}
              style={{ touchAction: 'manipulation' }}
              className={`w-full text-left px-3 py-2.5 rounded-custom transition-all duration-150 flex items-center gap-2.5 text-[13.5px] font-bold ${
                adminView === 'performance'
                  ? 'bg-navy text-bg shadow-md'
                  : 'hover:bg-bg/40 text-gray hover:text-navy'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              실적/파이프라인 통계
            </button>

            <button
              onClick={() => {
                setAdminView('notifications');
                setMobileMenuOpen(false);
              }}
              style={{ touchAction: 'manipulation' }}
              className={`w-full text-left px-3 py-2.5 rounded-custom transition-all duration-150 flex items-center gap-2.5 text-[13.5px] font-bold ${
                adminView === 'notifications'
                  ? 'bg-navy text-bg shadow-md'
                  : 'hover:bg-bg/40 text-gray hover:text-navy'
              }`}
            >
              <Cpu className="w-4 h-4" />
              알림 발송 로그
            </button>
          </div>
        </>
      )}
    </aside>
  );
};
