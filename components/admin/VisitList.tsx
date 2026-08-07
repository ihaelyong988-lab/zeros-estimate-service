'use client';

import React, { useEffect, useState } from 'react';
import { ZerosService, clearDataCache } from '@/lib/supabase/client';
import { SiteVisit, Estimate } from '@/types/estimate';
import { resolveAdminLoadError, type AdminLoadError } from '@/lib/admin/loadState';
import { AlertBanner } from '@/components/admin/AlertBanner';
import { Calendar, User, ClipboardList, CheckCircle2, ShieldAlert, FileWarning, RefreshCw } from 'lucide-react';

// 완료 처리 실패 안내 문구. 조회 실패 배너는 loadData 에서만 켜지므로 저장 경로는 별도로 알린다.
export const VISIT_COMPLETE_ERROR_HEADLINE = '현장방문 완료 처리를 저장하지 못했습니다.';

export const VisitList: React.FC = () => {
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<AdminLoadError | null>(null);
  const [actionError, setActionError] = useState<AdminLoadError | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | SiteVisit['visit_status']>('all');

  const loadData = async (showPending = true): Promise<{ visits: SiteVisit[]; estimates: Estimate[] }> => {
    if (showPending) {
      await Promise.resolve();
      setLoading(true);
    }
    try {
      const vList = await ZerosService.getSiteVisits();
      setVisits(vList);

      const eList = await ZerosService.getEstimates();
      setEstimates(eList);
      setLoadError(null);
      return { visits: vList, estimates: eList };
    } catch (e) {
      console.error('Failed to load visits', e);
      // 조회 실패를 빈 배열로 떨어뜨리면 화면이 "방문 일정 없음"을 사실로 안내한다.
      setVisits([]);
      setEstimates([]);
      setLoadError(resolveAdminLoadError('현장방문 대장을 불러오지 못했습니다.', e));
      return { visits: [], estimates: [] };
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
    // 견적 상태 동기화는 방문 이전 단계에서만 일어난다(lib/supabase/client.ts 의 화이트리스트 가드).
    // updateSiteVisit 이 갱신 여부를 돌려주지 않으므로, 저장 전 상태와 저장 후 재적재한 상태를 비교해 안내한다.
    const targetVisit = visits.find(v => v.id === id);
    const estimateId = targetVisit?.estimate_id || '';
    const beforeStatus = estimates.find(e => e.id === estimateId)?.status;

    // 실측 결과는 운영자가 직접 입력한다. 입력이 없으면 빈 값으로 저장한다
    // (과거엔 고정 문구를 기록해, 실제로 수행하지 않은 실측 결과가 이력에 남았다).
    const entered = window.prompt(
      '현장 실측 결과를 입력하세요. 비워 두면 결과 없이 완료 처리합니다.',
      targetVisit?.visit_result || ''
    );
    if (entered === null) return; // 취소 = 완료 처리 중단

    // 지난 실패 문구가 남으면 이번 시도까지 실패한 것으로 읽힌다.
    setActionError(null);

    try {
      // 1. 방문 상태 '완료' 로 변경
      await ZerosService.updateSiteVisit(id, {
        visit_status: '완료',
        visit_result: entered.trim()
      });

      // 2. 재적재 후 견적 상태 대조
      const next = await loadData();
      const afterStatus = next.estimates.find(e => e.id === estimateId)?.status;
      const statusChanged = Boolean(beforeStatus && afterStatus && beforeStatus !== afterStatus);

      alert(
        statusChanged
          ? `현장방문 실측을 완료 처리했습니다. 관련 견적 상태가 [${afterStatus}]로 갱신되었습니다.`
          : '방문 이력을 저장했습니다. 견적 상태는 현재 단계를 유지합니다.'
      );
    } catch (e) {
      console.error('Failed to complete site visit', e);
      // 사유(세션 만료·네트워크·대상 없음)를 버리면 운영자는 무엇을 다시 해야 할지 알 수 없다.
      // 관리자 화면의 다른 실패와 같은 배너로 알린다.
      setActionError(resolveAdminLoadError(VISIT_COMPLETE_ERROR_HEADLINE, e));
    }
  };

  if (loading) {
    return <div className="text-xs font-bold text-gray text-center py-12">현장방문 데이터 적재 중...</div>;
  }

  // 매핑 및 필터링
  const displayVisits = visits.filter(v => filterStatus === 'all' || v.visit_status === filterStatus);

  return (
    <div className="flex flex-col gap-5 select-none font-sans max-w-5xl mx-auto py-2">
      
      {/* 헤더 및 컨트롤러 */}
      <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-black text-navy leading-none">현장방문 실측 대장</h2>
        </div>
        
        {/* 필터 */}
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | SiteVisit['visit_status'])}
            className="border border-border rounded-custom bg-bg px-3 min-h-[44px] text-xs text-navy focus:outline-none focus-visible:outline-2 focus-visible:outline-steel"
          >
            <option value="all">전체 일정 상태</option>
            <option value="예정">출장 예정</option>
            <option value="완료">실측 완료</option>
            <option value="취소">방문 취소</option>
          </select>
          
          <button
            type="button"
            onClick={() => {
              // 명시적 새로고침은 캐시를 건너뛴다 — 안 그러면 TTL 동안 버튼이 무동작으로 보인다.
              clearDataCache();
              void loadData();
            }}
            style={{ touchAction: 'manipulation' }}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center border border-border rounded-custom bg-bg text-gray hover:bg-bg-subtle cursor-pointer focus-visible:outline-2 focus-visible:outline-steel"
            title="목록 새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <AlertBanner message={loadError?.message} />

      <AlertBanner message={actionError?.message} />

      {/* 실측 카드 목록 */}
      {displayVisits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {displayVisits.map((v) => {
            const relatedEst = estimates.find(e => e.id === v.estimate_id);
            const isCompleted = v.visit_status === '완료';
            const isCancelled = v.visit_status === '취소';

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
                    isCompleted
                      ? 'bg-success/15 text-success border-success/20'
                      : isCancelled
                      ? 'bg-bg-subtle text-gray border-border'
                      : 'bg-warning/15 text-warning border-warning/20'
                  }`}>
                    {isCompleted ? '실측완료' : isCancelled ? '방문취소' : '출장예정'}
                  </span>
                </div>

                {/* 기술/인적 정보 매칭 */}
                <div className="flex flex-col gap-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <User className="w-3.5 h-3.5 text-gray-light shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-extrabold text-navy">{v.visitor_name} 엔지니어 배정</span>
                      <span className="text-[10px] text-gray leading-none">
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
                        <span className="font-bold text-[10.5px]">실측 결과</span>
                        <p className="leading-normal text-[10.5px] font-semibold">{v.visit_result}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 예정 일정인 경우, 신속 완료 액션 제공 */}
                {v.visit_status === '예정' && (
                  <button
                    type="button"
                    onClick={() => handleCompleteVisit(v.id)}
                    style={{ touchAction: 'manipulation' }}
                    className="w-full mt-1.5 bg-steel hover:bg-navy text-bg min-h-[44px] px-3 rounded-custom text-xs font-extrabold transition-all duration-150 flex items-center justify-center gap-1.5 shadow-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-navy"
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
        <div className="bg-bg border border-border border-dashed p-12 text-center rounded-custom text-xs text-gray font-bold">
          {loadError
            ? '조회 실패로 일정을 표시하지 못했습니다.'
            : '출장방문 일정 내역이 존재하지 않습니다.'}
        </div>
      )}

    </div>
  );
};
