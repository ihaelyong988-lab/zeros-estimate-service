import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/supabase/supabaseServer';
import { checkAdminSession, checkSession, checkVerified } from '@/lib/otp/token';
import { clientIp, rateLimit } from '@/lib/otp/rateLimit';
import { isSmsConfigured } from '@/lib/sms/send';
import { kstDateStr } from '@/lib/utils/date';
import { gradeOf, rollupCustomer } from '@/lib/crm/customerRollup';
import type {
  Estimate,
  Customer,
  SiteVisit,
  NotificationLog,
  FileMeta,
  WorkType,
  SiteType,
  EstimateCategory,
  ExpectedBudgetRange,
} from '@/types/estimate';

// ==========================================
// POST /api/data — 인증 강제 데이터 게이트웨이
// ==========================================
// 브라우저가 anon 키로 테이블을 직접 읽고 쓰던 구조(전 고객 PII 공개 노출)를 대체한다.
// 모든 접근은 service_role 키로 서버에서만 수행하고, 요청자 신원을 서버가 검증한다.
//   - 관리자 토큰   : 전체 테이블 읽기/쓰기
//   - 고객 세션 토큰: 본인 휴대폰 번호의 견적·알림만 읽기
//   - 익명          : 견적은 허용목록(PublicEstimate) 분석용 필드만 읽기(공개 실적 화면), 그 외 차단
//   - 공개 접수     : OTP 인증(verified/session) 토큰 검증 후 서버가 단건 생성
// body: { op, table?, rows?, estimate?, visit?, adminToken?, sessionToken?, verifiedToken?, phone? }

const TABLES = {
  estimates: 'zeros_estimates',
  customers: 'zeros_customers',
  payments: 'zeros_payments',
  siteVisits: 'zeros_site_visits',
  adminUsers: 'zeros_admin_users',
  notificationLogs: 'zeros_notification_logs',
} as const;

const ALLOWED_TABLES: string[] = Object.values(TABLES);

const digitsOf = (v: string | undefined) => (v || '').replace(/\D/g, '');

// DB 오류 원문(제약명·스키마·권한 메시지)은 서버 내부 구조를 그대로 알려주므로 응답에 싣지 않는다.
// 원문은 서버 로그에만 남기고 응답에는 로그와 대조할 짧은 추적 id 만 준다.
function serverFailure(where: string, detail: unknown): Response {
  const ref = Math.random().toString(36).slice(2, 8);
  console.error(`[api/data] ${where} ref=${ref}`, detail);
  return Response.json(
    { error: `데이터 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요. (오류 코드 ${ref})` },
    { status: 500 }
  );
}

// 허용값은 types/estimate.ts 의 유니온과 1:1 이다. Record<유니온, true> 로 선언해 두면
// 유니온이 바뀔 때 tsc 가 이 목록의 누락·오타를 잡는다(허용값을 따로 관리하지 않는다).
const WORK_TYPES: Record<WorkType, true> = {
  '배관공사': true,
  '장비설치': true,
  '배관+장비설치': true,
  'Utility 배관': true,
  '공장증설': true,
  '노후배관교체': true,
  '기계실개선': true,
  '생산설비 배관 연결': true,
  'CAPEX 개·증설 검토': true,
  '기타': true,
};

const SITE_TYPES: Record<SiteType, true> = {
  '공장': true,
  '상가': true,
  '건물': true,
  '식품': true,
  '제약·바이오': true,
  '물류센터': true,
  '기계실': true,
  '기타': true,
};

const ESTIMATE_CATEGORIES: Record<EstimateCategory, true> = {
  small: true,
  medium: true,
  large: true,
  unknown: true,
};

const BUDGET_RANGES: Record<ExpectedBudgetRange, true> = {
  '≤1,000만': true,
  '1,000만~1억': true,
  '≥1억': true,
  '모름': true,
};

const isAllowed = (map: Record<string, true>, v: unknown) =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(map, v);

