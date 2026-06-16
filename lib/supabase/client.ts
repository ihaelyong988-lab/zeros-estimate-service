'use client';

import { Estimate, Customer, SiteVisit, Payment, AdminUser, NotificationLog } from '@/types/estimate';
import { mockAdminUsers, mockCustomers, mockEstimates, mockPayments, mockSiteVisits } from './mock-data';
import { getSupabase, isSupabaseEnabled } from './supabaseBrowser';

// ==========================================
// 1. ZEROS 사전진단 데이터 서비스 표준 인터페이스
// ==========================================
export interface ZerosDataService {
  // 견적 관련
  getEstimates: () => Promise<Estimate[]>;
  getEstimateById: (id: string) => Promise<Estimate | null>;
  createEstimate: (estimate: Partial<Estimate>) => Promise<Estimate>;
  updateEstimate: (id: string, updates: Partial<Estimate>) => Promise<Estimate>;

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

// ==========================================
// 2. 공통 비즈니스 로직 베이스 (저장소 비의존)
// ==========================================
// 모든 견적/고객/결제/방문/알림 처리 로직을 이곳에 둔다.
// 실제 데이터 입출력은 loadTable / persistTable 추상 메서드로 위임하여
// localStorage(Mock) 또는 Supabase 백엔드가 갈아끼워질 수 있게 한다.
abstract class BaseZerosService implements ZerosDataService {
  protected abstract loadTable<T>(key: string): Promise<T[]>;
  protected abstract persistTable<T extends { id: string }>(key: string, rows: T[]): Promise<void>;

  // ---------- 견적 ----------
  async getEstimates(): Promise<Estimate[]> {
    return this.loadTable<Estimate>(TABLES.estimates);
  }

  async getEstimateById(id: string): Promise<Estimate | null> {
    const list = await this.getEstimates();
    return list.find(e => e.id === id) || null;
  }

  async createEstimate(estimate: Partial<Estimate>): Promise<Estimate> {
    // 연락처 검증: 폼에서 필수·인증되지만, 누락/형식오류 시 가짜번호(010-0000-0000) 저장을 방지한다.
    const phone = (estimate.phone || '').trim();
    if (!/^01[0-9]{8,9}$/.test(phone.replace(/[^0-9]/g, ''))) {
      throw new Error('휴대폰 번호가 올바르지 않습니다. 접수를 진행할 수 없습니다.');
    }

    const list = await this.getEstimates();

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

    return newEstimate;
  }

