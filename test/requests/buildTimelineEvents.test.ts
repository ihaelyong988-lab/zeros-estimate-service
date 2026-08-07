import { describe, expect, it } from 'vitest';
import { buildTimelineEvents } from '@/lib/requests/timeline';
import { Estimate, NotificationLog } from '@/types/estimate';

// ==========================================
// 시계열 이벤트 합성 회귀 테스트
// ==========================================
// MyRequestsView(마이페이지 탭)와 MyRequestsModal(오버레이)이 각자 들고 있던 35줄짜리
// useMemo 를 한 함수로 합쳤다(2026-08-08, 바이트 동일 확인). 두 화면이 같은 접수 건을
// 다른 이력으로 보여주면 고객이 진행 상황을 신뢰하지 못한다.

const PHONE = '010-1234-5678';

const estimate = (over: Partial<Estimate> = {}): Estimate => ({
  id: 'est-1',
  estimate_no: 'ZR-2026-0001',
  customer_name: '홍길동',
  phone: PHONE,
  status: '접수완료',
  work_type: '배관 SPOOL Module',
  site_type: '공장',
  created_at: '2026-07-30T01:00:00.000Z',
  ...over,
} as Estimate);

const log = (over: Partial<NotificationLog> = {}): NotificationLog => ({
  id: 'log-1',
  estimate_no: 'ZR-2026-0001',
  phone: PHONE,
  template_code: 'ZR_REG_COMPLETE',
  content: '접수가 완료되었습니다.',
  sent_at: '2026-07-30T02:00:00.000Z',
  ...over,
} as NotificationLog);

describe('알림 로그가 있을 때', () => {
  it('로그만으로 이력을 만든다 — 견적 타임스탬프로 중복 합성하지 않는다', () => {
    // 로그가 권위 있는 상태변경 이력이다. 둘을 섞으면 같은 사건이 두 번 찍힌다.
    const events = buildTimelineEvents([log()], [estimate({ estimate_sent_at: '2026-07-31T00:00:00.000Z' })]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ id: 'log-1', label: '접수완료', desc: '접수가 완료되었습니다.', tone: 'steel' });
  });

  it('모르는 템플릿 코드는 회색 "알림" 으로 떨어뜨린다', () => {
    const [ev] = buildTimelineEvents([log({ template_code: 'ZR_UNKNOWN' })], []);
    expect(ev.label).toBe('알림');
    expect(ev.tone).toBe('gray');
  });
});

describe('알림 로그가 없을 때 (시드·구접수)', () => {
  it('접수 시각으로 접수완료 노드를 만든다', () => {
    const [ev] = buildTimelineEvents([], [estimate()]);
    expect(ev).toMatchObject({
      id: 'est-1-reg',
      estimateNo: 'ZR-2026-0001',
      label: '접수완료',
      tone: 'steel',
    });
    expect(ev.desc).toContain('공장 사전진단 접수');
  });

  it('견적 송부·수주 시각이 있으면 마일스톤을 더한다', () => {
    const events = buildTimelineEvents([], [estimate({
      status: '수주성공',
      estimate_sent_at: '2026-07-31T00:00:00.000Z',
      contract_won_at: '2026-08-01T00:00:00.000Z',
    })]);
    expect(events.map(e => e.id)).toEqual(['est-1-won', 'est-1-sent', 'est-1-reg']);
  });

  it('현재 상태가 마일스톤과 다르면 진행 상태 노드를 더한다', () => {
    const events = buildTimelineEvents([], [estimate({ status: '검토중' })]);
    expect(events.map(e => e.id).sort()).toEqual(['est-1-cur', 'est-1-reg']);
    expect(events.find(e => e.id === 'est-1-cur')).toMatchObject({ label: '검토중', tone: 'warning' });
  });

  it('마일스톤과 같은 상태면 진행 상태 노드를 만들지 않는다 — 같은 사건을 두 번 쓰지 않는다', () => {
    for (const status of ['접수완료', '견적서 송부완료', '수주성공'] as const) {
      const events = buildTimelineEvents([], [estimate({ status })]);
      expect(events.filter(e => e.id.endsWith('-cur')), status).toHaveLength(0);
    }
  });

  it('모르는 상태는 회색으로 떨어뜨린다', () => {
    // DB 에 union 밖 상태가 들어와도 색 없는 배지가 렌더되면 안 된다 — 런타임 방어를 고정한다.
    const events = buildTimelineEvents([], [estimate({ status: '알 수 없는 상태' as Estimate['status'] })]);
    expect(events.find(e => e.id === 'est-1-cur')?.tone).toBe('gray');
  });
});

describe('정렬', () => {
  it('최신순으로 내림차순 정렬한다', () => {
    const events = buildTimelineEvents([
      log({ id: 'a', sent_at: '2026-07-30T01:00:00.000Z' }),
      log({ id: 'c', sent_at: '2026-08-01T01:00:00.000Z' }),
      log({ id: 'b', sent_at: '2026-07-31T01:00:00.000Z' }),
    ], []);
    expect(events.map(e => e.id)).toEqual(['c', 'b', 'a']);
  });

  it('시각이 비어 있어도 정렬이 깨지지 않는다', () => {
    const events = buildTimelineEvents([
      log({ id: 'none', sent_at: undefined as unknown as string }),
      log({ id: 'has', sent_at: '2026-07-31T01:00:00.000Z' }),
    ], []);
    expect(events.map(e => e.id)).toEqual(['has', 'none']);
  });
});

describe('빈 입력', () => {
  it('둘 다 비면 이벤트도 0건이다 — 화면은 빈 상태 안내를 띄운다', () => {
    expect(buildTimelineEvents([], [])).toEqual([]);
  });
});
