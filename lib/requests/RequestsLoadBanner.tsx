'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { RequestsLoadError } from '@/lib/requests/loadOutcome';

// 조회 실패 — 0건 안내와 절대 합치지 않는다. 실패 사유와 복구 경로를 함께 준다.
// MyRequestsView(탭)와 MyRequestsModal(오버레이)이 바이트 동일한 마크업을 각자 들고 있었다.
// error 가 없으면 아무것도 그리지 않는다 — 호출부가 `{loadError && (…)}` 로 감싸면
// 게이트 R1(파일 단위로 role="alert" 를 찾는다)이 배너를 넘긴 파일을 위반으로 잡는다.
export const RequestsLoadBanner: React.FC<{
  error?: RequestsLoadError | null;
  onRetry: () => void;
  onReauth: () => void;
}> = ({ error, onRetry, onReauth }) => {
  if (!error) return null;

  return (
    <div role="alert" aria-live="assertive" className="bg-danger/5 border border-danger/20 rounded-custom px-3 py-2.5 flex flex-col gap-2">
      <span className="text-[12.5px] font-bold text-danger leading-snug flex items-start gap-1.5">
        <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
        {error.message}
      </span>
      <button
        type="button"
        onClick={error.authRequired ? onReauth : onRetry}
        style={{ touchAction: 'manipulation' }}
        className="min-h-11 w-full inline-flex items-center justify-center rounded-custom border border-danger/30 bg-bg text-danger text-[12.5px] font-black transition-colors hover:bg-danger/10 cursor-pointer focus-visible:outline-2 focus-visible:outline-danger"
      >
        {error.authRequired ? '다시 인증하기' : '다시 시도'}
      </button>
    </div>
  );
};
