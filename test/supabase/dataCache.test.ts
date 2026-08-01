import { describe, expect, it } from 'vitest';
import { DATA_CACHE_TTL_MS, ScopedTableCache, cacheScopeOf } from '@/lib/supabase/client';

// ==========================================
// 테이블 조회 캐시 회귀 테스트
// ==========================================
// 캐시가 권한 경계를 넘으면 그 자체가 PII 누출이다(AGENTS §13).
// 서버(/api/data)는 같은 테이블이라도 요청자 신원에 따라 다른 행을 돌려주므로
// (관리자=전체 행 · 고객=본인 건 · 익명=PII 제거 행), 캐시 칸은 신원별로 갈라져야 한다.

const TABLE = 'zeros_estimates';

const ADMIN = { adminToken: 'admin-token-1' };
const CUSTOMER_A = { sessionToken: 'sess-a', phone: '010-1234-5678' };
const CUSTOMER_B = { sessionToken: 'sess-b', phone: '010-9999-0000' };
const ANON = {};

// 호출 횟수를 세는 fetcher — "서버에 몇 번 갔는가"가 이 테스트의 판정 근거다.
function counter<T>(rows: T[]) {
  const state = { calls: 0 };
  return {
    state,
    fetch: async () => {
      state.calls += 1;
      return rows;
    },
  };
}

// 수동 시계 — 실제 30초를 기다리지 않고 TTL 경계를 판정한다.
function clockCache(ttlMs = DATA_CACHE_TTL_MS) {
  const clock = { now: 1_000_000 };
  const cache = new ScopedTableCache({ ttlMs, now: () => clock.now });
  return { cache, clock };
}

describe('cacheScopeOf — 권한 등급 분리', () => {
  it('관리자·고객·익명은 서로 다른 신원이다', () => {
    const scopes = [cacheScopeOf(ADMIN), cacheScopeOf(CUSTOMER_A), cacheScopeOf(ANON)];
    expect(new Set(scopes).size).toBe(3);
  });

  it('고객이 다르면 신원도 다르다', () => {
    expect(cacheScopeOf(CUSTOMER_A)).not.toBe(cacheScopeOf(CUSTOMER_B));
  });

  it('관리자 토큰이 다르면 신원도 다르다', () => {
    expect(cacheScopeOf({ adminToken: 'a' })).not.toBe(cacheScopeOf({ adminToken: 'b' }));
  });

  it('스테일 관리자 토큰이 남아 있어도 고객이 바뀌면 신원이 바뀐다', () => {
    // logoutCustomer 는 관리자 토큰을 지우지 않는다. 우세한 토큰(관리자) 하나만 키에 넣으면
    // 고객 A 의 행이 다음 고객 B 에게 그대로 나간다.
    const withA = cacheScopeOf({ ...ADMIN, ...CUSTOMER_A });
    const withB = cacheScopeOf({ ...ADMIN, ...CUSTOMER_B });
    expect(withA).not.toBe(withB);
    expect(withA).not.toBe(cacheScopeOf(ADMIN));
  });

  it('하이픈 유무가 달라도 같은 고객으로 본다 — 서버 판정(digits)과 같은 축', () => {
    expect(cacheScopeOf({ sessionToken: 'sess-a', phone: '01012345678' })).toBe(cacheScopeOf(CUSTOMER_A));
  });

  it('토큰이 하나도 없으면 익명이다', () => {
    expect(cacheScopeOf(ANON)).toBe('anon');
    expect(cacheScopeOf(null)).toBe('anon');
    expect(cacheScopeOf({ adminToken: '', sessionToken: '', phone: '' })).toBe('anon');
  });
});

