'use client';

import React, { useState } from 'react';
import { useShell } from '@/lib/context/ShellContext';
import { ShieldCheck, Lock, ArrowLeft } from 'lucide-react';

// ==========================================
// 관리자 비밀번호 잠금 화면
// ==========================================
// 비밀번호를 바꾸려면 아래 ADMIN_PASSWORD 값만 수정하면 된다.
const ADMIN_PASSWORD = 'zeros1234!';

export const AdminLogin: React.FC = () => {
  const { setAdminAuthed, setIsUserMode } = useShell();
  const [pw, setPw] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      setError(null);
      setAdminAuthed(true);
    } else {
      setError('비밀번호가 올바르지 않습니다.');
      setPw('');
    }
  };

  const goToCustomerSite = () => {
    setIsUserMode(true);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy text-bg px-5 select-none">
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* 로고 */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 bg-accent rounded-custom flex items-center justify-center shadow-lg shadow-accent/20">
            <ShieldCheck className="w-7 h-7 text-bg" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="font-black text-[20px] tracking-widest uppercase">ZEROS</span>
            <span className="text-[12px] text-bg/60 font-bold tracking-wide">관리자 전용 페이지</span>
          </div>
        </div>

        {/* 비밀번호 폼 */}
        <form onSubmit={handleSubmit} className="bg-bg/5 border border-bg/15 rounded-custom p-6 flex flex-col gap-4 backdrop-blur-sm">
          <label className="flex flex-col gap-2">
            <span className="text-[12px] font-black text-bg/80 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              비밀번호
            </span>
            <input
              type="password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setError(null); }}
              autoFocus
              placeholder="비밀번호를 입력하세요"
              className="w-full bg-bg text-navy font-bold text-[14px] px-4 py-3 rounded-custom border border-bg/20 outline-none focus:ring-2 focus:ring-accent placeholder:text-gray-light/70"
            />
          </label>

          {error && (
            <span className="text-[12px] font-bold text-red-300">{error}</span>
          )}

          <button
            type="submit"
            className="w-full bg-accent hover:bg-bg hover:text-navy text-bg font-black text-[13px] py-3 rounded-custom transition-all active:scale-[0.98]"
          >
            관리자 로그인
          </button>
        </form>

        {/* 고객 사이트로 돌아가기 */}
        <button
          onClick={goToCustomerSite}
          className="flex items-center justify-center gap-1.5 text-[12px] font-bold text-bg/55 hover:text-bg transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          고객 사이트로 돌아가기
        </button>
      </div>
    </div>
  );
};
