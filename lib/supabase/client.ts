'use client';

import { Estimate, EstimateStatus, Customer, SiteVisit, Payment, AdminUser, NotificationLog } from '@/types/estimate';
import { mockAdminUsers, mockCustomers, mockEstimates, mockPayments, mockSiteVisits } from './mock-data';
import { isSupabaseEnabled } from './supabaseBrowser';
import { supplyAmountOf } from '@/lib/quote/amounts';
import { derivePaymentStatus } from '@/lib/payments/status';

// ==========================================
// 0. 접수 인증 토큰 — 전송 판정 (순수 함수)
// ==========================================
// 서버(/api/data op=createEstimate)는 접수 번호와 **같은 번호로 발급된**
// verifiedToken(30분) 또는 sessionToken(30일) 중 하나를 요구한다(checkVerified/checkSession).
// 번호가 다르거나 이미 만료된 토큰은 실어 보내도 403 이므로 여기서 걸러낸다.
// 인증 완료 여부 표시도 이 판정과 같은 값을 써야 한다 — "화면은 인증됨, 서버는 미인증" 어긋남을 막는다.

// 휴대폰 인증 직후 받은 단기 토큰 기록(sessionStorage 저장 형식)
export interface VerifiedRecord {
  phone?: string;
  verifiedToken?: string;
  verifiedAt?: number; // 발급 시각(epoch ms)
}

// 로그인 세션(localStorage customerAuth) 중 토큰 판정에 필요한 부분만
export interface CustomerSessionLike {
  phone?: string;
  sessionToken?: string;
  verifiedAt?: string; // 발급 시각(ISO)
}

export interface EstimateAuthTokens {
  verifiedToken?: string;
  sessionToken?: string;
}

// 서버 lib/otp/token.ts 의 TTL 과 같은 값 — 만료가 뻔한 토큰으로 접수를 시도하지 않는다.
export const VERIFIED_TOKEN_TTL_MS = 30 * 60 * 1000;
export const SESSION_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const digitsOf = (v?: string | null): string => (v || '').replace(/\D/g, '');

// 발급 시각을 모르면 만료로 단정하지 않는다 — 로컬 추측으로 유효한 토큰을 버리지 않고 서버 판정에 맡긴다.
const expired = (issuedAt: number | undefined, ttlMs: number, now: number): boolean =>
  typeof issuedAt === 'number' && Number.isFinite(issuedAt) && now - issuedAt >= ttlMs;

const isoToMs = (iso?: string): number | undefined => {
  if (!iso) return undefined;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : undefined;
};

// sessionStorage 저장값 복원 — 형식이 깨졌거나 다른 값이면 기록 없음으로 취급한다.
export function parseVerifiedRecord(raw: string | null | undefined): VerifiedRecord | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as VerifiedRecord;
    if (!obj || typeof obj !== 'object') return null;
    return {
      phone: typeof obj.phone === 'string' ? obj.phone : undefined,
      verifiedToken: typeof obj.verifiedToken === 'string' ? obj.verifiedToken : undefined,
      verifiedAt: typeof obj.verifiedAt === 'number' ? obj.verifiedAt : undefined,
    };
  } catch {
    return null;
  }
}

// 이 번호로 접수할 때 서버에 낼 수 있는 토큰만 고른다.
export function pickEstimateAuth(
  phone: string,
  record?: VerifiedRecord | null,
  session?: CustomerSessionLike | null,
  now: number = Date.now()
): EstimateAuthTokens {
  const target = digitsOf(phone);
  if (!target) return {};

  const tokens: EstimateAuthTokens = {};
  if (
    record?.verifiedToken &&
    digitsOf(record.phone) === target &&
    !expired(record.verifiedAt, VERIFIED_TOKEN_TTL_MS, now)
  ) {
    tokens.verifiedToken = record.verifiedToken;
  }
  if (
    session?.sessionToken &&
    digitsOf(session.phone) === target &&
    !expired(isoToMs(session.verifiedAt), SESSION_TOKEN_TTL_MS, now)
  ) {
    tokens.sessionToken = session.sessionToken;
  }
  return tokens;
}

// 인증 완료 판정 = 실어 보낼 토큰 보유. 번호만 저장돼 있으면 인증된 것이 아니다.
export const isEstimateAuthed = (tokens: EstimateAuthTokens): boolean =>
  !!(tokens.verifiedToken || tokens.sessionToken);

// 데이터 요청 실패 — 상태코드를 보존해 호출부가 복구 경로(재인증)를 고를 수 있게 한다.
export class DataRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'DataRequestError';
    this.status = status;
  }
}

// 401(세션 만료)·403(미인증·권한 없음) = 같은 화면에서 다시 눌러도 실패한다 → 인증부터 다시 받아야 한다.
export function isAuthRequiredError(e: unknown): boolean {
  return e instanceof DataRequestError && (e.status === 401 || e.status === 403);
}

// 접수 부가 정보 — 예약방문 + 본인인증 토큰.
export interface CreateEstimateOptions {
  visit?: Partial<SiteVisit>;
  verifiedToken?: string;
}

