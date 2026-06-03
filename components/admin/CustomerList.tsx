'use client';

import React, { useEffect, useState } from 'react';
import { Customer } from '@/types/estimate';
import { ZerosService } from '@/lib/supabase/client';
import { Users2, Search, Edit2, Check, X, Award, FileText, TrendingUp } from 'lucide-react';

export const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  
  // 편집 상태
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editGrade, setEditGrade] = useState<Customer['customer_grade']>('신규');
  const [editMemo, setEditMemo] = useState('');

  // 고객 상세 모달 상태
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const loadCustomers = async (showPending = true) => {
    if (showPending) {
      await Promise.resolve();
      setLoading(true);
    }
    try {
      const list = await ZerosService.getCustomers();
      setCustomers(list);
    } catch (e) {
      console.error('Failed to load customers', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void loadCustomers(false);
    });
  }, []);

  const handleEditClick = (cust: Customer) => {
    setEditingCustomerId(cust.id);
    setEditGrade(cust.customer_grade);
    setEditMemo(cust.memo || '');
  };

  const handleSaveClick = async (id: string) => {
    try {
      await ZerosService.updateCustomer(id, {
        customer_grade: editGrade,
        memo: editMemo
      });
      setEditingCustomerId(null);
      await loadCustomers();
      if (selectedCustomer && selectedCustomer.id === id) {
        setSelectedCustomer(prev => prev ? { ...prev, customer_grade: editGrade, memo: editMemo } : null);
      }
    } catch (e) {
      console.error('Failed to update customer', e);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesGrade = gradeFilter === 'all' || c.customer_grade === gradeFilter;
    
    return matchesSearch && matchesGrade;
  });

  const getGradePillClass = (grade: Customer['customer_grade']) => {
    switch (grade) {
      case '수주고객':
        return 'bg-success/15 text-success border border-success/35';
      case '중요고객':
        return 'bg-accent/15 text-accent border border-accent/35';
      case '재문의':
        return 'bg-steel/15 text-steel border border-steel/35';
      case '신규':
        return 'bg-info/15 text-info border border-info/35';
      case '보류고객':
      default:
        return 'bg-gray/15 text-gray border border-gray/35';
    }
  };

  if (loading) {
    return <div className="text-xs font-bold text-gray-light text-center py-12">고객 데이터베이스 불러오는 중...</div>;
  }

  // 총 누적 실적 집계
  const totalRevenue = customers.reduce((acc, curr) => acc + (curr.total_revenue || 0), 0);
  const totalWon = customers.reduce((acc, curr) => acc + (curr.total_won || 0), 0);
  const totalRequests = customers.reduce((acc, curr) => acc + (curr.total_requests || 0), 0);

  return (
    <div className="flex flex-col gap-6 select-none font-sans max-w-5xl mx-auto py-2">
      
      {/* 타이틀 및 헤더 */}
      <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm">
        <span className="text-[10px] text-steel font-black uppercase tracking-widest">ZEROS CRM Portal</span>
        <h2 className="text-xl font-black text-navy leading-none">고객 데이터베이스 및 가치 관리</h2>
        <p className="text-[12.5px] text-gray leading-relaxed mt-1">
          사전진단 신청 이력이 누적된 핵심 B2B 고객사 파이프라인 관리 화면입니다. 누적 문의 수, 수주 매출, CRM 등급을 통합 집계합니다.
        </p>
      </div>

      {/* 고객 CRM 핵심 KPI 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-bg border border-border p-4.5 rounded-custom shadow-sm flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[9.5px] text-gray-light font-bold block uppercase tracking-wider">누적 고객 수</span>
            <span className="text-xl font-black text-navy tabular-nums">{customers.length}명</span>
          </div>
          <Users2 className="w-8 h-8 text-steel/25" />
        </div>
        <div className="bg-bg border border-border p-4.5 rounded-custom shadow-sm flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[9.5px] text-gray-light font-bold block uppercase tracking-wider">누적 총 의뢰 건수</span>
            <span className="text-xl font-black text-navy tabular-nums">{totalRequests}건</span>
          </div>
          <FileText className="w-8 h-8 text-steel/25" />
        </div>
        <div className="bg-bg border border-border p-4.5 rounded-custom shadow-sm flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[9.5px] text-gray-light font-bold block uppercase tracking-wider">총 계약 성공</span>
            <span className="text-xl font-black text-success tabular-nums">{totalWon}건</span>
          </div>
          <Award className="w-8 h-8 text-success/25" />
        </div>
        <div className="bg-bg border border-border p-4.5 rounded-custom shadow-sm flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[9.5px] text-gray-light font-bold block uppercase tracking-wider">누적 계약 고정 매출</span>
            <span className="text-lg font-black text-navy tabular-nums">₩{totalRevenue.toLocaleString()}</span>
          </div>
          <TrendingUp className="w-8 h-8 text-navy/20" />
        </div>
      </div>

      {/* 필터 및 검색 유틸리티 바 */}
      <div className="bg-bg border border-border p-4.5 rounded-custom shadow-custom-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="고객명, 회사명, 연락처 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs border border-border rounded-custom px-3 py-2 pl-8 focus:outline-none focus:border-steel placeholder-gray-light font-medium bg-bg text-navy"
          />
          <Search className="w-3.5 h-3.5 text-gray-light absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-[10px] text-gray font-black tracking-wide shrink-0">고객 CRM 등급 필터:</span>
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="text-xs border border-border rounded-custom bg-bg px-2.5 py-1.5 focus:outline-none focus:border-steel font-extrabold text-navy"
          >
            <option value="all">전체 보기</option>
            <option value="신규">신규</option>
            <option value="재문의">재문의</option>
            <option value="중요고객">중요고객</option>
            <option value="수주고객">수주고객</option>
            <option value="보류고객">보류고객</option>
          </select>
        </div>
      </div>

      {/* 고객 대장 리스트 테이블 */}
      <div className="bg-bg border border-border rounded-custom shadow-custom-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-bg-subtle text-[10px] text-gray-light font-bold border-b border-border uppercase">
              <tr>
                <th className="p-3">고객명 (회사)</th>
                <th className="p-3">연락처 / 이메일</th>
                <th className="p-3">현장 업종</th>
                <th className="p-3 text-center">CRM 등급</th>
                <th className="p-3 text-center">의뢰 (성공)</th>
                <th className="p-3 text-right">누적 기여 매출</th>
                <th className="p-3">고객 관리 메모</th>
                <th className="p-3 text-center">동작</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs font-bold text-gray-light">
                    일치하는 고객 정보가 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const isEditing = editingCustomerId === c.id;
                  return (
                    <tr 
                      key={c.id} 
                      className={`hover:bg-bg-subtle/25 font-medium transition-colors ${
                        c.customer_grade === '중요고객' ? 'bg-accent/5' : ''
                      }`}
                    >
                      {/* 이름 & 회사 */}
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-navy text-[13px]">{c.customer_name}</span>
                          <span className="text-[10px] text-gray-light font-bold mt-0.5">
                            {c.company_name || '개인 사업주'}
                          </span>
                        </div>
                      </td>

                      {/* 연락처 & 이메일 */}
                      <td className="p-3">
                        <div className="flex flex-col tabular-nums">
                          <span className="text-gray text-[12px]">{c.phone}</span>
                          <span className="text-[10px] text-gray-light font-bold mt-0.5">{c.email || '-'}</span>
                        </div>
                      </td>

                      {/* 현장 업종 */}
                      <td className="p-3 text-gray">{c.customer_type}</td>

                      {/* 등급 피드백 */}
                      <td className="p-3 text-center">
                        {isEditing ? (
                          <select
                            value={editGrade}
                            onChange={(e) => setEditGrade(e.target.value as Customer['customer_grade'])}
                            className="text-[11px] font-black border border-border rounded-custom px-1.5 py-1 bg-bg text-navy"
                          >
                            <option value="신규">신규</option>
                            <option value="재문의">재문의</option>
                            <option value="중요고객">중요고객</option>
                            <option value="수주고객">수주고객</option>
                            <option value="보류고객">보류고객</option>
                          </select>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-custom text-[9.5px] font-extrabold inline-block ${getGradePillClass(c.customer_grade)}`}>
                            {c.customer_grade}
                          </span>
                        )}
                      </td>

                      {/* 의뢰 및 수주량 */}
                      <td className="p-3 text-center font-bold text-steel tabular-nums">
                        {c.total_requests}건 <span className="text-[10.5px] text-success font-black">({c.total_won})</span>
                      </td>

                      {/* 누적 매출 */}
                      <td className="p-3 text-right font-extrabold text-navy tabular-nums">
                        ₩{c.total_revenue.toLocaleString()}
                      </td>

                      {/* 메모 편집란 */}
                      <td className="p-3 max-w-[200px]">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editMemo}
                            onChange={(e) => setEditMemo(e.target.value)}
                            className="w-full text-[11px] border border-border rounded-custom px-2 py-1 bg-bg text-navy focus:outline-none focus:border-steel font-medium"
                          />
                        ) : (
                          <p className="text-gray text-[11.5px] truncate font-medium max-w-[180px]" title={c.memo}>
                            {c.memo || <span className="text-gray-light italic">등록 메모 없음</span>}
                          </p>
                        )}
                      </td>

                      {/* 편집 등 도구 */}
                      <td className="p-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleSaveClick(c.id)}
                              className="p-1.5 rounded-custom bg-success/15 hover:bg-success text-success hover:text-bg transition-colors"
                              title="저장"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingCustomerId(null)}
                              className="p-1.5 rounded-custom bg-danger/15 hover:bg-danger text-danger hover:text-bg transition-colors"
                              title="취소"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleEditClick(c)}
                              className="p-1.5 rounded-custom border border-border hover:bg-bg-subtle text-gray hover:text-navy transition-all"
                              title="CRM 수정"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setSelectedCustomer(c)}
                              className="px-2 py-1 text-[10px] font-black border border-steel/20 rounded-custom text-steel hover:bg-steel hover:text-bg transition-all"
                            >
                              조회
                            </button>
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 고객 상세 팝업 모달 */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-navy/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-bg border border-border max-w-lg w-full rounded-custom shadow-custom-md overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* 헤더 */}
            <div className="bg-navy text-bg p-4 flex items-center justify-between border-b border-border select-none">
              <div className="flex flex-col">
                <span className="text-[10px] text-bg/60 font-black uppercase tracking-wider">Customer Profile Details</span>
                <h3 className="text-base font-black tracking-tight mt-0.5">{selectedCustomer.customer_name} 고객사 정보</h3>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="text-bg/80 hover:text-bg bg-bg/10 hover:bg-bg/25 rounded-custom p-1.5 transition-all text-xs font-bold"
              >
                닫기
              </button>
            </div>

            {/* 본문 상세 */}
            <div className="p-6 flex flex-col gap-5 overflow-y-auto font-medium text-navy text-xs">
              
              <div className="grid grid-cols-2 gap-4 border-b border-border/60 pb-4">
                <div>
                  <span className="text-gray-light font-bold block mb-1">고객 등급</span>
                  <span className={`px-2 py-0.5 rounded-custom text-[10px] font-black ${getGradePillClass(selectedCustomer.customer_grade)}`}>
                    {selectedCustomer.customer_grade}
                  </span>
                </div>
                <div>
                  <span className="text-gray-light font-bold block mb-1">가입 / 등록일</span>
                  <span className="text-gray tabular-nums">
                    {new Date(selectedCustomer.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3.5 border-b border-border/60 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-light font-bold block mb-1">회사명</span>
                    <span className="text-navy text-[13px] font-extrabold">
                      {selectedCustomer.company_name || '개인 사업주'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-light font-bold block mb-1">연락처</span>
                    <span className="text-navy text-[13px] font-extrabold tabular-nums">
                      {selectedCustomer.phone}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-light font-bold block mb-1">이메일 주소</span>
                  <span className="text-navy text-[12px]">{selectedCustomer.email || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-light font-bold block mb-1">대표 현장 주소</span>
                  <span className="text-gray leading-normal">{selectedCustomer.site_address || '등록 주소 없음'}</span>
                </div>
                <div>
                  <span className="text-gray-light font-bold block mb-1">업종 분류</span>
                  <span className="text-gray">{selectedCustomer.customer_type}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3.5 border-b border-border/60 pb-4">
                <span className="text-navy font-extrabold text-[12.5px] block border-b border-border/40 pb-1.5">
                  비즈니스 트랙 레코드 (수주 통계)
                </span>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-bg-subtle p-3 rounded-custom border border-border">
                    <span className="text-gray-light font-bold block mb-0.5">총 사전의뢰</span>
                    <span className="text-base font-black text-navy tabular-nums">{selectedCustomer.total_requests}건</span>
                  </div>
                  <div className="bg-bg-subtle p-3 rounded-custom border border-border">
                    <span className="text-gray-light font-bold block mb-0.5">최종 계약 성공</span>
                    <span className="text-base font-black text-success tabular-nums">{selectedCustomer.total_won}건</span>
                  </div>
                  <div className="bg-bg-subtle p-3 rounded-custom border border-border">
                    <span className="text-gray-light font-bold block mb-0.5">수주성공율</span>
                    <span className="text-base font-black text-steel tabular-nums">
                      {selectedCustomer.total_requests > 0 
                        ? Math.round((selectedCustomer.total_won / selectedCustomer.total_requests) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-navy/5 p-3 rounded-custom border border-border">
                  <span className="text-[11px] text-navy font-bold">누적 기여 매출액 (CAPEX 수주계약 기준)</span>
                  <span className="text-sm font-black text-navy tabular-nums">₩{selectedCustomer.total_revenue.toLocaleString()}</span>
                </div>
              </div>

              {/* CRM 메모 */}
              <div>
                <span className="text-gray-light font-bold block mb-1.5">고객 특이사항 & CRM 메모</span>
                <div className="bg-bg-subtle p-3.5 rounded-custom border border-border text-gray text-[12px] leading-relaxed whitespace-pre-line">
                  {selectedCustomer.memo || '등록된 메모나 특별 요청 이력이 없습니다.'}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
