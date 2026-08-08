/**
 * 모바일 하단 탭바의 탭 정의(순서·문구)와 활성/비활성 클래스.
 *
 * 같은 구조의 `<button>` 5개가 펼쳐져 있어 한 탭만 고치면 나머지 넷이 어긋났다.
 * 순서·문구는 AGENTS §10-A 확정 사항이라 임의 변경 금지 — 여기가 단일 소스다.
 * 하단 탭바와 모바일 드로어가 같은 목록을 쓰므로 두 곳이 이 배열을 함께 읽는다.
 * 아이콘은 lucide 컴포넌트라 렌더 계층(AppShell)에 두고 탭 키로 짝짓는다.
 */

/** 하단 탭바에 노출되는 탭. `decision`·`admin` 은 탭바에 없는 겹침 화면이라 제외한다. */
export type MobileBottomTab = 'home' | 'service' | 'request' | 'history' | 'account';

/** 탭 순서·문구 — §10-A 확정. 재정렬·문구 수정 금지. */
export const MOBILE_BOTTOM_TABS: readonly { tab: MobileBottomTab; label: string }[] = [
  { tab: 'home', label: '홈' },
  { tab: 'service', label: '서비스 소개' },
  { tab: 'request', label: '견적 문의' },
  { tab: 'history', label: '실적 집계표' },
  { tab: 'account', label: '마이페이지' },
];

/** 탭 버튼 클래스 — 활성은 accent, 비활성은 §10-A 가 정한 `text-gray hover:text-navy`. */
export const mobileBottomTabClass = (isActive: boolean): string =>
  `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-accent font-black scale-105' : 'text-gray hover:text-navy'}`;

/** 탭 라벨 폰트 — §10-A 확정 12px. */
export const MOBILE_TAB_LABEL_CLASS = 'text-[12px]';

/** 탭 아이콘 치수 — 22px(Tailwind `w-5.5`). */
export const MOBILE_TAB_ICON_CLASS = 'w-5.5 h-5.5';
