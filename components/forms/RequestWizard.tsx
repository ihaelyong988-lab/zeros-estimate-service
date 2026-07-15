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
  Building,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  Briefcase,
  Send,
  AlertCircle,
  Upload,
  Trash2,
  Truck,
  Zap,
  CalendarClock,
  Coins,
  CheckCircle2,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';

// 견적문의 진입 채널 — 자료등록 화면에서 둘 중 하나를 고른다.
//  visit: 견적·출장요청 자료등록(자료 + 예약방문 신청)  ·  quick: 무료 견적 신청(100만원 이하 · AI Native 자동 등록)
export type RequestChannel = 'visit' | 'quick';

// 업종 — 꼭 필요한 선택값(드롭다운). 가입정보 외 최소 식별용.
const INDUSTRY_OPTIONS = ['식품 제조', '제약·바이오', '화학·정밀', '기계·금속', '전자·반도체', '물류·유통', '일반 제조', '상업·건물', '기타'];

// 채널별 견적 절차 방법론(2026-07-15 캡쳐 지시) — 채널 선택 카드 아래 정보 영역.
//  visit=Crisp-DM 7단계 · quick=KDD 6단계. 콘텐츠는 데이터로 분리(문구 교체 용이).
const CHANNEL_METHODOLOGY: Record<RequestChannel, { title: string; steps: { term: string; desc: string }[] }> = {
  visit: {
    title: '견적·출장요청 자료등록 - 견적 절차 Crisp-DM 방법론',
    steps: [
      { term: '작업 이해', desc: '고객 요구·공사 범위 파악 및 견적 목표 정의' },
      { term: '데이터 이해', desc: '도면·시방서·실적 DB 탐색 및 데이터 품질 진단' },
      { term: '데이터 준비', desc: '결측·이상치 처리, 자재/공종 정규화 및 학습 데이터셋 구성' },
      { term: 'AI모델링', desc: '물량·단가 예측 모델 학습(회귀/앙상블) 및 견적 자동 산출' },
      { term: '평가', desc: '예측 성능(MAE·신뢰구간) 검증 및 실적 대비 교차검증' },
      { term: '전개', desc: '검증 모델을 견적 시스템에 배포·자동화 파이프라인 연결' },
      { term: '고객 제공', desc: '예상 견적서·산출근거 리포트 제공' },
    ],
  },
  quick: {
    title: '무료 견적 신청 - 견적 절차 KDD 방법론',
    steps: [
      { term: '데이터', desc: 'RAW Data와 DB에서 필요한 데이터 수집' },
      { term: '전처리', desc: '이상값·결측치 분류 및 데이터 가공' },
      { term: '변환', desc: '단위·규격 표준화, 자재/공종 코드 매핑 및 파생변수 생성' },
      { term: '마이닝', desc: '유사 실적 견적 패턴 탐색 및 단가·물량 상관 분석' },
      { term: '평가', desc: '산출 견적의 정확도·신뢰구간 검증, 실적 대비 오차 평가' },
      { term: '고객 제공', desc: '최종 견적서·근거자료 산출 및 고객 전달' },
    ],
  },
};

