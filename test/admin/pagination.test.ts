import { describe, expect, it } from 'vitest';
import { paginate, rangeLabelOf, DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/components/admin/EstimateList';

// ==========================================
// 접수 목록 페이지 경계 회귀 테스트 (2026-08-01 P3-3)
// ==========================================
// 전 건을 한 번에 렌더하던 목록을 페이지 단위로 자른다. 화면이 아니라 경계 계산을 고정한다:
//  - 필터가 좁혀져 페이지 수가 줄었을 때 빈 화면(존재하지 않는 페이지)을 보여주지 않는다.
//  - "N건 중 a–b 표시" 총계가 필터 결과 기준인지 전체 기준인지 문구로 구분된다.

const seq = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('paginate', () => {
  it('기본 25건 단위로 첫 페이지를 자른다', () => {
    const r = paginate(seq(60), 1, DEFAULT_PAGE_SIZE);
    expect(r.items).toHaveLength(25);
    expect(r.items[0]).toBe(1);
    expect(r.items.at(-1)).toBe(25);
    expect(r.page).toBe(1);
    expect(r.totalPages).toBe(3);
    expect(r.total).toBe(60);
    expect(r.from).toBe(1);
    expect(r.to).toBe(25);
  });

  it('마지막 페이지는 남은 건수만 담고 표시 범위도 실제 건수에 맞춘다', () => {
    const r = paginate(seq(60), 3, 25);
    expect(r.items).toEqual([51, 52, 53, 54, 55, 56, 57, 58, 59, 60]);
    expect(r.from).toBe(51);
    expect(r.to).toBe(60);
  });

  it('범위를 벗어난 페이지는 빈 화면이 아니라 마지막 페이지로 접는다', () => {
    // 3페이지를 보던 중 필터를 좁혀 결과가 10건으로 줄어든 상황.
    const r = paginate(seq(10), 3, 25);
    expect(r.page).toBe(1);
    expect(r.items).toHaveLength(10);
    expect(r.to).toBe(10);

    const r2 = paginate(seq(60), 99, 25);
    expect(r2.page).toBe(3);
    expect(r2.items).toHaveLength(10);
  });

  it('0건이어도 페이지는 1이고 표시 범위는 0이다', () => {
    const r = paginate<number>([], 1, 25);
    expect(r.totalPages).toBe(1);
    expect(r.page).toBe(1);
    expect(r.total).toBe(0);
    expect(r.from).toBe(0);
    expect(r.to).toBe(0);
    expect(r.items).toEqual([]);
  });

  it('페이지 크기를 바꿔도 경계가 어긋나지 않는다', () => {
    expect(paginate(seq(120), 2, 50).items).toEqual(seq(100).slice(50));
    expect(paginate(seq(120), 2, 100).items).toHaveLength(20);
    expect(paginate(seq(120), 2, 100).from).toBe(101);
    expect(paginate(seq(120), 2, 100).to).toBe(120);
  });

  it('잘못된 입력(0·음수·NaN·소수)은 사용 가능한 값으로 보정한다', () => {
    expect(paginate(seq(5), 1, 0).items).toHaveLength(1);
    expect(paginate(seq(5), -3, 25).page).toBe(1);
    expect(paginate(seq(5), Number.NaN, 25).page).toBe(1);
    expect(paginate(seq(60), 2.7, 25).page).toBe(2);
    expect(paginate(seq(60), 1, Number.NaN).items).toHaveLength(DEFAULT_PAGE_SIZE);
  });

  it('선택 가능한 페이지 크기는 25·50·100이다', () => {
    expect([...PAGE_SIZE_OPTIONS]).toEqual([25, 50, 100]);
    expect(PAGE_SIZE_OPTIONS[0]).toBe(DEFAULT_PAGE_SIZE);
  });
});

describe('rangeLabelOf', () => {
  it('필터가 없으면 전체 기준임을 밝힌다', () => {
    const r = paginate(seq(60), 1, 25);
    expect(rangeLabelOf(r, 60, false)).toBe('전체 60건 중 1–25 표시');
  });

  it('필터가 있으면 필터 결과 기준임과 전체 건수를 함께 밝힌다', () => {
    const r = paginate(seq(30), 2, 25);
    expect(rangeLabelOf(r, 246, true)).toBe('필터 결과 30건 중 26–30 표시 (전체 246건)');
  });

  it('필터 결과가 0건이면 전체 건수와 대비해 알린다', () => {
    const r = paginate<number>([], 1, 25);
    expect(rangeLabelOf(r, 246, true)).toBe('필터 결과 0건 (전체 246건)');
    expect(rangeLabelOf(r, 0, false)).toBe('전체 0건');
  });
});
