'use client';

import { Estimate, EstimateLineItem, WorkType } from '@/types/estimate';

// ==========================================
// AI 견적 초안 엔진 (1단계: 규칙 기반)
// ==========================================
// 공종별 표준 품목 구성비 + 예산 규모를 근거로 라인아이템 초안을 만든다.
// 초안은 반드시 관리자가 편집·승인해야 발송된다(자동 발송 없음).
// 2단계(Edge Function + Claude API 도면 판독)로 교체 시 이 모듈만 대체하면 된다.

interface TemplateItem {
  name: string;
  spec: string;
  unit: string; // '식' | '공수' 등
  weight: number; // 총액 대비 구성비 (합계 1.0)
}

const LABOR_UNIT_PRICE = 450_000; // 공수당 단가(배관공 2인 1조 기준)

const COMMON_TAIL: TemplateItem[] = [
  { name: '시험·검사', spec: '수압/기밀 전 구간', unit: '식', weight: 0.05 },
  { name: '안전관리·잡자재', spec: '현장 공통', unit: '식', weight: 0.06 },
];

const TEMPLATES: Record<WorkType, TemplateItem[]> = {
  '배관공사': [
    { name: '배관 자재비', spec: 'SUS/탄소강 배관', unit: '식', weight: 0.34 },
    { name: '밸브·피팅류', spec: '게이트·체크·유니온 외', unit: '식', weight: 0.12 },
    { name: '용접·시공 인건비', spec: '배관공 2인 1조', unit: '공수', weight: 0.30 },
    { name: '배관 지지대·서포트', spec: '찬넬·행거류', unit: '식', weight: 0.08 },
    { name: '가설·보양·양중', spec: '현장 여건 반영', unit: '식', weight: 0.05 },
    ...COMMON_TAIL,
  ],
  '장비설치': [
    { name: '장비 반입·양중비', spec: '크레인/지게차', unit: '식', weight: 0.15 },
    { name: '기초 패드·앙카 시공', spec: '무수축 몰탈', unit: '식', weight: 0.12 },
    { name: '장비 설치·레벨링', spec: '설치공 2인 1조', unit: '공수', weight: 0.29 },
    { name: '배관 연결(Tie-in)', spec: '플랜지 접속', unit: '식', weight: 0.20 },
    { name: '전기·제어 결선 협력', spec: '결선/신호 확인', unit: '식', weight: 0.07 },
    { name: '시운전·성능 확인', spec: '부하 운전 점검', unit: '식', weight: 0.06 },
    ...COMMON_TAIL,
  ],
  '배관+장비설치': [
    { name: '배관 자재비', spec: 'SUS/탄소강 배관', unit: '식', weight: 0.24 },
    { name: '장비 반입·설치·레벨링', spec: '양중 포함', unit: '식', weight: 0.20 },
    { name: '용접·시공 인건비', spec: '배관공 2인 1조', unit: '공수', weight: 0.28 },
    { name: '밸브·피팅·서포트', spec: '부속 일체', unit: '식', weight: 0.12 },
    { name: '시운전·TAB', spec: '유량/성능 확인', unit: '식', weight: 0.05 },
    ...COMMON_TAIL,
  ],
  'Utility 배관': [
    { name: '유틸리티 배관 자재비', spec: 'CDA/N2/PW 등', unit: '식', weight: 0.32 },
    { name: '클린 용접·시공 인건비', spec: 'Purge 용접 포함', unit: '공수', weight: 0.32 },
    { name: '밸브·피팅·계측류', spec: '유틸리티 등급', unit: '식', weight: 0.14 },
    { name: '지지대·라우팅 보정', spec: '랙/서포트', unit: '식', weight: 0.06 },
    { name: '세정·플러싱', spec: '배관 내부 청정화', unit: '식', weight: 0.05 },
    ...COMMON_TAIL,
  ],
  '공장증설': [
    { name: '신설 배관 자재비', spec: '증설 구간', unit: '식', weight: 0.28 },
    { name: '장비 이설·신설 설치', spec: '양중 포함', unit: '식', weight: 0.18 },
    { name: '시공 인건비', spec: '배관/설치 팀', unit: '공수', weight: 0.28 },
    { name: '기존 라인 간섭 이설', spec: '가동 중 현장 대응', unit: '식', weight: 0.10 },
    { name: '가설·보양', spec: '생산구역 보호', unit: '식', weight: 0.05 },
    ...COMMON_TAIL,
  ],
  '노후배관교체': [
    { name: '기존 배관 철거·폐기', spec: '폐자재 반출 포함', unit: '식', weight: 0.10 },
    { name: '신규 배관 자재비', spec: '동등 이상 사양', unit: '식', weight: 0.30 },
    { name: '교체 시공 인건비', spec: '셧다운 구간 대응', unit: '공수', weight: 0.33 },
    { name: '가설·보양·바이패스', spec: '가동 유지 조치', unit: '식', weight: 0.11 },
    { name: '보온·도장 복구', spec: '기존 사양 복원', unit: '식', weight: 0.05 },
    ...COMMON_TAIL,
  ],
  '기계실개선': [
    { name: '기계실 장비·배관 자재', spec: '개선 대상 구간', unit: '식', weight: 0.30 },
    { name: '기존 설비 철거·이설', spec: '반출 포함', unit: '식', weight: 0.12 },
    { name: '시공 인건비', spec: '기계실 팀', unit: '공수', weight: 0.31 },
    { name: '보온·도장', spec: '개선 구간', unit: '식', weight: 0.09 },
    { name: 'TAB·시운전', spec: '유량/온도 균형', unit: '식', weight: 0.07 },
    ...COMMON_TAIL,
  ],
  '생산설비 배관 연결': [
    { name: 'Tie-in 포인트 작업', spec: '가동 협의 포함', unit: '식', weight: 0.22 },
    { name: '연결 배관 자재비', spec: '설비 사양 매칭', unit: '식', weight: 0.25 },
    { name: '시공 인건비', spec: '배관공 2인 1조', unit: '공수', weight: 0.30 },
    { name: '지지대·라우팅', spec: '간섭 회피 반영', unit: '식', weight: 0.12 },
    ...COMMON_TAIL,
  ],
  'CAPEX 개·증설 검토': [
    { name: '현장 실사·진단', spec: '설비/배관 현황', unit: '식', weight: 0.30 },
    { name: '도면 검토·물량 산출', spec: '도서 기반 산출', unit: '식', weight: 0.30 },
    { name: '공종별 견적 비교 분석', spec: '실거래 데이터 대조', unit: '식', weight: 0.25 },
    { name: '검토 보고서 작성', spec: '±5% 대역 제시', unit: '식', weight: 0.15 },
  ],
  '기타': [
    { name: '자재비', spec: '요청 범위 기준', unit: '식', weight: 0.40 },
    { name: '시공 인건비', spec: '작업팀 구성 기준', unit: '공수', weight: 0.40 },
    { name: '가설·부대공사', spec: '현장 여건 반영', unit: '식', weight: 0.09 },
    ...COMMON_TAIL,
  ],
};

