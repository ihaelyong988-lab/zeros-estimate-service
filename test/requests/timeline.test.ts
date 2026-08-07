import { describe, expect, it } from 'vitest';
import {
  Tone, STAGES, STATUS_TONE, TPL, fmtDate, fmtDateTime, stageIndex,
  toneBg, toneSoft, toneText,
} from '@/lib/requests/timeline';

// ==========================================
// 내 접수현황 공용 표기 규약 회귀 테스트
// ==========================================
// 이 규약은 MyRequestsView(마이페이지 탭)와 MyRequestsModal(오버레이) 두 화면이 공유한다.
// 한 곳에서만 값을 바꾸면 같은 접수 건이 화면마다 다른 색·다른 단계로 읽히므로, 화면이 실제로
// 조회하는 키(상태 문자열·템플릿 코드·tone)가 전부 살아 있는지를 여기서 고정한다.
// 날짜 포맷은 로컬 시각 기준이라(CI=UTC, 로컬=KST) 오프셋 없는 리터럴로 검증한다.

const TONES: Tone[] = ['steel', 'warning', 'accent', 'info', 'success', 'navy', 'gray'];

describe('tone 클래스 맵', () => {
  it('세 맵 모두 7개 tone 을 빠짐없이 가진다', () => {
    for (const map of [toneText, toneBg, toneSoft]) {
      expect(Object.keys(map).sort()).toEqual([...TONES].sort());
    }
  });

  it('클래스 문자열이 비어 있지 않다', () => {
    // 조회 실패 시 className 에 undefined 가 들어가 색 없는 점·배지가 렌더된다.
    for (const map of [toneText, toneBg, toneSoft]) {
      for (const tone of TONES) expect(map[tone]).toMatch(/\S/);
    }
  });
});

describe('STATUS_TONE', () => {
  it('모든 상태의 tone 이 클래스 맵에 존재한다', () => {
    for (const [status, tone] of Object.entries(STATUS_TONE)) {
      expect(toneSoft[tone], status).toBeTruthy();
      expect(toneBg[tone], status).toBeTruthy();
    }
  });

  it('진행 상태는 회색이 아니고, 종결 상태는 회색이다', () => {
    expect(STATUS_TONE['접수완료']).toBe('steel');
    expect(STATUS_TONE['견적서 송부완료']).toBe('success');
    expect(STATUS_TONE['수주성공']).toBe('success');
    for (const s of ['수주실패', '보류', '취소']) expect(STATUS_TONE[s]).toBe('gray');
  });
});

describe('TPL (알림 템플릿 코드 → 라벨·색)', () => {
  it('모든 템플릿의 tone 이 클래스 맵에 존재하고 라벨이 비어 있지 않다', () => {
    for (const [code, entry] of Object.entries(TPL)) {
      expect(entry.label, code).toMatch(/\S/);
      expect(toneSoft[entry.tone], code).toBeTruthy();
    }
  });

  it('알림 로그가 쓰는 코드를 모두 덮는다', () => {
    for (const code of [
      'ZR_REG_COMPLETE', 'ZR_REVIEWING', 'ZR_REQ_DOCS', 'ZR_PAY_WAIT', 'ZR_VISIT_PLAN',
      'ZR_VISIT_COMPLETE', 'ZR_QUOTE_SENT', 'ZR_WON_COMPLETE', 'ZR_STATUS_UPDATE', 'ZR_COMMON',
    ]) {
      expect(TPL[code], code).toBeDefined();
    }
  });
});

describe('stageIndex', () => {
  it('접수 → 검토 → 방문 → 견적 → 수주 순서로 매긴다', () => {
    expect(stageIndex('접수완료')).toBe(0);
    for (const s of ['검토중', '추가자료요청', '출장견적 결제대기']) expect(stageIndex(s), s).toBe(1);
    for (const s of ['방문일정 조율중', '현장방문 예정', '현장방문 완료']) expect(stageIndex(s), s).toBe(2);
    for (const s of ['견적서 작성중', '견적서 송부완료']) expect(stageIndex(s), s).toBe(3);
    expect(stageIndex('수주성공')).toBe(4);
  });

  it('종결·중단 상태는 -1 이다 — 화면은 스테퍼 대신 종료 안내를 띄운다', () => {
    for (const s of ['수주실패', '취소', '보류', '', '알 수 없는 상태']) expect(stageIndex(s), s).toBe(-1);
  });

  it('반환값이 STAGES 범위를 벗어나지 않는다', () => {
    for (const status of Object.keys(STATUS_TONE)) {
      expect(stageIndex(status), status).toBeLessThan(STAGES.length);
    }
    expect(STAGES).toHaveLength(5);
  });
});

describe('fmtDateTime · fmtDate', () => {
  it('연.월.일 과 시:분 을 2자리로 채운다', () => {
    expect(fmtDateTime('2026-07-05T09:03:00')).toBe('2026.07.05 09:03');
    expect(fmtDate('2026-07-05T09:03:00')).toBe('2026.07.05');
  });

  it('자정·연말 경계에서도 자리수가 깨지지 않는다', () => {
    expect(fmtDateTime('2026-12-31T00:00:00')).toBe('2026.12.31 00:00');
    expect(fmtDateTime('2026-01-09T23:59:00')).toBe('2026.01.09 23:59');
  });

  it('값이 없거나 파싱 불가면 - 를 준다', () => {
    // 타임라인 노드에 NaN 이 찍히면 접수 이력 전체가 고장난 것처럼 보인다.
    for (const bad of [undefined, '', '어제', '2026-13-45']) {
      expect(fmtDateTime(bad), String(bad)).toBe('-');
      expect(fmtDate(bad), String(bad)).toBe('-');
    }
  });

  it('같은 시각이면 fmtDate 는 fmtDateTime 의 날짜 부분과 같다', () => {
    const iso = new Date().toISOString();
    expect(fmtDateTime(iso).split(' ')[0]).toBe(fmtDate(iso));
  });
});