  private async syncCustomerForEstimate(est: Estimate) {
    const customers = await this.loadTable<Customer>(TABLES.customers);
    const existing = customers.find(c => c.phone === est.phone);

    if (existing) {
      existing.total_requests += 1;
      existing.last_contact_at = new Date().toISOString();
      if (est.status === '수주성공') {
        existing.total_won += 1;
        existing.total_revenue += est.confirmed_contract_amount || 0;
        existing.customer_grade = '수주고객';
      } else {
        existing.customer_grade = '재문의';
      }
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
    const list = await this.getEstimates();
    const idx = list.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Estimate not found');

    const original = list[idx];
    const updated: Estimate = { ...original, ...updates };

    // 수주성공 시점에 contract_won_at 날짜가 없다면 자동 설정
    if (updated.status === '수주성공' && original.status !== '수주성공') {
      updated.contract_won_at = new Date().toISOString();
      if (!updated.confirmed_contract_amount && updated.estimated_amount) {
        updated.confirmed_contract_amount = updated.estimated_amount;
      }
    }

    // 견적서송부완료 시점에 estimate_sent_at 자동 기입
    if (updated.status === '견적서 송부완료' && original.status !== '견적서 송부완료') {
      updated.estimate_sent_at = new Date().toISOString();
    }

    list[idx] = updated;
    await this.persistTable(TABLES.estimates, list);

    // 고객 통계 리액티브 동기화
    await this.syncCustomerForEstimate(updated);

    // 상태 변경 시 알림 로그 자동 트리거
    if (updates.status && original.status !== updates.status) {
      await this.triggerNotification(updated, updates.status);
    }

    return updated;
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

  async createNotificationLog(log: Partial<NotificationLog>): Promise<NotificationLog> {
    const list = await this.getNotificationLogs();
    const newLog: NotificationLog = {
      id: `ntf-generated-uuid-${Math.random().toString(36).substr(2, 9)}`,
      estimate_id: log.estimate_id || '',
      estimate_no: log.estimate_no || '',
      customer_name: log.customer_name || '고객',
      phone: log.phone || '010-0000-0000',
      notification_type: log.notification_type || '카카오톡 알림톡',
      template_code: log.template_code || 'ZR_COMMON',
      content: log.content || '',
      status: '발송완료',
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
    const list = await this.getPayments();
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

    // 견적서 테이블 결제상태 동기화
    if (newPayment.estimate_id) {
      await this.updateEstimate(newPayment.estimate_id, {
        payment_status: newPayment.payment_status,
        payment_required: true
      });
    }

    return newPayment;
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
    const list = await this.getPayments();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Payment not found');

    const updated: Payment = { ...list[idx], ...updates };
    if (updated.payment_status === '결제완료' && list[idx].payment_status !== '결제완료') {
      updated.paid_at = new Date().toISOString();
    }

    list[idx] = updated;
    await this.persistTable(TABLES.payments, list);

    // 견적서 테이블 결제상태 동기화
    if (updated.estimate_id) {
      await this.updateEstimate(updated.estimate_id, {
        payment_status: updated.payment_status
      });
    }

    return updated;
  }

  // ---------- 현장방문 ----------
  async getSiteVisits(): Promise<SiteVisit[]> {
    return this.loadTable<SiteVisit>(TABLES.siteVisits);
  }

  async createSiteVisit(visit: Partial<SiteVisit>): Promise<SiteVisit> {
    const list = await this.getSiteVisits();
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

    // 견적서 테이블의 상태도 '현장방문 예정' 등으로 자동 동기화
    if (newVisit.estimate_id) {
      await this.updateEstimate(newVisit.estimate_id, {
        status: newVisit.visit_status === '완료' ? '현장방문 완료' : '현장방문 예정'
      });
    }

    return newVisit;
  }

  async updateSiteVisit(id: string, updates: Partial<SiteVisit>): Promise<SiteVisit> {
    const list = await this.getSiteVisits();
    const idx = list.findIndex(v => v.id === id);
    if (idx === -1) throw new Error('SiteVisit not found');

    const updated: SiteVisit = { ...list[idx], ...updates };
    list[idx] = updated;
    await this.persistTable(TABLES.siteVisits, list);

    if (updated.estimate_id) {
      await this.updateEstimate(updated.estimate_id, {
        status: updated.visit_status === '완료' ? '현장방문 완료' : '현장방문 예정'
      });
    }

    return updated;
  }

  // ---------- 고객 ----------
  async getCustomers(): Promise<Customer[]> {
    return this.loadTable<Customer>(TABLES.customers);
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const list = await this.getCustomers();
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
// 4. Supabase 기반 영속 서비스 (실제 클라우드 저장)
// ==========================================
// 각 테이블은 { id text PK, data jsonb, created_at timestamptz } 스키마를 사용한다.
// 전체 배열을 upsert(onConflict: id) 하여 메모리 상태를 클라우드에 반영한다.
class SupabaseZerosService extends BaseZerosService {
  private seededAdmins = false;

  protected async loadTable<T>(key: string): Promise<T[]> {
    const supabase = getSupabase();
    if (!supabase) return [];

    // 관리자 계정은 최초 1회 시드 (없으면 기본 계정 주입)
    if (key === TABLES.adminUsers && !this.seededAdmins) {
      this.seededAdmins = true;
      const { data } = await supabase.from(key).select('id').limit(1);
      if (!data || data.length === 0) {
        await this.persistTable(TABLES.adminUsers, mockAdminUsers);
      }
    }

    const { data, error } = await supabase
      .from(key)
      .select('data, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[Supabase] ${key} 로드 실패:`, error.message);
      return [];
    }
    return (data || []).map(row => row.data as T);
  }

  protected async persistTable<T extends { id: string }>(key: string, rows: T[]): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;

    if (rows.length === 0) return;

    const payload = rows.map(r => ({ id: r.id, data: r }));
    const { error } = await supabase.from(key).upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error(`[Supabase] ${key} 저장 실패:`, error.message);
      throw new Error(`데이터 저장 실패(${key}): ${error.message}`);
    }
  }
}

// ==========================================
// 5. 환경에 따라 서비스 자동 선택
// ==========================================
// Supabase 키가 설정되어 있으면 클라우드 서비스, 아니면 localStorage Mock 으로 폴백한다.
export const ZerosService: ZerosDataService = isSupabaseEnabled
  ? new SupabaseZerosService()
  : new MockZerosService();
