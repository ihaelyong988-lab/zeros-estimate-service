import { afterEach, describe, expect, it, vi } from 'vitest';
import { ZerosService } from '@/lib/supabase/client';

// ==========================================
// 데이터 서비스 = /api/data 게이트웨이 단일 경로 회귀 테스트
// ==========================================
// 브라우저는 테이블에 직접 접근하지 않는다(AGENTS §13). 접수·삭제는 서버가 신원을 검증하고
// 단건 처리해야 하는데, 과거엔 같은 클래스 계층에 "배열을 받아 통째로 다시 저장하는" 대체 구현이
// 함께 있었다. 그 구현으로 흘러가면 접수번호 채번이 클라이언트로 내려가고(경쟁 조건),
// 삭제가 관리자 검증 없이 upsert 로 표현된다. 여기서 각 연산이 어떤 op 로 나가는지 고정한다.

interface DataCall {
  url: string;
  op: string;
  body: Record<string, unknown>;
}

// fetch 를 가로채 요청 본문을 기록한다 — "서버에 무엇을 물었는가"가 이 테스트의 판정 근거다.
function stubGateway(payload: unknown) {
  const calls: DataCall[] = [];
  vi.stubGlobal('fetch', async (url: string, init: { body: string }) => {
    const body = JSON.parse(init.body) as Record<string, unknown>;
    calls.push({ url, op: String(body.op), body });
    return { ok: true, status: 200, json: async () => payload };
  });
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ZerosService — 모든 입출력이 /api/data 를 지난다', () => {
  it('조회는 list op 로 나간다', async () => {
    const calls = stubGateway({ rows: [{ id: 'est-1' }] });

    await expect(ZerosService.getEstimates()).resolves.toEqual([{ id: 'est-1' }]);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('/api/data');
    expect(calls[0].op).toBe('list');
    expect(calls[0].body.table).toBe('zeros_estimates');
  });

  it('접수는 서버 단건 생성(createEstimate op)이다 — 클라이언트가 채번·저장하지 않는다', async () => {
    const created = { id: 'est-1', estimate_no: 'ZR-20260808-001' };
    const calls = stubGateway({ estimate: created });

    const result = await ZerosService.createEstimate(
      { customer_name: '홍길동', phone: '010-1234-5678' },
      { verifiedToken: 'verified-1' }
    );

    expect(result).toEqual(created);
    expect(calls.map((c) => c.op)).toEqual(['createEstimate']);
    // 인증 토큰은 로그인 세션이 아니라 호출부가 넘긴 값이 그대로 실려야 한다.
    expect(calls[0].body.verifiedToken).toBe('verified-1');
    // 접수 전 견적 목록을 받아 오지 않는다 — 목록을 근거로 한 채번은 서버 책임이다.
    expect(calls.some((c) => c.op === 'list' || c.op === 'upsert')).toBe(false);
  });

  it('견적 삭제는 서버 delete op 다 — upsert 로 표현하지 않는다', async () => {
    const calls = stubGateway({ ok: true });

    await ZerosService.deleteEstimate('est-1');

    expect(calls.map((c) => c.op)).toEqual(['deleteEstimate']);
    expect(calls[0].body.id).toBe('est-1');
  });

  it('결제 삭제는 서버 delete op 이고 남은 행에서 파생한 결제상태를 돌려준다', async () => {
    const calls = stubGateway({ payment_status: '부분결제' });

    await expect(ZerosService.deletePayment('pay-1')).resolves.toBe('부분결제');

    expect(calls.map((c) => c.op)).toEqual(['deletePayment']);
    expect(calls[0].body.id).toBe('pay-1');
  });
});