describe('ScopedTableCache — 권한이 다르면 캐시를 공유하지 않는다', () => {
  it('관리자가 받은 전체 행이 익명 요청에 나가지 않는다', async () => {
    const { cache } = clockCache();
    const adminRows = [{ id: 'e1', phone: '010-1234-5678', customer_name: '홍길동' }];
    const anonRows = [{ id: 'e1' }];

    const admin = counter(adminRows);
    const anon = counter(anonRows);

    const asAdmin = await cache.load(cacheScopeOf(ADMIN), TABLE, admin.fetch);
    const asAnon = await cache.load(cacheScopeOf(ANON), TABLE, anon.fetch);

    expect(asAdmin).toEqual(adminRows);
    expect(asAnon).toEqual(anonRows); // PII 가 실린 관리자 행이 아니라 익명 응답
    expect(anon.state.calls).toBe(1); // 캐시로 때우지 않고 서버에 다시 물었다
  });

  it('고객 A 의 행이 고객 B 에게 나가지 않는다', async () => {
    const { cache } = clockCache();
    const rowsA = [{ id: 'a1', phone: '010-1234-5678' }];
    const rowsB = [{ id: 'b1', phone: '010-9999-0000' }];

    await cache.load(cacheScopeOf(CUSTOMER_A), TABLE, counter(rowsA).fetch);
    const forB = await cache.load(cacheScopeOf(CUSTOMER_B), TABLE, counter(rowsB).fetch);

    expect(forB).toEqual(rowsB);
    expect(cache.peek(cacheScopeOf(CUSTOMER_B), TABLE)).toEqual(rowsB);
  });

  it('신원이 바뀌면 이전 사용자의 행을 전부 버린다 — 되돌아와도 되살아나지 않는다', async () => {
    const { cache } = clockCache();
    const adminRows = [{ id: 'e1', phone: '010-1234-5678' }];

    await cache.load(cacheScopeOf(ADMIN), TABLE, counter(adminRows).fetch);
    // 로그아웃 = 다음 조회가 익명 신원으로 들어온다
    await cache.load(cacheScopeOf(ANON), TABLE, counter([{ id: 'e1' }]).fetch);

    // TTL(30초) 안에 같은 관리자 토큰으로 돌아와도 이전 행은 남아 있지 않다
    expect(cache.peek(cacheScopeOf(ADMIN), TABLE)).toBeUndefined();
  });

  it('clear() 는 캐시를 전부 비운다 — 로그아웃 즉시 호출 경로', async () => {
    const { cache } = clockCache();
    await cache.load(cacheScopeOf(ADMIN), TABLE, counter([{ id: 'e1' }]).fetch);
    expect(cache.peek(cacheScopeOf(ADMIN), TABLE)).toBeDefined();

    cache.clear();
    expect(cache.peek(cacheScopeOf(ADMIN), TABLE)).toBeUndefined();
  });

  it('진행 중인 요청도 신원 경계를 넘지 않는다', async () => {
    const { cache } = clockCache();
    let releaseAdmin: (rows: { id: string }[]) => void = () => {};
    const adminPending = new Promise<{ id: string }[]>((resolve) => {
      releaseAdmin = resolve;
    });

    const asAdmin = cache.load(cacheScopeOf(ADMIN), TABLE, () => adminPending);
    const anon = counter([{ id: 'anon-row' }]);
    const asAnon = await cache.load(cacheScopeOf(ANON), TABLE, anon.fetch);

    expect(anon.state.calls).toBe(1); // 관리자 요청에 얹혀 가지 않는다
    expect(asAnon).toEqual([{ id: 'anon-row' }]);

    releaseAdmin([{ id: 'admin-row' }]);
    await asAdmin;
    // 응답이 도착했을 때 신원이 이미 바뀌었으므로 익명 칸에 저장되지 않는다
    expect(cache.peek(cacheScopeOf(ANON), TABLE)).toEqual([{ id: 'anon-row' }]);
  });
});

