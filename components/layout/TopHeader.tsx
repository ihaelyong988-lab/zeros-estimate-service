'use client';

import React from 'react';
import { useShell, ActiveTab } from '@/lib/context/ShellContext';
import { Building2, LogOut, LogIn, ClipboardList } from 'lucide-react';

export const TopHeader: React.FC = () => {
  const {
    isUserMode,
    setIsUserMode,
    logoutAdmin,
    activeTab,
    setActiveTab,
    setSelectedMenu,
    setSelectedBudget,
    customerAuth,
    logoutCustomer,
    setShowLogin,
    setShowMyRequests,
  } = useShell();

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

  const handleTabClick = (tab: ActiveTab) => {
    setIsUserMode(true);
    setActiveTab(tab);
    // 홈(랜딩)·견적 검토(작업공간) 진입 시에는 이전 공종/규모 필터를 초기화해
    // 항상 해당 화면의 첫 상태로 들어가게 한다.
    if (tab === 'home' || tab === 'review') {
      setSelectedMenu('');
      setSelectedBudget('');
    }
    scrollMainPanelToTop();
  };

  // 중앙 네비게이션 항목 — PPT 시안 정보구조(IA)와 정렬
  const navItems: { tab: ActiveTab; label: string }[] = [
    { tab: 'review', label: '견적 검토' },
    { tab: 'about', label: '진단 절차' },
    { tab: 'performance', label: '실적 레퍼런스' },
    { tab: 'request', label: '예상견적 의뢰하기' },
    { tab: 'sop', label: 'AI Native 검증' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b border-border bg-bg/95 backdrop-blur-md px-8 flex items-center justify-between select-none">
      
      {/* 1. 좌측 로고 영역 - 완벽한 기하학적 대칭 정렬 (클릭 시 메인홈 이동) */}
      <button 
        type="button"
        onClick={() => handleTabClick('home')}
        style={{ touchAction: 'manipulation' }}
        className="flex items-center gap-3 cursor-pointer select-none active:scale-98 transition-transform text-left bg-transparent border-none p-0 outline-none"
      >
        {/* 완벽한 36px 정사각 로고박스 */}
        <div className="w-9 h-9 bg-accent rounded-custom flex items-center justify-center shrink-0 shadow-sm shadow-accent/20">
          <Building2 className="w-4.5 h-4.5 text-bg" />
        </div>
        {/* 로고박스와 동일한 높이 컨테이너에서 워드마크를 수직 중앙 정렬 +
            대문자 메트릭상 위로 떠 보이는 광학 오차를 1px 보정해 글자 중심선을 박스 중심선과 일치 */}
        <div className="h-9 flex items-center">
          <span className="relative top-[1px] font-black text-[18px] tracking-wider text-navy leading-none uppercase font-sans">ZEROS</span>
        </div>
      </button>

      {/* 2. 중앙 탭 네비게이션 - 데스크탑 전용 (PPT 시안 IA) */}
      <nav className="hidden md:flex items-center gap-1">
        {navItems.map(({ tab, label }) => {
          const isActive = isUserMode && activeTab === tab;
          
          // 각 탭의 고유 성격을 반영한 테마 색상 설정
          const themeClasses = {
            review: {
              active: 'text-navy after:bg-navy',
              hover: 'hover:text-navy hover:after:bg-navy'
            },
            about: {
              active: 'text-steel after:bg-steel',
              hover: 'hover:text-steel hover:after:bg-steel'
            },
            performance: {
              active: 'text-indigo-600 after:bg-indigo-600',
              hover: 'hover:text-indigo-600 hover:after:bg-indigo-600'
            },
            request: {
              active: 'text-accent after:bg-accent',
              hover: 'hover:text-accent hover:after:bg-accent'
            },
            sop: {
              active: 'text-success after:bg-success',
              hover: 'hover:text-success hover:after:bg-success'
            },
            home: {
              active: 'text-navy after:bg-navy',
              hover: 'hover:text-navy hover:after:bg-navy'
            }
          }[tab] || {
            active: 'text-navy after:bg-navy',
            hover: 'hover:text-navy hover:after:bg-navy'
          };

          return (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              style={{ touchAction: 'manipulation' }}
              className={`relative px-3.5 py-2 text-[14.5px] font-bold uppercase tracking-wide transition-colors duration-200 cursor-pointer after:absolute after:left-3.5 after:right-3.5 after:-bottom-px after:h-[2px] after:transition-all after:duration-200 ${
                isActive
                  ? `${themeClasses.active} after:opacity-100`
                  : `text-gray ${themeClasses.hover} after:opacity-0 hover:after:opacity-50`
              }`}
            >
              {label}
            </button>
          );
        })}
      </nav>

      {/* 3. 우측 컨트롤 영역 - 높이 및 마진 100% 동기화 (h-9) */}
      <div className="flex items-center gap-2">
        {/* 고객 모드: 휴대폰 인증 로그인 / 본인 접수현황 */}
        {isUserMode && (
          customerAuth ? (
            <>
              <button
                onClick={() => setShowMyRequests(true)}
                style={{ touchAction: 'manipulation' }}
                className="h-9 flex items-center gap-1.5 rounded-custom bg-steel hover:bg-navy text-bg px-3.5 py-2 text-[13px] font-black transition-all duration-150 active:scale-95 cursor-pointer shadow-sm"
              >
                <ClipboardList className="w-4 h-4 shrink-0" />
                내 접수현황
              </button>
              <button
                onClick={() => logoutCustomer()}
                title={`${customerAuth.name || '고객'} · 로그아웃`}
                style={{ touchAction: 'manipulation' }}
                className="h-9 flex items-center gap-1.5 border border-border hover:border-navy/40 rounded-custom bg-bg text-gray hover:text-navy px-2.5 py-2 text-[12px] font-bold transition-all duration-150 active:scale-95 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              style={{ touchAction: 'manipulation' }}
              className="h-9 flex items-center gap-1.5 border border-steel/30 hover:border-steel rounded-custom bg-steel/5 text-steel hover:bg-steel hover:text-bg px-4 py-2 text-[13px] font-black transition-all duration-150 active:scale-95 cursor-pointer shadow-sm"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              로그인
            </button>
          )
        )}

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
