export interface ManualContent {
  title: string;
  problemDefinition: string;
  preparationDocs: string[];
  deliverables: string[];
  onlineReviewAvailable: boolean;
  visitRequired: boolean;
  details: string;
}

export const manualData: Record<string, ManualContent> = {
  '배관공사': {
    title: '일반 / 용수 / 가스 배관공사',
    problemDefinition: '공장 용수, 가스, 스팀 라인의 노후화 및 부적절한 관경 설계로 인한 압력 강하와 누수 문제를 선제적으로 진단하고 최적의 유량 흐름을 확보합니다.',
    preparationDocs: [
      '기존 배관 계통도 (P&ID) 또는 단선도',
      '기계실 및 주요 분기점 현장 실측 사진',
      '공급원 압력 및 유량 설계 제원표'
    ],
    deliverables: [
      '관경 압력손실 계산 검토서',
      '설비 배치에 따른 권장 배관 경로안 (ISO 3D 도면 스케치)',
      '자재 사양서 (재질, 스케줄 배관 규격 제안)'
    ],
    onlineReviewAvailable: true,
    visitRequired: false,
    details: '기본적인 P&ID 및 현장 치수 사진이 확보된 경우 온라인 검토가 가능하나, 기존 밸브 헤더 및 복잡한 곡관부 연결이 필요한 경우 1차 검토 후 실측 출장이 권장됩니다.'
  },
  '장비설치': {
    title: '산업 장비 및 설비 설치공사',
    problemDefinition: '대형 펌프, 탱크, 콤프레셔 등 신규 장비의 반입 경로 확보, 기초 패드 응력 분산, 그리고 배관 인입부의 열팽창 신축 흡수 설계를 검토합니다.',
    preparationDocs: [
      '도입 장비 승인도면 및 제원표 (무게, 규격, 진동 정보)',
      '반입구 및 기계실 진입 동선 평면도',
      '기초 콘크리트 패드 두께 및 배근 도면'
    ],
    deliverables: [
      '장비 반입 및 양중 계획 제안서',
      '노즐 연결부 팽창 완충관 설계안 (플렉시블 조인트 규격)',
      '장비 주변 유지보수 여유 공간 유효성 검증'
    ],
    onlineReviewAvailable: true,
    visitRequired: true,
    details: '장비 무게가 5톤을 초과하거나 반입구 높이 여유가 200mm 미만인 협소 공간의 경우 크레인 양중 및 바닥 하중 분산 검토를 위해 실지 방문 조사가 필수적으로 병행됩니다.'
  },
  'Utility 배관': {
    title: '유틸리티 (스팀 / 에어 / 냉각수) 배관공사',
    problemDefinition: '생산 라인에 에너지를 공급하는 유틸리티 배관의 열손실 차단, 압축공기 응축수 고임 배출 구조(Trap), 급격한 부하 변동에 대응하는 루프 배관 구성을 진단합니다.',
    preparationDocs: [
      '보일러, 칠러, 공기압축기 용량 제원표',
      '공장 유틸리티 인입 메인 밸브 규격 및 압력',
      '공장 천장 트러스 구조 및 배관 지지 상태 사진'
    ],
    deliverables: [
      '에너지 열손실 저감 보온재 사양 제안서',
      '응축수 배출 트랩 스테이션 배치 구조안',
      '공정 유압/기압 유지용 버퍼 탱크 권장 용량 계산서'
    ],
    onlineReviewAvailable: true,
    visitRequired: false,
    details: '천장 높이 5m 이상의 고소 작업이 수반되거나 트러스 구조 보강이 필요한 경우, 안전 비계 설치 및 빔 클램프 지지 구조 진단을 위해 현장 실측이 뒤따라야 합니다.'
  },
  '공장증설': {
    title: '생산라인 증설 및 분기 배관공사',
    problemDefinition: '공장 가동 중단(Shut-down) 시간을 최소화하면서 기존 메인 배관에서 안정적으로 유체를 분기(Tie-in)하고, 증설 후 기존 설비의 유량 부족 현상이 발생하지 않도록 시뮬레이션합니다.',
    preparationDocs: [
      '전체 공장 평면 배치도 (기존 vs 증설 예정)',
      '기존 메인 배관 재질 및 관경 정보',
      '증설 장비의 분기별 필요 유량 및 압력 요구서'
    ],
    deliverables: [
      '무중단 티인 (Hot-tapping) 공법 적용성 검토서',
      '증설 후 메인 배관 유량 분배 계산서',
      '단계별 셧다운 및 1차 연결 공정 스케줄 제안'
    ],
    onlineReviewAvailable: false,
    visitRequired: true,
    details: '증설 공사는 기존 공장의 조업 일정과 밀접하게 연동되므로 현장 엔지니어가 기존 배관 차단 밸브의 기밀 상태와 현장 용접 여건을 직접 확인해야 오차가 발생하지 않습니다.'
  },
  '노후배관교체': {
    title: '노후 배관 철거 및 신설공사',
    problemDefinition: '장기 사용으로 인한 내부 스케일 축적, 고온 부식, 누수가 진행된 배관을 가동 가혹도에 적합한 최신 내부식성 재질로 교체 설계하고 친환경 철거 절차를 검토합니다.',
    preparationDocs: [
      '배관 설치 연도 및 누수 이력 대장',
      '유체 화학 성분 분석표 (부식 인자 확인용)',
      '노후 구간 외관 및 지지대 열화 상태 근접 사진'
    ],
    deliverables: [
      '재질 내구성 비교 검토서 (SUS, Carbon Steel, 비금속 등)',
      '노후 배관 잔존 수명 진단 및 교체 우선순위 리포트',
      '안전 철거 및 환경 잔류 유체 배출 계획 가이드'
    ],
    onlineReviewAvailable: true,
    visitRequired: true,
    details: '독성 유체나 고압 배관의 경우 철거 과정에서 잔류 가스 배출 및 화학 세정이 선행되어야 하므로 현장 배관 검사 전문가의 직접 조사가 필수적입니다.'
  },
  '기계실개선': {
    title: '기계실 및 펌프실 배관 개선공사',
    problemDefinition: '밀집된 복잡 구조 기계실 내의 펌프 흡입측 공동현상(Cavitation) 방지 편심 이경관 설계, 공동 배관 매니폴드 균등 분배 구조, 유지보수 밸브 접근 동선 한계를 전면 개선합니다.',
    preparationDocs: [
      '기계실 장비 배치 및 기존 배관 상세 평면도',
      '펌프 성능 곡선도 (Q-H Curve)',
      '밸브 및 여과기(Strainer) 막힘 압력 차이 정보'
    ],
    deliverables: [
      '편심 리듀서 도입을 통한 캐비테이션 방지 배관 배치안',
      '펌프실 동선 가시성 확보를 위한 3D 간섭 검토 스케치',
      '장비 고장 대비 예비기 분기 매니폴드 설계안'
    ],
    onlineReviewAvailable: false,
    visitRequired: true,
    details: '기계실 내부의 정밀한 구조적 공간 확보 여부와 지하 기계실 장비 반입용 루프 해치 가동 상태 분석을 위해 100% 현장 조사로 시행됩니다.'
  },
  '생산설비 배관 연결': {
    title: '생산설비 훅업 (Hook-up) 연결공사',
    problemDefinition: '정밀 제조 장비 또는 믹서, 충진기 노즐 전단의 초순수(DIW), 에어, 스팀 연결 시 이물질 유입을 차단하는 크린 배관 공법 및 레귤레이터 안정 압력 제어 시스템을 설계합니다.',
    preparationDocs: [
      '장비 공급사 제공 연결부 인터페이스 치수 사양서',
      '유체 순도 요구 사양 (Cleanliness Class)',
      '장비 전단 필터 및 감압 밸브 조립 배치도'
    ],
    deliverables: [
      '크린 클래스 부합 훅업 자재 리스트 (EP 배관, 피팅 사양)',
      '설비 유입 압력 안전 복합 레귤레이터 제안서',
      '배관 내부 퍼지(Clean Purge) 및 파티클 검증 시나리오'
    ],
    onlineReviewAvailable: true,
    visitRequired: false,
    details: '제약, 바이오, 정밀 화학 공정의 위생적(Sanitary) 배관은 설계 치수가 정밀해야 하므로, 공급사 도면이 명확하면 온라인 진단만으로도 대부분의 상세 사양 결정이 가능합니다.'
  },
  'CAPEX 개·증설 검토': {
    title: 'CAPEX 개·증설 사업비 사전검토',
    problemDefinition: '기획 단계에서 상세 설계 도면이 없어 예산 수립이 곤란한 예비 CAPEX 계획에 대하여 유사 표본 및 단가 분석을 활용해 견적 상한선(Budget Cap)을 수립하고 설계 리스크를 조기 식별합니다.',
    preparationDocs: [
      '사업 타당성 보고서 초안 또는 컨셉 플로우 시트',
      '예산 범위 제한 및 투자 회수기 한계 목표치',
      '도입 희망 공법 설명서 또는 제조 장비 카탈로그'
    ],
    deliverables: [
      'CAPEX 공종별 예산 한도 보고서 (WBS 구조)',
      '설계 및 조달 리스크 조기 감지 매트릭스',
      '실행 예산 대비 시공사 견적 타당성 검증 가이드'
    ],
    onlineReviewAvailable: true,
    visitRequired: false,
    details: '사업 기획 단계에서는 현장 방문보다 도큐먼트 검토와 재무 분석, 공법 타당성 토론이 주가 되므로 100% 비대면 컨설팅 워크숍 방식으로도 의사결정이 가능합니다.'
  },
  'small': {
    title: '온라인 간편검토 (견적 1,000만 이하)',
    problemDefinition: '비교적 소규모 배관 분기나 간단한 펌프/밸브 단품 교체 등, 현장 사진과 기본 사양 정보만으로 24시간 내 자재비와 표준 노무비를 즉시 검토할 수 있습니다.',
    preparationDocs: [
      '교체 대상 부위의 고화질 현장 사진 (전경 및 근접)',
      '연결 규격 정보 (파이프 인치, 밸브 나사산/플랜지 사양)',
      '현장 주행 동선 및 높이 정보'
    ],
    deliverables: [
      '표준 자재 단가 비교표',
      '공종별 권장 투입 인건비 (품셈 기준)',
      '온라인 간편 스코프 진단 소견서'
    ],
    onlineReviewAvailable: true,
    visitRequired: false,
    details: '온라인 간편검토는 엔지니어의 현장 출장 비용이 발생하지 않으므로 전액 무료로 진행되며, 자료 접수 후 24시간 이내에 진단서가 송부됩니다.'
  },
  'medium': {
    title: '출장 실측 및 견적 검토 (견적 1,000만 ~ 1억)',
    problemDefinition: '기계실 배관 개보수, 공장 일부 라인 분기 및 증설 등 중간 규모 공사는 가동 중단(Shut-down) 일정 조율과 현장 비계 설치 등 물리적 제약 요소를 정밀 검토해야 합니다.',
    preparationDocs: [
      '공장 기계실 배치도 또는 기존 계통 도면',
      '설비 인입 메인 전력 및 압축공기 용량표',
      '희망 공사 일정 및 셧다운 가능 여부'
    ],
    deliverables: [
      '정밀 레이저 실측 3D ISO 도면 스케치',
      '물리적 간섭 요인 분석 및 우회 배관 경로안',
      '시공사 견적 타당성 검증 검토서 (1차 스코프 고정)'
    ],
    onlineReviewAvailable: true,
    visitRequired: true,
    details: '정확한 관경 압력손실 계산 및 밸브 동선 확보를 위해 전문 실측 엔지니어가 현장을 직접 방문하여 구조적 리스크를 진단하고 오차율을 5% 이내로 좁힙니다.'
  },
  'large': {
    title: '프로젝트 사전진단 (견적 1억 초과 대형 CAPEX)',
    problemDefinition: '공장 전체 신증설, 생산 설비 대대적 훅업(Hook-up) 연결 등 대형 프로젝트는 시공사 입찰 전 원가 타당성을 철저히 규명하고 대규모 설계 변경 리스크를 예방해야 합니다.',
    preparationDocs: [
      '신설 라인 기획 컨셉안 또는 P&ID 초안',
      '도입 공정 장비 제조사 사양서 및 무게/진동 사양',
      '전체 공장 CAPEX 예산 한도 목표 및 Schedules'
    ],
    deliverables: [
      '공종별 실행 예산 가이드라인 (WBS 표준화)',
      '종합 설계 리스크 조기 식별 매트릭스',
      '1군 건설사 공법 기준 자재 적합성 검증서'
    ],
    onlineReviewAvailable: false,
    visitRequired: true,
    details: '대형 CAPEX 진단은 단순 출장을 넘어, 기획 워크숍 및 설계 최적화(VE) 단계를 포함하는 종합 컨설팅 프로세스로 가동되어 기업 투자 의사결정의 리스크를 원천 분쇄합니다.'
  },
  'unknown': {
    title: '규모 미정 전문가 유선 상담',
    problemDefinition: '아직 대략적인 예산 한도나 공사 범위가 수립되지 않아 검토 방향 설정에 난항을 겪고 계신 고객님을 위해, 전담 기술 상담 엔지니어를 신속히 배정하여 기초 진단을 수행합니다.',
    preparationDocs: [
      '현재 겪고 계신 설비 문제 상황 설명',
      '대략적인 공장 현장 위치 및 유선 연락처',
      '기존 시공 계약서나 간이 도면이 있는 경우 지참'
    ],
    deliverables: [
      '기초 엔지니어링 상담 속기록',
      '사전진단 필요 자료 체크리스트 맞춤형 작성',
      '차후 출장 실측 또는 간편검토 전환 가이드라인'
    ],
    onlineReviewAvailable: true,
    visitRequired: false,
    details: '상담 요청 접수 시 ZEROS 전담 엔지니어가 2시간 내에 유선 연락을 취해 무료 가이드 라인을 잡아드리고 적절한 사전검토 방식을 제안해 드립니다.'
  }
};
