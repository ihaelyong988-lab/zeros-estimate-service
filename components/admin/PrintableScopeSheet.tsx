'use client';

import React from 'react';
import { Estimate } from '@/types/estimate';
import { ShieldCheck, Printer } from 'lucide-react';

interface PrintableScopeSheetProps {
  estimate: Estimate;
}

export const PrintableScopeSheet: React.FC<PrintableScopeSheetProps> = ({ estimate }) => {
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-bg border border-border p-6.5 rounded-custom shadow-custom-sm flex flex-col gap-6 select-none font-sans max-w-4xl mx-auto py-4">
      
      {/* 화면 제어 인터페이스 (인쇄 시 숨김 - noprint class 연동) */}
      <div className="flex items-center justify-between border-b border-border pb-4 bg-bg-subtle/50 p-4 rounded-custom print:hidden">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-steel font-black uppercase tracking-wider">Enterprise Document Center</span>
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
            <div className="flex items-center gap-2 text-gray-light font-bold text-[10px] mt-1.5 tabular-nums">
              <span>문서 번호: {estimate.estimate_no}</span>
              <span>•</span>
              <span>작성일자: {new Date().toLocaleDateString('ko-KR')}</span>
            </div>
          </div>
          {/* 가상 도장/마크 */}
          <div className="border-2 border-steel text-steel rounded-custom px-3 py-1 flex flex-col items-center justify-center font-black select-none opacity-90 scale-95 shrink-0">
            <span className="text-[8px] tracking-widest uppercase">Certified By</span>
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
              <span className="font-extrabold text-navy tabular-nums">{estimate.phone} / {estimate.email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray font-bold">현장 종류 / 업종</span>
              <span className="font-extrabold text-navy">{estimate.site_type} / {estimate.customer_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray font-bold">공종 구분</span>
              <span className="font-extrabold text-navy text-steel">{estimate.work_type}</span>
            </div>
            <div className="flex justify-between col-span-2 border-t border-border/60 pt-3">
              <span className="text-gray font-bold shrink-0">현장 설치 주소</span>
              <span className="font-extrabold text-navy leading-normal text-right">{estimate.site_address || '현장 실측 필요'}</span>
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
                  <td className="p-3 text-gray leading-relaxed">{estimate.work_purpose || '신규 유틸리티 관로 신설 및 장비 연결'}</td>
                  <td className="p-3 text-center" rowSpan={3}>
                    <span className="px-2 py-0.5 rounded-custom text-[10px] font-black border border-steel/30 text-steel bg-steel/5">
                      정확도 등급: {estimate.accuracy_grade || 'B'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-navy">현장 물리적 제약</td>
                  <td className="p-3 text-gray leading-relaxed">
                    {estimate.description || '천장 유틸리티 브래킷 이격 필요, 기계실 내 협소 공간 밸브 조작 반경 사전 확보 요망.'}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-navy">요구 배관/장비 사양</td>
                  <td className="p-3 text-gray leading-relaxed">
                    {estimate.request_detail || '80A 관경 중심의 SUS304 배관 설계 및 게이트 밸브/유량계 피팅 설치.'}
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
              <span className="text-gray-light font-bold block mb-0.5">고객 희망 예산</span>
              <span className="text-sm font-extrabold text-navy tabular-nums">{estimate.expected_budget_range}</span>
            </div>
            <div className="bg-bg-subtle border border-border p-3.5 rounded-custom">
              <span className="text-gray-light font-bold block mb-0.5">엔지니어 예상 원가</span>
              <span className="text-sm font-extrabold text-navy tabular-nums">
                ₩{estimate.estimated_amount ? estimate.estimated_amount.toLocaleString() : '실측 산정중'}
              </span>
            </div>
            <div className="bg-[#1E4D8C]/5 border border-[#1E4D8C]/20 p-3.5 rounded-custom">
              <span className="text-steel font-bold block mb-0.5">최종 조율 계약 금액</span>
              <span className="text-sm font-black text-steel tabular-nums">
                ₩{estimate.confirmed_contract_amount ? estimate.confirmed_contract_amount.toLocaleString() : '미확정'}
              </span>
            </div>
          </div>
          <p className="text-[10.5px] text-gray-light leading-relaxed mt-1">
            * 권장 예산안은 ZEROS 데이터베이스 내 유사 공종 $n$건의 실측 시공 데이터를 매핑하여 산출한 시장 적정 단가 밴드 기준입니다. 자재 및 시공법에 따라 ±12%의 편차가 발생할 수 있습니다.
          </p>
        </div>

        {/* 4. 후속 프로세스 및 안전 보장 서약 */}
        <div className="flex flex-col gap-3.5 border-t border-border pt-4">
          <div className="bg-navy text-bg p-4.5 rounded-custom flex items-center gap-4 justify-between select-none">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-steel shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-black text-bg/90 tracking-wide">ZEROS CAPEX RISK ASSURANCE</span>
                <span className="text-[10px] text-bg/70 leading-normal">
                  본 리포트에서 확정 정의한 공사 범위(Scope) 규격을 시공사 계약 조건에 고정할 것을 권장하며, 무단 설계 변경으로 인한 예산 오버런 리스크를 99% 이상 보장합니다.
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-gray-light font-bold mt-2 tabular-nums">
            <span>주식회사 제러스 사전엔지니어링 검토사업실</span>
            <span>https://zeros-estimate-service.vercel.app</span>
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