// 값이 비어 있으면 종전대로 기본값을 쓰고(기존 동작 유지), 값이 있는데 허용목록 밖이면 거부한다.
function firstInvalidField(est: Partial<Estimate>): string | null {
  const checks: [string, unknown, Record<string, true>][] = [
    ['공사 종류', est.work_type, WORK_TYPES],
    ['현장 유형', est.site_type, SITE_TYPES],
    ['견적 구분', est.estimate_category, ESTIMATE_CATEGORIES],
    ['예상 예산', est.expected_budget_range, BUDGET_RANGES],
  ];
  for (const [label, value, allowed] of checks) {
    if (value === undefined || value === null || value === '') continue;
    if (!isAllowed(allowed, value)) return label;
  }
  return null;
}

// 업로드 경로 규약 = lib/supabase/storage.ts 의 uploadEstimateFile 이 만드는 형식.
//   <카테고리 폴더>/<Date.now() 13자리>-<36진 난수>-<정리된 파일명>
// 폴더를 벗어나거나 슬래시를 덧붙인 경로를 막아, 규약 밖 스토리지 객체를 가리키지 못하게 한다.
const UPLOAD_PATH_RE = /^(?:drawings|photos|etc|quotes)\/\d{13}-[a-z0-9]{1,8}-[^/\\]{1,200}$/;

// 레거시 공개 URL(file_url)도 같은 파일을 가리키므로 경로로 환산해 비교한다.
const PUBLIC_URL_MARKER = '/object/public/estimate-files/';

