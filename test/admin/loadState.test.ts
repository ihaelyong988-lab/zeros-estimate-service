import { describe, expect, it } from 'vitest';
import { DataRequestError } from '@/lib/supabase/client';
import {
  ADMIN_SESSION_EXPIRED_MESSAGE,
  UNRESOLVED,
  resolveAdminLoadError,
} from '@/lib/admin/loadState';

// ==========================================
// 관리자 화면 조회 실패 판정 회귀 테스트 (2026-08-07 A5·B10)
// ==========================================
// 대시보드는 401(세션 만료)로 집계를 못 받아도 KPI 를 0 으로 그렸다 — 운영자와 대표가
// "이번 달 확정 매출 0원, 미수금 0원"을 사실로 읽는다. 미수금 0 은 회수 활동을 멈춘다.
// 고객·방문·알림 화면도 catch 에서 빈 배열로 떨어져 "등록된 고객이 없습니다"를 표시했다.
// 관리자 토큰 TTL 이 8시간이라 매일 재현된다.
//  - 인증 오류는 재로그인 경로를 알린다(접수 목록과 같은 문구).
//  - 그 외 오류는 무엇을 못 불러왔는지 + 서버 사유를 함께 알린다.
//  - 실패한 칸의 표기는 0 이 아니다.

const HEADLINE = '대시보드 집계를 불러오지 못했습니다.';

describe('resolveAdminLoadError', () => {
  it('401 은 세션 만료로 판정하고 재로그인 문구를 낸다', () => {
    const r = resolveAdminLoadError(HEADLINE, new DataRequestError('unauthorized', 401));
    expect(r.authRequired).toBe(true);
    expect(r.message).toBe(ADMIN_SESSION_EXPIRED_MESSAGE);
  });

  it('403 도 같은 재인증 경로로 묶는다', () => {
    const r = resolveAdminLoadError(HEADLINE, new DataRequestError('forbidden', 403));
    expect(r.authRequired).toBe(true);
    expect(r.message).toBe(ADMIN_SESSION_EXPIRED_MESSAGE);
  });

  it('인증 오류가 아닌 실패는 세션 만료로 오인하지 않고 사유를 남긴다', () => {
    const r = resolveAdminLoadError(HEADLINE, new DataRequestError('서버 오류', 500));
    expect(r.authRequired).toBe(false);
    expect(r.message).toBe(`${HEADLINE} 서버 오류`);
    expect(r.message).not.toBe(ADMIN_SESSION_EXPIRED_MESSAGE);
  });

  it('네트워크 단절처럼 상태코드가 없는 실패도 원인을 남긴다', () => {
    const r = resolveAdminLoadError(HEADLINE, new TypeError('Failed to fetch'));
    expect(r.authRequired).toBe(false);
    expect(r.message).toBe(`${HEADLINE} Failed to fetch`);
  });

  it('사유를 알 수 없으면 안내 문구만 낸다(꼬리 공백 없음)', () => {
    const r = resolveAdminLoadError(HEADLINE, undefined);
    expect(r.authRequired).toBe(false);
    expect(r.message).toBe(HEADLINE);
  });
});

describe('UNRESOLVED', () => {
  it('미확정 표기는 0 이 아니다 — 0 을 값처럼 보여주지 않는 것이 이 수정의 핵심이다', () => {
    expect(UNRESOLVED).not.toBe('0');
    expect(UNRESOLVED).not.toMatch(/\d/);
  });
});
