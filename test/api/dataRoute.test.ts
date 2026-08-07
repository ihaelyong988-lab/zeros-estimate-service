import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import type { Estimate, FileMeta, Payment } from '@/types/estimate';
import { makeEstimate, makePayment } from '../fixtures';

// ==========================================
// /api/data 게이트웨이 회귀 테스트
// ==========================================
// 이 라우트는 AGENTS §13 데이터 보안 게이트웨이다. 여기서 막지 못한 값은
// 그대로 DB 에 저장되고, 저장된 값이 /api/files/sign 의 소유권 판정 근거가 된다.
// 판정은 네트워크 없이 — Supabase 클라이언트를 인메모리 가짜로 대체한다.

interface FakeError {
  code?: string;
  message: string;
}

const db = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  // upsert 실패를 강제하는 훅(유니크 위반 재시도·오류 마스킹 검증용)
  upsertHook: null as null | ((table: string, calls: number) => FakeError | null),
  upsertCalls: {} as Record<string, number>,
  selectError: null as null | FakeError,
  // 서비스 키 미설정(503) 재현용
  noClient: false,
}));

vi.mock('@/lib/supabase/supabaseServer', () => {
  const client = {
    from(table: string) {
      return {
        select: () => ({
          order: async () => {
            if (db.selectError) return { data: null, error: db.selectError };
            const rows = db.tables[table] || [];
            return {
              data: rows.map((r) => ({ data: r, created_at: (r as { created_at?: string }).created_at || '' })),
              error: null,
            };
          },
        }),
        upsert: async (payload: { id: string; data: Record<string, unknown> }[]) => {
          db.upsertCalls[table] = (db.upsertCalls[table] || 0) + 1;
          const forced = db.upsertHook ? db.upsertHook(table, db.upsertCalls[table]) : null;
          if (forced) return { error: forced };
          const arr = (db.tables[table] ||= []);
          for (const p of payload) {
            const i = arr.findIndex((r) => (r as { id?: string }).id === p.id);
            if (i >= 0) arr[i] = p.data;
            else arr.push(p.data);
          }
          return { error: null };
        },
        // 삭제도 실제로 행을 지운다 — 지운 척만 하면 "삭제됐는가"를 검증할 수 없다.
        delete: () => ({
          eq: async (column: string, value: unknown) => {
            db.tables[table] = (db.tables[table] || []).filter(
              (r) => (r as Record<string, unknown>)[column] !== value
            );
            return { error: null };
          },
          in: async (column: string, values: unknown[]) => {
            db.tables[table] = (db.tables[table] || []).filter(
              (r) => !values.includes((r as Record<string, unknown>)[column])
            );
            return { error: null };
          },
        }),
      };
    },
  };
  return { getServiceClient: () => (db.noClient ? null : client), hasServiceKey: true };
});

import { POST } from '@/app/api/data/route';
import { createAdminSession, createSession } from '@/lib/otp/token';

// 관리자 토큰 검증(checkAdminSession)은 호출 시점의 ZEROS_ADMIN_PASSWORD 로 태그를 만든다.
// 미설정이면 fail-closed 로 항상 false 라, 권한 분기를 검사하려면 이 파일 동안 값을 고정한다.
const ORIGINAL_ADMIN_PW = process.env.ZEROS_ADMIN_PASSWORD;
process.env.ZEROS_ADMIN_PASSWORD = 'test-admin-password';

afterAll(() => {
  if (ORIGINAL_ADMIN_PW === undefined) delete process.env.ZEROS_ADMIN_PASSWORD;
  else process.env.ZEROS_ADMIN_PASSWORD = ORIGINAL_ADMIN_PW;
});

// 레이트리밋은 프로세스 메모리를 공유한다 — 테스트끼리 서로의 한도를 갉아먹지 않도록
// 번호·IP 를 매번 새로 발급한다(실사용에서도 번호·IP 가 축이다).
let seq = 0;
const freshCaller = () => {
  seq += 1;
  return { phone: `010${String(10_000_000 + seq)}`, ip: `ip-${seq}` };
};

