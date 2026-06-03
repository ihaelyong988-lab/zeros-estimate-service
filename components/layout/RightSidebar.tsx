'use client';

import React, { useEffect } from 'react';
import { useShell } from '@/lib/context/ShellContext';
import { AlertCircle, Calendar, Users, BarChart3, ArrowRight, ShieldCheck } from 'lucide-react';

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
            <h3 className="text-xs font-black uppercase tracking-wider">업무 진행 가이드</h3>
          </div>
          <div className="bg-bg border border-border p-4 rounded-custom flex flex-col gap-3 shadow-custom-sm">
            <p className="text-[12px] text-gray leading-relaxed font-medium">
              새로 접수된 사전진단 요청은 <span className="font-extrabold text-navy border-b border-steel/30 pb-0.5">24시간 이내</span>에 1차 엔지니어링 계산 자료 검토를 완료해야 합니다.
            </p>
            <div className="border-t border-border/60 pt-3 flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-gray">
                <span className="w-2 h-2 rounded-full bg-warning"></span>
                출장 결제대기 건 확인
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray">
                <span className="w-2 h-2 rounded-full bg-info"></span>
                금주 레이저 실측일정 수립
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray">
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

  // 실시간 슬라이더 위치에 비례한 "유사 현장 데이터 수(n)" 통계적 감쇠 연동 수식
  // 권장값(percent)에 가까울수록 최댓값, 극단값(0% 또는 100%)으로 갈수록 표본 빈도가 수렴하여 희소해지는 B2B 시뮬레이션
  const diff = Math.abs(sliderVal - metrics.percent);
  const sampleFactor = Math.max(0.08, 1 - (diff / 50)); 
  const currentSampleCount = Math.max(1, Math.round(metrics.sampleCount * sampleFactor));

  return (
    <aside className="w-full h-full p-5 flex flex-col gap-6 shrink-0 select-none overflow-y-auto bg-bg-subtle">
      <div>
        <div className="flex items-center gap-1.5 px-1 mb-4">
          <BarChart3 className="w-4 h-4 text-steel animate-pulse" />
          <h3 className="text-xs font-black text-navy uppercase tracking-wider">데이터 기반 사전판단</h3>
        </div>

        <div className="flex flex-col gap-5">
          {/* 타겟 도메인 표시 */}
          <div className="bg-bg border border-border/80 p-4 rounded-custom flex flex-col gap-1.5 shadow-sm">
            <span className="text-[10px] text-gray-light font-bold uppercase tracking-wider">선택 공사 범위</span>
            <span className="text-[13.5px] text-navy font-black">
              {selectedBudget ? `예산규모: ${metricsMap[selectedBudget]?.recommendation || ''}` : selectedMenu}
            </span>
          </div>

          {/* 평균 검토 소요일 */}
          <div className="bg-bg border border-border/80 p-4 rounded-custom flex flex-col gap-2.5 shadow-sm">
            <div className="flex items-center gap-2 text-gray">
              <Calendar className="w-4 h-4 text-gray-light" />
              <span className="text-xs font-bold">평균 1차 검토 소요일</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-navy tracking-tight tabular-nums">{metrics.avgDays}</span>
              <span className="text-xs font-bold text-gray">일 이내</span>
            </div>
            <p className="text-[10.5px] text-gray-light font-bold leading-normal">
              *접수 후 전담 엔지니어가 기초 도면/사진을 분석하는 실 소요 시간입니다.
            </p>
          </div>

          {/* 예상 견적범위 밴드 - 슬라이더 좌우 조작 활성화 */}
          <div className="bg-bg border border-border/80 p-4 rounded-custom flex flex-col gap-3.5 shadow-sm">
            <div className="flex items-center gap-2 text-gray">
              <BarChart3 className="w-4 h-4 text-gray-light" />
              <span className="text-xs font-bold font-sans">예상 견적범위 밴드</span>
            </div>
            
            {/* 좌우 드래그 스크롤바 (input range) */}
            <div className="flex flex-col gap-1.5 pt-1">
              <input
                type="range"
                min="0"
                max="100"
                value={sliderVal}
                onChange={(e) => setSliderVal(Number(e.target.value))}
                className="touch-none w-full h-1.5 bg-bg-subtle rounded-lg appearance-none cursor-pointer accent-steel border border-border focus:outline-none"
              />
              <div className="flex items-center justify-between text-[10px] text-gray-light font-black mt-1.5 tabular-nums">
                <span>{metrics.minAmount} (최소)</span>
                <span>{metrics.maxAmount} (최대)</span>
              </div>
            </div>

            {/* 견적 예상가 출력 (중앙 예상가 ➔ 견적 예상가로 변경) */}
            <div className="flex items-center justify-between bg-bg-subtle border border-border/60 rounded-custom p-2.5 text-xs">
              <span className="font-extrabold text-navy text-[11px]">견적 예상가</span>
              <span className="font-black text-steel text-[13px] tabular-nums">
                ₩{currentAmount.toLocaleString()}
              </span>
            </div>

            {/* 견적 수수료 출력 (견적 예상가의 2% 실시간 동적 계산) */}
            <div className="flex items-center justify-between bg-[#E0701A]/5 border border-[#E0701A]/20 rounded-custom p-2.5 text-xs">
              <span className="font-black text-accent text-[11px]">견적 수수료 (2%)</span>
              <span className="font-black text-accent text-[13px] tabular-nums">
                ₩{feeAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 유사 현장 표본 수 - 실시간 슬라이더 연동 */}
          <div className="bg-bg border border-border/80 p-4 rounded-custom flex flex-col gap-2 shadow-sm">
            <div className="flex items-center gap-2 text-gray">
              <Users className="w-4 h-4 text-gray-light" />
              <span className="text-xs font-bold font-sans">유사 현장 데이터 수</span>
            </div>
            <div className="flex items-baseline gap-1 whitespace-nowrap overflow-hidden">
              <span className="text-[15px] font-black text-steel tracking-tight tabular-nums">
                n = {currentSampleCount}
              </span>
              <span className="text-[10px] font-bold text-gray-light">
                건 실시간 매핑 (최대 {metrics.sampleCount}건)
              </span>
            </div>
          </div>

          {/* 추천 다음 단계 CTA */}
          <div className="bg-bg border border-steel/25 p-5 rounded-custom flex flex-col gap-3 shadow-custom-sm relative overflow-hidden">
            {/* 세련된 아이콘 배치 */}
            <div className="absolute right-4 top-4 text-steel/15 select-none z-0">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="flex flex-col gap-1 z-10">
              <span className="text-[10px] text-steel font-black uppercase tracking-wider">추천 검토 경로</span>
              <h4 className="text-[13.5px] font-black text-navy tracking-tight">{metrics.recommendation}</h4>
            </div>

            <p className="text-[11px] text-gray leading-relaxed font-medium z-10">
              {metrics.recommendationDesc}
            </p>

            <button
              onClick={() => setActiveTab('request')}
              style={{ touchAction: 'manipulation' }}
              className="mt-1 flex items-center justify-center gap-1.5 w-full bg-steel hover:bg-navy text-bg py-2.5 rounded-custom text-xs font-black transition-all duration-150 active:scale-[0.98] z-10 shadow-sm cursor-pointer"
            >
              출장견적 바로 신청
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </aside>
  );
};
