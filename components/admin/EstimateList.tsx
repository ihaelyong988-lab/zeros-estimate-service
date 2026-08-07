'use client';

import React, { useState } from 'react';
import { Estimate, EstimateStatus, EstimateCategory } from '@/types/estimate';
import { supplyAmountOf } from '@/lib/quote/amounts';
import { menuDisplayName } from '@/lib/constants/menu';
import { Search, ArrowUpDown, KanbanSquare, Table, RefreshCw, AlertCircle } from 'lucide-react';

// ==========================================
// 페이지 계산 (순수 함수 — 회귀 테스트: test/admin/pagination.test.ts)
// ==========================================
// 접수가 쌓이면 전 건 렌더는 화면을 무겁게 만들고 탐색을 스크롤에만 의존하게 한다.
// 경계 계산(범위 라벨·마지막 페이지 접힘)은 화면과 분리해 테스트로 고정한다(AGENTS §14-1).

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

export interface PageSlice<T> {
  /** 보정된 현재 페이지(1부터). 범위를 벗어난 입력은 마지막 페이지로 접는다 */
  page: number;
  /** 전체 페이지 수. 0건이어도 1 */
  totalPages: number;
  /** 대상 건수(필터 적용 후) */
  total: number;
  /** 표시 구간 시작 번호(1부터, 0건이면 0) */
  from: number;
  /** 표시 구간 끝 번호(0건이면 0) */
  to: number;
  /** 이번 페이지에 렌더할 항목 */
  items: T[];
}

/**
 * 필터 결과를 페이지 단위로 자른다.
 * - 필터가 좁혀져 페이지 수가 줄어도 빈 화면이 아니라 마지막 페이지를 보여준다.
 * - 잘못된 입력(0·음수·NaN·소수)은 사용 가능한 값으로 보정한다.
 */
export function paginate<T>(items: T[], page: number, pageSize: number): PageSlice<T> {
  const list = Array.isArray(items) ? items : [];
  const size = Number.isFinite(pageSize) ? Math.max(1, Math.floor(pageSize)) : DEFAULT_PAGE_SIZE;
  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const requested = Number.isFinite(page) ? Math.floor(page) : 1;
  const current = Math.min(Math.max(requested, 1), totalPages);
  const startIdx = (current - 1) * size;
  const pageItems = list.slice(startIdx, startIdx + size);

  return {
    page: current,
    totalPages,
    total,
    from: total === 0 ? 0 : startIdx + 1,
    to: total === 0 ? 0 : startIdx + pageItems.length,
    items: pageItems,
  };
}

/**
 * 풋터 표시 범위 문구.
 * 총계가 필터 결과 기준인지 전체 기준인지 라벨로 구분한다 — 같은 숫자를 두 뜻으로 읽히게 두지 않는다.
 */
export function rangeLabelOf(slice: Pick<PageSlice<unknown>, 'total' | 'from' | 'to'>, overallTotal: number, filtered: boolean): string {
  if (!filtered) {
    return slice.total === 0 ? '전체 0건' : `전체 ${slice.total}건 중 ${slice.from}–${slice.to} 표시`;
  }
  if (slice.total === 0) return `필터 결과 0건 (전체 ${overallTotal}건)`;
  return `필터 결과 ${slice.total}건 중 ${slice.from}–${slice.to} 표시 (전체 ${overallTotal}건)`;
}

// ==========================================
// 검색 필터 · 관리자 세션 판정 (순수 함수 — 회귀 테스트: test/admin/estimateRows.test.ts)
// ==========================================
// /api/data 는 관리자 토큰이 만료돼도 견적 테이블만은 PII 를 제거한 행을 200 으로 돌려준다
// (공개 실적 화면이 살아 있어야 하므로 그 설계는 유지된다). 그 행에는 customer_name·
// site_address·estimate_no 가 없어서, 필드 접근을 화면에 두면 목록 전체가 TypeError 로 죽는다.

/** 검색이 훑는 필드만 추린 최소 형태. PII 가 제거된 행도 그대로 담긴다. */
export type SearchableEstimate = Partial<
  Pick<Estimate, 'customer_name' | 'company_name' | 'site_address' | 'estimate_no'>
>;

const SEARCH_FIELDS = ['customer_name', 'company_name', 'site_address', 'estimate_no'] as const;

/** 행은 jsonb 그대로 들어오므로 타입이 어긋난 옛 데이터도 빈 문자열로 본다. */
function searchText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** 검색어 일치 여부. 빈 검색어는 전부 통과한다. */
export function matchesSearch(est: SearchableEstimate, term: string): boolean {
  const needle = term.toLowerCase();
  if (needle === '') return true;
  return SEARCH_FIELDS.some((key) => searchText(est[key]).toLowerCase().includes(needle));
}

/**
 * 관리자 필드가 통째로 빠진 응답 = 토큰 만료로 공개(PII 제거) 행을 받은 상태.
 * 서버가 전 행을 일괄 치환하므로 every 로 본다 — 필드가 빠진 옛 행 하나 때문에 정상 목록을 잠그지 않는다.
 */
