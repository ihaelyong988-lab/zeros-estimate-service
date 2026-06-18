'use client';

import React, { useState } from 'react';
import { ChevronRight, Check } from 'lucide-react';

interface FlowStep {
  label: string;
  en: string;
  items: string[];
}

// 견적 = 데이터 파이프라인 (Intake → Delivery). 각 단계의 세부 검토 항목.
const STEPS: FlowStep[] = [
  {
    label: '고객 요청', en: 'Intake · Problem Framing',
    items: [
      '공종 · 현장 유형 · 예상 예산 밴드 확인',
      '사진 · 도면 · 치수 자료 충분성 점검',
      '운전 조건(유량 · 온도 · 압력) 수집',
    ],
  },
  {
    label: '데이터 수집', en: 'Data Collection',
    items: [
      '실거래 단가 표본 매칭',
      '표준 품셈(노무 · 재료) 기준 적용',
      '유사 현장 시공 이력 대조',
    ],
  },
  {
    label: '데이터 가공', en: 'Feature Engineering',
    items: [
      'BOM 물량 산출(관 · 밸브 · 피팅)',
      '관경 · 유량 적정성 계산',
      '작업 난이도 계수 산정',
    ],
  },
  {
    label: '데이터 정제', en: 'Cleansing · Outlier Removal',
    items: [
      '중복 · 결측 항목 제거',
      '거품 단가 이상치(z-score) 필터링',
      '단위 · 기준 정합성 검증',
    ],
  },
  {
    label: 'AI툴 검증', en: 'AI Validation',
    items: [
      '표준 대비 단가 정합성 교차검증',
      '물량–도면 일치도 자동 점검',
      '이상 항목 플래그 · 신뢰도 산출',
    ],
  },
  {
    label: '적합성 검토', en: 'Human-in-the-loop Review',
    items: [
      '현장 리스크(고소 · 협소 · 가동중) 반영',
      '공학적 타당성 최종 검토 (PM)',
      '누락 · 과다 항목 보정',
    ],
  },
  {
    label: '고객 제출', en: 'Delivery',
    items: [
      '산출 근거 투명 정리',
      '예상 범위 · 예산 밴드 명시',
      '다음 액션(추가자료 · 실측 · 계약) 안내',
    ],
  },
];

export const EstimateFlow: React.FC = () => {
  const [active, setActive] = useState(0);
  const step = STEPS[active];

  return (
    <div className="flex flex-col gap-4 select-none">
      {/* 헤드라인 — 박스 없이, 액센트 인디케이터 + 진행 표시만 */}
      <div className="flex items-center gap-2.5">
        <span className="w-1.5 h-5 bg-accent rounded-full shrink-0" />
        <h2 className="text-[15px] font-black text-navy tracking-tight">견적 작업 FLOW</h2>
        <span className="text-[12px] font-bold text-gray-light">AI 데이터 파이프라인</span>
        <span className="ml-auto text-[12px] font-black tabular-nums text-accent shrink-0">
          {active + 1}<span className="text-gray-light font-bold"> / {STEPS.length}</span>
        </span>
      </div>

      {/* 스텝퍼 — 활성 단계만 액센트 알약으로 하이라이트, 나머지는 절제된 텍스트 */}
      <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
        <div className="flex items-center gap-1 min-w-max">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.label}>
              <button
                onClick={() => setActive(i)}
                style={{ touchAction: 'manipulation' }}
                className={`shrink-0 px-2.5 py-1.5 rounded-full text-[13px] leading-none whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  i === active
                    ? 'bg-accent text-white font-black shadow-sm shadow-accent/25'
                    : 'text-gray-light font-semibold hover:text-steel hover:bg-bg-subtle'
                }`}
              >
                {s.label}
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-border shrink-0" strokeWidth={2.5} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 활성 단계 세부 검토 항목 칩 */}
      <div key={active} className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
        {step.items.map((item) => (
          <div
            key={item}
            className="inline-flex items-center gap-1.5 bg-bg-subtle/60 border border-border/70 rounded-full px-3 py-1.5 hover:border-steel/50 transition-all select-none"
          >
            <span className="shrink-0 w-4 h-4 rounded-full bg-success/15 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-success" strokeWidth={3.5} />
            </span>
            <span className="text-[12px] font-semibold text-gray leading-none">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
