'use client';

import React, { useState, useEffect } from 'react';
import { useShell } from '@/lib/context/ShellContext';
import { TopHeader } from './TopHeader';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { MobileSimulator } from './MobileSimulator';
import { 
  Home, 
  FileText, 
  TrendingUp, 
  ShieldCheck, 
  Building2
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

interface MobileMenuItem {
  type: 'menu' | 'budget' | 'tab';
  label: string;
  value: string;
}

interface MobileAdminMenuItem {
  label: string;
  value: 'dashboard' | 'estimates' | 'visits' | 'customers' | 'performance' | 'notifications';
}

const mobileMenuItems: MobileMenuItem[] = [
  { type: 'menu', label: '배관공사', value: '배관공사' },
  { type: 'menu', label: '장비설치', value: '장비설치' },
  { type: 'menu', label: 'Utility 배관', value: 'Utility 배관' },
  { type: 'menu', label: '공장증설', value: '공장증설' },
  { type: 'menu', label: '노후배관교체', value: '노후배관교체' },
  { type: 'menu', label: '기계실개선', value: '기계실개선' },
  { type: 'menu', label: '생산설비 연결', value: '생산설비 배관 연결' },
  { type: 'menu', label: 'CAPEX 검토', value: 'CAPEX 개·증설 검토' },
  { type: 'budget', label: '간편검토(≤1천)', value: 'small' },
  { type: 'budget', label: '출장견적(~1억)', value: 'medium' },
  { type: 'budget', label: '사전진단(>1억)', value: 'large' },
  { type: 'budget', label: '금액 미정', value: 'unknown' }
];

const mobileAdminMenuItems: MobileAdminMenuItem[] = [
  { label: '종합 대시보드', value: 'dashboard' },
  { label: '견적 접수관리', value: 'estimates' },
  { label: '현장방문 관리', value: 'visits' },
  { label: '고객 정보 관리', value: 'customers' },
  { label: '실적/통계', value: 'performance' },
  { label: '알림 발송 로그', value: 'notifications' }
];

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const {
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
  } = useShell();

  // 모바일 레이아웃(PWA, Simulator, ScreenWidth) 감지 상태
  const [isMobileLayout, setIsMobileLayout] = useState(false);

  // 뷰포트 폭이 확정되기 전(SSR/첫 페인트)에는 레이아웃을 그리지 않는다.
  // 기본값(데스크톱)을 먼저 그렸다가 모바일로 다시 그리는 깜빡임(깨진 화면)을 차단.
  const [layoutReady, setLayoutReady] = useState(false);

  // 모바일 하단 전용 액티브 탭 상태 ('home' | 'request' | 'decision' | 'admin')
  const [mobileActiveTab, setMobileActiveTab] = useState<'home' | 'request' | 'decision' | 'admin'>('home');

  useEffect(() => {
    const handleResize = () => {
      setIsMobileLayout(window.innerWidth < 1024 || window.location.search.includes('mobile=true'));
    };
    handleResize();
    setLayoutReady(true);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 레이아웃 확정 전: 브랜드 스플래시 (깨진 헤더 대신 깔끔한 첫 화면)
  if (!layoutReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-navy text-bg select-none">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 bg-accent rounded-custom flex items-center justify-center shadow-md shadow-accent/20">
            <Building2 className="w-5 h-5 text-bg" />
          </div>
          <span className="font-black text-[18px] tracking-widest uppercase">ZEROS</span>
        </div>
      </div>
    );
  }

  // 모바일 하단 탭 변경 시, 상위 context 상태와 정교하게 매핑하여 화면 전환 동기화
  const handleMobileTabChange = (tab: 'home' | 'request' | 'decision' | 'admin') => {
    setMobileActiveTab(tab);
    if (tab === 'home') {
      setIsUserMode(true);
      setActiveTab('home');
      setSelectedMenu('');
      setSelectedBudget('');
    } else if (tab === 'request') {
      setIsUserMode(true);
      setActiveTab('request');
    } else if (tab === 'decision') {
      setIsUserMode(true);
      // 의사결정 시, 홈 상태로 두고 sidebar 내용 출력
      setActiveTab('home');
    } else if (tab === 'admin') {
      setIsUserMode(false);
      setAdminView('dashboard');
    }
  };
  // 모바일 퀵 탭 스크롤 처리
  const handleMobileQuickMenuClick = (item: MobileMenuItem) => {
    setMobileActiveTab('home');
    setIsUserMode(true);
    if (item.type === 'menu') {
      setSelectedMenu(item.value);
      setSelectedBudget('');
      setActiveTab('home');
    } else if (item.type === 'budget') {
      setSelectedBudget(item.value);
      setSelectedMenu('');
      setActiveTab('home');
    }
  };

  // 1. 모바일 전용 네이티브 앱 레이아웃 렌더링
  if (isMobileLayout) {
    return (
      <div className="h-screen overflow-hidden flex flex-col bg-bg-subtle text-text font-sans pb-safe">
        
        {/* 모바일 상단 네이티브 로고 헤더 */}
        <div className="shrink-0 bg-navy text-bg px-5 py-4.5 flex items-center justify-between select-none shadow-md border-b border-white/5 relative z-40">
          <div className="flex items-center gap-2">
            <div className="bg-accent p-1 rounded-custom flex items-center justify-center shadow-md shadow-accent/20">
              <Building2 className="w-4 h-4 text-bg" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-[15px] tracking-wider text-bg leading-none uppercase">ZEROS</span>
              <span className="text-[12px] text-bg/70 font-semibold tracking-tight mt-0.5">예상견적 스마트 앱</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-[#E0701A]/10 border border-[#E0701A]/30 text-accent text-[12px] px-2 py-0.5 rounded-full font-black tracking-wide">
              PROTOTYPE
            </span>
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" title="온라인 상태" />
          </div>
        </div>

        {/* 모바일 퀵메뉴 칩 영역 (홈 화면일 때만 노출) */}
        {mobileActiveTab === 'home' && isUserMode && (
          <div className="sticky top-0 z-30 bg-bg border-b border-border shadow-sm flex flex-col shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap px-4 py-2.5 scrollbar-none no-scrollbar">
              {mobileMenuItems.map((item) => {
                const isActive =
                  item.type === 'menu'
                    ? selectedMenu === item.value && !selectedBudget && activeTab === 'home'
                    : selectedBudget === item.value && !selectedMenu && activeTab === 'home';

                return (
                  <button
                    key={item.value}
                    onClick={() => handleMobileQuickMenuClick(item)}
                    className={`px-3 py-1.5 rounded-custom text-[12px] font-bold border transition-all duration-150 shrink-0 select-none ${
                      isActive
                        ? 'bg-steel border-steel text-bg shadow-sm scale-102 font-extrabold'
                        : 'bg-bg-subtle border-border/80 text-gray hover:text-navy'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 모바일 관리자 퀵메뉴 칩 영역 (관리자 탭이고 관리자 모드일 때 노출) */}
        {mobileActiveTab === 'admin' && !isUserMode && (
          <div className="sticky top-0 z-30 bg-bg border-b border-border shadow-sm flex flex-col shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap px-4 py-2.5 scrollbar-none no-scrollbar">
              {mobileAdminMenuItems.map((item) => {
                const isActive = adminView === item.value;

                return (
                  <button
                    key={item.value}
                    onClick={() => setAdminView(item.value)}
                    className={`px-3 py-1.5 rounded-custom text-[12px] font-bold border transition-all duration-150 shrink-0 select-none ${
                      isActive
                        ? 'bg-navy border-navy text-bg shadow-sm scale-102 font-extrabold'
                        : 'bg-bg-subtle border-border/80 text-gray hover:text-navy'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 모바일 전용 메인 스크롤 콘텐츠 뷰포트 */}
        <div className="flex-1 overflow-y-auto bg-bg p-4 pb-28 min-w-0 relative">
          {mobileActiveTab === 'decision' ? (
            <div className="max-w-md mx-auto">
              <RightSidebar />
            </div>
          ) : (
            children
          )}
        </div>

        {/* 모바일 고유의 네이티브형 하단 네비게이션 바 (iOS/Android 스타일) */}
        <div className="shrink-0 bg-bg/95 backdrop-blur-md border-t border-border shadow-custom-lg grid grid-cols-4 items-center justify-around py-2.5 pb-safe z-40 text-center select-none">
          <button
            onClick={() => handleMobileTabChange('home')}
            className={`flex flex-col items-center gap-1 transition-all ${
              mobileActiveTab === 'home' ? 'text-steel font-black scale-105' : 'text-gray hover:text-navy'
            }`}
          >
            <Home className="w-5.5 h-5.5" />
            <span className="text-[12px]">홈</span>
          </button>

          <button
            onClick={() => handleMobileTabChange('request')}
            className={`flex flex-col items-center gap-1 transition-all ${
              mobileActiveTab === 'request' ? 'text-accent font-black scale-105' : 'text-gray hover:text-navy'
            }`}
          >
            <FileText className="w-5.5 h-5.5" />
            <span className="text-[12px]">의뢰하기</span>
          </button>

          <button
            onClick={() => handleMobileTabChange('decision')}
            className={`flex flex-col items-center gap-1 transition-all ${
              mobileActiveTab === 'decision' ? 'text-steel font-black scale-105' : 'text-gray hover:text-navy'
            }`}
          >
            <TrendingUp className="w-5.5 h-5.5" />
            <span className="text-[12px]">예산조율</span>
          </button>

          <button
            onClick={() => handleMobileTabChange('admin')}
            className={`flex flex-col items-center gap-1 transition-all ${
              mobileActiveTab === 'admin' ? 'text-navy font-black scale-105' : 'text-gray hover:text-navy'
            }`}
          >
            <ShieldCheck className="w-5.5 h-5.5" />
            <span className="text-[12px]">관리자관제</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. 데스크탑용 프리미엄 3-Pane AppShell 레이아웃 렌더링
  return (
    <div className="h-screen overflow-hidden flex flex-col bg-bg-subtle text-text font-sans">
      
      {/* 데스크탑 고정 헤더 */}
      <div className="shrink-0">
        <TopHeader />
      </div>

      {/* 중앙 3-Pane 본문 레이아웃 */}
      <div className="flex-1 flex relative overflow-hidden h-[calc(100vh-70px)]">
        
        {/* Pane 1: 좌측 카테고리 메뉴 사이드바 */}
        <div className="hidden lg:flex shrink-0 h-full overflow-y-auto border-r border-border bg-bg-subtle">
          <LeftSidebar />
        </div>

        {/* Pane 2 & Pane 3 결합 영역 */}
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden h-full">
          
          {/* Pane 2: 중앙 핵심 워크스페이스 패널 (독립 스크롤) */}
          <div className="flex-1 p-6 overflow-y-auto min-w-0 h-full bg-bg pb-12">
            {children}
          </div>

          {/* Pane 3: 우측 의사결정 보조 & 데이터 매핑 위젯 */}
          <div className="w-72 h-full shrink-0 border-l border-border overflow-y-auto bg-bg-subtle print:hidden">
            <RightSidebar />
          </div>

        </main>
      </div>

      {/* 데스크탑 탑재 모바일 시뮬레이터 포탈 렌더링 */}
      <MobileSimulator />
    </div>
  );
};
