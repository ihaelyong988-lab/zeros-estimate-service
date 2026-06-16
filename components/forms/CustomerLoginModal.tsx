'use client';

import React, { useState } from 'react';
import { X, Phone, ShieldCheck, MessageSquare, LogIn, CheckCircle2 } from 'lucide-react';
import { useShell } from '@/lib/context/ShellContext';

// 휴대폰 번호를 010-0000-0000 형태로 표시 포맷팅
function formatPhone(v: string): string {
  const d = v.replace(/[^0-9]/g, '').slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

// 메인화면 "로그인" — 휴대폰 문자 인증으로 본인을 등록하고,
// 인증 성공 시 접수현황(시계열) 열람 권한을 부여한다. (기존 OTP API 재사용)
export const CustomerLoginModal: React.FC = () => {
  const { showLogin, setShowLogin, setCustomerAuth, setShowMyRequests } = useShell();

  const [name] = useState('');
  const [phone, setPhone] = useState('');
  const [phase, setPhase] = useState<'input' | 'code'>('input');
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [testCode, setTestCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = phone.replace(/[^0-9]/g, '');
  const phoneValid = /^01[0-9]{8,9}$/.test(digits);

  const reset = () => {
    setPhone(''); setPhase('input'); setToken('');
    setCode(''); setTestCode(null); setLoading(false); setError(null);
  };

  const close = () => { setShowLogin(false); reset(); };

  const requestCode = async () => {
    setError(null);
    if (!phoneValid) { setError('휴대폰 번호를 010-0000-0000 형식으로 입력해 주세요.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '인증번호 발송에 실패했습니다.');
      setToken(data.token);
      setTestCode(data.devCode || null);
      setPhase('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : '인증번호 발송 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError(null);
    if (code.replace(/[^0-9]/g, '').length < 6) { setError('인증번호 6자리를 입력해 주세요.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, code, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '인증에 실패했습니다.');
      setCustomerAuth({
        name: name.trim(),
        phone: formatPhone(digits),
        verifiedAt: new Date().toISOString(),
      });
      reset();
      setShowLogin(false);
      setShowMyRequests(true); // 로그인 직후 본인 접수현황(시계열)을 바로 연다
    } catch (e) {
      setError(e instanceof Error ? e.message : '인증 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!showLogin) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={close} />

      <div className="relative z-10 w-full max-w-[420px] bg-bg border border-border rounded-[20px] shadow-custom-xl flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* 상단 헤더 — 브랜드 네이비 */}
        <div className="bg-[#04204C] text-white px-5 py-4 flex items-center justify-between select-none">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-custom bg-accent/90 flex items-center justify-center shrink-0">
              <LogIn className="w-4 h-4 text-white" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-black tracking-tight">접수현황 로그인 / 등록</span>
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


          {/* 휴대폰 번호 */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-navy flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-gray" /> 휴대폰 번호
            </span>
            <div className="flex gap-2">
              <input
                value={phone}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(null); }}
                disabled={phase === 'code'}
                inputMode="numeric"
                placeholder="010-0000-0000"
                onKeyDown={(e) => { if (e.key === 'Enter' && phase === 'input') requestCode(); }}
                className="flex-1 bg-bg border border-border rounded-custom px-3.5 py-2.5 text-[14px] font-medium text-navy outline-none focus:ring-2 focus:ring-steel/40 disabled:bg-bg-subtle disabled:text-gray"
              />
              {phase === 'input' && (
                <button
                  type="button"
                  onClick={requestCode}
                  disabled={loading}
                  className="shrink-0 bg-steel hover:bg-navy text-bg px-4 py-2.5 rounded-custom text-[12px] font-black transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
                >
                  {loading ? '발송 중...' : '인증번호 전송'}
                </button>
              )}
            </div>
          </label>

          {/* 인증번호 입력 단계 */}
          {phase === 'code' && (
            <div className="flex flex-col gap-3 border-t border-border/70 pt-3">
              {testCode && (
                <div className="bg-accent/10 border border-accent/30 rounded-custom px-3 py-2 text-[12px] text-accent font-bold leading-relaxed">
                  ⚙️ 테스트 모드 (문자발송 미설정): 인증번호는 <span className="font-black">{testCode}</span> 입니다.
                </div>
              )}
              <label className="flex flex-col gap-1.5">
                <span className="text-[12px] font-bold text-navy flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-gray" /> 인증번호 6자리
                </span>
                <div className="flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => { setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6)); setError(null); }}
                    inputMode="numeric"
                    autoFocus
                    placeholder="문자로 받은 6자리"
                    onKeyDown={(e) => { if (e.key === 'Enter') verifyCode(); }}
                    className="flex-1 bg-bg border border-border rounded-custom px-3.5 py-2.5 text-[14px] font-bold tracking-widest text-navy outline-none focus:ring-2 focus:ring-steel/40"
                  />
                  <button
                    type="button"
                    onClick={verifyCode}
                    disabled={loading}
                    className="shrink-0 bg-accent hover:bg-navy text-bg px-5 py-2.5 rounded-custom text-[12px] font-black transition-all active:scale-95 disabled:opacity-50"
                  >
                    {loading ? '확인 중...' : '로그인'}
                  </button>
                </div>
              </label>
              <button
                type="button"
                onClick={() => { setPhase('input'); setCode(''); setTestCode(null); setError(null); }}
                className="text-[12px] font-bold text-gray-light hover:text-navy transition-colors self-start"
              >
                번호 다시 입력하기
              </button>
            </div>
          )}

          {error && (
            <div className="bg-danger/5 border border-danger/20 rounded-custom px-3 py-2 text-[12px] font-bold text-danger">
              {error}
            </div>
          )}

          <div className="flex items-center gap-1.5 text-[12px] text-gray-light font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
            입력하신 번호는 본인확인 용도로만 사용되며 안전하게 보호됩니다.
          </div>
        </div>
      </div>
    </div>
  );
};