// ==========================================
// 1. ZEROS 사전진단 데이터 서비스 표준 인터페이스
// ==========================================
export interface ZerosDataService {
  // 견적 관련
  getEstimates: () => Promise<Estimate[]>;
  getEstimateById: (id: string) => Promise<Estimate | null>;
  createEstimate: (estimate: Partial<Estimate>, opts?: CreateEstimateOptions) => Promise<Estimate>;
  updateEstimate: (id: string, updates: Partial<Estimate>) => Promise<Estimate>;
  deleteEstimate: (id: string) => Promise<void>;

  // 결제 관련
  getPayments: () => Promise<Payment[]>;
  createPayment: (payment: Partial<Payment>) => Promise<Payment>;
  updatePayment: (id: string, updates: Partial<Payment>) => Promise<Payment>;

  // 현장방문 관련
  getSiteVisits: () => Promise<SiteVisit[]>;
  createSiteVisit: (visit: Partial<SiteVisit>) => Promise<SiteVisit>;
  updateSiteVisit: (id: string, updates: Partial<SiteVisit>) => Promise<SiteVisit>;

  // 고객 관련
  getCustomers: () => Promise<Customer[]>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<Customer>;

  // 관리자 관련
  getAdminUsers: () => Promise<AdminUser[]>;

  // 알림 로그 관련
  getNotificationLogs: () => Promise<NotificationLog[]>;
  createNotificationLog: (log: Partial<NotificationLog>) => Promise<NotificationLog>;
}

// 테이블 키 (localStorage 키 = Supabase 테이블명 으로 공통 사용)
const TABLES = {
  estimates: 'zeros_estimates',
  customers: 'zeros_customers',
  payments: 'zeros_payments',
  siteVisits: 'zeros_site_visits',
  adminUsers: 'zeros_admin_users',
  notificationLogs: 'zeros_notification_logs',
} as const;

// 시드 버전 — 모의 데이터(특히 실적 시각화용 테스트 표본)를 갱신할 때 올린다.
// 저장된 버전과 다르면 견적 테이블을 새 시드로 1회 재적재해, 기존 localStorage가 옛 표본을 들고 있어도 반영된다.
const SEED_VERSION = '2026-06-27-perf-testdata';
const SEED_VERSION_KEY = 'zeros_seed_version';

// ==========================================
// 1-B. 테이블 조회 캐시 — 권한 등급별 분리(순수 로직)
// ==========================================
// 관리자 탭을 옮길 때마다 같은 테이블을 통째로 다시 받는다(사이드바 4 + 뷰 1 + 루트 1 = 전환 1회당 최대 6회 풀스캔).
// 여기서 (1) 진행 중인 같은 요청 합치기 (2) 짧은 TTL 캐시 (3) 쓰기 직후 무효화 를 처리한다.
//
// ⚠ 캐시가 권한 경계를 넘으면 그 자체가 PII 누출이다(AGENTS §13).
// 서버(/api/data)는 같은 테이블이라도 요청자 신원에 따라 다른 행을 돌려준다 —
// 관리자 토큰=전체 행 · 고객 세션=본인 건 · 그 외=PII 제거 공개 행.
// 따라서 캐시 칸은 테이블명이 아니라 **테이블명 + 신원(scope)** 으로 가른다.

export interface DataAuthIdentity {
  adminToken?: string;
  sessionToken?: string;
  phone?: string;
}

// 신원 문자열(캐시 scope). 서버가 응답 범위를 정할 때 보는 값을 **전부** 넣는다.
// 우세한 토큰(관리자) 하나만 넣으면, 스테일 관리자 토큰이 남은 브라우저에서
// 고객 A 의 행이 로그아웃 뒤 로그인한 고객 B 에게 그대로 나간다
// (logoutCustomer 는 관리자 토큰을 지우지 않고, logoutAdmin 은 고객 세션을 지우지 않는다).
export function cacheScopeOf(auth: DataAuthIdentity | null | undefined): string {
  const admin = (auth?.adminToken || '').trim();
  const session = (auth?.sessionToken || '').trim();
  const phone = digitsOf(auth?.phone);
  if (!admin && !session && !phone) return 'anon';
  return `admin:${admin}|customer:${phone}:${session}`;
}

// 관리자 두 명이 동시에 편집하면 상대 변경이 최대 이 시간만큼 늦게 보인다.
// 현재도 수동 새로고침 전까지는 안 보이므로 악화가 아니다(쓰기 직후에는 무효화되어 즉시 최신값).
export const DATA_CACHE_TTL_MS = 30_000;

export interface LoadTableOptions {
  // true = 캐시·진행 중 요청을 건너뛰고 서버에서 새로 받는다.
  // 읽고-고쳐-쓰는 경로 전용 — 그 경로는 받은 배열을 통째로 다시 저장하므로
  // 30초 된 스냅샷을 근거로 쓰면 그 사이 다른 관리자가 바꾼 행이 되돌아간다(lost update).
  fresh?: boolean;
}

interface CacheRecord {
  scope: string;
  storedAt: number;
  rows: unknown[];
}

