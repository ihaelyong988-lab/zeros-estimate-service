'use client';

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ==========================================
// Supabase 브라우저 클라이언트 (싱글톤)
// ==========================================
// 환경 변수(NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)가 유효할 때만 실제 클라이언트를 생성한다.
// 키가 없거나 샘플 placeholder이면 null 을 반환하고, 앱은 localStorage Mock 폴백으로 동작한다.

// 공개 클라이언트 설정 (브라우저에 노출되어도 안전한 값)
// - URL: 공개 프로젝트 주소
// - ANON: 'publishable' 키 — Supabase가 공개 공유를 허용한 키. 실제 데이터 보호는 RLS 정책이 담당.
// - 비밀(service_role/secret) 키는 이 파일에 절대 두지 않는다.
// env 변수가 있으면 우선 사용하고, 없으면 아래 기본값으로 동작하여 별도 설정 없이 배포가 가능하다.
const DEFAULT_SUPABASE_URL = 'https://xtljznrfmythnnpeorgz.supabase.co';
const DEFAULT_SUPABASE_ANON = 'sb_publishable_6fFO_FzrvQNiXr-PXH6Oow_Qldh9ge9';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON;

// placeholder(샘플) 값인지 검사 — 실제 키가 아니면 비활성으로 간주
const isPlaceholder =
  !url ||
  !anonKey ||
  url.includes('your-project-id') ||
  anonKey.startsWith('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

export const isSupabaseEnabled = !isPlaceholder;

// 업로드 버킷 이름 (Supabase Storage에 동일 이름으로 생성되어 있어야 함)
export const STORAGE_BUCKET = 'estimate-files';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseEnabled) return null;
  if (_client) return _client;
  _client = createClient(url as string, anonKey as string, {
    auth: { persistSession: false },
  });
  return _client;
}
