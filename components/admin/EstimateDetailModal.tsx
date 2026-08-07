'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Estimate, EstimateStatus, AccuracyGrade, Payment, SiteVisit, EstimateLineItem } from '@/types/estimate';
import { ZerosService } from '@/lib/supabase/client';
import { uploadEstimateFiles, uploadEstimateFile } from '@/lib/supabase/storage';
import { draftLineItems } from '@/lib/quote/quoteDraft';
import { lineAmount, sumSubtotal, vatOf, totalOf, supplyAmountOf } from '@/lib/quote/amounts';
import { derivePaymentStatus } from '@/lib/payments/status';
import { buildQuoteXlsxBlob, quoteFileName, downloadBlob } from '@/lib/quote/quoteXlsx';
import { openSecureFile } from '@/lib/files/secureFile';
import { validateFileFormat, ACCEPT_ATTR } from '@/lib/constants/uploadLimits';
import { menuDisplayName } from '@/lib/constants/menu';
import { TossPaymentModal } from './TossPaymentModal';
import { PrintableScopeSheet } from './PrintableScopeSheet';
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
  FileSpreadsheet,
  Sparkles,
  Send,
  Trash2,
  Download,
  Save
} from 'lucide-react';

interface EstimateDetailModalProps {
  estimateId: string;
  onClose: () => void;
  onSaved: () => void;
}

type AdminPaymentStatus = '결제대기' | '결제완료' | '환불';

// ==========================================
// 품목표 초안 저장 (순수 함수 — 회귀 테스트: test/admin/quoteDraft.test.ts)
// ==========================================
// 품목표의 유일한 저장 경로가 '승인·견적서 발송'이라, 발송하지 않고 모달을 닫으면
// 편집분이 통째로 사라졌다. 저장본 스냅샷과 현재 편집분을 비교해
// 초안 저장 버튼·닫기 확인 게이트의 근거로 삼는다.

// 구분자는 입력으로 들어올 수 없는 제어문자다 — 필드 경계가 섞이면 다른 편집을 같다고 판정한다.
const FIELD_SEP = String.fromCharCode(1);

/** 비교 대상 필드만 이어 붙인 정규형 — 참조 동일성에 기대지 않는다. */
const quoteItemKey = (it: EstimateLineItem) =>
  [
    it.id,
    it.name ?? '',
    it.spec ?? '',
    Number(it.qty) || 0,
    it.unit ?? '',
    Number(it.unit_price) || 0,
    it.note ?? '',
  ].join(FIELD_SEP);

/** 저장본 대비 미저장 편집분이 있는가. 행 추가·삭제·순서 변경도 저장 내용이 달라지므로 dirty 다. */
export const isQuoteDirty = (saved: EstimateLineItem[], current: EstimateLineItem[]): boolean =>
  saved.length !== current.length || saved.some((it, i) => quoteItemKey(it) !== quoteItemKey(current[i]));

/**
 * 초안 저장 패치 — 발송과 달리 상태·발송본 URL·발송 시각을 담지 않는다(고객 미노출 유지).
 * 금액은 §14-4 불변식대로 공급가액(VAT 별도)만 저장한다. 총액을 저장하면 재저장마다 VAT 가 증식한다.
 */
