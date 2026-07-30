'use client';

// global-error는 루트 레이아웃을 대체하므로 전역 스타일을 직접 불러온다.
import './globals.css';
import { useEffect } from 'react';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  /** 자식만 다시 렌더한다. 재요청이 필요하면 unstable_retry를 쓴다. */
  reset: () => void;
  /** Next 16.2 권장 복구 경로 — 재요청 후 재렌더. */
  unstable_retry: () => void;
};

export default function GlobalError({ error, unstable_retry }: GlobalErrorProps) {
  useEffect(() => {
    // 내부 메시지는 화면에 노출하지 않고 브라우저 진단 로그로만 남긴다.
    console.error(error);
  }, [error]);

  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-bg-subtle text-text">
        <title>ZEROS</title>
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div role="alert" className="w-full max-w-md">
            <h1 className="text-[22px] font-bold leading-snug text-navy">
              화면을 불러오지 못했습니다.
            </h1>
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-custom bg-accent px-6 text-base font-semibold text-white transition-opacity hover:opacity-90 motion-reduce:transition-none"
            >
              다시 시도
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
