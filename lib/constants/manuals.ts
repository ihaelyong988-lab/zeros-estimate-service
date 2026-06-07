export interface SopStep {
  phase: string;   // 단계 라벨 (예: STEP 1)
  title: string;   // 단계 제목
  action: string;  // 수행 내용
}

export interface BenefitProof {
  metric: string;  // 핵심 수치 (예: -28%)
  label: string;   // 지표 명칭
  desc: string;    // 효과 증빙 설명
}

export interface ManualContent {
  title: string;
  problemDefinition: string;
  preparationDocs: string[];
  sop: SopStep[];            // 작업 SOP (표준 작업 절차)
  deliverables: string[];
  benefits: BenefitProof[];  // 결과 지표 & Benefit 효과 증빙
  onlineReviewAvailable: boolean;
  visitRequired: boolean;
  details: string;
  group?: 'review' | 'fabrication'; // 사전검토 / 외주제작 구분
}

export const manualData: Record<string, ManualContent> = {
  '배관공사': {
    title: '일반 / 용수 / 가스 배관공사',
    problemDefinition: '공장 용수·가스·스팀 라인의 관경·압력 강하·누수를 진단해 최적 유량 흐름을 확보합니다.',
    preparationDocs: [
      '배관 계통도(P&ID)·단선도 — 없으면 손도면 또는 약도도 가능',
      '기계실·주요 분기점 현장 사진 (전경과 접속부를 구분해 촬영)',
      '유체 종류와 운전 조건 (용수·가스·스팀 / 압력·온도)',
      '공급원 용량 제원 — 보일러·펌프 명판 사진으로 대체 가능',
      '확인 가능한 배관 관경·재질·대략 길이'
    ],
    sop: [
      { phase: 'STEP 1', title: '자료 정밀 검토', action: 'P&ID·현장 사진 치수/규격 대조' },
      { phase: 'STEP 2', title: '유동 해석 진단', action: '관마찰·유속 계산으로 관경 적정성 판정' },
      { phase: 'STEP 3', title: '시공성·간섭 검토', action: '반입 동선·기존 설비 간섭·지지 간격 확인' },
      { phase: 'STEP 4', title: '자재·품셈 매핑', action: 'ASME/KS 자재·표준 품셈으로 단가 거품 제거' },
      { phase: 'STEP 5', title: '스코프 리포트', action: '복수 업체 비교용 범위 고정 리포트 송부' }
    ],
    deliverables: [
      '관경 압력손실 계산 검토서',
      '설비 배치에 따른 권장 배관 경로안 (ISO 3D 도면 스케치)',
      '자재 사양서 (재질, 스케줄 배관 규격 제안)'
    ],
    benefits: [
      { metric: '-28%', label: '견적 거품 절감', desc: '표준 품셈 대비 과다 청구 항목을 사전 차단합니다.' },
      { metric: '99.8%', label: 'AI 분석 신뢰도', desc: '74건 실거래 표본 대조로 단가를 교정합니다.' },
      { metric: '24h', label: '1차 검토 회신', desc: '자료 접수 후 24시간 내 진단 방향을 회신합니다.' }
    ],
    onlineReviewAvailable: true,
    visitRequired: false,
    details: '기본적인 P&ID 및 현장 치수 사진이 확보된 경우 온라인 검토가 가능하나, 기존 밸브 헤더 및 복잡한 곡관부 연결이 필요한 경우 1차 검토 후 실측 출장이 권장됩니다.'
  },
  '장비설치': {
    title: '산업 장비 및 설비 설치공사',
    problemDefinition: '대형 펌프·탱크·콤프레셔의 반입 동선·기초 하중 분산·배관 인입부 열팽창 흡수를 검토합니다.',
    preparationDocs: [
      '장비 승인도면·제원표 (무게·치수·진동 정보)',
      '반입구·기계실 진입 동선 평면도 (폭·높이 표기)',
      '기초 콘크리트 패드 두께·배근 도면 — 없으면 현장 사진',
      '전원·유틸리티 인입 위치와 용량',
      '설치 후 유지보수 여유 공간 희망 치수'
    ],
    sop: [
      { phase: 'STEP 1', title: '반입 동선 분석', action: '진입로 폭·높이 vs 장비 치수 대조' },
      { phase: 'STEP 2', title: '하중 분산 검토', action: '기초 패드 응력·방진 패드 적합성 평가' },
      { phase: 'STEP 3', title: '인입부 설계', action: '노즐 열팽창 흡수 플렉시블 조인트 산정' },
      { phase: 'STEP 4', title: '유지보수 동선 확보', action: '점검·교체 여유 공간 간섭 검토' },
      { phase: 'STEP 5', title: '양중 계획 확정', action: '크레인 배치·안전 비계 반입 계획 송부' }
    ],
    deliverables: [
      '장비 반입 및 양중 계획 제안서',
      '노즐 연결부 팽창 완충관 설계안 (플렉시블 조인트 규격)',
      '장비 주변 유지보수 여유 공간 유효성 검증'
    ],
    benefits: [
      { metric: '-22%', label: '양중 비용 절감', desc: '간섭·재작업을 사전 제거해 양중 리스크 비용을 낮춥니다.' },
      { metric: '5.2T', label: '하중 분산 검증', desc: '기초 패드 응력 텐서를 정량 검증해 침하를 예방합니다.' },
      { metric: '99.6%', label: 'AI 분석 신뢰도', desc: '48건 표본 대조로 설치 단가를 교정합니다.' }
    ],
    onlineReviewAvailable: true,
    visitRequired: true,
    details: '장비 무게가 5톤을 초과하거나 반입구 높이 여유가 200mm 미만인 협소 공간의 경우 크레인 양중 및 바닥 하중 분산 검토를 위해 실지 방문 조사가 필수적으로 병행됩니다.'
  },
  'Utility 배관': {
    title: '유틸리티 (스팀 / 에어 / 냉각수) 배관공사',
    problemDefinition: '스팀·에어·냉각수 라인의 열손실·응축수 트랩·루프 구성을 진단해 에너지 손실과 워터해머를 차단합니다.',
    preparationDocs: [
      '보일러·칠러·공기압축기 용량 제원표 (명판 사진 가능)',
      '유틸리티 인입 메인 밸브 규격·공급 압력',
      '천장 트러스 구조·배관 지지 상태 사진',
      '유체 종류와 사용 온도·압력 (스팀·냉각수·압축공기)',
      '기존 보온 두께·노후 상태 (확인 가능 시)'
    ],
    sop: [
      { phase: 'STEP 1', title: '열손실 진단', action: '보온 두께 대비 열손실 정량 계산' },
      { phase: 'STEP 2', title: '트랩 배치 검토', action: '응축수 고임 분석·트랩 위치 산정' },
      { phase: 'STEP 3', title: '루프 구성 설계', action: '부하 변동 대응 버퍼·루프 배관 제안' },
      { phase: 'STEP 4', title: '워터해머 점검', action: '드립 포켓 간격·구배 안전성 확인' },
      { phase: 'STEP 5', title: '에너지 리포트', action: '보온 사양·에너지 절감 효과 정리' }
    ],
    deliverables: [
      '에너지 열손실 저감 보온재 사양 제안서',
      '응축수 배출 트랩 스테이션 배치 구조안',
      '공정 유압/기압 유지용 버퍼 탱크 권장 용량 계산서'
    ],
    benefits: [
      { metric: '-24%', label: '에너지 손실 절감', desc: '보온·트랩 최적화로 스팀 열손실 비용을 줄입니다.' },
      { metric: '99.5%', label: 'AI 분석 신뢰도', desc: '62건 표본 대조로 유틸리티 단가를 교정합니다.' },
      { metric: '0', label: '워터해머 리스크', desc: '드립 포켓 간격 설계로 워터해머를 원천 예방합니다.' }
    ],
    onlineReviewAvailable: true,
    visitRequired: false,
    details: '천장 높이 5m 이상의 고소 작업이 수반되거나 트러스 구조 보강이 필요한 경우, 안전 비계 설치 및 빔 클램프 지지 구조 진단을 위해 현장 실측이 뒤따라야 합니다.'
  },
  '공장증설': {
    title: '생산라인 증설 및 분기 배관공사',
    problemDefinition: '가동 중단을 최소화하는 무중단 분기(Tie-in)와 증설 후 기존 설비의 유량 부족 여부를 시뮬레이션합니다.',
    preparationDocs: [
      '공장 평면 배치도 (기존 vs 증설 예정)',
      '기존 메인 배관 재질·관경 정보',
      '증설 장비 분기별 필요 유량·압력',
      '현재 가동 일정과 셧다운 가능 시간대',
      '기존 차단 밸브 위치·상태 (확인 가능 시)'
    ],
    sop: [
      { phase: 'STEP 1', title: '분기점 진단', action: '기존 배관 재질·관경 확인, 안전 분기 위치 선정' },
      { phase: 'STEP 2', title: '무중단 공법 검토', action: 'Hot-tapping 적용성·리스크 평가' },
      { phase: 'STEP 3', title: '유량 분배 해석', action: '증설 전후 차압 시뮬레이션' },
      { phase: 'STEP 4', title: '기존 설비 영향 검토', action: '유량 부족·압력 저하 여부 확인' },
      { phase: 'STEP 5', title: '셧다운 스케줄', action: '단계별 최소 중단 연결 공정 제안' }
    ],
    deliverables: [
      '무중단 티인 (Hot-tapping) 공법 적용성 검토서',
      '증설 후 메인 배관 유량 분배 계산서',
      '단계별 셧다운 및 1차 연결 공정 스케줄 제안'
    ],
    benefits: [
      { metric: '-31%', label: '셧다운 손실 절감', desc: '무중단 분기로 가동 중단에 따른 생산 손실을 최소화합니다.' },
      { metric: '99.2%', label: 'AI 분석 신뢰도', desc: '35건 표본 대조로 증설 단가를 교정합니다.' },
      { metric: '80A', label: 'Hot-Tap 적용', desc: '조업 중단 없이 메인 라인 안전 분기를 설계합니다.' }
    ],
    onlineReviewAvailable: false,
    visitRequired: true,
    details: '증설 공사는 기존 공장의 조업 일정과 밀접하게 연동되므로 현장 엔지니어가 기존 배관 차단 밸브의 기밀 상태와 현장 용접 여건을 직접 확인해야 오차가 발생하지 않습니다.'
  },
  '노후배관교체': {
    title: '노후 배관 철거 및 신설공사',
    problemDefinition: '스케일·부식·누수가 진행된 노후 배관을 최적 내부식재로 교체 설계하고 안전 철거 절차를 검토합니다.',
    preparationDocs: [
      '배관 설치 연도·누수 이력 (기억나는 범위로도 가능)',
      '유체 화학 성분 (부식 인자 확인용)',
      '노후 구간 외관·지지대 열화 근접 사진',
      '운전 압력·온도와 가동 중단 가능 여부',
      '누수·위험 우선 교체 희망 구간'
    ],
    sop: [
      { phase: 'STEP 1', title: '잔존수명 진단', action: '스케일 잔존 두께 비파괴 매핑' },
      { phase: 'STEP 2', title: '내식재 선정', action: '유체 화학식 기준 SUS316L 등 선정' },
      { phase: 'STEP 3', title: '교체 우선순위', action: '위험도 기반 단계별 시공 순서 수립' },
      { phase: 'STEP 4', title: '안전 철거 계획', action: '잔류 유체 세정·환경 배출 가이드' },
      { phase: 'STEP 5', title: '신설 연결 검증', action: '신·구 배관 접속부 규격 정합성 확인' }
    ],
    deliverables: [
      '재질 내구성 비교 검토서 (SUS, Carbon Steel, 비금속 등)',
      '노후 배관 잔존 수명 진단 및 교체 우선순위 리포트',
      '안전 철거 및 환경 잔류 유체 배출 계획 가이드'
    ],
    benefits: [
      { metric: '-27%', label: '교체 원가 절감', desc: '우선순위 기반 단계 교체로 불필요한 일괄 교체를 방지합니다.' },
      { metric: '99.7%', label: 'AI 분석 신뢰도', desc: '51건 표본 대조로 교체 단가를 교정합니다.' },
      { metric: '100%', label: 'SUS316L 적합', desc: '부식 인자 기반 내식재 치환으로 재누수를 예방합니다.' }
    ],
    onlineReviewAvailable: true,
    visitRequired: true,
    details: '독성 유체나 고압 배관의 경우 철거 과정에서 잔류 가스 배출 및 화학 세정이 선행되어야 하므로 현장 배관 검사 전문가의 직접 조사가 필수적입니다.'
  },
  '기계실개선': {
    title: '기계실 및 펌프실 배관 개선공사',
    problemDefinition: '밀집 기계실의 펌프 공동현상(Cavitation)·매니폴드 균등 분배·유지보수 동선 한계를 개선합니다.',
    preparationDocs: [
      '기계실 장비 배치·기존 배관 평면도',
      '펌프 성능 곡선도 (Q-H Curve, 명판 사진 가능)',
      '밸브·여과기(Strainer) 막힘 압력차 정보',
      '기계실 천장고·반입 해치 위치',
      '예비기(스탠바이) 운용 여부'
    ],
    sop: [
      { phase: 'STEP 1', title: '공동현상 진단', action: '펌프 흡입측 NPSH·압력 조건 분석' },
      { phase: 'STEP 2', title: '편심 이경관 설계', action: '공동현상 차단 편심 리듀서 배치' },
      { phase: 'STEP 3', title: '동선 간섭 검토', action: '밸브 조작 반경·유지보수 동선 3D 확인' },
      { phase: 'STEP 4', title: '매니폴드 균등 분배', action: '헤더 압력 균등 배관 구성' },
      { phase: 'STEP 5', title: '예비기 분기 설계', action: '고장 대비 예비기 분기 구조 제안' }
    ],
    deliverables: [
      '편심 리듀서 도입을 통한 캐비테이션 방지 배관 배치안',
      '펌프실 동선 가시성 확보를 위한 3D 간섭 검토 스케치',
      '장비 고장 대비 예비기 분기 매니폴드 설계안'
    ],
    benefits: [
      { metric: '-29%', label: '재시공 손실 절감', desc: '간섭 사전 검토로 기계실 재작업 비용을 절감합니다.' },
      { metric: '99.9%', label: 'AI 분석 신뢰도', desc: '42건 표본 대조로 개선 단가를 교정합니다.' },
      { metric: '0', label: '캐비테이션 차단', desc: '편심 이경관 설계로 펌프 공동현상을 원천 차단합니다.' }
    ],
    onlineReviewAvailable: false,
    visitRequired: true,
    details: '기계실 내부의 정밀한 구조적 공간 확보 여부와 지하 기계실 장비 반입용 루프 해치 가동 상태 분석을 위해 100% 현장 조사로 시행됩니다.'
  },
  '생산설비 배관 연결': {
    title: '생산설비 훅업 (Hook-up) 연결공사',
    problemDefinition: '정밀 장비 전단의 초순수·에어·스팀 크린 훅업과 레귤레이터 안정 압력 제어를 설계합니다.',
    preparationDocs: [
      '장비 공급사 연결부 인터페이스 치수 사양서',
      '유체 순도 요구 사양 (Cleanliness Class)',
      '장비 전단 필터·감압 밸브 배치도',
      '공급 유체 종류·압력·온도 (가스·초순수·스팀)',
      '클린룸 등급과 시공 가능 시간대'
    ],
    sop: [
      { phase: 'STEP 1', title: '인터페이스 검증', action: '연결부 치수·청정 등급 요구 사양 확인' },
      { phase: 'STEP 2', title: '크린 자재 선정', action: 'EP 배관·피팅 등 클린 클래스 자재 확정' },
      { phase: 'STEP 3', title: '압력 제어 설계', action: '복합 레귤레이터 안정 압력 설계' },
      { phase: 'STEP 4', title: '오비탈 용접 검토', action: '용접 사양·노무 적정성 산정' },
      { phase: 'STEP 5', title: '퍼지 검증', action: '내부 퍼지·파티클 청정도 검증 시나리오' }
    ],
    deliverables: [
      '크린 클래스 부합 훅업 자재 리스트 (EP 배관, 피팅 사양)',
      '설비 유입 압력 안전 복합 레귤레이터 제안서',
      '배관 내부 퍼지(Clean Purge) 및 파티클 검증 시나리오'
    ],
    benefits: [
      { metric: '-34%', label: '재작업 비용 절감', desc: '오비탈 용접 표준 노무 과다 청구를 필터링합니다.' },
      { metric: '0.01㎛', label: '초미세 여과', desc: '초미세 필터 배치로 파티클 유입을 차단합니다.' },
      { metric: '99.9%', label: 'AI 분석 신뢰도', desc: '45건 표본 대조로 훅업 단가를 교정합니다.' }
    ],
    onlineReviewAvailable: true,
    visitRequired: false,
    details: '제약, 바이오, 정밀 화학 공정의 위생적(Sanitary) 배관은 설계 치수가 정밀해야 하므로, 공급사 도면이 명확하면 온라인 진단만으로도 대부분의 상세 사양 결정이 가능합니다.'
  },
  'CAPEX 개·증설 검토': {
    title: 'CAPEX 개·증설 사업비 사전검토',
    problemDefinition: '도면 없는 기획 단계 CAPEX의 예산 상한선(Budget Cap)을 표본·단가로 수립하고 설계 리스크를 조기 식별합니다.',
    preparationDocs: [
      '사업 타당성 보고서 초안 또는 컨셉 플로우 시트',
      '목표 예산 범위·투자 회수기 한계',
      '도입 희망 공법 설명서·장비 카탈로그',
      '증설·신설 규모와 목표 가동 시점',
      '확보 부지·유틸리티 인프라 현황 (확인 가능 시)'
    ],
    sop: [
      { phase: 'STEP 1', title: '컨셉 진단', action: '플로우 시트·투자 목표로 검토 범위 정의' },
      { phase: 'STEP 2', title: '표본 단가 분석', action: '유사 1군 실거래로 공종별 상한 산정' },
      { phase: 'STEP 3', title: 'WBS 예산 수립', action: '공종별 실행 예산 한도 표준화' },
      { phase: 'STEP 4', title: '공법 타당성 검토', action: '대안 공법 비교·VE 적용성 평가' },
      { phase: 'STEP 5', title: '리스크 매트릭스', action: '설계·조달 리스크 조기 감지 정리' }
    ],
    deliverables: [
      'CAPEX 공종별 예산 한도 보고서 (WBS 구조)',
      '설계 및 조달 리스크 조기 감지 매트릭스',
      '실행 예산 대비 시공사 견적 타당성 검증 가이드'
    ],
    benefits: [
      { metric: '-37%', label: 'CAPEX 버블 억제', desc: '기획 단계에서 견적 거품을 사전 통제합니다.' },
      { metric: '99.5%', label: 'AI 분석 신뢰도', desc: '88건 표본 대조로 예산 상한선을 교정합니다.' },
      { metric: 'WBS', label: '예산 표준화', desc: '공종별 예산 한도를 표준 구조로 고정합니다.' }
    ],
    onlineReviewAvailable: true,
    visitRequired: false,
    details: '사업 기획 단계에서는 현장 방문보다 도큐먼트 검토와 재무 분석, 공법 타당성 토론이 주가 되므로 100% 비대면 컨설팅 워크숍 방식으로도 의사결정이 가능합니다.'
  },

  // ==========================================================
  // 외주 제작 (Fabrication Outsourcing) — 사전 제작/모듈화 공급
  // ==========================================================
  'spool': {
    title: '배관 SPOOL Module 사전제작 (Pipe Spool Prefabrication)',
    problemDefinition: 'ISO 도면 기반으로 배관 스풀을 팹샵에서 사전 제작·검사하여 현장은 조립만 수행하도록 모듈화합니다.',
    preparationDocs: [
      '배관 ISO 도면 또는 P&ID (스풀 분할 기준 포함)',
      '자재 사양 (재질·스케줄·등급, SUS/Carbon 등)',
      '용접·검사 기준 (WPS·NDT 요구 등급)',
      '납기 요구일과 현장 반입 조건',
      '현장 연결부(Tie-in) 위치·치수 (확인 가능 시)'
    ],
    sop: [
      { phase: 'STEP 1', title: 'ISO 스풀 분할', action: '운반·조립 단위 분할, 스풀 리스트 작성' },
      { phase: 'STEP 2', title: '팹샵 사전제작', action: '통제 환경에서 절단·맞춤·용접 수행' },
      { phase: 'STEP 3', title: '비파괴 검사', action: 'RT·PMI·MPI 검사 수행·기록' },
      { phase: 'STEP 4', title: '치수 검사', action: '스풀 실측·도면 정합성 대조' },
      { phase: 'STEP 5', title: '식별·출하', action: '스풀 마킹·출하 관리로 무오류 조립 지원' }
    ],
    deliverables: [
      '스풀 분할 도면 및 스풀 제작 리스트 (Cut/Weld Map)',
      '용접·비파괴 검사 성적서 (RT/PMI 기록)',
      '현장 조립 시퀀스 가이드 및 자재 추적 시트'
    ],
    benefits: [
      { metric: '-50%', label: '현장 공기 단축', desc: '사전 제작 병행으로 현장 용접 물량을 대폭 줄여 공기를 단축합니다.' },
      { metric: '+99%', label: '용접 품질 균일', desc: '팹샵 통제 환경 용접·검사로 품질 편차를 제거합니다.' },
      { metric: '-30%', label: '현장 인력 절감', desc: '현장 작업을 조립 중심으로 전환해 숙련 인력 부담을 낮춥니다.' }
    ],
    onlineReviewAvailable: true,
    visitRequired: false,
    details: 'ISO 도면과 자재 사양이 확정된 경우 도면 기반 비대면 검토만으로 스풀 분할·물량 산출이 가능합니다. 현장 연결부(Tie-in) 실측이 필요한 경우 출장 실측을 병행합니다.',
    group: 'fabrication'
  },
  'skid': {
    title: 'SKID Package 모듈 제작 (Skid-Mounted Module)',
    problemDefinition: '펌프·밸브·계장·제어를 단일 프레임에 패키지화해 공장 시운전(FAT) 후 반입, 현장 설치를 표준화합니다.',
    preparationDocs: [
      'P&ID·기계/계장 사양서 (펌프·밸브·계기 리스트)',
      '프레임 설치 공간·반입구 치수·하중 조건',
      '전기·제어(PLC/HMI) 인터페이스·유틸리티 조건',
      '운전 조건 (유량·압력·온도)',
      '현장 반입 경로·양중 가능 여부'
    ],
    sop: [
      { phase: 'STEP 1', title: '패키지 설계', action: '프레임 위 장비·배관·계장 3D 배치' },
      { phase: 'STEP 2', title: '공장 조립', action: '펌프·밸브·필터·센서 단일 스키드 통합' },
      { phase: 'STEP 3', title: '사전 시운전', action: '기밀·계장·제어 로직 FAT 검증' },
      { phase: 'STEP 4', title: '인터페이스 점검', action: '반입구·하중·유틸리티 정합성 대조' },
      { phase: 'STEP 5', title: '반입·연결', action: '현장은 유틸리티 연결만 수행' }
    ],
    deliverables: [
      '스키드 3D 배치도 및 프레임 구조 계산서',
      'FAT (공장 시운전) 성적서 및 계장/제어 점검표',
      '현장 반입·연결 인터페이스 가이드'
    ],
    benefits: [
      { metric: '-40%', label: '설치 기간 단축', desc: '공장 사전 조립·시운전으로 현장 설치 기간을 단축합니다.' },
      { metric: '100%', label: '품질 표준화', desc: '통제된 공장 환경에서 조립 품질을 균일하게 보증합니다.' },
      { metric: 'FAT', label: '사전 시운전 검증', desc: '반입 전 공장 시운전으로 현장 결함 발생을 최소화합니다.' }
    ],
    onlineReviewAvailable: true,
    visitRequired: false,
    details: 'P&ID와 장비 사양이 명확하면 모듈 구성·물량 산출은 비대면 검토로 가능합니다. 반입구·하중·유틸리티 인터페이스 확인이 필요한 경우 출장 실측을 병행합니다.',
    group: 'fabrication'
  },
  'structure': {
    title: 'Structure 철구조물 제작 (Steel Structure Fabrication)',
    problemDefinition: '가대(Pipe Rack)·플랫폼·서포트 철구조물을 도면 기반 공장 가공하여 현장 볼팅 조립을 표준화합니다.',
    preparationDocs: [
      '구조 도면·가대/플랫폼 배치도 (하중 조건 포함)',
      '강재 사양 (재질·규격, H-Beam/Channel/Plate)',
      '도장·아연도금 사양',
      '설치 위치·앵커 조건과 바닥 상태',
      '현장 조립 가능 시간대·반입 경로'
    ],
    sop: [
      { phase: 'STEP 1', title: '강재 준비·검사', action: '강재 규격·품질 검사, Shop Drawing 확정' },
      { phase: 'STEP 2', title: '절단·천공', action: '자동 가공으로 절단·천공·볼트홀 정밀 가공' },
      { phase: 'STEP 3', title: '조립·용접', action: '가조립 후 본 용접으로 부재 일체화' },
      { phase: 'STEP 4', title: '치수·용접 검사', action: '하중 기준 치수·용접 품질 검사' },
      { phase: 'STEP 5', title: '표면처리·출하', action: '도장·아연도금 후 현장 볼팅용 출하' }
    ],
    deliverables: [
      '제작용 상세도 (Shop Drawing) 및 부재 리스트',
      '용접·치수 검사 성적서 및 표면처리 사양서',
      '현장 볼팅 조립 가이드 및 앵커 배치도'
    ],
    benefits: [
      { metric: '±1mm', label: '가공 정밀도', desc: '공장 자동 가공으로 부재 정밀도와 조립성을 확보합니다.' },
      { metric: '-35%', label: '현장 작업 절감', desc: '현장 가공을 볼팅 조립으로 전환해 작업량을 줄입니다.' },
      { metric: '100%', label: '구조 안전 검증', desc: '하중 기준 용접·치수 검사로 구조 안전성을 보증합니다.' }
    ],
    onlineReviewAvailable: true,
    visitRequired: false,
    details: '구조 도면과 하중 조건이 확정된 경우 비대면 검토로 부재 물량·가공 도면 산출이 가능합니다. 설치 위치 앵커·간섭 확인이 필요한 경우 출장 실측을 병행합니다.',
    group: 'fabrication'
  },

  'small': {
    title: '온라인 간편검토 (견적 1,000만 이하)',
    problemDefinition: '비교적 소규모 배관 분기나 간단한 펌프/밸브 단품 교체 등, 현장 사진과 기본 사양 정보만으로 24시간 내 자재비와 표준 노무비를 즉시 검토할 수 있습니다.',
    preparationDocs: [
      '교체 대상 부위의 고화질 현장 사진 (전경 및 근접)',
      '연결 규격 정보 (파이프 인치, 밸브 나사산/플랜지 사양)',
      '현장 주행 동선 및 높이 정보'
    ],
    sop: [
      { phase: 'STEP 1', title: '사진 매핑', action: '제출 사진을 기준으로 기본 노무량과 자재 범위를 매핑합니다.' },
      { phase: 'STEP 2', title: '간이 유동 검증', action: '제출 치수 기준으로 관 마찰·유속을 간이 계산합니다.' },
      { phase: 'STEP 3', title: '단가 비교', action: '표준 자재 단가와 품셈 기준 인건비를 비교 정리합니다.' },
      { phase: 'STEP 4', title: '간편 소견서', action: '24시간 내 간편 스코프 진단 소견서를 송부합니다.' }
    ],
    deliverables: [
      '표준 자재 단가 비교표',
      '공종별 권장 투입 인건비 (품셈 기준)',
      '온라인 간편 스코프 진단 소견서'
    ],
    benefits: [
      { metric: '무료', label: '출장비 0원', desc: '비대면 진행으로 출장 비용 없이 전액 무료 검토합니다.' },
      { metric: '24h', label: '초고속 회신', desc: '자료 접수 후 24시간 내 진단서를 송부합니다.' },
      { metric: '-18%', label: '단가 거품 절감', desc: '표준 품셈 대조로 단품 교체 단가 거품을 제거합니다.' }
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
    sop: [
      { phase: 'STEP 1', title: '사전 자료 검토', action: '배치도·계통 도면을 검토해 실측 포인트를 사전 선정합니다.' },
      { phase: 'STEP 2', title: '현장 레이저 실측', action: '전문 엔지니어가 출장하여 3D ISO 레이저 실측을 수행합니다.' },
      { phase: 'STEP 3', title: '간섭 분석', action: '물리적 간섭 요인을 분석해 우회 배관 경로안을 도출합니다.' },
      { phase: 'STEP 4', title: '스코프 고정', action: '1차 스코프를 고정한 견적 타당성 검증서를 송부합니다.' }
    ],
    deliverables: [
      '정밀 레이저 실측 3D ISO 도면 스케치',
      '물리적 간섭 요인 분석 및 우회 배관 경로안',
      '시공사 견적 타당성 검증 검토서 (1차 스코프 고정)'
    ],
    benefits: [
      { metric: '±5%', label: '오차율 축소', desc: '현장 레이저 실측으로 견적 오차율을 5% 이내로 좁힙니다.' },
      { metric: '99.8%', label: 'AI 분석 신뢰도', desc: '96건 표본 대조로 출장 견적 단가를 교정합니다.' },
      { metric: '-27%', label: '단가 거품 절감', desc: '간섭·재작업 리스크를 사전 제거해 단가를 낮춥니다.' }
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
    sop: [
      { phase: 'STEP 1', title: '기획 워크숍', action: '컨셉안을 기반으로 공법 믹스와 검토 범위를 정의합니다.' },
      { phase: 'STEP 2', title: 'VE 분석', action: '설계 최적화(VE)로 공종별 실행 예산 가이드라인을 수립합니다.' },
      { phase: 'STEP 3', title: '리스크 식별', action: '종합 설계 리스크를 조기 식별 매트릭스로 구조화합니다.' },
      { phase: 'STEP 4', title: '입찰 검증', action: '1군 공법 기준으로 시공사 복수 견적을 동일 기준 심사합니다.' }
    ],
    deliverables: [
      '공종별 실행 예산 가이드라인 (WBS 표준화)',
      '종합 설계 리스크 조기 식별 매트릭스',
      '1군 건설사 공법 기준 자재 적합성 검증서'
    ],
    benefits: [
      { metric: '-35%', label: 'CAPEX 리스크 절감', desc: 'VE·표준 예산으로 대규모 설계 변경 리스크를 예방합니다.' },
      { metric: '99.7%', label: 'AI 분석 신뢰도', desc: '26건 대형 표본 대조로 예산을 교정합니다.' },
      { metric: 'PM', label: '종합 관리', desc: '기획부터 입찰까지 현장 실무30년 기준으로 통제합니다.' }
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
    sop: [
      { phase: 'STEP 1', title: '상담 배정', action: '접수 후 2시간 내 전담 엔지니어가 유선 연락을 드립니다.' },
      { phase: 'STEP 2', title: '문제 진단', action: '설비 문제 상황을 청취해 기초 엔지니어링 진단을 수행합니다.' },
      { phase: 'STEP 3', title: '자료 가이드', action: '필요 자료 체크리스트를 맞춤형으로 작성해 안내합니다.' },
      { phase: 'STEP 4', title: '방식 전환', action: '간편검토 또는 출장 실측 전환 방향을 제안합니다.' }
    ],
    deliverables: [
      '기초 엔지니어링 상담 속기록',
      '사전진단 필요 자료 체크리스트 맞춤형 작성',
      '차후 출장 실측 또는 간편검토 전환 가이드라인'
    ],
    benefits: [
      { metric: '2h', label: '신속 콜백', desc: '상담 접수 후 2시간 내 전담 엔지니어가 연락드립니다.' },
      { metric: '무료', label: '기초 진단 0원', desc: '방향 설정 단계 기초 가이드를 무료로 제공합니다.' },
      { metric: '맞춤', label: '자료 체크리스트', desc: '상황별 필요 자료를 맞춤형으로 정리해 드립니다.' }
    ],
    onlineReviewAvailable: true,
    visitRequired: false,
    details: '상담 요청 접수 시 ZEROS 전담 엔지니어가 2시간 내에 유선 연락을 취해 무료 가이드 라인을 잡아드리고 적절한 사전검토 방식을 제안해 드립니다.'
  }
};