export function isAdminSessionExpired(rows: readonly SearchableEstimate[]): boolean {
  return rows.length > 0 && rows.every((row) => typeof row.customer_name !== 'string');
}

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

  // 페이지네이션 — 컬럼 순서(columns·draggedColIdx) 상태와 독립이다.
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // 검색어·필터·정렬이 바뀌면 첫 페이지로 되돌린다.
  // (3페이지에서 조건을 바꾸면 결과가 있어도 빈 화면을 보게 된다.)
  const toFirstPage = () => setPage(1);

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
      const matchSearch = matchesSearch(est, searchTerm);

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

  // 이번 페이지에 렌더할 구간. 필터가 좁혀져 페이지가 줄면 paginate 가 마지막 페이지로 접는다.
  const hasFilter =
    searchTerm.trim() !== '' ||
    workTypeFilter !== 'all' ||
    categoryFilter !== 'all' ||
    statusFilter !== 'all';
  const pageSlice = paginate(filteredEstimates, page, pageSize);
  const rangeLabel = rangeLabelOf(pageSlice, estimates.length, hasFilter);

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

  // 세션이 끊긴 상태에서 받은 PII 제거 행을 정상 접수 데이터처럼 그리지 않는다.
  // 목록을 그대로 두면 관리자가 "접수가 비었다"로 오독한다 — 목록 대신 재로그인 경로를 알린다.
  if (isAdminSessionExpired(estimates)) {
    return (
      <div className="bg-bg border border-border rounded-custom shadow-custom-sm font-sans p-6">
        <div
          role="alert"
          aria-live="assertive"
          className="bg-danger/5 border border-danger/20 rounded-custom px-4 py-3 flex items-start gap-2"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-px text-danger" />
          <span className="text-[13.5px] font-bold text-danger leading-snug">
            관리자 세션이 만료되었습니다. 다시 로그인해 주세요.
          </span>
        </div>
      </div>
    );
  }

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
            onChange={(e) => { setSearchTerm(e.target.value); toFirstPage(); }}
            className="w-full pl-9 pr-4 py-2 text-xs border border-border rounded-custom bg-bg focus:outline-none focus:border-steel"
          />
        </div>

        {/* 필터 셀렉터 및 뷰 스위치 */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* 공사 종류 필터 */}
          <select
            value={workTypeFilter}
            onChange={(e) => { setWorkTypeFilter(e.target.value); toFirstPage(); }}
            className="border border-border rounded-custom bg-bg px-2.5 py-1.5 text-xs text-navy focus:outline-none"
          >
            {/* value = DB 저장 키(불변) · 라벨만 표시명. 고객 화면과 같은 이름으로 읽히게 한다. */}
            <option value="all">전체 공사종류</option>
            <option value="배관공사">{menuDisplayName('배관공사')}</option>
            <option value="장비설치">{menuDisplayName('장비설치')}</option>
            <option value="Utility 배관">{menuDisplayName('Utility 배관')}</option>
            <option value="공장증설">{menuDisplayName('공장증설')}</option>
            <option value="노후배관교체">{menuDisplayName('노후배관교체')}</option>
            <option value="기계실개선">{menuDisplayName('기계실개선')}</option>
            <option value="생산설비 배관 연결">{menuDisplayName('생산설비 배관 연결')}</option>
            <option value="CAPEX 개·증설 검토">{menuDisplayName('CAPEX 개·증설 검토')}</option>
          </select>

          {/* 규모 분류 필터 */}
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); toFirstPage(); }}
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
            onChange={(e) => { setStatusFilter(e.target.value); toFirstPage(); }}
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
            onClick={() => { setSortByDate(prev => prev === 'desc' ? 'asc' : 'desc'); toFirstPage(); }}
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
            {pageSlice.items.length > 0 ? (
              pageSlice.items.map((est) => (
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
                            {menuDisplayName(est.work_type)}
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
                      case 'amount': {
                        // 견적금액 = 공급가액(VAT 별도)
                        const supply = supplyAmountOf(est);
                        return (
                          <td key={col.key} className="w-[110px] px-4 py-1 text-right font-extrabold text-[12px] text-navy tabular-nums align-middle">
                            {supply > 0 ? `₩${supply.toLocaleString()}` : '-'}
                          </td>
                        );
                      }
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

      {/* 테이블 풋터 — 표시 범위 · 페이지 이동 */}
      <div className="bg-bg-subtle/50 border-t border-border">
        <div className="px-3 py-2 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <span className="text-[11px] text-gray font-bold tabular-nums">{rangeLabel}</span>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-[11px] text-gray font-bold shrink-0">
              <span>페이지당</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); toFirstPage(); }}
                className="border border-border rounded-custom bg-bg px-2 min-h-[44px] text-xs text-navy tabular-nums"
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}건</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => setPage(pageSlice.page - 1)}
              disabled={pageSlice.page <= 1}
              aria-label="이전 페이지"
              className="min-w-[44px] min-h-[44px] px-3 border border-border rounded-custom bg-bg text-xs font-bold text-navy hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed"
            >
              이전
            </button>

            {/* role="status" = 암묵적 aria-live="polite" — 페이지 이동을 보조기술에 알린다.
                (aria-live 속성을 직접 쓰면 ui-quality-gate R1 의 에러 alert 탐지가 무력화된다.) */}
            <span className="px-1 text-[11px] text-gray font-bold tabular-nums" role="status">
              {pageSlice.page} / {pageSlice.totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage(pageSlice.page + 1)}
              disabled={pageSlice.page >= pageSlice.totalPages}
              aria-label="다음 페이지"
              className="min-w-[44px] min-h-[44px] px-3 border border-border rounded-custom bg-bg text-xs font-bold text-navy hover:bg-bg-subtle disabled:opacity-40 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        </div>

        <p className="px-3 pb-2 text-[11px] text-gray">
          * 견적 접수를 클릭하면 상세 메모 기입, 실측 방문 및 금액 조율 모달이 열립니다.
        </p>
      </div>

    </div>
  );
};
