import { describe, expect, it } from 'vitest';
import { readSource } from '../support/sourceScan';

// ==========================================
// 고객이 보는 화면의 본문 대비 (§10 — 본문 4.5:1)
// ==========================================
// 2026-08-08 주인님 지적("할 때마다 끊임없이 잔여 작업이 있다")으로 잔여를 영향으로 다시 쟀다.
// `text-gray-light`(#9AA3AF, 흰 배경 대비 2.6:1)는 저장소 전체에 104곳 있었지만
// **92곳이 관리자 화면**이고 고객이 보는 곳은 12곳이었다. 그 12곳만 고친 것이 이 테스트가 지키는 상태다.
//
// 여기 실린 파일은 고객 동선(랜딩·의뢰·인증·실적·우측 패널)에 뜬다. 관리자 화면(`components/admin/*`)은
// 대상이 아니다 — 주인님만 보는 화면이라 등급 B(요청 시)로 내렸다(잔여작업-마스터 §5-A).
//
// 게이트 R2 는 이 판정을 대신하지 못한다. R2 는 전수 베이스라인 대비 '회귀'만 차단하므로
// 이미 깨끗해진 화면이 다시 더러워지는 것은 여기서만 막힌다(a11ySourceRules.test.ts 와 같은 취지).

/**
 * 고객 동선에 뜨는 파일 — `text-gray-light` 0건으로 못박는다. 고친 것은 **글자 10곳**이다
 * (PerformanceInsights 5 · RequestWizard 3 · PhoneVerifyGate 2).
 *
 * `components/layout/RightSidebar.tsx` 는 일부러 뺐다. 남은 1곳은 접기 **아이콘 버튼**이고
 * `rightSidebarSource.test.ts` 가 이미 "비본문(장식) — 그대로 둔다"로 판정해 개수를 고정해 두었다.
 * 글자가 아니므로 이번 범위(옅은 글씨)가 아니다. 판정을 뒤집으려면 그 테스트를 먼저 고쳐야 한다.
 */
const CUSTOMER_FACING = [
  'components/PerformanceInsights.tsx',
  'components/forms/RequestWizard.tsx',
  'components/forms/PhoneVerifyGate.tsx',
] as const;

describe.each(CUSTOMER_FACING)('%s — 고객 본문에 저대비 회색이 없다', (file) => {
  const scan = readSource(file);

  it('text-gray-light 를 쓰지 않는다', () => {
    // 위계가 필요하면 text-gray(#5B6573, 5.9:1)로 낮춘다. 더 흐리게 만들지 않는다.
    expect(scan.locate((line) => line.includes('text-gray-light'))).toEqual([]);
  });
});

describe('app/page.tsx — 장식만 예외', () => {
  const scan = readSource('app/page.tsx');

  it('남은 text-gray-light 는 aria-hidden 장식뿐이다', () => {
    // 읽는 글자가 아니라 구분 기호(`|`)다. 스크린리더에서 빠져 있고 정보를 담지 않으므로
    // 대비 조문의 대상이 아니다. **글자에 이 색을 다시 쓰려면 이 테스트가 먼저 막는다.**
    const hits = scan.locate((line) => line.includes('text-gray-light'));
    expect(hits).toHaveLength(1);
    for (const hit of hits) {
      expect(hit).toContain('aria-hidden');
    }
  });
});
