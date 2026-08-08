import { describe, expect, it } from 'vitest';
import { LANDING_TRADES, LANDING_TRADES_EXCLUDED } from '@/lib/constants/landingTrades';
import { WORK_TYPE_OPTIONS } from '@/lib/forms/requestForm';

// ==========================================
// 공종 병렬 자료구조 통합 (B11)
// ==========================================
// 통합 전: 같은 8개 공종 키를 축으로 하는 자료구조가 app/page.tsx 모듈 스코프에 5개 흩어져 있었다
//         (LANDING_TRADES 키 목록 · TRADE_PHOTOS · LANDING_CHIP_CLASS · LANDING_SIGNATURE_HEX ·
//          MOBILE_TRADE_ESTIMATES). 한 곳만 고치면 나머지가 조용히 어긋난다.
// 통합 후: lib/constants/landingTrades.ts 한 배열. 아래 첫 블록이 "값을 옮기기만 했다"를 고정한다 —
//         통합 전 5개 구조를 배열에서 되만들어 원본 리터럴과 대조하므로, 값이 하나라도 바뀌면 실패한다.

describe('LANDING_TRADES — 통합 전 병렬 구조와 값 동일', () => {
  it('순회 순서(구 LANDING_TRADES 키 목록)가 같다', () => {
    expect(LANDING_TRADES.map((t) => t.key)).toEqual([
      '배관공사',
      '장비설치',
      'Utility 배관',
      '공장증설',
      '노후배관교체',
      '기계실개선',
      '생산설비 배관 연결',
      'CAPEX 개·증설 검토',
    ]);
  });

  it('실사 사진 경로(구 TRADE_PHOTOS)가 같다', () => {
    const rebuilt = Object.fromEntries(LANDING_TRADES.map((t) => [t.key, t.photos]));
    expect(rebuilt).toEqual({
      '배관공사': ['/images/trades/pipe-1.jpg', '/images/trades/pipe-2.jpg'],
      '장비설치': ['/images/trades/equip-1.jpg', '/images/trades/equip-2.jpg'],
      'Utility 배관': ['/images/trades/utility-1.jpg', '/images/trades/utility-2.jpg'],
      '공장증설': ['/images/trades/expansion-1.jpg', '/images/trades/expansion-2.jpg'],
      '노후배관교체': ['/images/trades/renewal-1.jpg', '/images/trades/renewal-2.jpg'],
      '기계실개선': ['/images/trades/mechroom-1.jpg', '/images/trades/mechroom-2.jpg'],
      '생산설비 배관 연결': ['/images/trades/hookup-1.jpg', '/images/trades/hookup-2.jpg'],
      'CAPEX 개·증설 검토': ['/images/trades/capex-1.jpg', '/images/trades/capex-2.jpg'],
    });
  });

  it('활성 칩 클래스(구 LANDING_CHIP_CLASS)가 같다', () => {
    const rebuilt = Object.fromEntries(LANDING_TRADES.map((t) => [t.key, t.chipClass]));
    expect(rebuilt).toEqual({
      '배관공사': 'bg-cyan-600 border-cyan-600 text-white',
      '장비설치': 'bg-amber-600 border-amber-600 text-white',
      'Utility 배관': 'bg-sky-600 border-sky-600 text-white',
      '공장증설': 'bg-accent border-accent text-white',
      '노후배관교체': 'bg-emerald-600 border-emerald-600 text-white',
      '기계실개선': 'bg-teal-600 border-teal-600 text-white',
      '생산설비 배관 연결': 'bg-indigo-600 border-indigo-600 text-white',
      'CAPEX 개·증설 검토': 'bg-navy border-navy text-white',
    });
  });

  it('시그니처 색(구 LANDING_SIGNATURE_HEX)이 같다', () => {
    const rebuilt = Object.fromEntries(LANDING_TRADES.map((t) => [t.key, t.signatureHex]));
    expect(rebuilt).toEqual({
      '배관공사': '#0891B2',
      '장비설치': '#D97706',
      'Utility 배관': '#0284C7',
      '공장증설': '#D2691E',
      '노후배관교체': '#059669',
      '기계실개선': '#0D9488',
      '생산설비 배관 연결': '#4F46E5',
      'CAPEX 개·증설 검토': '#16365F',
    });
  });

  it('견적 밴드(구 MOBILE_TRADE_ESTIMATES)가 같다', () => {
    const rebuilt = Object.fromEntries(LANDING_TRADES.map((t) => [t.key, t.estimate]));
    expect(rebuilt).toEqual({
      '배관공사': { min: 8_000_000, max: 40_000_000, median: 22_000_000, base: 21_000_000 },
      '장비설치': { min: 15_000_000, max: 80_000_000, median: 42_000_000, base: 38_000_000 },
      'Utility 배관': { min: 10_000_000, max: 55_000_000, median: 30_000_000, base: 28_000_000 },
      '공장증설': { min: 12_000_000, max: 45_000_000, median: 28_000_000, base: 26_850_000 },
      '노후배관교체': { min: 6_000_000, max: 35_000_000, median: 18_000_000, base: 17_000_000 },
      '기계실개선': { min: 9_000_000, max: 50_000_000, median: 26_000_000, base: 24_000_000 },
      '생산설비 배관 연결': { min: 20_000_000, max: 120_000_000, median: 60_000_000, base: 55_000_000 },
      'CAPEX 개·증설 검토': { min: 50_000_000, max: 480_000_000, median: 220_000_000, base: 180_000_000 },
    });
  });
});

