'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from "@/components/layout/AppShell";
import { useShell } from "@/lib/context/ShellContext";
import { RequestWizard } from "@/components/forms/RequestWizard";
import { manualData } from "@/lib/constants/manuals";
import { ZerosService } from "@/lib/supabase/client";
import { Estimate, EstimateStatus } from "@/types/estimate";

// 관리자 컴포넌트 임포트
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { EstimateList } from "@/components/admin/EstimateList";
import { KanbanBoard } from "@/components/admin/KanbanBoard";
import { EstimateDetailModal } from "@/components/admin/EstimateDetailModal";
import { VisitList } from "@/components/admin/VisitList";
import { PerformanceDashboard } from "@/components/admin/PerformanceDashboard";
import { PerformanceInsights } from "@/components/PerformanceInsights";
import { EstimateFlow } from "@/components/EstimateFlow";
import { CustomerList } from "@/components/admin/CustomerList";
import { NotificationLog } from "@/components/admin/NotificationLog";

import {
  BookOpen,
  FileCheck,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  MapPin
} from 'lucide-react';

// 랜딩 쇼케이스 자동 순회 공종 순서 — 최상단 칩바와 값으로 매칭(연동)되므로 모듈 스코프로 고정
const LANDING_TRADES = [
  '배관공사',
  '장비설치',
  'Utility 배관',
  '공장증설',
  '노후배관교체',
  '기계실개선',
  '생산설비 배관 연결',
  'CAPEX 개·증설 검토',
];

// 공종별 활성 칩 시그니처 색 — 쇼케이스 eyebrow 텍스트 색(-600 계열)과 동일 색상으로 묶어 시선 연결
// (Tailwind JIT가 스캔하도록 완전한 클래스 문자열을 직접 명시)
const LANDING_CHIP_CLASS: Record<string, string> = {
  '배관공사': 'bg-cyan-600 border-cyan-600 text-white',
  '장비설치': 'bg-amber-600 border-amber-600 text-white',
  'Utility 배관': 'bg-sky-600 border-sky-600 text-white',
  '공장증설': 'bg-accent border-accent text-white',
  '노후배관교체': 'bg-emerald-600 border-emerald-600 text-white',
  '기계실개선': 'bg-teal-600 border-teal-600 text-white',
  '생산설비 배관 연결': 'bg-indigo-600 border-indigo-600 text-white',
  'CAPEX 개·증설 검토': 'bg-navy border-navy text-white',
};

// 섹션 머리표 — 박스 래퍼 없이 accent bar + eyebrow + heading 으로 섹션 경계를 표시(L1)
function SectionHeading({
  eyebrow,
  title,
  accent = 'accent',
}: {
  eyebrow?: string;
  title: string;
  accent?: 'accent' | 'steel' | 'success';
}) {
  const barColor = accent === 'steel' ? 'bg-steel' : accent === 'success' ? 'bg-success' : 'bg-accent';
  const eyebrowColor = accent === 'steel' ? 'text-steel' : accent === 'success' ? 'text-success' : 'text-accent';
  return (
    <div className="flex flex-col gap-1.5 select-none">
      {eyebrow && (
        <div className="flex items-center gap-2">
          <span className={`w-1 h-4 ${barColor} rounded-full`} />
          <span className={`text-[12px] font-black uppercase tracking-wider ${eyebrowColor}`}>{eyebrow}</span>
        </div>
      )}
      <h2 className="text-[18px] font-black text-navy tracking-tight leading-snug">{title}</h2>
    </div>
  );
}

