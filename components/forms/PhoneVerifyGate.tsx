'use client';

import React, { useState } from 'react';
import { User, Phone, ShieldCheck, MessageSquare, CheckCircle2 } from 'lucide-react';

interface PhoneVerifyGateProps {
  onVerified: (data: { name: string; phone: string; verifiedToken: string; sessionToken: string }) => void;
}

// 휴대폰 번호를 010-0000-0000 형태로 표시 포맷팅
function formatPhone(v: string): string {
  const d = v.replace(/[^0-9]/g, '').slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export const PhoneVerifyGate: React.FC<PhoneVerifyGateProps> = ({ onVerified }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phase, setPhase] = useState<'input' | 'code'>('input');
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [testCode, setTestCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = phone.replace(/[^0-9]/g, '');
  const phoneValid = /^01[0-9]{8,9}$/.test(digits);

  const requestCode = async () => {
    setError(null);
    if (!name.trim()) { setError('성함을 입력해 주세요.'); return; }
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
      onVerified({ name: name.trim(), phone: formatPhone(digits), verifiedToken: data.verifiedToken, sessionToken: data.sessionToken });
    } catch (e) {
      setError(e instanceof Error ? e.message : '인증 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto py-2">
      {/* 안내 */}
      <div className="bg-bg-subtle p-4 rounded-custom border border-border/80 flex flex-col gap-1.5">
        <span className="text-[12px] font-bold text-navy leading-none flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-steel" />
          본인확인 후 견적 의뢰가 가능합니다
        </span>
        <span className="text-[12px] text-gray leading-relaxed mt-0.5">
          장난·테스트 접수를 막기 위해 휴대폰 인증을 진행합니다. 성함과 휴대폰 번호를 입력하시면 인증번호 문자를 보내드립니다.
        </span>
      </div>

      {/* 성함 */}
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-bold text-navy flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-gray" /> 성함
        </span>
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setError(null); }}
          disabled={phase === 'code'}
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
            value={phone}
            onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(null); }}
            disabled={phase === 'code'}
            inputMode="numeric"
            placeholder="010-0000-0000"
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
              실제 문자 발송은 SMS 업체 연동 후 작동합니다.
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
                className="flex-1 bg-bg border border-border rounded-custom px-3.5 py-2.5 text-[14px] font-bold tracking-widest text-navy outline-none focus:ring-2 focus:ring-steel/40"
              />
              <button
                type="button"
                onClick={verifyCode}
                disabled={loading}
                className="shrink-0 bg-accent hover:bg-navy text-bg px-5 py-2.5 rounded-custom text-[12px] font-black transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? '확인 중...' : '확인'}
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
        <div className="bg-danger/5 border border-danger/20 rounded-custom px-3 py-2 text-[12px] font-bold text-danger flex items-center gap-1.5">
          {error}
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[12px] text-gray-light font-medium">
        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
        입력하신 번호는 본인확인 용도로만 사용되며, 안전하게 보호됩니다.
      </div>
    </div>
  );
};