// 통합의 목적은 "축을 하나로" 다. 축이 하나면 유니온이 늘었을 때 빠뜨린 곳을 기계가 짚어줄 수 있다.
// lib/constants/menu.ts 가 Record<WorkType, string> 으로 표기 누락을 tsc 로 막은 것과 같은 방식 —
// 여기서는 쇼케이스에 넣은 공종과 의도적으로 뺀 공종의 합이 유니온 전량이어야 한다.
describe('LANDING_TRADES — WorkType 유니온 전수 대조', () => {
  const showcased = LANDING_TRADES.map((t) => t.key as string);
  const excluded = Object.keys(LANDING_TRADES_EXCLUDED);

  it('쇼케이스 + 제외 목록이 WorkType 유니온을 전부 덮는다', () => {
    const covered = [...showcased, ...excluded];
    const missing = WORK_TYPE_OPTIONS.filter((w) => !covered.includes(w));
    expect(missing).toEqual([]);
  });

  it('유니온에 없는 키를 쇼케이스·제외 목록에 넣지 않는다', () => {
    const stray = [...showcased, ...excluded].filter((k) => !WORK_TYPE_OPTIONS.includes(k as never));
    expect(stray).toEqual([]);
  });

  it('한 공종이 쇼케이스와 제외 목록에 동시에 있지 않다', () => {
    expect(showcased.filter((k) => excluded.includes(k))).toEqual([]);
  });

  it('제외 사유를 빈 문자열로 남기지 않는다', () => {
    const blank = excluded.filter((k) => LANDING_TRADES_EXCLUDED[k as keyof typeof LANDING_TRADES_EXCLUDED].trim() === '');
    expect(blank).toEqual([]);
  });
});

describe('LANDING_TRADES — 값 불변식', () => {
  it('공종 키가 중복되지 않는다', () => {
    expect(new Set(LANDING_TRADES.map((t) => t.key)).size).toBe(LANDING_TRADES.length);
  });

  it('실사 사진은 공종당 2장·총 16장이고 경로가 겹치지 않는다 (§10-A O-37)', () => {
    const paths = LANDING_TRADES.flatMap((t) => t.photos);
    expect(LANDING_TRADES.every((t) => t.photos.length === 2)).toBe(true);
    expect(paths).toHaveLength(16);
    expect(new Set(paths).size).toBe(16);
  });

  it('칩 클래스는 배경·테두리·글자색을 모두 지정한다 — 활성 칩이 반쯤만 칠해지지 않게', () => {
    const incomplete = LANDING_TRADES.filter(
      (t) => !/(^|\s)bg-/.test(t.chipClass) || !/(^|\s)border-/.test(t.chipClass) || !/(^|\s)text-/.test(t.chipClass)
    );
    expect(incomplete.map((t) => t.key)).toEqual([]);
  });

  it('시그니처 색은 6자리 hex 다', () => {
    const malformed = LANDING_TRADES.filter((t) => !/^#[0-9A-F]{6}$/.test(t.signatureHex));
    expect(malformed.map((t) => t.key)).toEqual([]);
  });

  it('견적 밴드는 min < median < max 이고 base 가 밴드 안에 있다 — 슬라이더 초기 핸들이 트랙을 벗어나지 않게', () => {
    const broken = LANDING_TRADES.filter(
      ({ estimate: e }) => !(e.min < e.median && e.median < e.max && e.min <= e.base && e.base <= e.max)
    );
    expect(broken.map((t) => t.key)).toEqual([]);
  });
});
