'use client';

import React, { useState } from 'react';
import { Estimate, EstimateStatus, EstimateCategory } from '@/types/estimate';
import { Calendar } from 'lucide-react';
import { kstMonthDay } from '@/lib/utils/date';
import { supplyAmountOf } from '@/lib/quote/amounts';
import { menuDisplayName } from '@/lib/constants/menu';
import { ZerosService } from '@/lib/supabase/client';

interface KanbanBoardProps {
  estimates: Estimate[];
  onStatusChange: (id: string, newStatus: EstimateStatus) => Promise<void>;
  onSelectCard: (id: string) => void;
}

// ==========================================
// 수주성공 전이 · 확정 계약금액 (순수 함수 — 회귀 테스트: test/admin/contractAmount.test.ts)
// ==========================================
// 수주성공으로 들어가면 확정 계약금액·수주 확정일이 기록된다(lib/supabase/client.ts updateEstimate).
// 나갈 때 되돌리는 경로가 없어, 잘못 드롭한 값이 남아 이후 실제 계약액을 덮어썼다 —
// 매출·고객 누적치가 함께 오염되므로 이탈 전이에서 두 필드를 같이 지운다.
const WON_STATUS: EstimateStatus = '수주성공';

export type ContractTransition = 'enter' | 'leave' | 'none';

export interface ContractFieldPatch {
  confirmed_contract_amount?: number;
  contract_won_at?: string;
}

export const contractTransitionOf = (
  current: EstimateStatus,
  next: EstimateStatus,
): ContractTransition => {
  if (next === WON_STATUS) return current === WON_STATUS ? 'none' : 'enter';
  return current === WON_STATUS ? 'leave' : 'none';
};

type ContractSource = Pick<Estimate, 'status' | 'confirmed_contract_amount' | 'estimated_amount' | 'line_items'>;

export function contractFieldsForStatusChange(
  est: ContractSource,
  next: EstimateStatus,
  opts: { amount?: number; now?: string } = {},
): ContractFieldPatch {
  const transition = contractTransitionOf(est.status, next);

  if (transition === 'enter') {
    // 금액 근거 우선순위 = 운영자 입력 > 이미 확정된 계약금액 > 공급가액(VAT 별도).
    const amount = opts.amount ?? est.confirmed_contract_amount ?? supplyAmountOf(est);
    const patch: ContractFieldPatch = { contract_won_at: opts.now ?? new Date().toISOString() };
    if (amount > 0) patch.confirmed_contract_amount = amount;
    return patch;
  }

  if (transition === 'leave') {
    // 키를 남긴 채 undefined 를 넣어야 병합·직렬화 저장에서 값이 실제로 지워진다.
    return { confirmed_contract_amount: undefined, contract_won_at: undefined };
  }

  return {};
}

