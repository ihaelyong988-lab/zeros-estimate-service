import { describe, expect, it } from 'vitest';
import {
  HEADER_TOUCH_CLASS,
  ICON_TOUCH_CLASS,
  MOBILE_HEADER_HEIGHT_PX,
  TOUCH_MIN_PX,
  mobileHeaderClass,
} from '@/lib/ui/mobileShellTheme';

/** Tailwind 간격 스케일(`py-2.5` → 10px). 헤더 세로 예산을 산술로 검사하기 위한 변환. */
function spacingToPx(value: string): number {
  return Number(value) * 4;
}

/** 클래스 문자열에서 상하 패딩 1변(px)을 뽑는다. */
function paddingYPx(className: string): number {
  const match = className.match(/\bpy-([\d.]+)\b/);
  if (!match) throw new Error(`py-* 클래스가 없다: ${className}`);
  return spacingToPx(match[1]);
}

/** 임의값 클래스(`min-h-[44px]`)와 스케일 클래스(`w-11`)에서 px 를 뽑는다. */
function sizePx(className: string, prefix: string): number {
  const arbitrary = className.match(new RegExp(`\\b${prefix}-\\[(\\d+)px\\]`));
  if (arbitrary) return Number(arbitrary[1]);
  const scaled = className.match(new RegExp(`\\b${prefix}-([\\d.]+)\\b`));
  if (!scaled) throw new Error(`${prefix}-* 클래스가 없다: ${className}`);
  return spacingToPx(scaled[1]);
}

describe('모바일 헤더 세로 예산 (C10)', () => {
  it('랜딩 헤더는 44px 터치 타깃을 넣고도 총높이 64px 를 유지한다', () => {
    // 자식을 44px 로 키운 만큼 상하 패딩을 회수한다 — 헤더가 두꺼워지면 본문 세로 예산이 깎인다.
    const padding = paddingYPx(mobileHeaderClass(true));
    expect(padding * 2 + TOUCH_MIN_PX).toBe(MOBILE_HEADER_HEIGHT_PX.landing);
  });

  it('비랜딩 헤더도 같은 방식으로 총높이 68px 를 유지한다', () => {
    const padding = paddingYPx(mobileHeaderClass(false));
    expect(padding * 2 + TOUCH_MIN_PX).toBe(MOBILE_HEADER_HEIGHT_PX.default);
  });

  it('헤더 버튼·아이콘 버튼 클래스가 최소 터치 타깃을 만족한다', () => {
    expect(sizePx(HEADER_TOUCH_CLASS, 'min-h')).toBeGreaterThanOrEqual(TOUCH_MIN_PX);
    expect(sizePx(ICON_TOUCH_CLASS, 'w')).toBeGreaterThanOrEqual(TOUCH_MIN_PX);
    expect(sizePx(ICON_TOUCH_CLASS, 'h')).toBeGreaterThanOrEqual(TOUCH_MIN_PX);
  });
});

describe('모바일 홈 랜딩 화이트 셸 (C2 · §10-A 공통 1항)', () => {
  it('랜딩 헤더는 화이트 배경 · 네이비 글자 · 조문 헤어라인을 쓴다', () => {
    const landing = mobileHeaderClass(true);
    expect(landing).toContain('bg-bg');
    expect(landing).toContain('text-navy');
    expect(landing).toContain('border-[#E4EAF2]');
  });

  it('랜딩 헤더에 다크 네이비 배경 리터럴이 남지 않는다', () => {
    expect(mobileHeaderClass(true)).not.toMatch(/#041B33|#061F3C|#031225|#071F3C/i);
  });

  it('그 외 탭 헤더는 기존 네이비 셸을 유지한다 (확정③ A안 = 홈 랜딩만 화이트)', () => {
    const other = mobileHeaderClass(false);
    expect(other).toContain('bg-navy');
    expect(other).toContain('text-bg');
  });
});
