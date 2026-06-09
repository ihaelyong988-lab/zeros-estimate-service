'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Estimate, EstimateStatus, AccuracyGrade, Payment, SiteVisit } from '@/types/estimate';
import { ZerosService } from '@/lib/supabase/client';
import { uploadEstimateFiles } from '@/lib/supabase/storage';
import { isSupabaseEnabled } from '@/lib/supabase/supabaseBrowser';
import { validateFileFormat, ACCEPT_ATTR } from '@/lib/constants/uploadLimits';
import { TossPaymentModal } from './TossPaymentModal';
import { PrintableScopeSheet } from './PrintableScopeSheet';
import { AiBlueprintAnalyzer } from '../forms/AiBlueprintAnalyzer';
import {
  X,
  User,
  ClipboardList,
  CalendarCheck,
  FileCheck,
  CreditCard,
  Plus,
  FolderOpen,
  Printer,
  Cpu
} from 'lucide-react';

interface EstimateDetailModalProps {
  estimateId: string;
  onClose: () => void;
  onSaved: () => void;
}

type AdminPaymentStatus = '결제대기' | '결제완료' | '환불';

export const EstimateDetailModal: React.FC<EstimateDetailModalProps> = ({
  estimateId,
  onClose,
  onSaved
}) => {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 수정할 필드 상태 관리
  const [status, setStatus] = useState<EstimateStatus>('접수완료');
  const [accuracyGrade, setAccuracyGrade] = useState<AccuracyGrade | ''>('');
  const [adminMemo, setAdminMemo] = useState('');
  const [estimatedAmount, setEstimatedAmount] = useState<number | ''>('');
  const [confirmedContractAmount, setConfirmedContractAmount] = useState<number | ''>('');
  
  // 방문 실측 폼 상태
  const [visitDate, setVisitDate] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [visitPurpose, setVisitPurpose] = useState('현장 실측 및 경로 검수');
  const [visitStatus, setVisitStatus] = useState<SiteVisit['visit_status']>('예정');
  
  // 결제 관련 수동 연동
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payType, setPayType] = useState<'온라인검토비' | '출장견적비' | '프로젝트 사전진단비'>('출장견적비');
  const [payStatus, setPayStatus] = useState<AdminPaymentStatus>('결제대기');

  // 2차 고도화 모달 상태
  const [showTossModal, setShowTossModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAiAnalyzer, setShowAiAnalyzer] = useState(false);

  // 관리자 파일 업로드 - 실제 파일 선택 후 Storage 업로드
  const adminFileInputRef = useRef<HTMLInputElement | null>(null);
  const [adminUploadCategory, setAdminUploadCategory] = useState<string>('도면');
  const [adminUploading, setAdminUploading] = useState(false);

  const refreshDetailData = async () => {
    try {
      const est = await ZerosService.getEstimateById(estimateId);
      if (est) {
        setEstimate(est);
        setStatus(est.status);
        setAccuracyGrade(est.accuracy_grade || '');
        setAdminMemo(est.admin_memo || '');
        setEstimatedAmount(est.estimated_amount || '');
        setConfirmedContractAmount(est.confirmed_contract_amount || '');
      }
      const pays = await ZerosService.getPayments();
      setPayments(pays.filter(p => p.estimate_id === estimateId));
    } catch (e) {
      console.error('Failed to refresh detailed data', e);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const est = await ZerosService.getEstimateById(estimateId);
        if (est) {
          setEstimate(est);
          setStatus(est.status);
          setAccuracyGrade(est.accuracy_grade || '');
          setAdminMemo(est.admin_memo || '');
          setEstimatedAmount(est.estimated_amount || '');
          setConfirmedContractAmount(est.confirmed_contract_amount || '');
        }
        
        // 결제 정보 적재
        const pays = await ZerosService.getPayments();
        setPayments(pays.filter(p => p.estimate_id === estimateId));
      } catch (e) {
        console.error('Failed to load detail for estimate id', estimateId, e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [estimateId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-xs flex items-center justify-center text-xs font-bold text-bg select-none">
        기초 자료 로딩 및 보안 세션 구성 중...
      </div>
    );
  }

  if (!estimate) {
    return null;
  }

  // 1. 기본 메타정보 저장 액션
  const handleSaveMeta = async () => {
    try {
      await ZerosService.updateEstimate(estimate.id, {
        status: status,
        accuracy_grade: accuracyGrade === '' ? undefined : accuracyGrade,
        admin_memo: adminMemo,
        estimated_amount: estimatedAmount === '' ? undefined : Number(estimatedAmount),
        confirmed_contract_amount: confirmedContractAmount === '' ? undefined : Number(confirmedContractAmount)
      });
      alert('견적 기본 정보가 성공적으로 업데이트되었습니다.');
      onSaved();
    } catch (e) {
      console.error(e);
      alert('기본 정보 변경 도중 오류가 발생했습니다.');
    }
  };

  // 2. 출장방문 등록 액션
  const handleAddVisit = async () => {
    if (!visitDate || !visitorName) {
      alert('방문일자와 담당자명을 입력해 주세요.');
      return;
    }
    try {
      await ZerosService.createSiteVisit({
        estimate_id: estimate.id,
        visit_date: visitDate,
        visitor_name: visitorName,
        visit_purpose: visitPurpose,
        visit_status: visitStatus
      });
      alert('현장방문 스케줄이 성공적으로 연동되었습니다.');
      
      // 상태 최신화
      const updated = await ZerosService.getEstimateById(estimateId);
      if (updated) {
        setEstimate(updated);
        setStatus(updated.status);
      }
      onSaved();
    } catch (e) {
      console.error(e);
      alert('방문 정보 등록 도중 오류가 발생했습니다.');
    }
  };

  // 3. 결제 정보 등록 액션
  const handleAddPayment = async () => {
    if (!payAmount) {
      alert('결제 금액을 기입해 주세요.');
      return;
    }
    try {
      const newPay = await ZerosService.createPayment({
        estimate_id: estimate.id,
        payment_type: payType,
        amount: Number(payAmount),
        payment_status: payStatus,
        memo: `관리자 수동 청구: ${payType} 건`
      });
      
      setPayments(prev => [newPay, ...prev]);
      alert('결제 정보가 성공적으로 매핑되었습니다.');
      
      // 상태 최신화
      const updated = await ZerosService.getEstimateById(estimateId);
      if (updated) {
        setEstimate(updated);
      }
      onSaved();
    } catch (e) {
      console.error(e);
      alert('결제 등록 도중 오류가 발생했습니다.');
    }
  };

  // 4. 견적 건 영구 삭제 액션
  const handleDeleteEstimate = async () => {
    if (!estimate) return;
    if (!confirm(`[경고] 접수번호 ${estimate.estimate_no} 의뢰 건을 영구히 삭제하시겠습니까?\n이 작업은 방문 일정, 결제 내역을 포함한 모든 이력이 유실되며 복구할 수 없습니다.`)) return;
    try {
      // 1. 견적서 삭제
      const list = await ZerosService.getEstimates();
      const updatedList = list.filter(e => e.id !== estimate.id);
      localStorage.setItem('zeros_estimates', JSON.stringify(updatedList));

      // 2. 관련 결제 내역 삭제
      const pays = await ZerosService.getPayments();
      const updatedPays = pays.filter(p => p.estimate_id !== estimate.id);
      localStorage.setItem('zeros_payments', JSON.stringify(updatedPays));

      // 3. 관련 현장방문 내역 삭제
      const visits = await ZerosService.getSiteVisits();
      const updatedVisits = visits.filter(v => v.estimate_id !== estimate.id);
      localStorage.setItem('zeros_site_visits', JSON.stringify(updatedVisits));

      alert(`접수번호 ${estimate.estimate_no} 의뢰 건이 성공적으로 영구 삭제되었습니다.`);
      onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      alert('의뢰서 삭제 도중 오류가 발생했습니다.');
    }
  };

  const openAdminFilePicker = (category: string) => {
    if (!estimate) return;
    setAdminUploadCategory(category);
    setTimeout(() => adminFileInputRef.current?.click(), 0);
  };

  const handleAdminFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!estimate) return;
    const selected = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (selected.length === 0) return;

    const formatError = validateFileFormat(selected);
    if (formatError) {
      alert(formatError);
      return;
    }

    setAdminUploading(true);
    try {
      let uploaded;
      if (isSupabaseEnabled) {
        uploaded = await uploadEstimateFiles(selected, adminUploadCategory, estimate.id);
      } else {
        uploaded = selected.map((f, i) => ({
          id: `file-admin-local-${Date.now()}-${i}`,
          estimate_id: estimate.id,
          file_name: f.name,
          file_type: f.type || 'application/octet-stream',
          file_url: '',
          file_category: adminUploadCategory,
          file_size: f.size,
          uploaded_at: new Date().toISOString(),
        }));
      }

      const updatedFiles = [...(estimate.submitted_files || []), ...uploaded];
      await ZerosService.updateEstimate(estimate.id, {
        submitted_files: updatedFiles
      });
      alert(`[관리자 업로드 성공] ${uploaded.length}개 자료가 견적서에 등록되었습니다.`);
      await refreshDetailData();
      onSaved();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : '파일 업로드 도중 오류가 발생했습니다.');
    } finally {
      setAdminUploading(false);
    }
  };

  // 관리자 파일 제거 핸들러 - §4.5
  const handleRemoveFile = async (idx: number) => {
    if (!estimate || !estimate.submitted_files) return;
    if (!confirm('해당 첨부 자료를 영구히 삭제하시겠습니까?')) return;

    try {
      const updatedFiles = estimate.submitted_files.filter((_, i) => i !== idx);
      await ZerosService.updateEstimate(estimate.id, {
        submitted_files: updatedFiles
      });
      alert('해당 첨부 자료가 안전하게 삭제되었습니다.');
      await refreshDetailData();
      onSaved();
    } catch (e) {
      console.error(e);
      alert('파일 삭제 도중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 select-none font-sans overflow-hidden">
      
      {/* 모달 윈도우 */}
      <div className="w-full max-w-4xl h-[90vh] bg-bg border border-border rounded-custom shadow-custom-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* 모달 헤더 */}
        <div className="bg-bg-subtle border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="bg-steel/15 text-steel px-2 py-0.5 rounded-custom text-[10px] font-black tracking-wider">
              {estimate.estimate_category.toUpperCase()}
            </span>
            <span className="font-extrabold text-navy tracking-tight text-[15px] tabular-nums">
              의뢰 상세: {estimate.estimate_no}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-border/30 rounded-custom text-gray transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 모달 바디 (스크롤 구역) */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* 1. 고객 기초자료 및 공사 범위 카드 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 좌측 2칸: 인적정보 및 신청 내용 */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              
              <div className="bg-bg border border-border p-5 rounded-custom shadow-sm flex flex-col gap-3">
                <h4 className="text-xs font-bold text-navy flex items-center gap-1.5 border-b border-border/80 pb-2">
                  <User className="w-4 h-4 text-steel" />
                  고객 인적사항
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs leading-relaxed text-gray">
                  <div>
                    <span className="font-semibold block text-[10.5px] text-gray-light">성함 (회사/소속)</span>
                    <span className="font-extrabold text-navy text-[13px]">{estimate.customer_name} ({estimate.company_name || '개인'})</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-[10.5px] text-gray-light">연락처 / 이메일</span>
                    <span className="font-bold text-navy text-[12px]">{estimate.phone} / {estimate.email}</span>
                  </div>
                  <div className="col-span-2 border-t border-border/60 pt-2">
                    <span className="font-semibold block text-[10.5px] text-gray-light">현장 시공 주소</span>
                    <span className="font-bold text-navy text-[12px]">{estimate.site_address}</span>
                  </div>
                </div>
              </div>

              <div className="bg-bg border border-border p-5 rounded-custom shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-border/80 pb-2">
                  <h4 className="text-xs font-bold text-navy flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-steel" />
                    상세 진단 요청 사항
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAiAnalyzer(prev => !prev)}
                    className="flex items-center gap-1 text-steel hover:text-navy text-[10.5px] font-black border border-steel/20 rounded-custom px-2.5 py-1 bg-bg transition-all"
                  >
                    <Cpu className="w-3 h-3 text-steel" />
                    AI 도면 스캔 분석
                  </button>
                </div>

                {showAiAnalyzer && (
                  <div className="my-2 border-b border-border/50 pb-3">
                    <AiBlueprintAnalyzer
                      onAnalysisComplete={(res) => {
                        setAccuracyGrade(res.accuracy_grade);
                        setEstimatedAmount(res.estimated_amount);
                        setAdminMemo(prev => prev ? `${prev}\n${res.description}` : res.description);
                        
                        // 인라인 estimate 객체 업데이트용 임시 반사
                        setEstimate(prev => prev ? { 
                          ...prev, 
                          work_purpose: res.work_purpose,
                          description: `${prev.description}\n${res.description}`,
                          request_detail: res.request_detail,
                          accuracy_grade: res.accuracy_grade,
                          estimated_amount: res.estimated_amount
                        } : null);
                        
                        setShowAiAnalyzer(false);
                      }}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-2 text-xs leading-relaxed text-gray">
                  <div>
                    <span className="font-semibold block text-[10.5px] text-gray-light">공사 종류 (용도 / 목적)</span>
                    <span className="font-bold text-navy">{estimate.work_type} ({estimate.site_type} / {estimate.work_purpose})</span>
                  </div>
                  <div>
                    <span className="font-semibold block text-[10.5px] text-gray-light">현재 발생 문제점 및 요구 내용</span>
                    <p className="bg-bg-subtle/80 p-3 rounded-custom border border-border text-[11.5px] text-navy leading-normal whitespace-pre-line mt-1">
                      {estimate.description}
                    </p>
                  </div>
                  {estimate.request_detail && (
                    <div>
                      <span className="font-semibold block text-[10.5px] text-gray-light">추가 기획 / 장비 제약 요건</span>
                      <p className="bg-bg-subtle/50 p-3 rounded-custom border border-border/60 text-[11.5px] text-gray leading-normal whitespace-pre-line mt-1">
                        {estimate.request_detail}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 첨부 파일 관리 카드 (고객 제출 & 관리자 전용 업로드 기능 통합) */}
              <div className="bg-bg border border-border p-5 rounded-custom shadow-sm flex flex-col gap-3">
                <h4 className="text-xs font-bold text-navy flex items-center gap-1.5 border-b border-border/80 pb-2">
                  <FolderOpen className="w-4 h-4 text-steel animate-pulse" />
                  진단 증빙자료 및 도면 파일 관리 (고객 & 관리자)
                </h4>
                
                {/* 파일 리스트 */}
                {estimate.submitted_files && estimate.submitted_files.length > 0 ? (
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                    {estimate.submitted_files.map((file, idx) => (
                      <div key={file.id || idx} className="flex items-center justify-between bg-bg-subtle border border-border p-2.5 rounded-custom text-xs font-semibold">
                        <div className="flex items-center gap-2 text-gray min-w-0">
                          <span className={`px-1.5 py-0.5 rounded-custom text-[9px] font-black shrink-0 ${
                            file.file_category === '도면' ? 'bg-steel/15 text-steel' :
                            file.file_category === '사진' ? 'bg-accent/15 text-accent' : 'bg-navy/15 text-navy'
                          }`}>
                            {file.file_category}
                          </span>
                          {file.file_url ? (
                            <a
                              href={file.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-steel font-bold text-[11px] underline decoration-steel/40 hover:decoration-steel"
                              title="새 창에서 열기 / 다운로드"
                            >
                              {file.file_name}
                            </a>
                          ) : (
                            <span className="truncate text-navy font-bold text-[11px]">{file.file_name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-gray-light text-[10px] select-none">
                          <span className="mr-1">{new Date(file.uploaded_at).toLocaleDateString()}</span>
                          {file.file_url && (
                            <a
                              href={file.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ touchAction: 'manipulation' }}
                              className="p-1 hover:bg-border/35 rounded-custom text-steel hover:text-navy transition-colors cursor-pointer"
                              title="열기 / 다운로드"
                            >
                              보기
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            style={{ touchAction: 'manipulation' }}
                            className="p-1 hover:bg-border/35 rounded-custom text-danger hover:text-danger-active transition-colors cursor-pointer"
                            title="파일 삭제"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-border border-dashed p-4 text-center rounded-custom text-[11.5px] text-gray-light font-bold bg-bg-subtle/10">
                    *등록된 증빙자료나 도면 파일이 없습니다.
                  </div>
                )}

                {/* 관리자 수동 파일 추가 업로드 섹션 */}
                <div className="border-t border-border/60 pt-3 mt-1 flex flex-col gap-2">
                  <span className="text-[10px] text-gray-light font-black uppercase tracking-wider block select-none">
                    ▶ 관리자 전용 실측 도면 / 리포트 추가 업로드
                    {adminUploading && <span className="text-steel ml-2 normal-case">업로드 중...</span>}
                  </span>
                  <input
                    ref={adminFileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPT_ATTR}
                    onChange={handleAdminFileSelected}
                    className="hidden"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={adminUploading}
                      onClick={() => openAdminFilePicker('도면')}
                      style={{ touchAction: 'manipulation' }}
                      className="flex items-center justify-center gap-1 py-2 px-1 border border-dashed border-steel/40 bg-steel/5 hover:bg-steel/10 rounded-custom text-[11px] font-black text-steel transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      도면 파일
                    </button>
                    <button
                      type="button"
                      disabled={adminUploading}
                      onClick={() => openAdminFilePicker('사진')}
                      style={{ touchAction: 'manipulation' }}
                      className="flex items-center justify-center gap-1 py-2 px-1 border border-dashed border-accent/40 bg-accent/5 hover:bg-accent/10 rounded-custom text-[11px] font-black text-accent transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      실측 사진
                    </button>
                    <button
                      type="button"
                      disabled={adminUploading}
                      onClick={() => openAdminFilePicker('기타')}
                      style={{ touchAction: 'manipulation' }}
                      className="flex items-center justify-center gap-1 py-2 px-1 border border-dashed border-navy/40 bg-navy/5 hover:bg-navy/10 rounded-custom text-[11px] font-black text-navy transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      실측 리포트
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* 우측 1칸: 관리자 신속 변경 패널 */}
            <div className="bg-bg border border-border p-5 rounded-custom shadow-sm flex flex-col gap-4.5">
              <h4 className="text-xs font-bold text-navy flex items-center gap-1.5 border-b border-border/80 pb-2">
                <FileCheck className="w-4 h-4 text-steel" />
                관리 속성 조율
              </h4>

              {/* 13단계 상태 */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-light font-bold">진단 진행 상태</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EstimateStatus)}
                  className="w-full border border-border p-2 rounded-custom text-xs font-semibold focus:outline-none focus:border-steel bg-bg"
                >
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
              </div>

              {/* 정확도 등급 */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-light font-bold">자료 제공 정확도 등급</label>
                <select
                  value={accuracyGrade}
                  onChange={(e) => setAccuracyGrade(e.target.value as AccuracyGrade)}
                  className="w-full border border-border p-2 rounded-custom text-xs font-semibold focus:outline-none focus:border-steel bg-bg"
                >
                  <option value="">미지정</option>
                  <option value="A">A등급 (도면+사진 충분)</option>
                  <option value="B">B등급 (사진 충분, 도면 부족)</option>
                  <option value="C">C등급 (설명 위주, 실측 필요)</option>
                  <option value="D">D등급 (정보 없음, 출장 필수)</option>
                </select>
              </div>

              {/* 견적금액 */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-light font-bold">1차 검토 산출액 (원)</label>
                <input
                  type="number"
                  placeholder="예: 25000000"
                  value={estimatedAmount}
                  onChange={(e) => setEstimatedAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full border border-border p-2 rounded-custom text-xs font-bold focus:outline-none focus:border-steel"
                />
              </div>

              {/* 확정 계약금액 */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-light font-bold">최종 확정 계약액 (원)</label>
                <input
                  type="number"
                  placeholder="예: 23000000"
                  value={confirmedContractAmount}
                  onChange={(e) => setConfirmedContractAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full border border-border p-2 rounded-custom text-xs font-bold focus:outline-none focus:border-steel"
                />
              </div>

              {/* 관리자 비고 */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-light font-bold font-sans">실무 특이사항 비고</label>
                <textarea
                  rows={2}
                  placeholder="예: 셧다운 시간 일요일 하루 배정 확인 완료됨."
                  value={adminMemo}
                  onChange={(e) => setAdminMemo(e.target.value)}
                  className="w-full border border-border p-2 rounded-custom text-xs focus:outline-none focus:border-steel leading-normal resize-none"
                />
              </div>

              {/* 저장 버튼 */}
              <button
                onClick={handleSaveMeta}
                className="w-full bg-navy text-bg hover:bg-steel py-2.5 rounded-custom text-xs font-extrabold transition-all"
              >
                진단 속성 저장
              </button>

            </div>

          </div>

          {/* 2. 하단 탭 세션: [현장 실측 스케줄 | 결제 매핑] */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-border">
            
            {/* 왼쪽: 현장방문 스케줄 추가 및 리스트 */}
            <div className="bg-bg border border-border p-5 rounded-custom shadow-sm flex flex-col gap-4">
              <h4 className="text-xs font-bold text-navy flex items-center gap-1.5 border-b border-border/80 pb-2">
                <CalendarCheck className="w-4 h-4 text-steel" />
                현장 실측 출장방문 관리
              </h4>
              
              {/* 스케줄 등록 인풋 폼 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9.5px] text-gray-light font-bold">방문 예정일</label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="border border-border p-2 rounded-custom text-xs focus:outline-none focus:border-steel"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9.5px] text-gray-light font-bold">담당 실측 엔지니어</label>
                  <input
                    type="text"
                    placeholder="김철수 부장"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className="border border-border p-2 rounded-custom text-xs focus:outline-none focus:border-steel"
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-[9.5px] text-gray-light font-bold">출장 주요 목적</label>
                  <input
                    type="text"
                    value={visitPurpose}
                    onChange={(e) => setVisitPurpose(e.target.value)}
                    className="border border-border p-2 rounded-custom text-xs focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9.5px] text-gray-light font-bold">진행 상태</label>
                  <select
                    value={visitStatus}
                    onChange={(e) => setVisitStatus(e.target.value as SiteVisit['visit_status'])}
                    className="border border-border p-2 rounded-custom text-xs bg-bg"
                  >
                    <option value="예정">예정</option>
                    <option value="완료">완료</option>
                    <option value="취소">취소</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddVisit}
                    className="w-full flex items-center justify-center gap-1 bg-steel text-bg hover:bg-navy py-2 rounded-custom text-xs font-bold transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    방문 등록
                  </button>
                </div>
              </div>
            </div>

            {/* 오른쪽: 결제 청구 수동 연동 및 이력 */}
            <div className="bg-bg border border-border p-5 rounded-custom shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-border/80 pb-2">
                <h4 className="text-xs font-bold text-navy flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-steel" />
                  출장/진단비 수동 청구 관리
                </h4>
                {payments.some(p => p.payment_status === '결제대기') && (
                  <button
                    onClick={() => setShowTossModal(true)}
                    className="flex items-center gap-1 bg-[#1F8CE6] hover:bg-[#1571bc] text-bg px-2 py-0.5 rounded-custom text-[10px] font-black transition-all animate-pulse"
                  >
                    <CreditCard className="w-3 h-3" />
                    Toss 모의결제 호출
                  </button>
                )}
              </div>

              {/* 결제 청구 폼 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9.5px] text-gray-light font-bold">청구 비용 종류</label>
                  <select
                    value={payType}
                    onChange={(e) => setPayType(e.target.value as Payment['payment_type'])}
                    className="border border-border p-2 rounded-custom text-xs bg-bg"
                  >
                    <option value="온라인검토비">온라인검토비 (소액)</option>
                    <option value="출장견적비">출장견적비 (30만)</option>
                    <option value="프로젝트 사전진단비">프로젝트 사전진단비</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9.5px] text-gray-light font-bold font-sans">청구 액수 (원)</label>
                  <input
                    type="number"
                    placeholder="300000"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value ? Number(e.target.value) : '')}
                    className="border border-border p-2 rounded-custom text-xs focus:outline-none focus:border-steel font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9.5px] text-gray-light font-bold">입금 수동 확인</label>
                  <select
                    value={payStatus}
                    onChange={(e) => setPayStatus(e.target.value as AdminPaymentStatus)}
                    className="border border-border p-2 rounded-custom text-xs bg-bg"
                  >
                    <option value="결제대기">결제대기 (입금미완)</option>
                    <option value="결제완료">결제완료 (입금확인)</option>
                    <option value="환불">환불 처리</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddPayment}
                    className="w-full flex items-center justify-center gap-1 bg-steel text-bg hover:bg-navy py-2 rounded-custom text-xs font-bold transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    청구 매핑
                  </button>
                </div>
              </div>

              {/* 기매핑된 결제 내역 리스트 */}
              {payments.length > 0 && (
                <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3 max-h-24 overflow-y-auto">
                  <span className="text-[9.5px] text-gray-light font-bold">기청구 내역 ({payments.length}건)</span>
                  {payments.map((p) => (
                    <div key={p.id} className="bg-bg-subtle border border-border p-2 rounded-custom text-[11px] font-medium flex items-center justify-between">
                      <span className="text-navy font-bold">{p.payment_type}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-steel tabular-nums">₩{p.amount.toLocaleString()}</span>
                        <span className={`px-1.5 py-0.5 rounded-custom text-[9px] font-black ${
                          p.payment_status === '결제완료' ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
                        }`}>
                          {p.payment_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* 모달 풋터 */}
        <div className="bg-bg-subtle border-t border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPrintModal(true)}
              className="flex items-center gap-1.5 border border-steel hover:bg-steel/5 text-steel px-3.5 py-2 rounded-custom text-xs font-black transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              범위 고정 진단서 A4 인쇄
            </button>
            <button
              onClick={handleDeleteEstimate}
              style={{ touchAction: 'manipulation' }}
              className="flex items-center gap-1.5 border border-danger hover:bg-danger/5 text-danger px-3.5 py-2 rounded-custom text-xs font-black transition-all cursor-pointer"
            >
              의뢰 건 영구 삭제
            </button>
            <span className="text-[10px] text-gray-light font-bold">
              * 수정한 속성은 저장 즉시 로컬 Mock DB 및 실적관리 탭에 실시간 리액티브 반영됩니다.
            </span>
          </div>
          <button
            onClick={onClose}
            className="bg-navy hover:bg-steel text-bg px-5 py-2.5 rounded-custom text-xs font-extrabold transition-all"
          >
            모달 닫기
          </button>
        </div>

      </div>

      {/* 모의 토스결제 게이트웨이 모달 */}
      {showTossModal && (
        <TossPaymentModal
          estimateId={estimate.id}
          estimateNo={estimate.estimate_no}
          amount={payments.find(p => p.payment_status === '결제대기')?.amount || 300000}
          paymentType={payments.find(p => p.payment_status === '결제대기')?.payment_type || '출장견적비'}
          onClose={() => setShowTossModal(false)}
          onSuccess={async () => {
            await refreshDetailData();
            onSaved();
          }}
        />
      )}

      {/* 범위 고정 진단서 A4 인쇄/PDF 팝업 */}
      {showPrintModal && (
        <div className="fixed inset-0 z-[90] bg-navy/45 backdrop-blur-sm overflow-y-auto p-4 flex items-start justify-center select-none font-sans">
          <div className="bg-bg border border-border w-full max-w-4xl rounded-custom shadow-custom-md overflow-hidden relative my-8 animate-in slide-in-from-bottom-2 duration-200">
            <button
              onClick={() => setShowPrintModal(false)}
              className="absolute right-6 top-6 bg-navy text-bg hover:bg-steel px-4 py-2 rounded-custom text-xs font-black transition-all print:hidden z-10 shadow-md"
            >
              인쇄 모드 종료
            </button>
            <div className="p-4 pt-14">
              <PrintableScopeSheet estimate={estimate} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
