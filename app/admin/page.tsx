'use client';

import { useEffect } from 'react';

// ==========================================
// /admin — 관리자 전용 비밀 진입 경로
// ==========================================
// 고객 화면에는 노출되지 않으며, 이 주소로 접속하면 관리자 모드로 전환된다.
// 인증(비밀번호)은 메인 화면의 AdminLogin 잠금 화면에서 처리된다.
export default function AdminEntry() {
  useEffect(() => {
    // 전체 페이지 이동으로 ?mode=admin 쿼리를 확실히 전달한다.
    window.location.replace('/?mode=admin');
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy text-bg select-none">
      <span className="text-[13px] font-bold tracking-wide animate-pulse">관리자 페이지로 이동 중...</span>
    </div>
  );
}
