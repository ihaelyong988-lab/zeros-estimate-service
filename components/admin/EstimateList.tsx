'use client';

import React, { useState } from 'react';
import { Estimate, WorkType, EstimateStatus, EstimateCategory, ExpectedBudgetRange } from '@/types/estimate';
import { ZerosService } from '@/lib/supabase/client';
import { Search, ArrowUpDown, KanbanSquare, Table, RefreshCw, Plus } from 'lucide-react';

interface EstimateListProps {
  estimates: Estimate[];
  onRefresh: () => void;
  onSelectEstimate: (id: string) => void;
  onToggleView: (view: 'table' | 'kanban') => void;
  currentSubView: 'table' | 'kanban';
}

export const EstimateList: React.FC<EstimateListProps> = ({
  estimates,
  onRefresh,
  onSelectEstimate,
  onToggleView,
  currentSubView
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [workTypeFilter, setWorkTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortByDate, setSortByDate] = useState<'desc' | 'asc'>('desc');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showCustomToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 드래그 가능한 헤더 및 열 배치의 동적 제어 정의
  type ColumnKey = 'estimate_no' | 'status' | 'customer' | 'work_type' | 'category' | 'accuracy' | 'site_address' | 'amount';

  interface ColumnDef {
    key: ColumnKey;
    label: string;
    width: string;
    align?: 'left' | 'center' | 'right';
  }

  const [columns, setColumns] = useState<ColumnDef[]>([
    { key: 'estimate_no', label: '접수번호', width: 'w-[110px]' },
    { key: 'status', label: '상태', width: 'w-[120px]' },
    { key: 'customer', label: '고객명 / 소속', width: 'w-[160px]' },
    { key: 'work_type', label: '공사 종류', width: 'w-[110px]' },
    { key: 'category', label: '견적 규모', width: 'w-[120px]' },
    { key: 'accuracy', label: '정확도', width: 'w-[70px]', align: 'center' },
    { key: 'site_address', label: '현장 주소', width: 'w-[220px]' },
    { key: 'amount', label: '견적금액', width: 'w-[110px]', align: 'right' }
  ]);

  const [draggedColIdx, setDraggedColIdx] = useState<number | null>(null);

  const handleColDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColIdx(index);
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleColDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = Number(e.dataTransfer.getData('text/plain') || draggedColIdx);
    if (sourceIndex === targetIndex) return;

    const updatedCols = [...columns];
    const [removed] = updatedCols.splice(sourceIndex, 1);
    updatedCols.splice(targetIndex, 0, removed);
    setColumns(updatedCols);
    setDraggedColIdx(null);
  };

  // 관리자 신규 수동 대리 접수 등록 - §6.4
  const handleAddManualEstimate = async () => {
    const mockCompanies = ['(주)한화솔루션', 'CJ제일제당 화성공장', '삼성바이오로직스 송도', '아모레퍼시픽 기흥', '현대그린푸드 기계실'];
    const mockCustomers = ['이영희 차장', '최정우 파트장', '박준서 대리', '정민우 대표', '김아름 실장'];
    const mockAddresses = [
      '경기도 평택시 산단로 128',
      '충청남도 천안시 서북구 3공단로 45',
      '인천광역시 연수구 송도바이오대로 92',
      '경기도 용인시 기흥구 제조로 12',
      '서울특별시 강남구 테헤란로 412'
    ];
    const mockWorkTypes: WorkType[] = ['배관공사', '장비설치', 'Utility 배관', '공장증설', '노후배관교체', '기계실개선'];
    const mockExpectedBudgets: ExpectedBudgetRange[] = ['1,000만~1억', '≥1억', '≤1,000만', '모름'];

    const randomCompany = mockCompanies[Math.floor(Math.random() * mockCompanies.length)];
    const randomCustomer = mockCustomers[Math.floor(Math.random() * mockCustomers.length)];
    const randomAddress = mockAddresses[Math.floor(Math.random() * mockAddresses.length)];
    const randomWorkType = mockWorkTypes[Math.floor(Math.random() * mockWorkTypes.length)];
    const randomBudget = mockExpectedBudgets[Math.floor(Math.random() * mockExpectedBudgets.length)];

    try {
      await ZerosService.createEstimate({
        customer_name: randomCustomer,
        company_name: randomCompany,
        phone: `010-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
        email: `${Math.random().toString(36).substr(2, 5)}@company.com`,
        site_address: randomAddress,
        customer_type: '일반',
        work_type: randomWorkType,
        site_type: '공장',
        work_purpose: '노후 라인 보완 및 교체',
        expected_budget_range: randomBudget,
        desired_schedule: '2개월 이내',
        urgency: Math.random() > 0.5,
        description: `[관리자 유선 대리 접수]\n- ${randomWorkType} 요청 건\n- 현장 실측 요청에 따른 1차 모의 데이터 세팅.`,
        request_detail: '유선 통화 상으로 수압 인자 검토 및 schedules 10s 배관 적용 요청 확인됨.'
      });
      showCustomToast(`[대리 접수 성공] ${randomCompany} (${randomCustomer}님) 수동 의뢰 건이 성공적으로 생성 및 세이브되었습니다.`, 'success');
      onRefresh();
    } catch (e) {
      console.error(e);
      showCustomToast('신규 수동 접수 도중 오류가 발생했습니다.', 'error');
    }
  };

  const getStatusDotStyle = (status: EstimateStatus) => {
    const maps: Record<EstimateStatus, string> = {
      '접수완료': 'bg-steel',
      '검토중': 'bg-warning',
      '추가자료요청': 'bg-danger',
      '출장견적 결제대기': 'bg-warning',
      '방문일정 조율중': 'bg-info',
      '현장방문 예정': 'bg-info',
      '현장방문 완료': 'bg-success',
      '견적서 작성중': 'bg-steel',
      '견적서 송부완료': 'bg-navy',
      '수주성공': 'bg-bg',
      '수주실패': 'bg-gray',
      '보류': 'bg-gray-light',
      '취소': 'bg-gray-light',
    };
    return maps[status] || 'bg-gray-light';
  };

  // 필터링 및 정렬 처리
  const filteredEstimates = estimates
    .filter(est => {
      const matchSearch =
        est.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (est.company_name && est.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        est.site_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        est.estimate_no.toLowerCase().includes(searchTerm.toLowerCase());

      const matchWorkType = workTypeFilter === 'all' || est.work_type === workTypeFilter;
      const matchCategory = categoryFilter === 'all' || est.estimate_category === categoryFilter;
      const matchStatus = statusFilter === 'all' || est.status === statusFilter;

      return matchSearch && matchWorkType && matchCategory && matchStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortByDate === 'desc' ? dateB - dateA : dateA - dateB;
    });

  // 상태 배지 색상 매핑 - §3.2 상태색
  const getStatusBadgeStyle = (status: EstimateStatus) => {
    const maps: Record<EstimateStatus, string> = {
      '접수완료': 'bg-steel/10 text-steel border-steel/20',
      '검토중': 'bg-warning/10 text-warning border-warning/20',
      '추가자료요청': 'bg-danger/10 text-danger border-danger/20',
      '출장견적 결제대기': 'bg-warning/15 text-warning border-warning/30',
      '방문일정 조율중': 'bg-info/10 text-info border-info/20',
      '현장방문 예정': 'bg-info/15 text-info border-info/30',
      '현장방문 완료': 'bg-success/10 text-success border-success/20',
      '견적서 작성중': 'bg-steel/15 text-steel border-steel/30',
      '견적서 송부완료': 'bg-navy/10 text-navy border-navy/20',
      '수주성공': 'bg-success text-bg border-success',
      '수주실패': 'bg-gray-light/10 text-gray border-gray-light/20',
      '보류': 'bg-gray-light/15 text-gray border-gray-light/30',
      '취소': 'bg-danger/5 text-gray-light border-border',
    };
    return maps[status] || 'bg-bg-subtle text-gray border-border';
  };

  const getCategoryBadge = (cat: EstimateCategory) => {
    const maps = {
      small: '온라인 간편 (≤1천)',
      medium: '출장실측 (1억)',
      large: '종합 (1억초과)',
      unknown: '규모 미정'
    };
    return maps[cat] || cat;
  };

  return (
    <div className="bg-bg border border-border rounded-custom shadow-custom-sm select-none font-sans overflow-hidden">
      
      {/* 테이블 컨트롤 패널 (검색 / 필터 / 뷰 전환) */}
      <div className="p-4 bg-bg-subtle/50 border-b border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* 검색 인풋 */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-light absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="접수번호, 고객명, 회사명, 현장주소 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-border rounded-custom bg-bg focus:outline-none focus:border-steel"
          />
        </div>

        {/* 필터 셀렉터 및 뷰 스위치 */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* 공사 종류 필터 */}
          <select
            value={workTypeFilter}
            onChange={(e) => setWorkTypeFilter(e.target.value)}
            className="border border-border rounded-custom bg-bg px-2.5 py-1.5 text-xs text-navy focus:outline-none"
          >
            <option value="all">전체 공사종류</option>
            <option value="배관공사">배관공사</option>
            <option value="장비설치">장비설치</option>
            <option value="Utility 배관">Utility 배관</option>
            <option value="공장증설">공장증설</option>
            <option value="노후배관교체">노후배관교체</option>
            <option value="기계실개선">기계실개선</option>
            <option value="생산설비 배관 연결">생산설비 훅업</option>
            <option value="CAPEX 개·증설 검토">CAPEX 검토</option>
          </select>

          {/* 규모 분류 필터 */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-border rounded-custom bg-bg px-2.5 py-1.5 text-xs text-navy focus:outline-none"
          >
            <option value="all">전체 견적규모</option>
            <option value="small">온라인 간편 (≤1,000만)</option>
            <option value="medium">출장실측 (1,000만~1억)</option>
            <option value="large">프로젝트 진단 (&gt;1억)</option>
            <option value="unknown">규모 미정</option>
          </select>

          {/* 진행 상태 필터 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-border rounded-custom bg-bg px-2.5 py-1.5 text-xs text-navy focus:outline-none"
          >
            <option value="all">전체 진행상태</option>
            <option value="접수완료">접수완료</option>
            <option value="검토중">검토중</option>
            <option value="추가자료요청">추가자료요청</option>
            <option value="출장견적 결제대기">출장견적 결제대기</option>
            <option value="방문일정 조율중">방문일정 조율중</option>
            <option value="현장방문 예정">현장방문 예정</option>
            <option value="현장방문 완료">현장방문 완료</option>
            <option value="견적서 작성중">견적서 작성중</option>
            <option value="견적서 송부완료">견적서 송부완료</option>
            <option value="수주성공">수주성공</option>
            <option value="수주실패">수주실패</option>
            <option value="보류">보류</option>
            <option value="취소">취소</option>
          </select>

          {/* 정렬 버튼 */}
          <button
            onClick={() => setSortByDate(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1 border border-border rounded-custom bg-bg px-3 py-1.5 text-xs text-navy hover:bg-bg-subtle"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-gray" />
            <span>{sortByDate === 'desc' ? '최신순' : '과거순'}</span>
          </button>

          {/* 테이블/칸반 뷰 토글 버튼 */}
          <div className="flex border border-border p-0.5 rounded-custom bg-bg select-none">
            <button
              onClick={() => onToggleView('table')}
              className={`p-1.5 rounded-custom transition-all duration-150 ${
                currentSubView === 'table' ? 'bg-navy text-bg' : 'text-gray hover:bg-bg-subtle'
              }`}
              title="테이블 리스트 뷰"
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              onClick={() => onToggleView('kanban')}
              className={`p-1.5 rounded-custom transition-all duration-150 ${
                currentSubView === 'kanban' ? 'bg-navy text-bg' : 'text-gray hover:bg-bg-subtle'
              }`}
              title="칸반 영업 파이프라인 뷰"
            >
              <KanbanSquare className="w-4 h-4" />
            </button>
          </div>

          {/* 새로고침 */}
          <button
            onClick={onRefresh}
            className="p-1.5 border border-border rounded-custom bg-bg text-gray hover:bg-bg-subtle"
            title="목록 새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* 신규 수동 대리 접수 등록 버튼 */}
          <button
            onClick={handleAddManualEstimate}
            style={{ touchAction: 'manipulation' }}
            className="flex items-center gap-1.5 bg-steel hover:bg-navy text-bg px-3.5 py-1.5 rounded-custom text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            대리 접수 등록
          </button>

        </div>

      </div>

      {/* 테이블 그리드 영역 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs text-navy">
          <thead className="bg-bg-subtle/80 text-[10px] text-gray-light uppercase tracking-wider border-b border-border select-none">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key}
                  draggable
                  onDragStart={(e) => handleColDragStart(e, idx)}
                  onDragOver={handleColDragOver}
                  onDrop={(e) => handleColDrop(e, idx)}
                  className={`${col.width} px-4 py-1 font-bold ${
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''
                  } cursor-grab active:cursor-grabbing hover:bg-border/30 transition-colors select-none group relative`}
                  title="드래그하여 좌우 순서를 조절할 수 있습니다."
                >
                  <div className={`flex items-center gap-1 ${
                    col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : 'justify-between'
                  }`}>
                    <span>{col.label}</span>
                    <span className="text-[9px] text-gray-light/60 font-normal opacity-0 group-hover:opacity-100 transition-opacity">⋮⋮</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filteredEstimates.length > 0 ? (
              filteredEstimates.map((est) => (
                <tr
                  key={est.id}
                  onClick={() => onSelectEstimate(est.id)}
                  className="hover:bg-bg-subtle/40 transition-colors cursor-pointer"
                >
                  {columns.map((col) => {
                    switch (col.key) {
                      case 'estimate_no':
                        return (
                          <td key={col.key} className="w-[110px] px-4 py-1 font-bold text-[11px] text-steel tabular-nums align-middle">
                            {est.estimate_no}
                          </td>
                        );
                      case 'status':
                        return (
                          <td key={col.key} className="w-[120px] px-4 py-1 align-middle">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-custom text-[10.5px] font-black border shadow-sm select-none align-middle whitespace-nowrap ${getStatusBadgeStyle(est.status)}`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusDotStyle(est.status)}`}></span>
                              <span className="leading-none pt-[1px]">{est.status}</span>
                            </span>
                          </td>
                        );
                      case 'customer':
                        return (
                          <td key={col.key} className="w-[160px] px-4 py-1 align-middle truncate">
                            <span className="font-extrabold text-[12px]">{est.customer_name}</span>
                            {est.company_name && (
                              <span className="text-[9.5px] text-gray-light ml-1 font-semibold">({est.company_name})</span>
                            )}
                          </td>
                        );
                      case 'work_type':
                        return (
                          <td key={col.key} className="w-[110px] px-4 py-1 font-semibold text-gray align-middle">
                            {est.work_type}
                          </td>
                        );
                      case 'category':
                        return (
                          <td key={col.key} className="w-[120px] px-4 py-1 font-bold text-[11px] text-gray align-middle">
                            {getCategoryBadge(est.estimate_category)}
                          </td>
                        );
                      case 'accuracy':
                        return (
                          <td key={col.key} className="w-[70px] px-4 py-1 text-center font-black align-middle">
                            {est.accuracy_grade ? (
                              <span className="bg-navy/5 text-navy border border-border px-1.5 py-0.5 rounded-custom text-[9.5px]">
                                {est.accuracy_grade}
                              </span>
                            ) : (
                              <span className="text-gray-light">-</span>
                            )}
                          </td>
                        );
                      case 'site_address':
                        return (
                          <td key={col.key} className="w-[220px] px-4 py-1 text-[11px] font-medium text-gray align-middle whitespace-normal break-all leading-tight">
                            {est.site_address}
                          </td>
                        );
                      case 'amount':
                        return (
                          <td key={col.key} className="w-[110px] px-4 py-1 text-right font-extrabold text-[12px] text-navy tabular-nums align-middle">
                            {est.estimated_amount ? `₩${est.estimated_amount.toLocaleString()}` : '-'}
                          </td>
                        );
                      default:
                        return null;
                    }
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-xs text-gray-light font-bold">
                  조건에 해당하는 견적 접수 건이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 테이블 풋터 */}
      <div className="p-3 bg-bg-subtle/50 border-t border-border flex items-center justify-between text-[11px] text-gray-light font-bold">
        <span>총 {filteredEstimates.length} 건 출력됨</span>
        <span>* 견적 접수를 클릭하면 상세 메모 기입, 실측 방문 및 금액 조율 모달이 열립니다.</span>
      </div>

      {/* 고품격 Custom Toast 알림 팝창 */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`flex items-center gap-2.5 px-5 py-3.5 rounded-custom shadow-custom-lg border select-none backdrop-blur-md ${
            toast.type === 'success' ? 'bg-navy/95 border-steel text-bg' :
            toast.type === 'error' ? 'bg-danger/95 border-danger/40 text-bg' :
            'bg-bg-subtle/95 border-border text-navy'
          }`}>
            {toast.type === 'success' && <div className="w-2.5 h-2.5 rounded-full bg-accent animate-ping shrink-0" />}
            {toast.type === 'error' && <div className="w-2.5 h-2.5 rounded-full bg-danger animate-ping shrink-0" />}
            <span className="text-[12px] font-black tracking-tight leading-none">{toast.message}</span>
          </div>
        </div>
      )}

    </div>
  );
};