export class ScopedTableCache {
  private readonly ttlMs: number;
  private readonly now: () => number;
  private scope: string | null = null;
  private readonly records = new Map<string, CacheRecord>();
  private readonly inflight = new Map<string, Promise<unknown[]>>();

  constructor(opts: { ttlMs?: number; now?: () => number } = {}) {
    this.ttlMs = opts.ttlMs ?? DATA_CACHE_TTL_MS;
    this.now = opts.now ?? (() => Date.now());
  }

  // 신원이 바뀌면(로그인·로그아웃·계정 전환) 이전 사용자의 행을 전부 버린다.
  // 조회 경로가 모두 이 함수를 먼저 지나므로, 로그아웃 후 남은 메모리가 다음 사용자에게 노출되지 않는다.
  private useScope(scope: string): void {
    if (this.scope === scope) return;
    this.scope = scope;
    this.records.clear();
    this.inflight.clear();
  }

  clear(): void {
    this.scope = null;
    this.records.clear();
    this.inflight.clear();
  }

  // 쓰기 성공 직후 호출 — 다음 조회는 서버 값을 받는다.
  invalidate(...tables: string[]): void {
    for (const table of tables) {
      this.records.delete(table);
      this.inflight.delete(table);
    }
  }

  peek<T>(scope: string, table: string): T[] | undefined {
    this.useScope(scope);
    const hit = this.records.get(table);
    if (!hit) return undefined;
    if (hit.scope !== scope) return undefined; // 방어선 2 — 등급이 다른 행은 절대 재사용하지 않는다
    if (this.now() - hit.storedAt >= this.ttlMs) {
      this.records.delete(table);
      return undefined;
    }
    return hit.rows as T[];
  }

  load<T>(scope: string, table: string, fetcher: () => Promise<T[]>, fresh = false): Promise<T[]> {
    this.useScope(scope);

    if (!fresh) {
      const hit = this.peek<T>(scope, table);
      if (hit !== undefined) return Promise.resolve(hit);
      const pending = this.inflight.get(table);
      if (pending) return pending as Promise<T[]>;
    }

    const request = fetcher().then((rows) => {
      // 응답이 도착했을 때 신원이 이미 바뀌었으면 저장하지 않는다.
      if (this.scope === scope) {
        this.records.set(table, { scope, storedAt: this.now(), rows });
      }
      return rows;
    });

    if (!fresh) this.inflight.set(table, request as Promise<unknown[]>);

    // 성공·실패 모두 진행 중 목록에서 내린다. 실패는 캐시에 남기지 않는다.
    const settle = () => {
      if (this.inflight.get(table) === (request as Promise<unknown[]>)) this.inflight.delete(table);
    };
    request.then(settle, settle);

    return request;
  }
}

// 앱 전역 캐시(브라우저 전용 — 아래 loadTable 이 서버 렌더 시에는 우회한다).
const dataCache = new ScopedTableCache();

// 신원이 바뀌면 다음 조회에서 자동으로 비워지지만, 로그아웃 시점에 즉시 비우고 싶으면 이 함수를 부른다.
export function clearDataCache(): void {
  dataCache.clear();
}

// 방문 이력으로 견적 상태를 덮어써도 되는 단계(방문 이전 ~ 방문 단계) 화이트리스트.
// 여기에 없는 단계(견적서 작성중·견적서 송부완료·수주성공·수주실패·보류·취소)는
// 이미 방문 이후로 진행·종결된 건이므로 방문 이력을 나중에 넣어도 상태를 되돌리지 않는다.
const VISIT_SYNCABLE_STATUSES: readonly EstimateStatus[] = [
  '접수완료',
  '검토중',
  '추가자료요청',
  '출장견적 결제대기',
  '방문일정 조율중',
  '현장방문 예정',
  '현장방문 완료',
];

// ==========================================
// 2. 공통 비즈니스 로직 베이스 (저장소 비의존)
// ==========================================
// 모든 견적/고객/결제/방문/알림 처리 로직을 이곳에 둔다.
// 실제 데이터 입출력은 loadTable / persistTable 추상 메서드로 위임하여
// localStorage(Mock) 또는 Supabase 백엔드가 갈아끼워질 수 있게 한다.
abstract class BaseZerosService implements ZerosDataService {
  protected abstract loadTable<T>(key: string, opts?: LoadTableOptions): Promise<T[]>;
  protected abstract persistTable<T extends { id: string }>(key: string, rows: T[]): Promise<void>;

  // 읽고-고쳐-쓰는 경로 전용 조회. 이 경로는 받은 배열 전체를 다시 저장하므로 캐시를 쓰지 않는다 —
  // 30초 된 스냅샷을 통째로 upsert 하면 그 사이 다른 관리자가 바꾼 행이 되돌아간다(lost update).
  protected fresh<T>(key: string): Promise<T[]> {
    return this.loadTable<T>(key, { fresh: true });
  }

  // ---------- 견적 ----------
  async getEstimates(): Promise<Estimate[]> {
    return this.loadTable<Estimate>(TABLES.estimates);
  }

