import { Estimate, Payment } from '@/types/estimate';
import { supplyAmountOf } from '@/lib/quote/amounts';
import { outstandingAmount as outstandingFromPayments } from '@/lib/payments/status';

// 모든 금액 지표 단위 = 공급가액(VAT 별도).
// 견적 금액은 supplyAmountOf 로만 읽는다(est.estimated_amount 직접 참조 금지 — 구 저장값이 VAT 포함일 수 있다).

export interface PerformanceMetrics {
  totalCount: number;
  newCount: number;
  reviewingCount: number;
  visitWaitingCount: number;
  visitCompletedCount: number;
  quoteWritingCount: number;
  quoteSentCount: number;
  wonCount: number;
  lostCount: number;
  
  // 전환율 및 비율 (0 나눗셈 방지)
  quoteConversionRate: number; // 견적서송부 / 전체접수 * 100
  wonConversionRate: number;   // 수주성공 / 견적서송부 * 100
  visitConversionRate: number; // 출장견적 / 전체접수 * 100
  
  // 금액 관련
  averageQuoteAmount: number;   // 견적금액합계 / 견적서송부건수
  expectedRevenue: number;      // 상태(견적서작성중|송부완료) 견적금액 합
  confirmedRevenue: number;     // 상태(수주성공) 계약금액 합
  outstandingAmount: number;    // 서비스 수수료 미수금 = Payment 청구액 − 수납액

  // 기간 관련
  averageProcessDays: number;   // avg(견적서송부일 - 접수일)
}

/** 예상매출 대상 = 견적서를 만들었거나 보낸 단계. 수주·실주로 확정되기 전 파이프라인. */
const EXPECTED_REVENUE_STATUSES: readonly Estimate['status'][] = ['견적서 작성중', '견적서 송부완료'];

/**
 * 예상매출 = 파이프라인 단계 견적의 공급가액(VAT 별도) 합.
 * 같은 산식이 관리자 대시보드·우측 패널에도 필요해 여기 한 곳에 둔다 —
 * 화면마다 따로 쓰면 한쪽만 고쳐져 숫자가 갈라진다(AGENTS §14-4).
 */
export function sumExpectedRevenue(estimates: Estimate[]): number {
  return estimates
    .filter(e => EXPECTED_REVENUE_STATUSES.includes(e.status))
    .reduce((acc, curr) => acc + supplyAmountOf(curr), 0);
}

/**
 * ZEROS 사전진단 데이터셋 기반 실시간 KPI 통계 지표 연산.
 * payments 는 미수금 산출 근거다 — 넘기지 않으면 미수금 0으로 집계된다.
 */
export function calculatePerformanceMetrics(
  estimates: Estimate[],
  payments: Payment[] = []
): PerformanceMetrics {
  const totalCount = estimates.length;
  
  // 상태별 단순 카운팅
  const newCount = estimates.filter(e => e.status === '접수완료').length;
  const reviewingCount = estimates.filter(e => e.status === '검토중' || e.status === '추가자료요청').length;
  const visitWaitingCount = estimates.filter(e => e.status === '현장방문 예정' || e.status === '방문일정 조율중').length;
  const visitCompletedCount = estimates.filter(e => e.status === '현장방문 완료').length;
  const quoteWritingCount = estimates.filter(e => e.status === '견적서 작성중').length;
  const quoteSentCount = estimates.filter(e => e.status === '견적서 송부완료' || e.status === '수주성공' || e.status === '수주실패').length;
  const wonCount = estimates.filter(e => e.status === '수주성공').length;
  const lostCount = estimates.filter(e => e.status === '수주실패').length;

  // 1. 견적전환율 = 견적서송부 / 전체접수 * 100 (0 나눗셈 방지)
  const quoteConversionRate = totalCount > 0 
    ? Number(((quoteSentCount / totalCount) * 100).toFixed(1)) 
    : 0;

  // 2. 수주전환율 = 수주성공 / 견적서송부 * 100 (0 나눗셈 방지)
  const wonConversionRate = quoteSentCount > 0 
    ? Number(((wonCount / quoteSentCount) * 100).toFixed(1)) 
    : 0;

  // 3. 출장전환율 (방문예정 + 완료 + 조율중) / 전체접수 * 100
  const visitCount = estimates.filter(e => 
    e.status === '방문일정 조율중' || 
    e.status === '현장방문 예정' || 
    e.status === '현장방문 완료' ||
    e.status === '출장견적 결제대기'
  ).length;
  const visitConversionRate = totalCount > 0 
    ? Number(((visitCount / totalCount) * 100).toFixed(1)) 
    : 0;

  // 4. 평균 견적 금액 (견적서송부 및 성공건 대상)
  const quoteSentList = estimates.filter(e =>
    (e.status === '견적서 송부완료' || e.status === '수주성공' || e.status === '수주실패') &&
    supplyAmountOf(e) > 0
  );
  const totalQuoteAmount = quoteSentList.reduce((acc, curr) => acc + supplyAmountOf(curr), 0);
  const averageQuoteAmount = quoteSentList.length > 0
    ? Math.round(totalQuoteAmount / quoteSentList.length)
    : 0;

  // 5. 예상매출 = 상태(견적서작성중|송부완료) 견적금액 합
  const expectedRevenue = sumExpectedRevenue(estimates);

  // 6. 확정매출 = 상태(수주성공) 계약금액 합
  const confirmedRevenue = estimates
    .filter(e => e.status === '수주성공')
    .reduce((acc, curr) => acc + (curr.confirmed_contract_amount || 0), 0);

  // 7. 서비스 수수료 미수금 = Payment 행 기준 청구액 − 수납액.
  //    견적의 payment_status(출장견적비 결제 여부)로 계약금 전액을 미수로 잡던 방식은 폐기했다.
  //    삭제된 견적의 잔여 결제 행이 섞이지 않도록 이 데이터셋에 속한 행만 집계한다.
  const estimateIds = new Set(estimates.map(e => e.id));
  const outstandingAmount = outstandingFromPayments(
    payments.filter(p => estimateIds.has(p.estimate_id))
  );

  // 8. 평균처리일수 = avg(견적서송부일 - 접수일)
  // 송부일이 접수일보다 빠른 오염 데이터(수기 편집·시드 오류)가 섞이면 음수 일수가 평균을 끌어내린다.
  // 소요일은 정의상 음수가 될 수 없으므로 0으로 절삭한다. 날짜가 파싱되지 않는 행은 모집단에서 뺀다.
  const sentEstimates = estimates.filter(e => {
    if (!e.estimate_sent_at || !e.created_at) return false;
    return !Number.isNaN(new Date(e.created_at).getTime()) && !Number.isNaN(new Date(e.estimate_sent_at).getTime());
  });
  const totalProcessDays = sentEstimates.reduce((acc, curr) => {
    const start = new Date(curr.created_at).getTime();
    const end = new Date(curr.estimate_sent_at!).getTime();
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    return acc + Math.max(0, diffDays);
  }, 0);
  const averageProcessDays = sentEstimates.length > 0
    ? Number((totalProcessDays / sentEstimates.length).toFixed(1))
    : 0;

  return {
    totalCount,
    newCount,
    reviewingCount,
    visitWaitingCount,
    visitCompletedCount,
    quoteWritingCount,
    quoteSentCount,
    wonCount,
    lostCount,
    quoteConversionRate,
    wonConversionRate,
    visitConversionRate,
    averageQuoteAmount,
    expectedRevenue,
    confirmedRevenue,
    outstandingAmount,
    averageProcessDays
  };
}
