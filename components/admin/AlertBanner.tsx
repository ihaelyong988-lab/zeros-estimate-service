'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

// 관리자 화면의 실패 안내 배너. 조회·저장·액션 실패를 같은 모양으로 알린다.
// message 가 없으면 아무것도 그리지 않는다 — 호출부가 `{err && (…)}` 로 감싸면
// 게이트 R1(파일 안에 role="alert" 가 있는지를 파일 단위로 본다)이 배너를 넘긴 파일을 위반으로 잡는다.
export const AlertBanner: React.FC<{ message?: string | null }> = ({ message }) => {
  if (message == null) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="bg-danger/5 border border-danger/20 rounded-custom px-4 py-3 flex items-start gap-2"
    >
      <AlertCircle className="w-5 h-5 shrink-0 mt-px text-danger" />
      <span className="text-[13.5px] font-bold text-danger leading-snug">{message}</span>
    </div>
  );
};