  async getEstimateById(id: string): Promise<Estimate | null> {
    const list = await this.getEstimates();
    return list.find(e => e.id === id) || null;
  }

  // 로컬(Mock) 경로는 서버 검증이 없으므로 opts.verifiedToken 을 쓰지 않는다.
  async createEstimate(estimate: Partial<Estimate>, opts?: CreateEstimateOptions): Promise<Estimate> {
    // 연락처 검증: 폼에서 필수·인증되지만, 누락/형식오류 시 가짜번호(010-0000-0000) 저장을 방지한다.
    const phone = (estimate.phone || '').trim();
    if (!/^01[0-9]{8,9}$/.test(phone.replace(/[^0-9]/g, ''))) {
      throw new Error('휴대폰 번호가 올바르지 않습니다. 접수를 진행할 수 없습니다.');
    }

    const list = await this.fresh<Estimate>(TABLES.estimates);

    // 접수번호 생성 로직 (ZR-YYYYMMDD-XXX)
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = list.filter(e => e.estimate_no.startsWith(`ZR-${todayStr}`)).length + 1;
    const estimateNo = `ZR-${todayStr}-${String(count).padStart(3, '0')}`;

    const newEstimate: Estimate = {
      id: `est-generated-uuid-${Math.random().toString(36).substr(2, 9)}`,
      estimate_no: estimateNo,
      created_at: new Date().toISOString(),
      customer_name: estimate.customer_name || '이름 없음',
      company_name: estimate.company_name || '',
      phone,
      email: estimate.email || '',
      site_address: estimate.site_address || '',
      customer_type: estimate.customer_type || '기타',
      work_type: estimate.work_type || '기타',
      site_type: estimate.site_type || '기타',
      work_purpose: estimate.work_purpose || '',
      expected_budget_range: estimate.expected_budget_range || '모름',
      desired_schedule: estimate.desired_schedule || '',
      urgency: estimate.urgency || false,
      description: estimate.description || '',
      request_detail: estimate.request_detail || '',
      estimate_category: estimate.estimate_category || 'unknown',
      accuracy_grade: estimate.accuracy_grade,
      status: '접수완료',
      admin_memo: '',
      payment_required: estimate.payment_required || false,
      payment_status: '미결제',
      submitted_files: estimate.submitted_files || []
    };

    list.unshift(newEstimate);
    await this.persistTable(TABLES.estimates, list);

    // 고객 정보 연계 자동 누적 처리
    await this.syncCustomerForEstimate(newEstimate);

    // 가상 접수 알림 로그 발송 처리
    await this.triggerNotification(newEstimate, '접수완료');

    // 예약방문 신청(출장 채널)이 함께 오면 방문 이력을 기록한다.
    if (opts?.visit && opts.visit.visit_date) {
      await this.createSiteVisit({ ...opts.visit, estimate_id: newEstimate.id });
    }

    return newEstimate;
  }

