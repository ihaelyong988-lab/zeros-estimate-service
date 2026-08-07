'use client';

import React from 'react';
import { Phone, MessageSquare, CheckCircle2 } from 'lucide-react';
import { SMS_PENDING_NOTICE } from '@/lib/forms/requestForm';
import { OtpVerifyState } from './useOtpVerify';

// ==========================================
// 접수현황 로그인 폼 (오버레이 · 마이페이지 탭 공용)
// ==========================================
// CustomerLoginModal 과 MyRequestsView 의 인증 폼은 마크업이 완전히 같았고, 아래 VARIANT
// 두 값만 달랐다(2026-08-08 대조). 클래스 문자열을 두 벌로 유지하면 한쪽만 손보는 순간
// 같은 인증 폼이 화면마다 다르게 보인다.

const CODE_STEP_BASE = 'flex flex-col gap-3 border-t border-border/70 pt-3';
const NOTE_BASE = 'flex items-center gap-1.5 text-[12px] text-gray font-medium';

// 두 화면의 유일한 차이. 값이 통합 이전과 한 글자라도 달라지면 test/otp/customerOtpLoginForm.test.ts 가 막는다.
export const OTP_FORM_VARIANT = {
  // 오버레이: 모달 자체가 zoom-in 하므로 단계 전환에 애니메이션을 얹지 않는다.
  modal: { codeStep: CODE_STEP_BASE, note: NOTE_BASE },
  // 탭 화면: 코드 단계가 위에서 밀려 들어오고, 안내문 앞에 4px 을 더 둔다.
  page: {
    codeStep: `${CODE_STEP_BASE} animate-in slide-in-from-top-2 duration-200`,
    note: `${NOTE_BASE} mt-1`,
  },
} as const;

interface CustomerOtpLoginFormProps {
  otp: OtpVerifyState;
  variant: keyof typeof OTP_FORM_VARIANT;
  /** 오버레이는 열릴 때 이 입력으로 포커스를 옮긴다(useModalDialog). */
  phoneInputRef?: React.Ref<HTMLInputElement>;
}

export const CustomerOtpLoginForm: React.FC<CustomerOtpLoginFormProps> = ({ otp, variant, phoneInputRef }) => (
  <>
    {/* 휴대폰 번호 */}
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-bold text-navy flex items-center gap-1.5">
        <Phone className="w-3.5 h-3.5 text-gray" /> 휴대폰 번호
      </span>
      <div className="flex gap-2">
        <input
          ref={phoneInputRef}
          value={otp.phone}
          onChange={(e) => otp.changePhone(e.target.value)}
          disabled={otp.phase === 'code'}
          inputMode="numeric"
          placeholder="010-0000-0000"
          onKeyDown={(e) => { if (e.key === 'Enter' && otp.phase === 'input') otp.requestCode(); }}
          className="flex-1 bg-bg border border-border rounded-custom px-3.5 py-2.5 text-[14px] font-medium text-navy outline-none focus:ring-2 focus:ring-steel/40 disabled:bg-bg-subtle disabled:text-gray"
        />
        {otp.phase === 'input' && (
          <button
            type="button"
            onClick={otp.requestCode}
            disabled={otp.loading}
            className="shrink-0 bg-steel hover:bg-navy text-bg px-4 py-2.5 rounded-custom text-[12px] font-black transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
          >
            {otp.loading ? '발송 중...' : '인증번호 전송'}
          </button>
        )}
      </div>
    </label>

    {/* 인증번호 입력 단계 */}
    {otp.phase === 'code' && (
      <div className={OTP_FORM_VARIANT[variant].codeStep}>
        {otp.smsPending && (
          <div className="bg-accent/10 border border-accent/30 rounded-custom px-3 py-2 text-[12px] text-accent font-bold leading-relaxed">
            {SMS_PENDING_NOTICE}
          </div>
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold text-navy flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-gray" /> 인증번호 6자리
          </span>
          <div className="flex gap-2">
            <input
              value={otp.code}
              onChange={(e) => otp.changeCode(e.target.value)}
              inputMode="numeric"
              autoFocus
              placeholder="문자로 받은 6자리"
              onKeyDown={(e) => { if (e.key === 'Enter') otp.verifyCode(); }}
              className="flex-1 bg-bg border border-border rounded-custom px-3.5 py-2.5 text-[14px] font-bold tracking-widest text-navy outline-none focus:ring-2 focus:ring-steel/40"
            />
            <button
              type="button"
              onClick={otp.verifyCode}
              disabled={otp.loading}
              className="shrink-0 bg-accent hover:bg-navy text-bg px-5 py-2.5 rounded-custom text-[12px] font-black transition-all active:scale-95 disabled:opacity-50"
            >
              {otp.loading ? '확인 중...' : '로그인'}
            </button>
          </div>
        </label>
        <button
          type="button"
          onClick={otp.backToInput}
          className="text-[12px] font-bold text-gray hover:text-navy transition-colors self-start"
        >
          번호 다시 입력하기
        </button>
      </div>
    )}

    {otp.error && (
      <div role="alert" aria-live="assertive" className="bg-danger/5 border border-danger/20 rounded-custom px-3 py-2 text-[12px] font-bold text-danger">
        {otp.error}
      </div>
    )}

    <div className={OTP_FORM_VARIANT[variant].note}>
      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
      입력하신 번호는 본인확인 용도로만 사용되며 안전하게 보호됩니다.
    </div>
  </>
);
