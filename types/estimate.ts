export type WorkType =
  | '배관공사'
  | '장비설치'
  | '배관+장비설치'
  | 'Utility 배관'
  | '공장증설'
  | '노후배관교체'
  | '기계실개선'
  | '생산설비 배관 연결'
  | 'CAPEX 개·증설 검토'
  | '기타';

export type SiteType =
  | '공장'
  | '상가'
  | '건물'
  | '식품'
  | '제약·바이오'
  | '물류센터'
  | '기계실'
  | '기타';

export type ExpectedBudgetRange =
  | '≤1,000만'
  | '1,000만~1억'
  | '≥1억'
  | '모름';

export type EstimateCategory = 'small' | 'medium' | 'large' | 'unknown';

export type AccuracyGrade = 'A' | 'B' | 'C' | 'D';

export type EstimateStatus =
  | '접수완료'
  | '검토중'
  | '추가자료요청'
  | '출장견적 결제대기'
  | '방문일정 조율중'
  | '현장방문 예정'
  | '현장방문 완료'
  | '견적서 작성중'
  | '견적서 송부완료'
  | '수주성공'
  | '수주실패'
  | '보류'
  | '취소';

export interface FileMeta {
  id: string;
  estimate_id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_category: string;
  file_size?: number; // 바이트 단위 (총량 한도 계산용)
  uploaded_at: string;
}

export interface Estimate {
  id: string;
  estimate_no: string;
  created_at: string;
  customer_name: string;
  company_name: string;
  phone: string;
  email: string;
  site_address: string;
  customer_type: string;
  work_type: WorkType;
  site_type: SiteType;
  work_purpose: string;
  expected_budget_range: ExpectedBudgetRange;
  desired_schedule: string;
  urgency: boolean;
  description: string;
  request_detail?: string;
  estimate_category: EstimateCategory;
  accuracy_grade?: AccuracyGrade;
  status: EstimateStatus;
  admin_memo?: string;
  assigned_admin?: string;
  payment_required: boolean;
  payment_status: '미결제' | '결제대기' | '결제완료' | '환불';
  estimated_amount?: number;
  confirmed_contract_amount?: number;
  estimate_sent_at?: string;
  contract_won_at?: string;
  contract_lost_reason?: string;
  estimate_pdf_url?: string;
  submitted_files?: FileMeta[];
}

export interface Payment {
  id: string;
  estimate_id: string;
  payment_type: '온라인검토비' | '출장견적비' | '프로젝트 사전진단비';
  amount: number;
  payment_status: '미결제' | '결제대기' | '결제완료' | '환불';
  payment_provider?: string;
  transaction_id?: string;
  paid_at?: string;
  created_at: string;
  memo?: string;
}

export interface SiteVisit {
  id: string;
  estimate_id: string;
  visit_date: string;
  visitor_name: string;
  visit_purpose: string;
  visit_status: '예정' | '완료' | '취소';
  visit_result?: string;
  site_memo?: string;
  risk_memo?: string;
  next_action?: string;
  created_at: string;
}

export interface Customer {
  id: string;
  customer_name: string;
  company_name: string;
  phone: string;
  email: string;
  site_address: string;
  customer_type: string;
  customer_grade: '신규' | '재문의' | '중요고객' | '수주고객' | '보류고객';
  total_requests: number;
  total_won: number;
  total_revenue: number;
  last_contact_at: string;
  memo?: string;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'viewer';
  created_at: string;
}

export interface NotificationLog {
  id: string;
  estimate_id: string;
  estimate_no: string;
  customer_name: string;
  phone: string;
  notification_type: '카카오톡 알림톡' | '이메일 발송';
  template_code: string;
  content: string;
  status: '발송완료' | '발송오류';
  sent_at: string;
}

