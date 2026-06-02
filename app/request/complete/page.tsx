'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, ChevronRight, FileText, PhoneCall, Mail, Building } from 'lucide-react';

// 자동 분류별 안내 메시지 맵 (원문 그대로 - §6.2)
const categoryMessages: Record<string, { title: string; body: string }> = {
  small: {
    title: '온라인 간편 검토 대상',
    body: '온라인 간편 검토 대상으로 접수되었습니다. 사진과 설명을 기준으로 검토 후 안내드립니다.'
  },
  medium: {
    title: '출장견적 검토 대상',
    body: '출장견적 검토 대상입니다. 현장방문 일정과 출장견적비 안내를 드립니다.'
  },
  large: {
    title: '프로젝트 예상견적 대상',
    body: '프로젝트 예상견적 대상입니다. CAPEX 계획, 공법, 일정, 예산 범위를 종합 검토합니다.'
  },
  unknown: {
    title: '규모 미정 검토 대상',
    body: '예상 공사금액이 미정인 상태로 접수되었습니다. 기본자료 검토 후 적합한 검토 방식을 안내드립니다.'
  }
};

const CompleteContent: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const estimateNo = searchParams.get('no') || 'ZR-20260602-000';
  const category = searchParams.get('cat') || 'unknown';
  const customerName = searchParams.get('name') || '고객';

  const msg = categoryMessages[category] || categoryMessages.unknown;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-subtle p-4 md:p-6 select-none font-sans">
      <div className="w-full max-w-lg bg-bg border border-border rounded-custom shadow-custom-md p-8 flex flex-col gap-6 text-center animate-in zoom-in-95 duration-200">
        
        {/* 성공 체크 배지 */}
        <div className="bg-success/10 text-success p-4 rounded-full w-fit mx-auto border border-success/20">
          <CheckCircle2 className="w-12 h-12" />
        </div>

        {/* 메인 완료 텍스트 */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-gray-light font-bold uppercase tracking-widest">예상견적 신청 완료</span>
          <h2 className="text-xl md:text-2xl font-black text-navy tracking-tight">
            의뢰서가 성공적으로 접수되었습니다
          </h2>
        </div>

        {/* 접수 정보 박스 */}
        <div className="bg-bg-subtle border border-border rounded-custom p-4.5 text-left flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
            <span className="text-xs font-bold text-gray-light">접수 번호</span>
            <span className="text-[13px] font-black text-navy tracking-wide tabular-nums">{estimateNo}</span>
          </div>

          <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
            <span className="text-xs font-bold text-gray-light">의뢰 고객</span>
            <span className="text-[13px] font-bold text-navy">{customerName} 님</span>
          </div>

          <div className="flex flex-col gap-1.5 pt-0.5">
            <span className="text-[10px] text-steel font-black uppercase tracking-wider">{msg.title}</span>
            <p className="text-[12px] text-navy font-bold leading-relaxed">
              "{msg.body}"
            </p>
          </div>
        </div>

        {/* 향후 절차 안내 */}
        <div className="text-left flex flex-col gap-3 border-t border-border pt-5">
          <h3 className="text-xs font-black text-navy tracking-wide uppercase">다음에 일어나는 일 (Next Steps)</h3>
          <div className="flex flex-col gap-3 text-[11.5px] text-gray font-medium leading-relaxed">
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-navy text-bg text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">1</span>
              <p>배정된 전담 엔지니어가 제출해주신 도면과 현장 사진의 화질 및 누설 상태를 확인합니다. (최대 24시간 소요)</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-navy text-bg text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">2</span>
              <p>기초 자료가 불충분할 경우 기입하신 이메일({searchParams.get('email') || '이메일'}) 또는 연락처로 엔지니어가 직접 연락을 드립니다.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-navy text-bg text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">3</span>
              <p>검토 완료 즉시 ZEROS 공사범위 WBS 리포트와 권장 예상 원가 가이드 라인이 제공됩니다.</p>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-3 border-t border-border pt-5">
          <button
            onClick={() => router.push('/')}
            className="flex-1 bg-steel hover:bg-navy text-bg py-3.5 rounded-custom text-xs font-black shadow-sm transition-all active:scale-[0.99]"
          >
            ZEROS 홈으로 돌아가기
          </button>
        </div>

      </div>
    </div>
  );
};

export default function RequestCompletePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-bg-subtle text-xs text-gray-light font-bold">
        접수 결과 로딩 중...
      </div>
    }>
      <CompleteContent />
    </Suspense>
  );
}
