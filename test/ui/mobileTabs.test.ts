import { describe, expect, it } from 'vitest';
import {
  MOBILE_BOTTOM_TABS,
  MOBILE_TAB_ICON_CLASS,
  MOBILE_TAB_LABEL_CLASS,
  mobileBottomTabClass,
} from '@/lib/ui/mobileTabs';

/**
 * 하단 탭바를 `<button>` 5개 펼침에서 배열 + map 으로 모으며 조문을 고정한다.
 * 순서·문구·클래스는 AGENTS §10-A 확정이라 이 테스트가 회귀를 막는다.
 */

describe('모바일 하단 탭 정의 (§10-A 확정)', () => {
  it('탭 순서와 문구를 고정한다', () => {
    expect(MOBILE_BOTTOM_TABS.map((t) => [t.tab, t.label])).toEqual([
      ['home', '홈'],
      ['service', '서비스 소개'],
      ['request', '견적 문의'],
      ['history', '실적 집계표'],
      ['account', '마이페이지'],
    ]);
  });

  it('탭 키가 중복되지 않는다 — React key 로 쓰인다', () => {
    const keys = MOBILE_BOTTOM_TABS.map((t) => t.tab);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('모바일 하단 탭 클래스', () => {
  it('비활성은 조문이 정한 text-gray hover:text-navy 다', () => {
    // #9AA3AF(text-gray-light)는 대비 미달이라 본문·라벨 금지(§10 가독성 체크리스트).
    const inactive = mobileBottomTabClass(false);
    expect(inactive).toContain('text-gray hover:text-navy');
    expect(inactive).not.toContain('text-gray-light');
    expect(inactive).not.toContain('text-accent');
  });

  it('활성은 accent 강조를 쓴다', () => {
    const active = mobileBottomTabClass(true);
    expect(active).toContain('text-accent font-black scale-105');
    expect(active).not.toContain('text-gray');
  });

  it('활성·비활성이 같은 레이아웃 베이스를 공유한다 — 전환 시 위치가 흔들리지 않는다', () => {
    const base = 'flex flex-col items-center gap-1 transition-all';
    expect(mobileBottomTabClass(true)).toContain(base);
    expect(mobileBottomTabClass(false)).toContain(base);
  });

  it('라벨 12px · 아이콘 22px 치수를 유지한다', () => {
    expect(MOBILE_TAB_LABEL_CLASS).toBe('text-[12px]');
    expect(MOBILE_TAB_ICON_CLASS).toBe('w-5.5 h-5.5');
  });
});
