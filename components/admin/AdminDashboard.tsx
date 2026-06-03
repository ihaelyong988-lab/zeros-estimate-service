'use client';

import React, { useEffect, useState } from 'react';
import { ZerosService } from '@/lib/supabase/client';
import { Estimate } from '@/types/estimate';
import {
  FileText,
  Clock,
  CalendarCheck,
  TrendingUp,
  DollarSign,
  Briefcase
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigateToView: (view: 'estimates' | 'visits' | 'customers' | 'performance') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateToView }) => {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await ZerosService.getEstimates();
        setEstimates(list);
      } catch (e) {
        console.error('Failed to load estimates for dashboard', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="text-xs font-bold text-gray-light text-center py-12">대시보드 실적 집계 중...</div>;
  }

  // 데이터 집계
  const newCount = estimates.filter(e => e.status === '접수완료').length;
  const reviewingCount = estimates.filter(e => e.status === '검토중' || e.status === '추가자료요청').length;
  const visitWaitingCount = estimates.filter(e => e.status === '현장방문 예정' || e.status === '방문일정 조율중').length;
  const wonCount = estimates.filter(e => e.status === '수주성공').length;

  // 매출 계산
  const expectedRevenue = estimates
    .filter(e => e.status === '견적서 작성중' || e.status === '견적서 송부완료')
    .reduce((acc, curr) => acc + (curr.estimated_amount || 0), 0);

  const confirmedRevenue = estimates
    .filter(e => e.status === '수주성공')
    .reduce((acc, curr) => acc + (curr.confirmed_contract_amount || 0), 0);

  return (
    <div className="flex flex-col gap-6 select-none font-sans max-w-5xl mx-auto py-2">
      
      {/* 관리자 웰컴 세션 */}
      <div className="flex flex-col gap-1.5 bg-bg border border-border p-6 rounded-custom shadow-custom-sm">
        <span className="text-[10px] text-steel font-black uppercase tracking-widest">Zeros Backoffice Portal</span>
        <h2 className="text-xl font-black text-navy leading-none">ZEROS 사전진단 종합 관제 패널</h2>
        <p className="text-[12.5px] text-gray leading-relaxed mt-1">
          사전진단 신청 건에 대한 원가 분석, 도면/사진 해상도 1차 검수, 현장 방문 레이저 실측 조율 및 계약 전환율을 통합 관리합니다.
        </p>
      </div>

      {/* 실시간 KPI 카드 그리드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 오늘 접수 */}
        <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-gray-light font-bold uppercase tracking-wider">신규 접수완료</span>
            <span className="text-2xl font-black text-navy tabular-nums">{newCount}건</span>
          </div>
          <div className="bg-steel/10 p-2.5 rounded-custom text-steel">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* 검토 중인 건 */}
        <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-gray-light font-bold uppercase tracking-wider">엔지니어 검토중</span>
            <span className="text-2xl font-black text-navy tabular-nums">{reviewingCount}건</span>
          </div>
          <div className="bg-warning/10 p-2.5 rounded-custom text-warning">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* 현장방문 예정 */}
        <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-gray-light font-bold uppercase tracking-wider">방문 실측 대기</span>
            <span className="text-2xl font-black text-navy tabular-nums">{visitWaitingCount}건</span>
          </div>
          <div className="bg-info/10 p-2.5 rounded-custom text-info">
            <CalendarCheck className="w-5 h-5" />
          </div>
        </div>

        {/* 수주 성공률 */}
        <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-gray-light font-bold uppercase tracking-wider">최종 수주성공</span>
            <span className="text-2xl font-black text-navy tabular-nums">{wonCount}건</span>
          </div>
          <div className="bg-success/10 p-2.5 rounded-custom text-success">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 매출 실적 관련 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* 예상 파이프라인 매출 */}
        <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-gray-light font-bold uppercase tracking-wider">예상 파이프라인 매출 (견적/송부)</span>
            <span className="text-2xl font-black text-navy tracking-tight tabular-nums">
              ₩{expectedRevenue.toLocaleString()}
            </span>
            <span className="text-[10.5px] text-gray-light font-medium leading-none mt-1">
              *상태: 견적서 작성중 및 송부 완료건 합계
            </span>
          </div>
          <div className="bg-navy p-3 rounded-custom text-bg shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        {/* 확정 계약 매출 */}
        <div className="bg-navy text-bg p-5 rounded-custom shadow-custom-sm flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-bg/60 font-bold uppercase tracking-wider">확정 누적 계약 매출 (수주성공)</span>
            <span className="text-2xl font-black text-bg tracking-tight tabular-nums">
              ₩{confirmedRevenue.toLocaleString()}
            </span>
            <span className="text-[10.5px] text-bg/75 font-medium leading-none mt-1">
              *상태: 최종 수주성공 계약금액 합계
            </span>
          </div>
          <div className="bg-accent p-3 rounded-custom text-bg shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 빠른 업무 바로가기 패널 */}
      <div className="bg-bg border border-border rounded-custom p-6 shadow-custom-sm flex flex-col gap-4">
        <h3 className="text-[13.5px] font-bold text-navy border-b border-border pb-2.5">
          백오피스 퀵 링크
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onNavigateToView('estimates')}
            className="border border-border hover:bg-bg-subtle/50 p-4 rounded-custom text-left transition-all group flex flex-col gap-1"
          >
            <span className="text-xs font-black text-steel group-hover:underline">견적 접수/칸반 관리 ➔</span>
            <span className="text-[10.5px] text-gray-light leading-normal">
              13개 세부 단계별 칸반 보드에서 드래그앤드롭으로 견적 라이프사이클을 통제합니다.
            </span>
          </button>
          <button
            onClick={() => onNavigateToView('visits')}
            className="border border-border hover:bg-bg-subtle/50 p-4 rounded-custom text-left transition-all group flex flex-col gap-1"
          >
            <span className="text-xs font-black text-steel group-hover:underline">현장방문 실측 일정 ➔</span>
            <span className="text-[10.5px] text-gray-light leading-normal">
              출장 실측 예정 건의 일정 조율, 리스크 요인 및 현장 특이메모를 기입합니다.
            </span>
          </button>
          <button
            onClick={() => onNavigateToView('performance')}
            className="border border-border hover:bg-bg-subtle/50 p-4 rounded-custom text-left transition-all group flex flex-col gap-1"
          >
            <span className="text-xs font-black text-steel group-hover:underline">실적/전환율 차트 ➔</span>
            <span className="text-[10.5px] text-gray-light leading-normal">
              공사 종류별 가동 현황, 예상 매출 추이 및 전환율 통계를 Recharts 그래픽으로 검토합니다.
            </span>
          </button>
        </div>
      </div>

    </div>
  );
};
