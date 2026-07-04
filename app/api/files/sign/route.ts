import type { NextRequest } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { checkAdminSession, checkSession } from '@/lib/otp/token';
import type { Estimate } from '@/types/estimate';

// POST /api/files/sign  { ref, adminToken? , phone?, sessionToken? }
// 비공개 버킷(estimate-files) 파일의 임시 서명 URL(10분)을 발급한다.
// - 관리자 토큰: 모든 파일 열람 가능
// - 고객 세션 토큰: 본인 휴대폰 번호로 접수된 견적 건의 첨부/견적서만 열람 가능
// - 그 외(아무나): 전부 거부
// 서명에는 서버 전용 service_role(secret) 키가 필요 — .env.local + Vercel의
// SUPABASE_SERVICE_ROLE_KEY 에 등록한다(절대 NEXT_PUBLIC 아님).

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xtljznrfmythnnpeorgz.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const BUCKET = 'estimate-files';
const SIGN_TTL_SEC = 600; // 10분

// ref(저장 경로 또는 과거 공개 URL) → Storage 경로로 정규화
function refToPath(ref: string): string | null {
  if (!ref || typeof ref !== 'string') return null;
  if (!/^https?:\/\//i.test(ref)) return ref.replace(/^\/+/, '');
  const marker = `/object/public/${BUCKET}/`;
  const i = ref.indexOf(marker);
  if (i === -1) return null;
  try {
    return decodeURIComponent(ref.slice(i + marker.length).split('?')[0]);
  } catch {
    return null;
  }
}

// 해당 고객(전화번호)의 견적 건에 속한 파일인지 검사
async function customerOwnsPath(
  supabase: SupabaseClient,
  phoneDigits: string,
  path: string
): Promise<boolean> {
  const { data, error } = await supabase.from('zeros_estimates').select('data');
  if (error || !data) return false;

  for (const row of data as { data: Estimate }[]) {
    const est = row.data;
    if ((est.phone || '').replace(/\D/g, '') !== phoneDigits) continue;

    const refs: string[] = [];
    if (est.estimate_pdf_url) refs.push(est.estimate_pdf_url);
    for (const f of est.submitted_files || []) {
      if (f.file_path) refs.push(f.file_path);
      if (f.file_url) refs.push(f.file_url);
    }
    if (refs.some(r => refToPath(r) === path)) return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  let body: { ref?: string; adminToken?: string; phone?: string; sessionToken?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const path = refToPath(body.ref || '');
  if (!path) {
    return Response.json({ error: '파일 경로가 올바르지 않습니다.' }, { status: 400 });
  }

  if (!SERVICE_KEY) {
    return Response.json(
      { error: '서버에 파일 서명 키(SUPABASE_SERVICE_ROLE_KEY)가 설정되지 않았습니다. 관리자에게 문의해 주세요.' },
      { status: 503 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // 1) 관리자 — 전체 파일 허용
  const isAdmin = !!body.adminToken && checkAdminSession(body.adminToken);

  // 2) 고객 — 본인 건에 속한 파일만 허용
  let isOwner = false;
  if (!isAdmin && body.sessionToken && body.phone) {
    const digits = body.phone.replace(/\D/g, '');
    if (checkSession(body.sessionToken, digits)) {
      isOwner = await customerOwnsPath(supabase, digits, path);
    }
  }

  if (!isAdmin && !isOwner) {
    return Response.json(
      { error: '열람 권한이 없습니다. 관리자 로그인 또는 본인 인증 후 이용해 주세요.' },
      { status: 403 }
    );
  }

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGN_TTL_SEC);
  if (error || !data?.signedUrl) {
    return Response.json(
      { error: `파일 링크 생성에 실패했습니다: ${error?.message || '알 수 없는 오류'}` },
      { status: 500 }
    );
  }

  return Response.json({ url: data.signedUrl });
}
