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
      {/* 간결한 텍스트 스텝퍼 — 박스·번호 없이, chevron으로 방향만 */}
      <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
        <div className="flex items-center gap-1 min-w-max">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.label}>
              <button
                onClick={() => setActive(i)}
                style={{ touchAction: 'manipulation' }}
                className={`group relative shrink-0 px-1.5 py-1 text-[13.5px] leading-none whitespace-nowrap transition-colors duration-200 cursor-pointer ${
                  i === active ? 'text-navy font-black' : 'text-gray-light font-semibold hover:text-steel'
                }`}
              >
                {s.label}
                <span
                  className={`absolute left-1.5 right-1.5 -bottom-1 h-[2px] rounded-full bg-accent transition-opacity duration-200 ${
                    i === active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                  }`}
                />
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-border shrink-0" strokeWidth={2.5} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 클릭 시 카드 형식 세부 검토 항목 (단계 라벨 반복 없음 — 제목 중복 제거) */}
      <div key={active} className="flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-300">
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-3.5 bg-steel/70 rounded-full" />
          <span className="text-[12px] font-mono font-bold text-steel/80 uppercase tracking-wider">{step.en}</span>
          <span className="text-[12px] text-gray-light font-bold">· 세부 검토 항목</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {step.items.map((item) => (
            <div
              key={item}
              className="flex items-start gap-2 bg-bg border border-border rounded-custom px-3 py-2.5 shadow-sm hover:border-steel/50 hover:shadow-custom-sm transition-all"
            >
              <span className="shrink-0 w-4 h-4 rounded-full bg-success/10 border border-success/30 flex items-center justify-center mt-0.5">
                <Check className="w-2.5 h-2.5 text-success" strokeWidth={3} />
              </span>
              <span className="text-[12px] font-semibold text-gray leading-snug">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
