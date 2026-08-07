import type { WorkType } from '@/types/estimate';

// ─────────────────────────────────────────────────────────────────────────────
// 랜딩 쇼케이스 공종 — 순회 순서·실사 사진·칩 색·시그니처 색·견적 밴드가 전부 같은 공종 축을 쓴다.
// 병렬 Record 로 흩어 두면 한 곳만 고쳤을 때 나머지가 조용히 어긋난다(값이 없던 곳에 생기거나 사라진다).
// 축을 하나로 묶어 "한 공종 = 한 행"으로 만든다. 값은 옮기기만 했다 — 화면 출력은 그대로다.
// ─────────────────────────────────────────────────────────────────────────────

export interface LandingTrade {
  // 화면 표시명 겸 데이터 키. DB 저장값이라 불변이다(§10-A O-33).
  key: WorkType;
  // [현장 전경, 작업 상세] 실사 사진 — §10-A O-37 16장 규칙 대상. 교체는 같은 파일명으로 파일만 바꾼다.
  photos: readonly [string, string];
  // 활성 칩 색. Tailwind JIT 가 스캔하도록 완전한 클래스 문자열을 적는다(문자열 조합 금지).
  chipClass: string;
  // 시그니처 색(hex) — 견적 검토 히어로 테마를 같은 행의 chipClass 와 같은 색으로 묶는다.
  signatureHex: string;
  // 모바일 랜딩 견적 밴드(원). min/max=슬라이더 범위, median=중앙값, base=기본 표시값.
  estimate: { readonly min: number; readonly max: number; readonly median: number; readonly base: number };
}

// 배열 순서가 곧 화면 순서다 — 모바일 칩바·캐러셀 인덱스와 데스크톱 히어로 자동 순회가 이 인덱스를 공유한다.
export const LANDING_TRADES = [
  { key: '배관공사', chipClass: 'bg-cyan-600 border-cyan-600 text-white', signatureHex: '#0891B2',
    photos: ['/images/trades/pipe-1.jpg', '/images/trades/pipe-2.jpg'], estimate: { min: 8_000_000, max: 40_000_000, median: 22_000_000, base: 21_000_000 } },
  { key: '장비설치', chipClass: 'bg-amber-600 border-amber-600 text-white', signatureHex: '#D97706',
    photos: ['/images/trades/equip-1.jpg', '/images/trades/equip-2.jpg'], estimate: { min: 15_000_000, max: 80_000_000, median: 42_000_000, base: 38_000_000 } },
  { key: 'Utility 배관', chipClass: 'bg-sky-600 border-sky-600 text-white', signatureHex: '#0284C7',
    photos: ['/images/trades/utility-1.jpg', '/images/trades/utility-2.jpg'], estimate: { min: 10_000_000, max: 55_000_000, median: 30_000_000, base: 28_000_000 } },
  { key: '공장증설', chipClass: 'bg-accent border-accent text-white', signatureHex: '#D2691E',
    photos: ['/images/trades/expansion-1.jpg', '/images/trades/expansion-2.jpg'], estimate: { min: 12_000_000, max: 45_000_000, median: 28_000_000, base: 26_850_000 } },
  { key: '노후배관교체', chipClass: 'bg-emerald-600 border-emerald-600 text-white', signatureHex: '#059669',
    photos: ['/images/trades/renewal-1.jpg', '/images/trades/renewal-2.jpg'], estimate: { min: 6_000_000, max: 35_000_000, median: 18_000_000, base: 17_000_000 } },
  { key: '기계실개선', chipClass: 'bg-teal-600 border-teal-600 text-white', signatureHex: '#0D9488',
    photos: ['/images/trades/mechroom-1.jpg', '/images/trades/mechroom-2.jpg'], estimate: { min: 9_000_000, max: 50_000_000, median: 26_000_000, base: 24_000_000 } },
  { key: '생산설비 배관 연결', chipClass: 'bg-indigo-600 border-indigo-600 text-white', signatureHex: '#4F46E5',
    photos: ['/images/trades/hookup-1.jpg', '/images/trades/hookup-2.jpg'], estimate: { min: 20_000_000, max: 120_000_000, median: 60_000_000, base: 55_000_000 } },
  { key: 'CAPEX 개·증설 검토', chipClass: 'bg-navy border-navy text-white', signatureHex: '#16365F',
    photos: ['/images/trades/capex-1.jpg', '/images/trades/capex-2.jpg'], estimate: { min: 50_000_000, max: 480_000_000, median: 220_000_000, base: 180_000_000 } },
] as const satisfies readonly LandingTrade[];

export type LandingTradeKey = (typeof LANDING_TRADES)[number]['key'];

// 쇼케이스에 싣지 않는 공종. WorkType 유니온이 늘면 Exclude 결과가 커져 이 리터럴에서 컴파일 오류가 난다 —
// 새 공종을 쇼케이스에 넣을지 말지 결정하지 않고 지나가는 것을 막는다(lib/constants/menu.ts 와 같은 방식).
export const LANDING_TRADES_EXCLUDED: Record<Exclude<WorkType, LandingTradeKey>, string> = {
  '배관+장비설치': '배관공사·장비설치 카드와 실사 사진·시그니처 색이 겹친다',
  '기타': '대표 실사 사진과 견적 밴드를 정의할 수 없다',
};
