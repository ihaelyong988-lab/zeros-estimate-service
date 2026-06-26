'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ZerosService } from '@/lib/supabase/client';
import { uploadEstimateFiles } from '@/lib/supabase/storage';
import { isSupabaseEnabled } from '@/lib/supabase/supabaseBrowser';
import { validateUpload, ACCEPT_ATTR, ALLOWED_LABEL, MAX_PER_CATEGORY, MAX_TOTAL_FILES } from '@/lib/constants/uploadLimits';
import { useShell } from '@/lib/context/ShellContext';
import { PhoneVerifyGate } from './PhoneVerifyGate';
import { Estimate, FileMeta, WorkType, SiteType, ExpectedBudgetRange } from '@/types/estimate';
import {
  User,
  Building,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Send,
  AlertCircle,
  Upload,
  Trash2
} from 'lucide-react';

interface RequestWizardProps {
  onComplete: (estimate: Estimate) => void;
}

const defaultFormData = {
  customer_name: '',
  company_name: '',
  phone: '',
  email: '',
  site_address: '',
  customer_type: '일반',
  work_type: '배관공사' as WorkType,
  site_type: '공장' as SiteType,
  work_purpose: '신규설치',
  expected_budget_range: '1,000만~1억' as ExpectedBudgetRange,
  desired_schedule: '1개월 이내',
  urgency: false,
  description: '',
  request_detail: '',
  files: [] as FileMeta[],
  agreePrivacy: false
};

type RequestFormData = typeof defaultFormData;

// /api/otp/status 결과 모듈 캐시 — 랜딩 진입 시 미리 받아두면(prefetch)
// 신청 탭을 열 때 "불러오는 중" 대기 없이 폼이 즉시 뜬다(서버리스 콜드스타트 지연 차단).
let otpEnabledCache: boolean | null = null;
let otpEnabledPromise: Promise<boolean> | null = null;

export const prefetchOtpEnabled = (): Promise<boolean> => {
  if (otpEnabledCache !== null) return Promise.resolve(otpEnabledCache);
  if (!otpEnabledPromise) {
    otpEnabledPromise = fetch('/api/otp/status')
      .then((r) => r.json())
      .then((d) => {
        otpEnabledCache = !!d.enabled;
        return otpEnabledCache;
      })
      .catch(() => {
        otpEnabledPromise = null;
        return false;
      });
  }
  return otpEnabledPromise;
};

const getInitialVerified = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  const saved = sessionStorage.getItem('zeros_phone_verified');
  if (!saved) {
    return false;
  }

  try {
    const { phone } = JSON.parse(saved) as { phone?: string };
    return Boolean(phone);
  } catch {
    return false;
  }
};

