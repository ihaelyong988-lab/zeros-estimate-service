/**
 * 메인 스크롤 패널(`[data-main-scroll="true"]`)을 최상단으로 되돌린다.
 *
 * 탭·메뉴를 바꿔도 이전 화면의 스크롤 위치가 남아 새 화면이 중간부터 보이던 문제의 처방이다.
 * app/page.tsx · components/layout/AppShell.tsx · components/layout/TopHeader.tsx 에
 * 같은 본문이 바이트 동일하게 복제돼 있어 한 곳만 고치면 나머지가 어긋난다 — 구현을 여기 하나로 모은다.
 */
export function scrollMainPanelToTop(): void {
  // rAF 를 두 번 겹치는 이유 — 탭 전환으로 교체된 콘텐츠가 레이아웃에 반영된 다음 프레임에 스크롤해야
  // 옛 콘텐츠 높이를 기준으로 스크롤돼 첫 화면이 어긋나는 일이 없다.
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const mainScroll = document.querySelector('[data-main-scroll="true"]') as HTMLElement | null;
      if (mainScroll) {
        // scroll-snap 을 잠시 끄는 이유 — 모바일 랜딩 패널은 `snap-y snap-mandatory` 라
        // 켜진 채로 top:0 을 주면 브라우저가 인접 스냅 지점으로 되돌린다.
        const originalSnap = mainScroll.style.scrollSnapType;
        mainScroll.style.scrollSnapType = 'none';
        mainScroll.scrollTo({ top: 0, behavior: 'auto' });
        window.requestAnimationFrame(() => {
          mainScroll.style.scrollSnapType = originalSnap;
        });
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  });
}
