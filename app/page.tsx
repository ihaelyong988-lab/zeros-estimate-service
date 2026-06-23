'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from "@/components/layout/AppShell";
import { useShell } from "@/lib/context/ShellContext";
import { RequestWizard, prefetchOtpEnabled } from "@/components/forms/RequestWizard";
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
import { CustomerLoginModal } from "@/components/forms/CustomerLoginModal";
import { MyRequestsModal } from "@/components/MyRequestsModal";

import {
  BookOpen,
  FileCheck,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Truck,
  LineChart,
  Award,
  ChevronDown,
  Clock,
  TrendingDown,
  BarChart3,
  Scale,
  Cpu,
  FileText,
  Search,
  MessageCircle,
  Database,
  Send,
  RefreshCw,
  AlertTriangle
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

// 공종별 시그니처 색(hex) — 견적 검토 히어로(renderReviewDesktop)에서 공종마다 테마색을 입혀
// 상단 칩바(LANDING_CHIP_CLASS)와 시선을 묶고, 회전하는 공종을 시각적으로 차별화한다.
const LANDING_SIGNATURE_HEX: Record<string, string> = {
  '배관공사': '#0891B2',          // cyan-600
  '장비설치': '#D97706',          // amber-600
  'Utility 배관': '#0284C7',      // sky-600
  '공장증설': '#D2691E',          // accent 계열
  '노후배관교체': '#059669',      // emerald-600
  '기계실개선': '#0D9488',        // teal-600
  '생산설비 배관 연결': '#4F46E5', // indigo-600
  'CAPEX 개·증설 검토': '#16365F', // navy
};

// 공종별 주요 견적 키워드 — 공종 상세(renderManualDetail)와 견적 검토 히어로(renderReviewDesktop) 공용. 추후 영업 표현으로 교체.
const TRADE_KEYWORDS: Record<string, string[]> = {
  '배관공사': ['HVAC', '위생배관', 'Duct', '소방기계배관'],
  '장비설치': ['펌프', '탱크', '콤프레셔', '열교환기'],
  'Utility 배관': ['스팀', '냉각수', '압축공기', '질소'],
  '공장증설': ['라인증설', 'Tie-in', '무중단분기', '유량검토'],
  '노후배관교체': ['부식배관', '철거·신설', '무중단교체', '잔존수명'],
  '기계실개선': ['기계실', '헤더', '펌프배열', '동선개선'],
  '생산설비 배관 연결': ['Hook-up', '설비연결', '유틸리티 탭', '정밀정렬'],
  'CAPEX 개·증설 검토': ['CAPEX', '예산상한', '공법검토', 'LCC'],
  'spool': ['ISO도면', '스풀분할', '사전제작', 'Prefab'],
  'skid': ['SKID', '패키지모듈', 'P&ID', '모듈화'],
  'structure': ['가대', '플랫폼', '철구조', '하중검토'],
};

// 공종별 대표 견적 밴드(원) — 모바일 랜딩 2↔3페이지 연동용. min/max=슬라이더 범위, median=중앙값, base=기본 표시값
const MOBILE_TRADE_ESTIMATES: Record<string, { min: number; max: number; median: number; base: number }> = {
  '배관공사': { min: 8_000_000, max: 40_000_000, median: 22_000_000, base: 21_000_000 },
  '장비설치': { min: 15_000_000, max: 80_000_000, median: 42_000_000, base: 38_000_000 },
  'Utility 배관': { min: 10_000_000, max: 55_000_000, median: 30_000_000, base: 28_000_000 },
  '공장증설': { min: 12_000_000, max: 45_000_000, median: 28_000_000, base: 26_850_000 },
  '노후배관교체': { min: 6_000_000, max: 35_000_000, median: 18_000_000, base: 17_000_000 },
  '기계실개선': { min: 9_000_000, max: 50_000_000, median: 26_000_000, base: 24_000_000 },
  '생산설비 배관 연결': { min: 20_000_000, max: 120_000_000, median: 60_000_000, base: 55_000_000 },
  'CAPEX 개·증설 검토': { min: 50_000_000, max: 480_000_000, median: 220_000_000, base: 180_000_000 },
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
    setSelectedMenu,
    setSelectedBudget,
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
  const [activeDiagNode, setActiveDiagNode] = useState(0);
  // 모바일 랜딩 — 2페이지 공종 캐러셀 선택 인덱스(3페이지 견적과 연동)
  const [mobileTradeIdx, setMobileTradeIdx] = useState(0);
  // 모바일 랜딩 실시간 견적 슬라이더 — 핸들을 끌면 예상 견적·수수료·중앙값 대비가 연동되어 변동
  const [mobileEstimateAmount, setMobileEstimateAmount] = useState(MOBILE_TRADE_ESTIMATES[LANDING_TRADES[0]].base);
  const mobileCarouselRef = useRef<HTMLDivElement>(null);
  const mobileChipsRef = useRef<HTMLDivElement>(null);

  // 공종 변경 시: 활성 칩을 보이도록 스크롤
  useEffect(() => {
    mobileChipsRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [mobileTradeIdx]);

  // 캐러셀 가로 스크롤(스와이프) → 현재 공종 인덱스 동기화
  const handleMobileCarouselScroll = () => {
    const el = mobileCarouselRef.current;
    if (!el) return;
    const i = Math.min(LANDING_TRADES.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth)));
    setMobileTradeIdx(i);
    setMobileEstimateAmount(MOBILE_TRADE_ESTIMATES[LANDING_TRADES[i]].base);
  };

  // 공종 칩 탭 → 캐러셀을 해당 카드로 이동
  const selectMobileTrade = (i: number) => {
    setMobileTradeIdx(i);
    setMobileEstimateAmount(MOBILE_TRADE_ESTIMATES[LANDING_TRADES[i]].base);
    const el = mobileCarouselRef.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  // 신청 탭 진입 전에 OTP 설정 여부를 미리 받아둔다 — "무료 견적 신청하기" 클릭 시 폼이 즉시 뜨도록
  useEffect(() => {
    prefetchOtpEnabled();
  }, []);

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
    let active = true;
    const load = async () => {
      try {
        const list = await ZerosService.getEstimates();
        if (active) setEstimates(list);
      } catch (e) {
        if (active) console.error('Failed to load estimates in page root', e);
      }
    };
    load();
    return () => { active = false; };
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

  // 모바일 홈/로고 탭 클릭 등으로 첫 랜딩 상태 복귀 시, 내부 서브 캐러셀과 슬라이더 상태도 첫 화면(0)으로 초기화
  useEffect(() => {
    const isMobileLanding = activeTab === 'home' && !selectedMenu && !selectedBudget;
    if (isMobileLanding) {
      setMobileTradeIdx(0);
      setMobileEstimateAmount(MOBILE_TRADE_ESTIMATES[LANDING_TRADES[0]].base);
      
      const el = mobileCarouselRef.current;
      if (el) {
        el.scrollTo({ left: 0, behavior: 'auto' });
      }
    }
  }, [activeTab, selectedMenu, selectedBudget]);

  const setActiveTabAtTop = (tab: Parameters<typeof setActiveTab>[0]) => {
    setActiveTab(tab);
    scrollMainPanelToTop();
  };

  // ==========================================
  // 1. 고객 모드 탭 렌더러
  // ==========================================
  const renderBusinessTab = () => {
    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto py-3 select-none">
        {/* 1. 컴팩트 히어로 */}
        <section className="flex flex-col gap-3">
          <h1 className="text-[clamp(24px,2.8vw,34px)] font-black text-navy leading-[1.24] tracking-tight">
            <span className="text-accent">BIZ모델_</span> 최적합 예산, <span className="text-accent">최소 범주대역</span>으로 책정해 드립니다
          </h1>
          <p className="text-[14px] text-gray font-semibold">
            소상공인 대표님의 들쑥날쑥한 견적과 설계변경 분쟁을 데이터로 사전에 차단합니다.
          </p>
        </section>

        {/* 2. 결과 지표 — 안심 예산 대역 (히어로 지표) */}
        <section className="bg-bg-subtle rounded-custom p-6 md:p-8">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-1 h-4 bg-accent rounded-full shrink-0" />
            <span className="text-[17px] font-black text-navy tracking-tight">안심 예산 대역</span>
          </div>
          <p className="text-[13px] text-gray font-semibold mb-5">과다·과소 없이 <span className="text-accent font-black">최소 범주대역(±5%)</span>으로 예산을 책정합니다.</p>
          <div className="h-4 rounded-full bg-surface border border-[#E2E8F0] relative overflow-hidden">
            <div className="absolute top-0 bottom-0 left-[45%] w-[10%] bg-steel rounded-full" />
          </div>
          <div className="flex justify-between items-center text-[11.5px] font-bold mt-2.5">
            <span className="text-gray-light">min</span>
            <span className="text-steel">최적 대역 ±5%</span>
            <span className="text-gray-light">max</span>
          </div>
        </section>

        {/* 3. 핵심 지표 — 헤어라인 분리 */}
        <section className="flex flex-col">
          <div className="flex items-baseline justify-between py-3 border-b border-border/50">
            <span className="text-[14.5px] font-black text-navy">단가 거품 필터링</span>
            <span className="text-[12px] text-gray font-semibold">실거래 DB 교차검증</span>
          </div>
          <div className="flex items-baseline justify-between py-3 border-b border-border/50">
            <span className="text-[14.5px] font-black text-success">30년 현장 암묵지</span>
            <span className="text-[12px] text-gray font-semibold">플랜트 현장 엔지니어링</span>
          </div>
          <div className="flex items-baseline justify-between py-3">
            <span className="text-[14.5px] font-black text-navy">설계변경 분쟁 차단</span>
            <span className="text-[12px] text-gray font-semibold">동일 기준 견적 정합</span>
          </div>
        </section>

        {/* 4. 사전 차단 리스크 — 키워드 칩 */}
        <section className="border-t border-border pt-5 flex flex-col gap-2.5">
          <span className="text-[10.5px] font-semibold text-gray-light uppercase tracking-[0.1em]">사전 차단 리스크</span>
          <div className="flex flex-wrap gap-2">
            <span className="text-[12px] font-bold text-gray bg-bg-subtle px-3 py-1.5 rounded">견적 들쑥날쑥</span>
            <span className="text-[12px] font-bold text-gray bg-bg-subtle px-3 py-1.5 rounded">단가 거품</span>
            <span className="text-[12px] font-bold text-gray bg-bg-subtle px-3 py-1.5 rounded">설계변경 분쟁</span>
          </div>
        </section>

        {/* 4. FOOTER 소개란 — 사업소개 탭 하단 회사 소개 (헤어라인·단정표현 없이) */}
        <footer className="mt-6 border-t-2 border-navy pt-5">
          <div className="flex justify-between gap-6 flex-wrap">
            <div className="max-w-[440px]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[20px] font-black text-navy tracking-tight">ZEROS</span>
                <span className="text-[11px] font-bold text-accent tracking-wider">최적합 견적 검증</span>
              </div>
              <p className="text-[13.5px] leading-[1.75] font-semibold text-gray m-0">
                현장 실무 경험과 데이터 분석으로 <strong className="text-navy font-black">과다·과소 없는 최적합 예산</strong>을 산출·검증하는 서비스입니다. 시공이 아닌, 대표님의 의사결정을 돕는 견적 파트너입니다.
              </p>
            </div>
            <div className="min-w-[180px]">
              <div className="text-[10.5px] font-semibold text-gray-light uppercase tracking-[0.1em] mb-2.5">핵심 영역</div>
              <div className="text-[13px] font-semibold text-navy leading-[2]">
                공정설비 CAPEX 견적 검증<br />
                배관·기계설비 물량 분석<br />
                외주제작(SPOOL·SKID) 검토
              </div>
            </div>
          </div>
          <div className="border-t border-border/60 mt-5 pt-3.5 flex justify-between items-center gap-4 flex-wrap">
            <span className="text-[12px] font-medium text-gray-light">© 2025 ZEROS Co., Ltd. · 사업자등록번호 준비중</span>
            <div className="flex items-center gap-4 text-[12.5px] font-bold">
              <span className="text-gray hover:text-navy transition-colors cursor-pointer">개인정보처리방침</span>
              <span className="text-gray-light/40">|</span>
              <button
                onClick={() => setActiveTabAtTop('request')}
                style={{ touchAction: 'manipulation' }}
                className="inline-flex items-center gap-1 text-steel hover:text-navy transition-colors cursor-pointer"
              >
                문의하기 <ArrowRight className="w-3 h-3 shrink-0" />
              </button>
            </div>
          </div>
        </footer>
      </div>
    );
  };

  // AI Native 검증 — 데이터 사이언스 표준 작업 절차(SOP)
  const renderSopTab = () => {
    const pipeline = [
      {
        no: '01',
        phase: 'Data Ingestion',
        title: '고객 요청사항 수렴 및 정합',
        desc: '대표님들이 보내주신 예상 예산, 세부 희망 일정, 특이 공사 요건 등 비정형 요청 사항을 꼼꼼하게 정합하여 검토 출발점을 잡습니다.',
        output: '고객 요구사항 정의',
      },
      {
        no: '02',
        phase: 'Material Analysis',
        title: '제공자료 정밀 분석 · 파싱',
        desc: '업로드해주신 설계 도면(DWG/PDF), 현물 사진, 기존 제원서 등의 원천 제공자료를 고해상도 OCR 및 제원 파서 엔진으로 파싱하여 자재 규격과 물량을 추출합니다.',
        output: '정규화 제공자료 데이터',
      },
      {
        no: '03',
        phase: 'Exploratory Analysis',
        title: '이상치 실시간 탐지(EDA)',
        desc: '분석된 자재 규격과 단가를 표준 품셈 및 1군 건설사 거래처 실거래 빅데이터 DB와 실시간 비교 대조하여 비정상적인 고단가 단가 거품을 사전에 감지하고 필터링합니다.',
        output: '이상치 검토 리포트',
      },
      {
        no: '04',
        phase: 'AI Inference',
        title: 'AI Native 예산 밴드 추론',
        desc: 'ZEROS 배관 공사비 회귀 예측 추론 모델을 가동하여 공사 범위와 기계실 환경 조건에 최적화된 과학적 예산 대역(Budget Band)을 산출합니다.',
        output: 'AI 예측 예산 범위',
      },
      {
        no: '05',
        phase: 'PM Cross Validation',
        title: '전문 PM 교차 검증 (진심을 담은 분석)',
        desc: '현장 실무 경력 30년 이상의 베테랑 엔지니어 PM이 AI가 미처 식별하지 못한 현장의 장비 반입 장애물, 고소 가동중단 조건, 흙막이 가설 공정 등의 요소를 교차하여 정교하게 보정합니다.',
        output: '설계 타당성 보정 완료',
      },
      {
        no: '06',
        phase: 'Result Sheet Output',
        title: '최종 안심 검토서 발행',
        desc: '분석과 검증이 모두 끝난 최종 정량 지표(안심 예산 밴드, 리스크 등급, 필수 자재 요건)를 투명하게 담아 소상공인 대표님이 안심할 수 있는 고해상도 결과 보고서를 자동 발행합니다.',
        output: '검토 시트(Scope Sheet)',
      },
    ];

    // 실제 처리 로그 스냅샷 — 6단계 파이프라인 중 산출 근거가 남는 4개 에이전트 단계.
    // 타임라인 노드와 1:1로 묶지 않고 독립 탭 뷰어로 운용한다(인덱스 mismatch 방지).
    const logSnapshots = [
      {
        agent: 'zeros_drawing_parser_v1.4', stage: 'Material Analysis', label: '자료 파싱',
        dot: 'bg-steel', text: 'text-steel',
        log: `{
  "agent": "zeros_drawing_parser_v1.4",
  "status": "COMPLETED",
  "pipeline_stage": "DATA_INGESTION",
  "parsed_file": "2026_Yongin_SectorB_Drawing.pdf",
  "extraction_summary": {
    "target_materials": ["SUS304", "Carbon Steel"],
    "total_nodes_extracted": 28,
    "valve_entities_found": 8,
    "nominal_diameters": ["50A", "100A"]
  },
  "schema_integrity": {
    "null_fields": 0,
    "format_compliance": true
  }
}`,
      },
      {
        agent: 'zeros_anomaly_detector_v2.0', stage: 'Exploratory Analysis', label: '이상치 탐지',
        dot: 'bg-accent', text: 'text-accent',
        log: `{
  "agent": "zeros_anomaly_detector_v2.0",
  "status": "WARNING",
  "pipeline_stage": "DATA_CLEANSING",
  "anomaly_alert": {
    "item_code": "M-SUS-100 (SUS304 Elbow 100A)",
    "quoted_unit_price": 85000,
    "market_mean_price": 38500,
    "z_score": 3.12
  },
  "cleansing_action": {
    "price_corrected_to": 38500,
    "risk_index_assigned": "MEDIUM_HIGH",
    "notes": "청구 단가가 시장 표준가를 2.2배 초과함."
  }
}`,
      },
      {
        agent: 'zeros_pm_cross_validator_v3', stage: 'PM Cross Validation', label: 'PM 교차검증',
        dot: 'bg-steel', text: 'text-steel',
        log: `{
  "agent": "zeros_pm_cross_validator_v3",
  "status": "APPROVED",
  "pipeline_stage": "PM_VERIFICATION",
  "ai_inferred_budget": 19500000,
  "pm_validation_comments": {
    "issue": "도면 확인 시 굴착 깊이 1.5m 초과 구간 식별됨.",
    "omission": "토공사 흙막이 가시설 설치 품셈 누락.",
    "adjustment": "+1,700,000 KRW 반영 필요"
  },
  "final_corrected_budget": 21200000,
  "accuracy_confidence": "98.2%"
}`,
      },
      {
        agent: 'zeros_decision_engine_v1.0', stage: 'Result Sheet Output', label: '최종 판정',
        dot: 'bg-success', text: 'text-success',
        log: `{
  "agent": "zeros_decision_engine_v1.0",
  "status": "COMPLETED",
  "pipeline_stage": "DECISION_OUTPUT",
  "output_document_id": "SS-2026-YONGIN-001",
  "verdict_summary": {
    "scope_fix_status": "SPEC_FIXED",
    "optimal_budget_band": "18,000,000 ~ 22,000,000 KRW",
    "risk_grade": "LOW",
    "next_recommended_action": "ONLINE_CONTRACT_CONFIRMATION"
  }
}`,
      },
    ];
    const activeLog = logSnapshots[activeDiagNode] || logSnapshots[0];

    return (
      <div className="flex flex-col gap-4 max-w-5xl mx-auto py-3 select-none">
        <section className="flex flex-col gap-5.5">
          {/* 헤더 — 좌측 타이틀 + 우측 신뢰 지표를 한 행으로 합쳐 수직 공간 압축 */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4.5 border-b border-border pb-4">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl.5 md:text-2xl font-black text-navy tracking-tight">AI Native 검증 표준 작업 절차</h2>
              <p className="text-[13px] text-gray leading-snug font-semibold">
                <strong className="text-navy font-extrabold">데이터 탐색부터 결과 도출까지</strong> — 6단계 재현 가능한 파이프라인으로 공사 범위·비용·리스크를 정량 검증합니다.
              </p>
            </div>
            {/* 신뢰 지표 — 대시보드 위젯 스타일 */}
            <div className="grid grid-cols-2 lg:flex lg:items-center shrink-0 select-none">
              {[
                { label: '파이프라인', value: '6-Stage' },
                { label: '실거래 대조', value: 'n건 DB' },
                { label: '근거 추적', value: '100%' },
                { label: '결과물', value: 'Scope Sheet' },
              ].map((metric, i) => (
                <div
                  key={metric.label}
                  className={`px-4 py-2 flex flex-col border-border ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${i > 0 ? 'lg:border-l' : ''}`}
                >
                  <span className="text-[10px] text-gray-light font-bold whitespace-nowrap">{metric.label}</span>
                  <span className="text-[13px] text-navy font-black tracking-tight tabular-nums whitespace-nowrap flex items-center gap-1">
                    {metric.value}
                    <span className="w-1 h-1 rounded-full bg-success animate-pulse shrink-0" />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 6단계 파이프라인 — 세련된 수직 타임라인 플로우 */}
          <div className="flex flex-col gap-3.5">
            <span className="text-[12px] font-black text-navy uppercase tracking-wide">AI Native 데이터 검증 파이프라인 (6단계 SOP)</span>
            
            <div className="relative pl-6 md:pl-8 flex flex-col gap-5">
              {/* 타임라인 수직 연결선 */}
              <div className="absolute top-3 bottom-3 left-[11px] md:left-[15px] w-0.5 bg-gradient-to-b from-steel via-accent to-success pointer-events-none" />
              
              {pipeline.map((stage, idx) => {
                const dsRole = [
                  "컴퓨터 비전(CV) 및 데이터 규격 정형화 데이터사이언티스트",
                  "데이터 탐색 및 수리/통계 정제 전문가",
                  "배관 설계 규격 및 자재 코드 피처 매핑 DS",
                  "딥러닝 예측 모델링 및 건설사 실거래가 추론 모델러",
                  "Human-in-the-Loop 검증 및 실무 도메인 교차 분석 PM",
                  "의사결정 엔지니어링 및 최종 보고서 발행 전문가"
                ][idx];
                
                const aiTool = [
                  "OpenCV, PaddleOCR, ZEROS 맞춤형 DWG/PDF 파서",
                  "SciPy 통계 분석 모듈, Pandas 데이터 클렌징 알고리즘",
                  "ASME/KS 자재 코드 매핑 DB, 단가 할증률 매핑 모듈",
                  "PyTorch 가중 회귀 신경망 모델, 1군 건설사 실거래 매칭 시스템",
                  "ZEROS Domain Expert-in-the-Loop 피드백 프레임워크",
                  "Decision Matrix Generator, Scope Sheet 자동 렌더링 엔진"
                ][idx];

                // 노드 포인트 색상 결정
                const circleColor = idx < 2 ? 'bg-steel ring-steel/20' : idx < 4 ? 'bg-accent ring-accent/20' : 'bg-success ring-success/20';

                return (
                  <div key={stage.no} className="relative flex flex-col gap-2 group transition-all duration-200">
                    {/* 타임라인 노드 마커 */}
                    <div className={`absolute -left-[18px] md:-left-[22px] top-1.5 w-3 h-3 rounded-full ${circleColor} ring-4 transition-transform duration-200 group-hover:scale-125 z-10`} />
                    
                    {/* 카드 본체 — 박스 제거, 타임라인 위 콘텐츠 정렬 */}
                    <div className="flex flex-col md:flex-row md:items-start gap-4 pb-1">

                      {/* 단계 번호 및 기본 타이틀 영역 */}
                      <div className="md:w-1/4 shrink-0 flex items-center md:items-start gap-3">
                        <span className="w-8 h-8 rounded-custom bg-navy/5 text-navy flex items-center justify-center text-[13px] font-black shrink-0 font-mono border border-navy/10">
                          {stage.no}
                        </span>
                        <div className="flex flex-col leading-tight">
                          <span className="text-[10px] text-steel font-black uppercase tracking-wider font-mono">{stage.phase}</span>
                          <span className="text-[14px] font-black text-navy mt-0.5">{stage.title}</span>
                        </div>
                      </div>
                      
                      {/* 설명 및 구체적 방법론 */}
                      <div className="flex-1 flex flex-col gap-2.5">
                        <p className="text-[12.5px] text-gray leading-relaxed font-semibold">
                          {stage.desc}
                        </p>
                        
                        {/* 역량 및 도구 메타 정보 — 박스 제거 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-semibold text-gray-light leading-snug">
                          <div className="flex items-start gap-1.5">
                            <span className="text-[9px] px-1 py-0.5 bg-navy/5 text-navy rounded font-black shrink-0">DS 역량</span>
                            <span className="text-gray">{dsRole}</span>
                          </div>
                          <div className="flex items-start gap-1.5">
                            <span className="text-[9px] px-1 py-0.5 bg-accent/10 text-accent rounded font-black shrink-0">활용 엔진</span>
                            <span className="text-gray">{aiTool}</span>
                          </div>
                        </div>
                      </div>

                      {/* 주요 산출물 배지 */}
                      <div className="md:w-1/5 shrink-0 md:self-stretch flex items-end md:justify-end">
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-success/5 border border-success/15 rounded text-[11.5px] font-bold text-success w-full md:w-auto justify-center md:justify-start">
                          <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                          <span className="truncate">{stage.output}</span>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 실제 처리 로그 스냅샷 — 단계별 산출 근거(에이전트 출력)를 그대로 공개 */}
          <div className="flex flex-col gap-3 border-t border-border pt-5">
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-black text-navy uppercase tracking-wide">실제 데이터 및 처리 로그 스냅샷</span>
              <span className="text-[11px] text-gray font-semibold">근거를 남기는 파이프라인 — 각 단계 에이전트의 실제 출력입니다.</span>
            </div>
            {/* 4탭 셀렉터 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 border-b border-border">
              {logSnapshots.map((snap, idx) => {
                const isActive = activeDiagNode === idx;
                return (
                  <button
                    key={snap.agent}
                    onClick={() => setActiveDiagNode(idx)}
                    className={`flex items-center gap-2 px-3 py-2.5 -mb-px border-b-[2.5px] transition-all duration-200 cursor-pointer text-left ${
                      isActive ? 'border-accent opacity-100' : 'border-transparent opacity-55 hover:opacity-100'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${snap.dot} shrink-0`} />
                    <div className="flex flex-col leading-none gap-0.5 min-w-0">
                      <span className={`text-[8.5px] font-mono font-bold uppercase tracking-wider ${isActive ? snap.text : 'text-gray-light'}`}>
                        {snap.stage}
                      </span>
                      <span className={`text-[12.5px] font-black tracking-tight ${isActive ? snap.text : 'text-navy/80'} truncate`}>
                        {snap.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            {/* 다크 콘솔 패널 — 의도된 터미널 메타포 */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-gray font-bold tracking-wide flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
                {activeLog.agent}
              </span>
              <div className="bg-slate-900 border border-slate-800 rounded-custom p-4 font-mono text-[10px] text-slate-300 overflow-x-auto shadow-inner leading-normal select-text">
                <pre className="m-0 text-slate-300"><code>{activeLog.log}</code></pre>
              </div>
            </div>
          </div>

          {/* ZEROS AI Native 검토 원칙 리뉴얼 */}
          <div className="flex flex-col gap-3">
            <span className="text-[12px] font-black text-navy uppercase tracking-wide">ZEROS AI Native 검토 원칙</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {[
                {
                  icon: <Scale className="w-5 h-5 text-steel" />,
                  title: '같은 자료, 같은 결론',
                  desc: '누가 검토하더라도 동일한 수리 통계 및 표준 품셈 기준으로 신뢰할 수 있는 일관된 결론을 산출합니다.',
                  color: 'border-t-4 border-t-steel'
                },
                {
                  icon: <Cpu className="w-5 h-5 text-accent" />,
                  title: '근거를 남깁니다',
                  desc: '실거래 DB 대조 데이터와 산출물 수리 모델의 모든 계산 로직을 투명하게 스케줄 시트에 기록합니다.',
                  color: 'border-t-4 border-t-accent'
                },
                {
                  icon: <ShieldCheck className="w-5 h-5 text-success" />,
                  title: '보수적으로 봅니다',
                  desc: '품셈 오차 및 이상 단가 감지 영역 등 불확실성 구간은 예산 편향 리스크를 고려하여 안전하게 반영합니다.',
                  color: 'border-t-4 border-t-success'
                }
              ].map((p) => (
                <div key={p.title} className={`${p.color} pt-3.5 flex flex-col gap-2`}>
                  <div className="flex items-center gap-2">
                    {p.icon}
                    <h4 className="text-[13.5px] font-black text-navy">{p.title}</h4>
                  </div>
                  <p className="text-[12px] text-gray leading-relaxed font-semibold">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 최종 산출물 — Scope Sheet 미니 요약(검증의 결과물을 한 장으로) */}
          <div className="flex flex-col border-t border-border pt-5">
            <span className="text-[11px] text-steel font-black uppercase tracking-wider">Final Deliverable · Scope Sheet</span>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mt-3">
              <div className="flex-1 min-w-[200px]">
                <h3 className="text-[14px] font-black text-navy tracking-tight leading-snug">
                  모든 분석 검증의 최종 결과물은 단 한 장의 검토 시트로 정돈됩니다.
                </h3>
              </div>
              <div className="flex-[1.3] min-w-[280px] grid grid-cols-2 sm:grid-cols-4">
                {[
                  { l: 'Scope Spec', v: '범위 고정', c: 'text-navy' },
                  { l: 'Budget Band', v: '₩18M~₩22M', c: 'text-navy' },
                  { l: 'Risk Grade', v: 'LOW 등급', c: 'text-navy' },
                  { l: 'Next Action', v: '온라인검토', c: 'text-accent' },
                ].map((m, i) => (
                  <div key={m.l} className={`flex flex-col gap-0.5 text-center px-2 ${i > 0 ? 'border-l border-border/60' : ''}`}>
                    <span className="text-[8px] text-gray-light uppercase font-mono">{m.l}</span>
                    <span className={`text-[12px] font-black truncate ${m.c}`}>{m.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA — 프리미엄 네이비/블루 그라데이션 및 통일된 신청 버튼 */}
          <div className="bg-gradient-to-r from-[#1A365D] to-[#2E5E8A] text-bg rounded-custom p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[11px] text-bg/75 font-black uppercase tracking-wider font-mono">Ready to verify</span>
              <span className="text-[14.5px] font-black tracking-tight">도면과 제원서를 제출하시면 AI 검증 절차가 즉시 시작됩니다.</span>
            </div>
            <div className="w-full sm:w-64 shrink-0 flex flex-col justify-center">
              <button
                onClick={() => setActiveTabAtTop('request')}
                className="w-full bg-transparent hover:bg-white/10 border border-white/20 text-white px-4 py-2.5 rounded-custom text-[14.5px] font-bold transition-all active:scale-95 whitespace-nowrap cursor-pointer text-center"
              >
                무료 견적 검토 의뢰하기
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  };

  // 서비스 프로세스(고객 여정) — "서비스 프로세스 보기" 전용 화면.
  // 데이터 사이언스 파이프라인 언어로 9단계를 정립하되, 각 단계마다
  // '고객이 하는 일 / ZEROS가 하는 일'과 '고객 궁금증 해소' Q&A를 함께 보여 신뢰를 만든다.
  const renderServiceProcessTab = () => {
    // 3개 국면(Phase)으로 묶은 고객 여정 9단계
    const phases = [
      {
        key: 'P1',
        label: '접수 & 요건 정의',
        en: 'Intake & Scoping',
        tone: 'steel' as const,
      },
      {
        key: 'P2',
        label: '데이터 모델링 & AI 검증',
        en: 'Modeling & Verification',
        tone: 'accent' as const,
      },
      {
        key: 'P3',
        label: '시뮬레이션 & 결과 전달',
        en: 'Simulation & Delivery',
        tone: 'success' as const,
      },
    ];

    const steps = [
      {
        no: '01', phaseIdx: 0, en: 'Request Intake', title: '견적 요청 접수',
        actor: '고객', icon: FileText,
        desc: '무료 출장 견적 신청과 함께 보유하신 도면(DWG/PDF)·현장 사진·장비 제원서를 업로드합니다. 자료가 부족해도 괜찮습니다 — 부족한 부분은 현장 실사로 보완합니다.',
        output: '요청 티켓 발급',
        faq: 'Q. 제출 자료가 적어도 접수되나요?  →  사진 몇 장만으로도 시작합니다.',
      },
      {
        no: '02', phaseIdx: 0, en: 'Data Validation', title: '제출 자료 적합성 검토',
        actor: 'ZEROS', icon: Search,
        desc: '업로드된 원천 자료의 해상도·누락 항목·규격 정합성을 데이터 품질 기준으로 1차 점검합니다. "분석이 가능한 데이터인가"부터 투명하게 확인해 드립니다.',
        output: '자료 적합성 리포트',
        faq: 'Q. 제 자료로 분석이 되긴 하나요?  →  적합성 리포트로 가능 여부를 먼저 알려드립니다.',
      },
      {
        no: '03', phaseIdx: 0, en: 'Gap Resolution', title: '추가 정보 확인·문의',
        actor: '고객·ZEROS', icon: MessageCircle,
        desc: '누락되었거나 모호한 요건(유체 종류, 설계 압력, 시공 환경 등)을 담당 PM이 직접 여쭤 채웁니다. 임의 가정이 아닌 "확인"으로 오차의 뿌리를 제거합니다.',
        output: '요건 확정 체크리스트',
        faq: 'Q. 빠진 정보는 마음대로 가정하나요?  →  추측 없이 직접 확인하고 확정합니다.',
      },
      {
        no: '04', phaseIdx: 1, en: 'Model Setup', title: '분석 데이터 모형 확정',
        actor: 'ZEROS', icon: Database,
        desc: '공종·규모·기계실 환경 조건을 정량 변수(Feature)로 정형화하여, 귀사 공사에 꼭 맞는 견적 추론 모델의 입력 구조를 확정합니다.',
        output: '분석 데이터셋',
        faq: 'Q. 무슨 기준으로 금액을 계산하나요?  →  표준 품셈 + 실거래 변수로 모델을 구성합니다.',
      },
      {
        no: '05', phaseIdx: 1, en: 'AI Benchmarking', title: 'AI 실적 검증 & 단가 정제',
        actor: 'ZEROS', icon: Cpu,
        desc: '1군 건설사 실거래 DB와 표준 품셈을 교차 대조하고, 통계적 이상치 판별(Z-score)로 고단가 거품·허위 할증을 자동 필터링·정제합니다.',
        output: '정제 단가·물량',
        faq: 'Q. 부풀려진 단가는 어떻게 거르나요?  →  실거래 대비 이상치를 통계로 잡아냅니다.',
      },
      {
        no: '06', phaseIdx: 1, en: 'Result Lock-in', title: '검토 자료 확정',
        actor: '고객·ZEROS', icon: FileCheck,
        desc: '정제된 분석 입력값과 공사 범위를 고객 요청 사항과 최종 대조하여 확정합니다. 고객이 동의한 범위 위에서만 결과를 산출합니다.',
        output: '확정 Scope',
        faq: 'Q. 제가 요청한 범위와 다르면요?  →  확정 전 함께 검토해 일치시킵니다.',
      },
      {
        no: '07', phaseIdx: 2, en: 'Budget Simulation', title: '시뮬레이션 적합성 검토',
        actor: 'ZEROS', icon: BarChart3,
        desc: '확정 데이터로 시나리오별 예산 대역(Budget Band)과 리스크를 시뮬레이션하고, 30년 경력 PM이 현장 변수를 교차 검증해 정교하게 보정합니다.',
        output: '안심 예산 밴드 · 리스크 등급',
        faq: 'Q. 그 결과, 믿어도 되나요?  →  AI 산출 위에 전문가가 한 번 더 봅니다.',
      },
      {
        no: '08', phaseIdx: 2, en: 'Scope Sheet Delivery', title: '견적 검토 자료 제공',
        actor: 'ZEROS → 고객', icon: Send,
        desc: '계산 근거가 모두 추적되는 고해상도 검토서(Scope Sheet)로 안심 예산 밴드·필수 자재 요건·리스크 등급을 투명하게 전달합니다.',
        output: 'ZEROS 검토서',
        faq: 'Q. 숫자만 덜렁 받나요?  →  근거와 계산 로직까지 함께 드립니다.',
      },
      {
        no: '09', phaseIdx: 2, en: 'Feedback Loop', title: '고객 피드백 확인 & 개선',
        actor: '고객 → ZEROS', icon: RefreshCw,
        desc: '검토서에 대한 질문·조정 요청을 반영하고, 필요 시 변수를 갱신해 재검증 루프를 돌립니다. 대표님이 만족하실 때까지 함께 다듬습니다.',
        output: '최종 확정 · 사후 지원',
        faq: 'Q. 결과가 아쉬우면 끝인가요?  →  피드백을 반영해 다시 검증합니다.',
      },
    ];

    // 국면 톤(색) → Tailwind 클래스 매핑 (디자인 시스템 steel/accent/success 재사용)
    const toneClasses = {
      steel: { dot: 'bg-steel ring-steel/20', text: 'text-steel', soft: 'bg-steel/10 text-steel border-steel/20', bar: 'bg-steel' },
      accent: { dot: 'bg-accent ring-accent/20', text: 'text-accent', soft: 'bg-accent/10 text-accent border-accent/20', bar: 'bg-accent' },
      success: { dot: 'bg-success ring-success/20', text: 'text-success', soft: 'bg-success/10 text-success border-success/20', bar: 'bg-success' },
    };

    // 액터(주체) 칩 스타일 — 고객/ZEROS/공동 구분
    const actorClass = (actor: string) =>
      actor.includes('고객') && actor.includes('ZEROS')
        ? 'bg-navy/5 text-navy border-navy/15'
        : actor.startsWith('고객')
          ? 'bg-accent/10 text-accent border-accent/20'
          : 'bg-steel/10 text-steel border-steel/20';

    return (
      <div className="flex flex-col gap-4 max-w-4xl mx-auto py-3 select-none">
        <section className="flex flex-col gap-5.5">
          {/* 헤더 */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4.5 border-b border-border pb-4">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl.5 md:text-2xl font-black text-navy tracking-tight">ZEROS 서비스 프로세스 9단계</h2>
              <p className="text-[13px] text-gray leading-snug font-semibold max-w-2xl">
                <strong className="text-navy font-extrabold">요청 접수부터 피드백까지</strong> — 대표님이 무엇을 하고, ZEROS가 무엇을 검증하는지 한눈에. 각 단계의 궁금증을 미리 풀어 드립니다.
              </p>
            </div>
            {/* 국면 범례 — 박스 제거, 제목 폭 보호(축소·말줄임) */}
            <div className="grid grid-cols-3 min-w-0 lg:max-w-[420px] overflow-hidden select-none">
              {phases.map((p, i) => (
                <div key={p.key} className={`px-2.5 sm:px-3.5 py-2 flex flex-col gap-0.5 min-w-0 ${i > 0 ? 'border-l border-border' : ''}`}>
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${toneClasses[p.tone].bar} shrink-0`} />
                    <span className="text-[10px] text-gray-light font-bold truncate">
                      {p.key}<span className="hidden lg:inline"> · {p.en}</span>
                    </span>
                  </span>
                  <span className="text-[11px] sm:text-[12px] text-navy font-black tracking-tight leading-tight break-keep">{p.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 9단계 수직 타임라인 */}
          <div className="flex flex-col gap-3.5">
            <span className="text-[12px] font-black text-navy uppercase tracking-wide">고객 여정 타임라인 (9단계)</span>

            <div className="relative pl-6 md:pl-8 flex flex-col gap-3.5">
              {/* 타임라인 수직 연결선 */}
              <div className="absolute top-3 bottom-3 left-[11px] md:left-[15px] w-0.5 bg-gradient-to-b from-steel via-accent to-success pointer-events-none" />

              {steps.map((s, idx) => {
                const tone = toneClasses[phases[s.phaseIdx].tone];
                const isPhaseStart = idx === 0 || steps[idx - 1].phaseIdx !== s.phaseIdx;
                const Icon = s.icon;
                return (
                  <React.Fragment key={s.no}>
                    {/* 국면 머리표 — 그룹 시작 단계 앞에 삽입 */}
                    {isPhaseStart && (
                      <div className="relative flex items-center gap-2 -ml-6 md:-ml-8 mt-1 first:mt-0">
                        <span className={`text-[11px] font-black uppercase tracking-wider ${tone.text} font-mono`}>
                          {phases[s.phaseIdx].key} · {phases[s.phaseIdx].label}
                        </span>
                        <span className="flex-1 h-px bg-border/70" />
                      </div>
                    )}

                    <div className="relative flex flex-col gap-2 group transition-all duration-200">
                      {/* 타임라인 노드 마커 */}
                      <div className={`absolute -left-[18px] md:-left-[22px] top-2 w-3 h-3 rounded-full ${tone.dot} ring-4 transition-transform duration-200 group-hover:scale-125 z-10`} />

                      <div className="flex flex-col md:flex-row md:items-start gap-4 pb-1">

                        {/* 단계 번호 + 아이콘 + 타이틀 */}
                        <div className="md:w-[34%] shrink-0 flex items-center gap-3">
                          <span className="w-9 h-9 rounded-custom bg-navy/5 text-navy flex items-center justify-center shrink-0 border border-navy/10 relative">
                            <Icon className="w-4.5 h-4.5 text-steel" />
                            <span className="absolute -top-1.5 -right-1.5 text-[9px] font-black font-mono text-white bg-navy rounded-full w-4 h-4 flex items-center justify-center shadow-sm">{s.no}</span>
                          </span>
                          <div className="flex flex-col leading-tight min-w-0">
                            <span className="text-[10px] text-steel font-black uppercase tracking-wider font-mono truncate">{s.en}</span>
                            <span className="text-[14.5px] font-black text-navy mt-0.5">{s.title}</span>
                            {/* 액터(주체) 칩 */}
                            <span className={`mt-1.5 self-start text-[10px] font-black px-1.5 py-0.5 rounded border ${actorClass(s.actor)}`}>
                              {s.actor}
                            </span>
                          </div>
                        </div>

                        {/* 설명 + 궁금증 해소 */}
                        <div className="flex-1 flex flex-col gap-2.5 min-w-0">
                          <p className="text-[12.5px] text-gray leading-relaxed font-semibold">{s.desc}</p>
                          <div className="flex items-start gap-1.5 border-l-2 border-accent/40 pl-2.5 text-[11.5px] font-bold text-navy/80 leading-snug">
                            <MessageCircle className="w-3.5 h-3.5 text-accent shrink-0 mt-px" />
                            <span>{s.faq}</span>
                          </div>
                        </div>

                        {/* 산출물 배지 */}
                        <div className="md:w-[22%] shrink-0 md:self-stretch flex items-end md:justify-end">
                          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11.5px] font-bold w-full md:w-auto justify-center md:justify-start border ${tone.soft}`}>
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{s.output}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-[#1A365D] to-[#2E5E8A] text-bg rounded-custom p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[11px] text-bg/75 font-black uppercase tracking-wider font-mono">9 steps · transparent</span>
              <span className="text-[14.5px] font-black tracking-tight">접수부터 피드백까지, 모든 과정을 투명하게 함께합니다.</span>
            </div>
            <div className="w-full sm:w-64 shrink-0 flex flex-col justify-center">
              <button
                onClick={() => setActiveTabAtTop('request')}
                className="w-full bg-[#FF6A00] hover:brightness-110 text-white px-4 py-2.5 rounded-custom text-[14.5px] font-black transition-all active:scale-95 whitespace-nowrap cursor-pointer text-center"
              >
                무료 출장 견적 신청하기
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
    const metrics = getDynamicMetrics(key);
    // 공종별 주요 견적 키워드 — 모듈 공용 맵(TRADE_KEYWORDS) 참조
    const keywords = TRADE_KEYWORDS[key] || [];
    const tradeReviewItems: Record<string, string[]> = {
      '배관공사': ['관경 · 압력강하 검토 여부', '표준 품셈 적용 여부', '누수 · 부식 예비 항목'],
      '장비설치': ['기초 · 앵커 하중 검토', '반입 동선 · 양중 계획', '정렬 · 진동 허용치'],
      'Utility 배관': ['유틸리티 가동중단 일정', '우회 경로 · 헤더 분기', '보온 · 트레이싱 범위'],
      '공장증설': ['기존 설비 여유 용량', '무중단 Tie-in 가능성', '증설 후 유량 · 압력 적정성'],
      '노후배관교체': ['부식 · 잔존수명 진단', '철거 후 신설 동선', '가동 중 교체 가능성'],
      '기계실개선': ['협소 구역 장비 진입로', '밸브 헤더 분기 최적화', '유지보수 동선 확보'],
      '생산설비 배관 연결': ['설비측 훅업 규격', 'Utility 탭 연결부', '정밀 정렬 · 누설 시험'],
      'CAPEX 개·증설 검토': ['도면 · 물량 기반 예산 상한', '공법별 타당성', '단계별 예산 · 공기'],
      'spool': ['ISO 도면 · 자재 사양', '스풀 분할 · 물량', '사전제작 적합성'],
      'skid': ['P&ID · 장비 사양', '모듈 구성 · 물량', '운반 · 설치 제약'],
      'structure': ['구조 도면 · 하중 조건', '부재 물량 · 가공', '설치 · 안전 계획'],
    };
    const reviewItems = tradeReviewItems[key] || ['규격 · 압력 검토 여부', '표준 품셈 적용 여부', '예비 · 안전 항목'];

    return (
      <div key={key} className="flex flex-col gap-6 max-w-4xl mx-auto py-3 animate-in fade-in duration-300">

        {/* 주요 견적공종 — 라벨 + 공종별 핵심 키워드를 한 줄로 옆에 배치 (박스 없이 헤드라인) */}
        {keywords.length > 0 && (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5 border-b border-border/70 pb-5 pt-1 select-none">
            <span className="text-[12px] font-bold tracking-[0.08em] text-accent shrink-0">주요 견적공종</span>
            <div className="flex flex-wrap items-center gap-y-1.5">
              {keywords.map((k, i) => (
                <span key={k} className="inline-flex items-center">
                  <span className="text-[20px] md:text-[22px] font-extrabold text-navy tracking-tight leading-none">{k}</span>
                  {i < keywords.length - 1 && <span className="mx-3 w-px h-[16px] bg-border shrink-0" />}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 공종 상세 — 좌: 검토 항목(문제 도출) / 세로 헤어라인 / 우: ZEROS 견적 검증. 박스 제거 */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1px_1fr] gap-x-7 gap-y-5">
          <div className="flex flex-col">
            <h2 className="text-[16px] font-black text-navy tracking-tight mb-1.5">{manual.title}</h2>
            <p className="text-[12.5px] text-gray font-semibold leading-snug mb-4">{manual.problemDefinition}</p>
            <ul className="flex flex-col gap-2.5 mb-5">
              {reviewItems.map((t) => (
                <li key={t} className="flex items-center gap-2.5 text-[13px] text-gray font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-accent shrink-0" />
              <div className="leading-tight">
                <span className="text-[12px] text-gray">검토 항목에 따라 </span>
                <span className="text-[17px] font-black text-navy">최대 <span className="text-accent">{metrics.bubbleRate}%</span> 견적 차이</span>
              </div>
            </div>
          </div>

          <div className="hidden md:block bg-border" />

          <div className="flex flex-col">
            <h2 className="text-[16px] font-black text-navy tracking-tight mb-1.5">ZEROS Agent AI 견적 검증</h2>
            <p className="text-[12.5px] text-gray font-semibold leading-snug mb-4">실거래 표본과 표준 품셈으로 <span className="text-steel font-bold">최적합 견적을 산출·제공</span>합니다.</p>
            <ul className="flex flex-col gap-2.5 mb-5">
              {['적정 물량 · 단가로 견적 확정', '설계변경 · 재견적 분쟁 예방', '검증 근거 리포트 제공'].map((t) => (
                <li key={t} className="flex items-center gap-2.5 text-[13px] text-gray font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-success shrink-0" />
              <div className="leading-tight">
                <span className="text-[12px] text-gray">검증 후 </span>
                <span className="text-[17px] font-black text-success">최적합 견적 확정</span>
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* 작업 준비사항 / 작업 SOP — 박스 제거, 세로 헤어라인 */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1px_1fr] gap-x-7 gap-y-5">
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2 text-navy select-none">
              <BookOpen className="w-4 h-4 text-steel" />
              <span className="font-extrabold text-[15px]">작업 준비사항</span>
            </div>
            <ul className="flex flex-col gap-3">
              {manual.preparationDocs.map((doc, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-[12.5px] text-gray font-medium">
                  <CheckCircle2 className="w-4 h-4 text-steel shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{doc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="hidden md:block bg-border" />

          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2 text-navy select-none">
              <FileCheck className="w-4 h-4 text-accent" />
              <span className="font-extrabold text-[15px]">작업 SOP</span>
            </div>
            <ol className="flex flex-col gap-2.5">
              {manual.sop.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-navy text-bg text-[12px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-[12.5px] leading-snug">
                    <span className="font-bold text-navy">{step.title}</span>
                    <span className="text-gray font-medium"> : {step.action}</span>
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* 검토 후 제공 리포트 — 박스 제거, 헤어라인·아이콘 정렬 */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 select-none">
            <span className="w-1 h-4 bg-success rounded-full" />
            <h3 className="text-[15px] font-extrabold text-navy">검토 후 제공 리포트</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-7 gap-y-3">
            {manual.deliverables.map((del, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <FileText className="w-4.5 h-4.5 text-steel shrink-0 mt-0.5" />
                <span className="text-[12.5px] text-navy font-semibold leading-snug">{del}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-border pt-3.5">
            <ShieldCheck className="w-4 h-4 text-success shrink-0" />
            <span className="text-[12.5px] text-gray font-semibold leading-snug">표준 품셈 · 실거래 표본 기준으로 적정 견적을 산출하고, 1차 검토는 24시간 이내 회신합니다.</span>
          </div>
        </div>
      </div>
    );
  };

  // 모바일 랜딩(3페이지 스냅) — 홈/견적검토 공통으로 재사용. 현행 그대로 유지.
  const renderMobileLanding = () => {
    const mobileTradeName = LANDING_TRADES[mobileTradeIdx];
    const mobileBand = MOBILE_TRADE_ESTIMATES[mobileTradeName];
    const MOBILE_MIN = mobileBand.min;
    const MOBILE_MAX = mobileBand.max;
    const MOBILE_MEDIAN = mobileBand.median;
    const mobileFeeAmount = Math.round(mobileEstimateAmount * 0.02);
    const mobilePct = ((mobileEstimateAmount - MOBILE_MIN) / (MOBILE_MAX - MOBILE_MIN)) * 100;
    const mobileVsMedian = ((mobileEstimateAmount - MOBILE_MEDIAN) / MOBILE_MEDIAN) * 100;

    return (
      <div className="lg:hidden h-full flex flex-col bg-[#041B33] text-white">
        {/* ── 1페이지: 히어로 (풀스크린 스냅) ── */}
        <section className="snap-start snap-always min-h-full flex flex-col px-5 pt-5 pb-4 bg-[linear-gradient(180deg,#0A2D56_0%,#06213F_52%,#041B33_100%)]">
          {/* 상단 영역 — 타이틀·핵심 3대 역량 (역량 칩이 히어로 카피를 겸한다) */}
          <div className="flex-1 flex flex-col justify-center gap-7 min-h-0">
            <h1 className="text-[28px] leading-[1.16] font-black text-white text-center">
              데이터 분석으로 증명하는
              <br />
              최적의 견적, ZEROS
            </h1>

            {/* 핵심 3대 역량 아이콘 칩 — 탭화하여 각 탭으로 링크 연결 */}
            <div className="flex flex-col gap-4 pl-1 select-none">
              {[
                { icon: Truck, label: '견적.출장요청 자료 등록하기', sub: '고객 자료등록 및 예약방문 요청', color: 'text-sky-400', targetTab: 'request' },
                { icon: LineChart, label: 'AI Native 데이터분석 제공', sub: '실적 기반 견적 적합성 검증', color: 'text-indigo-400', targetTab: 'sop' },
                { icon: Award, label: '현장실무 경력30년 암묵지', sub: 'PM역무, 국가기술자격 다수 보유', color: 'text-emerald-400', targetTab: 'business' },
              ].map(({ icon: Icon, label, sub, color, targetTab }) => (
                <button
                  key={label}
                  onClick={() => setActiveTabAtTop(targetTab as any)}
                  className="flex items-start gap-4 text-left w-full p-3.5 rounded-[16px] bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div className="flex-1 flex flex-col gap-1 leading-tight min-w-0 pt-0.5">
                    <span className="text-[16px] font-black text-white tracking-tight flex items-center justify-between gap-1.5">
                      {label}
                      <span className="text-[11px] text-white/45 font-bold uppercase tracking-wider shrink-0 flex items-center gap-0.5">
                        이동 <ArrowRight className="w-3 h-3" />
                      </span>
                    </span>
                    <span className="text-[13px] font-semibold text-white/50 break-keep">{sub}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 하단 영역 — CTA 2종 + 스와이프 큐 */}
          <div className="flex flex-col gap-3 pt-4 shrink-0">
            <button
              onClick={() => setActiveTabAtTop('request')}
              className="bg-surface min-h-12 rounded-lg border border-border text-[#EA4F18] text-[18px] font-black active:scale-[0.98] transition-transform"
            >
              무료 견적 신청하기
            </button>
            <button
              onClick={() => setActiveTabAtTop('process')}
              className="min-h-12 rounded-lg border-2 border-[#2D73C8] bg-[#0B2B50]/70 text-white text-[18px] font-black active:scale-[0.98] transition-transform"
            >
              서비스 프로세스 보기
            </button>
            <button
              type="button"
              onClick={() => document.getElementById('m-landing-2')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              aria-label="현재 프로젝트 분석 보기"
              className="flex flex-col items-center gap-0.5 pt-2 text-white/55 active:text-white/80 transition-colors select-none"
            >
              <span className="text-[12.5px] font-semibold">현재 프로젝트 분석</span>
              <ChevronDown className="w-5 h-5 animate-bounce" />
            </button>
          </div>
        </section>

        {/* ── 2페이지: 공종별 견적 분석 (풀스크린 스냅 · 좌우 스와이프 캐러셀) ── */}
        <section id="m-landing-2" className="snap-start snap-always min-h-full flex flex-col justify-center gap-5 px-5 py-6 bg-[#041B33]">
          {/* 헤더 + 공종 칩 탭 */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-black uppercase tracking-[0.12em] text-white/45">AI NATIVE 정량 분석</span>
              <span className="text-[22px] text-white font-black tracking-tight">공종별 견적 분석</span>
            </div>
            <div ref={mobileChipsRef} className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5">
              {LANDING_TRADES.map((t, i) => (
                <button
                  key={t}
                  type="button"
                  data-active={i === mobileTradeIdx}
                  onClick={() => selectMobileTrade(i)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold border transition-colors ${i === mobileTradeIdx ? LANDING_CHIP_CLASS[t] : 'bg-white/[0.06] border-white/15 text-white/55'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 공종 카드 캐러셀 — 좌우로 스와이프하면 다음 공종 */}
          <div
            ref={mobileCarouselRef}
            onScroll={handleMobileCarouselScroll}
            className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
          >
            {LANDING_TRADES.map((t) => {
              const m = getDynamicMetrics(t);
              const v = getCategoryVisuals(t);
              return (
                <div key={t} className="shrink-0 basis-full snap-start">
                  <div className="rounded-2xl bg-[#092B50] border border-white/10 p-5 flex flex-col gap-4 overflow-hidden h-full">
                    <div className="rounded-xl bg-white text-[#081425] p-5 shadow-xl flex flex-col gap-4">
                      {/* 공종명 + 분석 상태 배지 */}
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#EAF2FF] border border-[#C7DBF5] flex items-center justify-center shrink-0 text-[#1E5FA7]">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <h2 className="text-[19px] leading-snug font-black break-keep">{t}</h2>
                          <span className="inline-flex items-center gap-1.5 self-start text-[11px] font-black text-[#1E7A46] bg-[#E7F6EE] px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#28A76F]" />
                            AI 분석 완료
                          </span>
                        </div>
                      </div>

                      {/* 공종 설명 */}
                      <p className="text-[12.5px] leading-relaxed font-semibold text-[#445268] break-keep line-clamp-2">{v.specText}</p>

                      {/* 스펙 칩 */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[11.5px] font-bold text-[#2A4A6B] bg-[#EEF4FB] border border-[#DCE7F3] px-2.5 py-1 rounded-md">유사 실거래 {m.sampleCount}건</span>
                        <span className="text-[11.5px] font-bold text-[#2A4A6B] bg-[#EEF4FB] border border-[#DCE7F3] px-2.5 py-1 rounded-md">AI Native 검증</span>
                      </div>

                      <div className="h-px bg-[#E5ECF4]" />

                      {/* 핵심 지표 — 큰 숫자 스탯 카드 3종 */}
                      <div className="grid grid-cols-3 gap-2.5">
                        {[
                          { value: `${m.confidence}%`, label: 'AI 신뢰도', color: 'text-[#1E63B6]' },
                          { value: '100%', label: '표준 일치', color: 'text-[#E07B1A]' },
                          { value: `-${m.bubbleRate}%`, label: '비용 절감', color: 'text-[#1E7A46]' },
                        ].map((s) => (
                          <div key={s.label} className="rounded-xl bg-[#F5F8FC] border border-[#E5ECF4] px-2 py-3 flex flex-col items-center gap-0.5">
                            <span className={`text-[18px] font-black tabular-nums tracking-tight ${s.color}`}>{s.value}</span>
                            <span className="text-[11px] font-bold text-[#5A6B80]">{s.label}</span>
                          </div>
                        ))}
                      </div>

                      <div className="h-px bg-[#E5ECF4]" />

                      {/* AI 검증 항목 체크리스트 */}
                      <div className="flex flex-col gap-2">
                        <span className="text-[12px] font-black uppercase tracking-wide text-[#3A4A5E]">AI 검증 항목</span>
                        {m.checklist.map((item) => (
                          <div key={item} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#28A76F] shrink-0 mt-0.5" />
                            <span className="text-[12.5px] font-semibold text-[#33455C] leading-snug break-keep">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ↓ 화살표 탭 — 3페이지(실시간 분석 현황)로 이동 */}
          <button
            type="button"
            onClick={() => document.getElementById('m-landing-3')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            aria-label="실시간 분석 현황 보기"
            className="flex flex-col items-center gap-0.5 text-white/55 active:text-white/80 transition-colors select-none"
          >
            <span className="text-[12.5px] font-semibold">실시간 분석 현황</span>
            <ChevronDown className="w-5 h-5 animate-bounce" />
          </button>
        </section>

        {/* ── 3페이지: 실시간 분석 현황 (풀스크린 스냅) ── */}
        <section id="m-landing-3" className="snap-start snap-always min-h-full flex flex-col justify-center gap-6 px-5 py-6 bg-[#041B33]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[12px] font-black uppercase tracking-[0.12em] text-white/45">AI 실시간 정량 분석</span>
              <span className="text-[22px] text-white font-black tracking-tight">실시간 분석 현황</span>
            </div>
            <div className="rounded-2xl bg-[#173B61] border border-white/10 p-5 flex flex-col gap-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[19px] font-black text-white">총 공사 견적금액</h3>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-black border ${LANDING_CHIP_CLASS[mobileTradeName]}`}>{mobileTradeName}</span>
              </div>

                <div className="flex flex-col gap-2">
                  <div className="relative h-7">
                    {/* 그라데이션 트랙(시각) */}
                    <div className="absolute left-0 right-0 top-3 h-1.5 rounded-full bg-[linear-gradient(90deg,#55D886_0%,#FFB134_52%,#E84F58_100%)] pointer-events-none" />
                    {/* 핸들 — 상태값 위치로 이동 */}
                    <div
                      className="absolute top-[5px] -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white bg-[#FF6A00] shadow-md pointer-events-none transition-[left] duration-75"
                      style={{ left: `${mobilePct}%` }}
                    />
                    {/* '예상 견적' 라벨 — 핸들 따라 이동 */}
                    <span
                      className="absolute -top-1 -translate-x-1/2 text-[12px] text-white/80 font-semibold whitespace-nowrap pointer-events-none transition-[left] duration-75"
                      style={{ left: `${Math.min(Math.max(mobilePct, 12), 88)}%` }}
                    >
                      예상 견적
                    </span>
                    {/* 드래그/터치 입력 — 투명 range가 트랙 전체를 덮어 값 조절 */}
                    <input
                      type="range"
                      min={MOBILE_MIN}
                      max={MOBILE_MAX}
                      step={50000}
                      value={mobileEstimateAmount}
                      onChange={(e) => setMobileEstimateAmount(Number(e.target.value))}
                      aria-label="예상 견적 조절 슬라이더"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[14px] text-white/62 font-semibold">
                    <span>최소 {Math.round(MOBILE_MIN / 1000000)}M 원</span>
                    <span>최대 {Math.round(MOBILE_MAX / 1000000)}M 원</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[14px] text-white/80 font-semibold whitespace-nowrap shrink-0">예상 견적</span>
                    <span className="text-[23px] text-white font-black tabular-nums whitespace-nowrap tracking-tight">{mobileEstimateAmount.toLocaleString()} 원</span>
                  </div>
                  <span className="self-end text-[12px] text-white/60 font-semibold whitespace-nowrap">(중앙값 {Math.round(MOBILE_MEDIAN / 1000000)}M 대비 {mobileVsMedian >= 0 ? '+' : ''}{mobileVsMedian.toFixed(1)}%)</span>
                </div>

                <div className="border-t border-white/12 pt-4 flex items-center justify-between gap-2">
                  <span className="text-[14px] text-white font-semibold whitespace-nowrap shrink-0">서비스 수수료 (2%)</span>
                  <span className="text-[16px] text-white font-black tabular-nums whitespace-nowrap">{mobileFeeAmount.toLocaleString()} 원</span>
                </div>
              </div>
            </div>

          {/* 최종 CTA — AI Native 검증 절차 / 무료 견적 신청 */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTabAtTop('sop')}
              className="min-h-12 rounded-lg bg-[#1E73D8] text-white text-[17px] font-black"
            >
              AI Native 검증 절차
            </button>
            <button
              onClick={() => setActiveTabAtTop('request')}
              className="min-h-12 rounded-lg bg-[#FF6A00] text-white text-[17px] font-black"
            >
              무료 견적 신청
            </button>
          </div>
        </section>
      </div>
    );
  };

  // 견적 검토(데스크톱) — 기존 첫 화면 랜딩. '견적 검토' 탭에서 노출.
  const renderReviewDesktop = () => {
    const activeTradeName = LANDING_TRADES[activeTradeIdx];
    const activeManual = manualData[activeTradeName];
    const activeMetrics = getDynamicMetrics(activeTradeName);
    const keywords = TRADE_KEYWORDS[activeTradeName] || [];
    // 공종별 시그니처 색 — 회전하는 공종마다 히어로 테마를 바꿔 상단 칩바와 시선 연결·차별화
    const sigHex = LANDING_SIGNATURE_HEX[activeTradeName] || '#D2691E';
    // ZEROS 최적합 지수 = 검토 전 견적(100) 대비 (단가 부풀림 없이 적정화한 비율)
    const optimizedIndex = +(100 - activeMetrics.bubbleRate).toFixed(1);

    return (
      /* 박스 남발 제거 — 콘텐츠 카드 1개(FLOW+히어로) + 하단 네이비 밴드. 내부는 여백·헤어라인으로만 구분 */
      <div className="hidden lg:grid h-full grid-rows-[1fr_auto] gap-3 max-w-5xl mx-auto">

        {/* 콘텐츠 — 견적 작업 FLOW + 히어로 (언박싱: 카드 제거, 여백·헤어라인으로만) */}
        <section className="px-2 py-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar">

          <EstimateFlow />

          {/* 가로 헤어라인 — 박스 대신 영역 구분 */}
          <div className="h-px bg-border my-5 shrink-0" />

          {/* 히어로 — 좌 공종·최적화 / 세로 헤어라인 / 우 검증 신뢰 */}
          <div className="grid grid-cols-[1.5fr_1px_1fr] gap-7 flex-1 min-h-0">

            {/* 좌 */}
            <div className="flex flex-col min-w-0">
              <span className="flex items-center gap-1.5 select-none">
                <span className="w-1.5 h-1.5 rounded-full shrink-0 transition-colors duration-500" style={{ backgroundColor: sigHex }} />
                <span className="text-[11px] font-black tracking-[0.14em] transition-colors duration-500" style={{ color: sigHex }}>현재 검토 공종</span>
              </span>
              <h1 className="text-[22px] leading-[1.18] font-black text-navy tracking-tight mt-1 pb-2 border-b-2 inline-block self-start transition-colors duration-500" style={{ borderColor: sigHex }}>{activeManual.title}</h1>
              {keywords.length > 0 && (
                <div className="flex items-center flex-wrap gap-y-1.5 mt-3 select-none">
                  {keywords.map((k, i) => (
                    <span key={k} className="flex items-center">
                      <span className="text-[15px] font-bold text-navy tracking-tight">{k}</span>
                      {i < keywords.length - 1 && <span className="w-px h-3.5 bg-border mx-3.5 shrink-0" />}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-auto pt-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[13px] font-bold text-gray">검토 후 평균 견적 최적화</span>
                  <span className="text-[30px] leading-none font-black tracking-tight tabular-nums transition-colors duration-500" style={{ color: sigHex }}>-{activeMetrics.bubbleRate}<span className="text-[18px]">%</span></span>
                </div>
                <div className="flex flex-col gap-2 mt-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-[84px] text-right text-[11.5px] font-bold text-gray-light shrink-0 whitespace-nowrap">검토 전 견적</span>
                    <div className="flex-1 h-3 bg-bg-subtle rounded-[3px] overflow-hidden"><div className="h-full w-full bg-[#D8DEE7]" /></div>
                    <span className="w-9 text-[11.5px] font-bold text-gray tabular-nums">100</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-[84px] text-right text-[11.5px] font-black shrink-0 whitespace-nowrap transition-colors duration-500" style={{ color: sigHex }}>ZEROS 최적합</span>
                    <div className="flex-1 h-3 bg-bg-subtle rounded-[3px] overflow-hidden"><div className="h-full transition-all duration-500" style={{ width: `${optimizedIndex}%`, backgroundColor: sigHex }} /></div>
                    <span className="w-9 text-[11.5px] font-black tabular-nums transition-colors duration-500" style={{ color: sigHex }}>{optimizedIndex}</span>
                  </div>
                </div>
                <p className="text-[11.5px] text-gray-light font-semibold mt-2.5">실거래 표본 · 표준 품셈 대비 / 부풀림 없이 적정 단가로 산출</p>
              </div>
            </div>

            {/* 세로 헤어라인 — 우측 검증 영역을 박스 없이 분리 */}
            <div className="bg-border" />

            {/* 우 — ZEROS Agent AI 검증 (박스 제거, 헤어라인으로만 구분) + 단일 CTA */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 mb-3.5 select-none">
                <ShieldCheck className="w-4 h-4 text-success shrink-0" />
                <span className="text-[13px] font-black text-navy">ZEROS Agent AI 검증</span>
              </div>
              <div className="flex flex-col gap-3.5">
                <div>
                  <div className="flex justify-between items-baseline mb-1.5"><span className="text-[12px] font-semibold text-gray">AI 분석 신뢰도</span><span className="text-[15px] font-black text-navy tabular-nums">{activeMetrics.confidence}%</span></div>
                  <div className="h-1.5 bg-[#E4E9F0] rounded-full overflow-hidden"><div className="h-full bg-steel" style={{ width: `${activeMetrics.confidence}%` }} /></div>
                </div>
                <div>
                  <div className="flex justify-between items-baseline mb-1.5"><span className="text-[12px] font-semibold text-gray">실거래 표준 품셈</span><span className="text-[15px] font-black text-success">100% 매핑</span></div>
                  <div className="h-1.5 bg-[#E4E9F0] rounded-full overflow-hidden"><div className="h-full w-full bg-success" /></div>
                </div>
                <div className="flex justify-between items-baseline border-t border-border pt-3"><span className="text-[12px] font-semibold text-gray">검토 표본</span><span className="text-[15px] font-black text-navy tabular-nums">{activeMetrics.sampleCount}건</span></div>
              </div>
              <button
                onClick={() => setActiveTabAtTop('request')}
                style={{ touchAction: 'manipulation' }}
                className="mt-auto w-full bg-accent hover:bg-[#c95f12] text-white rounded-custom py-3 text-[15px] font-black tracking-tight shadow-sm transition-all duration-150 active:scale-95 cursor-pointer"
              >
                무료 견적 검토 의뢰 →
              </button>
              <button
                onClick={() => setActiveTabAtTop('sop')}
                style={{ touchAction: 'manipulation' }}
                className="mt-2.5 mx-auto text-steel hover:text-navy text-[12.5px] font-bold underline underline-offset-4 decoration-border hover:decoration-steel transition-colors cursor-pointer"
              >
                AI Native 검증 절차 보기
              </button>
            </div>
          </div>
        </section>

        {/* 하단 — 신뢰 앵커 밴드: 세련된 딥 블루(--color-band) */}
        <section className="bg-[var(--color-band)] rounded-custom shadow-custom-lg px-6 py-4 flex flex-col gap-3.5">
          <div className="flex items-center gap-2.5 select-none">
            <span className="w-1.5 h-7 bg-accent rounded-full shrink-0" />
            <div className="flex flex-col">
              <h2 className="text-[18px] font-black text-white tracking-tight leading-tight">공사 전, 견적부터 검증하십시오</h2>
              <span className="text-[12px] font-semibold text-white/55 break-keep mt-0.5">설계변경 · 예산초과 리스크를 데이터로 선제 차단합니다</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-px bg-white/10 rounded-custom overflow-hidden">
            {HOME_STATS.map((s) => {
              const Icon = s.icon;
              const down = s.value.startsWith('-');
              return (
                <div key={s.label} className="bg-[var(--color-band)] px-3 py-4 flex flex-col items-center text-center gap-1.5">
                  <span className={`text-[28px] leading-none font-black tracking-tight tabular-nums whitespace-nowrap ${down ? 'text-[#F2A24E]' : 'text-white'}`}>{s.value}</span>
                  <span className="flex items-center gap-1.5 text-[12px] font-bold text-white/70 break-keep">
                    <Icon className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    );
  };

  // 홈(데스크톱) — PPT 시안 기반의 간결한 단독 랜딩. 첫 화면으로 노출되며
  // 상세 작업공간(견적 검토)·진단·실적·의뢰로 진입하는 관문 역할을 한다.
  const HOME_STATS = [
    { icon: ShieldCheck, label: '검토 분석 신뢰도', value: '97.8%' },
    { icon: Clock, label: '평균 1차 검토 소요', value: '2.1일 이내' },
    { icon: TrendingDown, label: '평균 절감 효과', value: '-31.5%' },
    { icon: BarChart3, label: '누적 검토 건수', value: '246건+' },
  ];

  const HOME_CATEGORIES = [
    {
      title: '일반 배관공사',
      desc: '일반/용수/가스 배관',
      colorClass: 'bg-[#FF5A1F]',
      color: '#FF5A1F',
      menu: '배관공사',
    },
    {
      title: '기계 장비설치',
      desc: '펌프, 탱크, 기타 장비 설치',
      colorClass: 'bg-[#F97316]',
      color: '#F97316',
      menu: '장비설치',
    },
    {
      title: '공정 배관공사',
      desc: '제조설비 훅업 연결',
      colorClass: 'bg-[#EAB308]',
      color: '#EAB308',
      menu: '생산설비 배관 연결',
    },
    {
      title: 'CAPEX개선,증설 검토',
      desc: '도면 및 견적 검토',
      colorClass: 'bg-[#10B981]',
      color: '#10B981',
      menu: 'CAPEX 개·증설 검토',
    },
    {
      title: 'SKID . SPOOL제작 견적',
      desc: '배관 SPOOL Module 검토',
      colorClass: 'bg-[#3B82F6]',
      color: '#3B82F6',
      menu: 'skid',
    },
  ];

  const renderHomeDesktop = () => (
    <div className="hidden lg:flex flex-col h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] bg-bg-subtle relative overflow-hidden select-none">
      {/* 백그라운드 조명 데코레이션 - 좌우 공간에 화사하고 친근한 톤 보충 */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(30,77,140,0.06),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(224,112,26,0.04),transparent_70%)] pointer-events-none" />

      {/* ── 히어로 및 핵심 영역 카테고리 (수직 정렬 및 상하 여백 균형 매칭) ── */}
      <section className="flex-1 flex items-center justify-center min-h-0 py-6 xl:py-8 z-10">
        <div className="w-full max-w-[1480px] mx-auto px-6 xl:px-8">
          {/* 히어로 카드 (5대 카테고리까지 내부로 통합해 감싸도록 세로폭 확장) */}
          <div className="bg-surface border border-border/40 rounded-[32px] shadow-[0_20px_50px_rgba(15,30,53,0.04)] py-10 md:py-12 xl:py-14 px-10 md:px-12 xl:px-16 flex flex-col gap-10 relative overflow-hidden">
            {/* 은은한 내부 데코레이션 그라데이션 */}
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(245,247,250,0.5),rgba(255,255,255,0)_65%)] pointer-events-none" />

            {/* 상단: 카피 + 이미지 (2열 레이아웃) */}
            <div className="grid grid-cols-[1.16fr_0.84fr] gap-12 xl:gap-16 items-center z-10 relative">
              {/* 좌: 카피 + CTA */}
              <div className="flex flex-col gap-6 xl:gap-8 relative">
                {/* 신뢰 표기 — 도형(알약) 제거, 헤어라인 언더라인으로 정리(탭 오인 방지) */}
                <span className="self-start inline-flex items-center gap-2 pb-1.5 border-b-[1.5px] border-[#155EEF]/35 text-[14.5px] font-black select-none">
                  <Sparkles className="w-4 h-4 text-[#155EEF] shrink-0" />
                  <span className="text-[#155EEF]">AI Native 1차 검증</span>
                  <span className="text-[#9AA3AF] font-bold">·</span>
                  <span className="text-[#0F1E35]">PM 전문가 최종 검토</span>
                </span>

                {/* 헤드라인 */}
                <h1 className="text-[clamp(32px,2.8vw,40px)] font-black leading-[1.25] tracking-tight text-[#0F1E35] break-keep">
                  공정설비 CAPEX 개선·증설 <span className="whitespace-nowrap">배관공사,</span>
                  <br />
                  <span className="text-[#155EEF]">AI 분석</span>
                  <span>으로 더 정확하게</span>
                </h1>

                {/* 본문 */}
                <p className="text-[14.5px] leading-relaxed font-semibold text-[#5B6573] max-w-xl">
                  ZEROS는 현장 실무 경험과 <strong className="text-[#0F1E35] font-black">AI 데이터 분석</strong>을 결합해,
                  비용과 리스크까지 고려한 가장 합리적인 견적을 제안합니다.
                </p>

                {/* CTA */}
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <button
                    onClick={() => setActiveTabAtTop('request')}
                    style={{ touchAction: 'manipulation' }}
                    className="cta-border-trace cta-border-trace--lead inline-flex items-center justify-center gap-2 text-[#155EEF] px-6 py-3.5 rounded-custom text-[15px] font-black tracking-wide shadow-sm active:scale-95 cursor-pointer"
                  >
                    <FileCheck className="w-4.5 h-4.5 shrink-0" />
                    무료 출장 견적 신청
                  </button>
                  <button
                    onClick={() => setActiveTabAtTop('sop')}
                    style={{ touchAction: 'manipulation' }}
                    className="cta-border-trace group inline-flex items-center justify-center gap-2 text-[#0F1E35] px-6 py-3.5 rounded-custom text-[15px] font-black tracking-wide shadow-sm active:scale-95 cursor-pointer"
                  >
                    AI Native 검증 절차 보기
                    <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-300 ease-out group-hover:translate-x-0.5" />
                  </button>
                </div>

                {/* 신뢰 배지 대체: 핵심 가치 피처 라인 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 pt-4 border-t border-border/50 select-none">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-steel shrink-0" />
                      <span className="text-[14.5px] font-black text-[#0F1E35]">도면·사진 정밀 분석</span>
                    </div>
                    <span className="text-[11.5px] font-medium text-[#5B6573] pl-3 leading-relaxed break-keep">
                      도면·사진의 치수와 연결 규격을 분석하여 물량 누락을 방지합니다.
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-steel shrink-0" />
                      <span className="text-[14.5px] font-black text-[#0F1E35]">공사 범위 사전 조율</span>
                    </div>
                    <span className="text-[11.5px] font-medium text-[#5B6573] pl-3 leading-relaxed break-keep">
                      모호한 범위를 명확히 고정하여 시공사 비교 견적의 동일 기준을 수립합니다.
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-steel shrink-0" />
                      <span className="text-[14.5px] font-black text-[#0F1E35]">실거래 공량 검토</span>
                    </div>
                    <span className="text-[11.5px] font-medium text-[#5B6573] pl-3 leading-relaxed break-keep">
                      표준 품셈 및 1군 실거래 표본 대조로 과도하게 부풀려진 노무 단가를 교정합니다.
                    </span>
                  </div>
                </div>
              </div>

              {/* 우: 현장 이미지 + 플로팅 배지 */}
              <div className="relative w-full flex flex-col items-center">
                <div className="relative w-full rounded-2xl overflow-hidden shadow-custom-md ring-1 ring-black/5 aspect-[1.25/1]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/hero-engineers.jpg"
                    alt="현장 엔지니어가 노트북으로 배관 설비를 검토하는 모습"
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                  {/* 가독성용 하단 그라데이션 */}
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0F1E35]/30 to-transparent pointer-events-none" />
                </div>

                {/* AI Native 검증 배지 — 이미지 하단 가로축 정중앙(원위치), 클릭 시 'AI Native 검증' SOP 탭으로 이동 */}
                <button
                  type="button"
                  onClick={() => setActiveTabAtTop('sop')}
                  aria-label="AI Native 검증 표준 작업 절차 보기"
                  className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-white border border-[#E2E8F0] rounded-full shadow-custom-md px-3.5 py-1.5 flex items-center gap-2.5 z-20 whitespace-nowrap cursor-pointer hover:scale-105 hover:shadow-lg hover:border-[#155EEF]/40 transition-all duration-200 active:scale-100"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
                  <span className="text-[12.5px] font-extrabold text-[#0F1E35]">AI Native 검증</span>
                </button>
              </div>
            </div>

            {/* ── 5대 공정/서비스 영역 카테고리 (하얀 바탕 카드 내부 하단 배치) ── */}
            <div className="grid grid-cols-5 gap-6 xl:gap-8 border-t border-border/40 pt-8 z-10 relative">
              {HOME_CATEGORIES.map((cat) => (
                <button
                  key={cat.title}
                  onClick={() => {
                    setSelectedMenu(cat.menu);
                    setSelectedBudget('');
                    setActiveTabAtTop('review');
                  }}
                  className="flex flex-col items-start text-left gap-1 pl-4.5 pb-2.5 relative group transition-all duration-200 cursor-pointer focus:outline-none hover:-translate-y-0.5"
                >
                  <span className="text-[14.5px] font-black text-navy group-hover:text-steel transition-colors duration-150 whitespace-nowrap">
                    {cat.title}
                  </span>
                  <span className="text-[10.5px] md:text-[11.5px] font-semibold text-[#5B6573] leading-normal break-keep">
                    {cat.desc}
                  </span>
                  {/* 하단 데코 — 프리미엄 모노톤: 평상시 절제된 네이비 헤어라인, 호버 시 브랜드 오렌지가 좌→우로 채워짐 (색 구분은 텍스트가 담당) */}
                  <span className="absolute left-4.5 right-4 bottom-1.5 h-[2px]" aria-hidden="true">
                    {/* 기준 헤어라인 — 5개 컬럼 동일 길이로 그리드 리듬 정렬 */}
                    <span className="absolute inset-x-0 inset-y-0 rounded-full bg-navy/20" />
                    {/* 호버 채움 — 브랜드 오렌지 */}
                    <span className="absolute left-0 inset-y-0 w-0 rounded-full bg-[#FF6A00] transition-[width] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-full" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 하단 미니멀 통합 통계 플레이트 (청색 2단 中 상단 띠 — 신뢰·정직 3색 애니메이션 배경) ── */}
      <section className="h-16 shrink-0 flex items-center relative bg-trust-animated text-white z-10 select-none border-b border-white/10">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-white/5 overflow-hidden">
          <style>{`
            @keyframes flowOrange {
              0% { left: -50%; }
              100% { left: 100%; }
            }
          `}</style>
          <div 
            className="absolute top-0 bottom-0 w-[50%] bg-gradient-to-r from-transparent via-[#FF6A00] to-transparent"
            style={{
              animation: 'flowOrange 6s linear infinite',
            }}
          />
        </div>
        <div className="w-full max-w-[1400px] mx-auto px-10 grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2">
          {HOME_STATS.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 justify-center md:justify-start">
              <Icon className="w-5 h-5 text-[#88A8D2] shrink-0" />
              <span className="flex items-baseline gap-2.5 leading-none">
                <span className="text-[12.5px] font-semibold text-white/60 whitespace-nowrap">{label}</span>
                <span className="text-[18px] md:text-[22px] font-black tracking-tight tabular-nums text-white">{value}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 푸터 (청색 2단 中 하단 띠 — 헤더와 동일한 64px 높이) ── */}
      <footer className="bg-[#04204C] text-white/60 h-16 shrink-0 flex items-center z-10 select-none">
        <div className="w-full max-w-[1400px] mx-auto px-10 flex items-center justify-between gap-4 text-[12.5px] font-semibold">
          <span>© 2025 ZEROS Co., Ltd. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <span className="text-white/45">사업자등록번호 준비중</span>
            <span className="text-white/25">|</span>
            <span className="hover:text-white transition-colors">개인정보처리방침</span>
            <button
              onClick={() => setActiveTabAtTop('request')}
              className="text-white hover:text-accent transition-colors font-bold"
            >
              문의하기
            </button>
          </div>
        </div>
      </footer>
    </div>
  );

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
      case 'business':
        return renderBusinessTab();
      case 'process':
        return renderServiceProcessTab();
      case 'sop':
        return renderSopTab();
      case 'performance':
        return renderPerformanceTab();
      case 'request':
        return renderRequestTab();
      case 'review':
        // 견적 검토 — 기존 첫 화면. 데스크톱은 상세 랜딩, 공종/규모 선택 시 매뉴얼 상세.
        // (모바일은 랜딩으로 폴백 — 모바일 네비에는 노출되지 않는 경로)
        if (selectedMenu && !selectedBudget) {
          return renderManualDetail(selectedMenu);
        }
        if (selectedBudget && !selectedMenu) {
          return renderManualDetail(selectedBudget);
        }
        return (
          <>
            {renderMobileLanding()}
            {renderReviewDesktop()}
          </>
        );
      case 'home':
      default:
        // 모바일에서 공종/규모 칩 선택 시 매뉴얼 상세(현행 유지)
        if (selectedMenu && !selectedBudget) {
          return renderManualDetail(selectedMenu);
        }
        if (selectedBudget && !selectedMenu) {
          return renderManualDetail(selectedBudget);
        }
        // 모바일: 기존 3페이지 랜딩 / 데스크톱: PPT 시안 단독 랜딩
        return (
          <>
            {renderMobileLanding()}
            {renderHomeDesktop()}
          </>
        );
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

      {/* 고객 휴대폰 인증 로그인 & 본인 접수현황(시계열) 모달 */}
      <CustomerLoginModal />
      <MyRequestsModal />
    </AppShell>
  );
}
