/**
 * 모바일 셸(상단 헤더·드로어·하단 탭)의 "홈 랜딩 / 그 외 탭" 색상·치수 분기.
 *
 * AGENTS §10-A 공통 1항 — 모바일 메인화면(홈 랜딩)은 화이트 배경 · 네이비 헤드라인 ·
 * 스틸블루 단색 아이콘이고, 나머지 탭은 기존 네이비 셸을 유지한다(확정③ A안).
 * 분기가 JSX 곳곳에 흩어져 있으면 한쪽만 고쳐 조문이 다시 깨지므로, 치수가 걸린 값은 여기 모아
 * 테스트로 고정한다. Tailwind 는 소스의 리터럴 문자열만 스캔하므로 클래스는 조립하지 않는다.
 */

/** 터치 타깃 최소 변(px). AGENTS §10 가독성 체크리스트 · 게이트 R3. */
export const TOUCH_MIN_PX = 44;

/**
 * 헤더 총높이(px). 자식을 44px 로 키우는 대신 상하 패딩을 회수해 이 값을 유지한다.
 * §10-A O-38 — 세로를 줄일 때 폰트를 깎지 않는다. 줄인 것은 패딩뿐이다.
 */
export const MOBILE_HEADER_HEIGHT_PX = { landing: 64, default: 68 } as const;

/** 헤더 컨테이너 — 배경·글자·테두리·패딩. 랜딩은 화이트 셸 + 헤어라인 #E4EAF2. */
export const mobileHeaderClass = (isLanding: boolean): string =>
  isLanding
    ? 'bg-bg text-navy border-[#E4EAF2] px-5 py-2.5'
    : 'bg-navy text-bg border-white/5 px-5 py-3';

/** 헤더 안 텍스트 버튼(로고·간편 로그인·AI NATIVE)의 44px 확보 클래스. */
export const HEADER_TOUCH_CLASS = 'min-h-[44px]';

/** 아이콘 전용 버튼(메뉴 열기·닫기)의 44×44 클래스. */
export const ICON_TOUCH_CLASS = 'w-11 h-11';