export const quoteDraftPatch = (
  items: EstimateLineItem[]
): Pick<Estimate, 'line_items' | 'estimated_amount'> => ({
  line_items: items,
  estimated_amount: sumSubtotal(items),
});

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

  // 기청구 행 수정 — 잘못 넣은 금액·상태가 미수금 지표를 영구히 오염시키지 않게 한다.
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPayAmount, setEditPayAmount] = useState<number | ''>('');
  const [editPayStatus, setEditPayStatus] = useState<Payment['payment_status']>('결제대기');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSaving, setPaymentSaving] = useState(false);

  // 2차 고도화 모달 상태
  const [showTossModal, setShowTossModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // AI 견적 초안 · 발송 상태
  const [quoteItems, setQuoteItems] = useState<EstimateLineItem[]>([]);
  // 마지막으로 저장된 품목표 스냅샷 — 미저장 편집분 판정의 기준값이다.
  const [savedQuoteItems, setSavedQuoteItems] = useState<EstimateLineItem[]>([]);
  const [quoteBusy, setQuoteBusy] = useState<'' | 'preview' | 'send' | 'draft'>('');
  const [quoteError, setQuoteError] = useState<string | null>(null);

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
        // 금액은 공급가액(VAT 별도) 단일 정의로 읽는다 — 구 저장값(VAT 포함)은 여기서 정규화된다.
        setEstimatedAmount(supplyAmountOf(est) || '');
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
          setEstimatedAmount(supplyAmountOf(est) || '');
          setConfirmedContractAmount(est.confirmed_contract_amount || '');
          setQuoteItems(est.line_items || []);
          setSavedQuoteItems(est.line_items || []);
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

  // 3-1. 기청구 행 수정 액션
  const startEditPayment = (p: Payment) => {
    setEditingPaymentId(p.id);
    setEditPayAmount(p.amount);
    setEditPayStatus(p.payment_status);
    setPaymentError(null);
  };

  const cancelEditPayment = () => {
    setEditingPaymentId(null);
    setPaymentError(null);
  };

  // 잘못 등록한 청구 행은 지울 수 있어야 한다 — '환불' 전환으로 미수금에서는 빠지지만
  // 존재하지 않았던 청구가 이력에 남아 운영자가 매번 그 행을 해석해야 한다.
  // 삭제는 되돌릴 수 없으므로 확인 단계를 둔다.
  const handleDeletePayment = async (p: Payment) => {
    if (!window.confirm(`${p.payment_type} ₩${p.amount.toLocaleString()} 청구 행을 삭제합니다. 되돌릴 수 없습니다.`)) return;
    setPaymentSaving(true);
    try {
      // 견적의 결제 상태·미수금은 남은 행 집합에서 파생되므로 행만 지우면 지표가 따라온다.
      await ZerosService.deletePayment(p.id);
      setEditingPaymentId(null);
      setPaymentError(null);
      await refreshDetailData();
      onSaved();
    } catch (e) {
      console.error(e);
      setPaymentError(e instanceof Error ? e.message : '결제 정보 삭제 도중 오류가 발생했습니다.');
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleUpdatePayment = async (id: string) => {
    const amount = Number(editPayAmount);
    if (!(amount > 0)) {
      setPaymentError('청구 액수를 1원 이상으로 입력해 주세요.');
      return;
    }
    setPaymentSaving(true);
    try {
      // 견적의 결제 상태·미수금은 이 행 집합에서 파생되므로 행만 고치면 지표가 따라온다.
      await ZerosService.updatePayment(id, { amount, payment_status: editPayStatus });
      setEditingPaymentId(null);
      setPaymentError(null);
      await refreshDetailData();
      onSaved();
    } catch (e) {
      console.error(e);
      setPaymentError(e instanceof Error ? e.message : '결제 정보 수정 도중 오류가 발생했습니다.');
    } finally {
      setPaymentSaving(false);
    }
  };

  // 4. 견적 건 영구 삭제 액션
  const handleDeleteEstimate = async () => {
    if (!estimate) return;
    if (!confirm(`[경고] 접수번호 ${estimate.estimate_no} 의뢰 건을 영구히 삭제하시겠습니까?\n이 작업은 방문 일정, 결제 내역을 포함한 모든 이력이 유실되며 복구할 수 없습니다.`)) return;
    try {
      // 실 DB(Supabase)에서 견적과 연관 결제·방문·알림 이력을 서버 delete op 로 제거한다.
      // (과거엔 localStorage 만 지워 클라우드에는 그대로 남아, 새로고침 시 되살아났다.)
      await ZerosService.deleteEstimate(estimate.id);

      alert(`접수번호 ${estimate.estimate_no} 의뢰 건이 영구 삭제되었습니다.`);
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
      const uploaded = await uploadEstimateFiles(selected, adminUploadCategory, estimate.id);

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

  // ── AI 견적 초안 · 발송 핸들러 ──
  // 품목표 합계 = 공급가액(VAT 별도). VAT·총액은 저장하지 않고 여기서 파생한다.
  const quoteSubtotal = sumSubtotal(quoteItems);
  const quoteVat = vatOf(quoteSubtotal);
  const quoteTotal = totalOf(quoteSubtotal);

  const handleGenerateDraft = () => {
    if (!estimate) return;
    if (quoteItems.length > 0 && !confirm('기존 품목표를 AI 초안으로 다시 채우시겠습니까?')) return;
    setQuoteItems(draftLineItems(estimate));
    setQuoteError(null);
  };

  const updateQuoteItem = (idx: number, patch: Partial<EstimateLineItem>) => {
    setQuoteItems(prev => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
    setQuoteError(null);
  };

  const addQuoteItem = () => {
    setQuoteItems(prev => [
      ...prev,
      { id: `li-${Date.now()}-${prev.length}`, name: '', spec: '', qty: 1, unit: '식', unit_price: 0 },
    ]);
  };

  const removeQuoteItem = (idx: number) => {
    setQuoteItems(prev => prev.filter((_, i) => i !== idx));
  };

  const EMPTY_QUOTE_MSG = '품목이 없습니다. 먼저 "AI 초안 생성" 또는 "품목 추가"로 품목표를 구성해 주세요.';

  // 수량·단가는 그대로 공급가액으로 굳으므로 초안 저장에서도 막는다.
  const validateQuoteNumbers = (): string | null => {
    if (quoteItems.some(it => !(it.qty > 0))) return '수량은 1 이상이어야 합니다.';
    if (quoteItems.some(it => it.unit_price < 0)) return '단가는 0 이상이어야 합니다.';
    return null;
  };

  const validateQuote = (): string | null => {
    if (quoteItems.length === 0) return EMPTY_QUOTE_MSG;
    if (quoteItems.some(it => !it.name.trim())) return '품명이 비어 있는 행이 있습니다.';
    return validateQuoteNumbers();
  };

  // 초안은 작성 도중 저장이라 품명 공란을 막지 않는다.
  const validateQuoteDraft = (): string | null =>
    quoteItems.length === 0 ? EMPTY_QUOTE_MSG : validateQuoteNumbers();

  const quoteDirty = isQuoteDirty(savedQuoteItems, quoteItems);

  // 발송 없이 품목표만 저장한다 — 이 경로가 없어 발송 전 편집분이 모달을 닫는 순간 사라졌다.
  const handleQuoteSaveDraft = async () => {
    if (!estimate) return;
    const err = validateQuoteDraft();
    if (err) { setQuoteError(err); return; }
    setQuoteBusy('draft');
    try {
      await ZerosService.updateEstimate(estimate.id, quoteDraftPatch(quoteItems));
      setSavedQuoteItems(quoteItems);
      setQuoteError(null);
      await refreshDetailData();
      onSaved();
    } catch (e) {
      console.error(e);
      setQuoteError(e instanceof Error ? e.message : '품목표 저장 도중 오류가 발생했습니다.');
    } finally {
      setQuoteBusy('');
    }
  };

  // 닫기 지점 2곳(헤더 X · 풋터 버튼)이 같은 게이트를 지난다 — 한쪽만 막으면 결함이 남는다.
  const requestClose = () => {
    if (quoteDirty && !confirm('품목표에 저장하지 않은 편집분이 있습니다. 저장하지 않고 닫으시겠습니까?')) return;
    onClose();
  };

  const handleQuotePreview = async () => {
    if (!estimate) return;
    const err = validateQuote();
    if (err) { setQuoteError(err); return; }
    setQuoteBusy('preview');
    try {
      const blob = await buildQuoteXlsxBlob(estimate, quoteItems);
      downloadBlob(blob, quoteFileName(estimate));
    } catch (e) {
      console.error(e);
      setQuoteError(e instanceof Error ? e.message : '엑셀 생성 도중 오류가 발생했습니다.');
    } finally {
      setQuoteBusy('');
    }
  };

  const handleQuoteSend = async () => {
    if (!estimate) return;
    const err = validateQuote();
    if (err) { setQuoteError(err); return; }
    if (!confirm(`합계 ₩${quoteTotal.toLocaleString()} (VAT 포함) 견적서를 승인하고 고객에게 제공하시겠습니까?\n발송 후 고객 마이페이지에서 다운로드할 수 있습니다.`)) return;
    setQuoteBusy('send');
    try {
      const blob = await buildQuoteXlsxBlob(estimate, quoteItems);
      const file = new File([blob], quoteFileName(estimate), { type: blob.type });
      const meta = await uploadEstimateFile(file, '견적서', estimate.id);
      const sentAt = new Date().toISOString();
      await ZerosService.updateEstimate(estimate.id, {
        line_items: quoteItems,
        // 저장값은 공급가액(VAT 별도) 고정. 총액을 저장하면 재발송마다 VAT가 10%씩 증식한다.
        estimated_amount: quoteSubtotal,
        estimate_pdf_url: meta.file_path || meta.file_url,
        estimate_sent_at: sentAt,
        status: '견적서 송부완료',
      });
      setStatus('견적서 송부완료');
      setEstimatedAmount(quoteSubtotal);
      setSavedQuoteItems(quoteItems);
      alert('견적서가 승인·발송되었습니다. 고객 마이페이지에 다운로드 버튼이 노출됩니다.');
      await refreshDetailData();
      onSaved();
    } catch (e) {
      console.error(e);
      setQuoteError(e instanceof Error ? e.message : '견적서 발송 도중 오류가 발생했습니다.');
    } finally {
      setQuoteBusy('');
    }
  };

  // ── 결제 상태 파생 ──
  // 견적 단위 결제 상태는 행 하나가 아니라 Payment 행 집합에서 판정한다.
  // (행 단위 조건으로 두면 결제완료 뒤에도 결제대기 행이 남아 청구 버튼이 계속 노출됐다.)
  const paymentStatus = derivePaymentStatus(payments);
  const pendingPayment = payments.find(p => p.payment_status === '결제대기');

  return (
    <div className="fixed inset-0 z-50 bg-navy/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 select-none font-sans overflow-hidden">
      
      {/* 모달 윈도우 */}
      <div className="w-full max-w-4xl h-[90vh] bg-bg border border-border rounded-custom shadow-custom-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 motion-reduce:animate-none">
        
        {/* 모달 헤더 */}
        <div className="bg-bg-subtle border-b border-border px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="bg-steel/15 text-steel px-2 py-0.5 rounded-custom text-[10px] font-black tracking-wider">
              {(estimate.estimate_category || '').toUpperCase()}
            </span>
            <span className="font-extrabold text-navy tracking-tight text-[15px] tabular-nums">
              의뢰 상세: {estimate.estimate_no}
            </span>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="상세 창 닫기"
            className="p-1.5 hover:bg-border/30 rounded-custom text-gray transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-steel"
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
                <h4 className="text-xs font-bold text-navy flex items-center gap-1.5 border-b border-border/80 pb-2">
                  <ClipboardList className="w-4 h-4 text-steel" />
                  상세 진단 요청 사항
                </h4>

                <div className="flex flex-col gap-2 text-xs leading-relaxed text-gray">
                  <div>
                    <span className="font-semibold block text-[10.5px] text-gray-light">공사 종류 (용도 / 목적)</span>
                    <span className="font-bold text-navy">{menuDisplayName(estimate.work_type)} ({estimate.site_type} / {estimate.work_purpose})</span>
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
                  <FolderOpen className="w-4 h-4 text-steel animate-pulse motion-reduce:animate-none" />
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
                          {(file.file_path || file.file_url) ? (
                            <button
                              type="button"
                              onClick={() => openSecureFile(file.file_path || file.file_url).catch(err => alert(err instanceof Error ? err.message : '파일 열람에 실패했습니다.'))}
                              className="truncate text-steel font-bold text-[11px] underline decoration-steel/40 hover:decoration-steel cursor-pointer text-left"
                              title="새 창에서 열기 / 다운로드 (관리자 전용)"
                            >
                              {file.file_name}
                            </button>
                          ) : (
                            <span className="truncate text-navy font-bold text-[11px]">{file.file_name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-gray text-[10px] select-none">
                          <span className="mr-1">{new Date(file.uploaded_at).toLocaleDateString()}</span>
                          {(file.file_path || file.file_url) && (
                            <button
                              type="button"
                              onClick={() => openSecureFile(file.file_path || file.file_url).catch(err => alert(err instanceof Error ? err.message : '파일 열람에 실패했습니다.'))}
                              style={{ touchAction: 'manipulation' }}
                              className="p-1 hover:bg-border/35 rounded-custom text-steel hover:text-navy transition-colors cursor-pointer"
                              title="열기 / 다운로드 (관리자 전용)"
                            >
                              보기
                            </button>
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
                  <div className="border border-border border-dashed p-4 text-center rounded-custom text-[11.5px] text-gray font-bold bg-bg-subtle/10">
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
                  className="w-full border border-border p-2 rounded-custom text-xs font-semibold focus-visible:outline-2 focus-visible:outline-steel focus:border-steel bg-bg"
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
                  className="w-full border border-border p-2 rounded-custom text-xs font-semibold focus-visible:outline-2 focus-visible:outline-steel focus:border-steel bg-bg"
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
                <label className="text-[10px] text-gray font-bold">1차 검토 산출액 (VAT 별도)</label>
                <input
                  type="number"
                  placeholder="예: 25000000"
                  value={estimatedAmount}
                  onChange={(e) => setEstimatedAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full border border-border p-2 rounded-custom text-xs font-bold focus-visible:outline-2 focus-visible:outline-steel focus:border-steel"
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
                  className="w-full border border-border p-2 rounded-custom text-xs font-bold focus-visible:outline-2 focus-visible:outline-steel focus:border-steel"
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
                  className="w-full border border-border p-2 rounded-custom text-xs focus-visible:outline-2 focus-visible:outline-steel focus:border-steel leading-normal resize-none"
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

          {/* 2. AI 견적 초안 · 견적서 발송 (승인 게이트 — 승인 전 고객 미노출) */}
          <div className="bg-bg border border-border p-5 rounded-custom shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-border/80 pb-2">
              <h4 className="text-xs font-bold text-navy flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-steel" />
                AI 견적 초안 · 견적서 발송
              </h4>
              <button
                type="button"
                onClick={handleGenerateDraft}
                style={{ touchAction: 'manipulation' }}
                className="flex items-center gap-1 text-steel hover:text-navy text-[10.5px] font-black border border-steel/25 rounded-custom px-2.5 py-1.5 bg-bg transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-steel"
              >
                <Sparkles className="w-3 h-3" />
                AI 초안 생성 (공종·규모·실적 기반)
              </button>
            </div>

            {quoteItems.length === 0 ? (
              <div className="border border-border border-dashed p-4 text-center rounded-custom text-[11.5px] text-gray font-bold bg-bg-subtle/10">
                &quot;AI 초안 생성&quot;을 누르면 {menuDisplayName(estimate.work_type)} 표준 품목 구성과 예산 규모를 근거로 품목표 초안이 채워집니다. 초안은 편집 후 승인해야 발송됩니다.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11.5px] border-collapse min-w-[560px]">
                    <thead>
                      <tr className="text-gray text-left border-b border-border">
                        <th className="py-1.5 pr-2 font-bold w-[26%]">품명</th>
                        <th className="py-1.5 pr-2 font-bold w-[20%]">규격</th>
                        <th className="py-1.5 pr-2 font-bold w-[9%]">수량</th>
                        <th className="py-1.5 pr-2 font-bold w-[9%]">단위</th>
                        <th className="py-1.5 pr-2 font-bold w-[15%] text-right">단가(원)</th>
                        <th className="py-1.5 pr-2 font-bold w-[15%] text-right">금액(원)</th>
                        <th className="py-1.5 w-[6%]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {quoteItems.map((it, idx) => (
                        <tr key={it.id} className="border-b border-border/50">
                          <td className="py-1 pr-2">
                            <input
                              type="text"
                              aria-label={`품명 ${idx + 1}`}
                              value={it.name}
                              onChange={(e) => updateQuoteItem(idx, { name: e.target.value })}
                              className="w-full border border-border/70 p-1.5 rounded-custom text-[11.5px] font-semibold text-navy focus-visible:outline-2 focus-visible:outline-steel focus:border-steel"
                            />
                          </td>
                          <td className="py-1 pr-2">
                            <input
                              type="text"
                              aria-label={`규격 ${idx + 1}`}
                              value={it.spec}
                              onChange={(e) => updateQuoteItem(idx, { spec: e.target.value })}
                              className="w-full border border-border/70 p-1.5 rounded-custom text-[11.5px] text-gray focus-visible:outline-2 focus-visible:outline-steel focus:border-steel"
                            />
                          </td>
                          <td className="py-1 pr-2">
                            <input
                              type="number"
                              min={1}
                              aria-label={`수량 ${idx + 1}`}
                              value={it.qty}
                              onChange={(e) => updateQuoteItem(idx, { qty: e.target.value ? Number(e.target.value) : 0 })}
                              className="w-full border border-border/70 p-1.5 rounded-custom text-[11.5px] font-bold text-navy tabular-nums focus-visible:outline-2 focus-visible:outline-steel focus:border-steel"
                            />
                          </td>
                          <td className="py-1 pr-2">
                            <input
                              type="text"
                              aria-label={`단위 ${idx + 1}`}
                              value={it.unit}
                              onChange={(e) => updateQuoteItem(idx, { unit: e.target.value })}
                              className="w-full border border-border/70 p-1.5 rounded-custom text-[11.5px] text-center text-gray focus-visible:outline-2 focus-visible:outline-steel focus:border-steel"
                            />
                          </td>
                          <td className="py-1 pr-2">
                            <input
                              type="number"
                              min={0}
                              step={10000}
                              aria-label={`단가 ${idx + 1}`}
                              value={it.unit_price}
                              onChange={(e) => updateQuoteItem(idx, { unit_price: e.target.value ? Number(e.target.value) : 0 })}
                              className="w-full border border-border/70 p-1.5 rounded-custom text-[11.5px] font-bold text-navy text-right tabular-nums focus-visible:outline-2 focus-visible:outline-steel focus:border-steel"
                            />
                          </td>
                          <td className="py-1 pr-2 text-right font-extrabold text-navy tabular-nums">
                            {lineAmount(it).toLocaleString()}
                          </td>
                          <td className="py-1 text-center">
                            <button
                              type="button"
                              onClick={() => removeQuoteItem(idx)}
                              aria-label={`${it.name || '품목'} 행 삭제`}
                              style={{ touchAction: 'manipulation' }}
                              className="p-2 hover:bg-border/35 rounded-custom text-gray hover:text-danger transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-steel"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <button
                    type="button"
                    onClick={addQuoteItem}
                    style={{ touchAction: 'manipulation' }}
                    className="flex items-center gap-1 border border-dashed border-border text-gray hover:text-navy hover:border-steel/50 rounded-custom px-3 py-2 text-[11px] font-bold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-steel"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    품목 추가
                  </button>
                  <div className="min-w-[240px] text-[11.5px] tabular-nums flex flex-col gap-0.5 ml-auto">
                    <div className="flex justify-between text-gray"><span>소계</span><span>{quoteSubtotal.toLocaleString()}</span></div>
                    <div className="flex justify-between text-gray"><span>부가세 (10%)</span><span>{quoteVat.toLocaleString()}</span></div>
                    <div className="flex justify-between border-t border-border pt-1 mt-0.5 text-navy font-extrabold text-[13px]">
                      <span>합계 (VAT 포함)</span><span>{quoteTotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-steel text-[10.5px] font-bold">
                      <span>안심 예산 대역 ±5%</span>
                      <span>{Math.round(quoteTotal * 0.95).toLocaleString()} ~ {Math.round(quoteTotal * 1.05).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {quoteError && (
              <div role="alert" className="bg-danger/5 border border-danger/20 rounded-custom px-3 py-2 text-[11.5px] font-bold text-danger">
                {quoteError}
              </div>
            )}

            <div className="flex items-center gap-2 justify-end flex-wrap border-t border-border/60 pt-3">
              <span className="text-[10.5px] text-gray font-semibold mr-auto">
                {estimate.estimate_pdf_url ? (
                  <>
                    발송 완료{estimate.estimate_sent_at ? ` · ${new Date(estimate.estimate_sent_at).toLocaleString('ko-KR')}` : ''} —{' '}
                    <button
                      type="button"
                      onClick={() => openSecureFile(estimate.estimate_pdf_url!).catch(err => alert(err instanceof Error ? err.message : '파일 열람에 실패했습니다.'))}
                      className="text-steel underline decoration-steel/40 hover:decoration-steel cursor-pointer"
                    >발송본 열기</button>
                  </>
                ) : (
                  '승인 전에는 고객에게 발송되지 않습니다.'
                )}
              </span>
              <button
                type="button"
                onClick={handleQuoteSaveDraft}
                disabled={quoteBusy !== '' || !quoteDirty}
                style={{ touchAction: 'manipulation' }}
                className="flex items-center gap-1.5 border border-navy hover:bg-navy/5 text-navy px-3.5 py-2.5 min-h-[44px] rounded-custom text-xs font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-default focus-visible:outline-2 focus-visible:outline-navy"
              >
                <Save className="w-3.5 h-3.5" />
                {quoteBusy === 'draft' ? '저장 중...' : '초안 저장'}
              </button>
              <button
                type="button"
                onClick={handleQuotePreview}
                disabled={quoteBusy !== ''}
                style={{ touchAction: 'manipulation' }}
                className="flex items-center gap-1.5 border border-steel hover:bg-steel/5 text-steel px-3.5 py-2.5 min-h-[44px] rounded-custom text-xs font-black transition-all cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-steel"
              >
                <Download className="w-3.5 h-3.5" />
                {quoteBusy === 'preview' ? '생성 중...' : '엑셀 미리보기'}
              </button>
              <button
                type="button"
                onClick={handleQuoteSend}
                disabled={quoteBusy !== ''}
                style={{ touchAction: 'manipulation' }}
                className="flex items-center gap-1.5 bg-accent hover:bg-[#c95f12] text-bg px-4 py-2.5 min-h-[44px] rounded-custom text-xs font-black transition-all cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-navy"
              >
                <Send className="w-3.5 h-3.5" />
                {quoteBusy === 'send' ? '발송 중...' : '승인·견적서 발송'}
              </button>
            </div>
          </div>

          {/* 3. 하단 탭 세션: [현장 실측 스케줄 | 결제 매핑] */}
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
                    className="border border-border p-2 rounded-custom text-xs focus-visible:outline-2 focus-visible:outline-steel focus:border-steel"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9.5px] text-gray-light font-bold">담당 실측 엔지니어</label>
                  <input
                    type="text"
                    placeholder="김철수 부장"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className="border border-border p-2 rounded-custom text-xs focus-visible:outline-2 focus-visible:outline-steel focus:border-steel"
                  />
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <label className="text-[9.5px] text-gray-light font-bold">출장 주요 목적</label>
                  <input
                    type="text"
                    value={visitPurpose}
                    onChange={(e) => setVisitPurpose(e.target.value)}
                    className="border border-border p-2 rounded-custom text-xs focus-visible:outline-2 focus-visible:outline-steel"
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
                {paymentStatus === '결제대기' ? (
                  <button
                    type="button"
                    onClick={() => setShowTossModal(true)}
                    style={{ touchAction: 'manipulation' }}
                    className="flex items-center gap-1.5 bg-[#1F8CE6] hover:bg-[#1571bc] text-bg px-3 min-h-[44px] rounded-custom text-[11px] font-black transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-navy"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Toss 모의결제 호출
                  </button>
                ) : payments.length > 1 ? (
                  // 행이 2건 이상일 때만 집계 상태를 별도 표기한다(1건이면 아래 이력과 같은 값 — 중복 표시 금지).
                  <span className={`px-2 py-0.5 rounded-custom text-[10px] font-black ${
                    paymentStatus === '결제완료' ? 'bg-success/15 text-success' : 'bg-bg-subtle text-gray'
                  }`}>
                    청구 집계: {paymentStatus}
                  </span>
                ) : null}
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
                    className="border border-border p-2 rounded-custom text-xs focus-visible:outline-2 focus-visible:outline-steel focus:border-steel font-bold"
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
                <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3 max-h-40 overflow-y-auto">
                  <span className="text-[9.5px] text-gray-light font-bold">기청구 내역 ({payments.length}건)</span>
                  {payments.map((p) => (
                    <div key={p.id} className="bg-bg-subtle border border-border p-2 rounded-custom text-[11px] font-medium flex flex-col gap-1.5">
                      {editingPaymentId === p.id ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-navy font-bold shrink-0">{p.payment_type}</span>
                            <input
                              type="number"
                              min={1}
                              aria-label={`${p.payment_type} 청구 액수 수정`}
                              value={editPayAmount}
                              onChange={(e) => setEditPayAmount(e.target.value ? Number(e.target.value) : '')}
                              className="w-full border border-border p-1.5 rounded-custom text-[11px] font-bold text-navy text-right tabular-nums focus-visible:outline-2 focus-visible:outline-steel focus:border-steel"
                            />
                            <select
                              aria-label={`${p.payment_type} 입금 상태 수정`}
                              value={editPayStatus}
                              onChange={(e) => setEditPayStatus(e.target.value as Payment['payment_status'])}
                              className="border border-border p-1.5 rounded-custom text-[11px] bg-bg shrink-0"
                            >
                              <option value="미결제">미결제</option>
                              <option value="결제대기">결제대기</option>
                              <option value="결제완료">결제완료</option>
                              <option value="환불">환불</option>
                            </select>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelEditPayment}
                              style={{ touchAction: 'manipulation' }}
                              className="flex items-center min-h-[44px] px-3 border border-border rounded-custom text-gray hover:text-navy hover:border-steel/50 text-[11px] font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-steel"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdatePayment(p.id)}
                              disabled={paymentSaving}
                              style={{ touchAction: 'manipulation' }}
                              className="flex items-center min-h-[44px] px-3 bg-steel hover:bg-navy text-bg rounded-custom text-[11px] font-black transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-navy"
                            >
                              {paymentSaving ? '저장 중...' : '저장'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-navy font-bold">{p.payment_type}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-extrabold text-steel tabular-nums">₩{p.amount.toLocaleString()}</span>
                            <span className={`px-1.5 py-0.5 rounded-custom text-[9px] font-black ${
                              p.payment_status === '결제완료' ? 'bg-success/15 text-success' :
                              p.payment_status === '결제대기' ? 'bg-warning/15 text-warning' : 'bg-bg-subtle text-gray'
                            }`}>
                              {p.payment_status}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditPayment(p)}
                              style={{ touchAction: 'manipulation' }}
                              className="flex items-center min-h-[44px] px-2.5 rounded-custom text-steel hover:text-navy hover:bg-border/35 text-[11px] font-black transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-steel"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePayment(p)}
                              disabled={paymentSaving}
                              style={{ touchAction: 'manipulation' }}
                              className="flex items-center min-h-[44px] px-2.5 rounded-custom text-gray hover:text-danger hover:bg-danger/10 text-[11px] font-black transition-colors cursor-pointer disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-danger"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {paymentError && (
                <div role="alert" className="bg-danger/5 border border-danger/20 rounded-custom px-3 py-2 text-[11px] font-bold text-danger">
                  {paymentError}
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
            <span className="text-[10px] text-gray font-bold">
              * 저장한 내용은 실적관리 탭에 바로 반영됩니다.
            </span>
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="bg-navy hover:bg-steel text-bg px-5 py-2.5 rounded-custom text-xs font-extrabold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-navy"
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
          // 결제대기 행 자체를 갱신 대상으로 넘긴다(새 행 생성 시 중복 청구가 쌓인다).
          pendingPaymentId={pendingPayment?.id}
          amount={pendingPayment?.amount || 300000}
          paymentType={pendingPayment?.payment_type || '출장견적비'}
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
          <div className="bg-bg border border-border w-full max-w-4xl rounded-custom shadow-custom-md overflow-hidden relative my-8 animate-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none">
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