  // 고객 행 자체(신원·최근 접촉일)만 유지한다.
  // 누적 카운터·등급은 저장값이 아니라 /api/data 가 견적에서 파생 계산한 값을 화면이 쓴다.
  // 특히 customer_grade 는 여기서 건드리지 않는다 — 접수 한 건이 운영자가 지정한 등급을 덮어썼다.
  private async syncCustomerForEstimate(est: Estimate) {
    const customers = await this.fresh<Customer>(TABLES.customers);
    const existing = customers.find(c => c.phone === est.phone);

    if (existing) {
      existing.total_requests += 1; // 레거시 컬럼 유지용(표시 근거 아님)
      existing.last_contact_at = new Date().toISOString();
    } else {
      const newCustomer: Customer = {
        id: `cust-generated-uuid-${Math.random().toString(36).substr(2, 9)}`,
        customer_name: est.customer_name,
        company_name: est.company_name || '',
        phone: est.phone,
        email: est.email,
        site_address: est.site_address,
        customer_type: est.customer_type,
        customer_grade: '신규',
        total_requests: 1,
        total_won: 0,
        total_revenue: 0,
        last_contact_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      customers.unshift(newCustomer);
    }
    await this.persistTable(TABLES.customers, customers);
  }

  async updateEstimate(id: string, updates: Partial<Estimate>): Promise<Estimate> {
    const list = await this.fresh<Estimate>(TABLES.estimates);
    const idx = list.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Estimate not found');

    const original = list[idx];
    const updated: Estimate = { ...original, ...updates };

    // 수주성공 시점에 contract_won_at 날짜가 없다면 자동 설정
    if (updated.status === '수주성공' && original.status !== '수주성공') {
      updated.contract_won_at = new Date().toISOString();
      // 확정 계약금액은 공급가액(VAT 별도) 기준으로 복사한다.
      // estimated_amount 를 그대로 쓰면 구 저장값(VAT 포함)이 확정매출로 넘어가 매출이 10% 부풀었다.
      if (!updated.confirmed_contract_amount) {
        const supply = supplyAmountOf(updated);
        if (supply > 0) updated.confirmed_contract_amount = supply;
      }
    }

    // 견적서송부완료 시점에 estimate_sent_at 자동 기입
    if (updated.status === '견적서 송부완료' && original.status !== '견적서 송부완료') {
      updated.estimate_sent_at = new Date().toISOString();
    }

    list[idx] = updated;
    await this.persistTable(TABLES.estimates, list);

    // 고객 통계는 여기서 증감시키지 않는다(M6).
    // 저장 카운터를 가·감산하던 방식은 견적을 삭제해도 차감되지 않고, 수주 유지 중 계약금액을
    // 정정해도 반영되지 않았다. 이제 /api/data 가 고객 목록을 낼 때 견적에서 파생 계산한다.

    // 상태 변경 시 알림 로그 자동 트리거
    if (updates.status && original.status !== updates.status) {
      await this.triggerNotification(updated, updates.status);
    }

    return updated;
  }

  // ---------- 견적 삭제 ----------
  // Mock(localStorage)에서는 전체 배열을 다시 저장하므로 필터링만으로 삭제가 반영된다.
  // Supabase 서비스는 이 메서드를 오버라이드해 서버 delete op 를 호출한다.
  async deleteEstimate(id: string): Promise<void> {
    const [ests, pays, visits, logs] = await Promise.all([
      this.fresh<Estimate>(TABLES.estimates),
      this.fresh<Payment>(TABLES.payments),
      this.fresh<SiteVisit>(TABLES.siteVisits),
      this.fresh<NotificationLog>(TABLES.notificationLogs),
    ]);
    await Promise.all([
      this.persistTable(TABLES.estimates, ests.filter(e => e.id !== id)),
      this.persistTable(TABLES.payments, pays.filter(p => p.estimate_id !== id)),
      this.persistTable(TABLES.siteVisits, visits.filter(v => v.estimate_id !== id)),
      this.persistTable(TABLES.notificationLogs, logs.filter(l => l.estimate_id !== id)),
    ]);
  }

  private async triggerNotification(est: Estimate, status: string) {
    let templateCode = 'ZR_COMMON';
    let content = '';

    switch (status) {
      case '접수완료':
        templateCode = 'ZR_REG_COMPLETE';
        content = `[ZEROS 사전진단] ${est.customer_name}님, 의뢰하신 사전진단서가 정상적으로 접수되었습니다. (접수번호: ${est.estimate_no})`;
        break;
      case '검토중':
        templateCode = 'ZR_REVIEWING';
        content = `[ZEROS 사전진단] 접수번호 ${est.estimate_no} 건에 대한 담당 엔지니어 정밀 자료 검토가 개시되었습니다.`;
        break;
      case '추가자료요청':
        templateCode = 'ZR_REQ_DOCS';
        content = `[ZEROS 사전진단] ${est.customer_name}님, 정확한 설비 분석을 위해 배치도 또는 현장 추가 사진 보완 요청이 발생하였습니다.`;
        break;
      case '출장견적 결제대기':
        templateCode = 'ZR_PAY_WAIT';
        content = `[ZEROS 사전진단] 현장 실측을 위한 출장견적비 결제 대기 상태입니다. 토스페이먼츠 안전 결제 모듈을 통해 결제를 완료해 주세요.`;
        break;
      case '현장방문 예정':
        templateCode = 'ZR_VISIT_PLAN';
        content = `[ZEROS 사전진단] 현장 레이저 실측 조율이 완료되었습니다. 방문 일정: ${est.desired_schedule || '조율 중'}`;
        break;
      case '현장방문 완료':
        templateCode = 'ZR_VISIT_COMPLETE';
        content = `[ZEROS 사전진단] 기계실 및 배관 라인 현장 실측이 성공적으로 완료되었습니다. 진단서 산출을 진행합니다.`;
        break;
      case '견적서 송부완료':
        templateCode = 'ZR_QUOTE_SENT';
        content = `[ZEROS 사전진단] 접수번호 ${est.estimate_no} 건의 최종 범위 고정 진단서 및 예상 원가 검토서가 송부되었습니다.`;
        break;
      case '수주성공':
        templateCode = 'ZR_WON_COMPLETE';
        content = `[ZEROS 사전진단] 축하합니다! ${est.company_name || est.customer_name} 건의 최종 수주 계약 체결이 완료되었습니다.`;
        break;
      default:
        templateCode = 'ZR_STATUS_UPDATE';
        content = `[ZEROS 사전진단] 의뢰 건(번호: ${est.estimate_no})의 진행 상태가 [${status}]로 업데이트되었습니다.`;
    }

    await this.createNotificationLog({
      estimate_id: est.id,
      estimate_no: est.estimate_no,
      customer_name: est.customer_name,
      phone: est.phone,
      notification_type: '카카오톡 알림톡',
      template_code: templateCode,
      content,
    });
  }

  // ---------- 알림 로그 ----------
  async getNotificationLogs(): Promise<NotificationLog[]> {
    return this.loadTable<NotificationLog>(TABLES.notificationLogs);
  }

  // 이 경로는 브라우저에서 이력 행만 만든다 — 알림톡·문자 발송 API를 호출하지 않는다.
  // 따라서 기본 상태는 '미발송'이다(과거엔 발송 없이 '발송완료'로 고정해 이력이 거짓이었다).
  // 실제 발송 결과를 남기려면 서버 발송 경로가 status 를 명시적으로 넘겨야 한다.
  async createNotificationLog(log: Partial<NotificationLog>): Promise<NotificationLog> {
    const list = await this.fresh<NotificationLog>(TABLES.notificationLogs);
    const newLog: NotificationLog = {
      id: `ntf-generated-uuid-${Math.random().toString(36).substr(2, 9)}`,
      estimate_id: log.estimate_id || '',
      estimate_no: log.estimate_no || '',
      customer_name: log.customer_name || '고객',
      phone: log.phone || '010-0000-0000',
      notification_type: log.notification_type || '카카오톡 알림톡',
      template_code: log.template_code || 'ZR_COMMON',
      content: log.content || '',
      status: log.status || '미발송',
      sent_at: new Date().toISOString()
    };
    list.unshift(newLog);
    await this.persistTable(TABLES.notificationLogs, list);
    return newLog;
  }

  // ---------- 결제 ----------
  async getPayments(): Promise<Payment[]> {
    return this.loadTable<Payment>(TABLES.payments);
  }

  async createPayment(payment: Partial<Payment>): Promise<Payment> {
    const list = await this.fresh<Payment>(TABLES.payments);
    const newPayment: Payment = {
      id: `pay-generated-uuid-${Math.random().toString(36).substr(2, 9)}`,
      estimate_id: payment.estimate_id || '',
      payment_type: payment.payment_type || '출장견적비',
      amount: payment.amount || 0,
      payment_status: payment.payment_status || '결제대기',
      payment_provider: payment.payment_provider,
      transaction_id: payment.transaction_id,
      paid_at: payment.payment_status === '결제완료' ? new Date().toISOString() : undefined,
      created_at: new Date().toISOString(),
      memo: payment.memo
    };

    list.unshift(newPayment);
    await this.persistTable(TABLES.payments, list);

    // 견적의 결제상태는 방금 만든 행 하나가 아니라 그 견적의 Payment 행 집합에서 파생한다.
    // (행 하나만 반영하면 이미 결제완료된 건에 새 청구가 생겼을 때 상태가 뒤로 밀렸다.)
    if (newPayment.estimate_id) {
      const rows = list.filter(p => p.estimate_id === newPayment.estimate_id);
      await this.updateEstimate(newPayment.estimate_id, {
        payment_status: derivePaymentStatus(rows),
        payment_required: true
      });
    }

    return newPayment;
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
    const list = await this.fresh<Payment>(TABLES.payments);
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Payment not found');

    const updated: Payment = { ...list[idx], ...updates };
    if (updated.payment_status === '결제완료' && list[idx].payment_status !== '결제완료') {
      updated.paid_at = new Date().toISOString();
    }

    list[idx] = updated;
    await this.persistTable(TABLES.payments, list);

    // 결제상태는 갱신된 행 하나가 아니라 그 견적의 Payment 행 집합에서 파생한다.
    if (updated.estimate_id) {
      const rows = list.filter(p => p.estimate_id === updated.estimate_id);
      await this.updateEstimate(updated.estimate_id, {
        payment_status: derivePaymentStatus(rows)
      });
    }

    return updated;
  }

  // ---------- 현장방문 ----------
  async getSiteVisits(): Promise<SiteVisit[]> {
    return this.loadTable<SiteVisit>(TABLES.siteVisits);
  }

  // 방문 이력 → 견적 상태 동기화(가드 포함). 방문 레코드 저장 자체와는 분리돼 있어,
  // 상태를 바꾸지 않는 경우에도 방문 이력은 그대로 남는다.
  private async syncEstimateStatusForVisit(estimateId: string, visitStatus: SiteVisit['visit_status']) {
    if (!estimateId) return;

    // 방문 취소는 견적 상태를 건드리지 않는다(과거엔 '현장방문 예정'으로 잘못 매핑됐다).
    if (visitStatus === '취소') return;

    const nextStatus: EstimateStatus = visitStatus === '완료' ? '현장방문 완료' : '현장방문 예정';

    // 판정용 조회도 캐시를 쓰지 않는다 — 30초 된 상태로 "이미 같은 상태"를 판정하면 동기화가 조용히 누락된다.
    // 대부분의 호출은 아래 세 가드에서 걸러져 updateEstimate 의 재조회·전체 저장까지 가지 않으므로
    // 기존(무조건 updateEstimate) 대비 오히려 왕복이 줄어든다.
    const current = (await this.fresh<Estimate>(TABLES.estimates)).find(e => e.id === estimateId);
    if (!current) return;
    if (current.status === nextStatus) return; // 이미 같은 상태면 저장·알림 불필요
    if (!VISIT_SYNCABLE_STATUSES.includes(current.status)) return; // 방문 이후 단계는 보존

    await this.updateEstimate(estimateId, { status: nextStatus });
  }

  async createSiteVisit(visit: Partial<SiteVisit>): Promise<SiteVisit> {
    const list = await this.fresh<SiteVisit>(TABLES.siteVisits);
    const newVisit: SiteVisit = {
      id: `visit-generated-uuid-${Math.random().toString(36).substr(2, 9)}`,
      estimate_id: visit.estimate_id || '',
      visit_date: visit.visit_date || new Date().toISOString().slice(0, 10),
      visitor_name: visit.visitor_name || '미배정',
      visit_purpose: visit.visit_purpose || '현장 실측',
      visit_status: visit.visit_status || '예정',
      visit_result: visit.visit_result || '',
      site_memo: visit.site_memo || '',
      risk_memo: visit.risk_memo || '',
      next_action: visit.next_action || '',
      created_at: new Date().toISOString()
    };

    list.unshift(newVisit);
    await this.persistTable(TABLES.siteVisits, list);

    // 견적 상태 동기화는 방문 이전 단계일 때만(가드는 syncEstimateStatusForVisit).
    await this.syncEstimateStatusForVisit(newVisit.estimate_id, newVisit.visit_status);

    return newVisit;
  }

  async updateSiteVisit(id: string, updates: Partial<SiteVisit>): Promise<SiteVisit> {
    const list = await this.fresh<SiteVisit>(TABLES.siteVisits);
    const idx = list.findIndex(v => v.id === id);
    if (idx === -1) throw new Error('SiteVisit not found');

    const updated: SiteVisit = { ...list[idx], ...updates };
    list[idx] = updated;
    await this.persistTable(TABLES.siteVisits, list);

    await this.syncEstimateStatusForVisit(updated.estimate_id, updated.visit_status);

    return updated;
  }

  // ---------- 고객 ----------
  // 반환 행의 total_requests·total_won·total_revenue·customer_grade 는
  // 서버(/api/data)가 견적에서 파생 계산해 채운 값이다. 저장 카운터 컬럼은 레거시 호환으로만 남아 있다.
  async getCustomers(): Promise<Customer[]> {
    return this.loadTable<Customer>(TABLES.customers);
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const list = await this.fresh<Customer>(TABLES.customers);
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Customer not found');

    const updated: Customer = { ...list[idx], ...updates };
    list[idx] = updated;
    await this.persistTable(TABLES.customers, list);
    return updated;
  }

  // ---------- 관리자 ----------
  async getAdminUsers(): Promise<AdminUser[]> {
    return this.loadTable<AdminUser>(TABLES.adminUsers);
  }
}

// ==========================================
// 3. LocalStorage 기반 영속 Mock 서비스 (폴백 어댑터)
// ==========================================
class MockZerosService extends BaseZerosService {
  private isInitialized = false;