function refToPath(ref: string | undefined): string {
  if (!ref) return '';
  if (!/^https?:\/\//i.test(ref)) return ref.replace(/^\/+/, '');
  const i = ref.indexOf(PUBLIC_URL_MARKER);
  if (i === -1) return '';
  try {
    return decodeURIComponent(ref.slice(i + PUBLIC_URL_MARKER.length).split('?')[0]);
  } catch {
    return '';
  }
}

// 다른 번호의 견적에 이미 등록된 파일 경로. /api/files/sign 은 "그 번호의 견적에 그 경로가
// 실려 있는가"로 소유권을 판정하므로, 이 경로를 새 견적에 실으면 남의 파일 서명 URL이 발급된다.
// 같은 번호의 견적에 이미 있는 경로는 제외한다 — 그 번호는 이미 열람 권한이 있어 열람 범위가
// 넓어지지 않고, 접수 완료 후 '새 등록'으로 같은 첨부를 다시 올리는 정상 경로가 막히기 때문이다.
function pathsOwnedByOthers(estimates: Estimate[], phoneDigits: string): Set<string> {
  const taken = new Set<string>();
  const add = (ref: string | undefined) => {
    const p = refToPath(ref);
    if (p) taken.add(p);
  };
  for (const e of estimates) {
    if (digitsOf(e.phone) === phoneDigits) continue;
    add(e.estimate_pdf_url);
    for (const f of e.submitted_files || []) {
      add(f.file_path);
      add(f.file_url);
    }
  }
  return taken;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const FILE_PATH_INVALID = '첨부파일 경로가 업로드 규약에 맞지 않습니다. 파일을 다시 첨부한 뒤 접수해 주세요.';
const FILE_PATH_TAKEN = '이미 다른 접수 건에 등록된 첨부파일입니다. 파일을 다시 첨부한 뒤 접수해 주세요.';

// 규약 위반 항목을 조용히 버리면 고객은 첨부가 사라진 이유를 알 수 없다 → 전체를 400 으로 거부한다.
function validateSubmittedFiles(
  files: unknown,
  taken: Set<string>
): { files: FileMeta[] } | { error: string } {
  if (files === undefined || files === null) return { files: [] };
  if (!Array.isArray(files)) return { error: FILE_PATH_INVALID };

  const seen = new Set<string>();
  const accepted: FileMeta[] = [];
  for (const raw of files) {
    const meta = (raw || {}) as Partial<FileMeta>;
    const path = typeof meta.file_path === 'string' ? meta.file_path : '';
    if (!UPLOAD_PATH_RE.test(path)) return { error: FILE_PATH_INVALID };
    if (seen.has(path) || taken.has(path)) return { error: FILE_PATH_TAKEN };
    seen.add(path);
    // 클라이언트 객체를 통째로 저장하면 file_path 만 검사한 것이 무의미해진다 —
    // /api/files/sign 의 소유권 판정(customerOwnsPath)은 file_url 도 함께 읽으므로
    // 검사받지 않은 file_url 에 남의 경로를 실어 서명 URL 을 받아낼 수 있다.
    // 따라서 알려진 필드만 재구성하고 file_url 은 빈 값으로 고정한다.
    // (신규 업로드는 lib/supabase/storage.ts 가 이미 '' 를 넣으므로 정상 접수는 무영향.)
    accepted.push({
      id: str(meta.id),
      estimate_id: str(meta.estimate_id),
      file_name: str(meta.file_name),
      file_type: str(meta.file_type),
      file_url: '',
      file_path: path,
      file_category: str(meta.file_category),
      file_size: typeof meta.file_size === 'number' && Number.isFinite(meta.file_size) ? meta.file_size : undefined,
      uploaded_at: str(meta.uploaded_at),
    });
  }
  return { files: accepted };
}

// Postgres unique_violation. 접수번호 유니크 인덱스(zeros_estimates_no_uniq)에 걸린 경우만 번호를 다시 매긴다.
function isDuplicateKey(e: { code?: string; message?: string } | null): boolean {
  if (!e) return false;
  return e.code === '23505' || /duplicate key|23505/i.test(e.message || '');
}

// 오늘자 접수번호. 이미 시도해 본 번호는 건너뛰어 재시도가 같은 번호에서 맴돌지 않게 한다.
function nextEstimateNo(rows: Estimate[], todayStr: string, tried: Set<string>): string {
  const prefix = `ZR-${todayStr}`;
  let seq = rows.filter((e) => (e.estimate_no || '').startsWith(prefix)).length + 1;
  let no = `${prefix}-${String(seq).padStart(3, '0')}`;
  while (tried.has(no)) {
    seq += 1;
    no = `${prefix}-${String(seq).padStart(3, '0')}`;
  }
  return no;
}

const MAX_NO_ATTEMPTS = 5;

// 익명(공개 실적)에게 노출해도 되는 분석용 필드 — 허용목록(allowlist).
// 차단목록(스프레드 후 삭제)은 Estimate에 필드가 추가될 때마다 조용히 누출되므로 쓰지 않는다.
// 목록에 없는 것(견적금액·확정계약금액·품목 단가 line_items·실주사유·담당자·접수번호·
// 결제상태·공사목적·희망일정·정확도등급 및 모든 PII)은 익명 응답에 포함되지 않는다.
// 실사용처 = components/PerformanceInsights.tsx(+ lib/calculations.ts의 totalCount·averageProcessDays):
//   created_at · estimate_sent_at · work_type · site_type · estimate_category · status.
type PublicEstimate = Pick<
  Estimate,
  'id' | 'created_at' | 'work_type' | 'site_type' | 'estimate_category' | 'status' | 'estimate_sent_at'
>;

function stripEstimate(e: Estimate): PublicEstimate {
  return {
    id: e.id,
    created_at: e.created_at,
    work_type: e.work_type,
    site_type: e.site_type,
    estimate_category: e.estimate_category,
    status: e.status,
    estimate_sent_at: e.estimate_sent_at,
  };
}

// 운영자가 손으로만 매길 수 있는 등급 — 자동 산출(gradeOf)로는 나오지 않는 값이다.
// customer_grade_manual 이 비어 있는데 저장된 customer_grade 가 이 목록에 있으면 수동 지정으로 간주한다.
// 백필 SQL 없이 기존 화면 표시를 그대로 보존하기 위한 폴백이다(2026-07-31 결정④).
const MANUAL_ONLY_GRADES: readonly string[] = ['중요고객', '보류고객'];

function manualGradeOf(c: Customer): string | undefined {
  const explicit = (c.customer_grade_manual || '').trim();
  if (explicit) return explicit;
  const legacy = (c.customer_grade || '').trim();
  return MANUAL_ONLY_GRADES.includes(legacy) ? legacy : undefined;
}

// 고객 누적치는 저장 카운터가 아니라 견적 행에서 매번 파생 계산한다.
// 저장된 total_requests·total_won·total_revenue 컬럼은 레거시 호환으로 남겨 두되 표시 근거가 아니다
// (견적을 삭제하거나 계약금액을 정정해도 저장 카운터는 따라오지 않아 장부가 틀어졌다).
function withDerivedRollup(c: Customer, estimates: Estimate[]): Customer {
  const rolled = rollupCustomer(c.phone, estimates);
  const manual = manualGradeOf(c);
  return {
    ...c,
    ...rolled,
    customer_grade: gradeOf(manual, rolled),
    customer_grade_manual: manual,
  };
}

async function loadRows<T>(supabase: SupabaseClient, table: string): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select('data, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => (row as { data: T }).data);
}

export async function POST(req: NextRequest) {
  let body: {
    op?: string;
    table?: string;
    id?: string;
    rows?: { id: string }[];
    estimate?: Partial<Estimate>;
    visit?: Partial<SiteVisit>;
    adminToken?: string;
    sessionToken?: string;
    verifiedToken?: string;
    phone?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return Response.json(
      { error: '서버에 데이터 접근 키(SUPABASE_SERVICE_ROLE_KEY)가 설정되지 않았습니다. 관리자에게 문의해 주세요.' },
      { status: 503 }
    );
  }

  const adminToken = typeof body.adminToken === 'string' ? body.adminToken : '';
  const sessionToken = typeof body.sessionToken === 'string' ? body.sessionToken : '';
  const isAdmin = !!adminToken && checkAdminSession(adminToken);
  const reqDigits = digitsOf(body.phone);
  const isCustomer = !isAdmin && !!sessionToken && !!reqDigits && checkSession(sessionToken, reqDigits);

  // 토큰을 제시했는데 검증이 실패했다 = 세션 만료·무효. 이 경우를 빈 배열(200)로 돌려주면
  // 화면에는 "데이터 없음"으로 보여 사용자가 원인을 알 수 없다 → 401 + 원인 메시지로 구분한다.
  const adminSessionInvalid = !!adminToken && !isAdmin;
  const customerSessionInvalid = !isAdmin && !!sessionToken && !isCustomer;

  const unauthorized = (message: string) => Response.json({ error: message }, { status: 401 });
  const ADMIN_EXPIRED = '관리자 세션이 만료되었습니다. 다시 로그인해 주세요.';
  const CUSTOMER_EXPIRED = '로그인 세션이 만료되었습니다. 휴대폰 인증으로 다시 로그인해 주세요.';
  const LOGIN_REQUIRED = '로그인이 필요한 자료입니다. 휴대폰 인증 후 조회해 주세요.';
  const ADMIN_LOGIN_REQUIRED = '관리자 로그인이 필요한 자료입니다.';

  const op = body.op;

  try {
    // ---------- 읽기 ----------
    if (op === 'list') {
      const table = body.table || '';
      if (!ALLOWED_TABLES.includes(table)) {
        return Response.json({ error: '허용되지 않은 테이블입니다.' }, { status: 400 });
      }

      if (isAdmin) {
        // 고객 목록은 저장 카운터 대신 견적에서 파생한 누적치·등급을 실어 보낸다.
        if (table === TABLES.customers) {
          const [customers, estimates] = await Promise.all([
            loadRows<Customer>(supabase, TABLES.customers),
            loadRows<Estimate>(supabase, TABLES.estimates),
          ]);
          return Response.json({ rows: customers.map((c) => withDerivedRollup(c, estimates)) });
        }
        return Response.json({ rows: await loadRows(supabase, table) });
      }

      // 견적 = 익명 허용 경로. 공개 실적 화면이 로그인 없이 동작해야 하므로
      // 비로그인·세션 만료 모두 허용목록 분석 필드만 담아 200으로 응답한다.
      //
      // ⚠ 이 분기는 adminSessionInvalid 검사보다 반드시 앞에 있어야 한다.
      // 클라이언트(lib/supabase/client.ts authBody)는 고객 모드에서도 localStorage의
      // 관리자 토큰을 함께 실어 보내므로, 무효 토큰을 이유로 여기서 401을 내면
      // 과거 관리자 로그인 이력이 있는 브라우저에서 공개 홈·실적이 통째로 빈다.
      if (table === TABLES.estimates) {
        const all = await loadRows<Estimate>(supabase, table);
        if (isCustomer) {
          return Response.json({ rows: all.filter((e) => digitsOf(e.phone) === reqDigits) });
        }
        const publicRows: PublicEstimate[] = all.map(stripEstimate);
        return Response.json({ rows: publicRows });
      }

      // 관리자 토큰을 제시했는데 무효 = 관리자 화면의 세션 만료. 익명 응답으로 강등하면
      // 백오피스가 PII 없는 공개 행을 "정상 데이터"처럼 그리므로 여기서 끊는다.
      // (익명 허용 경로인 견적은 위에서 이미 반환됐다.)
      if (adminSessionInvalid) return unauthorized(ADMIN_EXPIRED);

      // 알림 로그 = 세션 필요 경로(본인 건만). 인증 실패는 빈 배열이 아니라 401.
      if (table === TABLES.notificationLogs) {
        if (!isCustomer) {
          return unauthorized(customerSessionInvalid ? CUSTOMER_EXPIRED : LOGIN_REQUIRED);
        }
        const all = await loadRows<NotificationLog>(supabase, table);
        return Response.json({ rows: all.filter((l) => digitsOf(l.phone) === reqDigits) });
      }

      // 고객/결제/방문/관리자 테이블 = 관리자 전용(위에서 반환).
      // 미인증은 401, 고객 세션은 인증됐으나 권한이 없으므로 403.
      if (isCustomer) {
        return Response.json({ error: '권한이 없습니다.' }, { status: 403 });
      }
      return unauthorized(customerSessionInvalid ? CUSTOMER_EXPIRED : ADMIN_LOGIN_REQUIRED);
    }

    // ---------- 쓰기(관리자 전용) ----------
    if (op === 'upsert') {
      if (!isAdmin) {
        return Response.json({ error: '권한이 없습니다.' }, { status: 403 });
      }
      const table = body.table || '';
      if (!ALLOWED_TABLES.includes(table)) {
        return Response.json({ error: '허용되지 않은 테이블입니다.' }, { status: 400 });
      }
      const rows = body.rows || [];
      if (rows.length === 0) return Response.json({ ok: true });
      const payload = rows.map((r) => ({ id: r.id, data: r }));
      const { error } = await supabase.from(table).upsert(payload, { onConflict: 'id' });
      if (error) return serverFailure(`upsert ${table}`, error);
      return Response.json({ ok: true });
    }

    // ---------- 공개 접수(OTP 토큰 검증 후 서버 단건 생성) ----------
    if (op === 'createEstimate') {
      const est = body.estimate || {};
      const phoneDigits = digitsOf(est.phone);
      if (!/^01[0-9]{8,9}$/.test(phoneDigits)) {
        return Response.json({ error: '휴대폰 번호가 올바르지 않습니다. 접수를 진행할 수 없습니다.' }, { status: 400 });
      }

      // IP 버킷은 여기서 센다 — 아래 loadRows 가 견적 전량 스캔이라 그 앞에서 막아야 의미가 있다.
      const ip = clientIp(req);
      const byIp = rateLimit(`createEstimate:ip:${ip}`, 10, 60 * 60 * 1000);
      if (!byIp.ok) {
        return Response.json(
          { error: '접수 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
          { status: 429, headers: { 'Retry-After': String(byIp.retryAfterSec) } }
        );
      }

      // 선택 입력값이 허용목록 밖이면 저장하지 않는다 — 통계·필터·화면 라벨이 전부 이 값을 축으로 쓴다.
      const invalidField = firstInvalidField(est);
      if (invalidField) {
        return Response.json({ error: `${invalidField} 값이 올바르지 않습니다.` }, { status: 400 });
      }

      // SMS(OTP)가 설정된 환경에서는 본인 인증 토큰을 필수로 요구한다(장난·사칭 접수 차단).
      // 미설정(개발/미연동) 환경에서는 클라이언트 게이트와 동일하게 인증을 생략한다.
      if (isSmsConfigured()) {
        const okVerified = !!body.verifiedToken && checkVerified(body.verifiedToken, phoneDigits);
        const okSession = !!body.sessionToken && checkSession(body.sessionToken, phoneDigits);
        if (!okVerified && !okSession) {
          return Response.json({ error: '본인 인증이 필요합니다. 휴대폰 인증 후 다시 시도해 주세요.' }, { status: 403 });
        }
      }

      const nowIso = new Date().toISOString();
      // 날짜는 KST 기준(AGENTS §13). UTC 로 자르면 한국시간 00~09시 접수가 전일자 번호로 발급된다.
      const todayKst = kstDateStr(nowIso);
      const todayStr = todayKst.replace(/-/g, '');

      const existing = await loadRows<Estimate>(supabase, TABLES.estimates);

      // 첨부 경로는 클라이언트가 보낸 값을 그대로 믿지 않는다. 남의 파일 경로를 자기 견적에 실으면
      // /api/files/sign 이 그 경로를 본인 소유로 판정해 서명 URL을 내주기 때문이다.
      const fileCheck = validateSubmittedFiles(est.submitted_files, pathsOwnedByOthers(existing, phoneDigits));
      if ('error' in fileCheck) {
        return Response.json({ error: fileCheck.error }, { status: 400 });
      }

      // 번호 버킷은 모든 검증을 통과한 뒤에 센다. 앞에 두면 400(형식 오류·첨부 규약 위반)을 받은 요청도
      // 한도를 소모해, 세 번 실수한 정상 고객이 1시간 접수 불가가 된다. 더 나쁘게는 OTP 가 생략되는
      // 현 환경에서 제3자가 남의 번호로 잘못된 요청을 3번 보내 그 번호를 봉쇄할 수 있다.
      const byPhone = rateLimit(`createEstimate:phone:${phoneDigits}`, 3, 60 * 60 * 1000);
      if (!byPhone.ok) {
        return Response.json(
          { error: '접수 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
          { status: 429, headers: { 'Retry-After': String(byPhone.retryAfterSec) } }
        );
      }

      const draft: Estimate = {
        id: `est-generated-uuid-${Math.random().toString(36).substr(2, 9)}`,
        estimate_no: '',
        created_at: nowIso,
        customer_name: est.customer_name || '이름 없음',
        company_name: est.company_name || '',
        phone: est.phone || '',
        email: est.email || '',
        site_address: est.site_address || '',
        customer_type: est.customer_type || '기타',
        work_type: est.work_type || '기타',
        site_type: est.site_type || '기타',
        work_purpose: est.work_purpose || '',
        expected_budget_range: est.expected_budget_range || '모름',
        desired_schedule: est.desired_schedule || '',
        urgency: est.urgency || false,
        description: est.description || '',
        request_detail: est.request_detail || '',
        estimate_category: est.estimate_category || 'unknown',
        accuracy_grade: est.accuracy_grade,
        status: '접수완료',
        admin_memo: '',
        payment_required: est.payment_required || false,
        payment_status: '미결제',
        submitted_files: fileCheck.files,
      };

      // 접수번호는 서버에서 채번한다(클라이언트 count+1 경쟁으로 인한 중복 방지).
      // 동시 접수는 유니크 인덱스(zeros_estimates_no_uniq)가 막고, 23505 를 받으면 여기서 다시 매겨 재시도한다.
      // 인덱스가 아직 없는 DB 에서는 첫 시도가 그대로 성공하므로 이 재시도는 동작에 영향을 주지 않는다.
      const tried = new Set<string>();
      let created: Estimate | null = null;
      let lastInsErr: unknown = null;
      for (let attempt = 0; attempt < MAX_NO_ATTEMPTS && !created; attempt += 1) {
        const rows = attempt === 0 ? existing : await loadRows<Estimate>(supabase, TABLES.estimates);
        const estimateNo = nextEstimateNo(rows, todayStr, tried);
        tried.add(estimateNo);

        const row: Estimate = { ...draft, estimate_no: estimateNo };
        const { error: insErr } = await supabase
          .from(TABLES.estimates)
          .upsert([{ id: row.id, data: row }], { onConflict: 'id' });
        if (!insErr) {
          created = row;
          break;
        }
        lastInsErr = insErr;
        if (!isDuplicateKey(insErr)) return serverFailure('createEstimate insert', insErr);
      }
      if (!created) return serverFailure('createEstimate 접수번호 채번 실패', lastInsErr);
      const newEstimate = created;

      // 고객 CRM 행 갱신(신규 생성 또는 최근 접촉일 기록) — 단건 upsert.
      // 누적 카운터는 표시 시점에 견적에서 파생 계산하므로(withDerivedRollup) 저장값은 레거시 호환용이다.
      // customer_grade 는 건드리지 않는다 — 접수 한 건이 운영자가 지정한 등급('중요고객'·'보류고객')을
      // '재문의'로 덮어쓰던 문제의 원인이었다. 자동 등급은 읽는 시점에 gradeOf 가 산출한다.
      const customers = await loadRows<Customer>(supabase, TABLES.customers);
      const existingCustomer = customers.find((c) => digitsOf(c.phone) === phoneDigits);
      let customerRow: Customer;
      if (existingCustomer) {
        customerRow = {
          ...existingCustomer,
          total_requests: (existingCustomer.total_requests || 0) + 1,
          last_contact_at: nowIso,
        };
      } else {
        customerRow = {
          id: `cust-generated-uuid-${Math.random().toString(36).substr(2, 9)}`,
          customer_name: newEstimate.customer_name,
          company_name: newEstimate.company_name || '',
          phone: newEstimate.phone,
          email: newEstimate.email,
          site_address: newEstimate.site_address,
          customer_type: newEstimate.customer_type,
          customer_grade: '신규',
          total_requests: 1,
          total_won: 0,
          total_revenue: 0,
          last_contact_at: nowIso,
          created_at: nowIso,
        };
      }
      await supabase.from(TABLES.customers).upsert([{ id: customerRow.id, data: customerRow }], { onConflict: 'id' });

      // 접수완료 알림 이력(단건). 이 경로는 알림톡·문자를 실제로 호출하지 않으므로
      // 상태를 '미발송'으로 기록한다(과거엔 발송 없이 '발송완료'로 고정돼 이력이 거짓이었다).
      const log: NotificationLog = {
        id: `ntf-generated-uuid-${Math.random().toString(36).substr(2, 9)}`,
        estimate_id: newEstimate.id,
        estimate_no: newEstimate.estimate_no,
        customer_name: newEstimate.customer_name,
        phone: newEstimate.phone,
        notification_type: '카카오톡 알림톡',
        template_code: 'ZR_REG_COMPLETE',
        content: `[ZEROS 사전진단] ${newEstimate.customer_name}님, 의뢰하신 사전진단서가 정상적으로 접수되었습니다. (접수번호: ${newEstimate.estimate_no})`,
        status: '미발송',
        sent_at: nowIso,
      };
      await supabase.from(TABLES.notificationLogs).upsert([{ id: log.id, data: log }], { onConflict: 'id' });

      // 예약방문 신청(출장 채널) — 방문 이력만 기록한다.
      // 견적 상태 자동 변경·"실측 조율 완료" 알림은 보내지 않는다(관리자가 실제 조율 후 처리).
      if (body.visit && body.visit.visit_date) {
        const v = body.visit;
        const visitRow: SiteVisit = {
          id: `visit-generated-uuid-${Math.random().toString(36).substr(2, 9)}`,
          estimate_id: newEstimate.id,
          visit_date: v.visit_date || todayKst,
          visitor_name: v.visitor_name || '미배정',
          visit_purpose: v.visit_purpose || '현장 실측',
          visit_status: '예정',
          visit_result: '',
          site_memo: v.site_memo || '',
          risk_memo: '',
          next_action: '',
          created_at: nowIso,
        };
        await supabase.from(TABLES.siteVisits).upsert([{ id: visitRow.id, data: visitRow }], { onConflict: 'id' });
      }

      return Response.json({ estimate: newEstimate });
    }

    // ---------- 견적 영구 삭제(관리자 전용) ----------
    if (op === 'deleteEstimate') {
      if (!isAdmin) {
        return Response.json({ error: '권한이 없습니다.' }, { status: 403 });
      }
      const id = typeof body.id === 'string' ? body.id : '';
      if (!id) {
        return Response.json({ error: '삭제할 견적 id가 없습니다.' }, { status: 400 });
      }

      // 견적 행 삭제
      const { error: delErr } = await supabase.from(TABLES.estimates).delete().eq('id', id);
      if (delErr) return serverFailure('deleteEstimate', delErr);

      // 연관 행(결제·방문·알림)을 estimate_id 로 찾아 함께 삭제
      for (const table of [TABLES.payments, TABLES.siteVisits, TABLES.notificationLogs]) {
        const rows = await loadRows<{ id: string; estimate_id?: string }>(supabase, table);
        const ids = rows.filter((r) => r.estimate_id === id).map((r) => r.id);
        if (ids.length) {
          await supabase.from(table).delete().in('id', ids);
        }
      }

      return Response.json({ ok: true });
    }

    return Response.json({ error: '알 수 없는 작업입니다.' }, { status: 400 });
  } catch (e) {
    return serverFailure(`op=${op || '(없음)'}`, e);
  }
}