async function call(body: unknown, ip = freshCaller().ip) {
  const req = new Request('http://localhost/api/data', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': ip },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
  const res = await POST(req);
  return { status: res.status, headers: res.headers, body: (await res.json()) as Record<string, unknown> };
}

const submit = (estimate: Record<string, unknown>, ip: string) =>
  call({ op: 'createEstimate', estimate }, ip);

const fileMeta = (path: string, over: Partial<FileMeta> = {}): FileMeta => ({
  id: 'file-test-1',
  estimate_id: '',
  file_name: 'plan.pdf',
  file_type: 'application/pdf',
  file_url: '',
  file_path: path,
  file_category: '도면',
  file_size: 1024,
  uploaded_at: '2026-08-07T00:00:00.000Z',
  ...over,
});

// lib/supabase/storage.ts 가 만드는 실제 경로 형식: <폴더>/<13자리 ts>-<36진 난수>-<정리된 이름>
const MY_PATH = 'drawings/1754500000000-a1b2c3d-plan.pdf';
const OTHER_PATH = 'drawings/1754500000009-z9y8x7w-others_drawing.pdf';
const OTHER_QUOTE = 'quotes/1754500000011-q1w2e3r-quote.xlsx';
const PUBLIC_URL_PREFIX = 'https://xtljznrfmythnnpeorgz.supabase.co/storage/v1/object/public/estimate-files/';

const estimates = () => (db.tables.zeros_estimates || []) as unknown as Estimate[];

beforeEach(() => {
  db.tables = {};
  db.upsertHook = null;
  db.upsertCalls = {};
  db.selectError = null;
  db.noClient = false;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createEstimate — submitted_files 소유권 검증(A2)', () => {
  it('업로드 규약에 맞는 새 경로는 그대로 접수된다', async () => {
    const { phone, ip } = freshCaller();
    const res = await submit({ phone, customer_name: '홍길동', submitted_files: [fileMeta(MY_PATH)] }, ip);

    expect(res.status).toBe(200);
    expect((res.body.estimate as Estimate).submitted_files?.[0].file_path).toBe(MY_PATH);
    expect(estimates()).toHaveLength(1);
  });

  it('첨부가 없으면 빈 목록으로 접수된다', async () => {
    const { phone, ip } = freshCaller();
    const res = await submit({ phone, customer_name: '홍길동' }, ip);

    expect(res.status).toBe(200);
    expect((res.body.estimate as Estimate).submitted_files).toEqual([]);
  });

  it('다른 견적에 이미 등록된 경로는 거부한다 — 서명 URL 우회의 핵심 방어', async () => {
    db.tables.zeros_estimates = [
      makeEstimate({ phone: '010-9999-0000', submitted_files: [fileMeta(OTHER_PATH)] }),
    ] as unknown as Record<string, unknown>[];

    const { phone, ip } = freshCaller();
    const res = await submit({ phone, customer_name: '침입자', submitted_files: [fileMeta(OTHER_PATH)] }, ip);

    expect(res.status).toBe(400);
    expect(String(res.body.error)).toContain('이미 다른');
    expect(estimates()).toHaveLength(1); // 새 견적이 저장되지 않았다
  });

  it('다른 견적의 견적서(estimate_pdf_url) 경로도 실을 수 없다', async () => {
    db.tables.zeros_estimates = [
      makeEstimate({ phone: '010-9999-0000', estimate_pdf_url: OTHER_QUOTE }),
    ] as unknown as Record<string, unknown>[];

    const { phone, ip } = freshCaller();
    const res = await submit({ phone, submitted_files: [fileMeta(OTHER_QUOTE)] }, ip);

    expect(res.status).toBe(400);
  });

  it('레거시 공개 URL 로 등록된 경로도 재사용할 수 없다', async () => {
    db.tables.zeros_estimates = [
      makeEstimate({
        phone: '010-9999-0000',
        submitted_files: [fileMeta('', { file_path: undefined, file_url: `${PUBLIC_URL_PREFIX}${OTHER_PATH}` })],
      }),
    ] as unknown as Record<string, unknown>[];

    const { phone, ip } = freshCaller();
    const res = await submit({ phone, submitted_files: [fileMeta(OTHER_PATH)] }, ip);

    expect(res.status).toBe(400);
  });

  it('본인이 이미 접수한 경로는 다시 실을 수 있다 — 접수 후 새 등록 경로가 막히면 안 된다', async () => {
    const { phone, ip } = freshCaller();
    db.tables.zeros_estimates = [
      makeEstimate({ phone, submitted_files: [fileMeta(MY_PATH)] }),
    ] as unknown as Record<string, unknown>[];

    const res = await submit({ phone, submitted_files: [fileMeta(MY_PATH)] }, ip);

    expect(res.status).toBe(200);
    expect(estimates()).toHaveLength(2);
  });

  it('하이픈 표기가 달라도 같은 번호면 본인 파일로 본다', async () => {
    const { phone, ip } = freshCaller();
    const hyphened = `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
    db.tables.zeros_estimates = [
      makeEstimate({ phone: hyphened, submitted_files: [fileMeta(MY_PATH)] }),
    ] as unknown as Record<string, unknown>[];

    const res = await submit({ phone, submitted_files: [fileMeta(MY_PATH)] }, ip);

    expect(res.status).toBe(200);
  });

  it('한 요청 안에서 같은 경로를 두 번 실을 수 없다', async () => {
    const { phone, ip } = freshCaller();
    const res = await submit({ phone, submitted_files: [fileMeta(MY_PATH), fileMeta(MY_PATH)] }, ip);

    expect(res.status).toBe(400);
  });

  it.each([
    ['상위 경로 이동', '../../secret.pdf'],
    ['허용되지 않은 폴더', 'secret/1754500000000-a1b2c3d-plan.pdf'],
    ['타임스탬프 없음', 'drawings/plan.pdf'],
    ['하위 경로 추가', 'drawings/1754500000000-a1b2c3d-sub/plan.pdf'],
    ['빈 경로', ''],
  ])('규약 위반 경로(%s)는 조용히 버리지 않고 400 으로 거부한다', async (_label, path) => {
    const { phone, ip } = freshCaller();
    const res = await submit({ phone, submitted_files: [fileMeta(path)] }, ip);

    expect(res.status).toBe(400);
    expect(String(res.body.error)).toContain('첨부파일');
    expect(estimates()).toHaveLength(0);
  });

  it('file_path 가 없는 항목도 거부한다', async () => {
    const { phone, ip } = freshCaller();
    const res = await submit(
      { phone, submitted_files: [fileMeta('', { file_path: undefined, file_url: `${PUBLIC_URL_PREFIX}${OTHER_PATH}` })] },
      ip
    );

    expect(res.status).toBe(400);
  });
});

describe('createEstimate — 입력값 허용목록(A3)', () => {
  it.each([
    ['work_type', 'DROP TABLE'],
    ['site_type', '우주정거장'],
    ['estimate_category', 'huge'],
    ['expected_budget_range', '10억 이상'],
  ])('%s 가 허용값 밖이면 400 으로 거부한다', async (field, value) => {
    const { phone, ip } = freshCaller();
    const res = await submit({ phone, [field]: value }, ip);

    expect(res.status).toBe(400);
    expect(estimates()).toHaveLength(0);
  });

  it('허용값은 그대로 저장된다', async () => {
    const { phone, ip } = freshCaller();
    const res = await submit(
      {
        phone,
        work_type: 'CAPEX 개·증설 검토',
        site_type: '제약·바이오',
        estimate_category: 'large',
        expected_budget_range: '≥1억',
      },
      ip
    );

    expect(res.status).toBe(200);
    const saved = res.body.estimate as Estimate;
    expect(saved.work_type).toBe('CAPEX 개·증설 검토');
    expect(saved.site_type).toBe('제약·바이오');
    expect(saved.estimate_category).toBe('large');
    expect(saved.expected_budget_range).toBe('≥1억');
  });

  it('값을 보내지 않으면 기존대로 기본값으로 접수된다', async () => {
    const { phone, ip } = freshCaller();
    const res = await submit({ phone }, ip);

    expect(res.status).toBe(200);
    const saved = res.body.estimate as Estimate;
    expect(saved.work_type).toBe('기타');
    expect(saved.site_type).toBe('기타');
    expect(saved.estimate_category).toBe('unknown');
    expect(saved.expected_budget_range).toBe('모름');
  });
});

describe('createEstimate — 레이트리밋(A3)', () => {
  it('같은 번호로 1시간 3회를 넘기면 429 와 Retry-After 를 준다', async () => {
    const { phone, ip } = freshCaller();
    for (let i = 0; i < 3; i += 1) {
      expect((await submit({ phone }, ip)).status).toBe(200);
    }

    const blocked = await submit({ phone }, ip);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);
  });

  it('같은 IP 로 1시간 10회를 넘기면 번호가 달라도 429 다', async () => {
    const ip = `ip-shared-${(seq += 1)}`;
    for (let i = 0; i < 10; i += 1) {
      expect((await submit({ phone: freshCaller().phone }, ip)).status).toBe(200);
    }

    const blocked = await submit({ phone: freshCaller().phone }, ip);
    expect(blocked.status).toBe(429);
  });
});

describe('createEstimate — 접수번호 채번 경쟁(D4)', () => {
  it('접수번호가 중복되면(23505) 번호를 다시 매겨 저장한다', async () => {
    db.upsertHook = (table, calls) =>
      table === 'zeros_estimates' && calls === 1
        ? { code: '23505', message: 'duplicate key value violates unique constraint "zeros_estimates_no_uniq"' }
        : null;

    const { phone, ip } = freshCaller();
    const res = await submit({ phone }, ip);

    expect(res.status).toBe(200);
    expect((res.body.estimate as Estimate).estimate_no).toMatch(/^ZR-\d{8}-002$/);
  });

  it('재시도 5회를 모두 중복으로 실패하면 원문 없이 500 을 준다', async () => {
    db.upsertHook = (table) =>
      table === 'zeros_estimates' ? { code: '23505', message: 'duplicate key value violates unique constraint' } : null;

    const { phone, ip } = freshCaller();
    const res = await submit({ phone }, ip);

    expect(res.status).toBe(500);
    expect(db.upsertCalls.zeros_estimates).toBe(5);
    expect(String(res.body.error)).not.toContain('duplicate key');
  });
});

describe('서버 내부 오류 원문 비노출(D5)', () => {
  it('DB 오류 원문 대신 고정 문구와 추적 id 를 준다', async () => {
    db.upsertHook = (table) =>
      table === 'zeros_estimates' ? { code: '42P01', message: 'relation "zeros_estimates" does not exist' } : null;

    const { phone, ip } = freshCaller();
    const res = await submit({ phone }, ip);

    expect(res.status).toBe(500);
    const message = String(res.body.error);
    expect(message).not.toContain('relation');
    expect(message).toMatch(/오류 코드 [a-z0-9]+/);
    expect(console.error).toHaveBeenCalled();
  });

  it('조회 실패 원문도 응답에 싣지 않는다', async () => {
    db.selectError = { message: 'permission denied for table zeros_estimates' };

    const res = await call({ op: 'list', table: 'zeros_estimates' });

    expect(res.status).toBe(500);
    expect(String(res.body.error)).not.toContain('permission denied');
  });

  it('키 미설정 안내(503)는 운영에 필요하므로 그대로 둔다', async () => {
    db.noClient = true;

    const res = await call({ op: 'list', table: 'zeros_estimates' });

    expect(res.status).toBe(503);
    expect(String(res.body.error)).toContain('SUPABASE_SERVICE_ROLE_KEY');
  });
});

describe('§13 불변식 — 익명 견적 경로', () => {
  it('익명 조회는 PII 없이 분석 필드만 받는다', async () => {
    db.tables.zeros_estimates = [makeEstimate({ phone: '010-9999-0000' })] as unknown as Record<string, unknown>[];

    const res = await call({ op: 'list', table: 'zeros_estimates' });
    const row = (res.body.rows as Record<string, unknown>[])[0];

    expect(res.status).toBe(200);
    expect(row.phone).toBeUndefined();
    expect(row.customer_name).toBeUndefined();
    expect(row.work_type).toBe('배관공사');
  });

  it('만료된 관리자 토큰이 실려 있어도 공개 실적은 비지 않는다', async () => {
    db.tables.zeros_estimates = [makeEstimate({ phone: '010-9999-0000' })] as unknown as Record<string, unknown>[];

    const res = await call({ op: 'list', table: 'zeros_estimates', adminToken: '만료된.토큰' });

    expect(res.status).toBe(200);
    expect(res.body.rows).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 적대 검증(2026-08-07)이 잡아낸 A2·A3 미봉합 2건 — 재발 방지 고정
// ──────────────────────────────────────────────────────────────────────────

describe('createEstimate — file_url 우회 차단(A2 봉합)', () => {
  // /api/files/sign 의 customerOwnsPath 는 file_path 뿐 아니라 file_url 도 경로로 환산해
  // 소유권을 판정한다. file_path 만 검사하고 클라이언트 객체를 통째로 저장하면
  // 검사받지 않은 file_url 에 남의 경로를 실어 서명 URL 을 받아낼 수 있었다.
  it('남의 경로를 file_url 에 실어도 저장된 file_url 은 비워진다', async () => {
    const victim = freshCaller();
    await submit({ phone: victim.phone, customer_name: '피해자', submitted_files: [fileMeta(OTHER_PATH)] }, victim.ip);

    const attacker = freshCaller();
    const res = await submit(
      {
        phone: attacker.phone,
        customer_name: '공격자',
        submitted_files: [fileMeta(MY_PATH, { file_url: `${PUBLIC_URL_PREFIX}${OTHER_PATH}` })],
      },
      attacker.ip
    );

    expect(res.status).toBe(200);
    const stored = estimates().find((e) => e.customer_name === '공격자');
    expect(stored?.submitted_files?.[0].file_url).toBe('');
    expect(stored?.submitted_files?.[0].file_path).toBe(MY_PATH);
    // 저장된 어떤 필드에서도 피해자 경로가 환산되지 않아야 한다
    expect(JSON.stringify(stored?.submitted_files)).not.toContain(OTHER_PATH);
  });

  it('알려지지 않은 필드는 저장되지 않는다', async () => {
    const { phone, ip } = freshCaller();
    const res = await submit(
      {
        phone,
        customer_name: '홍길동',
        submitted_files: [{ ...fileMeta(MY_PATH), injected: `${PUBLIC_URL_PREFIX}${OTHER_QUOTE}` }],
      },
      ip
    );

    expect(res.status).toBe(200);
    const saved = estimates()[0].submitted_files?.[0] as unknown as Record<string, unknown>;
    expect(saved.injected).toBeUndefined();
    expect(JSON.stringify(saved)).not.toContain(OTHER_QUOTE);
  });
});

describe('createEstimate — 번호 레이트리밋 소모 시점(A3 봉합)', () => {
  // 번호 한도를 검증보다 앞에서 세면 400 을 받은 요청도 한도를 깎는다.
  // 세 번 실수한 정상 고객이 1시간 접수 불가가 되고, OTP 가 생략되는 현 환경에서는
  // 제3자가 남의 번호로 잘못된 요청을 3번 보내 그 번호를 봉쇄할 수 있다.
  it('400 으로 거부된 요청은 번호 한도를 소모하지 않는다', async () => {
    const { phone } = freshCaller();

    for (let i = 0; i < 3; i += 1) {
      const bad = await submit({ phone, customer_name: '홍길동', work_type: '존재하지않는공종' }, `ip-bad-${i}`);
      expect(bad.status).toBe(400);
    }

    const ok = await submit({ phone, customer_name: '홍길동' }, 'ip-good-1');
    expect(ok.status).toBe(200);
  });

  it('첨부 규약 위반으로 거부된 요청도 번호 한도를 소모하지 않는다', async () => {
    const { phone } = freshCaller();

    for (let i = 0; i < 3; i += 1) {
      const bad = await submit(
        { phone, customer_name: '홍길동', submitted_files: [fileMeta('../../etc/passwd')] },
        `ip-bad2-${i}`
      );
      expect(bad.status).toBe(400);
    }

    const ok = await submit({ phone, customer_name: '홍길동' }, 'ip-good-2');
    expect(ok.status).toBe(200);
  });

  it('정상 접수는 여전히 번호당 1시간 3회로 제한된다', async () => {
    const { phone } = freshCaller();

    for (let i = 0; i < 3; i += 1) {
      const ok = await submit({ phone, customer_name: '홍길동' }, `ip-rate-${i}`);
      expect(ok.status).toBe(200);
    }

    const blocked = await submit({ phone, customer_name: '홍길동' }, 'ip-rate-last');
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// N6 — 결제 행 삭제 경로(deletePayment)
// ──────────────────────────────────────────────────────────────────────────
// 잘못 만든 청구 행을 지울 서버 경로가 없어, 오입력 결제가 미수금·결제상태에 영구히 남았다.
// deleteEstimate 와 같은 관리자 전용 delete op 로 뚫되, 견적의 결제상태는 저장하지 않고
// 남은 결제 행 집합에서 파생한 값을 돌려준다(§14-4 — 파생값은 저장하지 않는다).

const payments = () => (db.tables.zeros_payments || []) as unknown as Payment[];

const seedPayments = (rows: Payment[]) => {
  db.tables.zeros_payments = rows as unknown as Record<string, unknown>[];
};

describe('deletePayment — 권한(N6)', () => {
  it('관리자는 결제 행을 삭제한다', async () => {
    const target = makePayment({ id: 'pay-del-1', estimate_id: 'est-1', payment_status: '결제대기' });
    seedPayments([target, makePayment({ id: 'pay-keep-1', estimate_id: 'est-2' })]);

    const res = await call({ op: 'deletePayment', id: 'pay-del-1', adminToken: createAdminSession() });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(payments().map((p) => p.id)).toEqual(['pay-keep-1']);
  });

  it('익명 요청은 403 이고 행이 남는다', async () => {
    seedPayments([makePayment({ id: 'pay-del-2', estimate_id: 'est-1' })]);

    const res = await call({ op: 'deletePayment', id: 'pay-del-2' });

    expect(res.status).toBe(403);
    expect(payments()).toHaveLength(1);
  });

  it('고객 세션 토큰도 403 이다 — 본인 건이라도 결제 행을 지울 수 없다', async () => {
    const phone = '01055556666';
    seedPayments([makePayment({ id: 'pay-del-3', estimate_id: 'est-1' })]);

    const res = await call({
      op: 'deletePayment',
      id: 'pay-del-3',
      sessionToken: createSession(phone),
      phone,
    });

    expect(res.status).toBe(403);
    expect(payments()).toHaveLength(1);
  });

  it('만료·위조 관리자 토큰도 403 이다', async () => {
    seedPayments([makePayment({ id: 'pay-del-4', estimate_id: 'est-1' })]);

    const res = await call({ op: 'deletePayment', id: 'pay-del-4', adminToken: '위조.토큰' });

    expect(res.status).toBe(403);
    expect(payments()).toHaveLength(1);
  });

  it('id 가 없으면 400 이다', async () => {
    const res = await call({ op: 'deletePayment', adminToken: createAdminSession() });

    expect(res.status).toBe(400);
  });

  it('없는 id 는 404 로 구분한다 — 조용히 성공시키지 않는다', async () => {
    seedPayments([makePayment({ id: 'pay-keep-2', estimate_id: 'est-1' })]);

    const res = await call({ op: 'deletePayment', id: 'pay-없음', adminToken: createAdminSession() });

    expect(res.status).toBe(404);
    expect(payments()).toHaveLength(1);
  });
});

describe('deletePayment — 삭제 후 결제상태 파생(N6)', () => {
  it('남은 행 집합에서 파생한 상태를 돌려준다', async () => {
    seedPayments([
      makePayment({ id: 'pay-paid', estimate_id: 'est-1', payment_status: '결제완료' }),
      makePayment({ id: 'pay-wait', estimate_id: 'est-1', payment_status: '결제대기' }),
    ]);

    const res = await call({ op: 'deletePayment', id: 'pay-paid', adminToken: createAdminSession() });

    expect(res.status).toBe(200);
    expect(res.body.payment_status).toBe('결제대기');
  });

  it('마지막 행을 지우면 미결제로 돌아간다', async () => {
    seedPayments([makePayment({ id: 'pay-only', estimate_id: 'est-1', payment_status: '결제완료' })]);

    const res = await call({ op: 'deletePayment', id: 'pay-only', adminToken: createAdminSession() });

    expect(res.body.payment_status).toBe('미결제');
  });

  it('다른 견적의 결제 행은 파생에 섞이지 않는다', async () => {
    seedPayments([
      makePayment({ id: 'pay-mine', estimate_id: 'est-1', payment_status: '결제완료' }),
      makePayment({ id: 'pay-others', estimate_id: 'est-2', payment_status: '결제완료' }),
    ]);

    const res = await call({ op: 'deletePayment', id: 'pay-mine', adminToken: createAdminSession() });

    expect(res.body.payment_status).toBe('미결제');
  });

  it('견적 행에 결제상태를 저장하지 않는다 — 파생값은 저장하지 않는다(§14-4)', async () => {
    db.tables.zeros_estimates = [
      makeEstimate({ id: 'est-1', payment_status: '결제완료' }),
    ] as unknown as Record<string, unknown>[];
    seedPayments([makePayment({ id: 'pay-derive', estimate_id: 'est-1', payment_status: '결제완료' })]);

    const res = await call({ op: 'deletePayment', id: 'pay-derive', adminToken: createAdminSession() });

    expect(res.status).toBe(200);
    expect(db.upsertCalls.zeros_estimates).toBeUndefined();
  });
});

