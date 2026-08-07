import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { OTP_FORM_VARIANT } from '@/lib/otp/CustomerOtpLoginForm';

// ==========================================
// 접수현황 로그인 폼 통합 회귀 테스트
// ==========================================
// CustomerLoginModal(오버레이)과 MyRequestsView(마이페이지 탭)의 인증 폼을 한 컴포넌트로
// 합쳤다(2026-08-08). 통합은 리팩터링이지 리디자인이 아니다 — 통합 직전(8ac125d) 두 화면이
// 쓰던 클래스 문자열을 그대로 박아 두고, 한 글자라도 달라지면 여기서 막는다.
// 게이트(ui-quality-gate)는 app/·components/ 만 스윕하므로 lib/ 아래 이 컴포넌트는
// 게이트의 사각지대다(§15-5 동류). R1(에러 role="alert")도 여기서 대신 채점한다.

const SOURCE_PATH = fileURLToPath(new URL('../../lib/otp/CustomerOtpLoginForm.tsx', import.meta.url));
const source = readFileSync(SOURCE_PATH, 'utf8');

describe('화면별 차이(OTP_FORM_VARIANT)', () => {
  it('오버레이는 통합 이전 CustomerLoginModal 의 클래스와 같다', () => {
    expect(OTP_FORM_VARIANT.modal.codeStep).toBe('flex flex-col gap-3 border-t border-border/70 pt-3');
    expect(OTP_FORM_VARIANT.modal.note).toBe('flex items-center gap-1.5 text-[12px] text-gray font-medium');
  });

  it('탭 화면은 통합 이전 MyRequestsView 의 클래스와 같다', () => {
    // 코드 단계 슬라이드-인과 안내문 위 4px 이 탭 화면에만 있던 차이다.
    expect(OTP_FORM_VARIANT.page.codeStep)
      .toBe('flex flex-col gap-3 border-t border-border/70 pt-3 animate-in slide-in-from-top-2 duration-200');
    expect(OTP_FORM_VARIANT.page.note)
      .toBe('flex items-center gap-1.5 text-[12px] text-gray font-medium mt-1');
  });

  it('두 화면은 코드 단계·안내문 두 곳에서만 갈린다', () => {
    // variant 가 늘어나면 "두 화면이 같은 폼"이라는 전제가 깨진다 — 늘리기 전에 대조부터 한다.
    expect(Object.keys(OTP_FORM_VARIANT).sort()).toEqual(['modal', 'page']);
    for (const v of Object.values(OTP_FORM_VARIANT)) {
      expect(Object.keys(v).sort()).toEqual(['codeStep', 'note']);
    }
  });
});

describe('폼 마크업 불변식', () => {
  it('오류 표시에 role="alert" 와 aria-live 가 있다', () => {
    // 게이트 R1(차단룰)과 같은 판정. 접수 길목의 오류가 스크린리더에 안 읽히면 접수가 막힌 줄 모른다.
    expect(source).toMatch(/role="alert" aria-live="assertive"/);
  });

  it('문자 미설정 안내는 공용 상수를 쓴다', () => {
    // 문구를 새로 만들면 RequestWizard 와 다른 말을 하게 된다.
    expect(source).toContain("import { SMS_PENDING_NOTICE } from '@/lib/forms/requestForm'");
    expect(source).toContain('{SMS_PENDING_NOTICE}');
  });

  it('본문에 저대비 회색(text-gray-light)을 쓰지 않는다', () => {
    // §10 가독성 — 본문 대비 4.5:1. gray-light(#9AA3AF)는 본문 금지.
    expect(source).not.toMatch(/text-gray-light/);
  });
});