  private init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') return;

    // 시드 버전이 바뀌면 견적 표본을 새로 적재(실적 시각화용 테스트 데이터 갱신).
    // 사용자가 직접 입력한 건은 다음 버전 변경 전까지 유지된다.
    if (localStorage.getItem(SEED_VERSION_KEY) !== SEED_VERSION) {
      localStorage.setItem(TABLES.estimates, JSON.stringify(mockEstimates));
      localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
    }

    if (!localStorage.getItem(TABLES.estimates)) {
      localStorage.setItem(TABLES.estimates, JSON.stringify(mockEstimates));
    }
    if (!localStorage.getItem(TABLES.customers)) {
      localStorage.setItem(TABLES.customers, JSON.stringify(mockCustomers));
    }
    if (!localStorage.getItem(TABLES.payments)) {
      localStorage.setItem(TABLES.payments, JSON.stringify(mockPayments));
    }
    if (!localStorage.getItem(TABLES.siteVisits)) {
      localStorage.setItem(TABLES.siteVisits, JSON.stringify(mockSiteVisits));
    }
    if (!localStorage.getItem(TABLES.adminUsers)) {
      localStorage.setItem(TABLES.adminUsers, JSON.stringify(mockAdminUsers));
    }
    if (!localStorage.getItem(TABLES.notificationLogs)) {
      localStorage.setItem(TABLES.notificationLogs, JSON.stringify([]));
    }
    this.isInitialized = true;
  }