// 예산 근거 총액: 관리자 산출액 > 고객 예산대역 > 규모 분류 순으로 채택
function baseAmount(est: Estimate): number {
  if (est.estimated_amount && est.estimated_amount > 0) return est.estimated_amount;
  switch (est.expected_budget_range) {
    case '≤1,000만': return 8_000_000;
    case '1,000만~1억': return 40_000_000;
    case '≥1억': return 120_000_000;
    default:
      switch (est.estimate_category) {
        case 'small': return 8_000_000;
        case 'large': return 150_000_000;
        case 'medium': return 40_000_000;
        default: return 30_000_000;
      }
  }
}

const round10k = (n: number) => Math.max(10_000, Math.round(n / 10_000) * 10_000);

/** 공종·규모 기반 견적 라인아이템 초안 생성 */
export function draftLineItems(est: Estimate): EstimateLineItem[] {
  const total = baseAmount(est);
  const tpl = TEMPLATES[est.work_type] || TEMPLATES['기타'];
  const stamp = Date.now();
  return tpl.map((t, i) => {
    const amount = total * t.weight;
    if (t.unit === '공수') {
      const qty = Math.max(1, Math.round(amount / LABOR_UNIT_PRICE));
      return { id: `li-${stamp}-${i}`, name: t.name, spec: t.spec, qty, unit: t.unit, unit_price: LABOR_UNIT_PRICE };
    }
    return { id: `li-${stamp}-${i}`, name: t.name, spec: t.spec, qty: 1, unit: t.unit, unit_price: round10k(amount) };
  });
}

export const lineAmount = (it: EstimateLineItem) => (it.qty || 0) * (it.unit_price || 0);
export const sumSubtotal = (items: EstimateLineItem[]) => items.reduce((s, it) => s + lineAmount(it), 0);
