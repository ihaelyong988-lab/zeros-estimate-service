'use client';

import React, { useState } from 'react';
import { Estimate, EstimateStatus, EstimateCategory } from '@/types/estimate';
import { Calendar, User, Wrench, ShieldAlert } from 'lucide-react';

interface KanbanBoardProps {
  estimates: Estimate[];
  onStatusChange: (id: string, newStatus: EstimateStatus) => Promise<void>;
  onSelectCard: (id: string) => void;
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

  // 드롭 핸들러
  const handleDrop = async (e: React.DragEvent, targetStatus: EstimateStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggingId;
    setDraggingId(null);
    
    if (id) {
      try {
        await onStatusChange(id, targetStatus);
      } catch (err) {
        console.error('Failed to change estimate status in kanban drop', err);
        alert('상태 변경 적용 중 오류가 발생했습니다. (자동 롤백)');
      }
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
      <div className="flex gap-4 items-stretch h-[calc(100vh-210px)] min-h-[500px]">
        {allStatuses.map((status) => {
          const columnEstimates = estimates.filter(e => e.status === status);
          const columnCount = columnEstimates.length;
          
          // 컬럼별 금액 총합 계산
          const totalAmount = columnEstimates.reduce((acc, curr) => {
            return acc + (curr.estimated_amount || curr.confirmed_contract_amount || 0);
          }, 0);

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
                            {est.work_type}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded-custom text-[8.5px] font-bold border ${getCategoryChip(est.estimate_category)}`}>
                            {est.estimate_category.toUpperCase()}
                          </span>
                        </div>

                        {/* 가격 / 접수일 */}
                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-light pt-0.5">
                          <span className="text-navy font-extrabold text-[11px] tabular-nums">
                            {est.estimated_amount 
                              ? `₩${(est.estimated_amount / 10000).toLocaleString()}만` 
                              : est.confirmed_contract_amount 
                              ? `₩${(est.confirmed_contract_amount / 10000).toLocaleString()}만`
                              : '-'}
                          </span>
                          <span className="flex items-center gap-0.5 text-[9.5px]">
                            <Calendar className="w-3 h-3 text-gray-light" />
                            {new Date(est.created_at).toISOString().slice(5, 10)}
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
