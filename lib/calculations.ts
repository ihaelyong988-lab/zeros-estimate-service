import { Estimate, Payment } from '@/types/estimate';

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
  outstandingAmount: number;    // 수주성공 중 결제미완료(미결제, 결제대기) 금액 합
  
  // 기간 관련
  averageProcessDays: number;   // avg(견적서송부일 - 접수일)
}

/**
 * ZEROS 사전진단 데이터셋 기반 실시간 KPI 통계 지표 연산
 */
export function calculatePerformanceMetrics(
  estimates: Estimate[],
  payments: Payment[]
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
    e.estimated_amount !== undefined
  );
  const totalQuoteAmount = quoteSentList.reduce((acc, curr) => acc + (curr.estimated_amount || 0), 0);
  const averageQuoteAmount = quoteSentList.length > 0 
    ? Math.round(totalQuoteAmount / quoteSentList.length) 
    : 0;

  // 5. 예상매출 = 상태(견적서작성중|송부완료) 견적금액 합
  const expectedRevenue = estimates
    .filter(e => e.status === '견적서 작성중' || e.status === '견적서 송부완료')
    .reduce((acc, curr) => acc + (curr.estimated_amount || 0), 0);

  // 6. 확정매출 = 상태(수주성공) 계약금액 합
  const confirmedRevenue = estimates
    .filter(e => e.status === '수주성공')
    .reduce((acc, curr) => acc + (curr.confirmed_contract_amount || 0), 0);

  // 7. 미수금 = 수주성공 중 결제미완료(미결제, 결제대기) 금액 합
  const outstandingAmount = estimates
    .filter(e => e.status === '수주성공' && (e.payment_status === '미결제' || e.payment_status === '결제대기'))
    .reduce((acc, curr) => acc + (curr.confirmed_contract_amount || 0), 0);

  // 8. 평균처리일수 = avg(견적서송부일 - 접수일)
  const sentEstimates = estimates.filter(e => e.estimate_sent_at && e.created_at);
  const totalProcessDays = sentEstimates.reduce((acc, curr) => {
    const start = new Date(curr.created_at).getTime();
    const end = new Date(curr.estimate_sent_at!).getTime();
    const diffDays = (end - start) / (1000 * 60 * 60 * 24);
    return acc + diffDays;
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
