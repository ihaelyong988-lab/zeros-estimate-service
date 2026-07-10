'use client';

import React, { useEffect, useState } from 'react';
import { useShell } from '@/lib/context/ShellContext';
import { ZerosService } from '@/lib/supabase/client';
import { Estimate, SiteVisit, Customer, NotificationLog } from '@/types/estimate';
import { menuDisplayName } from '@/lib/constants/menu';
import { kstToday, kstDateStr } from '@/lib/utils/date';
import {
  ArrowRight,
  LayoutGrid,
  FileText,
  CalendarRange,
  Users2,
  TrendingUp,
  Bell,
  CheckCircle2,
  Clock,
  Database,
  Award,
  UserCheck,
  ChevronRight,
} from 'lucide-react';

export interface DecisionMetrics {
  avgDays: number;
  minAmount: string;
  maxAmount: string;
  medianAmount: string;
  minVal: number;       // 최소 숫자 제원 (실시간 연동용)
  maxVal: number;       // 최대 숫자 제원 (실시간 연동용)
  percent: number;      // 기본 중앙값 위치 퍼센트
  sampleCount: number;
  recommendation: string;
  recommendationDesc: string;
}

export const metricsMap: Record<string, DecisionMetrics> = {
  '배관공사': {
    avgDays: 2.1,
    minAmount: '1,200만',
    maxAmount: '4,500만',
    medianAmount: '2,800만',
    minVal: 12000000,
    maxVal: 45000000,
    percent: 45,
    sampleCount: 42,
    recommendation: '출장견적 검토 대상',
    recommendationDesc: '도면 분석 및 현장 실측을 통해 신뢰도 높은 예상 범위를 산정합니다.',
  },
  '장비설치': {
    avgDays: 1.8,
    minAmount: '800만',
    maxAmount: '3,000만',
    medianAmount: '1,500만',
    minVal: 8000000,
    maxVal: 30000000,
    percent: 32,
    sampleCount: 28,
    recommendation: '온라인 간편검토 대상',
    recommendationDesc: '장비 제원표와 연결부 현장 사진 제출 시 24시간 내 간편 견적이 가능합니다.',
  },
  'Utility 배관': {
    avgDays: 3.2,
    minAmount: '2,500만',
    maxAmount: '8,000만',
    medianAmount: '4,800만',
    minVal: 25000000,
    maxVal: 80000000,
    percent: 55,
    sampleCount: 35,
    recommendation: '출장견적 검토 대상',
    recommendationDesc: '유틸리티 가동 중단 일정을 조율하고 현장 우회 경로를 파악해야 합니다.',
  },
  '공장증설': {
    avgDays: 4.5,
    minAmount: '5,000만',
    maxAmount: '2.5억',
    medianAmount: '1.2억',
    minVal: 50000000,
    maxVal: 250000000,
    percent: 60,
    sampleCount: 19,
    recommendation: '프로젝트 사전진단 대상',
    recommendationDesc: '생산 능력 증대에 따른 전체 CAPEX 예산 및 공기 타당성을 면밀히 기획합니다.',
  },
  '노후배관교체': {
    avgDays: 2.8,
    minAmount: '1,500만',
    maxAmount: '6,000만',
    medianAmount: '3,200만',
    minVal: 15000000,
    maxVal: 60000000,
    percent: 40,
    sampleCount: 24,
    recommendation: '출장견적 검토 대상',
    recommendationDesc: '기존 배관의 부식 수준 파악 및 철거 후 신설 동선 제약 요소를 실측합니다.',
  },
  '기계실개선': {
    avgDays: 3.5,
    minAmount: '3,000만',
    maxAmount: '1.2억',
    medianAmount: '6,500만',
    minVal: 30000000,
    maxVal: 120000000,
    percent: 50,
    sampleCount: 15,
    recommendation: '출장견적 검토 대상',
    recommendationDesc: '기계실 협소 구역 내 대형 장비 진입로 및 밸브 헤더 분기 최적화를 검토합니다.',
  },
  '생산설비 배관 연결': {
    avgDays: 2.3,
    minAmount: '800만',
    maxAmount: '4,000만',
    medianAmount: '2,200만',
    minVal: 8000000,
    maxVal: 40000000,
    percent: 38,
    sampleCount: 31,
    recommendation: '온라인 간편검토 대상',
    recommendationDesc: '설비측 훅업 규격과 Utility 탭 측 연결 밸브 사진 확인으로 검토합니다.',
  },
  'CAPEX 개·증설 검토': {
    avgDays: 5.0,
    minAmount: '8,000만',
    maxAmount: '5억',
    medianAmount: '2.2억',
    minVal: 80000000,
    maxVal: 500000000,
    percent: 65,
    sampleCount: 12,
    recommendation: '프로젝트 사전진단 대상',
    recommendationDesc: '1군 건설사 수준의 원가 설계 노하우를 바탕으로 공법별 예산 타당성을 종합 진단합니다.',
  },
  // 외주제작 (Fabrication) — 도면 기반 사전제작/모듈화 공급
  'spool': {
    avgDays: 2.0,
    minAmount: '2,000만',
    maxAmount: '1.5억',
    medianAmount: '6,000만',
    minVal: 20000000,
    maxVal: 150000000,
    percent: 30,
    sampleCount: 68,
    recommendation: '도면 기반 사전제작 검토',
    recommendationDesc: 'ISO 도면과 자재 사양으로 스풀 분할과 물량을 비대면으로 산출합니다.',
  },
  'skid': {
    avgDays: 2.5,
    minAmount: '3,000만',
    maxAmount: '3억',
    medianAmount: '1.2억',
    minVal: 30000000,
    maxVal: 300000000,
    percent: 33,
    sampleCount: 54,
    recommendation: '패키지 모듈 사전제작 검토',
    recommendationDesc: 'P&ID와 장비 사양으로 모듈 구성과 물량을 비대면으로 산출합니다.',
  },
  'structure': {
    avgDays: 2.2,
    minAmount: '1,500만',
    maxAmount: '1.2억',
    medianAmount: '4,500만',
    minVal: 15000000,
    maxVal: 120000000,
    percent: 29,
    sampleCount: 47,
    recommendation: '도면 기반 공장가공 검토',
    recommendationDesc: '구조 도면과 하중 조건으로 부재 물량과 가공 도면을 비대면으로 산출합니다.',
  },
  // 견적규모별 폴백
  'small': {
    avgDays: 1.5,
    minAmount: '100만',
    maxAmount: '1,000만',
    medianAmount: '500만',
    minVal: 1000000,
    maxVal: 10000000,
    percent: 40,
    sampleCount: 56,
    recommendation: '온라인 간편검토',
    recommendationDesc: '신속한 1차 서류 검토 및 자재 가격 기반 표준 견적을 산출합니다.',
  },
  'medium': {
    avgDays: 3.0,
    minAmount: '1,000만',
    maxAmount: '1억',
    medianAmount: '4,500만',
    minVal: 10000000,
    maxVal: 100000000,
    percent: 48,
    sampleCount: 78,
    recommendation: '출장견적 및 실측 권장',
    recommendationDesc: '전문 엔지니어가 현장을 방문하여 작업 여건과 배관 난이도를 실측합니다.',
  },
  'large': {
    avgDays: 5.5,
    minAmount: '1억',
    maxAmount: '10억',
    medianAmount: '3.5억',
    minVal: 100000000,
    maxVal: 1000000000,
    percent: 58,
    sampleCount: 22,
    recommendation: '종합 CAPEX 사전진단',
    recommendationDesc: '공법 검토, 시공 안전 리스크 분석, 단계별 예산 최적화 리포트를 제공합니다.',
  },
  'unknown': {
    avgDays: 2.5,
    minAmount: '1,000만',
    maxAmount: '1억',
    medianAmount: '4,500만',
    minVal: 10000000,
    maxVal: 100000000,
    percent: 50,
    sampleCount: 14,
    recommendation: '전문가 유선 상담 필요',
    recommendationDesc: '설비 내역 파악 및 대략적인 규모 확인을 위해 담당자 배정 후 연락을 드립니다.',
  }
};