  protected async loadTable<T>(key: string): Promise<T[]> {
    this.init();
    if (typeof window === 'undefined') return [];
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T[]) : [];
  }

  protected async persistTable<T extends { id: string }>(key: string, rows: T[]): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(rows));
  }
}

// ==========================================
// 4. Supabase 기반 영속 서비스 (서버 게이트웨이 경유)
// ==========================================
// 브라우저에서 anon 키로 테이블을 직접 읽고 쓰던 구조(전 고객 PII 공개 노출)를 폐기하고,
// 모든 데이터 입출력을 /api/data(service_role + 신원 검증)로 우회한다.
//  - 읽기: 관리자=전체 / 고객=본인 건 / 익명=개인정보 제거 분석 행
//  - 쓰기: 관리자 전용 (upsert)
//  - 공개 접수: OTP 토큰 검증 후 서버가 단건 생성(createEstimate)
class SupabaseZerosService extends BaseZerosService {
  // 브라우저에 저장된 신원 토큰을 요청 본문에 실어 서버가 권한을 판정하게 한다.
  private authBody(): DataAuthIdentity {
    if (typeof window === 'undefined') return {};
    const adminToken = localStorage.getItem('zeros_admin_token') || undefined;
    let sessionToken: string | undefined;
    let phone: string | undefined;
    try {
      const raw = localStorage.getItem('zeros_customer_auth');
      if (raw) {
        const a = JSON.parse(raw) as { sessionToken?: string; phone?: string };
        sessionToken = a.sessionToken || undefined;
        phone = a.phone || undefined;
      }
    } catch {
      // 저장값 파싱 실패는 비인증으로 간주
    }
    return { adminToken, sessionToken, phone };
  }

