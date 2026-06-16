'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useShell, ActiveTab } from '@/lib/context/ShellContext';
import { TopHeader } from './TopHeader';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { MobileSimulator } from './MobileSimulator';
import { AdminLogin } from '../admin/AdminLogin';
import {
  BookOpen,
  Home,
  FileText,
  TrendingUp,
  User,
  Menu,
  X,
  Building2
} from 'lucide-react';
import { MyRequestsView } from '../MyRequestsView';

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

type MobileActiveTab = 'home' | 'service' | 'request' | 'history' | 'account' | 'decision' | 'admin';
type AdminView = MobileAdminMenuItem['value'];

const activeTabValues: ActiveTab[] = ['home', 'about', 'performance', 'request', 'sop', 'review'];
const adminViewValues: AdminView[] = ['dashboard', 'estimates', 'visits', 'customers', 'performance', 'notifications'];

const mobileMenuItems: MobileMenuItem[] = [
  { type: 'menu', label: '일반 배관공사', value: '배관공사' },
  { type: 'menu', label: '기계 장비설치', value: '장비설치' },
  { type: 'menu', label: 'Utility 배관', value: 'Utility 배관' },
  { type: 'menu', label: '공장증설', value: '공장증설' },
  { type: 'menu', label: '노후배관교체', value: '노후배관교체' },
  { type: 'menu', label: '기계실개선', value: '기계실개선' },
  { type: 'menu', label: '공정 배관공사', value: '생산설비 배관 연결' },
  { type: 'menu', label: 'CAPEX 개·증설 검토', value: 'CAPEX 개·증설 검토' },
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
    isAdminAuthed,
    logoutAdmin,
    activeTab,
    setActiveTab,
    selectedMenu,
    setSelectedMenu,
    selectedBudget,
    setSelectedBudget,
    landingTradeName,
    landingTradeChipClass,
    mobileMenuOpen,
    setMobileMenuOpen,
    adminView,
    setAdminView,
    customerAuth,
    logoutCustomer,
    setShowLogin,
    setShowMyRequests,
  } = useShell();

  // 모바일 레이아웃(PWA, Simulator, ScreenWidth) 감지 상태
  const [isMobileLayout, setIsMobileLayout] = useState(false);

  // 뷰포트 폭이 확정되기 전(SSR/첫 페인트)에는 레이아웃을 그리지 않는다.
  // 기본값(데스크톱)을 먼저 그렸다가 모바일로 다시 그리는 깜빡임(깨진 화면)을 차단.
  const [layoutReady, setLayoutReady] = useState(false);

  // 모바일 하단 전용 액티브 탭 상태 ('home' | 'request' | 'decision' | 'admin')
  const [mobileActiveTab, setMobileActiveTab] = useState<MobileActiveTab>('home');
  const isSyncingFromHistoryRef = useRef(false);
  const lastShellUrlRef = useRef('');
  // 최상단 공종 칩 가로 스크롤 컨테이너 — 랜딩 쇼케이스 순회에 맞춰 활성 칩으로 자동 이동
  const quickMenuScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileLayout(window.innerWidth < 1024 || window.location.search.includes('mobile=true'));
    };
    handleResize();
    const readyFrame = window.requestAnimationFrame(() => setLayoutReady(true));
    window.addEventListener('resize', handleResize);
    return () => {
      window.cancelAnimationFrame(readyFrame);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const applyUrlState = () => {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      const tab = params.get('tab');
      const menu = params.get('menu') || '';
      const budget = params.get('budget') || '';
      const adminViewParam = params.get('view') as AdminView | null;

      isSyncingFromHistoryRef.current = true;
      setSelectedMenu('');
      setSelectedBudget('');

      if (mode === 'admin') {
        setIsUserMode(false);
        setActiveTab('home');
        setMobileActiveTab('admin');
        setAdminView(adminViewParam && adminViewValues.includes(adminViewParam) ? adminViewParam : 'dashboard');
        return;
      }

      setIsUserMode(true);

      if (tab === 'decision') {
        setActiveTab('home');
        setMobileActiveTab('decision');
        return;
      }

      if (tab === 'account') {
        setActiveTab('home');
        setMobileActiveTab('account');
        return;
      }

      if (tab && activeTabValues.includes(tab as ActiveTab) && tab !== 'home') {
        setActiveTab(tab as ActiveTab);
        setMobileActiveTab(
          tab === 'request'
            ? 'request'
            : tab === 'about' || tab === 'sop'
              ? 'service'
              : tab === 'performance'
                ? 'history'
                : 'home'
        );
        return;
      }

      setActiveTab('home');
      setMobileActiveTab('home');
      setSelectedMenu(menu);
      setSelectedBudget(menu ? '' : budget);
    };

    applyUrlState();
    window.addEventListener('popstate', applyUrlState);
    return () => window.removeEventListener('popstate', applyUrlState);
  }, [setActiveTab, setAdminView, setIsUserMode, setSelectedBudget, setSelectedMenu]);

  useEffect(() => {
    if (!layoutReady) return;

    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (isSyncingFromHistoryRef.current) {
      isSyncingFromHistoryRef.current = false;
      lastShellUrlRef.current = currentUrl;
      return;
    }

    const params = new URLSearchParams();
    if (window.location.search.includes('mobile=true')) {
      params.set('mobile', 'true');
    }

    if (!isUserMode) {
      params.set('mode', 'admin');
      if (adminView !== 'dashboard') {
        params.set('view', adminView);
      }
    } else if (isMobileLayout && mobileActiveTab === 'decision') {
      params.set('tab', 'decision');
    } else if (isMobileLayout && mobileActiveTab === 'account') {
      params.set('tab', 'account');
    } else if (activeTab !== 'home') {
      params.set('tab', activeTab);
    } else if (selectedMenu) {
      params.set('menu', selectedMenu);
    } else if (selectedBudget) {
      params.set('budget', selectedBudget);
    }

    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;

    if (nextUrl !== currentUrl && nextUrl !== lastShellUrlRef.current) {
      window.history.pushState({ zerosShell: true }, '', nextUrl);
      lastShellUrlRef.current = nextUrl;
    } else {
      lastShellUrlRef.current = currentUrl;
    }
  }, [
    activeTab,
    adminView,
    isMobileLayout,
    isUserMode,
    layoutReady,
    mobileActiveTab,
    selectedBudget,
    selectedMenu,
  ]);

  // 랜딩(홈·미선택) 상태 여부 — 이때만 쇼케이스 순회와 칩 하이라이트를 연동
  const isLandingShowcase =
    isUserMode && mobileActiveTab === 'home' && activeTab === 'home' && !selectedMenu && !selectedBudget;

  // 쇼케이스가 순회하는 공종에 맞춰 최상단 칩바를 가로로 부드럽게 이동(활성 칩 중앙 정렬)
  useEffect(() => {
    if (!isLandingShowcase || !landingTradeName) return;
    const container = quickMenuScrollRef.current;
    if (!container) return;
    const activeEl = container.querySelector('[data-landing-active="true"]') as HTMLElement | null;
    if (!activeEl) return;
    const target = activeEl.offsetLeft - (container.clientWidth - activeEl.clientWidth) / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [landingTradeName, isLandingShowcase]);

  // 모바일 하단 탭과 activeTab 연동 동기화
  useEffect(() => {
    if (!layoutReady || !isMobileLayout) return;
    if (activeTab === 'request') {
      setMobileActiveTab('request');
    } else if (activeTab === 'about' || activeTab === 'sop') {
      setMobileActiveTab('service');
    } else if (activeTab === 'performance') {
      setMobileActiveTab('history');
    } else if (activeTab === 'home') {
      if (mobileActiveTab !== 'account' && mobileActiveTab !== 'decision') {
        setMobileActiveTab('home');
      }
    }
  }, [activeTab, layoutReady, isMobileLayout]);

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

  // 관리자 진입 시 비밀번호 인증이 안 되어 있으면 잠금 화면으로 가로챈다.
  // (고객 화면에는 관리자 흔적이 전혀 노출되지 않음)
  if (!isUserMode && !isAdminAuthed) {
    return <AdminLogin />;
  }

  // 모바일 하단 탭 변경 시, 상위 context 상태와 정교하게 매핑하여 화면 전환 동기화
  const handleMobileTabChange = (tab: MobileActiveTab) => {
    setMobileActiveTab(tab);
    if (tab === 'home') {
      setMobileMenuOpen(false);
      setIsUserMode(true);
      setActiveTab('home');
      setSelectedMenu('');
      setSelectedBudget('');
      scrollMainPanelToTop();
    } else if (tab === 'service') {
      setMobileMenuOpen(false);
      setIsUserMode(true);
      setActiveTab('about');
      setSelectedMenu('');
      setSelectedBudget('');
      scrollMainPanelToTop();
    } else if (tab === 'request') {
      setMobileMenuOpen(false);
      setIsUserMode(true);
      setActiveTab('request');
      setSelectedMenu('');
      setSelectedBudget('');
      scrollMainPanelToTop();
    } else if (tab === 'history') {
      setMobileMenuOpen(false);
      setIsUserMode(true);
      setActiveTab('performance');
      setSelectedMenu('');
      setSelectedBudget('');
      scrollMainPanelToTop();
    } else if (tab === 'account') {
      setMobileMenuOpen(false);
      setIsUserMode(true);
      setActiveTab('home');
      setSelectedMenu('');
      setSelectedBudget('');
      scrollMainPanelToTop();
    } else if (tab === 'decision') {
      setMobileMenuOpen(false);
      setIsUserMode(true);
      // 의사결정 시, 홈 상태로 두고 sidebar 내용 출력
      setActiveTab('home');
      scrollMainPanelToTop();
    } else if (tab === 'admin') {
      setMobileMenuOpen(false);
      setIsUserMode(false);
      setAdminView('dashboard');
      scrollMainPanelToTop();
    }
  };

  const scrollMainPanelToTop = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const mainScroll = document.querySelector('[data-main-scroll="true"]') as HTMLElement | null;
        if (mainScroll) {
          const originalSnap = mainScroll.style.scrollSnapType;
          mainScroll.style.scrollSnapType = 'none';
          mainScroll.scrollTo({ top: 0, behavior: 'auto' });
          window.requestAnimationFrame(() => {
            mainScroll.style.scrollSnapType = originalSnap;
          });
        }
        window.scrollTo({ top: 0, behavior: 'auto' });
      });
    });
  };

  // 모바일 퀵 탭 스크롤 처리
  const handleMobileQuickMenuClick = (item: MobileMenuItem) => {
    setMobileMenuOpen(false);
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
    scrollMainPanelToTop();
  };

  // 1. 모바일 전용 네이티브 앱 레이아웃 렌더링
  if (isMobileLayout) {
    const isMobileLanding =
      isUserMode && mobileActiveTab === 'home' && activeTab === 'home' && !selectedMenu && !selectedBudget;

    return (
      <div className={`overflow-hidden flex flex-col text-text font-sans pb-safe ${isMobileLanding ? 'h-[100svh] bg-[#041B33]' : 'h-[100dvh] bg-bg-subtle'}`}>
        
        {/* 모바일 상단 네이티브 로고 헤더 */}
        <div className={`${isMobileLanding ? 'bg-[#061F3C] border-white/10 px-5 py-4' : 'bg-navy border-white/5 px-5 py-4.5'} shrink-0 text-bg flex items-center justify-between select-none shadow-md border-b relative z-40`}>
          <button
            onClick={() => handleMobileTabChange('home')}
            style={{ touchAction: 'manipulation' }}
            className="flex items-center gap-2.5 active:scale-98 transition-transform cursor-pointer text-left"
          >
            <div className="w-8 h-8 bg-accent rounded-custom flex items-center justify-center shadow-md shadow-accent/20">
              <Building2 className="w-4 h-4 text-bg" />
            </div>
            {/* 로고박스 높이에 맞춰 워드마크 수직 중앙 정렬 + 대문자 광학오차 1px 보정 */}
            <div className="h-8 flex items-center">
              <span className="relative top-[1px] font-black text-[19px] text-bg leading-none uppercase">ZEROS</span>
            </div>
          </button>
          <div className="flex items-center gap-2.5">
            {customerAuth ? (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleMobileTabChange('account');
                }}
                className="bg-white/10 border border-white/20 hover:bg-white/15 px-3 py-1.5 rounded-custom text-[11.5px] font-bold text-white transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                마이페이지
              </button>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowLogin(true);
                }}
                className="bg-accent hover:bg-[#c95f12] text-white px-3 py-1.5 rounded-custom text-[11.5px] font-black tracking-tight transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                간편 로그인/등록
              </button>
            )}
            {isMobileLanding ? (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-9 h-9 inline-flex items-center justify-center text-white cursor-pointer"
                aria-label="메뉴 열기"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="bg-[#E0701A]/10 border border-[#E0701A]/30 text-accent text-[11.5px] px-2 py-0.5 rounded-full font-black">
                  AI NATIVE
                </span>
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" title="온라인 상태" />
              </div>
            )}
          </div>
        </div>

        {/* 모바일 퀵메뉴 칩 영역 (홈 화면일 때만 노출) */}
        {mobileActiveTab === 'home' && isUserMode && !isMobileLanding && (
          <div className="sticky top-0 z-30 bg-bg border-b border-border shadow-sm flex flex-col shrink-0">
            <div ref={quickMenuScrollRef} className="flex items-center gap-2 overflow-x-auto whitespace-nowrap px-4 py-2.5 scrollbar-none no-scrollbar">
              {mobileMenuItems.map((item) => {
                // 사용자가 직접 선택한 칩
                const isSelected =
                  item.type === 'menu'
                    ? selectedMenu === item.value && !selectedBudget && activeTab === 'home'
                    : selectedBudget === item.value && !selectedMenu && activeTab === 'home';
                // 랜딩 쇼케이스가 현재 순회 중인 공종(미선택 상태에서만 연동)
                const isLandingActive =
                  isLandingShowcase && item.type === 'menu' && item.value === landingTradeName;
                const isActive = isSelected || isLandingActive;
                // 활성 색: 쇼케이스 자동순회 칩은 공종 시그니처 색(쇼케이스 텍스트 색과 일치),
                // 사용자가 직접 선택한 칩은 기존 steel — "자동 쇼케이스 vs 내 선택" 의미 구분
                const activeColor = isLandingActive ? landingTradeChipClass : 'bg-steel border-steel text-bg';

                return (
                  <button
                    key={item.value}
                    data-landing-active={isLandingActive ? 'true' : undefined}
                    onClick={() => handleMobileQuickMenuClick(item)}
                    className={`px-3 py-1.5 rounded-custom text-[12px] font-bold border transition-all duration-150 shrink-0 select-none ${
                      isActive
                        ? `${activeColor} shadow-sm scale-102 font-extrabold`
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

        {mobileMenuOpen && isMobileLanding && (
          <div className="fixed inset-0 z-50 bg-[#031225]/70 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="ml-auto h-full w-[82%] max-w-[320px] bg-[#071F3C] border-l border-white/10 p-5 flex flex-col gap-5"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <span className="text-white text-[15px] font-black">ZEROS 메뉴</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-9 h-9 inline-flex items-center justify-center text-white/80"
                  aria-label="메뉴 닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 휴대폰 인증 로그인 / 본인 접수현황 */}
              {customerAuth ? (
                <div className="rounded-custom bg-white/[0.07] border border-white/10 p-3 flex flex-col gap-2.5">
                  <span className="text-[12px] font-bold text-white/80">{customerAuth.name || '고객'}님 · 인증 완료</span>
                  <button
                    onClick={() => { setMobileMenuOpen(false); setShowMyRequests(true); }}
                    className="w-full bg-accent text-white rounded-custom px-3 py-2.5 text-[13px] font-black text-left"
                  >
                    내 접수현황 보기
                  </button>
                  <button
                    onClick={() => { logoutCustomer(); }}
                    className="text-[12px] font-bold text-white/55 self-start"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setMobileMenuOpen(false); setShowLogin(true); }}
                  className="w-full rounded-custom bg-accent text-white px-4 py-3 text-[13px] font-black text-left"
                >
                  로그인 — 접수현황 확인하기
                </button>
              )}

              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: '홈', tab: 'home' as MobileActiveTab },
                  { label: '서비스 소개', tab: 'service' as MobileActiveTab },
                  { label: '견적 문의', tab: 'request' as MobileActiveTab },
                  { label: '실적 집계표', tab: 'history' as MobileActiveTab },
                  { label: '마이페이지', tab: 'account' as MobileActiveTab },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleMobileTabChange(item.tab)}
                    className="text-left rounded-custom bg-white/[0.07] border border-white/10 px-4 py-3 text-[13px] font-bold text-white"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="border-t border-white/10 pt-4 flex flex-col gap-2">
                <span className="text-[12px] font-bold text-white/60">공종 바로가기</span>
                <div className="grid grid-cols-2 gap-2">
                  {mobileMenuItems.slice(0, 8).map((item) => (
                    <button
                      key={item.value}
                      onClick={() => handleMobileQuickMenuClick(item)}
                      className="rounded-custom bg-white/[0.07] border border-white/10 px-3 py-2 text-[12px] font-bold text-white/90 text-left"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
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
              {/* 관리자 로그아웃 */}
              <button
                onClick={() => { logoutAdmin(); handleMobileTabChange('home'); }}
                className="px-3 py-1.5 rounded-custom text-[12px] font-bold border border-danger/30 bg-danger/5 text-danger hover:bg-danger/10 transition-all duration-150 shrink-0 select-none ml-auto"
              >
                로그아웃
              </button>
            </div>
          </div>
        )}

        {/* 모바일 전용 메인 스크롤 콘텐츠 뷰포트 */}
        <div
          data-main-scroll="true"
          className={`flex-1 overflow-y-auto min-w-0 relative ${isMobileLanding ? 'bg-[#041B33] p-0 snap-y snap-mandatory' : 'bg-bg p-4 pb-28'}`}
        >
          {mobileActiveTab === 'account' ? (
            <MyRequestsView />
          ) : mobileActiveTab === 'decision' ? (
            <div className="max-w-md mx-auto">
              <RightSidebar />
            </div>
          ) : (
            children
          )}
        </div>

        {/* 모바일 고유의 네이티브형 하단 네비게이션 바 (iOS/Android 스타일) */}
        <div className={`${isMobileLanding ? 'bg-[#061F3C]/96 border-white/10 text-white' : 'bg-bg/95 border-border'} shrink-0 backdrop-blur-md border-t shadow-custom-lg grid grid-cols-5 items-center justify-around py-2.5 pb-safe z-40 text-center select-none`}>
          <button
            onClick={() => handleMobileTabChange('home')}
            className={`flex flex-col items-center gap-1 transition-all ${
              mobileActiveTab === 'home' ? 'text-accent font-black scale-105' : isMobileLanding ? 'text-white/60' : 'text-gray hover:text-navy'
            }`}
          >
            <Home className="w-5.5 h-5.5" />
            <span className="text-[12px]">홈</span>
          </button>

          <button
            onClick={() => handleMobileTabChange('service')}
            className={`flex flex-col items-center gap-1 transition-all ${
              mobileActiveTab === 'service' ? 'text-accent font-black scale-105' : isMobileLanding ? 'text-white/60' : 'text-gray hover:text-navy'
            }`}
          >
            <BookOpen className="w-5.5 h-5.5" />
            <span className="text-[12px]">서비스 소개</span>
          </button>

          <button
            onClick={() => handleMobileTabChange('request')}
            className={`flex flex-col items-center gap-1 transition-all ${
              mobileActiveTab === 'request' ? 'text-accent font-black scale-105' : isMobileLanding ? 'text-white/60' : 'text-gray hover:text-navy'
            }`}
          >
            <FileText className="w-5.5 h-5.5" />
            <span className="text-[12px]">견적 문의</span>
          </button>

          <button
            onClick={() => handleMobileTabChange('history')}
            className={`flex flex-col items-center gap-1 transition-all ${
              mobileActiveTab === 'history' ? 'text-accent font-black scale-105' : isMobileLanding ? 'text-white/60' : 'text-gray hover:text-navy'
            }`}
          >
            <TrendingUp className="w-5.5 h-5.5" />
            <span className="text-[12px]">실적 집계표</span>
          </button>

          <button
            onClick={() => handleMobileTabChange('account')}
            className={`flex flex-col items-center gap-1 transition-all ${
              mobileActiveTab === 'account' ? 'text-accent font-black scale-105' : isMobileLanding ? 'text-white/60' : 'text-gray hover:text-navy'
            }`}
          >
            <User className="w-5.5 h-5.5" />
            <span className="text-[12px]">마이페이지</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. 데스크탑 레이아웃 렌더링
  // 홈(고객 모드)은 PPT 시안 기반의 풀-블리드 단독 랜딩으로 표시하고,
  // '견적 검토'(review)·진단·실적·의뢰 등 그 외 화면은 기존 3-Pane 작업공간을 유지한다.
  const isFullBleedHome = isUserMode && activeTab === 'home';

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-bg-subtle text-text font-sans">

      {/* 데스크탑 고정 헤더 */}
      <div className="shrink-0">
        <TopHeader />
      </div>

      {isFullBleedHome ? (
        /* 풀-블리드 홈 랜딩 — 좌/우 사이드바 없이 전체폭 단일 스크롤 (PPT 시안) */
        <div
          data-main-scroll="true"
          className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar min-w-0 h-[calc(100vh-64px)] bg-bg"
        >
          {children}
        </div>
      ) : (
        /* 중앙 3-Pane 본문 레이아웃 */
        <div className="flex-1 flex relative overflow-hidden h-[calc(100vh-70px)]">

          {/* Pane 1: 좌측 카테고리 메뉴 사이드바 */}
          <div className="hidden lg:flex shrink-0 h-full overflow-y-auto no-scrollbar border-r border-border bg-bg-subtle">
            <LeftSidebar />
          </div>

          {/* Pane 2 & Pane 3 결합 영역 */}
          <main className="flex-1 flex flex-col lg:flex-row overflow-hidden h-full">

            {/* Pane 2: 중앙 핵심 워크스페이스 패널 (독립 스크롤) */}
            <div className="flex-1 flex flex-col h-full bg-bg overflow-hidden">
              {/* 상단 청색 액센트 바 — 좌/우 사이드바의 상단 액센트 바와 시각적으로 연결 */}
              <div className="h-1 w-full bg-steel shrink-0" />
              <div data-main-scroll="true" className="flex-1 p-6 overflow-y-auto no-scrollbar min-w-0 pb-12">
                {children}
              </div>
            </div>

            {/* Pane 3: 우측 의사결정 보조 & 데이터 매핑 위젯 */}
            <div className="w-72 h-full shrink-0 border-l border-border overflow-y-auto no-scrollbar bg-bg-subtle print:hidden">
              <RightSidebar />
            </div>

          </main>
        </div>
      )}

      {/* 데스크탑 탑재 모바일 시뮬레이터 포탈 렌더링 */}
      <MobileSimulator />
    </div>
  );
};