export const RightSidebar: React.FC = () => {
  const {
    isUserMode,
    selectedMenu,
    selectedBudget,
    setActiveTab,
    sliderVal,
    setSliderVal,
    setShowDecisionPanel,
    adminView,
    setAdminView,
  } = useShell();

  // 현재 활성화된 주제 선택
  const activeKey = selectedBudget || selectedMenu || '배관공사';
  const metrics = metricsMap[activeKey] || metricsMap['배관공사'];

  // 카테고리가 갱신될 때마다 슬라이더 위치를 기본 권장 퍼센트로 자동 동기화
  useEffect(() => {
    setSliderVal(metrics.percent);
  }, [activeKey, metrics.percent, setSliderVal]);

  // 관리자 우측 "확인 패널" 실데이터 — 좌측 주제 탭(adminView)에 따라 주제별로 재구성된다.
  const [adminEstimates, setAdminEstimates] = useState<Estimate[]>([]);
  const [adminVisits, setAdminVisits] = useState<SiteVisit[]>([]);
  const [adminCustomers, setAdminCustomers] = useState<Customer[]>([]);
  const [adminLogs, setAdminLogs] = useState<NotificationLog[]>([]);

  useEffect(() => {
    if (isUserMode) return;
    let alive = true;
    (async () => {
      try {
        const [est, vis, cus, logs] = await Promise.all([
          ZerosService.getEstimates(),
          ZerosService.getSiteVisits(),
          ZerosService.getCustomers(),
          ZerosService.getNotificationLogs(),
        ]);
        if (!alive) return;
        setAdminEstimates(est);
        setAdminVisits(vis);
        setAdminCustomers(cus);
        setAdminLogs(logs);
      } catch (e) {
        console.error('관리자 우측 패널 데이터 로드 실패', e);
      }
    })();
    return () => { alive = false; };
  }, [isUserMode, adminView]);

  if (!isUserMode) {
    return (
      <AdminContextPanel
        adminView={adminView}
        setAdminView={setAdminView}
        estimates={adminEstimates}
        visits={adminVisits}
        customers={adminCustomers}
        logs={adminLogs}
      />
    );
  }

  // 실시간 슬라이더 값에 의거한 "견적 예상가" 및 "2% 견적 수수료" 공식 산출
  const currentAmount = Math.round(metrics.minVal + ((metrics.maxVal - metrics.minVal) * (sliderVal / 100)));
  const feeAmount = Math.round(currentAmount * 0.02);

  // 좌측 선택과 색을 연결: 외주제작(FAB) 계열은 오렌지, 그 외는 스틸블루
  const fabKeys = ['spool', 'skid', 'structure'];
  const isFab = fabKeys.includes(activeKey);
  const accentBarBg = isFab ? 'bg-accent' : 'bg-steel';
  const accentTextCls = isFab ? 'text-accent' : 'text-steel';
  // 우측 결과 패널 제목 = 좌측 메뉴 항목 제목과 동일(공용 맵 단일 소스).
  const displayName = menuDisplayName(activeKey);

  return (
    <aside className="w-full h-full flex flex-col shrink-0 select-none overflow-y-auto bg-bg-subtle">
      {/* 상단 액센트 바 — 좌측 선택과 색으로 연결 */}
      <div className={`h-1 w-full ${accentBarBg} shrink-0`} />

      {/* 우측 가장자리(브라우저 끝)는 좌측(20px)보다 넉넉한 28px — 화면 끝 답답함 해소 */}
      <div className="py-5 pl-5 pr-7 flex flex-col gap-4">
        {/* 헤더 — 선택한 공종명 + 우측 접기 화살표 */}
        <div className="flex items-center gap-2">
          <span className={`w-1 h-4 ${accentBarBg} rounded-full shrink-0`} />
          <h3 className={`text-[16px] font-black ${accentTextCls} tracking-tight leading-tight`}>{displayName}</h3>
          <button
            onClick={() => setShowDecisionPanel(false)}
            style={{ touchAction: 'manipulation' }}
            className="ml-auto shrink-0 w-6 h-6 inline-flex items-center justify-center rounded text-gray-light hover:text-steel hover:bg-bg-subtle cursor-pointer transition-colors"
            aria-label="실시간 검토 패널 접기"
            title="패널 접기"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 평균 소요일 — borderless 행 */}
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <span className="text-[12px] font-bold text-gray">평균 1차 검토 소요</span>
          <span className="text-[15px] font-black text-navy tabular-nums">{metrics.avgDays}일 이내</span>
        </div>

        {/* 예상 견적범위 — 유일하게 강조하는 카드(핵심 인터랙션: 슬라이더) */}
        <div className="bg-bg border border-border rounded-custom p-4 flex flex-col gap-3 shadow-custom-sm">
          <span className="text-[12px] font-bold text-navy">예상 견적범위</span>
          <span className="text-2xl font-black text-navy tracking-tight tabular-nums leading-none">
            ₩{currentAmount.toLocaleString()}
          </span>

          <div className="flex flex-col gap-2 pt-1.5">
            <div className="relative">
              {/* 중앙값 눈금 */}
              <span
                className="absolute -top-1 w-0.5 h-3.5 bg-gray-light z-10 pointer-events-none"
                style={{ left: `${metrics.percent}%` }}
              />
              <input
                type="range"
                min="0"
                max="100"
                value={sliderVal}
                onChange={(e) => setSliderVal(Number(e.target.value))}
                className="relative touch-none w-full h-1.5 bg-bg-subtle rounded-lg appearance-none cursor-pointer accent-steel border border-border focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-light font-bold tabular-nums">
              <span>최소 {metrics.minAmount}</span>
              <span>중앙값 {metrics.medianAmount}</span>
              <span>최대 {metrics.maxAmount}</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-[12px]">
            <span className="font-black text-accent">견적 수수료 (2%)</span>
            <span className="font-black text-accent text-[13.5px] tabular-nums">₩{feeAmount.toLocaleString()}</span>
          </div>
          <p className="text-[12px] text-gray-light font-medium leading-normal">
            * 수수료는 현장 실측·1차 검토 포함, 전국 출장비 <strong className="text-navy font-black">0원</strong>.
          </p>
        </div>

        {/* 신뢰 근거 — 아이콘 칩 (제목·설명문 제거) */}
        <div className="flex flex-col gap-2.5 border-t border-border/60 pt-3">
          <div className="flex items-center gap-2 text-[12px] text-navy font-medium">
            <Database className="w-4 h-4 text-steel shrink-0" />실거래가 · 표준 품셈 산출
          </div>
          <div className="flex items-center gap-2 text-[12px] text-navy font-medium">
            <Award className="w-4 h-4 text-steel shrink-0" />KS · ASME 규격 적용
          </div>
          <div className="flex items-center gap-2 text-[12px] text-navy font-medium">
            <UserCheck className="w-4 h-4 text-steel shrink-0" />현장 실무 30년 직접 확인
          </div>
        </div>

        {/* 검증 실적 — borderless 행(클릭 시 실적 탭) */}
        <button
          onClick={() => setActiveTab('performance')}
          style={{ touchAction: 'manipulation' }}
          className="group flex items-center justify-between border-t border-border/60 pt-3 text-left cursor-pointer"
        >
          <div className="flex flex-col">
            <span className="text-[12px] font-bold text-gray">ZEROS 검증 실적</span>
            <span className="text-[12px] text-gray-light font-medium mt-0.5 tabular-nums">누적 246건 · 준수율 98.4%</span>
          </div>
          <span className={`inline-flex items-center gap-0.5 text-[12px] font-black ${accentTextCls} shrink-0 group-hover:underline underline-offset-4 decoration-2`}>
            상세 <ArrowRight className="w-3 h-3" />
          </span>
        </button>

        {/* 추천 다음 단계 CTA — 좌측 하단 박스와 상부 테두리 수평 정렬을 위한 여백 보정 */}
        <div className="flex flex-col gap-2 border-t border-border/60 pt-3 mt-8">
          <button
            onClick={() => setActiveTab('request')}
            style={{ touchAction: 'manipulation' }}
            className="flex items-center justify-center gap-1.5 w-full bg-steel hover:bg-navy text-bg py-3 rounded-custom text-[14.5px] font-black transition-colors duration-150 cursor-pointer"
          >
            {metrics.recommendation} 신청
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// 관리자 우측 "확인 패널" — 좌측 주제 탭(adminView)에 맞춰 주제별로 재구성된다.
// 실데이터 기반 핵심 지표 2×2 + 주제별 확인 체크리스트 + 주제 빠른 이동.
// ──────────────────────────────────────────────────────────────────────────────
type AdminViewKey = 'dashboard' | 'estimates' | 'visits' | 'customers' | 'performance' | 'notifications';
type Tone = 'navy' | 'steel' | 'success' | 'warning' | 'danger' | 'accent' | 'info' | 'gray';

const toneText: Record<Tone, string> = {
  navy: 'text-navy', steel: 'text-steel', success: 'text-success', warning: 'text-warning',
  danger: 'text-danger', accent: 'text-accent', info: 'text-info', gray: 'text-gray',
};
const toneDot: Record<Tone, string> = {
  navy: 'bg-navy', steel: 'bg-steel', success: 'bg-success', warning: 'bg-warning',
  danger: 'bg-danger', accent: 'bg-accent', info: 'bg-info', gray: 'bg-gray-light',
};

const StatTile: React.FC<{ label: string; value: string; tone?: Tone }> = ({ label, value, tone = 'navy' }) => (
  <div className="bg-bg border border-border rounded-custom px-3 py-2.5 flex flex-col gap-1 shadow-custom-sm">
    <span className="text-[11px] text-gray-light font-bold uppercase tracking-wider leading-none">{label}</span>
    <span className={`text-[19px] font-black tabular-nums tracking-tight leading-none ${toneText[tone]}`}>{value}</span>
  </div>
);

const ChecklistRow: React.FC<{ tone: Tone; text: string }> = ({ tone, text }) => (
  <div className="flex items-start gap-2 text-[12px] font-semibold text-gray leading-snug">
    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${toneDot[tone]}`} />
    <span>{text}</span>
  </div>
);

// 큰 금액을 패널 폭(w-72)에 맞게 억/만 단위로 압축 표기
const wonShort = (n: number): string => {
  if (n >= 100000000) return `${(n / 100000000).toFixed(n % 100000000 === 0 ? 0 : 1)}억`;
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}만`;
  return n.toLocaleString();
};

const isInThisWeek = (dateStr: string): boolean => {
  if (!dateStr) return false;
  // 'YYYY-MM-DD'(날짜만) 값은 UTC 자정으로 파싱돼 KST 기준 하루 밀린다 → KST 자정으로 해석.
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? `${dateStr}T00:00:00+09:00` : dateStr;
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return d >= start && d < end;
};

const ADMIN_VIEW_CHIPS: { key: AdminViewKey; label: string }[] = [
  { key: 'dashboard', label: '대시보드' },
  { key: 'estimates', label: '접수' },
  { key: 'visits', label: '방문' },
  { key: 'customers', label: '고객' },
  { key: 'performance', label: '실적' },
  { key: 'notifications', label: '알림' },
];

interface AdminContextPanelProps {
  adminView: AdminViewKey;
  setAdminView: (v: AdminViewKey) => void;
  estimates: Estimate[];
  visits: SiteVisit[];
  customers: Customer[];
  logs: NotificationLog[];
}

const AdminContextPanel: React.FC<AdminContextPanelProps> = ({
  adminView, setAdminView, estimates, visits, customers, logs,
}) => {
  const today = kstToday();
  const closed = ['수주성공', '수주실패', '취소', '보류'];

  // ── 견적 파생 지표 ──
  const total = estimates.length;
  const newCnt = estimates.filter(e => e.status === '접수완료').length;
  const reviewCnt = estimates.filter(e => e.status === '검토중' || e.status === '추가자료요청').length;
  const payWaitCnt = estimates.filter(e => e.status === '출장견적 결제대기').length;
  const visitWaitCnt = estimates.filter(e => e.status === '현장방문 예정' || e.status === '방문일정 조율중').length;
  const sentCnt = estimates.filter(e => e.status === '견적서 송부완료').length;
  const wonCnt = estimates.filter(e => e.status === '수주성공').length;
  const urgentCnt = estimates.filter(e => e.urgency && !closed.includes(e.status)).length;
  const winRate = total ? Math.round((wonCnt / total) * 100) : 0;
  const pipelineRevenue = estimates
    .filter(e => e.status === '견적서 작성중' || e.status === '견적서 송부완료')
    .reduce((a, c) => a + (c.estimated_amount || 0), 0);
  const confirmedRevenue = estimates
    .filter(e => e.status === '수주성공')
    .reduce((a, c) => a + (c.confirmed_contract_amount || 0), 0);

  // ── 방문 파생 지표 ──
  const vUp = visits.filter(v => v.visit_status === '예정').length;
  const vDone = visits.filter(v => v.visit_status === '완료').length;
  const vCancel = visits.filter(v => v.visit_status === '취소').length;
  const vWeek = visits.filter(v => v.visit_status === '예정' && isInThisWeek(v.visit_date)).length;

  // ── 고객 파생 지표 ──
  const cTotal = customers.length;
  const cNew = customers.filter(c => c.customer_grade === '신규').length;
  const cRepeat = customers.filter(c => c.customer_grade === '재문의').length;
  const cWon = customers.filter(c => c.customer_grade === '수주고객').length;

  // ── 알림 파생 지표 ──
  const lTotal = logs.length;
  const lToday = logs.filter(l => kstDateStr(l.sent_at) === today).length;
  const lOk = logs.filter(l => l.status === '발송완료').length;
  const lErr = logs.filter(l => l.status === '발송오류').length;

  const views: Record<AdminViewKey, {
    icon: React.ElementType; title: string; sub: string;
    stats: { label: string; value: string; tone?: Tone }[];
    checklist: { tone: Tone; text: string }[];
  }> = {
    dashboard: {
      icon: LayoutGrid, title: '종합 대시보드', sub: '전체 운영 현황 한눈에',
      stats: [
        { label: '전체 접수', value: `${total}건`, tone: 'navy' },
        { label: '신규 접수', value: `${newCnt}건`, tone: 'steel' },
        { label: '검토중', value: `${reviewCnt}건`, tone: 'warning' },
        { label: '수주성공', value: `${wonCnt}건`, tone: 'success' },
      ],
      checklist: [
        { tone: 'warning', text: `결제대기 ${payWaitCnt}건 — 출장견적비 입금 확인` },
        { tone: 'info', text: `방문 실측 대기 ${visitWaitCnt}건 일정 수립` },
        { tone: 'success', text: `수주 전환율 ${winRate}% — 실적 업데이트` },
      ],
    },
    estimates: {
      icon: FileText, title: '견적 접수관리', sub: '접수 건 처리 우선순위',
      stats: [
        { label: '신규 접수', value: `${newCnt}건`, tone: 'steel' },
        { label: '검토·보완', value: `${reviewCnt}건`, tone: 'warning' },
        { label: '결제대기', value: `${payWaitCnt}건`, tone: 'accent' },
        { label: '긴급 표기', value: `${urgentCnt}건`, tone: 'danger' },
      ],
      checklist: [
        { tone: 'danger', text: '긴급 건 우선 — 24시간 내 1차 검토 완료' },
        { tone: 'steel', text: '접수완료 → 검토중 전환 후 담당 배정' },
        { tone: 'accent', text: '결제대기 건은 토스 결제 안내 재발송' },
      ],
    },
    visits: {
      icon: CalendarRange, title: '현장방문 관리', sub: '레이저 실측 일정·진행',
      stats: [
        { label: '방문 예정', value: `${vUp}건`, tone: 'info' },
        { label: '금주 예정', value: `${vWeek}건`, tone: 'steel' },
        { label: '방문 완료', value: `${vDone}건`, tone: 'success' },
        { label: '취소', value: `${vCancel}건`, tone: 'gray' },
      ],
      checklist: [
        { tone: 'info', text: '예정 건 방문 1일 전 고객 일정 재확인' },
        { tone: 'steel', text: '현장 리스크 메모·다음 액션 기입 필수' },
        { tone: 'success', text: '완료 즉시 진단서 산출 단계로 전환' },
      ],
    },
    customers: {
      icon: Users2, title: '고객 정보 관리', sub: '고객 등급 분포',
      stats: [
        { label: '전체 고객', value: `${cTotal}명`, tone: 'navy' },
        { label: '신규', value: `${cNew}명`, tone: 'steel' },
        { label: '재문의', value: `${cRepeat}명`, tone: 'warning' },
        { label: '수주고객', value: `${cWon}명`, tone: 'success' },
      ],
      checklist: [
        { tone: 'success', text: '수주고객 — 후속 유지보수·증설 제안' },
        { tone: 'warning', text: '재문의 고객 — 미결 사유 확인 후 재접촉' },
        { tone: 'steel', text: '중요고객 등급 관리 및 우선 응대' },
      ],
    },
    performance: {
      icon: TrendingUp, title: '실적·파이프라인', sub: '매출 전환 현황',
      stats: [
        { label: '확정 매출', value: `₩${wonShort(confirmedRevenue)}`, tone: 'navy' },
        { label: '파이프라인', value: `₩${wonShort(pipelineRevenue)}`, tone: 'steel' },
        { label: '수주 전환율', value: `${winRate}%`, tone: 'success' },
        { label: '견적 송부', value: `${sentCnt}건`, tone: 'accent' },
      ],
      checklist: [
        { tone: 'success', text: '확정 매출 = 수주성공 계약금 합계' },
        { tone: 'steel', text: '파이프라인 = 작성중·송부완료 예상금액' },
        { tone: 'navy', text: '전환율 추이로 영업 병목 단계 점검' },
      ],
    },
    notifications: {
      icon: Bell, title: '알림 발송 로그', sub: '카카오·문자 발송 현황',
      stats: [
        { label: '총 발송', value: `${lTotal}건`, tone: 'navy' },
        { label: '오늘 발송', value: `${lToday}건`, tone: 'steel' },
        { label: '발송완료', value: `${lOk}건`, tone: 'success' },
        { label: '발송오류', value: `${lErr}건`, tone: 'danger' },
      ],
      checklist: [
        { tone: 'danger', text: '발송오류 건 — 번호 정정 후 재발송' },
        { tone: 'steel', text: '상태 변경 시 자동 알림 정상 동작 확인' },
        { tone: 'success', text: '접수·송부·수주 단계별 템플릿 점검' },
      ],
    },
  };

  const cfg = views[adminView] || views.dashboard;
  const Icon = cfg.icon;

  return (
    <aside className="w-full h-full flex flex-col shrink-0 select-none overflow-y-auto bg-bg-subtle">
      {/* 상단 네이비 액센트 바 — 좌측 관리 사이드바와 동일 시그니처로 양측 프레임을 잇는다 */}
      <div className="h-1 w-full bg-navy shrink-0" />

      <div className="py-5 pl-5 pr-6 flex flex-col gap-4">
        {/* 헤더 — 좌측에서 선택한 관리 주제를 그대로 반향 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-gray-light font-bold uppercase tracking-wider">확인 패널</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> 실시간
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-custom bg-navy/8 text-navy flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </span>
            <div className="flex flex-col leading-tight">
              <h3 className="text-[15px] font-black text-navy tracking-tight">{cfg.title}</h3>
              <span className="text-[11.5px] font-semibold text-gray-light">{cfg.sub}</span>
            </div>
          </div>
        </div>

        {/* 주제별 핵심 지표 2×2 */}
        <div className="grid grid-cols-2 gap-2">
          {cfg.stats.map((s) => (
            <StatTile key={s.label} label={s.label} value={s.value} tone={s.tone} />
          ))}
        </div>

        {/* 주제별 확인 체크리스트 */}
        <div className="bg-bg border border-border rounded-custom p-4 flex flex-col gap-2.5 shadow-custom-sm">
          <span className="text-[11px] font-black text-navy uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-steel shrink-0" /> 확인 체크리스트
          </span>
          <div className="flex flex-col gap-2 border-t border-border/60 pt-2.5">
            {cfg.checklist.map((c, i) => (
              <ChecklistRow key={i} tone={c.tone} text={c.text} />
            ))}
          </div>
        </div>

        {/* 주제 빠른 이동 — 좌측 탭 미러(현재 주제 강조) */}
        <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
          <span className="text-[11px] font-black text-navy uppercase tracking-wider">주제 빠른 이동</span>
          <div className="grid grid-cols-3 gap-1.5">
            {ADMIN_VIEW_CHIPS.map((v) => {
              const active = v.key === adminView;
              return (
                <button
                  key={v.key}
                  onClick={() => setAdminView(v.key)}
                  className={`px-2 py-1.5 rounded-custom text-[11.5px] font-bold border transition-all duration-150 ${
                    active
                      ? 'bg-navy border-navy text-bg shadow-sm'
                      : 'bg-bg border-border text-gray hover:text-navy hover:border-navy/40'
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 운영 원칙 한 줄 */}
        <p className="text-[11px] text-gray-light font-medium leading-normal border-t border-border/60 pt-3 flex items-start gap-1.5">
          <Clock className="w-3.5 h-3.5 text-steel shrink-0 mt-px" />
          <span>신규 사전진단 요청은 <strong className="text-navy font-black">24시간 이내</strong> 1차 엔지니어링 검토를 완료합니다.</span>
        </p>
      </div>
    </aside>
  );
};