// 13단계 전체 상태 정의
const allStatuses: EstimateStatus[] = [
  '접수완료',
  '검토중',
  '추가자료요청',
  '출장견적 결제대기',
  '방문일정 조율중',
  '현장방문 예정',
  '현장방문 완료',
  '견적서 작성중',
  '견적서 송부완료',
  '수주성공',
  '수주실패',
  '보류',
  '취소'
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  estimates,
  onStatusChange,
  onSelectCard
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // 카드·컬럼 표시 금액 = 공급가액(VAT 별도). 견적금액이 없으면 확정 계약금액으로 대체한다.
  const cardAmountOf = (est: Estimate) => {
    const supply = supplyAmountOf(est);
    return supply > 0 ? supply : (est.confirmed_contract_amount || 0);
  };

  // 드래그 시작 핸들러
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggingId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  // 드래그 오버 핸들러 (드롭 허용 처리)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // 수주성공 진입·이탈은 돈이 걸린 전이다 — 드롭 즉시 반영하지 않고 확인 단계를 둔다.
  // 운영자가 취소하면 null 을 돌려 상태 변경까지 중단한다.
  const confirmContractPatch = (est: Estimate, targetStatus: EstimateStatus): ContractFieldPatch | null => {
    const transition = contractTransitionOf(est.status, targetStatus);

    if (transition === 'enter') {
      const suggested = est.confirmed_contract_amount || supplyAmountOf(est);
      const input = window.prompt(
        `${est.estimate_no} 건을 수주성공으로 변경합니다.\n확정 계약금액을 원 단위로 입력해 주세요(VAT 별도).`,
        suggested > 0 ? String(suggested) : '',
      );
      if (input === null) return null;
      // 자릿점·단위 표기만 걷어낸다. "3천만" 같은 표기는 숫자로 바꾸지 않고 되묻는다(3원 저장 방지).
      const cleaned = input.replace(/[\s,원]/g, '');
      const amount = Number(cleaned);
      if (!/^[0-9]+$/.test(cleaned) || !(amount > 0)) {
        alert('확정 계약금액을 숫자로 입력해 주세요. 상태를 변경하지 않았습니다.');
        return null;
      }
      return contractFieldsForStatusChange(est, targetStatus, { amount });
    }

    if (transition === 'leave') {
      const stored = est.confirmed_contract_amount || 0;
      const detail = stored > 0
        ? `확정 계약금액 ₩${stored.toLocaleString()} 과 수주 확정일이 함께 삭제됩니다.`
        : '수주 확정일이 삭제됩니다.';
      if (!confirm(`${est.estimate_no} 건을 수주성공에서 '${targetStatus}' 상태로 되돌립니다.\n${detail}`)) return null;
      return contractFieldsForStatusChange(est, targetStatus);
    }

    return {};
  };

  // 드롭 핸들러
  const handleDrop = async (e: React.DragEvent, targetStatus: EstimateStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggingId;
    setDraggingId(null);
    if (!id) return;

    // 목록에 없는 카드는 계약금액 근거가 없다 — 상태만 넘긴다.
    const est = estimates.find(x => x.id === id);
    const patch = est ? confirmContractPatch(est, targetStatus) : {};
    if (patch === null) return;

    try {
      // 계약 필드를 먼저 확정하고 상태를 바꾼다. 순서를 뒤집으면 상태만 바뀐 채 실패했을 때
      // 같은 드롭을 다시 해도 이탈 전이로 잡히지 않아 잘못된 금액이 영구히 남는다.
      if (Object.keys(patch).length > 0) {
        await ZerosService.updateEstimate(id, patch);
      }
      await onStatusChange(id, targetStatus);
    } catch (err) {
      console.error('Failed to change estimate status in kanban drop', err);
      alert('상태 변경 적용 중 오류가 발생했습니다. (자동 롤백)');
    }
  };

  const getCategoryChip = (cat: EstimateCategory) => {
    const maps = {
      small: 'bg-success/10 text-success border-success/20',
      medium: 'bg-warning/10 text-warning border-warning/20',
      large: 'bg-navy/10 text-navy border-navy/20',
      unknown: 'bg-gray-light/10 text-gray border-border'
    };
    return maps[cat] || 'bg-bg-subtle text-gray border-border';
  };

  return (
    <div className="w-full flex-1 overflow-x-auto select-none font-sans py-2">
      <div className="sticky left-0 z-10 mb-3 flex items-center justify-between gap-3 rounded-custom border border-steel/20 bg-steel/5 px-3 py-2 text-[11px] font-bold text-steel shadow-sm">
        <span>13단계 영업 파이프라인입니다. 좌우로 이동해 결제대기, 방문예정, 견적송부, 수주성공까지 확인할 수 있습니다.</span>
        <span className="shrink-0 rounded-custom bg-bg px-2 py-0.5 text-[10px] font-black text-navy border border-border">가로 스크롤</span>
      </div>
      <div className="flex gap-4 items-stretch h-[calc(100vh-210px)] min-h-[500px]">
        {allStatuses.map((status) => {
          const columnEstimates = estimates.filter(e => e.status === status);
          const columnCount = columnEstimates.length;
          
          // 컬럼별 금액 총합 계산
          const totalAmount = columnEstimates.reduce((acc, curr) => acc + cardAmountOf(curr), 0);

          return (
            <div
              key={status}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
              className="w-72 bg-bg-subtle/50 border border-border rounded-custom flex flex-col shrink-0 overflow-hidden shadow-sm"
            >
              
              {/* 컬럼 헤더 (상태명, 건수, 금액) */}
              <div className="p-3 bg-bg border-b border-border flex flex-col gap-1 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-[12.5px] text-navy truncate max-w-[180px]">{status}</span>
                  <span className="bg-navy/5 text-navy text-[10px] font-black border border-border/80 px-2 py-0.5 rounded-full">
                    {columnCount}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-[10px] text-gray-light font-bold">
                  <span>금액 합계</span>
                  <span className="tabular-nums">₩{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* 카드 영역 */}
              <div className="flex-1 p-2 overflow-y-auto flex flex-col gap-2.5">
                {columnCount > 0 ? (
                  columnEstimates.map((est) => (
                    <div
                      key={est.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, est.id)}
                      onClick={() => onSelectCard(est.id)}
                      className={`bg-bg border border-border p-3.5 rounded-custom shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing hover:border-steel group relative ${
                        draggingId === est.id ? 'opacity-40 border-steel border-dashed' : ''
                      }`}
                    >
                      {/* 긴급도 빨간 사이드라인 바 */}
                      {est.urgency && (
                        <div className="absolute left-0 top-3 bottom-3 w-1 bg-danger rounded-r-full" />
                      )}

                      <div className="flex flex-col gap-2.5">
                        {/* 카드 헤더 (접수번호, 정확도) */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-steel group-hover:underline tabular-nums">
                            {est.estimate_no}
                          </span>
                          {est.accuracy_grade && (
                            <span className="bg-navy/5 text-navy text-[8.5px] font-bold border border-border px-1 py-0.2 rounded-custom">
                              등급 {est.accuracy_grade}
                            </span>
                          )}
                        </div>

                        {/* 고객 정보 */}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-black text-navy">{est.customer_name}</span>
                          <span className="text-[10px] text-gray-light font-semibold truncate">
                            {est.company_name || '개인 의뢰'}
                          </span>
                        </div>

                        {/* 기술 스펙 요약 칩 */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 border-t border-border/40 my-1">
                          <span className="bg-bg-subtle text-gray border border-border/80 px-1.5 py-0.5 rounded-custom text-[8.5px] font-bold">
                            {menuDisplayName(est.work_type)}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded-custom text-[8.5px] font-bold border ${getCategoryChip(est.estimate_category)}`}>
                            {(est.estimate_category || '').toUpperCase()}
                          </span>
                        </div>

                        {/* 가격 / 접수일 */}
                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-light pt-0.5">
                          <span className="text-navy font-extrabold text-[11px] tabular-nums">
                            {cardAmountOf(est) > 0 ? `₩${Math.round(cardAmountOf(est) / 10000).toLocaleString()}만` : '-'}
                          </span>
                          <span className="flex items-center gap-0.5 text-[9.5px]">
                            <Calendar className="w-3 h-3 text-gray-light" />
                            {kstMonthDay(est.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-[10px] text-gray-light font-bold text-center py-12 border border-dashed border-border/60 rounded-custom bg-bg-subtle/10">
                    카드를 드래그하여 드롭하세요
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
