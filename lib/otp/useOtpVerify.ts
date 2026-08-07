'use client';

import { useState } from 'react';
import {
  formatPhone, isPhoneValid, phoneDigits, requestOtpChallenge, submitOtpCode,
} from './verifyClient';

// ==========================================
// 휴대폰 본인인증 상태 기계 (3화면 공용)
// ==========================================
// 번호 입력 → 인증번호 발송 → 6자리 확인 이라는 왕복은 세 화면이 완전히 같고, 성공 후 처리만
// 다르다(접수 다음 단계 · 세션 저장 후 현황 열기 · 세션 저장 후 인라인 폼 정리). 그 차이만
// onVerified 로 주입받고 나머지는 전부 여기서 돈다.

export interface OtpVerified {
  name: string;
  /** 010-0000-0000 형태로 포맷된 번호 */
  phone: string;
  verifiedToken: string;
  sessionToken: string;
}

export interface UseOtpVerifyOptions {
  onVerified: (result: OtpVerified) => void;
  /** 접수 게이트만 성함을 함께 받는다 — 로그인 두 화면은 번호만 묻는다. */
  requireName?: boolean;
  /** 로그인 두 화면은 성공 직후 입력을 비운다(다시 열었을 때 이전 번호가 남지 않게). */
  resetOnVerified?: boolean;
  initialName?: string;
  initialPhone?: string;
}

export interface OtpVerifyState {
  name: string;
  phone: string;
  code: string;
  phase: 'input' | 'code';
  loading: boolean;
  error: string | null;
  smsPending: boolean;
  changeName: (value: string) => void;
  changePhone: (value: string) => void;
  changeCode: (value: string) => void;
  requestCode: () => void;
  verifyCode: () => void;
  backToInput: () => void;
  reset: () => void;
}

export function useOtpVerify({
  onVerified, requireName = false, resetOnVerified = false, initialName = '', initialPhone = '',
}: UseOtpVerifyOptions): OtpVerifyState {
  const [name, setName] = useState(() => initialName.trim());
  const [phone, setPhone] = useState(() => formatPhone(initialPhone));
  const [phase, setPhase] = useState<'input' | 'code'>('input');
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [smsPending, setSmsPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = phoneDigits(phone);

  const reset = () => {
    setPhone(''); setPhase('input'); setToken('');
    setCode(''); setSmsPending(false); setLoading(false); setError(null);
  };

  const requestCode = async () => {
    setError(null);
    if (requireName && !name.trim()) { setError('성함을 입력해 주세요.'); return; }
    if (!isPhoneValid(digits)) { setError('휴대폰 번호를 010-0000-0000 형식으로 입력해 주세요.'); return; }

    setLoading(true);
    try {
      const challenge = await requestOtpChallenge(digits);
      setToken(challenge.token);
      setSmsPending(challenge.smsPending);
      setPhase('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : '인증번호 발송 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError(null);
    if (phoneDigits(code).length < 6) { setError('인증번호 6자리를 입력해 주세요.'); return; }

    setLoading(true);
    try {
      const session = await submitOtpCode({ phone: digits, code, token });
      onVerified({ name: name.trim(), phone: formatPhone(digits), ...session });
      if (resetOnVerified) reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : '인증 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return {
    name, phone, code, phase, loading, error, smsPending,
    changeName: (value) => { setName(value); setError(null); },
    changePhone: (value) => { setPhone(formatPhone(value)); setError(null); },
    changeCode: (value) => { setCode(phoneDigits(value).slice(0, 6)); setError(null); },
    requestCode,
    verifyCode,
    backToInput: () => { setPhase('input'); setCode(''); setSmsPending(false); setError(null); },
    reset,
  };
}
