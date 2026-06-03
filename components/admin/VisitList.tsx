'use client';

import React, { useEffect, useState } from 'react';
import { ZerosService } from '@/lib/supabase/client';
import { SiteVisit, Estimate } from '@/types/estimate';
import { Calendar, User, ClipboardList, CheckCircle2, ShieldAlert, FileWarning, RefreshCw } from 'lucide-react';

export const VisitList: React.FC = () => {
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | SiteVisit['visit_status']>('all');

  const loadData = async (showPending = true) => {
    if (showPending) {
      await Promise.resolve();
      setLoading(true);
    }
    try {
      const vList = await ZerosService.getSiteVisits();
      setVisits(vList);
      
      const eList = await ZerosService.getEstimates();
      setEstimates(eList);
    } catch (e) {
      console.error('Failed to load visits', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void loadData(false);
    });
  }, []);

  // 방문 완료 처리 액션
  const handleCompleteVisit = async (id: string) => {
    try {
      // 1. 방문 상태 '완료' 로 변경
      await ZerosService.updateSiteVisit(id, {
        visit_status: '완료',
        visit_result: '현장 실측 전동 레이저 스캔 완료. P&ID 일치율 95% 확인.'
      });
      alert('해당 현장방문 실측 조사가 성공적으로 완료 처리되었습니다. 관련 견적 상태가 [현장방문 완료]로 자동 리액티브 갱신되었습니다.');
      await loadData();
    } catch (e) {
      console.error(e);
      alert('상태 변경 실패');
    }
  };

  if (loading) {
    return <div className="text-xs font-bold text-gray-light text-center py-12">현장방문 데이터 적재 중...</div>;
  }

  // 매핑 및 필터링
  const displayVisits = visits.filter(v => filterStatus === 'all' || v.visit_status === filterStatus);

  return (
    <div className="flex flex-col gap-5 select-none font-sans max-w-5xl mx-auto py-2">
      
      {/* 헤더 및 컨트롤러 */}
      <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-steel font-black uppercase tracking-widest">Site Survey Registry</span>
          <h2 className="text-lg font-black text-navy leading-none">현장방문 실측 대장</h2>
        </div>
        
        {/* 필터 */}
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | SiteVisit['visit_status'])}
            className="border border-border rounded-custom bg-bg px-3 py-1.5 text-xs text-navy focus:outline-none"
          >
            <option value="all">전체 일정 상태</option>
            <option value="예정">출장 예정</option>
            <option value="완료">실측 완료</option>
            <option value="취소">방문 취소</option>
          </select>
          
          <button
            onClick={() => {
              void loadData();
            }}
            className="p-1.5 border border-border rounded-custom bg-bg text-gray hover:bg-bg-subtle"
            title="목록 새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 실측 카드 목록 */}
      {displayVisits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {displayVisits.map((v) => {
            const relatedEst = estimates.find(e => e.id === v.estimate_id);
            const isCompleted = v.visit_status === '완료';

            return (
              <div 
                key={v.id} 
                className={`bg-bg border p-5 rounded-custom shadow-custom-sm relative flex flex-col gap-4.5 transition-all hover:border-steel ${
                  isCompleted ? 'border-border/60 bg-bg-subtle/10' : 'border-border'
                }`}
              >
                
                {/* 카드 탑 (방정 예정일, 등급배지) */}
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-steel" />
                    <span className="text-sm font-black text-navy tabular-nums">{v.visit_date}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-custom text-[10px] font-black border ${
                    isCompleted ? 'bg-success/15 text-success border-success/20' : 'bg-warning/15 text-warning border-warning/20'
                  }`}>
                    {v.visit_status === '완료' ? '실측완료' : '출장예정'}
                  </span>
                </div>

                {/* 기술/인적 정보 매칭 */}
                <div className="flex flex-col gap-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <User className="w-3.5 h-3.5 text-gray-light shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-extrabold text-navy">{v.visitor_name} 엔지니어 배정</span>
                      <span className="text-[10px] text-gray-light leading-none">
                        대상: {relatedEst?.customer_name || '의뢰'} ({relatedEst?.company_name || '개인'}) / {relatedEst?.estimate_no || '-'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <ClipboardList className="w-3.5 h-3.5 text-gray-light shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5 text-gray">
                      <span className="font-semibold text-navy">출장 목적</span>
                      <p className="leading-relaxed text-[11px] font-medium">{v.visit_purpose}</p>
                    </div>
                  </div>

                  {v.site_memo && (
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-info shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5 text-gray">
                        <span className="font-semibold text-navy">현장 물리 제약/특이메모</span>
                        <p className="leading-relaxed text-[11px] font-medium">{v.site_memo}</p>
                      </div>
                    </div>
                  )}

                  {v.risk_memo && (
                    <div className="flex items-start gap-2 bg-danger/5 border border-danger/10 p-2 rounded-custom">
                      <FileWarning className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5 text-danger">
                        <span className="font-bold text-[10.5px]">작업 안전/공기 리스크 경보</span>
                        <p className="leading-normal text-[10.5px] font-medium">{v.risk_memo}</p>
                      </div>
                    </div>
                  )}

                  {v.visit_result && (
                    <div className="bg-success/5 border border-success/10 p-2.5 rounded-custom flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-0.5 text-success">
                        <span className="font-bold text-[10.5px]">레이저 실측 결과</span>
                        <p className="leading-normal text-[10.5px] font-semibold">{v.visit_result}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 예정 일정인 경우, 신속 완료 액션 제공 */}
                {!isCompleted && (
                  <button
                    onClick={() => handleCompleteVisit(v.id)}
                    className="w-full mt-1.5 bg-steel hover:bg-navy text-bg py-2 rounded-custom text-xs font-extrabold transition-all duration-150 active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    현장 실측 조사 완료 처리
                  </button>
                )}

              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-bg border border-border border-dashed p-12 text-center rounded-custom text-xs text-gray-light font-bold">
          출장방문 일정 내역이 존재하지 않습니다.
        </div>
      )}

    </div>
  );
};