describe('ScopedTableCache — 중복 제거·TTL·무효화', () => {
  it('같은 테이블 동시 요청은 하나로 합친다', async () => {
    const { cache } = clockCache();
    const rows = counter([{ id: 'e1' }]);
    const scope = cacheScopeOf(ADMIN);

    // 관리자 탭 전환 1회 = 사이드바 4 + 뷰 1 + 루트 1 = 6곳이 동시에 같은 테이블을 요청한다
    const results = await Promise.all(
      Array.from({ length: 6 }, () => cache.load(scope, TABLE, rows.fetch))
    );

    expect(rows.state.calls).toBe(1);
    expect(results.every((r) => r === results[0])).toBe(true);
  });

  it('TTL 안에서는 캐시를 준다', async () => {
    const { cache, clock } = clockCache();
    const rows = counter([{ id: 'e1' }]);
    const scope = cacheScopeOf(ADMIN);

    await cache.load(scope, TABLE, rows.fetch);
    clock.now += DATA_CACHE_TTL_MS - 1;
    await cache.load(scope, TABLE, rows.fetch);

    expect(rows.state.calls).toBe(1);
  });

  it('TTL 이 지나면 다시 받는다', async () => {
    const { cache, clock } = clockCache();
    const rows = counter([{ id: 'e1' }]);
    const scope = cacheScopeOf(ADMIN);

    await cache.load(scope, TABLE, rows.fetch);
    clock.now += DATA_CACHE_TTL_MS;
    await cache.load(scope, TABLE, rows.fetch);

    expect(rows.state.calls).toBe(2);
  });

  it('빈 목록도 캐시한다 — 0건 응답이 매번 재조회를 부르지 않는다', async () => {
    const { cache } = clockCache();
    const rows = counter<{ id: string }>([]);
    const scope = cacheScopeOf(ADMIN);

    expect(await cache.load(scope, TABLE, rows.fetch)).toEqual([]);
    expect(await cache.load(scope, TABLE, rows.fetch)).toEqual([]);
    expect(rows.state.calls).toBe(1);
  });

  it('쓰기 직후 무효화하면 다음 조회는 서버 값을 받는다', async () => {
    const { cache } = clockCache();
    const first = counter([{ id: 'e1', status: '접수완료' }]);
    const second = counter([{ id: 'e1', status: '검토중' }]);
    const scope = cacheScopeOf(ADMIN);

    await cache.load(scope, TABLE, first.fetch);
    cache.invalidate(TABLE); // persistTable 성공 직후
    const after = await cache.load(scope, TABLE, second.fetch);

    expect(after).toEqual([{ id: 'e1', status: '검토중' }]);
    expect(second.state.calls).toBe(1);
  });

  it('무효화는 지정한 테이블만 건드린다', async () => {
    const { cache } = clockCache();
    const scope = cacheScopeOf(ADMIN);
    const estimates = counter([{ id: 'e1' }]);
    const payments = counter([{ id: 'p1' }]);

    await cache.load(scope, TABLE, estimates.fetch);
    await cache.load(scope, 'zeros_payments', payments.fetch);
    cache.invalidate(TABLE);

    expect(cache.peek(scope, TABLE)).toBeUndefined();
    expect(cache.peek(scope, 'zeros_payments')).toEqual([{ id: 'p1' }]);
  });

  it('fresh 요청은 캐시를 건너뛴다 — 읽고-고쳐-쓰기가 스테일 스냅샷을 저장하지 않는다', async () => {
    const { cache } = clockCache();
    const scope = cacheScopeOf(ADMIN);
    const stale = counter([{ id: 'e1', status: '접수완료' }]);
    const live = counter([{ id: 'e1', status: '검토중' }]);

    await cache.load(scope, TABLE, stale.fetch);
    const fresh = await cache.load(scope, TABLE, live.fetch, true);

    expect(fresh).toEqual([{ id: 'e1', status: '검토중' }]);
    expect(live.state.calls).toBe(1);
    // 새로 받은 값으로 캐시도 갱신된다
    expect(cache.peek(scope, TABLE)).toEqual([{ id: 'e1', status: '검토중' }]);
  });

  it('실패는 캐시하지 않는다 — 다음 요청에서 다시 시도한다', async () => {
    const { cache } = clockCache();
    const scope = cacheScopeOf(ADMIN);

    await expect(
      cache.load(scope, TABLE, async () => {
        throw new Error('서버 오류');
      })
    ).rejects.toThrow('서버 오류');

    expect(cache.peek(scope, TABLE)).toBeUndefined();

    const retry = counter([{ id: 'e1' }]);
    expect(await cache.load(scope, TABLE, retry.fetch)).toEqual([{ id: 'e1' }]);
    expect(retry.state.calls).toBe(1);
  });

  it('동시 요청이 실패하면 모든 호출자에게 같은 오류가 간다', async () => {
    const { cache } = clockCache();
    const scope = cacheScopeOf(ADMIN);
    const failing = async (): Promise<{ id: string }[]> => {
      throw new Error('세션이 만료되었습니다.');
    };

    const results = await Promise.allSettled([
      cache.load(scope, TABLE, failing),
      cache.load(scope, TABLE, failing),
    ]);

    expect(results.every((r) => r.status === 'rejected')).toBe(true);
  });
});
