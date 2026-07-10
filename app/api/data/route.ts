import type { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/supabase/supabaseServer';
import { checkAdminSession, checkSession, checkVerified } from '@/lib/otp/token';
import { isSmsConfigured } from '@/lib/sms/send';
import type { Estimate, Customer, SiteVisit, NotificationLog } from '@/types/estimate';

// ==========================================
// POST /api/data — 인증 강제 데이터 게이트웨이
// ==========================================
// 브라우저가 anon 키로 테이블을 직접 읽고 쓰던 구조(전 고객 PII 공개 노출)를 대체한다.
// 모든 접근은 service_role 키로 서버에서만 수행하고, 요청자 신원을 서버가 검증한다.
//   - 관리자 토큰   : 전체 테이블 읽기/쓰기
//   - 고객 세션 토큰: 본인 휴대폰 번호의 견적·알림만 읽기
//   - 익명          : 견적은 개인정보를 제거한 분석용 행만 읽기(공개 실적 화면), 그 외 차단
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

// 익명(공개 실적)에게 노출해도 되는 분석용 필드만 남기고 개인정보를 제거한다.
function stripEstimate(e: Estimate): Estimate {
  return {
    ...e,
    customer_name: '',
    company_name: '',
    phone: '',
    email: '',
    site_address: '',
    admin_memo: '',
    request_detail: '',
    description: '',
    submitted_files: [],
    estimate_pdf_url: undefined,
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

  const isAdmin = !!body.adminToken && checkAdminSession(body.adminToken);
  const reqDigits = digitsOf(body.phone);
  const isCustomer = !isAdmin && !!body.sessionToken && !!reqDigits && checkSession(body.sessionToken, reqDigits);

  const op = body.op;

  try {
    // ---------- 읽기 ----------
    if (op === 'list') {
      const table = body.table || '';
      if (!ALLOWED_TABLES.includes(table)) {
        return Response.json({ error: '허용되지 않은 테이블입니다.' }, { status: 400 });
      }

      if (isAdmin) {
        return Response.json({ rows: await loadRows(supabase, table) });
      }

      // 견적: 고객=본인 건 전체, 익명=PII 제거 분석 행
      if (table === TABLES.estimates) {
        const all = await loadRows<Estimate>(supabase, table);
        if (isCustomer) {
          return Response.json({ rows: all.filter((e) => digitsOf(e.phone) === reqDigits) });
        }
        return Response.json({ rows: all.map(stripEstimate) });
      }

      // 알림 로그: 고객=본인 건만, 익명=차단
      if (table === TABLES.notificationLogs) {
        if (!isCustomer) return Response.json({ rows: [] });
        const all = await loadRows<NotificationLog>(supabase, table);
        return Response.json({ rows: all.filter((l) => digitsOf(l.phone) === reqDigits) });
      }

      // 고객/결제/방문/관리자 테이블: 관리자만(위에서 반환). 그 외 차단.
      return Response.json({ rows: [] });
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
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    // ---------- 공개 접수(OTP 토큰 검증 후 서버 단건 생성) ----------
    if (op === 'createEstimate') {
      const est = body.estimate || {};
      const phoneDigits = digitsOf(est.phone);
      if (!/^01[0-9]{8,9}$/.test(phoneDigits)) {
        return Response.json({ error: '휴대폰 번호가 올바르지 않습니다. 접수를 진행할 수 없습니다.' }, { status: 400 });
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
      const todayStr = nowIso.slice(0, 10).replace(/-/g, '');

      // 접수번호는 서버에서 채번한다(클라이언트 count+1 경쟁으로 인한 중복 방지).
      const existing = await loadRows<Estimate>(supabase, TABLES.estimates);
      const count = existing.filter((e) => (e.estimate_no || '').startsWith(`ZR-${todayStr}`)).length + 1;
      const estimateNo = `ZR-${todayStr}-${String(count).padStart(3, '0')}`;

      const newEstimate: Estimate = {
        id: `est-generated-uuid-${Math.random().toString(36).substr(2, 9)}`,
        estimate_no: estimateNo,
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
        submitted_files: est.submitted_files || [],
      };

      const { error: insErr } = await supabase
        .from(TABLES.estimates)
        .upsert([{ id: newEstimate.id, data: newEstimate }], { onConflict: 'id' });
      if (insErr) return Response.json({ error: insErr.message }, { status: 500 });

      // 고객 CRM 누적(신규 생성 또는 의뢰 1건 증가) — 단건 upsert
      const customers = await loadRows<Customer>(supabase, TABLES.customers);
      const existingCustomer = customers.find((c) => digitsOf(c.phone) === phoneDigits);
      let customerRow: Customer;
      if (existingCustomer) {
        customerRow = {
          ...existingCustomer,
          total_requests: (existingCustomer.total_requests || 0) + 1,
          last_contact_at: nowIso,
          customer_grade: '재문의',
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

      // 접수완료 알림 로그(단건)
      const log: NotificationLog = {
        id: `ntf-generated-uuid-${Math.random().toString(36).substr(2, 9)}`,
        estimate_id: newEstimate.id,
        estimate_no: newEstimate.estimate_no,
        customer_name: newEstimate.customer_name,
        phone: newEstimate.phone,
        notification_type: '카카오톡 알림톡',
        template_code: 'ZR_REG_COMPLETE',
        content: `[ZEROS 사전진단] ${newEstimate.customer_name}님, 의뢰하신 사전진단서가 정상적으로 접수되었습니다. (접수번호: ${newEstimate.estimate_no})`,
        status: '발송완료',
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
          visit_date: v.visit_date || nowIso.slice(0, 10),
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
      if (delErr) return Response.json({ error: delErr.message }, { status: 500 });

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
    return Response.json(
      { error: e instanceof Error ? e.message : '데이터 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
