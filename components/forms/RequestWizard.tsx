'use client';

import React, { useState } from 'react';
import { ZerosService } from '@/lib/supabase/client';
import { Estimate, WorkType, SiteType, ExpectedBudgetRange, EstimateCategory } from '@/types/estimate';
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
  files: [] as { name: string; type: string; category: string }[],
  agreePrivacy: false,
  agreeEstimate: false,
  agreeVisitFee: false,
  agreeAdditionalDoc: false
};

type RequestFormData = typeof defaultFormData;

export const RequestWizard: React.FC<RequestWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    const updated = { ...formData, [name]: val };
    setFormData(updated);
    
    // 임시저장
    localStorage.setItem('zeros_draft_request', JSON.stringify(updated));
  };

  // 모의 파일 업로드 핸들러
  const handleMockUpload = (category: string) => {
    const fileNames = {
      '도면': ['Layout_Piping_v1.pdf', 'PND_BoilerRoom.dwg', 'FlowSheet_Concept.pdf'],
      '사진': ['Equipment_Leak_01.jpg', 'Valve_Header_Status.png', 'Ceiling_Truss.jpg'],
      '기타': ['Sizing_Report.xlsx', 'Previous_Quote.pdf']
    }[category] || ['Attachment_File.pdf'];

    const randomName = fileNames[Math.floor(Math.random() * fileNames.length)];
    const mockFile = {
      name: randomName,
      type: randomName.endsWith('.jpg') || randomName.endsWith('.png') ? 'image/jpeg' : 'application/pdf',
      category: category
    };

    setFormData(prev => {
      const updated = { ...prev, files: [...prev.files, mockFile] };
      localStorage.setItem('zeros_draft_request', JSON.stringify(updated));
      return updated;
    });
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
      // 010-0000-0000 패턴 정밀 체크 - §3.6
      const phoneRegex = /^01[0-9]-\d{3,4}-\d{4}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        return failValidation('연락처는 010-0000-0000 형식으로 입력해 주세요.');
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

      // 2. 제출용 파일 데이터 매핑
      const mappedFiles = formData.files.map((f, i) => ({
        id: `file-gen-${i}-${Math.random().toString(36).substr(2, 9)}`,
        estimate_id: '',
        file_name: f.name,
        file_type: f.type,
        file_url: `/mock-uploads/${f.name}`,
        file_category: f.category,
        uploaded_at: new Date().toISOString()
      }));

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

  return (
    <div className="w-full bg-bg border border-border rounded-custom shadow-custom-md max-w-xl mx-auto overflow-hidden">
      
      {/* 5단계 헤더 바 */}
      <div className="bg-bg-subtle border-b border-border px-5 py-4 flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-steel font-extrabold uppercase tracking-wider">예상견적 요청 폼</span>
          <h3 className="text-sm font-black text-navy leading-none">Step {step} / 5 단계</h3>
        </div>
        <span className="text-xs font-bold text-gray-light">{Math.round(progressPercent)}% 완료</span>
      </div>

      {/* 실시간 진행 표시줄 */}
      <div className="w-full h-1 bg-border/40 relative">
        <div 
          className="h-full bg-steel transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 단계별 입력 폼 */}
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
        
        {/* 에러 피드백 */}
        {errorMsg && (
          <div className="bg-danger/10 border border-danger/25 text-danger px-4 py-3 rounded-custom text-xs font-bold flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ================= STEP 1: 고객 정보 ================= */}
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="flex flex-col gap-1">
              <label htmlFor="customer_name" className="text-xs font-bold text-navy flex items-center gap-1">
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
                className="w-full border border-border p-2.5 rounded-custom text-sm focus:outline-none focus:border-steel transition-all"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="company_name" className="text-xs font-bold text-navy flex items-center gap-1">
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
                className="w-full border border-border p-2.5 rounded-custom text-sm focus:outline-none focus:border-steel transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="phone" className="text-xs font-bold text-navy flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-steel" />
                  연락처 (필수)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  style={{ touchAction: 'manipulation' }}
                  placeholder="010-0000-0000"
                  className="w-full border border-border p-2.5 rounded-custom text-sm focus:outline-none focus:border-steel transition-all"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-xs font-bold text-navy flex items-center gap-1">
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
                  className="w-full border border-border p-2.5 rounded-custom text-sm focus:outline-none focus:border-steel transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="site_address" className="text-xs font-bold text-navy flex items-center gap-1">
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
                className="w-full border border-border p-2.5 rounded-custom text-sm focus:outline-none focus:border-steel transition-all"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 2: 공사 기본정보 ================= */}
        {step === 2 && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-navy">공사 종류</label>
                <select
                  name="work_type"
                  value={formData.work_type}
                  onChange={handleChange}
                  style={{ touchAction: 'manipulation' }}
                  className="w-full border border-border p-2.5 rounded-custom text-sm focus:outline-none focus:border-steel transition-all"
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
                <label className="text-xs font-bold text-navy">현장 용도 종류</label>
                <select
                  name="site_type"
                  value={formData.site_type}
                  onChange={handleChange}
                  style={{ touchAction: 'manipulation' }}
                  className="w-full border border-border p-2.5 rounded-custom text-sm focus:outline-none focus:border-steel transition-all"
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
                <label className="text-xs font-bold text-navy">예상 공사금액 대역</label>
                <select
                  name="expected_budget_range"
                  value={formData.expected_budget_range}
                  onChange={handleChange}
                  style={{ touchAction: 'manipulation' }}
                  className="w-full border border-border p-2.5 rounded-custom text-sm focus:outline-none focus:border-steel transition-all"
                >
                  <option value="≤1,000만">1,000만 원 이하 (온라인 간편)</option>
                  <option value="1,000만~1억">1,000만 ~ 1억 원 (출장 실측)</option>
                  <option value="≥1억">1억 원 이상 (종합 프로젝트)</option>
                  <option value="모름">잘 모름 / 금액 미정</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="desired_schedule" className="text-xs font-bold text-navy">희망 공사시기</label>
                <input
                  id="desired_schedule"
                  name="desired_schedule"
                  type="text"
                  value={formData.desired_schedule}
                  onChange={handleChange}
                  style={{ touchAction: 'manipulation' }}
                  placeholder="예: 1개월 이내, 2026년 7월 중"
                  className="w-full border border-border p-2.5 rounded-custom text-sm focus:outline-none focus:border-steel transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border border-border/80 p-3 rounded-custom bg-bg-subtle/40">
              <div className="flex flex-col gap-0.5" style={{ touchAction: 'manipulation' }}>
                <span className="text-xs font-bold text-navy">긴급 검토 여부</span>
                <span className="text-[10px] text-gray-light leading-none">영업일 기준 24시간 이내 긴급 피드백 필요 여부</span>
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
              <label htmlFor="description" className="text-xs font-bold text-navy">
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
                className="w-full border border-border p-2.5 rounded-custom text-xs focus:outline-none focus:border-steel leading-relaxed resize-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="request_detail" className="text-xs font-bold text-navy">
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
                className="w-full border border-border p-2.5 rounded-custom text-xs focus:outline-none focus:border-steel leading-relaxed resize-none"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 4: 사진/도면 업로드 ================= */}
        {step === 4 && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-3 duration-200">
            <div className="bg-bg-subtle p-4 rounded-custom border border-border/80 flex flex-col gap-1.5">
              <span className="text-xs font-bold text-navy leading-none">현장 증빙자료 첨부 가이드</span>
              <span className="text-[10.5px] text-gray leading-relaxed mt-0.5">
                도면(P&ID, ISO 스케치, 배치도) 및 현장 사진(연결 헤더, 반입 경로, 협소 동선)을 한 개 이상 첨부하시면, 출장 실측 전 엔지니어가 1차 원가 밴드를 오차율 5% 이내로 고정해 진단 리포트를 송부할 수 있습니다.
              </span>
            </div>

            {/* 업로드 시뮬레이션 버튼 그리드 */}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleMockUpload('도면')}
                style={{ touchAction: 'manipulation' }}
                className="flex flex-col items-center justify-center gap-1.5 p-3.5 border border-dashed border-border bg-bg-subtle hover:bg-border/20 rounded-custom transition-all"
              >
                <Upload className="w-4 h-4 text-steel" />
                <span className="text-[11px] font-bold text-navy">도면 업로드</span>
              </button>
              <button
                type="button"
                onClick={() => handleMockUpload('사진')}
                style={{ touchAction: 'manipulation' }}
                className="flex flex-col items-center justify-center gap-1.5 p-3.5 border border-dashed border-border bg-bg-subtle hover:bg-border/20 rounded-custom transition-all"
              >
                <Upload className="w-4 h-4 text-steel" />
                <span className="text-[11px] font-bold text-navy">사진 업로드</span>
              </button>
              <button
                type="button"
                onClick={() => handleMockUpload('기타')}
                style={{ touchAction: 'manipulation' }}
                className="flex flex-col items-center justify-center gap-1.5 p-3.5 border border-dashed border-border bg-bg-subtle hover:bg-border/20 rounded-custom transition-all"
              >
                <Upload className="w-4 h-4 text-steel" />
                <span className="text-[11px] font-bold text-navy">기타 첨부</span>
              </button>
            </div>

            {/* 첨부된 파일 목록 */}
            {formData.files.length > 0 ? (
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto border border-border rounded-custom p-3 bg-bg-subtle/30">
                <span className="text-[10px] text-gray-light font-bold">첨부된 자료 ({formData.files.length}건)</span>
                {formData.files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-bg border border-border p-2 rounded-custom shadow-sm text-xs font-medium">
                    <div className="flex items-center gap-2 text-gray min-w-0">
                      <span className="bg-steel/15 text-steel px-1.5 py-0.5 rounded-custom text-[9px] font-bold shrink-0">{file.category}</span>
                      <span className="truncate text-navy font-bold text-[11px]">{file.name}</span>
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
              <div className="border border-border border-dashed p-6 text-center rounded-custom text-[11px] text-gray-light font-bold bg-bg-subtle/10">
                *아직 첨부된 파일이 없습니다. (위 버튼을 눌러 모의 첨부해볼 수 있습니다)
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
                <span className="text-xs font-bold text-navy">개인정보 수집 및 이용 동의 (필수)</span>
                <span className="text-[10px] text-gray leading-normal">
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
                <span className="text-xs font-bold text-navy">엔지니어 사전검토 약관 동의 (필수)</span>
                <span className="text-[10px] text-gray leading-normal">
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
                  <span className="text-xs font-bold text-navy">출장견적 및 레이저 실측비용 인지 동의 (필수)</span>
                  <span className="text-[10px] text-gray leading-normal">
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
                <span className="text-xs font-bold text-navy">추가 자료 제출 협조 동의 (필수)</span>
                <span className="text-[10px] text-gray leading-normal">
                  도면의 스펙 미비 또는 현장 분기점 사진 부재 시, 전담 엔지니어가 개별 유선/메일로 보완을 요구할 수 있음에 동의합니다.
                </span>
              </label>
            </div>

            <div className="bg-navy p-3.5 rounded-custom flex items-center gap-2 text-bg text-[10.5px] leading-relaxed font-medium">
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
              className="flex items-center justify-center gap-1.5 bg-bg-subtle hover:bg-border/30 text-navy px-4 py-3 rounded-custom text-xs font-extrabold border border-border transition-all select-none w-24 active:scale-95 disabled:opacity-50"
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
              className="flex-1 flex items-center justify-center gap-1.5 bg-steel hover:bg-navy text-bg py-3 rounded-custom text-xs font-extrabold shadow-sm transition-all select-none active:scale-[0.99]"
            >
              다음 단계
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              style={{ touchAction: 'manipulation' }}
              className="flex-1 flex items-center justify-center gap-1.5 bg-accent hover:bg-accent/90 text-bg py-3 rounded-custom text-xs font-black shadow-md transition-all select-none active:scale-[0.99] disabled:opacity-50"
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
    </div>
  );
};