export default function Home() {
  const {
    isUserMode,
    activeTab,
    setActiveTab,
    selectedMenu,
    selectedBudget,
    setLandingTradeName,
    setLandingTradeChipClass,
    adminView,
    setAdminView,
    adminSubView,
    setAdminSubView,
    selectedEstimateId,
    setSelectedEstimateId
  } = useShell();

  const router = useRouter();

  // 견적 목록 상태 관리 (실시간 동기화용)
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTradeIdx, setActiveTradeIdx] = useState(0);

  // 실시간 공종 쇼케이스 애니메이션 로테이션 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTradeIdx(prev => (prev + 1) % LANDING_TRADES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // 현재 순회 중인 공종명·시그니처 색을 셸 컨텍스트로 끌어올려 최상단 칩바와 연동(하이라이트·색·자동스크롤)
  useEffect(() => {
    const name = LANDING_TRADES[activeTradeIdx];
    setLandingTradeName(name);
    setLandingTradeChipClass(LANDING_CHIP_CLASS[name] || 'bg-steel border-steel text-bg');
  }, [activeTradeIdx, setLandingTradeName, setLandingTradeChipClass]);

  // 실시간 데이터 로딩
  useEffect(() => {
    const load = async () => {
      try {
        const list = await ZerosService.getEstimates();
        setEstimates(list);
      } catch (e) {
        console.error('Failed to load estimates in page root', e);
      }
    };
    load();
  }, [refreshTrigger, isUserMode, adminView]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 칸반 보드 혹은 모달에서의 실시간 상태 변경 리액티브 액션 - §6.11
  const handleStatusChange = async (id: string, newStatus: EstimateStatus) => {
    try {
      await ZerosService.updateEstimate(id, { status: newStatus });
      handleRefresh(); // 실시간 리액티브 갱신
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const scrollMainPanelToTop = () => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const mainScroll = document.querySelector('[data-main-scroll="true"]') as HTMLElement | null;
        mainScroll?.scrollTo({ top: 0, behavior: 'smooth' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  };

  const setActiveTabAtTop = (tab: Parameters<typeof setActiveTab>[0]) => {
    setActiveTab(tab);
    scrollMainPanelToTop();
  };

  // ==========================================
  // 1. 고객 모드 탭 렌더러
  // ==========================================
  const renderAboutTab = () => {
    const workflow = [
      { step: '01', title: '자료 접수', desc: '도면·사진·제원서 누락 여부를 확인하고 검토 가능/보완 필요를 분류합니다.' },
      { step: '02', title: 'AI 1차 검증', desc: '사진·도면에서 관경·연결부·접근성·위험 요소 후보를 추출합니다.' },
      { step: '03', title: 'PM 판정', desc: '현장 실무30년 기준으로 공사 범위·예산 밴드·출장 필요성을 판단합니다.' },
      { step: '04', title: '액션 확정', desc: '온라인 검토·추가자료 요청·출장 실측·프로젝트 진단 중 다음 단계를 지정합니다.' },
    ];

    const decisionOutputs = [
      { title: '온라인 검토 가능', desc: '사진과 치수만으로 1차 범위·예산 밴드 제시가 가능한 건' },
      { title: '추가자료 요청', desc: '도면·치수·운전 조건이 부족해 오판 가능성이 높은 건' },
      { title: '출장 실측 권장', desc: '고소 작업·협소 반입·가동 중 연결 등 리스크가 있는 건' },
      { title: '프로젝트 진단 전환', desc: '1억 초과 CAPEX·복수 공종·입찰 비교가 필요한 건' },
    ];

    return (
      <div className="flex flex-col gap-5 max-w-4xl mx-auto py-4">
        {/* 하나의 정돈된 진단 절차 카드 */}
        <section className="bg-bg border border-border rounded-custom p-5 md:p-6 shadow-custom-sm flex flex-col gap-6">
          {/* 헤더 */}
          <div className="flex flex-col gap-2 border-b border-border pb-4">
            <span className="text-[12px] text-steel font-black uppercase tracking-wider">ZEROS Diagnosis Protocol</span>
            <h2 className="text-2xl font-black text-navy tracking-tight">ZEROS 진단 절차</h2>
            <p className="text-[13.5px] text-gray leading-relaxed font-semibold max-w-3xl">
              자료 접수부터 액션 확정까지 4단계로, 공사 범위·예산·리스크와 다음 행동을 한 장의 검토 시트로 정직하게 확정합니다.
            </p>
          </div>

          {/* 핵심 지표 4종 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 select-none">
            {[
              { label: '1차 검토 목표', value: '24h 이내' },
              { label: '진행 단계', value: '4-Step' },
              { label: '판정 결과', value: '4가지' },
              { label: '최종 산출물', value: 'Scope Sheet' },
            ].map((metric) => (
              <div key={metric.label} className="bg-bg-subtle border border-border rounded-custom p-3.5">
                <span className="text-[12px] text-gray-light font-bold block">{metric.label}</span>
                <span className="text-[18px] text-navy font-black tracking-tight mt-1 block">{metric.value}</span>
              </div>
            ))}
          </div>

          {/* 4단계 프로세스 — 가로 흐름 */}
          <div className="flex flex-col gap-3">
            <span className="text-[12px] font-black text-navy uppercase tracking-wide">진단 워크플로우</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {workflow.map((item, idx) => (
                <div key={item.step} className="relative bg-bg-subtle border border-border rounded-custom p-3.5 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-custom bg-steel text-bg flex items-center justify-center text-[12px] font-black shrink-0">
                      {item.step}
                    </span>
                    <span className="text-[13.5px] font-black text-navy leading-tight">{item.title}</span>
                  </div>
                  <p className="text-[12px] text-gray leading-normal font-semibold">{item.desc}</p>
                  {idx < workflow.length - 1 && (
                    <ArrowRight className="hidden lg:block absolute -right-[11px] top-1/2 -translate-y-1/2 w-4 h-4 text-border z-10" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 4가지 판정 */}
          <div className="flex flex-col gap-3">
            <span className="text-[12px] font-black text-navy uppercase tracking-wide">검증 후 4가지 판정</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {decisionOutputs.map((item, index) => (
                <div key={item.title} className="border border-border rounded-custom p-3.5 bg-bg flex flex-col gap-1.5">
                  <span className="text-[12px] font-black text-steel">판정 {index + 1}</span>
                  <span className="text-[13px] font-black text-navy leading-tight">{item.title}</span>
                  <p className="text-[12px] text-gray leading-normal">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 최종 산출물 + CTA */}
          <div className="bg-navy text-bg rounded-custom p-4.5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[12px] text-bg/70 font-black uppercase tracking-wider">Final Scope Sheet</span>
                <span className="text-[15px] font-black tracking-tight">한 장의 검토 시트로 정리됩니다</span>
              </div>
              <div className="flex flex-wrap gap-2 text-[12px]">
                {['공사 범위', '예산 밴드', '리스크 등급', '다음 조치'].map((item) => (
                  <span key={item} className="bg-bg/10 border border-bg/15 rounded-custom px-3 py-1.5 font-black">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setActiveTab('request')}
                className="flex-1 bg-steel hover:bg-bg hover:text-navy text-bg px-5 py-3 rounded-custom text-[12px] font-black transition-all active:scale-95"
              >
                무료 출장 견적 컨설팅 요청
              </button>
              <button
                onClick={() => setActiveTab('sop')}
                className="flex-1 bg-bg/10 hover:bg-bg/15 border border-bg/20 text-bg px-5 py-3 rounded-custom text-[12px] font-black transition-all active:scale-95"
              >
                AI 활용 SOP 보기
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  };

  // AI Native 검증 — 데이터 사이언스 표준 작업 절차(SOP)
  const renderSopTab = () => {
    const pipeline = [
      {
        no: '01',
        phase: 'Data Ingestion',
        title: '데이터 수집 · 정합',
        desc: '도면·현장 사진·제원서를 파싱해 관경, 길이, 유체, 압력, 층고 등 원천 변수를 단일 스키마로 정규화합니다.',
        output: '정규화된 입력 데이터셋',
      },
      {
        no: '02',
        phase: 'Exploratory Analysis',
        title: '탐색적 데이터 분석(EDA)',
        desc: '결측·이상치를 탐지하고 분포를 점검합니다. 누락 자료는 보완 요청으로 분기해 오판 리스크를 사전에 차단합니다.',
        output: '데이터 품질 리포트',
      },
      {
        no: '03',
        phase: 'Feature Engineering',
        title: '피처 엔지니어링',
        desc: '공종별 스펙을 벡터화하고 ASME/KS 자재·표준 품셈 기준에 매핑하여 비교 가능한 정량 피처로 변환합니다.',
        output: '표준 매핑 피처셋',
      },
      {
        no: '04',
        phase: 'Modeling & Inference',
        title: '모델 추론 · 정량 검증',
        desc: '유사 1군 실거래 n건과 대조하고 Darcy-Weisbach 손실·하중·리스크를 계산해 적정 범위와 예산 밴드를 추정합니다.',
        output: 'Scope·Budget 추정치',
      },
      {
        no: '05',
        phase: 'Validation',
        title: '교차검증 · 신뢰도 산출',
        desc: '현장 실무30년 도메인 룰로 모델 결과를 교차검증하고 보수적 신뢰구간을 적용해 과대·과소 추정을 보정합니다.',
        output: '신뢰도·리스크 등급',
      },
      {
        no: '06',
        phase: 'Result & Decision',
        title: '결과 도출 · 의사결정',
        desc: '근거가 추적 가능한 단일 검토 시트로 정리하고, 온라인 검토·추가자료·출장 실측 중 다음 액션을 확정합니다.',
        output: 'Scope Sheet + 다음 액션',
      },
    ];

    const principles = [
      { title: '같은 자료, 같은 결론', desc: '검토자가 누구든 동일한 기준으로 판단합니다.' },
      { title: '근거를 남깁니다', desc: '모든 금액은 실거래 자료와 계산 근거로 설명합니다.' },
      { title: '보수적으로 봅니다', desc: '불확실한 부분은 넉넉히 잡아 현장에서 흔들리지 않습니다.' },
    ];

    return (
      <div className="flex flex-col gap-5 max-w-4xl mx-auto py-4">
        <section className="bg-bg border border-border rounded-custom p-5 md:p-6 shadow-custom-sm flex flex-col gap-6">
          {/* 헤더 */}
          <div className="flex flex-col gap-2 border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-[12px] text-accent font-black uppercase tracking-wider">Data Science Pipeline · SOP</span>
            </div>
            <h2 className="text-2xl font-black text-navy tracking-tight">AI Native 검증 표준 작업 절차</h2>
            <p className="text-[13.5px] text-gray leading-relaxed font-semibold max-w-3xl">
              최고의 데이터 사이언티스트가 일하는 방식 그대로 — <strong className="text-navy font-extrabold">데이터 탐색부터 결과 도출까지</strong> 6단계
              재현 가능한 파이프라인으로 공사 범위·비용·리스크를 정량 검증합니다.
            </p>
          </div>

          {/* 신뢰 지표 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 select-none">
            {[
              { label: '파이프라인 단계', value: '6-Stage' },
              { label: '실거래 대조 표본', value: 'n건 DB' },
              { label: '근거 추적', value: '100%' },
              { label: '결과물', value: 'Scope Sheet' },
            ].map((metric) => (
              <div key={metric.label} className="bg-bg-subtle border border-border rounded-custom p-3.5">
                <span className="text-[12px] text-gray-light font-bold block">{metric.label}</span>
                <span className="text-[18px] text-navy font-black tracking-tight mt-1 block tabular-nums">{metric.value}</span>
              </div>
            ))}
          </div>

          {/* 6단계 파이프라인 */}
          <div className="flex flex-col gap-3">
            <span className="text-[12px] font-black text-navy uppercase tracking-wide">분석 파이프라인 (탐색 → 결과 도출)</span>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pipeline.map((stage) => (
                <div key={stage.no} className="bg-bg-subtle border border-border rounded-custom p-4 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-custom bg-navy text-bg flex items-center justify-center text-[13px] font-black shrink-0">
                      {stage.no}
                    </span>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[12px] text-steel font-black uppercase tracking-wide">{stage.phase}</span>
                      <span className="text-[13.5px] font-black text-navy">{stage.title}</span>
                    </div>
                  </div>
                  <p className="text-[12px] text-gray leading-relaxed font-medium">{stage.desc}</p>
                  <div className="flex items-center gap-1.5 mt-auto pt-1 border-t border-border/70">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                    <span className="text-[12px] font-black text-navy">{stage.output}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 검토 원칙 */}
          <div className="flex flex-col gap-3">
            <span className="text-[12px] font-black text-navy uppercase tracking-wide">검토 원칙</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {principles.map((p) => (
                <div key={p.title} className="border border-border rounded-custom p-3.5 bg-bg flex flex-col gap-1.5">
                  <span className="text-[13.5px] font-black text-navy">{p.title}</span>
                  <p className="text-[12px] text-gray leading-normal">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-navy text-bg rounded-custom p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[12px] text-bg/70 font-black uppercase tracking-wider">Ready to verify</span>
              <span className="text-[15px] font-black tracking-tight">자료를 제출하면 이 절차가 즉시 가동됩니다.</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <button
                onClick={() => setActiveTab('request')}
                className="bg-steel hover:bg-bg hover:text-navy text-bg px-5 py-3 rounded-custom text-[12px] font-black transition-all active:scale-95 whitespace-nowrap"
              >
                무료 출장 견적 컨설팅 요청
              </button>
              <button
                onClick={() => setActiveTabAtTop('about')}
                className="bg-bg/10 hover:bg-bg/15 border border-bg/20 text-bg px-5 py-3 rounded-custom text-[12px] font-black transition-all active:scale-95 whitespace-nowrap"
              >
                ZEROS 진단 절차 보기
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderPerformanceTab = () => <PerformanceInsights />;

  const renderRequestTab = () => (
    <div className="py-4">
      <RequestWizard
        onComplete={(newEst) => {
          router.push(`/request/complete?no=${newEst.estimate_no}&cat=${newEst.estimate_category}&name=${encodeURIComponent(newEst.customer_name)}&email=${encodeURIComponent(newEst.email)}`);
        }}
      />
    </div>
  );

  // 카테고리별 초정밀 엔지니어링 3D/2D 벡터 그래픽 시뮬레이터 구성 - §3.2
  const getCategoryVisuals = (menuKey: string) => {
      const matchKey = menuKey || '배관공사';
      
      if (matchKey === '배관공사') {
        return {
          bgGradient: 'from-[#0A162B] via-[#0E2343] to-[#173B6C]',
          badgeText: 'Industrial Piping & Fluidic Dynamics',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-cyan-400/70 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes pipeFlow {
                  0% { stroke-dashoffset: 20; }
                  100% { stroke-dashoffset: 0; }
                }
                .flow-line { stroke-dasharray: 4 6; animation: pipeFlow 1s linear infinite; }
              ` }} />
              <defs>
                <pattern id="grid-piping" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.1"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid-piping)" className="opacity-10" />
              <path d="M10,30 L60,30 Q70,30 70,40 L70,80" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10,30 L60,30 Q70,30 70,40 L70,80" stroke="#06b6d4" strokeWidth="1" className="flow-line" />
              <path d="M30,50 L80,50 Q90,50 90,60 L90,90" stroke="currentColor" strokeWidth="1.5" />
              <path d="M30,50 L80,50 Q90,50 90,60 L90,90" stroke="#f97316" strokeWidth="1" className="flow-line" />
              <circle cx="70" cy="30" r="3" fill="#06b6d4" className="animate-ping" />
              <circle cx="70" cy="30" r="2" fill="#06b6d4" />
              <circle cx="90" cy="50" r="2" fill="#f97316" />
              {/* 압력계 계기판 */}
              <circle cx="45" cy="30" r="6" fill="#0c162b" stroke="currentColor" strokeWidth="0.75" />
              <line x1="45" y1="30" x2="48" y2="26" stroke="#06b6d4" strokeWidth="1" />
              <text x="43" y="38" fill="currentColor" fontSize="2.5" className="font-mono">P</text>
            </svg>
          ),
          specText: 'Darcy-Weisbach 관마찰·Reynolds 유동 검증으로 관경 적정성 자동 진단'
        };
      } else if (matchKey === '장비설치') {
        return {
          bgGradient: 'from-[#081222] via-[#0E213D] to-[#1B3A64]',
          badgeText: 'Heavy Equipment Structural Load Dynamics',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-amber-500/70 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes pulseGrid {
                  0%, 100% { opacity: 0.2; }
                  50% { opacity: 0.6; }
                }
                .stress-node { animation: pulseGrid 2s infinite ease-in-out; }
              ` }} />
              {/* 3D 아이소메트릭 장비 프레임 */}
              <rect x="25" y="35" width="40" height="25" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <line x1="25" y1="35" x2="10" y2="20" stroke="currentColor" strokeDasharray="2 2" />
              <line x1="65" y1="35" x2="50" y2="20" stroke="currentColor" strokeDasharray="2 2" />
              {/* 응력 및 진동 분포선 */}
              <circle cx="45" cy="47" r="8" stroke="#f59e0b" strokeWidth="0.75" strokeDasharray="2 1" className="stress-node" />
              <circle cx="45" cy="47" r="14" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="3 2" className="stress-node" />
              {/* 하중 분산 표시 벡터 화살표 */}
              <path d="M45,25 L45,34 M45,34 L42,31 M45,34 L48,31" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="40" y="22" fill="#f59e0b" fontSize="3" className="font-mono font-black">5.2 ton</text>
              <text x="27" y="58" fill="currentColor" fontSize="2.2" className="font-mono">FOUNDATION MESH OK</text>
            </svg>
          ),
          specText: '기초 패드 하중분산 응력(Stress Tensor)·펌프 진동 방진 가이드 자동 검토'
        };
      } else if (matchKey === 'Utility 배관') {
        return {
          bgGradient: 'from-[#071326] via-[#0E2442] to-[#1E4475]',
          badgeText: 'Steam & Clean Air Utility Thermodynamic Loop',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-cyan-300/70 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes steamVent {
                  0% { transform: translateY(0px) scale(0.8); opacity: 0; }
                  50% { opacity: 0.8; }
                  100% { transform: translateY(-8px) scale(1.2); opacity: 0; }
                }
                .steam-puff { animation: steamVent 1.5s infinite ease-out; }
              ` }} />
              {/* 스팀 루프 구조 */}
              <path d="M15,60 C25,25 75,25 85,60" stroke="currentColor" strokeWidth="1.5" />
              {/* 트랩 스테이션 */}
              <rect x="42" y="30" width="16" height="8" rx="1" fill="#071326" stroke="#06b6d4" strokeWidth="1" />
              <circle cx="50" cy="34" r="2.5" fill="#f43f5e" />
              {/* 스팀 응축수 배출 애니메이션 */}
              <path d="M50,37 L50,45" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 1" />
              <g className="steam-puff" style={{ transformOrigin: '50px 42px' }}>
                <circle cx="50" cy="48" r="2.5" fill="currentColor" opacity="0.5" />
                <circle cx="53" cy="50" r="1.5" fill="currentColor" opacity="0.4" />
              </g>
              <text x="36" y="26" fill="currentColor" fontSize="2.5" className="font-mono">STEAM TRAP ST.</text>
            </svg>
          ),
          specText: '보온 두께 대비 열손실·드립포켓 간격·압축공기 응축수 트랩 적정성 수치 검증'
        };
      } else if (matchKey === '공장증설') {
        return {
          bgGradient: 'from-[#0A182F] via-[#10274A] to-[#E0701A]/30',
          badgeText: 'Factory Capacity Expansion & Branch Tie-in',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-accent/80 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              {/* 기존 관로 (Dimmed) */}
              <line x1="10" y1="25" x2="90" y2="25" stroke="#94a3b8" strokeWidth="2" strokeOpacity="0.4" />
              {/* 분기 신설 관로 (Active Orange) */}
              <path d="M50,25 L50,75 L85,75" stroke="#E0701A" strokeWidth="2" />
              {/* 티인 조인트 결합부 */}
              <circle cx="50" cy="25" r="4.5" fill="#0A182F" stroke="#E0701A" strokeWidth="1.5" className="animate-pulse" />
              <circle cx="50" cy="25" r="2" fill="#E0701A" />
              {/* 크로스헤어 정밀 조준 스케일 */}
              <circle cx="50" cy="25" r="12" stroke="#E0701A" strokeWidth="0.5" strokeDasharray="3 3" strokeOpacity="0.7" />
              <line x1="50" y1="8" x2="50" y2="42" stroke="#E0701A" strokeWidth="0.25" strokeOpacity="0.5" />
              <line x1="33" y1="25" x2="67" y2="25" stroke="#E0701A" strokeWidth="0.25" strokeOpacity="0.5" />
              <text x="56" y="21" fill="#E0701A" fontSize="3.2" className="font-mono font-black">HOT-TAP 80A</text>
            </svg>
          ),
          specText: '무중단 Hot-Tapping 공법 적합성·증설부 유량 손실 압력 구배 매핑'
        };
      } else if (matchKey === '노후배관교체') {
        return {
          bgGradient: 'from-[#0C1B33] via-[#122A4E] to-[#204984]',
          badgeText: 'Corrosion Inspection & Piping Lifecycle Audit',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-emerald-400/80 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes erosionScan {
                  0%, 100% { stroke-dashoffset: 0; }
                  50% { stroke-dashoffset: 16; }
                }
                .scan-dash { stroke-dasharray: 4 4; animation: erosionScan 4s infinite linear; }
              ` }} />
              {/* 배관 단면도 */}
              <rect x="15" y="30" width="70" height="40" rx="2" stroke="currentColor" strokeWidth="1.5" />
              {/* 부식 한도 스캔 레이저 */}
              <line x1="30" y1="30" x2="30" y2="70" stroke="#f43f5e" strokeWidth="1" className="scan-dash" />
              <line x1="70" y1="30" x2="70" y2="70" stroke="#10b981" strokeWidth="1" className="scan-dash" />
              {/* 부식 노드와 정상 자재 경계면 */}
              <path d="M16,50 Q23,45 30,50 T44,50 Q51,55 58,50 T72,50 T84,50" stroke="#f43f5e" strokeWidth="0.75" strokeDasharray="2 2" />
              <text x="18" y="25" fill="#f43f5e" fontSize="2.8" className="font-mono">OLD: CARBON CORROSION</text>
              <text x="56" y="78" fill="#10b981" fontSize="2.8" className="font-mono">NEW: SUS316L 100%</text>
            </svg>
          ),
          specText: '스케일 잔존 두께 비파괴 데이터·유체 화학식 기반 최적 내식재(SUS316L) 치환 판단'
        };
      } else if (matchKey === '기계실개선') {
        return {
          bgGradient: 'from-[#061224] via-[#0D213E] to-[#193B6B]',
          badgeText: 'Mechanical Room Cavitation & Flow Optimization',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-teal-400/80 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes vortexSpin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                .vortex-group { animation: vortexSpin 8s infinite linear; transform-origin: 50px 50px; }
              ` }} />
              {/* 펌프 하우징 하이테크 그래픽 */}
              <circle cx="50" cy="50" r="24" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="0.75" />
              <g className="vortex-group">
                <line x1="50" y1="50" x2="50" y2="28" stroke="#0d9488" strokeWidth="1" />
                <line x1="50" y1="50" x2="72" y2="50" stroke="#0d9488" strokeWidth="1" />
                <line x1="50" y1="50" x2="28" y2="50" stroke="#0d9488" strokeWidth="1" />
                <line x1="50" y1="50" x2="50" y2="72" stroke="#0d9488" strokeWidth="1" />
                <path d="M38,38 A16,16 0 0,1 62,38" stroke="#0d9488" strokeWidth="1" fill="none" />
                <path d="M62,62 A16,16 0 0,1 38,62" stroke="#0d9488" strokeWidth="1" fill="none" />
              </g>
              <text x="32" y="21" fill="currentColor" fontSize="2.8" className="font-mono">ECCENTRIC REDUCER OK</text>
            </svg>
          ),
          specText: '흡입측 캐비테이션 차단 편심이경관·복합 매니폴드 균등 압력 유체 검토'
        };
      } else if (matchKey === '생산설비 배관 연결') {
        return {
          bgGradient: 'from-[#091529] via-[#0F2241] to-[#1E4473]',
          badgeText: 'Ultra-High Purity (UHP) Cleanroom Hook-Up',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-sky-400/80 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              {/* 반도체 가스 판넬 / 오비탈 용접 시각화 */}
              <rect x="20" y="20" width="60" height="60" rx="2" stroke="currentColor" strokeWidth="1" />
              <line x1="20" y1="40" x2="80" y2="40" stroke="currentColor" strokeWidth="0.75" />
              <line x1="20" y1="60" x2="80" y2="60" stroke="currentColor" strokeWidth="0.75" />
              <circle cx="35" cy="40" r="4" fill="#091529" stroke="#38bdf8" strokeWidth="1.5" />
              <circle cx="65" cy="60" r="4" fill="#091529" stroke="#38bdf8" strokeWidth="1.5" />
              {/* 초미세 여과 필터 유닛 */}
              <path d="M50,15 L50,85" stroke="#38bdf8" strokeWidth="1.5" />
              <rect x="44" y="44" width="12" height="12" rx="0.5" fill="#091529" stroke="#10b981" strokeWidth="1" />
              <text x="47" y="52" fill="#10b981" fontSize="2.8" className="font-mono font-black">0.01㎛</text>
              <text x="25" y="15" fill="currentColor" fontSize="2.8" className="font-mono">UHP GAS MANIFOLD</text>
            </svg>
          ),
          specText: '초순수(DIW)·반도체 특수가스 크린룸 오비탈 용접 EP등급 자재 타당성 심사'
        };
      } else if (matchKey === 'CAPEX 개·증설 검토') {
        return {
          bgGradient: 'from-[#0B1E35] via-[#152E51] to-[#E0701A]/20',
          badgeText: 'CAPEX Engineering Cost Valuation & Risk Audit',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-accent/80 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes chartMove {
                  0%, 100% { stroke-dashoffset: 0; }
                  50% { stroke-dashoffset: 5; }
                }
                .trend-line { stroke-dasharray: 100; stroke-dashoffset: 0; animation: chartMove 5s infinite ease-in-out; }
              ` }} />
              {/* 축 선 */}
              <line x1="15" y1="85" x2="85" y2="85" stroke="currentColor" strokeWidth="1.2" />
              <line x1="15" y1="15" x2="15" y2="85" stroke="currentColor" strokeWidth="1.2" />
              {/* 시공사 견적 버블 추이선 */}
              <path d="M15,55 L35,20 L55,48 L75,15 L85,25" stroke="#f43f5e" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.7" />
              {/* ZEROS 정직 AI 단가 보정선 */}
              <path d="M15,75 L35,60 L55,65 L75,50 L85,52" stroke="#E0701A" strokeWidth="2.2" className="trend-line" />
              <circle cx="75" cy="50" r="3.5" fill="#0B1E35" stroke="#E0701A" strokeWidth="1.5" />
              <text x="18" y="48" fill="#f43f5e" fontSize="2.8" className="font-mono">INFLATED PROPOSALS (BUBBLE)</text>
              <text x="32" y="74" fill="#E0701A" fontSize="3" className="font-mono font-black">ZEROS AI AUDIT REFERENCE</text>
            </svg>
          ),
          specText: '유사 1군 실거래 n건 DB 기반 정량적 CAPEX 버블 억제 분석'
        };
      } else if (matchKey === 'spool') {
        return {
          bgGradient: 'from-[#0A162B] via-[#0E2343] to-[#173B6C]',
          badgeText: 'Pipe Spool Prefabrication & Shop Welding',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-cyan-400/70 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spoolFlow { 0% { stroke-dashoffset: 20; } 100% { stroke-dashoffset: 0; } }
                .spool-flow { stroke-dasharray: 4 6; animation: spoolFlow 1.2s linear infinite; }
              ` }} />
              {/* 플랜지가 달린 사전제작 스풀 */}
              <path d="M20,40 L55,40 Q65,40 65,50 L65,78" stroke="currentColor" strokeWidth="1.5" />
              <path d="M20,40 L55,40 Q65,40 65,50 L65,78" stroke="#06b6d4" strokeWidth="1" className="spool-flow" />
              {/* 플랜지 단부 */}
              <line x1="18" y1="34" x2="18" y2="46" stroke="currentColor" strokeWidth="2" />
              <line x1="59" y1="72" x2="71" y2="72" stroke="currentColor" strokeWidth="2" transform="rotate(90 65 78)" />
              <line x1="59" y1="78" x2="71" y2="78" stroke="currentColor" strokeWidth="2" />
              {/* 용접 비드 노드 */}
              <circle cx="55" cy="40" r="2" fill="#f97316" className="animate-pulse" />
              <circle cx="65" cy="50" r="2" fill="#f97316" className="animate-pulse" />
              <text x="20" y="30" fill="currentColor" fontSize="2.8" className="font-mono">ISO SPOOL · RT PASS</text>
            </svg>
          ),
          specText: 'ISO 도면 기반 스풀 분할 및 팹샵 사전 용접·비파괴(RT/PMI) 검사 통제 환경 모듈 제작 검증'
        };
      } else if (matchKey === 'skid') {
        return {
          bgGradient: 'from-[#081222] via-[#0E213D] to-[#1B3A64]',
          badgeText: 'Skid-Mounted Package Module & FAT',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-amber-500/70 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              {/* 스키드 프레임 */}
              <rect x="22" y="55" width="56" height="22" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <line x1="22" y1="71" x2="78" y2="71" stroke="currentColor" strokeWidth="0.6" />
              {/* 탑재 장비: 펌프/탱크/계장 */}
              <circle cx="36" cy="46" r="7" stroke="#f59e0b" strokeWidth="1.2" />
              <line x1="36" y1="46" x2="36" y2="40" stroke="#f59e0b" strokeWidth="1" className="animate-[spin_4s_linear_infinite]" style={{ transformOrigin: '36px 46px' }} />
              <rect x="52" y="38" width="14" height="17" rx="1" stroke="currentColor" strokeWidth="1" />
              <path d="M43,50 L52,50" stroke="#06b6d4" strokeWidth="1" strokeDasharray="2 1.5" />
              <text x="24" y="34" fill="#f59e0b" fontSize="2.8" className="font-mono font-bold">FAT TESTED</text>
            </svg>
          ),
          specText: '단일 프레임 패키지 모듈 공장 조립 및 계장·제어 사전 시운전(FAT) 검증 후 현장 반입 표준화'
        };
      } else if (matchKey === 'structure') {
        return {
          bgGradient: 'from-[#0A182F] via-[#10274A] to-[#E0701A]/25',
          badgeText: 'Steel Structure Shop Fabrication',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-accent/80 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              {/* 철구조 가대/트러스 프레임 */}
              <rect x="20" y="25" width="60" height="55" stroke="currentColor" strokeWidth="1.5" />
              <line x1="20" y1="25" x2="80" y2="80" stroke="#E0701A" strokeWidth="1" />
              <line x1="80" y1="25" x2="20" y2="80" stroke="#E0701A" strokeWidth="1" />
              <line x1="20" y1="52" x2="80" y2="52" stroke="currentColor" strokeWidth="0.8" />
              {/* 볼트 접합 노드 */}
              <circle cx="20" cy="25" r="2.2" fill="#0A182F" stroke="#E0701A" strokeWidth="1" />
              <circle cx="80" cy="25" r="2.2" fill="#0A182F" stroke="#E0701A" strokeWidth="1" />
              <circle cx="20" cy="80" r="2.2" fill="#0A182F" stroke="#E0701A" strokeWidth="1" />
              <circle cx="80" cy="80" r="2.2" fill="#0A182F" stroke="#E0701A" strokeWidth="1" />
              <text x="22" y="20" fill="#E0701A" fontSize="2.8" className="font-mono font-black">SHOP DRAWING ±1mm</text>
            </svg>
          ),
          specText: '구조 도면 기반 강재 절단·천공·용접 공장 가공 및 도장·아연도금 후 현장 볼팅 조립 표준화'
        };
      } else if (matchKey === 'small') {
        return {
          bgGradient: 'from-[#071328] via-[#0D2140] to-[#1B3E6E]',
          badgeText: 'Instant Online Review Algorithm',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-cyan-400 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              <rect x="20" y="20" width="60" height="60" stroke="currentColor" strokeWidth="1" strokeDasharray="5 5" />
              <circle cx="50" cy="50" r="16" stroke="currentColor" strokeWidth="1.5" />
              <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="0.5" />
              <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="0.5" />
              <text x="25" y="15" fill="currentColor" fontSize="3" className="font-mono">FAST AUDIT LAYOUT</text>
            </svg>
          ),
          specText: '제출된 현장 사진 및 치수 정보 기준의 간이 관내 마찰 손실값 연산 및 24시간 내 초고속 권장 사양 도출'
        };
      } else if (matchKey === 'medium') {
        return {
          bgGradient: 'from-[#08152D] via-[#10274C] to-[#1E4A83]',
          badgeText: 'Laser Real-Measurement & Calibration',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-amber-500 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              {/* 3차원 좌표계 및 레이저 스캔 */}
              <path d="M20,70 L50,45 L80,70 M50,45 L50,15" stroke="currentColor" strokeWidth="1" />
              <circle cx="50" cy="45" r="4.5" fill="#08152D" stroke="#f59e0b" strokeWidth="1.5" className="animate-ping" />
              <circle cx="50" cy="45" r="2" fill="#f59e0b" />
              <line x1="50" y1="45" x2="25" y2="65" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 1" />
              <line x1="50" y1="45" x2="75" y2="65" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 1" />
              <text x="22" y="15" fill="currentColor" fontSize="3" className="font-mono">3D SPACE MEASURE</text>
            </svg>
          ),
          specText: '배테랑 실측 엔지니어 현장 파견을 통한 주요 간섭 반입로 레이저 정밀 계측 및 시공 장애 원천 봉쇄 검토'
        };
      } else if (matchKey === 'large') {
        return {
          bgGradient: 'from-[#0A162B] via-[#112543] to-[#E0701A]/20',
          badgeText: 'Total Enterprise CAPEX Architecture PM',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-accent/80 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              {/* 복잡 프로젝트 상관 매트릭스 그리드 */}
              <circle cx="30" cy="30" r="5" fill="#0A162B" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="70" cy="30" r="5" fill="#0A162B" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="50" cy="70" r="5" fill="#0A162B" stroke="currentColor" strokeWidth="1.5" />
              <line x1="35" y1="30" x2="65" y2="30" stroke="currentColor" strokeWidth="1" />
              <line x1="30" y1="35" x2="45" y2="65" stroke="#E0701A" strokeWidth="1.5" className="animate-pulse" />
              <line x1="70" y1="35" x2="55" y2="65" stroke="currentColor" strokeWidth="1" />
              <text x="25" y="15" fill="currentColor" fontSize="3" className="font-mono">PM COST RELATION MATRIX</text>
            </svg>
          ),
          specText: '대단위 설비 투자를 조망하는 기획 VE(Value Engineering) 분석 및 공종별 실행 예산 가이드 라인 종합 통제'
        };
      } else {
        return {
          bgGradient: 'from-[#0B1E35] via-[#0F2036] to-[#1A385E]',
          badgeText: 'ZEROS Engineering Standard Standard Review',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-white stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="32" stroke="currentColor" />
              <circle cx="50" cy="50" r="12" stroke="currentColor" />
              <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" />
              <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" />
            </svg>
          ),
          specText: 'ZEROS 엔지니어 매니저 직접 분석을 통한 최적의 예상견적 및 검토 방향 수립 배정'
        };
      }
    };

    const getDynamicMetrics = (menuKey: string) => {
      const matchKey = menuKey || '배관공사';
      switch (matchKey) {
        case '배관공사':
          return {
            sampleCount: 74,
            confidence: 99.8,
            bubbleRate: 28.4,
            accentBg: 'bg-cyan-500/5',
            accentText: 'text-cyan-600',
            accentBorder: 'border-cyan-200/80',
            badgeBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-700',
            bubbleWidth: 'w-[28.4%]',
            checklist: ['ASME/KS 자재 마진 필터링', '관경·압력손실 수치 검증', '1군 표준 품셈 공기 산출']
          };
        case '장비설치':
          return {
            sampleCount: 48,
            confidence: 99.6,
            bubbleRate: 22.1,
            accentBg: 'bg-amber-500/5',
            accentText: 'text-amber-600',
            accentBorder: 'border-amber-200/80',
            badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-700',
            bubbleWidth: 'w-[22.1%]',
            checklist: ['양중 경로·크레인 간섭 검토', '방진 패드 하중분산 적합성', '고소 안전비계·방진 스펙 필터링']
          };
        case 'Utility 배관':
          return {
            sampleCount: 62,
            confidence: 99.5,
            bubbleRate: 24.6,
            accentBg: 'bg-sky-500/5',
            accentText: 'text-sky-600',
            accentBorder: 'border-sky-200/80',
            badgeBg: 'bg-sky-500/10 border-sky-500/20 text-sky-700',
            bubbleWidth: 'w-[24.6%]',
            checklist: ['보온 열손실율 열역학 계산', '응축수 트랩 위치 검토', '차단밸브 조작 동선 매핑']
          };
        case '공장증설':
          return {
            sampleCount: 35,
            confidence: 99.2,
            bubbleRate: 31.5,
            accentBg: 'bg-accent/5',
            accentText: 'text-accent',
            accentBorder: 'border-accent/20',
            badgeBg: 'bg-accent/10 border-accent/20 text-accent-700',
            bubbleWidth: 'w-[31.5%]',
            checklist: ['무중단 Hot-tapping 리스크 필터링', '증설 전후 유량 차압 시뮬레이션', '분기 조인트 화학 안정성 검증']
          };
        case '노후배관교체':
          return {
            sampleCount: 51,
            confidence: 99.7,
            bubbleRate: 26.8,
            accentBg: 'bg-emerald-500/5',
            accentText: 'text-emerald-600',
            accentBorder: 'border-emerald-200/80',
            badgeBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700',
            bubbleWidth: 'w-[26.8%]',
            checklist: ['스케일 비파괴 잔존수명 검증', '최적 내식재(SUS) 규격 치환', '안전 세정·배출 노무 필터링']
          };
        case '기계실개선':
          return {
            sampleCount: 42,
            confidence: 99.9,
            bubbleRate: 29.3,
            accentBg: 'bg-teal-500/5',
            accentText: 'text-teal-600',
            accentBorder: 'border-teal-200/80',
            badgeBg: 'bg-teal-500/10 border-teal-500/20 text-teal-700',
            bubbleWidth: 'w-[29.3%]',
            checklist: ['편심 이경관 캐비테이션 차단', '매니폴드 균등 압력 분배 분석', '루프 반입구·간섭 유효성 검토']
          };
        case '생산설비 배관 연결':
          return {
            sampleCount: 45,
            confidence: 99.9,
            bubbleRate: 34.2,
            accentBg: 'bg-indigo-500/5',
            accentText: 'text-indigo-600',
            accentBorder: 'border-indigo-200/80',
            badgeBg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700',
            bubbleWidth: 'w-[34.2%]',
            checklist: ['초순수/UHP EP 자재 등급 검증', '오비탈 용접 노무 과다 필터링', '0.01㎛ 필터·감압밸브 배치']
          };
        case 'CAPEX 개·증설 검토':
          return {
            sampleCount: 88,
            confidence: 99.5,
            bubbleRate: 37.6,
            accentBg: 'bg-[#0f1e35]/5',
            accentText: 'text-navy',
            accentBorder: 'border-[#0f1e35]/15',
            badgeBg: 'bg-[#0f1e35]/10 border-[#0f1e35]/20 text-navy',
            bubbleWidth: 'w-[37.6%]',
            checklist: ['WBS 공종별 예산 상한 매핑', '유사 1군 실거래 정량 대조', 'CAPEX 초과 리스크 조기 감지']
          };
        case 'spool':
          return {
            sampleCount: 68,
            confidence: 99.6,
            bubbleRate: 50.0,
            accentBg: 'bg-cyan-500/5',
            accentText: 'text-cyan-600',
            accentBorder: 'border-cyan-200/80',
            badgeBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-700',
            bubbleWidth: 'w-[50%]',
            checklist: ['ISO 도면 운반·조립 단위 스풀 분할 최적화', '팹샵 통제 환경 용접 및 RT/PMI 비파괴 검사 기록', '스풀 식별 마킹 기반 현장 무오류 조립 시퀀스 매핑']
          };
        case 'skid':
          return {
            sampleCount: 54,
            confidence: 99.7,
            bubbleRate: 40.0,
            accentBg: 'bg-amber-500/5',
            accentText: 'text-amber-600',
            accentBorder: 'border-amber-200/80',
            badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-700',
            bubbleWidth: 'w-[40%]',
            checklist: ['단일 프레임 장비·배관·계장 3D 통합 배치 설계', '공장 사전 시운전(FAT) 기밀·제어 로직 검증', '반입구 치수·하중·유틸리티 인터페이스 정합성 대조']
          };
        case 'structure':
          return {
            sampleCount: 47,
            confidence: 99.5,
            bubbleRate: 35.0,
            accentBg: 'bg-accent/5',
            accentText: 'text-accent',
            accentBorder: 'border-accent/20',
            badgeBg: 'bg-accent/10 border-accent/20 text-accent',
            bubbleWidth: 'w-[35%]',
            checklist: ['Shop Drawing 기반 강재 절단·천공 ±1mm 정밀 가공', '하중 기준 용접·치수 검사 구조 안전성 검증', '도장·아연도금 표면처리 후 현장 볼팅 조립 가이드']
          };
        case 'small':
          return {
            sampleCount: 124,
            confidence: 99.4,
            bubbleRate: 18.2,
            accentBg: 'bg-cyan-500/5',
            accentText: 'text-cyan-600',
            accentBorder: 'border-cyan-200/80',
            badgeBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-700',
            bubbleWidth: 'w-[18.2%]',
            checklist: ['현장 사진 매핑을 통한 기본 노무량 분석', '온라인 제출 치수 기준 관 마찰 유속 유동 검증', '자재 교체용 간이 스펙 비교 정합성 매핑']
          };
        case 'medium':
          return {
            sampleCount: 96,
            confidence: 99.8,
            bubbleRate: 27.5,
            accentBg: 'bg-amber-500/5',
            accentText: 'text-amber-600',
            accentBorder: 'border-amber-200/80',
            badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-700',
            bubbleWidth: 'w-[27.5%]',
            checklist: ['레이저 3D ISO 실측 실 데이터 100% 매핑', '기계실 물리 간섭 및 구조 하중 설계 타당성 대조', '현장 가동중단(셧다운) 스케줄 리스크 완화 매핑']
          };
        case 'large':
          return {
            sampleCount: 26,
            confidence: 99.7,
            bubbleRate: 35.4,
            accentBg: 'bg-accent/5',
            accentText: 'text-accent',
            accentBorder: 'border-accent/20',
            badgeBg: 'bg-accent/10 border-accent/20 text-accent-700',
            bubbleWidth: 'w-[35.4%]',
            checklist: ['대단위 CAPEX 공종 실행 한도(WBS) 종합 설계', '기획 VE(Value Engineering) 유사 실거래 대조', '입찰 시공사 복수 견적서 1:1 동일 기준 심사']
          };
        default:
          return {
            sampleCount: 30,
            confidence: 99.0,
            bubbleRate: 25.0,
            accentBg: 'bg-[#1e4d8c]/5',
            accentText: 'text-steel',
            accentBorder: 'border-[#1e4d8c]/20',
            badgeBg: 'bg-[#1e4d8c]/10 border-[#1e4d8c]/20 text-steel',
            bubbleWidth: 'w-[25%]',
            checklist: ['ZEROS 표준 품셈 노무 분석 기준 적용', '실거래 가격 단가 오차 범위 대조 확인', '과도 인건비 거품 및 설계 위험 조기 제거']
          };
      }
    };

  const renderManualDetail = (key: string) => {
    const manual = manualData[key] || manualData['배관공사'];
    const visuals = getCategoryVisuals(key);
    const metrics = getDynamicMetrics(key);

    return (
      <div key={key} className="flex flex-col gap-6 max-w-4xl mx-auto py-2 animate-in fade-in duration-300">

        {/* ============================================================
            상단 (TOP) — 주제 + 데이터분석 + AI툴 신뢰 작업 FLOW
            ============================================================ */}
        <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm flex flex-col gap-4 relative overflow-hidden">

          {/* 섹션 식별 라벨 */}
          <div className="flex items-center justify-between gap-2 select-none">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-accent rounded-full" />
              <span className="text-[12px] font-bold text-navy uppercase tracking-wider">견적 작업 FLOW</span>
            </div>
            <span className="text-[12px] font-mono font-bold text-gray-light tracking-wider">REQUEST · DATA · AI · SUBMIT</span>
          </div>

          {/* 7단계 견적 작업 — 클릭형 시계열 스텝 (좌→우 흐름 + 인플레이스 상세) */}
          <EstimateFlow />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            
            {/* Box 1: Engineering Target & Information Box */}
            <div className={`relative overflow-hidden bg-bg text-navy p-5 rounded-custom border ${metrics.accentBorder} flex flex-col justify-between gap-4 transition-all shadow-sm`}>
              {/* 하이 테크 백그라운드 그리드 레이아웃 (라이트 버전) */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.007)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.007)_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />
              <div className={`absolute inset-0 ${metrics.accentBg} opacity-20 pointer-events-none`} />
              
              <div className="flex flex-col justify-between gap-4 z-10 relative flex-1">
                {/* 타이틀 및 핵심 엔지니어링 문제 정의 (상단) */}
                <div className="flex flex-col gap-2">
                  <h2 className="text-[18px] md:text-[18px] font-black tracking-tight leading-tight text-navy select-none">
                    {manual.title}
                  </h2>
                  <p className="text-[12px] text-gray leading-snug font-semibold font-sans mt-0.5">
                    {manual.problemDefinition}
                  </p>
                </div>

                {/* 공종 배지 + 데이터 AI 정직 검증 수치 대시보드 */}
                <div className="flex flex-col gap-2">
                  <span className={`self-start text-[12px] tracking-widest uppercase font-black px-2.5 py-1 rounded-custom shadow-inner ${metrics.badgeBg}`}>
                    {visuals.badgeText}
                  </span>
                  <div className="grid grid-cols-3 gap-2.5 bg-bg-subtle/80 border border-border/70 p-2.5 rounded-custom shadow-inner select-none">
                  <div className="text-center flex flex-col justify-center">
                    <span className="text-[12px] text-gray-light font-bold block uppercase tracking-wide break-keep leading-tight mb-0.5">AI 분석 신뢰도</span>
                    <span className="text-[15px] font-black text-navy tracking-tight tabular-nums">{metrics.confidence}%</span>
                  </div>
                  <div className="text-center flex flex-col justify-center border-l border-border/60">
                    <span className="text-[12px] text-gray-light font-bold block uppercase tracking-wide break-keep leading-tight mb-0.5">실거래 표준 품셈</span>
                    <span className="text-[15px] font-black text-success tracking-tight">100% 매핑</span>
                  </div>
                  <div className="text-center flex flex-col justify-center border-l border-border/60">
                    <span className="text-[12px] text-gray-light font-bold block uppercase tracking-wide break-keep leading-tight mb-0.5">평균 거품 절감</span>
                    <span className="text-[15px] font-black text-accent tracking-tight tabular-nums">-{metrics.bubbleRate}%</span>
                  </div>
                </div>
              </div>
              </div>

            </div>

            {/* Box 2: Agent AI Technical Simulation & Honest pricing */}
            <div className="relative overflow-hidden bg-bg text-navy p-5 rounded-custom border border-border flex flex-col justify-between gap-4 transition-all shadow-sm">
              {/* 하이 테크 백그라운드 그리드 레이아웃 */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.007)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.007)_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />

              {/* Agent AI 정직 견적 신뢰 코어 패널 */}
              <div className="flex flex-col justify-between gap-4 z-10 relative flex-1 select-none">
                {/* 타이틀 + 한 줄 설명 (공종 공통, 평이한 문장) */}
                <div className="flex flex-col gap-1">
                  <span className="text-[18px] md:text-[18px] font-black text-navy tracking-tight leading-tight">
                    ZEROS Agent AI 정직 단가 교정 모니터
                  </span>
                  <span className="text-[12px] text-gray/80 font-bold mt-0.5 leading-relaxed">
                    실거래 표본과 표준 품셈으로 과도하게 부풀려진 단가를 실시간으로 걸러냅니다.
                  </span>
                </div>

                {/* 정밀 공종별 체크사항 목록 */}
                <ul className="flex flex-col gap-1.5">
                  {metrics.checklist.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[12px] text-gray font-semibold leading-tight">
                      <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {/* 정직·신뢰 실시간 교정 비교 바 (공종 난이도·복잡성 연동) */}
                <div className="flex flex-col gap-1.5 bg-bg-subtle/80 border border-border/60 p-2.5 rounded-custom shadow-inner">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[12px] font-bold text-gray">
                      <span>시공사 평균 거품 청구</span>
                      <span className="text-danger font-mono font-bold tabular-nums">{(100 + metrics.bubbleRate).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-border/40 h-1 rounded-full overflow-hidden">
                      <div className="bg-danger/80 h-full rounded-full" style={{ width: `${Math.min(92, 55 * (100 + metrics.bubbleRate) / 100).toFixed(1)}%` }} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 border-t border-border/50 pt-1.5">
                    <div className="flex justify-between text-[12px] font-black text-navy">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-success animate-pulse" />
                        ZEROS AI 교정 단가
                      </span>
                      <span className="text-success font-mono font-bold tabular-nums">100% (버블 0%)</span>
                    </div>
                    <div className="w-full bg-border/40 h-1 rounded-full overflow-hidden">
                      <div className="bg-success h-full w-[55%] rounded-full animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* ============================================================
            중단 (MIDDLE) — 좌: 작업 준비사항 / 우: 작업 SOP
            ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

          {/* 좌측 박스: 작업 준비사항 */}
          <div className="bg-bg border border-border p-6 rounded-custom shadow-custom-sm flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-3 select-none">
              <div className="flex items-center gap-2 text-navy">
                <BookOpen className="w-4 h-4 text-steel" />
                <span className="font-extrabold text-[15px]">작업 준비사항</span>
              </div>
              <span className="text-[12px] font-black text-steel bg-steel/10 border border-steel/15 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Prepare</span>
            </div>
            <p className="text-[12px] text-gray-light font-semibold leading-normal -mt-1">정확한 진단을 위해 아래 자료를 사전에 준비해 주세요.</p>
            <ul className="flex flex-col gap-3">
              {manual.preparationDocs.map((doc, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-[12px] text-gray font-medium">
                  <CheckCircle2 className="w-4 h-4 text-steel shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{doc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 우측 박스: 작업 SOP (표준 작업 절차) */}
          <div className="bg-bg border border-border p-6 rounded-custom shadow-custom-sm flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-3 select-none">
              <div className="flex items-center gap-2 text-navy">
                <FileCheck className="w-4 h-4 text-accent" />
                <span className="font-extrabold text-[15px]">작업 SOP</span>
              </div>
              <span className="text-[12px] font-black text-accent bg-accent/10 border border-accent/15 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Procedure</span>
            </div>
            <ol className="flex flex-col gap-2.5">
              {manual.sop.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-navy text-bg text-[12px] font-black flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-[12px] leading-snug">
                    <span className="font-bold text-navy">{step.title}</span>
                    <span className="text-gray font-medium"> : {step.action}</span>
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* ============================================================
            하단 (BOTTOM) — 결과 지표 & Benefit 효과 증빙
            ============================================================ */}
        <div className="bg-bg border border-border p-6.5 rounded-custom shadow-custom-sm flex flex-col gap-5">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-3.5 select-none">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-success rounded-full" />
              <h3 className="text-[15px] font-extrabold text-navy">결과 지표 &amp; Benefit 효과 증빙</h3>
            </div>
            <span className="text-[12px] font-black text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Proven
            </span>
          </div>

          {/* Benefit 효과 카드 (정량 증빙) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {manual.benefits.map((b, idx) => (
              <div key={idx} className="bg-bg-subtle/70 border border-border p-4.5 rounded-custom flex flex-col gap-1.5 relative overflow-hidden shadow-sm hover:shadow-custom-md transition-all">
                <div className="absolute right-0 top-0 w-16 h-16 bg-[radial-gradient(circle_at_top_right,rgba(31,122,77,0.06),transparent_70%)] pointer-events-none" />
                <span className="text-2xl font-black text-navy tracking-tight tabular-nums leading-none">{b.metric}</span>
                <span className="text-[12px] font-extrabold text-steel leading-none mt-1">{b.label}</span>
                <span className="text-[12px] text-gray font-medium leading-normal mt-1">{b.desc}</span>
              </div>
            ))}
          </div>

          {/* 최종 제공 리포트 (산출물) */}
          <div className="bg-bg-subtle/50 border border-border/80 rounded-custom p-4.5 flex flex-col gap-3">
            <div className="flex items-center gap-2 select-none">
              <FileCheck className="w-3.5 h-3.5 text-steel" />
              <span className="text-[12px] font-extrabold text-navy uppercase tracking-wide">최종 제공 리포트</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {manual.deliverables.map((del, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-bg border border-border/70 rounded-custom px-3 py-2.5">
                  <span className="w-4 h-4 rounded-full bg-navy text-bg text-[12px] font-black flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                  <span className="text-[12px] text-gray font-medium leading-snug">{del}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 상세 유의점 */}
          <div className="border-t border-border pt-4 flex flex-col gap-2">
            <span className="text-[12px] font-black text-navy uppercase tracking-wide">진단 프로세스 상세 유의점</span>
            <p className="text-[12px] text-gray leading-relaxed font-medium">{manual.details}</p>
            <span className="text-[12px] text-gray-light font-medium block mt-1">
              * 제공해주신 자료가 불충분할 경우 담당 엔지니어가 추가 자료를 요청(전화/이메일)할 수 있습니다.
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderLandingDashboard = () => {
    const activeTradeName = LANDING_TRADES[activeTradeIdx];
    const activeManual = manualData[activeTradeName];
    const activeMetrics = getDynamicMetrics(activeTradeName);
    const activeVisuals = getCategoryVisuals(activeTradeName);

    return (
      <div className="flex flex-col gap-7 max-w-4xl mx-auto">

      {/* ============================================================
          핵심 주제 히어로 — 무료 출장 견적 컨설팅 + 현장 실무30년 신뢰
          ============================================================ */}
      <section className="relative overflow-hidden bg-bg rounded-custom shadow-custom-sm p-5 md:p-6 flex flex-col gap-4 select-none">
        {/* 밝고 신뢰감 있는 맥킨지 톤 배경 */}
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(245,247,250,0.9),rgba(255,255,255,0)_55%)] pointer-events-none" />
        <div className="absolute right-0 top-0 w-64 h-64 bg-[radial-gradient(circle_at_top_right,rgba(30,77,140,0.06),transparent_70%)] pointer-events-none" />
        <div className="absolute left-0 bottom-0 h-1 w-full bg-gradient-to-r from-steel via-accent to-transparent opacity-70 pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-3">
          {/* 주요 CTA + 보조 — 하단 쇼케이스 버튼과 동일 크기·폭, 오렌지·청색 균형 배치 */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            <button
              onClick={() => setActiveTabAtTop('request')}
              style={{ touchAction: 'manipulation' }}
              className="flex-1 min-h-10 inline-flex items-center justify-center gap-2 bg-[#F97316] hover:bg-[#EA670F] text-white px-4 py-2.5 rounded-custom text-[13.5px] font-black tracking-wide shadow-sm transition-colors duration-150 active:scale-95 cursor-pointer text-center"
            >
              <FileCheck className="w-4 h-4 shrink-0" />
              <span>무료 출장 견적 컨설팅 신청</span>
            </button>
            <button
              onClick={() => setActiveTabAtTop('about')}
              style={{ touchAction: 'manipulation' }}
              className="flex-1 min-h-10 inline-flex items-center justify-center gap-1.5 bg-steel hover:bg-navy text-bg px-4 py-2.5 rounded-custom text-[13.5px] font-black tracking-wide shadow-sm transition-colors duration-150 active:scale-95 cursor-pointer text-center"
            >
              컨설팅 절차 보기 <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>

          {/* 전국 무료 방문 신뢰 칩 (정보 — 테두리 없이 채움만) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-[#F0F5FB] text-[#123A63] text-[12px] font-bold px-3 py-1.5 rounded-full select-none">
              <MapPin className="w-3.5 h-3.5 text-steel" /> 전국 현장 무료 방문
            </span>
            <span className="inline-flex items-center gap-1.5 bg-[#F0F5FB] text-[#123A63] text-[12px] font-bold px-3 py-1.5 rounded-full select-none">
              <ShieldCheck className="w-3.5 h-3.5 text-success" /> AI Native 1차 검증
            </span>
          </div>

          {/* 핵심 카피 */}
          <p className="text-[14px] md:text-[16px] text-gray leading-relaxed font-semibold max-w-2xl text-balance">
            견적은 감이 아니라, <strong className="text-navy font-extrabold">DATA</strong>입니다.{' '}
            <br className="hidden md:block" />
            현장 경험과 <strong className="text-navy font-extrabold">AI Native 분석</strong>으로 비용과 리스크를 <strong className="text-navy font-extrabold">ZEROS</strong> 합니다.
          </p>

          {/* 신뢰 증빙 — 제목/상세 2단 크리덴셜 스트립(형식 통일·세로폭 압축) */}
          <div className="grid grid-cols-3 gap-2 mt-0.5 border-t border-border/70 pt-2 select-none">
            {[
              { title: '현장 실무30년', detail: 'Manager, 엔지니어' },
              { title: '국가 기술자격증', detail: '자격증 다수' },
              { title: 'PM 총괄역임', detail: '프로젝트 다수' },
            ].map((c, idx) => (
              <div key={c.title} className={`flex flex-col gap-0.5 min-w-0 ${idx > 0 ? 'pl-2 border-l border-border/60' : ''}`}>
                <span className="text-[12px] sm:text-[13.5px] font-black text-navy tracking-tight leading-tight whitespace-nowrap">{c.title}</span>
                <span className="text-[11px] sm:text-[12px] text-gray font-bold leading-tight break-keep">{c.detail}</span>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Symmetrical Single Full-Width Box matching the very bottom card's specifications */}
      <div className="bg-bg border border-border p-4.5 rounded-custom shadow-custom-sm flex flex-col gap-4 relative overflow-hidden animate-in fade-in duration-300">
        
        <div className="grid grid-cols-1 gap-4 items-stretch z-10 relative">
          
          {/* 활성 공종 정보 — 중첩 박스 껍데기 제거, 쇼케이스 카드에 직접 배치 */}
          <div className="flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-3.5">
              {/* 공종 라벨(eyebrow) + 실시간 표본 신호 — 박스 제거 */}
              <div className="flex items-center justify-between gap-2 select-none min-w-0">
                <span className={`min-w-0 truncate text-[12px] tracking-widest uppercase font-black ${activeMetrics.accentText}`}>
                  {activeVisuals.badgeText}
                </span>
                <div className="shrink-0 whitespace-nowrap text-right text-[12px] font-mono font-bold text-steel">
                  표본={activeMetrics.sampleCount}
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] text-gray-light font-black tracking-wider block uppercase">현재 탐색 공종</span>
                <h1 className="text-xl font-black leading-tight tracking-tight text-navy font-sans">
                  {activeManual.title}
                </h1>
                <p className="text-[12px] text-gray leading-relaxed font-semibold font-sans mt-0.5">
                  {activeManual.problemDefinition}
                </p>
              </div>

              {/* 데이터 AI 정직 검증 수치 대시보드 */}
              <div className="grid grid-cols-3 gap-3 border-t border-border/60 pt-3 my-0.5 select-none">
                <div className="text-center flex flex-col justify-center">
                  <span className="text-[12px] text-gray-light font-bold block uppercase tracking-wide break-keep leading-tight mb-0.5">AI 분석 신뢰도</span>
                  <span className="text-[12px] font-black text-navy tracking-tight tabular-nums">{activeMetrics.confidence}%</span>
                </div>
                <div className="text-center flex flex-col justify-center border-l border-border/60">
                  <span className="text-[12px] text-gray-light font-bold block uppercase tracking-wide break-keep leading-tight mb-0.5">실거래 표준 품셈</span>
                  <span className="text-[12px] font-black text-success tracking-tight">100% 매핑</span>
                </div>
                <div className="text-center flex flex-col justify-center border-l border-border/60">
                  <span className="text-[12px] text-gray-light font-bold block uppercase tracking-wide break-keep leading-tight mb-0.5">평균 거품 절감</span>
                  <span className="text-[12px] font-black text-accent tracking-tight tabular-nums">-{activeMetrics.bubbleRate}%</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-1 select-none">
              <button
                onClick={() => setActiveTabAtTop('sop')}
                className="flex-1 min-h-10 bg-steel hover:bg-navy text-bg px-4 py-2.5 rounded-custom text-[13.5px] font-black tracking-wide shadow-sm hover:scale-[1.01] active:scale-95 transition-all duration-150 cursor-pointer text-center"
              >
                AI Native 검증 제출
              </button>
              <button
                onClick={() => setActiveTabAtTop('about')}
                className="flex-1 min-h-10 bg-[#F97316] hover:bg-[#EA670F] text-white px-4 py-2.5 rounded-custom text-[13.5px] font-black tracking-wide shadow-sm transition-colors duration-150 active:scale-95 cursor-pointer text-center"
              >
                ZEROS 진단 절차
              </button>
            </div>
          </div>

        </div>
      </div>

      <section className="flex flex-col gap-5 px-1 pt-2">
        <SectionHeading eyebrow="How We Review" title="공사비보다 공사 범위를 먼저 고정합니다." accent="steel" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-0">
          {[
            { title: '자료 정밀 검토', desc: '도면·사진의 치수와 연결 규격을 확인해 범위 누락을 막습니다.' },
            { title: '현장 제약 확인', desc: '협소 반입·고소·가동중단 등 단가 급증 리스크를 미리 잡습니다.' },
            { title: '공사 범위 고정', desc: '동일 스펙으로 여러 업체를 1:1 비교하는 기준을 만듭니다.' },
          ].map((item, idx) => (
            <div
              key={item.title}
              className={`flex flex-col gap-2 px-0 md:px-5 ${idx > 0 ? 'md:border-l md:border-border/60' : ''}`}
            >
              <span className="text-[12px] text-steel font-black uppercase tracking-wider">Step {idx + 1}</span>
              <h3 className="text-[15px] font-bold text-navy mt-1">{item.title}</h3>
              <p className="text-[12px] text-gray leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA 섹션 — 스틸블루 단색 밴드(상단 컬러와 통일), 크기 축소 */}
      <section className="bg-steel text-white px-4 py-3 md:py-4 rounded-custom shadow-custom-lg text-center flex flex-col items-center gap-1.5 border border-white/10">
        <h2 className="text-[17px] sm:text-xl md:text-2xl font-black tracking-tight max-w-xl text-white font-sans whitespace-nowrap">
          공사를 시작하기 전, 먼저 검토하십시오.
        </h2>

        <p className="text-[12px] sm:text-[13.5px] text-white/80 max-w-md leading-relaxed font-semibold">
          불명확한 공사 범위와 잦은 현장 설계 변경 리스크를 ZEROS만의 1차 엔지니어링 검토로 원천 차단하십시오.
        </p>

        <button
          onClick={() => setActiveTabAtTop('request')}
          className="mt-0.5 bg-accent hover:bg-accent/90 text-white px-6 py-2.5 rounded-custom text-[14px] sm:text-[15px] font-black tracking-wider shadow-lg shadow-accent/25 hover:scale-[1.01] active:scale-95 transition-all duration-150 cursor-pointer"
        >
          무료 출장 견적 컨설팅 신청
        </button>
      </section>
    </div>
    );
  };

  // ==========================================
  // 2. 관리자 백오피스 탭 렌더러
  // ==========================================
  const renderAdminView = () => {
    switch (adminView) {
      case 'estimates':
        return (
          <div className="flex flex-col gap-4">
            {adminSubView === 'table' ? (
              <EstimateList
                estimates={estimates}
                onRefresh={handleRefresh}
                onSelectEstimate={(id) => setSelectedEstimateId(id)}
                onToggleView={(v) => setAdminSubView(v)}
                currentSubView={adminSubView}
              />
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between bg-bg border border-border p-4 rounded-custom shadow-sm select-none">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] text-steel font-bold uppercase">영업 파이프라인 관제</span>
                    <span className="text-[15px] font-black text-navy">드래그 앤 드롭 영업 칸반 보드</span>
                  </div>
                  <button
                    onClick={() => setAdminSubView('table')}
                    className="flex items-center gap-1.5 border border-border rounded-custom bg-bg px-3 py-1.5 text-[12px] text-navy hover:bg-bg-subtle"
                  >
                    리스트 테이블로 전환
                  </button>
                </div>
                <KanbanBoard
                  estimates={estimates}
                  onStatusChange={handleStatusChange}
                  onSelectCard={(id) => setSelectedEstimateId(id)}
                />
              </div>
            )}
          </div>
        );
      case 'visits':
        return <VisitList />;
      case 'customers':
        return <CustomerList />;
      case 'performance':
        return <PerformanceDashboard />;
      case 'notifications':
        return <NotificationLog />;
      case 'dashboard':
      default:
        return <AdminDashboard onNavigateToView={(view) => setAdminView(view)} />;
    }
  };

  const renderContent = () => {
    if (!isUserMode) {
      return renderAdminView();
    }

    switch (activeTab) {
      case 'about':
        return renderAboutTab();
      case 'sop':
        return renderSopTab();
      case 'performance':
        return renderPerformanceTab();
      case 'request':
        return renderRequestTab();
      case 'home':
      default:
        if (selectedMenu && !selectedBudget) {
          return renderManualDetail(selectedMenu);
        }
        if (selectedBudget && !selectedMenu) {
          return renderManualDetail(selectedBudget);
        }
        return renderLandingDashboard();
    }
  };

  return (
    <AppShell>
      {renderContent()}

      {/* 정밀 제어 상세 모달 렌더러 (관리자 모드에서 상세 진입 시) */}
      {selectedEstimateId && (
        <EstimateDetailModal
          estimateId={selectedEstimateId}
          onClose={() => setSelectedEstimateId(null)}
          onSaved={handleRefresh}
        />
      )}
    </AppShell>
  );
}
