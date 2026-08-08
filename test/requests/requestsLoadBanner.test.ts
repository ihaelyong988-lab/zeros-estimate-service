import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ==========================================
// 조회 실패 배너 통합 회귀 테스트
// ==========================================
// MyRequestsView(탭)와 MyRequestsModal(오버레이)이 바이트 동일한 배너를 각자 들고 있었다
// (2026-08-08 대조 후 통합). 게이트(ui-quality-gate)는 app/·components/ 만 스윕하므로
// lib/ 로 옮긴 이 컴포넌트는 게이트의 사각지대다 — R1(에러 alert)·R3(터치 44px)를 여기서 채점한다.

const SOURCE_PATH = fileURLToPath(new URL('../../lib/requests/RequestsLoadBanner.tsx', import.meta.url));
const source = readFileSync(SOURCE_PATH, 'utf8');

describe('조회 실패 배너 마크업', () => {
  it('role="alert" 와 aria-live 로 알린다', () => {
    expect(source).toMatch(/role="alert" aria-live="assertive"/);
  });

  it('복구 버튼이 터치 타깃 44px 을 지킨다', () => {
    expect(source).toContain('min-h-11');
    expect(source).toContain("touchAction: 'manipulation'");
  });

  it('focus-visible 대체 스타일이 있다', () => {
    expect(source).toContain('focus-visible:outline-2');
  });

  it('인증 필요 여부로 복구 경로를 가른다', () => {
    // 401·403 은 같은 화면에서 다시 눌러도 실패한다 — 인증부터 다시 받아야 한다.
    expect(source).toContain('error.authRequired ? onReauth : onRetry');
    expect(source).toContain("error.authRequired ? '다시 인증하기' : '다시 시도'");
  });

  it('실패가 없으면 스스로 아무것도 그리지 않는다', () => {
    // 호출부가 `{loadError && (…)}` 로 감싸면 게이트 R1(파일 단위로 role="alert" 를 찾는다)이
    // 배너를 넘긴 파일을 위반으로 잡는다. 널 판정은 배너가 갖는다(components/admin/AlertBanner 와 동일 규약).
    expect(source).toContain('if (!error) return null;');
    for (const caller of ['../../components/MyRequestsView.tsx', '../../components/MyRequestsModal.tsx']) {
      const callerSource = readFileSync(fileURLToPath(new URL(caller, import.meta.url)), 'utf8');
      expect(callerSource, caller).not.toMatch(/loadError\s*&&\s*<RequestsLoadBanner/);
      expect(callerSource, caller).toMatch(/<RequestsLoadBanner error=\{loadError\}/);
    }
  });

  it('실패 사유를 그대로 보여준다', () => {
    // 사유를 버리면 고객도 운영자도 원인을 알 수 없다(lib/requests/loadOutcome.ts).
    expect(source).toContain('{error.message}');
  });
});
