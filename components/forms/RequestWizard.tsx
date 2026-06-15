'use client';

import React, { useState, useRef } from 'react';
import { ZerosService } from '@/lib/supabase/client';
import { uploadEstimateFiles } from '@/lib/supabase/storage';
import { isSupabaseEnabled } from '@/lib/supabase/supabaseBrowser';
import { validateUpload, ACCEPT_ATTR, ALLOWED_LABEL, MAX_PER_CATEGORY, MAX_TOTAL_FILES } from '@/lib/constants/uploadLimits';
import { PhoneVerifyGate } from './PhoneVerifyGate';
import { Estimate, FileMeta, WorkType, SiteType, ExpectedBudgetRange, EstimateCategory } from '@/types/estimate';
import {
  User,
  Building,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertCircle,
  Upload,
  Trash2,
  Lock
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
  agreePrivacy: false,
  agreeEstimate: false,
  agreeVisitFee: false,
  agreeAdditionalDoc: false
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

export const RequestWizard: React.FC<RequestWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 휴대폰 본인인증 상태 (의뢰 전 필수)
  const [verified, setVerified] = useState<boolean>(() => getInitialVerified());
  // SMS(Solapi) 설정 여부: null=확인중, true=인증 필요, false=설정 전이라 인증 생략
  // 프리페치 캐시가 있으면 첫 렌더부터 폼을 바로 보여준다.
  const [verifyEnabled, setVerifyEnabled] = useState<boolean | null>(otpEnabledCache);

  // SMS 설정 여부 확인 — 미설정이면 인증 게이트를 건너뛴다(테스트 코드 노출 방지)
  React.useEffect(() => {
    let active = true;
    prefetchOtpEnabled().then((enabled) => { if (active) setVerifyEnabled(enabled); });
    return () => { active = false; };
  }, []);

  const handleVerified = ({ name, phone }: { name: string; phone: string; verifiedToken: string }) => {
    setVerified(true);
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

  // 단계별 필수값 유효성 검사
  const validateStep = (): boolean => {
    setErrorMsg(null);
    if (step === 1) {
      if (!formData.customer_name.trim()) return failValidation('성함을 입력해 주세요.');
      if (!formData.phone.trim()) return failValidation('연락처를 입력해 주세요.');
      // 휴대폰 번호 검증 — 하이픈 유무와 무관하게 숫자만 정규화하여 11자리 휴대폰을 인식 - §3.6
      const phoneDigits = formData.phone.replace(/[^0-9]/g, '');
      if (!/^01[0-9]{8,9}$/.test(phoneDigits)) {
        return failValidation('연락처는 휴대폰 번호로 입력해 주세요. (하이픈 없이 숫자만 입력해도 됩니다)');
      }
      if (!formData.email.trim()) return failValidation('이메일 주소를 입력해 주세요.');
      if (!formData.site_address.trim()) return failValidation('현장 주소를 입력해 주세요.');
    }
    if (step === 2) {
      if (!formData.desired_schedule.trim()) return failValidation('희망시기를 입력해 주세요.');
    }
    if (step === 3) {
      if (!formData.description.trim()) return failValidation('현재 문제점 및 원하는 공사 내용을 서술해 주세요.');
    }
    if (step === 5) {
      if (!formData.agreePrivacy) return failValidation('개인정보 수집 및 이용에 동의해 주세요.');
      if (!formData.agreeEstimate) return failValidation('사전검토 및 견적 한도 설정 확인에 동의해 주세요.');
      if (formData.expected_budget_range === '1,000만~1억' && !formData.agreeVisitFee) {
        return failValidation('출장견적 실측 시 발생하는 비용 규정에 동의해 주세요.');
      }
      if (!formData.agreeAdditionalDoc) return failValidation('자료 부족 시 전담 엔지니어의 추가 자료 요청 동의에 체크해 주세요.');
    }
    return true;
  };

  const failValidation = (msg: string): boolean => {
    setErrorMsg(msg);
    return false;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setErrorMsg(null);
    setStep(prev => prev - 1);
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    setLoading(true);
    try {
      // 1. 예상금액에 따라 estimate_category 자동 결정 로직 - §6.2
      let category: EstimateCategory = 'unknown';
      if (formData.expected_budget_range === '≤1,000만') category = 'small';
      else if (formData.expected_budget_range === '1,000만~1억') category = 'medium';
      else if (formData.expected_budget_range === '≥1억') category = 'large';

      // 2. 제출용 파일 데이터 매핑 (이미 업로드되어 실제 URL을 보유)
      const mappedFiles = formData.files;

      // 3. 서비스 호출
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
        description: formData.description,
        request_detail: formData.request_detail,
        estimate_category: category,
        payment_required: category === 'medium' || category === 'large',
        submitted_files: mappedFiles
      });

      // 임시저장 청소
      localStorage.removeItem('zeros_draft_request');
      
      // 완료 액션 기동
      onComplete(newEst);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('의뢰 신청 도중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 진행률 Bar 계산
  const progressPercent = ((step - 1) / 4) * 100;

  // 인증 게이트 표시 여부
  const checkingVerify = verifyEnabled === null;
  const verifyRequired = verifyEnabled === true && !verified;
  const showForm = !checkingVerify && !verifyRequired;

  return (
    <div className="w-full bg-bg border border-border rounded-custom shadow-custom-md max-w-xl mx-auto overflow-hidden">
      
      {/* 5단계 헤더 바 */}
      <div className="bg-bg-subtle border-b border-border px-5 py-4 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] text-steel font-extrabold uppercase tracking-wider">예상견적 요청 폼</span>
          <h3 className="text-[15px] font-black text-navy leading-none">
            {showForm ? `Step ${step} / 5 단계` : verifyRequired ? '본인확인' : '준비 중'}
          </h3>
        </div>
        <span className="text-[12px] font-bold text-gray-light">
          {showForm ? `${Math.round(progressPercent)}% 완료` : verifyRequired ? '시작 전' : ''}
        </span>
      </div>

      {/* 실시간 진행 표시줄 */}
      <div className="w-full h-1 bg-border/40 relative">
        <div
          className="h-full bg-steel transition-all duration-300"
          style={{ width: `${showForm ? progressPercent : 0}%` }}
        />
      </div>

      {/* 인증 상태 확인 중 */}
      {checkingVerify ? (
        <div className="p-10 text-center text-[12px] text-gray-light font-bold">불러오는 중...</div>
      ) : verifyRequired ? (
        /* 본인인증 전: 휴대폰 인증 게이트 */
        <div className="p-6">
          <PhoneVerifyGate onVerified={handleVerified} />
        </div>
      ) : (
      /* 단계별 입력 폼 */
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
        
        {/* 에러 피드백 */}
        {errorMsg && (
          <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-custom text-[12px] font-bold flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ================= STEP 1: 고객 정보 ================= */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="flex flex-col gap-1">
              <label htmlFor="customer_name" className="text-[12px] font-bold text-navy flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-steel" />
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
                className="w-full border border-border p-2.5 rounded-custom text-[15px] focus:outline-none focus:border-steel transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="company_name" className="text-[12px] font-bold text-navy flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-steel" />
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
                className="w-full border border-border p-2.5 rounded-custom text-[15px] focus:outline-none focus:border-steel transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="phone" className="text-[12px] font-bold text-navy flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-steel" />
                  연락처 (필수)
                  {verified && <span className="text-[11px] text-success font-bold">· 본인인증 완료</span>}
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
                  className={`w-full border border-border p-2.5 rounded-custom text-[15px] transition-all ${
                    verified ? 'bg-bg-subtle text-gray focus:outline-none' : 'focus:outline-none focus:border-steel'
                  }`}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-[12px] font-bold text-navy flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-steel" />
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
                  className="w-full border border-border p-2.5 rounded-custom text-[15px] focus:outline-none focus:border-steel transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="site_address" className="text-[12px] font-bold text-navy flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-steel" />
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
                className="w-full border border-border p-2.5 rounded-custom text-[15px] focus:outline-none focus:border-steel transition-all"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 2: 공사 기본정보 ================= */}
        {step === 2 && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-navy">공사 종류</label>
                <select
                  name="work_type"
                  value={formData.work_type}
                  onChange={handleChange}
                  style={{ touchAction: 'manipulation' }}
                  className="w-full border border-border p-2.5 rounded-custom text-[15px] focus:outline-none focus:border-steel transition-all"
                >
                  <option value="배관공사">배관공사 (일반/용수)</option>
                  <option value="장비설치">장비설치 (펌프/탱크)</option>
                  <option value="Utility 배관">Utility 배관 (에어/스팀)</option>
                  <option value="공장증설">공장증설 및 분기</option>
                  <option value="노후배관교체">노후배관교체/철거</option>
                  <option value="기계실개선">기계실/펌프실 개선</option>
                  <option value="생산설비 배관 연결">생산설비 훅업(EP)</option>
                  <option value="CAPEX 개·증설 검토">CAPEX 예산 검토</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-navy">현장 용도 종류</label>
                <select
                  name="site_type"
                  value={formData.site_type}
                  onChange={handleChange}
                  style={{ touchAction: 'manipulation' }}
                  className="w-full border border-border p-2.5 rounded-custom text-[15px] focus:outline-none focus:border-steel transition-all"
                >
                  <option value="공장">일반 산업공장</option>
                  <option value="식품">식품공장 (HACCP)</option>
                  <option value="제약·바이오">제약·바이오 (GMP)</option>
                  <option value="물류센터">물류센터</option>
                  <option value="기계실">빌딩 기계실/지하</option>
                  <option value="상가">상업 상가/식당</option>
                  <option value="건물">일반 빌딩/공동주택</option>
                  <option value="기타">기타</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-bold text-navy">예상 공사금액 대역</label>
                <select
                  name="expected_budget_range"
                  value={formData.expected_budget_range}
                  onChange={handleChange}
                  style={{ touchAction: 'manipulation' }}
                  className="w-full border border-border p-2.5 rounded-custom text-[15px] focus:outline-none focus:border-steel transition-all"
                >
                  <option value="≤1,000만">1,000만 원 이하 (온라인 간편)</option>
                  <option value="1,000만~1억">1,000만 ~ 1억 원 (출장 실측)</option>
                  <option value="≥1억">1억 원 이상 (종합 프로젝트)</option>
                  <option value="모름">잘 모름 / 금액 미정</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="desired_schedule" className="text-[12px] font-bold text-navy">희망 공사시기</label>
                <input
                  id="desired_schedule"
                  name="desired_schedule"
                  type="text"
                  value={formData.desired_schedule}
                  onChange={handleChange}
                  style={{ touchAction: 'manipulation' }}
                  placeholder="예: 1개월 이내, 2026년 7월 중"
                  className="w-full border border-border p-2.5 rounded-custom text-[15px] focus:outline-none focus:border-steel transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border border-border/80 p-3 rounded-custom bg-bg-subtle/40">
              <div className="flex flex-col gap-0.5" style={{ touchAction: 'manipulation' }}>
                <span className="text-[12px] font-bold text-navy">긴급 검토 여부</span>
                <span className="text-[12px] text-gray-light leading-none">영업일 기준 24시간 이내 긴급 피드백 필요 여부</span>
              </div>
              <input
                name="urgency"
                type="checkbox"
                checked={formData.urgency}
                onChange={handleChange}
                style={{ touchAction: 'manipulation' }}
                className="w-4 h-4 text-steel border-border focus:ring-steel cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 3: 현장 기술 설명 ================= */}
        {step === 3 && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="flex flex-col gap-1">
              <label htmlFor="description" className="text-[12px] font-bold text-navy">
                현재 문제점 및 원하는 시공 내역 (필수)
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                style={{ touchAction: 'manipulation' }}
                placeholder="예: 기계실 메인 칠러 입구 밸브 플랜지 미세 누수와 노후 스팀 배관 30m 가량 철거 후 신설 검토가 필요합니다. 공장은 주말에만 가동이 정지되어 shut-down 기한이 짧습니다."
                className="w-full border border-border p-2.5 rounded-custom text-[12px] focus:outline-none focus:border-steel leading-relaxed resize-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="request_detail" className="text-[12px] font-bold text-navy">
                추가 기술 조건 / 현장 제약 사항 (선택)
              </label>
              <textarea
                id="request_detail"
                name="request_detail"
                rows={3}
                value={formData.request_detail}
                onChange={handleChange}
                style={{ touchAction: 'manipulation' }}
                placeholder="예: 배관 규격은 SUS304 80A 스케줄 10 플랜지 이음 기준입니다. 기계실 문 높이가 2m 미만이라서 장비 반입 시 해체 필요 여부를 봐주세요."
                className="w-full border border-border p-2.5 rounded-custom text-[12px] focus:outline-none focus:border-steel leading-relaxed resize-none"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 4: 사진/도면 업로드 ================= */}
        {step === 4 && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="bg-bg-subtle p-4 rounded-custom border border-border/80 flex flex-col gap-1.5">
              <span className="text-[12px] font-bold text-navy leading-none">현장 증빙자료 첨부 가이드</span>
              <span className="text-[12px] text-gray leading-relaxed mt-0.5">
                도면(P&ID, ISO 스케치, 배치도) 및 현장 사진(연결 헤더, 반입 경로, 협소 동선)을 한 개 이상 첨부하시면, 출장 실측 전 엔지니어가 1차 원가 밴드를 오차율 5% 이내로 고정해 진단 리포트를 송부할 수 있습니다.
              </span>
              <span className="text-[12px] text-gray-light leading-relaxed mt-1.5 pt-1.5 border-t border-border/60">
                · 첨부 한도: 항목별 최대 {MAX_PER_CATEGORY}개, 전체 최대 {MAX_TOTAL_FILES}개(합계 100MB·개당 50MB)<br />
                · 허용 형식: {ALLOWED_LABEL}
              </span>
            </div>

            {/* 실제 파일 선택 input (숨김) */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPT_ATTR}
              onChange={handleFileSelected}
              className="hidden"
            />

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                disabled={uploading}
                onClick={() => openFilePicker('도면')}
                style={{ touchAction: 'manipulation' }}
                className="flex flex-col items-center justify-center gap-1.5 p-3.5 border border-dashed border-border bg-bg-subtle hover:bg-border/20 rounded-custom transition-all disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-steel" />
                <span className="text-[12px] font-bold text-navy">도면 업로드</span>
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => openFilePicker('사진')}
                style={{ touchAction: 'manipulation' }}
                className="flex flex-col items-center justify-center gap-1.5 p-3.5 border border-dashed border-border bg-bg-subtle hover:bg-border/20 rounded-custom transition-all disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-steel" />
                <span className="text-[12px] font-bold text-navy">사진 업로드</span>
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={() => openFilePicker('기타')}
                style={{ touchAction: 'manipulation' }}
                className="flex flex-col items-center justify-center gap-1.5 p-3.5 border border-dashed border-border bg-bg-subtle hover:bg-border/20 rounded-custom transition-all disabled:opacity-50"
              >
                <Upload className="w-4 h-4 text-steel" />
                <span className="text-[12px] font-bold text-navy">기타 첨부</span>
              </button>
            </div>

            {/* 업로드 진행 표시 */}
            {uploading && (
              <div className="flex items-center justify-center gap-2 text-[12px] font-bold text-steel py-1">
                <Upload className="w-3.5 h-3.5 animate-pulse" />
                파일 업로드 중입니다... 잠시만 기다려 주세요.
              </div>
            )}

            {/* 첨부된 파일 목록 */}
            {formData.files.length > 0 ? (
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto border border-border rounded-custom p-3 bg-bg-subtle/30">
                <span className="text-[12px] text-gray-light font-bold">첨부된 자료 ({formData.files.length}건)</span>
                {formData.files.map((file, idx) => (
                  <div key={file.id || idx} className="flex items-center justify-between bg-bg border border-border p-2 rounded-custom shadow-sm text-[12px] font-medium">
                    <div className="flex items-center gap-2 text-gray min-w-0">
                      <span className="bg-steel/15 text-steel px-1.5 py-0.5 rounded-custom text-[12px] font-bold shrink-0">{file.file_category}</span>
                      <span className="truncate text-navy font-bold text-[12px]">{file.file_name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      style={{ touchAction: 'manipulation' }}
                      className="p-1 hover:bg-bg-subtle rounded-custom text-danger hover:text-danger-active transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-border border-dashed p-6 text-center rounded-custom text-[12px] text-gray-light font-bold bg-bg-subtle/10">
                *아직 첨부된 파일이 없습니다. (위 버튼을 눌러 도면·사진을 첨부해 주세요)
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 5: 서약 및 동의 제출 ================= */}
        {step === 5 && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="flex items-start gap-3 border border-border p-3.5 rounded-custom bg-bg-subtle/30 select-none">
              <input
                id="agreePrivacy"
                name="agreePrivacy"
                type="checkbox"
                checked={formData.agreePrivacy}
                onChange={handleChange}
                style={{ touchAction: 'manipulation' }}
                className="w-4 h-4 text-steel border-border focus:ring-steel shrink-0 mt-0.5 cursor-pointer"
              />
              <label htmlFor="agreePrivacy" style={{ touchAction: 'manipulation' }} className="flex flex-col gap-0.5 cursor-pointer">
                <span className="text-[12px] font-bold text-navy">개인정보 수집 및 이용 동의 (필수)</span>
                <span className="text-[12px] text-gray leading-normal">
                  ZEROS 예상견적 서비스 제공 및 연락을 위한 담당자 성함, 연락처, 이메일 저장을 승인합니다.
                </span>
              </label>
            </div>

            <div className="flex items-start gap-3 border border-border p-3.5 rounded-custom bg-bg-subtle/30 select-none">
              <input
                id="agreeEstimate"
                name="agreeEstimate"
                type="checkbox"
                checked={formData.agreeEstimate}
                onChange={handleChange}
                style={{ touchAction: 'manipulation' }}
                className="w-4 h-4 text-steel border-border focus:ring-steel shrink-0 mt-0.5 cursor-pointer"
              />
              <label htmlFor="agreeEstimate" style={{ touchAction: 'manipulation' }} className="flex flex-col gap-0.5 cursor-pointer">
                <span className="text-[12px] font-bold text-navy">엔지니어 사전검토 약관 동의 (필수)</span>
                <span className="text-[12px] text-gray leading-normal">
                  본 리포트는 확정된 견적서가 아니며, 고객이 제공한 사진 및 도면을 근거로 한 1차 타당성 검토 리포트임을 확인합니다.
                </span>
              </label>
            </div>

            {formData.expected_budget_range === '1,000만~1억' && (
              <div className="flex items-start gap-3 border border-border p-3.5 rounded-custom bg-bg-subtle/30 select-none">
                <input
                  id="agreeVisitFee"
                  name="agreeVisitFee"
                  type="checkbox"
                  checked={formData.agreeVisitFee}
                  onChange={handleChange}
                  style={{ touchAction: 'manipulation' }}
                  className="w-4 h-4 text-steel border-border focus:ring-steel shrink-0 mt-0.5 cursor-pointer"
                />
                <label htmlFor="agreeVisitFee" style={{ touchAction: 'manipulation' }} className="flex flex-col gap-0.5 cursor-pointer">
                  <span className="text-[12px] font-bold text-navy">출장견적 및 레이저 실측비용 인지 동의 (필수)</span>
                  <span className="text-[12px] text-gray leading-normal">
                    선택하신 규모(1,000만~1억)는 출장실측 진단 대상으로, 1차 도면 검토 완료 후 실측 방문 시 출장 여비가 청구됨을 확인합니다.
                  </span>
                </label>
              </div>
            )}

            <div className="flex items-start gap-3 border border-border p-3.5 rounded-custom bg-bg-subtle/30 select-none">
              <input
                id="agreeAdditionalDoc"
                name="agreeAdditionalDoc"
                type="checkbox"
                checked={formData.agreeAdditionalDoc}
                onChange={handleChange}
                style={{ touchAction: 'manipulation' }}
                className="w-4 h-4 text-steel border-border focus:ring-steel shrink-0 mt-0.5 cursor-pointer"
              />
              <label htmlFor="agreeAdditionalDoc" style={{ touchAction: 'manipulation' }} className="flex flex-col gap-0.5 cursor-pointer">
                <span className="text-[12px] font-bold text-navy">추가 자료 제출 협조 동의 (필수)</span>
                <span className="text-[12px] text-gray leading-normal">
                  도면의 스펙 미비 또는 현장 분기점 사진 부재 시, 전담 엔지니어가 개별 유선/메일로 보완을 요구할 수 있음에 동의합니다.
                </span>
              </label>
            </div>

            <div className="bg-navy p-3.5 rounded-custom flex items-center gap-2 text-bg text-[12px] leading-relaxed font-medium">
              <Lock className="w-4 h-4 text-steel shrink-0" />
              <span>제출하신 자료는 보안 RLS 정책에 의해 철저하게 기밀 유지되며 관리자 외 절대 유출되지 않습니다.</span>
            </div>
          </div>
        )}

        {/* ================= 액션 버튼 영역 ================= */}
        <div className="flex items-center gap-3 border-t border-border pt-4 mt-1">
          {step > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              disabled={loading}
              style={{ touchAction: 'manipulation' }}
              className="flex items-center justify-center gap-1.5 bg-bg-subtle hover:bg-border/30 text-navy px-4 py-3 rounded-custom text-[12px] font-extrabold border border-border transition-all select-none w-24 active:scale-95 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              style={{ touchAction: 'manipulation' }}
              className="flex-1 flex items-center justify-center gap-1.5 bg-steel hover:bg-navy text-bg py-3 rounded-custom text-[12px] font-extrabold shadow-sm transition-all select-none active:scale-[0.99]"
            >
              다음 단계
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              style={{ touchAction: 'manipulation' }}
              className="flex-1 flex items-center justify-center gap-1.5 bg-accent hover:bg-accent/90 text-bg py-3 rounded-custom text-[12px] font-black shadow-md transition-all select-none active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <span>의뢰서 접수 중...</span>
              ) : (
                <>
                  예상견적 최종 제출
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>

      </form>
      )}
    </div>
  );
};
