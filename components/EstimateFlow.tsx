'use client';

import React, { useState } from 'react';

// 견적 작업 FLOW — 7단계 밑줄 탭. 누르는 것(탭)만 또렷한 인터랙션으로, 설명은 박스 없이 텍스트로.
// 단계 문구는 데이터(맵)로 분리 — 추후 영업 표현으로 교체 용이.
const FLOW_STEPS: { k: string; t: string; d: string }[] = [
  { k: '고객 요청', t: '요청사항 수렴 · 정합', d: '예산 · 일정 · 특이 공사 요건 등 비정형 요청을 정합해 검토 출발점을 확정합니다.' },
  { k: '데이터 수집', t: '원천 제공자료 확보', d: '설계 도면(DWG/PDF) · 현장 사진 · 기존 제원서 등 검토에 필요한 원천 자료를 수집합니다.' },
  { k: '데이터 가공', t: '규격 · 물량 추출(파싱)', d: '고해상도 OCR과 제원 파서로 자재 규격과 물량을 정형 데이터로 추출합니다.' },
  { k: '데이터 정제', t: '이상 단가 탐지(EDA)', d: '표준 품셈 · 실거래 DB와 대조해 비정상 고단가를 사전에 감지 · 필터링합니다.' },
  { k: 'AI툴 검토', t: '최적 예산 밴드 추론', d: '공사비 회귀 예측 모델로 공사 범위 · 현장 조건에 맞는 적정 예산 대역을 산출합니다.' },
  { k: '적합성 평가', t: '전문 PM 교차 검증', d: '현장 30년 경력 PM이 반입 동선 · 가동중단 조건 등 현장 변수를 교차 보정합니다.' },
  { k: '고객 제출', t: '안심 검토서 발행', d: '적정 예산 밴드 · 리스크 등급 · 필수 자재 요건을 담은 검토 결과서를 발행합니다.' },
];

export const EstimateFlow: React.FC = () => {
  const [active, setActive] = useState(0);
  const step = FLOW_STEPS[active];

  return (
    <div className="select-none shrink-0">
      {/* 헤드라인 + 안내 */}
      <div className="flex items-center gap-2.5">
        <span className="w-1.5 h-5 bg-accent rounded-full shrink-0" />
        <h2 className="text-[16px] font-black text-navy tracking-tight">견적 작업 FLOW</h2>
        <span className="text-[12.5px] font-semibold text-gray-light">단계를 누르면 내용이 펼쳐집니다</span>
      </div>

      {/* 밑줄 탭 — 박스 대신 인터랙션이 또렷한 탭 레일. 활성=네이비 + 주황 밑줄 */}
      <div className="flex gap-0.5 mt-3.5 border-b border-border">
        {FLOW_STEPS.map((s, i) => (
          <button
            key={s.k}
            type="button"
            onClick={() => setActive(i)}
            style={{ touchAction: 'manipulation' }}
            className={`flex-1 whitespace-nowrap px-1 py-2 text-[13px] -mb-px border-b-[2.5px] transition-colors duration-150 cursor-pointer ${
              i === active
                ? 'text-navy font-extrabold border-accent'
                : 'text-gray font-semibold border-transparent hover:text-navy'
            }`}
          >
            {s.k}
          </button>
        ))}
      </div>

      {/* 선택 단계 설명 — 박스 없이 번호 + 제목 + 설명 */}
      <div className="flex gap-3 pt-3.5">
        <span className="text-[13px] font-black font-mono text-accent pt-0.5 shrink-0">{String(active + 1).padStart(2, '0')}</span>
        <div className="min-w-0">
          <div className="text-[16px] font-black text-navy tracking-tight">{step.t}</div>
          <p className="text-[13.5px] font-semibold text-gray leading-relaxed mt-1">{step.d}</p>
        </div>
      </div>
    </div>
  );
};
