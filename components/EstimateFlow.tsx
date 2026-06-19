'use client';

import React from 'react';
import { Check } from 'lucide-react';

// 제공 이미지 그대로 — 좌측 헤드라인 고정 + 가운데 한 줄 FLOW + 연회색 체크 알약 3개
const STEPS = ['고객 요청', '데이터 수집', '데이터 가공', '데이터 정제', 'AI툴 검토', '적합성 평가', '고객 제출'];

const CHECKS = [
  '공종 · 현장 유형 · 예상 예산 밴드 확인',
  '사진 · 도면 · 치수 자료 충분성 점검',
  '운전 조건(유량 · 온도 · 압력) 수집',
];

export const EstimateFlow: React.FC = () => (
  <div className="flex flex-col gap-3 select-none">
    {/* 헤드라인(좌측 고정) + 한 줄 FLOW(가운데로 벌어짐) */}
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-1.5 h-5 bg-accent rounded-full" />
        <h2 className="text-[15px] font-black text-navy tracking-tight">견적 작업 FLOW</h2>
      </div>
      <div className="flex-1 flex flex-nowrap items-center justify-center gap-x-1 text-[12px] font-semibold text-gray whitespace-nowrap overflow-x-auto no-scrollbar">
        {STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <span className="whitespace-nowrap">
              {s === 'AI툴 검토' ? (
                <>
                  <span className="text-[11px] font-bold">AI툴</span> 검토
                </>
              ) : (
                s
              )}
            </span>
            {i < STEPS.length - 1 && <span className="text-border">{'>'}</span>}
          </React.Fragment>
        ))}
      </div>
    </div>

    {/* 체크 3개 — 알약 배경 없이 평문 인라인, 가로 분산 */}
    <div className="flex flex-wrap gap-x-6 gap-y-2">
      {CHECKS.map((c) => (
        <span
          key={c}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray"
        >
          <span className="shrink-0 w-4 h-4 rounded-full bg-success/15 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-success" strokeWidth={3.5} />
          </span>
          {c}
        </span>
      ))}
    </div>
  </div>
);