// 방법론 목록 렌더 — 카드 버튼 바깥의 비인터랙티브 정보 영역(거대 클릭영역·중첩 인터랙션 방지)
const MethodologyList = ({ channel }: { channel: RequestChannel }) => {
  const m = CHANNEL_METHODOLOGY[channel];
  return (
    <div className="mt-5 flex flex-col gap-3">
      <div className="h-[3px] w-full rounded-full bg-border/80" aria-hidden="true" />
      <h3 className="mt-1 text-[15px] font-black text-navy leading-snug">{m.title}</h3>
      <ol className="flex flex-col gap-2">
        {m.steps.map((s, i) => (
          <li key={s.term} className="text-[14px] leading-relaxed">
            <span className="font-black text-navy tabular-nums">{i + 1}. {s.term}:</span>{' '}
            <span className="font-semibold text-gray">{s.desc}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

const defaultFormData = {
  customer_name: '',
  company_name: '',
  phone: '',
  email: '',
  site_address: '',
  industry: '',
  customer_type: '일반',
  work_type: '배관공사' as WorkType,
  site_type: '공장' as SiteType,
  work_purpose: '신규설치',
  expected_budget_range: '1,000만~1억' as ExpectedBudgetRange,
  desired_schedule: '1개월 이내',
  urgency: false,
  description: '',
  request_detail: '',
  // 예약방문(채널 visit 전용) — 희망 방문일/시간대
  visit_date: '',
  visit_time: '오전' as '오전' | '오후',
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

interface RequestWizardProps {
  onComplete: (estimate: Estimate) => void;
  // 홈 카드/CTA에서 채널을 지정해 진입하면 선택 화면을 건너뛰고 해당 폼으로 바로 연다.
  initialChannel?: RequestChannel | null;
  // 위 initialChannel을 1회 소비했음을 부모에 알려 ref를 비운다(탭바로 재진입 시 선택 화면 노출).
  onChannelConsumed?: () => void;
}

// 고객 간단 등록 — 채널 선택 → 선택형 단계 탭 폼 → 등록완료 탭(관리 페이지 이동).
// 가입(로그인)정보는 자동입력하고, 채널별로 꼭 필요한 칸만 단계로 나눠 간결하게 받는다.
export const RequestWizard: React.FC<RequestWizardProps> = ({ onComplete, initialChannel = null, onChannelConsumed }) => {
  const { customerAuth, setCustomerAuth, setShowMyRequests, setActiveTab } = useShell();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 자료등록 채널 선택 — null이면 2채널 선택 화면, 값이 있으면 단계 폼.
  const [channel, setChannel] = useState<RequestChannel | null>(initialChannel);
  // 단계 진행 — 1: 사업·현장 / 2: 방문·연락(또는 견적·연락) / 3: 참조·자료
  const [step, setStep] = useState<1 | 2 | 3>(1);
  // 등록완료 — 접수된 견적이 담기면 완료 탭을 보여준다.
  const [submitted, setSubmitted] = useState<Estimate | null>(null);

  // 지정 진입값은 1회만 소비 — 부모 ref를 비워, 이후 탭바로 재진입하면 선택 화면이 다시 보인다.
  useEffect(() => {
    if (initialChannel) onChannelConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 휴대폰 본인인증 상태 (의뢰 전 필수). 로그인(customerAuth)은 OTP 인증을 거쳤으므로 본인확인 완료로 간주(파생값).
  const [phoneVerified, setPhoneVerified] = useState<boolean>(() => getInitialVerified());
  const verified = phoneVerified || !!customerAuth;
  // SMS(Solapi) 설정 여부: null=확인중, true=인증 필요, false=설정 전이라 인증 생략
  const [verifyEnabled, setVerifyEnabled] = useState<boolean | null>(otpEnabledCache);

  useEffect(() => {
    let active = true;
    prefetchOtpEnabled().then((enabled) => { if (active) setVerifyEnabled(enabled); });
    return () => { active = false; };
  }, []);

  const handleVerified = ({ name, phone, sessionToken }: { name: string; phone: string; verifiedToken: string; sessionToken: string }) => {
    setPhoneVerified(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('zeros_phone_verified', JSON.stringify({ phone }));
    }
    // 처음 사용자도 본인인증을 마치면 로그인으로 영속화한다 — 다음 방문 시 바로 자료등록 화면으로.
    // sessionToken(30일)을 함께 저장해야 접수·본인 견적서 다운로드 시 서버 재검증을 통과한다.
    setCustomerAuth({ name: name.trim(), phone, verifiedAt: new Date().toISOString(), sessionToken });
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

  // 사전 로그인 고객: 기본 사항 자동 입력. 이름·연락처는 로그인 정보로, 회사·이메일·주소는 최근 접수건이 있으면 그 값으로.
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
    localStorage.setItem('zeros_draft_request', JSON.stringify(updated));
  };

  // 파일 선택 input 참조 및 업로드 상태
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>('도면');
  const [uploading, setUploading] = useState(false);

  const openFilePicker = (category: string) => {
    setUploadCategory(category);
    setErrorMsg(null);
    setTimeout(() => fileInputRef.current?.click(), 0);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (selected.length === 0) return;

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
        uploaded = await uploadEstimateFiles(selected, uploadCategory);
      } else {
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

  const isPhoneValid = () => /^01[0-9]{8,9}$/.test(formData.phone.replace(/[^0-9]/g, ''));

  // 단계별 유효성 — '다음'으로 넘어갈 때만 해당 단계 필수값을 검사한다.
  const validateStep = (s: 1 | 2 | 3): boolean => {
    setErrorMsg(null);
    if (s === 1) {
      if (!formData.site_address.trim()) return failValidation(channel === 'visit' ? '출장 지역(현장 주소)을 입력해 주세요.' : '지역(현장 주소)을 입력해 주세요.');
    }
    if (s === 2) {
      if (!formData.phone.trim()) return failValidation('담당자 연락처를 입력해 주세요.');
      if (!isPhoneValid()) return failValidation('연락처는 휴대폰 번호로 입력해 주세요. (하이픈 없이 숫자만 입력해도 됩니다)');
      if (!formData.email.trim()) return failValidation('이메일 회신처를 입력해 주세요.');
      if (channel === 'visit' && !formData.visit_date) return failValidation('희망 방문일을 선택해 주세요.');
    }
    return true;
  };

  const goNext = () => { if (validateStep(step)) setStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s)); };
  const goBack = () => {
    setErrorMsg(null);
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3);
    else { setChannel(null); }
  };

  // 최종 제출 유효성(3단계 등록 직전)
  const validateAll = (): boolean => {
    setErrorMsg(null);
    if (!formData.phone.trim() || !isPhoneValid()) return failValidation('담당자 연락처를 휴대폰 번호로 입력해 주세요.');
    if (!formData.email.trim()) return failValidation('이메일 회신처를 입력해 주세요.');
    if (!formData.site_address.trim()) return failValidation('현장(지역) 주소를 입력해 주세요.');
    if (channel === 'visit' && !formData.visit_date) return failValidation('희망 방문일을 선택해 주세요.');
    if (!formData.agreePrivacy) return failValidation('개인정보 수집 및 이용에 동의해 주세요.');
    return true;
  };

  // 폼 제출 — 고객 간단 등록 → 관리자 대시보드 이력 기록(createEstimate) → 등록완료 탭 노출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;

    setLoading(true);
    try {
      const industryTag = formData.industry ? ` · 업종: ${formData.industry}` : '';
      const channelTag = channel === 'quick'
        ? `[무료견적·총 공사비 100만원 이하] AI Native 자동 등록${industryTag}`
        : `[출장요청·예약방문] 희망 방문: ${formData.visit_date || '미지정'} ${formData.visit_time}${industryTag}`;

      // 출장요청 채널이면 예약방문 정보를 함께 넘겨, 서버가 접수와 방문 이력을 한 번에 기록한다.
      const visitPayload = channel === 'visit' && formData.visit_date
        ? {
            visit_date: formData.visit_date,
            visit_purpose: `고객 예약방문 신청 (${formData.visit_time})`,
            site_memo: `고객 희망 방문일 ${formData.visit_date} ${formData.visit_time}`,
          }
        : undefined;

      const newEst = await ZerosService.createEstimate({
        customer_name: formData.customer_name || customerAuth?.name || '고객',
        company_name: formData.company_name,
        phone: formData.phone,
        email: formData.email,
        site_address: formData.site_address,
        customer_type: formData.customer_type,
        work_type: formData.work_type,
        site_type: formData.site_type,
        work_purpose: formData.work_purpose,
        expected_budget_range: channel === 'quick' ? '≤1,000만' : formData.expected_budget_range,
        desired_schedule: channel === 'visit' && formData.visit_date ? formData.visit_date : formData.desired_schedule,
        urgency: formData.urgency,
        description: formData.description,
        request_detail: channelTag,
        estimate_category: channel === 'quick' ? 'small' : 'unknown',
        payment_required: false,
        submitted_files: formData.files
      }, { visit: visitPayload });

      localStorage.removeItem('zeros_draft_request');
      onComplete?.(newEst);
      // 등록완료 탭으로 전환 — 관리 페이지로 이동해 확인할 수 있게 한다.
      setSubmitted(newEst);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('등록 도중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  // 새 등록 — 완료 후 다시 채널 선택부터.
  const resetWizard = () => {
    setSubmitted(null);
    setChannel(null);
    setStep(1);
    setErrorMsg(null);
  };

  // 화면 분기
  const checkingVerify = verifyEnabled === null;
  const verifyRequired = verifyEnabled === true && !verified;
  const showForm = !checkingVerify && !verifyRequired;
  const completed = showForm && !!submitted;
  const channelView = showForm && !channel && !completed;
  const formView = showForm && !!channel && !completed;

  const channelLabel = channel === 'visit' ? '견적 자료등록' : '무료 견적 신청';
  // 단계 라벨(진행 표시) — 채널별로 2단계 명칭만 다르다.
  const stepLabels = channel === 'visit'
    ? ['사업·현장', '방문·연락', '참조·자료', '완료']
    : ['사업·현장', '견적·연락', '참조 사항', '완료'];
  const activeStepIdx = completed ? 3 : step - 1;

  // 공통 입력 클래스 — 16px 이상 본문, focus-visible 가시.
  const inputCls = 'w-full border border-border p-3.5 rounded-custom text-[16.5px] focus:outline-none focus:border-steel transition-all';
  const labelCls = 'text-[14.5px] font-bold text-navy flex items-center gap-1.5';

  return (
    <div className="w-full bg-bg border border-border rounded-custom shadow-custom-md max-w-3xl mx-auto overflow-hidden">

      {/* 헤더 바 — 채널 선택 화면에선 숨김(제목·부제 제거). 폼/완료 단계에서만 ← + 단계명 표시. */}
      {(verifyRequired || formView || completed) && (
        <div className="bg-bg-subtle border-b border-border px-6 md:px-7 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {formView && (
              <button
                type="button"
                onClick={goBack}
                aria-label={step > 1 ? '이전 단계로' : '등록 방법 다시 선택'}
                style={{ touchAction: 'manipulation' }}
                className="shrink-0 w-11 h-11 flex items-center justify-center rounded-custom border border-border bg-bg text-steel hover:text-navy hover:border-steel transition-all active:scale-95 motion-reduce:active:scale-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/50"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h3 className="text-[20px] font-black text-navy leading-tight tracking-tight truncate">
              {verifyRequired ? '본인확인' : completed ? '등록 완료' : channelLabel}
            </h3>
          </div>
          {customerAuth && showForm && !completed && (
            <span className="text-[12.5px] font-bold text-success shrink-0">{customerAuth.name}님 · 자동입력됨</span>
          )}
        </div>
      )}

      {/* 진행 표시(단계 탭) — 폼/완료에서 노출 */}
      {(formView || completed) && (
        <div className="flex gap-2 px-6 md:px-7 pt-4">
          {stepLabels.map((lbl, i) => {
            const done = i < activeStepIdx;
            const active = i === activeStepIdx;
            return (
              <div key={lbl} className="flex-1 flex flex-col gap-1.5">
                <div className={`h-1 rounded-full ${active ? 'bg-accent' : done ? 'bg-steel' : 'bg-border'}`} />
                <span className={`text-[11.5px] font-bold tabular-nums ${active ? 'text-navy' : done ? 'text-steel' : 'text-gray-light'}`}>
                  {i < 3 ? `${i + 1} · ` : ''}{lbl}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 본문 */}
      {checkingVerify ? (
        <div className="p-10 text-center text-[14px] text-gray font-bold">불러오는 중...</div>
      ) : verifyRequired ? (
        <div className="p-7">
          <PhoneVerifyGate onVerified={handleVerified} />
        </div>
      ) : completed ? (
        /* 등록완료 탭 — 관리 페이지로 이동해 확인 */
        <div className="p-7 md:p-9 flex flex-col items-center text-center gap-4">
          <span className="w-16 h-16 rounded-full bg-success/10 border border-success/20 flex items-center justify-center text-success">
            <CheckCircle2 className="w-9 h-9" />
          </span>
          <div className="flex flex-col gap-1.5">
            <h4 className="text-[20px] font-black text-navy tracking-tight">등록이 접수되었습니다</h4>
            <p className="text-[14px] text-gray font-semibold leading-relaxed">
              접수하신 자료{channel === 'visit' ? '·예약' : ''}은 이력관리에 저장되었습니다.<br />관리 페이지에서 진행 상황을 확인하세요.
            </p>
          </div>
          <div className="w-full max-w-xs bg-bg-subtle border border-border rounded-custom px-4 py-3 flex items-center justify-between">
            <span className="text-[12.5px] font-bold text-gray-light">접수 번호</span>
            <span className="text-[14px] font-black text-navy tracking-wide tabular-nums">{submitted?.estimate_no}</span>
          </div>
          <div className="w-full max-w-xs flex flex-col gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => { setShowMyRequests(true); }}
              style={{ touchAction: 'manipulation' }}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-[#c95f12] text-white py-3.5 min-h-[44px] rounded-custom text-[16px] font-black shadow-md transition-all active:scale-[0.99] motion-reduce:active:scale-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            >
              관리 페이지에서 확인 <ArrowRight className="w-5 h-5" />
            </button>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={resetWizard}
                style={{ touchAction: 'manipulation' }}
                className="flex-1 py-3 min-h-[44px] rounded-custom text-[14.5px] font-bold border border-border bg-bg text-navy hover:border-steel transition-all active:scale-[0.99] motion-reduce:active:scale-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/40"
              >
                새 등록하기
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('home')}
                style={{ touchAction: 'manipulation' }}
                className="flex-1 py-3 min-h-[44px] rounded-custom text-[14.5px] font-bold border border-border bg-bg text-gray hover:border-steel hover:text-navy transition-all active:scale-[0.99] motion-reduce:active:scale-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/40"
              >
                홈으로
              </button>
            </div>
          </div>
        </div>
      ) : channelView ? (
        /* 화면 1 — 정리된 2채널 선택(제목·부제·하단문구 제거) + 카드 하단 견적 절차 방법론(2026-07-15) */
        <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
          {/* A. 견적·출장요청 자료등록 + Crisp-DM 절차 */}
          <div className="flex flex-col">
          <button
            type="button"
            onClick={() => { setChannel('visit'); setStep(1); setErrorMsg(null); }}
            style={{ touchAction: 'manipulation' }}
            className="group text-left flex flex-col gap-3.5 p-5 rounded-custom border border-border bg-bg hover:border-steel hover:bg-bg-subtle/40 transition-all active:scale-[0.99] motion-reduce:active:scale-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/50"
          >
            <span className="flex items-center gap-3">
              <span className="shrink-0 w-11 h-11 rounded-full bg-steel/10 flex items-center justify-center">
                <Truck className="w-6 h-6 text-steel" />
              </span>
              <span className="text-[17px] font-black text-navy leading-tight">견적·출장요청 자료등록</span>
            </span>
            <span className="text-[13.5px] text-gray font-semibold leading-relaxed">
              자료 등록 + 예약방문 신청<br />출장·컨설팅 요청 창구
            </span>
            <span className="mt-1 w-full text-center bg-navy text-white py-3 min-h-[44px] flex items-center justify-center rounded-custom text-[15px] font-black group-hover:bg-steel transition-colors">
              견적 자료등록
            </span>
          </button>
          <MethodologyList channel="visit" />
          </div>

          {/* B. 무료 견적(100만원 이하 · AI Native 자동) + KDD 절차 */}
          <div className="flex flex-col">
          <button
            type="button"
            onClick={() => { setChannel('quick'); setStep(1); setErrorMsg(null); }}
            style={{ touchAction: 'manipulation' }}
            className="group text-left flex flex-col gap-3.5 p-5 rounded-custom border border-border bg-bg hover:border-steel hover:bg-bg-subtle/40 transition-all active:scale-[0.99] motion-reduce:active:scale-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/50"
          >
            <span className="flex items-center gap-3">
              <span className="shrink-0 w-11 h-11 rounded-full bg-steel/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-steel" />
              </span>
              <span className="text-[17px] font-black text-navy leading-tight">무료 견적 신청</span>
            </span>
            <span className="text-[13.5px] text-gray font-semibold leading-relaxed">
              총 공사비 100만원 이하<br />AI Native 기반 자동 등록
            </span>
            <span className="mt-1 w-full text-center bg-navy text-white py-3 min-h-[44px] flex items-center justify-center rounded-custom text-[15px] font-black group-hover:bg-steel transition-colors">
              무료 견적 신청
            </span>
          </button>
          <MethodologyList channel="quick" />
          </div>
        </div>
      ) : (
        /* 화면 2 — 선택형 단계 탭 폼 */
        <form onSubmit={handleSubmit} className="p-6 md:p-8 pt-5 flex flex-col gap-6">

          {/* 에러 피드백 */}
          {errorMsg && (
            <div role="alert" aria-live="assertive" className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-custom text-[13.5px] font-bold flex items-start gap-2 animate-in fade-in duration-200 motion-reduce:animate-none">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ===== STEP 1 — 사업·현장 ===== */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="site_address" className={labelCls}>
                  <MapPin className="w-4.5 h-4.5 text-steel" />
                  {channel === 'visit' ? '출장 지역 (현장 주소) · 필수' : '지역 (현장 주소) · 필수'}
                </label>
                <input
                  id="site_address"
                  name="site_address"
                  type="text"
                  value={formData.site_address}
                  onChange={handleChange}
                  style={{ touchAction: 'manipulation' }}
                  placeholder="경기도 화성시 향남읍 식품공단로 42"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="company_name" className={labelCls}>
                  <Building className="w-4.5 h-4.5 text-steel" />
                  사업체 (선택)
                </label>
                <input
                  id="company_name"
                  name="company_name"
                  type="text"
                  value={formData.company_name}
                  onChange={handleChange}
                  style={{ touchAction: 'manipulation' }}
                  placeholder="ABC식품 (주)"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="industry" className={labelCls}>
                  <Briefcase className="w-4.5 h-4.5 text-steel" />
                  업종 (선택)
                </label>
                <select
                  id="industry"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  style={{ touchAction: 'manipulation' }}
                  className={`${inputCls} ${formData.industry ? 'text-navy' : 'text-gray-light'}`}
                >
                  <option value="">업종을 선택하세요</option>
                  {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o} className="text-navy">{o}</option>)}
                </select>
              </div>

              <button
                type="button"
                onClick={goNext}
                style={{ touchAction: 'manipulation' }}
                className="self-end flex items-center gap-2 bg-navy hover:bg-steel text-white py-3 px-9 min-h-[44px] rounded-custom text-[15.5px] font-black transition-all active:scale-[0.99] motion-reduce:active:scale-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/50"
              >
                다음 <ArrowRight className="w-4.5 h-4.5" />
              </button>
            </div>
          )}

          {/* ===== STEP 2 — 방문·연락 / 견적·연락 ===== */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              {channel === 'visit' ? (
                <div className="flex flex-col gap-2.5">
                  <label htmlFor="visit_date" className={labelCls}>
                    <CalendarClock className="w-4.5 h-4.5 text-steel" />
                    방문 가능 날짜 · 시간 (필수)
                  </label>
                  <input
                    id="visit_date"
                    name="visit_date"
                    type="date"
                    value={formData.visit_date}
                    onChange={handleChange}
                    style={{ touchAction: 'manipulation' }}
                    className={`${inputCls} text-navy`}
                  />
                  <div className="grid grid-cols-2 gap-2.5">
                    {(['오전', '오후'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData((f) => ({ ...f, visit_time: t }))}
                        style={{ touchAction: 'manipulation' }}
                        className={`p-3 min-h-[44px] rounded-custom text-[15px] font-bold border transition-all active:scale-[0.99] motion-reduce:active:scale-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/40 ${
                          formData.visit_time === t
                            ? 'border-steel bg-steel/10 text-navy'
                            : 'border-border bg-bg text-gray hover:border-steel/60'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="expected_budget_range" className={labelCls}>
                    <Coins className="w-4.5 h-4.5 text-steel" />
                    예상 공사금액 (선택)
                  </label>
                  <select
                    id="expected_budget_range"
                    name="expected_budget_range"
                    value={formData.expected_budget_range}
                    onChange={handleChange}
                    style={{ touchAction: 'manipulation' }}
                    className={`${inputCls} text-navy`}
                  >
                    <option value="≤1,000만">100만원 이하</option>
                    <option value="1,000만~1억">1,000만 ~ 1억</option>
                    <option value="모름">아직 모름</option>
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="phone" className={labelCls}>
                  <Phone className="w-4.5 h-4.5 text-steel" />
                  담당자 연락처 (필수)
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
                  className={`${inputCls} ${verified ? 'bg-bg-subtle text-gray' : ''}`}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className={labelCls}>
                  <Mail className="w-4.5 h-4.5 text-steel" />
                  이메일 회신처 (필수)
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  style={{ touchAction: 'manipulation' }}
                  placeholder="name@example.com"
                  className={inputCls}
                />
              </div>

              <button
                type="button"
                onClick={goNext}
                style={{ touchAction: 'manipulation' }}
                className="self-end flex items-center gap-2 bg-navy hover:bg-steel text-white py-3 px-9 min-h-[44px] rounded-custom text-[15.5px] font-black transition-all active:scale-[0.99] motion-reduce:active:scale-100 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/50"
              >
                다음 <ArrowRight className="w-4.5 h-4.5" />
              </button>
            </div>
          )}

          {/* ===== STEP 3 — 참조 사항 · 자료 ===== */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="description" className={labelCls}>
                  <MessageSquare className="w-4.5 h-4.5 text-steel" />
                  간단한 참조 사항 (선택 · 200자 이내)
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
                  className={`${inputCls} resize-none`}
                />
                <span className="text-[12.5px] text-gray font-bold self-end tabular-nums">{formData.description.length}/200</span>
              </div>

              {/* 자료 첨부 — 출장요청(visit) 채널만 */}
              {channel === 'visit' && (
                <div className="flex flex-col gap-3">
                  <label className={labelCls}>
                    <Upload className="w-4.5 h-4.5 text-steel" />
                    자료 첨부 (선택)
                  </label>
                  <span className="text-[12.5px] text-gray leading-relaxed">
                    지금 자료가 없어도 접수되고, 방문 실측으로 보완합니다. · 항목별 최대 {MAX_PER_CATEGORY}개, 전체 최대 {MAX_TOTAL_FILES}개 · 허용: {ALLOWED_LABEL}
                  </span>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPT_ATTR}
                    onChange={handleFileSelected}
                    className="hidden"
                  />

                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { cat: '도면', label: '도면' },
                      { cat: '사진', label: '사진' },
                      { cat: '기타', label: '기타' },
                    ].map((u) => (
                      <button
                        key={u.cat}
                        type="button"
                        disabled={uploading}
                        onClick={() => openFilePicker(u.cat)}
                        style={{ touchAction: 'manipulation' }}
                        className="flex items-center justify-center gap-2 w-full p-3.5 min-h-[44px] border border-dashed border-border bg-bg-subtle hover:bg-border/20 rounded-custom transition-all disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel/40"
                      >
                        <Upload className="w-4.5 h-4.5 text-steel" />
                        <span className="text-[14px] font-bold text-navy">{u.label}</span>
                      </button>
                    ))}
                  </div>

                  {uploading && (
                    <div className="flex items-center justify-center gap-2 text-[13.5px] font-bold text-steel py-1">
                      <Upload className="w-4 h-4 animate-pulse motion-reduce:animate-none" />
                      파일 업로드 중입니다... 잠시만 기다려 주세요.
                    </div>
                  )}

                  {formData.files.length > 0 && (
                    <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto border border-border rounded-custom p-3 bg-bg-subtle/30">
                      <span className="text-[13px] text-gray font-bold">첨부된 자료 ({formData.files.length}건)</span>
                      {formData.files.map((file, idx) => (
                        <div key={file.id || idx} className="flex items-center justify-between bg-bg border border-border p-2.5 rounded-custom shadow-sm text-[13px] font-medium">
                          <div className="flex items-center gap-2 text-gray min-w-0">
                            <span className="bg-steel/15 text-steel px-1.5 py-0.5 rounded-custom text-[12.5px] font-bold shrink-0">{file.file_category}</span>
                            <span className="truncate text-navy font-bold text-[13px]">{file.file_name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(idx)}
                            aria-label="첨부 파일 삭제"
                            style={{ touchAction: 'manipulation' }}
                            className="w-11 h-11 flex items-center justify-center hover:bg-bg-subtle rounded-custom text-danger hover:text-danger-active transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 개인정보 동의 + 등록 — 풀-블리드 푸터 */}
              <div className="-mx-6 md:-mx-8 -mb-6 md:-mb-8 mt-1 px-6 md:px-8 py-5 bg-bg-subtle border-t-2 border-border flex flex-col gap-4">
                <label htmlFor="agreePrivacy" style={{ touchAction: 'manipulation' }} className="flex items-start gap-3 select-none cursor-pointer">
                  <input
                    id="agreePrivacy"
                    name="agreePrivacy"
                    type="checkbox"
                    checked={formData.agreePrivacy}
                    onChange={handleChange}
                    style={{ touchAction: 'manipulation' }}
                    className="w-5 h-5 text-steel border-border focus:ring-steel shrink-0 mt-0.5 cursor-pointer"
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[14.5px] font-black text-navy">개인정보 수집 및 이용 동의 (필수)</span>
                    <span className="text-[13px] text-gray leading-normal">
                      ZEROS 예상견적 서비스 제공 및 연락을 위한 성함·연락처·이메일 저장을 승인합니다.
                    </span>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading || uploading}
                  style={{ touchAction: 'manipulation' }}
                  className="flex items-center justify-center gap-2 bg-accent hover:bg-[#c95f12] text-white py-3.5 min-h-[44px] rounded-custom text-[17px] font-black shadow-md transition-all select-none active:scale-[0.99] motion-reduce:active:scale-100 disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  {loading ? (
                    <span>등록 중...</span>
                  ) : (
                    <>
                      {channel === 'visit' ? '출장요청·예약 접수하기' : '무료 견적 신청하기'}
                      <Send className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </form>
      )}
    </div>
  );
};
