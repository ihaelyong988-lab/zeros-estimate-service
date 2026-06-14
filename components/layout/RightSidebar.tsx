'use client';

import React, { useEffect } from 'react';
import { useShell } from '@/lib/context/ShellContext';
import { AlertCircle, ArrowRight, ChevronLeft } from 'lucide-react';

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
  } = useShell();

  // 현재 활성화된 주제 선택
  const activeKey = selectedBudget || selectedMenu || '배관공사';
  const metrics = metricsMap[activeKey] || metricsMap['배관공사'];

  // 카테고리가 갱신될 때마다 슬라이더 위치를 기본 권장 퍼센트로 자동 동기화
  useEffect(() => {
    setSliderVal(metrics.percent);
  }, [activeKey, metrics.percent, setSliderVal]);

  if (!isUserMode) {
    // 관리자 모드일 때는 우측 사이드바에 퀵 가이드나 바로가기를 노출
    return (
      <aside className="w-full h-full p-5 flex flex-col gap-6 shrink-0 select-none overflow-y-auto bg-bg-subtle">
        <div>
          <div className="flex items-center gap-1.5 px-1 mb-3 text-navy">
            <AlertCircle className="w-4 h-4 text-steel animate-bounce" />
            <h3 className="text-[12px] font-black uppercase tracking-wider">업무 진행 가이드</h3>
          </div>
          <div className="bg-bg border border-border p-4 rounded-custom flex flex-col gap-3 shadow-custom-sm">
            <p className="text-[12px] text-gray leading-relaxed font-medium">
              새로 접수된 사전진단 요청은 <span className="font-extrabold text-navy border-b border-steel/30 pb-0.5">24시간 이내</span>에 1차 엔지니어링 계산 자료 검토를 완료해야 합니다.
            </p>
            <div className="border-t border-border/60 pt-3 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-[12px] font-bold text-gray">
                <span className="w-2 h-2 rounded-full bg-warning"></span>
                출장 결제대기 건 확인
              </div>
              <div className="flex items-center gap-2 text-[12px] font-bold text-gray">
                <span className="w-2 h-2 rounded-full bg-info"></span>
                금주 레이저 실측일정 수립
              </div>
              <div className="flex items-center gap-2 text-[12px] font-bold text-gray">
                <span className="w-2 h-2 rounded-full bg-success"></span>
                수주 완료 견적 실적 업데이트
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  // 실시간 슬라이더 값에 의거한 "견적 예상가" 및 "2% 견적 수수료" 공식 산출
  const currentAmount = Math.round(metrics.minVal + ((metrics.maxVal - metrics.minVal) * (sliderVal / 100)));
  const feeAmount = Math.round(currentAmount * 0.02);

  // 슬라이더가 권장 위치(중앙값)에서 멀어진 정도 — 분석 신뢰도 산출에 사용
  const diff = Math.abs(sliderVal - metrics.percent);

  // 유사 현장 중앙값(권장 위치) 대비 현재 슬라이더 견적의 편차 — 고객 정량 비교용
  const medianVal = Math.round(metrics.minVal + (metrics.maxVal - metrics.minVal) * (metrics.percent / 100));
  const medianDeltaPct = medianVal > 0 ? ((currentAmount - medianVal) / medianVal) * 100 : 0;
  const medianDeltaLabel = `${medianDeltaPct >= 0 ? '+' : ''}${medianDeltaPct.toFixed(1)}%`;
  // 권장 구간 근접도 기반 분석 신뢰도 — 극단값으로 갈수록 보수적으로 하향
  const analysisConfidence = Math.max(82, 99.8 - diff * 0.32).toFixed(1);

  // 좌측 선택과 색을 연결: 외주제작(FAB) 계열은 오렌지, 그 외는 스틸블루
  const fabKeys = ['spool', 'skid', 'structure'];
  const isFab = fabKeys.includes(activeKey);
  const accentBarBg = isFab ? 'bg-accent' : 'bg-steel';
  const accentTextCls = isFab ? 'text-accent' : 'text-steel';
  const fabLabelMap: Record<string, string> = { spool: '배관 SPOOL Module', skid: 'SKID 제작', structure: 'Structure 제작' };
  const budgetLabelMap: Record<string, string> = { small: '온라인 간편검토', medium: '출장견적', large: '프로젝트 사전진단', unknown: '금액 미정' };
  const displayName = selectedBudget
    ? (budgetLabelMap[selectedBudget] || metrics.recommendation)
    : (fabLabelMap[activeKey] || selectedMenu || activeKey);

  return (
    <aside className="w-full h-full flex flex-col shrink-0 select-none overflow-y-auto bg-bg-subtle">
      {/* 상단 액센트 바 — 좌측 선택과 색으로 연결 */}
      <div className={`h-1 w-full ${accentBarBg} shrink-0`} />

      {/* 우측 가장자리(브라우저 끝)는 좌측(20px)보다 넉넉한 28px — 화면 끝 답답함 해소 */}
      <div className="py-5 pl-5 pr-7 flex flex-col gap-4">
        {/* 헤더: 좌측에서 선택한 대상을 그대로 반향 */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] text-gray-light font-bold uppercase tracking-wider">선택한 검토 대상</span>
            <span className="inline-flex items-center gap-1 text-[12px] font-black text-success">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> 실시간 검토
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ChevronLeft className={`w-4 h-4 ${accentTextCls} shrink-0`} />
            <h3 className={`text-[16px] font-black ${accentTextCls} tracking-tight leading-tight`}>{displayName}</h3>
          </div>
          <p className="text-[12px] font-bold text-gray-light">
            실거래 {metrics.sampleCount}건 대조 · 분석 신뢰도 {analysisConfidence}%
          </p>
        </div>

        {/* 평균 소요일 — borderless 행 */}
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <span className="text-[12px] font-bold text-gray">평균 1차 검토 소요</span>
          <span className="text-[15px] font-black text-navy tabular-nums">{metrics.avgDays}일 이내</span>
        </div>

        {/* 예상 견적범위 — 유일하게 강조하는 카드(핵심 인터랙션: 슬라이더) */}
        <div className="bg-bg border border-border rounded-custom p-4 flex flex-col gap-3 shadow-custom-sm">
          <span className="text-[12px] font-bold text-navy">예상 견적범위</span>
          <div className="flex flex-col gap-1">
            <span className="text-[12px] text-gray-light font-bold uppercase tracking-wider">견적 예상가</span>
            <span className="text-2xl font-black text-navy tracking-tight tabular-nums leading-none">
              ₩{currentAmount.toLocaleString()}
            </span>
            <span className="text-[12px] font-bold text-gray-light tabular-nums">
              중앙값 {metrics.medianAmount} 대비
              <span className={`ml-1 font-black ${medianDeltaPct > 0 ? 'text-accent' : 'text-success'}`}>{medianDeltaLabel}</span>
            </span>
          </div>

          <div className="flex flex-col gap-2 pt-0.5">
            <input
              type="range"
              min="0"
              max="100"
              value={sliderVal}
              onChange={(e) => setSliderVal(Number(e.target.value))}
              className="touch-none w-full h-1.5 bg-bg-subtle rounded-lg appearance-none cursor-pointer accent-steel border border-border focus:outline-none"
            />
            <div className="flex items-center justify-between text-[12px] text-gray-light font-black tabular-nums">
              <span>최소 {metrics.minAmount}</span>
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

        {/* 예상가 신뢰 근거 — borderless 리스트(줄마다 아이콘 제거) */}
        <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
          <span className="text-[12px] font-black text-navy uppercase tracking-wider">예상가 신뢰 근거</span>
          {[
            '실제 거래가와 표준 품셈으로 계산합니다.',
            'KS·ASME 자재 규격을 그대로 적용합니다.',
            '현장 실무30년 기준으로 직접 확인합니다.',
          ].map((t) => (
            <span key={t} className="text-[12px] text-gray font-medium leading-normal pl-3 border-l-2 border-border">{t}</span>
          ))}
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
          <p className="text-[12px] text-gray-light font-medium leading-normal">{metrics.recommendationDesc}</p>
        </div>
      </div>
    </aside>
  );
};
