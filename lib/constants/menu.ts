// ─────────────────────────────────────────────────────────────────────────────
// 좌측 메뉴 항목 ↔ 우측 결과 패널이 동일한 제목을 쓰도록 하는 단일 소스.
// 키 = 선택 키(공사영역=WorkType label / 외주제작=fab key / 견적규모=budget value),
// 값 = 화면에 노출되는 메뉴 제목. LeftSidebar·RightSidebar가 모두 이 맵을 참조한다.
// (제목을 바꿀 땐 여기 한 곳만 수정하면 양쪽이 자동으로 일치한다.)
// ─────────────────────────────────────────────────────────────────────────────
export const MENU_DISPLAY_NAMES: Record<string, string> = {
  // 공사 영역 (selectedMenu = WorkType label)
  '배관공사': '일반 배관공사',
  '장비설치': '기계 장비설치',
  'Utility 배관': 'Utility배관공사',
  '공장증설': '공장증설 검토',
  '노후배관교체': '노후배관교체',
  '기계실개선': '기계실 개선공사',
  '생산설비 배관 연결': '공정 배관공사',
  'CAPEX 개·증설 검토': 'CAPEX개선,증설',
  // 외주 제작 (selectedMenu = fab key)
  'spool': '배관 SPOOL Module',
  'skid': 'SKID 제작설치',
  'structure': 'Structure제작,설치',
  // 견적 규모 (selectedBudget = budget value)
  'small': '온라인 간편검토',
  'medium': '출장견적',
  'large': '프로젝트 사전진단',
  'unknown': '공사규모·금액',
};

// 선택 키 → 메뉴 제목. 매핑이 없으면 키 자체를 반환(안전 폴백).
export const menuDisplayName = (key: string): string => MENU_DISPLAY_NAMES[key] ?? key;
