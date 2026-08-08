'use client';

import React, { useRef } from 'react';
import { X, ShieldCheck, LogIn } from 'lucide-react';
import { useShell } from '@/lib/context/ShellContext';
import { useModalDialog } from '@/lib/a11y/modalDialog';
import { useOtpVerify } from '@/lib/otp/useOtpVerify';
import { CustomerOtpLoginForm } from '@/lib/otp/CustomerOtpLoginForm';

// 메인화면 "로그인" — 휴대폰 문자 인증으로 본인을 등록하고,
// 인증 성공 시 접수현황(시계열) 열람 권한을 부여한다. (기존 OTP API 재사용)
export const CustomerLoginModal: React.FC = () => {
  const { showLogin, setShowLogin, setCustomerAuth, setShowMyRequests } = useShell();

  const dialogRef = useRef<HTMLDivElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const otp = useOtpVerify({
    resetOnVerified: true,
    onVerified: ({ name, phone, sessionToken }) => {
      setCustomerAuth({
        name,
        phone,
        verifiedAt: new Date().toISOString(),
        sessionToken, // 본인 견적서 파일 열람용(서버 재검증)
      });
      setShowLogin(false);
      setShowMyRequests(true); // 로그인 직후 본인 접수현황(시계열)을 바로 연다
    },
  });

  const close = () => { setShowLogin(false); otp.reset(); };

  // 키보드·스크린리더 사용자가 마우스 없이 열고 닫을 수 있어야 한다(ESC·포커스 트랩·복귀).
  useModalDialog({ open: showLogin, onClose: close, containerRef: dialogRef, initialFocusRef: phoneInputRef });

  if (!showLogin) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-login-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/60 backdrop-blur-md animate-in fade-in duration-200 motion-reduce:animate-none"
    >
      <div className="absolute inset-0" onClick={close} />

      <div className="relative z-10 w-full max-w-[420px] bg-bg border border-border rounded-[20px] shadow-custom-xl flex flex-col animate-in zoom-in-95 duration-200 motion-reduce:animate-none overflow-hidden">
        {/* 상단 헤더 — 브랜드 네이비 */}
        <div className="bg-[#04204C] text-white px-5 py-4 flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-custom bg-accent/90 flex items-center justify-center shrink-0">
              <LogIn className="w-4 h-4 text-white" />
            </span>
            <div className="flex flex-col leading-tight">
              <span id="customer-login-title" className="text-[15px] font-black tracking-tight">접수현황 로그인 / 등록</span>
              <span className="text-[11.5px] font-semibold text-white/60">전화번호만으로 3초만에 가입/로그인</span>
            </div>
          </div>
          <button
            onClick={close}
            className="w-8 h-8 inline-flex items-center justify-center rounded-custom text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="닫기"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* 안내 */}
          <div className="bg-bg-subtle border border-border/80 rounded-custom p-3.5 flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-navy flex items-center gap-1.5 leading-none">
              <ShieldCheck className="w-3.5 h-3.5 text-steel" />
              전화번호 하나로 편리하게 시작하기
            </span>
            <span className="text-[12px] text-gray leading-relaxed">
              의뢰 시 사용하신 휴대폰 번호로 인증하시면, 실시간 진행 상황을 시계열로 바로 확인 및 등록하실 수 있습니다.
            </span>
          </div>


          <CustomerOtpLoginForm otp={otp} variant="modal" phoneInputRef={phoneInputRef} />
        </div>
      </div>
    </div>
  );
};
