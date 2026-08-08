'use client';

import React from 'react';
import { User, Phone, ShieldCheck, MessageSquare, CheckCircle2 } from 'lucide-react';
import { useOtpVerify, OtpVerified } from '@/lib/otp/useOtpVerify';

interface PhoneVerifyGateProps {
  onVerified: (data: OtpVerified) => void;
  // 앞 단계에서 이미 받은 성함·연락처. 같은 값을 두 번 입력하지 않도록 초기값으로 채운다.
  initialName?: string;
  initialPhone?: string;
}

export const PhoneVerifyGate: React.FC<PhoneVerifyGateProps> = ({ onVerified, initialName = '', initialPhone = '' }) => {
  // 접수 게이트만 성함을 함께 받는다. 인증 왕복 자체는 로그인 두 화면과 같은 기계를 쓴다.
  const otp = useOtpVerify({ onVerified, requireName: true, initialName, initialPhone });

  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto py-2">
      {/* 안내 */}
      <div className="bg-bg-subtle p-4 rounded-custom border border-border/80 flex flex-col gap-1.5">
        <span className="text-[12px] font-bold text-navy leading-none flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-steel" />
          본인확인 후 다음 단계로 진행합니다
        </span>
        <span className="text-[12px] text-gray leading-relaxed mt-0.5">
          장난·테스트 접수를 막기 위해 휴대폰 인증을 진행합니다. 아래 번호로 인증번호 문자를 보내드립니다.
        </span>
      </div>

      {/* 성함 */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-bold text-navy flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-gray" /> 성함
        </span>
        <input
          value={otp.name}
          onChange={(e) => otp.changeName(e.target.value)}
          disabled={otp.phase === 'code'}
          placeholder="성함을 입력하세요"
          className="w-full bg-bg border border-border rounded-custom px-3.5 py-2.5 text-[14px] font-medium text-navy outline-none focus:ring-2 focus:ring-steel/40 disabled:bg-bg-subtle disabled:text-gray"
        />
      </label>

      {/* 휴대폰 번호 */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-bold text-navy flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-gray" /> 휴대폰 번호
        </span>
        <div className="flex gap-2">
          <input
            value={otp.phone}
            onChange={(e) => otp.changePhone(e.target.value)}
            disabled={otp.phase === 'code'}
            inputMode="numeric"
            placeholder="010-0000-0000"
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
        <div className="flex flex-col gap-3 border-t border-border/70 pt-3">
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
                className="flex-1 bg-bg border border-border rounded-custom px-3.5 py-2.5 text-[14px] font-bold tracking-widest text-navy outline-none focus:ring-2 focus:ring-steel/40"
              />
              <button
                type="button"
                onClick={otp.verifyCode}
                disabled={otp.loading}
                className="shrink-0 bg-accent hover:bg-navy text-bg px-5 py-2.5 rounded-custom text-[12px] font-black transition-all active:scale-95 disabled:opacity-50"
              >
                {otp.loading ? '확인 중...' : '확인'}
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
        <div role="alert" aria-live="assertive" className="bg-danger/5 border border-danger/20 rounded-custom px-3 py-2 text-[12px] font-bold text-danger flex items-center gap-1.5">
          {otp.error}
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[12px] text-gray font-medium">
        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
        입력하신 번호는 본인확인 용도로만 사용되며, 안전하게 보호됩니다.
      </div>
    </div>
  );
};
