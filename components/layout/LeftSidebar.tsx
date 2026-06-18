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
  const workCategories: { label: WorkType; displayText?: string; desc: string }[] = [
    { label: '배관공사', displayText: '일반 배관공사', desc: '일반/용수/가스 배관 라인' },
    { label: '장비설치', displayText: '기계 장비설치', desc: '펌프, 탱크, 콤프레셔 안착' },
    { label: 'Utility 배관', displayText: 'Utility배관공사', desc: '공장 유틸리티 배관 라인' },
    { label: '공장증설', displayText: '공장증설 검토', desc: '생산라인 증설 및 분기 배관' },
    { label: '노후배관교체', desc: '노후 배관 철거 및 신설' },
    { label: '기계실개선', displayText: '기계실 개선공사', desc: '기계실 배관 효율 및 동선 개선' },
    { label: '생산설비 배관 연결', displayText: '공정 배관공사', desc: '제조 설비 훅업(Hook-up) 연결' },
    { label: 'CAPEX 개·증설 검토', displayText: 'CAPEX개선,증설 검토', desc: '사전 도면 및 견적 한도 검토' },
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
    { value: 'unknown', label: '금액 미정', range: '상담 후 판단' },
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
    <aside className="w-full xl:w-72 xl:h-full bg-bg-subtle p-5 flex flex-col gap-6 select-none shrink-0 overflow-y-auto no-scrollbar">
      {isUserMode ? (
        // ==================== 고객 모드 메뉴 ====================
        <>
          {/* 상단 청색 액센트 바 — 우측 실시간 검토 패널 상단과 동일한 시그니처로 양측 프레임을 잇는다 */}
          <div className="h-1 -mx-5 -mt-5 -mb-1 bg-steel shrink-0" />

          {/* 공사 영역 카테고리 */}
          <div>
            <div className="flex items-center gap-2 px-2 mb-2">
              <span className="w-1 h-4 bg-steel rounded-full shrink-0" />
              <h3 className="text-[12px] font-bold text-navy uppercase tracking-wider">견적공사 카테고리</h3>
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
                        ? 'bg-steel/8 border-steel text-steel'
                        : 'border-transparent hover:bg-bg/60 text-gray hover:text-navy'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[13.5px] font-bold">{cat.displayText || cat.label}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-steel" />}
                    </div>
                    <span className="text-[12px] text-gray-light font-medium mt-0.5">{cat.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 외주 제작 카테고리 */}
          <div className="border-t border-border/40 pt-5 mt-1">
            <div className="flex items-center gap-2 px-2 mb-2">
              <span className="w-1 h-4 bg-accent rounded-full shrink-0" />
              <h3 className="text-[12px] font-bold text-navy uppercase tracking-wider">외주제작 견적 컨설팅</h3>
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
                        ? 'bg-accent/8 border-accent text-accent'
                        : 'border-transparent hover:bg-bg/60 text-gray hover:text-navy'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[13.5px] font-bold">{cat.label}</span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-accent" />}
                    </div>
                    <span className="text-[12px] text-gray-light font-medium mt-0.5">{cat.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 견적 규모 카테고리 */}
          <div className="border-t border-border/40 pt-5 mt-1">
            <div className="flex items-center gap-2 px-2 mb-2">
              <span className="w-1 h-4 bg-steel rounded-full shrink-0" />
              <h3 className="text-[12px] font-bold text-navy uppercase tracking-wider">견적규모별 분류</h3>
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
                        ? 'bg-steel/8 border-steel text-steel'
                        : 'border-transparent hover:bg-bg/60 text-gray hover:text-navy'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-[13.5px] font-bold">{cat.label}</span>
                      <span className="text-[12px] text-gray-light font-semibold mt-0.5">{cat.range}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-steel" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 빠른 메뉴 */}
          <div className="border-t border-border/40 pt-5 mt-1">
            <div className="flex items-center gap-2 px-2 mb-2">
              <span className="w-1 h-4 bg-gray-light rounded-full shrink-0" />
              <h3 className="text-[12px] font-bold text-navy uppercase tracking-wider">빠른 메뉴</h3>
            </div>
            <div className="flex flex-col gap-1 px-2 text-[12px] text-gray-light font-semibold">
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
