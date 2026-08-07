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

// 견적서 품목 한 줄 — 금액은 qty * unit_price로 파생 계산(저장 시점 값 고정 아님)
export interface EstimateLineItem {
  id: string;
  name: string; // 품명
  spec: string; // 규격
  qty: number;
  unit: string; // 식 · 공수 · m 등
  unit_price: number; // 원
  note?: string;
}

export interface FileMeta {
  id: string;
  estimate_id: string;
  file_name: string;
  file_type: string;
  file_url: string;      // (구버전 호환) 과거 공개 URL — 신규 업로드는 빈 문자열
  file_path?: string;    // Storage 내부 경로 — 열람은 서명 URL API(/api/files/sign)로만
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
  payment_required: boolean;
  payment_status: '미결제' | '결제대기' | '결제완료' | '환불';
  estimated_amount?: number;
  confirmed_contract_amount?: number;
  estimate_sent_at?: string;
  contract_won_at?: string;
  estimate_pdf_url?: string;
  submitted_files?: FileMeta[];
  line_items?: EstimateLineItem[];
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
  // 표시 등급. 읽는 시점에 lib/crm/customerRollup 의 gradeOf 가 산출한 값이 실린다
  // (수동 지정이 있으면 그 값, 없으면 견적 이력에서 자동 산출).
  customer_grade: '신규' | '재문의' | '중요고객' | '수주고객' | '보류고객';
  // 운영자가 직접 지정한 등급. 자동 산출보다 우선한다.
  // 비어 있고 customer_grade 가 '중요고객'·'보류고객'이면 서버가 수동 지정으로 간주해 보존한다(백필 불필요).
  customer_grade_manual?: string;
  // ⚠ 아래 3개 저장 카운터는 레거시 호환 컬럼이다 — 표시 근거가 아니다.
  // 화면에 나가는 값은 /api/data 가 견적 행에서 매번 파생 계산한다(rollupCustomer).
  total_requests: number;
  total_won: number;
  total_revenue: number;
  memo?: string;
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
  // '미발송' = 이력만 남고 실제 발송 API 호출이 없었던 건.
  // 브라우저(client.ts)·접수 라우트가 만드는 로그는 문자 발송 경로를 타지 않으므로 전부 '미발송'이다.
  status: '발송완료' | '발송오류' | '미발송';
  sent_at: string;
}

