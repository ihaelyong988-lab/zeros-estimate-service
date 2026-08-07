import { describe, expect, it } from 'vitest';
import type { EstimateLineItem } from '@/types/estimate';
import { isQuoteDirty, quoteDraftPatch } from '@/components/admin/EstimateDetailModal';
import { sumSubtotal, totalOf } from '@/lib/quote/amounts';
import { makeLineItem } from '../fixtures';

// ==========================================
// AI 견적 품목표 초안 저장 회귀 테스트 (2026-08-07 B8)
// ==========================================
// 품목표의 유일한 저장 경로가 '승인·견적서 발송'이어서, 발송하지 않고 모달을 닫으면
// 편집분이 통째로 사라졌다. 저장본 스냅샷 대비 미저장 판정과 초안 저장 패치를
// 순수 함수로 고정한다 — 판정이 틀리면 확인 게이트가 열리지 않아 결함이 되살아난다.

/** 화면이 하는 저장 절차 그대로 스냅샷을 갱신한다. */
const saveDraft = (items: EstimateLineItem[]) => quoteDraftPatch(items).line_items as EstimateLineItem[];

describe('isQuoteDirty', () => {
  it('초기 스냅샷과 동일하면 clean', () => {
    const saved = [makeLineItem(), makeLineItem()];
    expect(isQuoteDirty(saved, saved)).toBe(false);
  });

  it('값이 같으면 배열·객체 참조가 달라도 clean', () => {
    const saved = [makeLineItem({ id: 'li-1' }), makeLineItem({ id: 'li-2' })];
    const current = saved.map(it => ({ ...it }));
    expect(isQuoteDirty(saved, current)).toBe(false);
  });

  it('품목이 없는 상태끼리는 clean', () => {
    expect(isQuoteDirty([], [])).toBe(false);
  });

  it('수량을 바꾸면 dirty', () => {
    const saved = [makeLineItem({ id: 'li-1', qty: 1 })];
    expect(isQuoteDirty(saved, [{ ...saved[0], qty: 2 }])).toBe(true);
  });

  it('단가를 바꾸면 dirty', () => {
    const saved = [makeLineItem({ id: 'li-1', unit_price: 1_000_000 })];
    expect(isQuoteDirty(saved, [{ ...saved[0], unit_price: 1_200_000 }])).toBe(true);
  });

  it('품명·규격·단위·비고를 바꿔도 dirty', () => {
    const saved = [makeLineItem({ id: 'li-1' })];
    expect(isQuoteDirty(saved, [{ ...saved[0], name: '배관 설치비' }])).toBe(true);
    expect(isQuoteDirty(saved, [{ ...saved[0], spec: 'SUS 316 80A' }])).toBe(true);
    expect(isQuoteDirty(saved, [{ ...saved[0], unit: 'm' }])).toBe(true);
    expect(isQuoteDirty(saved, [{ ...saved[0], note: '야간 작업' }])).toBe(true);
  });

  it('행을 추가하거나 삭제하면 dirty', () => {
    const saved = [makeLineItem({ id: 'li-1' })];
    expect(isQuoteDirty(saved, [...saved, makeLineItem({ id: 'li-2' })])).toBe(true);
    expect(isQuoteDirty(saved, [])).toBe(true);
  });

  it('AI 초안을 다시 생성해 행 식별자가 바뀌면 dirty', () => {
    const saved = [makeLineItem({ id: 'li-old', name: '배관 자재비' })];
    const redrafted = [makeLineItem({ id: 'li-new', name: '배관 자재비' })];
    expect(isQuoteDirty(saved, redrafted)).toBe(true);
  });

  it('행 순서만 바꿔도 dirty — 저장되는 배열이 달라진다', () => {
    const a = makeLineItem({ id: 'li-1' });
    const b = makeLineItem({ id: 'li-2' });
    expect(isQuoteDirty([a, b], [b, a])).toBe(true);
  });

  it('저장하면 다시 clean — 스냅샷 갱신 후 미저장 표시가 남지 않는다', () => {
    const saved = [makeLineItem({ id: 'li-1', qty: 1 })];
    const edited = [{ ...saved[0], qty: 3 }];
    expect(isQuoteDirty(saved, edited)).toBe(true);

    const snapshot = saveDraft(edited);
    expect(isQuoteDirty(snapshot, edited)).toBe(false);
  });
});

describe('quoteDraftPatch — §14-4 금액 단위 불변식', () => {
  const items = [
    makeLineItem({ qty: 2, unit_price: 3_000_000 }),
    makeLineItem({ qty: 1, unit_price: 4_000_000 }),
  ];

  it('저장 금액은 공급가액(VAT 별도)이다', () => {
    expect(quoteDraftPatch(items).estimated_amount).toBe(10_000_000);
    expect(quoteDraftPatch(items).estimated_amount).toBe(sumSubtotal(items));
  });

  it('총액(VAT 포함)을 저장하지 않는다 — 재저장마다 VAT 가 증식한다', () => {
    const patch = quoteDraftPatch(items);
    expect(patch.estimated_amount).not.toBe(totalOf(sumSubtotal(items)));

    // 저장본을 다시 편집해 저장해도 금액이 부풀지 않는다(멱등)
    const again = quoteDraftPatch(patch.line_items as EstimateLineItem[]);
    expect(again.estimated_amount).toBe(patch.estimated_amount);
  });

  it('초안 저장은 상태·발송본 URL·발송 시각을 담지 않는다 — 고객에게 노출되면 안 된다', () => {
    const keys = Object.keys(quoteDraftPatch(items));
    expect(keys).toEqual(['line_items', 'estimated_amount']);
    expect(keys).not.toContain('status');
    expect(keys).not.toContain('estimate_pdf_url');
    expect(keys).not.toContain('estimate_sent_at');
  });

  it('품목이 비면 공급가액 0 — 잔여 금액이 남지 않는다', () => {
    expect(quoteDraftPatch([]).estimated_amount).toBe(0);
  });
});