  private async postData<R>(payload: Record<string, unknown>, auth: DataAuthIdentity = this.authBody()): Promise<R> {
    const res = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, ...auth }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // 401 = 세션 만료·무효. 스테일 관리자 토큰을 그대로 두면 이후 모든 요청에 계속 실려
      // 무효 상태가 고착되므로 여기서 폐기한다(수동 로그아웃 전까지 남던 문제).
      if (res.status === 401 && typeof window !== 'undefined') {
        try {
          localStorage.removeItem('zeros_admin_token');
          localStorage.removeItem('zeros_admin_authed');
        } catch {
          // 스토리지 접근 불가 환경은 무시
        }
        // 신원이 방금 바뀌었다 — 만료된 신원으로 받아 둔 행은 즉시 버린다.
        dataCache.clear();
      }
      throw new DataRequestError((data as { error?: string }).error || '데이터 요청에 실패했습니다.', res.status);
    }
    return data as R;
  }

  // 실패를 빈 배열로 삼키면 서버 장애·세션 만료가 전 화면에서 "데이터 0건"으로 위장된다.
  // 오류는 그대로 전파하고, 표시 방식은 호출한 화면이 결정한다(모든 호출부에 try/catch 있음).
  protected async loadTable<T>(key: string, opts?: LoadTableOptions): Promise<T[]> {
    const auth = this.authBody();
    const fetchRows = async (): Promise<T[]> => {
      const { rows } = await this.postData<{ rows: T[] }>({ op: 'list', table: key }, auth);
      return rows || [];
    };

    // 서버 렌더(SSR)에서는 캐시를 쓰지 않는다 — 모듈 전역 캐시가 프로세스에 남아
    // 다른 요청자에게 넘어갈 수 있다. 브라우저에서만 신원별로 캐시한다.
    if (typeof window === 'undefined') return fetchRows();

    return dataCache.load<T>(cacheScopeOf(auth), key, fetchRows, opts?.fresh);
  }

  protected async persistTable<T extends { id: string }>(key: string, rows: T[]): Promise<void> {
    if (rows.length === 0) return;
    await this.postData<{ ok: boolean }>({ op: 'upsert', table: key, rows });
    dataCache.invalidate(key); // 쓰기 성공 직후 무효화 — 다음 조회는 방금 저장한 값을 본다
  }

  // 공개 접수는 서버가 인증 검증 + 접수번호 채번 + 단건 생성을 수행한다.
  // verifiedToken(30분)은 로그인 세션이 아니라 이번 인증에서 막 받은 값이라 authBody() 가 아니라
  // 호출부가 넘긴다 — 이 경로가 없으면 SMS 설정 환경에서 서버 okVerified 가 항상 false 가 된다.
  async createEstimate(estimate: Partial<Estimate>, opts?: CreateEstimateOptions): Promise<Estimate> {
    const { estimate: created } = await this.postData<{ estimate: Estimate }>({
      op: 'createEstimate',
      estimate,
      visit: opts?.visit,
      verifiedToken: opts?.verifiedToken,
    });
    // 서버 한 번의 접수로 견적·고객·알림(+출장 채널은 방문)이 함께 바뀐다 — 네 테이블 모두 무효화한다.
    dataCache.invalidate(TABLES.estimates, TABLES.customers, TABLES.notificationLogs, TABLES.siteVisits);
    return created;
  }

  // 삭제는 upsert 로 표현할 수 없으므로 서버 delete op(관리자 전용)로 위임한다.
  async deleteEstimate(id: string): Promise<void> {
    await this.postData<{ ok: boolean }>({ op: 'deleteEstimate', id });
    // 서버가 연관 결제·방문·알림 행까지 지운다 — 함께 무효화한다.
    dataCache.invalidate(TABLES.estimates, TABLES.payments, TABLES.siteVisits, TABLES.notificationLogs);
  }
}

// ==========================================
// 5. 환경에 따라 서비스 자동 선택
// ==========================================
// Supabase 키가 설정되어 있으면 클라우드 서비스, 아니면 localStorage Mock 으로 폴백한다.
export const ZerosService: ZerosDataService = isSupabaseEnabled
  ? new SupabaseZerosService()
  : new MockZerosService();
