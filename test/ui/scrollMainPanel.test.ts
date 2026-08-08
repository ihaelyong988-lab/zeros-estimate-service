import { afterEach, describe, expect, it, vi } from 'vitest';
import { scrollMainPanelToTop } from '@/lib/ui/scrollMainPanel';

/**
 * 세 파일(page·AppShell·TopHeader)에 복제돼 있던 구현을 하나로 모으며 동작을 고정한다.
 * vitest 환경이 node 라 DOM 이 없어 window·document 를 최소 스텁으로 세운다.
 */

type Frame = () => void;

/** rAF 를 큐로 대체해 "몇 프레임 뒤에 무엇이 실행되는가"를 검사 가능하게 만든다. */
function setupDom(mainScroll: Record<string, unknown> | null) {
  const frames: Frame[] = [];
  const windowScrollTo = vi.fn();
  const win = {
    requestAnimationFrame: (fn: Frame) => {
      frames.push(fn);
      return frames.length;
    },
    scrollTo: windowScrollTo,
  };
  const querySelector = vi.fn(() => mainScroll);
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', { querySelector });
  /** 큐에 쌓인 프레임을 1틱 실행한다 — 실행 중 새로 예약된 것은 다음 틱으로 넘긴다. */
  const tick = () => {
    const due = frames.splice(0, frames.length);
    due.forEach((fn) => fn());
  };
  return { tick, windowScrollTo, querySelector, pending: () => frames.length };
}

/** 실제 패널을 흉내 낸 스텁 — style.scrollSnapType 과 scrollTo 만 쓴다. */
function panelStub(initialSnap: string) {
  return { style: { scrollSnapType: initialSnap }, scrollTo: vi.fn() };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('scrollMainPanelToTop', () => {
  it('첫 프레임에는 아무것도 건드리지 않는다 (레이아웃 반영 대기)', () => {
    const panel = panelStub('y mandatory');
    const dom = setupDom(panel);

    scrollMainPanelToTop();
    expect(dom.querySelector).not.toHaveBeenCalled();

    dom.tick();
    expect(panel.scrollTo).not.toHaveBeenCalled();
    expect(dom.windowScrollTo).not.toHaveBeenCalled();
  });

  it('두 번째 프레임에 패널과 창을 즉시(auto) 최상단으로 올린다', () => {
    const panel = panelStub('y mandatory');
    const dom = setupDom(panel);

    scrollMainPanelToTop();
    dom.tick();
    dom.tick();

    expect(dom.querySelector).toHaveBeenCalledWith('[data-main-scroll="true"]');
    expect(panel.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
    expect(dom.windowScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
  });

  it('스크롤하는 순간에는 scroll-snap 을 꺼 둔다', () => {
    // snap 이 살아 있으면 top:0 이 인접 스냅 지점으로 되돌려진다.
    const panel = panelStub('y mandatory');
    const dom = setupDom(panel);
    panel.scrollTo.mockImplementation(() => {
      expect(panel.style.scrollSnapType).toBe('none');
    });

    scrollMainPanelToTop();
    dom.tick();
    dom.tick();

    expect(panel.scrollTo).toHaveBeenCalledTimes(1);
  });

  it('다음 프레임에 원래 snap 값을 되돌린다', () => {
    const panel = panelStub('y mandatory');
    const dom = setupDom(panel);

    scrollMainPanelToTop();
    dom.tick();
    dom.tick();
    expect(panel.style.scrollSnapType).toBe('none');

    dom.tick();
    expect(panel.style.scrollSnapType).toBe('y mandatory');
  });

  it('패널이 없어도 창 스크롤은 수행하고 예외를 던지지 않는다', () => {
    const dom = setupDom(null);

    scrollMainPanelToTop();
    dom.tick();
    dom.tick();

    expect(dom.windowScrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' });
    expect(dom.pending()).toBe(0);
  });
});