// 고객 간단 등록 — 단일 화면 폼.
// 고객 기본정보 + 요청사항(200자) + 사진/도면 첨부 + 개인정보 동의 → [등록] 시 관리자 대시보드에 이력 기록.
export const RequestWizard: React.FC<RequestWizardProps> = ({ onComplete }) => {
  const { customerAuth } = useShell();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 휴대폰 본인인증 상태 (의뢰 전 필수)
  // 로그인(customerAuth)은 휴대폰 OTP 인증을 거친 상태이므로 본인확인 완료로 간주한다(파생값).
  const [phoneVerified, setPhoneVerified] = useState<boolean>(() => getInitialVerified());
  const verified = phoneVerified || !!customerAuth;
  // SMS(Solapi) 설정 여부: null=확인중, true=인증 필요, false=설정 전이라 인증 생략
  // 프리페치 캐시가 있으면 첫 렌더부터 폼을 바로 보여준다.
  const [verifyEnabled, setVerifyEnabled] = useState<boolean | null>(otpEnabledCache);

  // SMS 설정 여부 확인 — 미설정이면 인증 게이트를 건너뛴다(테스트 코드 노출 방지)
  useEffect(() => {
    let active = true;
    prefetchOtpEnabled().then((enabled) => { if (active) setVerifyEnabled(enabled); });
    return () => { active = false; };
  }, []);

  const handleVerified = ({ name, phone }: { name: string; phone: string; verifiedToken: string }) => {
    setPhoneVerified(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('zeros_phone_verified', JSON.stringify({ phone }));
    }
    setFormData(prev => {
      const updated = { ...prev, phone, customer_name: prev.customer_name || name };
      if (typeof window !== 'undefined') {
        localStorage.setItem('zeros_draft_request', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // 폼 입력 데이터 상태 관리 및 임시저장 복구
  const [formData, setFormData] = useState<RequestFormData>(() => {
    if (typeof window === 'undefined') {
      return defaultFormData;
    }

    const draft = localStorage.getItem('zeros_draft_request');
    if (!draft) {
      return defaultFormData;
    }

    try {
      const parsed = JSON.parse(draft) as Partial<RequestFormData>;
      return { ...defaultFormData, ...parsed };
    } catch (e) {
      console.error('Failed to parse draft request', e);
      return defaultFormData;
    }
  });

  // 사전 로그인 고객: 기본 사항 자동 입력.
  // 로그인은 휴대폰 OTP 인증이므로 본인확인 게이트도 통과 처리한다.
  // 이름·연락처는 로그인 정보로, 회사·이메일·주소는 최근 접수건이 있으면 그 값으로 채운다.
  // 이미 입력(임시저장)된 칸은 덮어쓰지 않고, 빈 칸만 채워 사용자가 미기입분을 보완 후 등록한다.
  useEffect(() => {
    if (!customerAuth) return;
    let cancelled = false;
    (async () => {
      let last: { company_name?: string; email?: string; site_address?: string } = {};
      try {
        const list = await ZerosService.getEstimates();
        const digits = customerAuth.phone.replace(/\D/g, '');
        const mine = list.find(e => (e.phone || '').replace(/\D/g, '') === digits);
        if (mine) last = { company_name: mine.company_name, email: mine.email, site_address: mine.site_address };
      } catch {
        // 최근 접수건 조회 실패는 자동입력만 생략 (등록 흐름에는 영향 없음)
      }
      if (cancelled) return;
      setFormData(f => ({
        ...f,
        customer_name: f.customer_name || customerAuth.name,
        phone: customerAuth.phone,
        company_name: f.company_name || last.company_name || '',
        email: f.email || last.email || '',
        site_address: f.site_address || last.site_address || '',
      }));
    })();
    return () => { cancelled = true; };
  }, [customerAuth]);

  // 폼 입력값 변경 시 자동 임시저장
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let val: string | boolean = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    // 연락처: 하이픈 없이 숫자만 입력해도 010-0000-0000 형태로 자동 정돈
    if (name === 'phone' && typeof val === 'string') {
      const d = val.replace(/[^0-9]/g, '').slice(0, 11);
      val = d.length < 4 ? d : d.length < 8 ? `${d.slice(0, 3)}-${d.slice(3)}` : `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    }

    const updated = { ...formData, [name]: val };
    setFormData(updated);

    // 임시저장
    localStorage.setItem('zeros_draft_request', JSON.stringify(updated));
  };

  // 파일 선택 input 참조 및 업로드 상태
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>('도면');
  const [uploading, setUploading] = useState(false);

  // 업로드 버튼 클릭 → 파일 선택창 열기
  const openFilePicker = (category: string) => {
    setUploadCategory(category);
    setErrorMsg(null);
    // ref 가 카테고리 state 반영 후 클릭되도록 한 틱 뒤에 실행
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  // 파일이 선택되면 실제 Storage 로 업로드
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    // 같은 파일 다시 선택 가능하도록 input 초기화
    e.target.value = '';
    if (selected.length === 0) return;

    // 형식·개수·용량 한도 검사 (탭별 5개 / 총 15개·100MB / 개당 50MB / 허용 형식)
    const limitError = validateUpload(formData.files, selected, uploadCategory);
    if (limitError) {
      setErrorMsg(limitError);
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    try {
      let uploaded: FileMeta[];
      if (isSupabaseEnabled) {
        // 실제 클라우드 업로드
        uploaded = await uploadEstimateFiles(selected, uploadCategory);
      } else {
        // Supabase 미설정 시 로컬 폴백 (메타데이터만 기록)
        uploaded = selected.map((f, i) => ({
          id: `file-local-${Date.now()}-${i}`,
          estimate_id: '',
          file_name: f.name,
          file_type: f.type || 'application/octet-stream',
          file_url: '',
          file_category: uploadCategory,
          file_size: f.size,
          uploaded_at: new Date().toISOString(),
        }));
      }

      setFormData(prev => {
        const updated = { ...prev, files: [...prev.files, ...uploaded] };
        localStorage.setItem('zeros_draft_request', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : '파일 업로드 중 오류가 발생했습니다.');
    } finally {
      setUploading(false);
    }
  };

  // 파일 제거
  const handleRemoveFile = (idx: number) => {
    setFormData(prev => {
      const updatedFiles = prev.files.filter((_, i) => i !== idx);
      const updated = { ...prev, files: updatedFiles };
      localStorage.setItem('zeros_draft_request', JSON.stringify(updated));
      return updated;
    });
  };

  const failValidation = (msg: string): boolean => {
    setErrorMsg(msg);
    return false;
  };

  // 필수값 유효성 검사 (단일 화면)
  const validate = (): boolean => {
    setErrorMsg(null);
    if (!formData.customer_name.trim()) return failValidation('성함을 입력해 주세요.');
    if (!formData.phone.trim()) return failValidation('연락처를 입력해 주세요.');
    // 휴대폰 번호 검증 — 하이픈 유무와 무관하게 숫자만 정규화하여 11자리 휴대폰을 인식
    const phoneDigits = formData.phone.replace(/[^0-9]/g, '');
    if (!/^01[0-9]{8,9}$/.test(phoneDigits)) {
      return failValidation('연락처는 휴대폰 번호로 입력해 주세요. (하이픈 없이 숫자만 입력해도 됩니다)');
    }
    if (!formData.email.trim()) return failValidation('이메일 주소를 입력해 주세요.');
    if (!formData.site_address.trim()) return failValidation('현장 주소를 입력해 주세요.');
    if (!formData.agreePrivacy) return failValidation('개인정보 수집 및 이용에 동의해 주세요.');
    return true;
  };

  // 폼 제출 — 고객 간단 등록 → 관리자 대시보드 이력 기록(createEstimate)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const newEst = await ZerosService.createEstimate({
        customer_name: formData.customer_name,
        company_name: formData.company_name,
        phone: formData.phone,
        email: formData.email,
        site_address: formData.site_address,
        customer_type: formData.customer_type,
        work_type: formData.work_type,
        site_type: formData.site_type,
        work_purpose: formData.work_purpose,
        expected_budget_range: formData.expected_budget_range,
        desired_schedule: formData.desired_schedule,
        urgency: formData.urgency,
        description: formData.description,        // 고객 요청 사항
        request_detail: formData.request_detail,
        // 간단 등록 단계에서는 규모·결제 미산정 — 관리자가 방문 후 분류한다.
        estimate_category: 'unknown',
        payment_required: false,
        submitted_files: formData.files
      });

      // 임시저장 청소
      localStorage.removeItem('zeros_draft_request');

      // 완료 액션 기동
      onComplete(newEst);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('등록 도중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 인증 게이트 표시 여부
  const checkingVerify = verifyEnabled === null;
  const verifyRequired = verifyEnabled === true && !verified;
  const showForm = !checkingVerify && !verifyRequired;

  return (
    <div className="w-full bg-bg border border-border rounded-custom shadow-custom-md max-w-5xl mx-auto overflow-hidden">

      {/* 헤더 바 — 다른 탭과 동일 프레임으로 여유 있게(패딩·헤드라인 확대) */}
      <div className="bg-bg-subtle border-b border-border px-7 py-5 flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[22px] font-black text-navy leading-tight tracking-tight">
            {showForm ? '예상견적 의뢰하기' : verifyRequired ? '본인확인' : '준비 중'}
          </h3>
          {showForm && <span className="text-[13.5px] text-gray font-semibold">고객 정보만 등록해도 접수됩니다 · 자료를 함께 올리면 방문 전 1차 검토가 빨라집니다</span>}
        </div>
        {customerAuth && showForm && (
          <span className="text-[12.5px] font-bold text-success shrink-0">{customerAuth.name}님 · 자동입력됨</span>
        )}
      </div>

      {/* 인증 상태 확인 중 */}
      {checkingVerify ? (
        <div className="p-10 text-center text-[14px] text-gray-light font-bold">불러오는 중...</div>
      ) : verifyRequired ? (
        /* 본인인증 전: 휴대폰 인증 게이트 */
        <div className="p-7">
          <PhoneVerifyGate onVerified={handleVerified} />
        </div>
      ) : (
      /* 단일 등록 폼 */
      <form onSubmit={handleSubmit} className="p-7 md:p-8 flex flex-col gap-7">

        {/* 에러 피드백 */}
        {errorMsg && (
          <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-custom text-[13.5px] font-bold flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ===== 2분할: ① 고객 정보(필수) / ② 견적 자료(선택) — 가로폭 활용·한 화면 ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">

        {/* ① 고객 정보 등록 (필수) */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border">
            <span className="w-7 h-7 rounded-md bg-steel text-white text-[14px] font-black flex items-center justify-center shrink-0">1</span>
            <span className="text-[17px] font-black text-navy">고객 정보 등록</span>
            <span className="text-[12px] font-bold text-steel bg-steel/10 px-2 py-0.5 rounded">필수</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="customer_name" className="text-[14.5px] font-bold text-navy flex items-center gap-1.5">
              <User className="w-4.5 h-4.5 text-steel" />
              의뢰 주체 성함 (필수)
            </label>
            <input
              id="customer_name"
              name="customer_name"
              type="text"
              value={formData.customer_name}
              onChange={handleChange}
              style={{ touchAction: 'manipulation' }}
              placeholder="홍길동"
              className="w-full border border-border p-3.5 rounded-custom text-[16.5px] focus:outline-none focus:border-steel transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="company_name" className="text-[14.5px] font-bold text-navy flex items-center gap-1.5">
              <Building className="w-4.5 h-4.5 text-steel" />
              회사명 / 소속 기관 (선택)
            </label>
            <input
              id="company_name"
              name="company_name"
              type="text"
              value={formData.company_name}
              onChange={handleChange}
              style={{ touchAction: 'manipulation' }}
              placeholder="ABC식품 (주)"
              className="w-full border border-border p-3.5 rounded-custom text-[16.5px] focus:outline-none focus:border-steel transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-[14.5px] font-bold text-navy flex items-center gap-1.5">
                <Phone className="w-4.5 h-4.5 text-steel" />
                연락처 (필수)
                {verified && <span className="text-[12.5px] text-success font-bold">· 본인인증 완료</span>}
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                readOnly={verified}
                style={{ touchAction: 'manipulation' }}
                placeholder="010-0000-0000"
                className={`w-full border border-border p-3.5 rounded-custom text-[16.5px] transition-all ${
                  verified ? 'bg-bg-subtle text-gray focus:outline-none' : 'focus:outline-none focus:border-steel'
                }`}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[14.5px] font-bold text-navy flex items-center gap-1.5">
                <Mail className="w-4.5 h-4.5 text-steel" />
                이메일 (필수)
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                style={{ touchAction: 'manipulation' }}
                placeholder="name@example.com"
                className="w-full border border-border p-3.5 rounded-custom text-[16.5px] focus:outline-none focus:border-steel transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="site_address" className="text-[14.5px] font-bold text-navy flex items-center gap-1.5">
              <MapPin className="w-4.5 h-4.5 text-steel" />
              공사 현장 주소 (필수)
            </label>
            <input
              id="site_address"
              name="site_address"
              type="text"
              value={formData.site_address}
              onChange={handleChange}
              style={{ touchAction: 'manipulation' }}
              placeholder="경기도 화성시 향남읍 식품공단로 42"
              className="w-full border border-border p-3.5 rounded-custom text-[16.5px] focus:outline-none focus:border-steel transition-all"
            />
          </div>

          {/* 고객 요청 사항 — 200자 이내 텍스트 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-[14.5px] font-bold text-navy flex items-center gap-1.5">
              <MessageSquare className="w-4.5 h-4.5 text-steel" />
              고객 요청 사항 (선택 · 200자 이내)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              maxLength={200}
              rows={4}
              style={{ touchAction: 'manipulation' }}
              placeholder="예) 80A 배관 신규 설치 및 기존 라인 분기 검토를 요청드립니다."
              className="w-full border border-border p-3.5 rounded-custom text-[16.5px] focus:outline-none focus:border-steel transition-all resize-none"
            />
            <span className="text-[12.5px] text-gray-light font-bold self-end">{formData.description.length}/200</span>
          </div>
        </div>

        {/* ② 견적 자료 등록 (선택) */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-border">
            <span className="w-7 h-7 rounded-md bg-gray-light text-white text-[14px] font-black flex items-center justify-center shrink-0">2</span>
            <span className="text-[17px] font-black text-navy">견적 자료 등록</span>
            <span className="text-[12px] font-bold text-gray bg-bg-subtle px-2 py-0.5 rounded">선택</span>
          </div>
          <span className="text-[13px] text-gray leading-relaxed">
            지금 자료가 없어도 접수되고, 방문 실측으로 보완합니다. · 항목별 최대 {MAX_PER_CATEGORY}개, 전체 최대 {MAX_TOTAL_FILES}개 · 허용: {ALLOWED_LABEL}
          </span>

          {/* 실제 파일 선택 input (숨김) */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            onChange={handleFileSelected}
            className="hidden"
          />

          <div className="grid grid-cols-3 gap-3.5">
            <button
              type="button"
              disabled={uploading}
              onClick={() => openFilePicker('도면')}
              style={{ touchAction: 'manipulation' }}
              className="flex flex-col items-center justify-center gap-2 p-5 border border-dashed border-border bg-bg-subtle hover:bg-border/20 rounded-custom transition-all disabled:opacity-50"
            >
              <Upload className="w-5.5 h-5.5 text-steel" />
              <span className="text-[14px] font-bold text-navy">도면 업로드</span>
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => openFilePicker('사진')}
              style={{ touchAction: 'manipulation' }}
              className="flex flex-col items-center justify-center gap-2 p-5 border border-dashed border-border bg-bg-subtle hover:bg-border/20 rounded-custom transition-all disabled:opacity-50"
            >
              <Upload className="w-5.5 h-5.5 text-steel" />
              <span className="text-[14px] font-bold text-navy">사진 업로드</span>
            </button>
            <button
              type="button"
              disabled={uploading}
              onClick={() => openFilePicker('기타')}
              style={{ touchAction: 'manipulation' }}
              className="flex flex-col items-center justify-center gap-2 p-5 border border-dashed border-border bg-bg-subtle hover:bg-border/20 rounded-custom transition-all disabled:opacity-50"
            >
              <Upload className="w-5.5 h-5.5 text-steel" />
              <span className="text-[14px] font-bold text-navy">기타 첨부</span>
            </button>
          </div>

          {/* 업로드 진행 표시 */}
          {uploading && (
            <div className="flex items-center justify-center gap-2 text-[13.5px] font-bold text-steel py-1">
              <Upload className="w-4 h-4 animate-pulse" />
              파일 업로드 중입니다... 잠시만 기다려 주세요.
            </div>
          )}

          {/* 첨부된 파일 목록 */}
          {formData.files.length > 0 && (
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto border border-border rounded-custom p-3 bg-bg-subtle/30">
              <span className="text-[13px] text-gray-light font-bold">첨부된 자료 ({formData.files.length}건)</span>
              {formData.files.map((file, idx) => (
                <div key={file.id || idx} className="flex items-center justify-between bg-bg border border-border p-2.5 rounded-custom shadow-sm text-[13px] font-medium">
                  <div className="flex items-center gap-2 text-gray min-w-0">
                    <span className="bg-steel/15 text-steel px-1.5 py-0.5 rounded-custom text-[12.5px] font-bold shrink-0">{file.file_category}</span>
                    <span className="truncate text-navy font-bold text-[13px]">{file.file_name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(idx)}
                    style={{ touchAction: 'manipulation' }}
                    className="p-1 hover:bg-bg-subtle rounded-custom text-danger hover:text-danger-active transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>

        {/* ================= 개인정보 동의 + 등록 (하단 한 줄) ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 border-t border-border pt-5">
          <div className="flex items-start gap-3 border border-border p-4 rounded-custom bg-bg-subtle/30 select-none flex-1">
            <input
              id="agreePrivacy"
              name="agreePrivacy"
              type="checkbox"
              checked={formData.agreePrivacy}
              onChange={handleChange}
              style={{ touchAction: 'manipulation' }}
              className="w-5 h-5 text-steel border-border focus:ring-steel shrink-0 mt-0.5 cursor-pointer"
            />
            <label htmlFor="agreePrivacy" style={{ touchAction: 'manipulation' }} className="flex flex-col gap-0.5 cursor-pointer">
              <span className="text-[14px] font-bold text-navy">개인정보 수집 및 이용 동의 (필수)</span>
              <span className="text-[13px] text-gray leading-normal">
                ZEROS 예상견적 서비스 제공 및 연락을 위한 성함·연락처·이메일 저장을 승인합니다.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || uploading}
            style={{ touchAction: 'manipulation' }}
            className="flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-bg py-4 px-8 sm:px-14 shrink-0 rounded-custom text-[16.5px] font-black shadow-md transition-all select-none active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <span>등록 중...</span>
            ) : (
              <>
                등록
                <Send className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

      </form>
      )}
    </div>
  );
};
