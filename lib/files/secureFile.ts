'use client';

// ==========================================
// 보안 파일 열람 헬퍼 (관리자·본인 전용)
// ==========================================
// 비공개 버킷 파일은 /api/files/sign 에서 임시 서명 URL(10분)을 받아 연다.
// - 관리자: 로그인 시 저장된 관리자 토큰으로 전체 파일 열람
// - 고객: OTP 로그인 세션 토큰으로 본인 견적 건 파일만 열람

const ADMIN_TOKEN_KEY = 'zeros_admin_token';

export function saveAdminToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function getAdminToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

export function clearAdminToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export interface SecureFileAuth {
  phone?: string;
  sessionToken?: string;
}

/** 서명 URL을 발급받는다. 권한이 없거나 실패하면 Error를 던진다. */
export async function getSignedFileUrl(ref: string, auth?: SecureFileAuth): Promise<string> {
  const res = await fetch('/api/files/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ref,
      adminToken: getAdminToken() || undefined,
      phone: auth?.phone,
      sessionToken: auth?.sessionToken,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) {
    throw new Error(data.error || '파일 열람 권한 확인에 실패했습니다.');
  }
  return data.url as string;
}

/** 서명 URL을 받아 새 창으로 연다(팝업 차단 대비 앵커 클릭 폴백). */
export async function openSecureFile(ref: string, auth?: SecureFileAuth): Promise<void> {
  const url = await getSignedFileUrl(ref, auth);
  const w = window.open(url, '_blank');
  if (!w) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
