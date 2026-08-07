'use client';

import React from 'react';
import { Estimate } from '@/types/estimate';
import { supplyAmountOf } from '@/lib/quote/amounts';
import { menuDisplayName } from '@/lib/constants/menu';
import { ShieldCheck, Printer } from 'lucide-react';

interface PrintableScopeSheetProps {
  estimate: Estimate;
}

// 고객에게 종이로 전달되는 문서다. 값이 없으면 그럴듯한 기본 문구를 인쇄하지 않고 '해당 없음'으로 비운다.
const NONE = '해당 없음';

export const PrintableScopeSheet: React.FC<PrintableScopeSheetProps> = ({ estimate }) => {

  const handlePrint = () => {
    window.print();
  };

  // 금액은 공급가액(VAT 별도) 단일 정의로 읽는다.
  const supplyAmount = supplyAmountOf(estimate);

  return (
    <div className="bg-bg border border-border p-6.5 rounded-custom shadow-custom-sm flex flex-col gap-6 select-none font-sans max-w-4xl mx-auto py-4">
      
      {/* 화면 제어 인터페이스 (인쇄 시 숨김 - noprint class 연동) */}
      <div className="flex items-center justify-between border-b border-border pb-4 bg-bg-subtle/50 p-4 rounded-custom print:hidden">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-black text-navy">B2B 범위 고정 사전진단 리포트 인쇄</span>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 bg-steel hover:bg-navy text-bg px-4 py-2.5 rounded-custom text-xs font-black transition-all shadow-md active:scale-95"
        >
          <Printer className="w-4 h-4" />
          진단서 인쇄 및 PDF 저장
        </button>
      </div>

      {/* 인쇄 영역 시작 */}
      <div className="print-area p-8 print:p-0 flex flex-col gap-6 text-navy text-xs leading-relaxed font-sans bg-bg">
        
        {/* 리포트 상단 타이틀 및 로고 */}
        <div className="flex justify-between items-start border-b-2 border-navy pb-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-base font-black tracking-widest text-steel">ZEROS ENGINEERING REPORT</span>
            <h1 className="text-2xl font-black tracking-tight text-navy">범위 고정 사전진단 검토서</h1>
            <div className="flex items-center gap-2 text-gray font-bold text-[10px] mt-1.5 tabular-nums">
              <span>문서 번호: {estimate.estimate_no}</span>
              <span>•</span>
              <span>작성일자: {new Date().toLocaleDateString('ko-KR')}</span>
            </div>
          </div>
          {/* 발행 주체 표기 — 인증·검증 마크가 아니다(근거 없는 보증 표현 금지). */}
          <div className="border-2 border-steel text-steel rounded-custom px-3 py-1 flex flex-col items-center justify-center font-black select-none opacity-90 scale-95 shrink-0">
            <span className="text-[8px] tracking-widest">발행</span>
            <span className="text-sm tracking-tight">ZEROS</span>
          </div>
        </div>

        {/* 1. 기본 고객 및 의뢰 개요 */}
        <div className="flex flex-col gap-2.5">
          <h2 className="text-[13px] font-black text-navy border-b border-border/80 pb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-steel rounded-custom block"></span>
            1. 고객사 및 의뢰 기본 현황
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 bg-bg-subtle/40 p-4.5 rounded-custom border border-border">
            <div className="flex justify-between">
              <span className="text-gray font-bold">고객명 (회사)</span>
              <span className="font-extrabold text-navy">{estimate.customer_name} ({estimate.company_name || '개인'})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray font-bold">연락처 / 이메일</span>
              <span className="font-extrabold text-navy tabular-nums">{estimate.phone} / {estimate.email || NONE}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray font-bold">현장 종류 / 업종</span>
              <span className="font-extrabold text-navy">{estimate.site_type} / {estimate.customer_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray font-bold">공종 구분</span>
              <span className="font-extrabold text-navy text-steel">{menuDisplayName(estimate.work_type)}</span>
            </div>
            <div className="flex justify-between col-span-2 border-t border-border/60 pt-3">
              <span className="text-gray font-bold shrink-0">현장 설치 주소</span>
              <span className="font-extrabold text-navy leading-normal text-right">{estimate.site_address || NONE}</span>
            </div>
          </div>
        </div>

        {/* 2. 엔지니어 정밀 검토 스코프 */}
        <div className="flex flex-col gap-2.5">
          <h2 className="text-[13px] font-black text-navy border-b border-border/80 pb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-steel rounded-custom block"></span>
            2. 설비 엔지니어링 1차 진단 스코프
          </h2>
          
          <div className="border border-border rounded-custom overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-bg-subtle text-[10px] text-gray font-bold border-b border-border uppercase">
                <tr>
                  <th className="p-3">진단 항목</th>
                  <th className="p-3">현장 조건 및 세부 사양</th>
                  <th className="p-3 text-center">검토 기준 등급</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                <tr>
                  <td className="p-3 font-bold text-navy">요청 사양 및 목적</td>
                  <td className="p-3 text-gray leading-relaxed">{estimate.work_purpose || NONE}</td>
                  <td className="p-3 text-center" rowSpan={3}>
                    <span className="px-2 py-0.5 rounded-custom text-[10px] font-black border border-steel/30 text-steel bg-steel/5">
                      정확도 등급: {estimate.accuracy_grade || '미지정'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-navy">현장 물리적 제약</td>
                  <td className="p-3 text-gray leading-relaxed">
                    {estimate.description || NONE}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-navy">요구 배관/장비 사양</td>
                  <td className="p-3 text-gray leading-relaxed">
                    {estimate.request_detail || NONE}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. 예산 범위 및 권장 시장가 밴드 */}
        <div className="flex flex-col gap-2.5">
          <h2 className="text-[13px] font-black text-navy border-b border-border/80 pb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-3.5 bg-steel rounded-custom block"></span>
            3. 원가 구조 분석 및 권장 예산안
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-bg-subtle border border-border p-3.5 rounded-custom">
              <span className="text-gray font-bold block mb-0.5">고객 희망 예산</span>
              <span className="text-sm font-extrabold text-navy tabular-nums">{estimate.expected_budget_range || NONE}</span>
            </div>
            <div className="bg-bg-subtle border border-border p-3.5 rounded-custom">
              <span className="text-gray font-bold block mb-0.5">1차 검토 산출액 (VAT 별도)</span>
              <span className="text-sm font-extrabold text-navy tabular-nums">
                {supplyAmount > 0 ? `₩${supplyAmount.toLocaleString()}` : NONE}
              </span>
            </div>
            <div className="bg-[#1E4D8C]/5 border border-[#1E4D8C]/20 p-3.5 rounded-custom">
              <span className="text-steel font-bold block mb-0.5">최종 조율 계약 금액</span>
              <span className="text-sm font-black text-steel tabular-nums">
                {estimate.confirmed_contract_amount ? `₩${estimate.confirmed_contract_amount.toLocaleString()}` : NONE}
              </span>
            </div>
          </div>
          <p className="text-[10.5px] text-gray leading-relaxed mt-1">
            산출액은 ZEROS가 보유한 유사 공종 실거래 데이터를 대조해 만든 단가 밴드 기준입니다. 자재 사양과 시공 방법에 따라 편차가 발생합니다.
          </p>
        </div>

        {/* 4. 후속 프로세스 권고 */}
        <div className="flex flex-col gap-3.5 border-t border-border pt-4">
          <div className="bg-navy text-bg p-4.5 rounded-custom flex items-center gap-4 justify-between select-none">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-steel shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-black text-bg/90 tracking-wide">공사 범위 고정 권고</span>
                <span className="text-[10px] text-bg/85 leading-normal">
                  본 리포트에서 정의한 공사 범위(Scope)를 시공 계약 조건에 그대로 고정할 것을 권고합니다. 계약 이후의 범위 변경은 예산 증가의 주된 원인입니다.
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray font-bold mt-2 tabular-nums">
            <span>주식회사 제러스 사전엔지니어링 검토사업실</span>
            <span>https://zerospipe.co.kr</span>
          </div>
        </div>

      </div>
      
      {/* 인쇄 전용 CSS 스타일 태그 */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .print\:hidden {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
};
