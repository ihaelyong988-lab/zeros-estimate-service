import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ==========================================
// Supabase 서버 전용 클라이언트 (service_role)
// ==========================================
// RLS를 우회하는 secret 키다. 절대 브라우저(NEXT_PUBLIC_*)로 노출하지 않는다.
// 서버 라우트(app/api/**)에서만 import 되어야 한다.
// 키(SUPABASE_SERVICE_ROLE_KEY)는 .env.local + Vercel 환경변수에만 둔다.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xtljznrfmythnnpeorgz.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

export const hasServiceKey = !!SERVICE_KEY;

// service_role 클라이언트를 반환한다. 키가 없으면 null(호출부에서 503 처리).
export function getServiceClient(): SupabaseClient | null {
  if (!SERVICE_KEY) return null;
  return createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}
