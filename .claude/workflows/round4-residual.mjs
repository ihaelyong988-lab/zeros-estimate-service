// ZEROS 4차 잔여작업 실행 스크립트 — 2026-08-07 작성(준비만, 미실행)
// 착수: Workflow({ scriptPath: '<이 파일 절대경로>', args: { plan: 'A' | 'B', wave: 1 | 2 | 3 | 4 } })
// 근거: docs/00_orchestration/잔여작업-실행준비.md  (기수 배분 §3 · 소요 §4)
// 재검증(읽기 전용 6기)이 확인한 실측 file:line 을 프롬프트에 그대로 박아 두었다 — 착수 시 재조사 불필요.

export const meta = {
  name: 'zeros-r4-residual',
  description: 'ZEROS 4차 잔여작업 — 파도별 실행 (파일 배타 소유)',
  whenToUse: '주인님이 "작업 시작"을 지시했고 PLAN A/B 와 파도 번호가 정해졌을 때',
  phases: [
    { title: '수정', detail: '파일 배타 소유 · 테스트 우선(§14-1)' },
    { title: '적대검증', detail: '반증 우선 — 보고서를 믿지 않고 코드를 직접 읽는다' },
  ],
}

const ROOT = 'C:\\dev\\zerospipe.co.kr'
const PLAN = args && args.plan === 'B' ? 'B' : 'A'
const WAVE = (args && Number(args.wave)) || 1

const COMMON = `
너는 ZEROS(zerospipe.co.kr) 프로덕션 앱을 수정하는 시니어 엔지니어다. Next.js 16 / React 19 / TypeScript.
저장소 루트: ${ROOT} (절대경로. cwd가 다를 수 있다.)

【승인 근거】
주인님이 전역 CLAUDE.md 반복금지 헌법 제11조(포괄 지시 = PLAN A/B 보고 후 승인)에 따라 **PLAN ${PLAN} 을 명시 승인**했다.
범위는 docs/00_orchestration/잔여작업-실행준비.md §3·§4 에 확정돼 있다. master 가 아닌 작업 브랜치에서 진행하며,
master 병합·배포는 검증 통과 후 별도로 이뤄진다.

【착수 전 필독】
1. ${ROOT}\\AGENTS.md — §10(디자인·가독성) · §10-A(화면별 확정 조문) · §11(게이트) · §13 · §14(주간 작업 규칙) · §15
2. ${ROOT}\\design-system\\zeros\\MASTER.md — UI 기준파일. 재추론하지 말고 이 파일을 따른다.
3. ${ROOT}\\docs\\00_orchestration\\잔여작업-실행준비.md — 네 기수의 범위·주의사항
4. 네가 고칠 파일 전문

【절대 규칙 — 어기면 실패】
- **파일 배타 소유**: 「너의 파일」에 적힌 것과 네 전용 테스트 파일만 수정한다. 나머지는 **읽기만**.
  같은 시각에 다른 기수가 다른 파일을 고치고 있다. 남의 파일을 건드리면 그쪽 변경이 조용히 사라진다.
- **§14-1 테스트 우선**: 결함마다 \`test/\`(대상 모듈 경로 미러링)에 **먼저 실패하는 테스트**를 쓰고 실패를 확인한 뒤 고친다.
  컴포넌트 상태 분기라 테스트가 안 되면 **억지로 만들지 말고** 보고에 정직하게 적는다. 순수 함수로 뽑을 수 있으면 뽑는다.
- **§10-A 확정 조문 불변**: 조문에 확정된 여백·폰트·문구·구조는 건드리지 않는다. 충돌하면 **고치지 말고 보고**한다.
- **새 오류 UI 는 \`role="alert"\` 필수**(게이트 R1). 본문 대비 4.5:1(\`text-gray-light\`/\`#9AA3AF\` 본문 금지). 터치 타깃 ≥44px.
- **AI 바이브 금지**: 이모지 아이콘 · 과장 수식어(혁신적·완벽한·강력한·손쉽게·원활한) · 느낌표·물결 · "~할 수 있습니다" ·
  lorem/placeholder · console.log 잔재 · 뜻 없는 주석 전부 금지.
- **컨셉 DNA**: 신뢰성 있는 컨설팅 기업 톤 · 단정형 명세체 · 설명 2문장 이내 · 같은 정보 두 번 표시 금지(헌법 제10조) ·
  오렌지 \`#E0701A\` 는 주 CTA 한 곳만 · 중장년 타깃이라 불필요한 영어 절제.
- 주석은 한국어로 "왜"만 남긴다. 지정된 결함만 고친다.

【마치기 전】
\`npx tsc --noEmit\` 확인(\`.next\` 생성 타입 오류는 소스 결함이 아니다 — §15-8). 다른 기수의 미완성 코드로 실패할 수 있으니
**네 파일 때문인지 구분**해 보고한다. 네 테스트는 \`npx vitest run <파일>\` 로 통과 확인.
\`node .claude/hooks/ui-quality-gate.mjs --check\` 로 차단룰 R1 위반 0 확인(\`--pass\` 는 찍지 마라 — 마감 주체 몫).
`

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    changed_files: { type: 'array', items: { type: 'string' } },
    test_files: { type: 'array', items: { type: 'string' } },
    fixes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          what_changed: { type: 'string', description: '무엇을 어떻게 바꿨는지 (파일:줄 포함)' },
          test_proof: { type: 'string', description: '어떤 테스트가 이 결함을 고정하는가. 없으면 왜 없는지' },
          risk: { type: 'string', description: '이 변경이 깨뜨릴 수 있는 것. 없으면 "없음"' },
        },
        required: ['id', 'what_changed', 'test_proof', 'risk'],
        additionalProperties: false,
      },
    },
    tsc_result: { type: 'string' },
    vitest_result: { type: 'string' },
    gate_result: { type: 'string' },
    notes: { type: 'string', description: '못 한 것·조문 충돌·판단이 필요한 것. 없으면 "없음"' },
  },
  required: ['changed_files', 'test_files', 'fixes', 'tsc_result', 'vitest_result', 'gate_result', 'notes'],
  additionalProperties: false,
}

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          verdict: { type: 'string', enum: ['PASS', 'FAIL'] },
          reason: { type: 'string' },
          must_fix: { type: 'string', description: 'FAIL 이면 무엇을 어떻게. PASS 면 "없음"' },
        },
        required: ['id', 'verdict', 'reason', 'must_fix'],
        additionalProperties: false,
      },
    },
    regressions: { type: 'array', items: { type: 'string' } },
    overall: { type: 'string', enum: ['PASS', 'FAIL'] },
  },
  required: ['verdicts', 'regressions', 'overall'],
  additionalProperties: false,
}

// ── 파도 1 ──────────────────────────────────────────────────────────────────
const WAVE1 = [
  {
    key: 'page',
    planB_only: false,
    prompt: `【너의 파일】 app/page.tsx (2,166줄) · test/ 신규
※ 이 파일은 §10-A O-37(홈 1366×768 한 화면 수납) 세로 예산이 걸려 있다. **여백·폰트를 건드리지 마라.**

【C4 · focus:outline-none 단독 사용 — S】
\`app/page.tsx:2108\` **정확히 1곳**. 홈 데스크톱 히어로 하단 카테고리 버튼(\`HOME_CATEGORIES.map\`)이 아웃라인만 지우고 대체 스타일이 없다.
→ **같은 파일 L388·L396 에 정답 패턴이 이미 있다**: \`focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel\`. 그대로 옮겨라.

【C5 · motion-reduce 가드 누락 — M】
\`animate-*\` 12지점에 가드가 없다: 861 · 941 · 1073 · 1074 · 1143 · 1163 · 1584 · 1688 · 2092 ·
**추가 3지점(정규식이 놓친 것)** 1091(\`animate-[spin_4s_linear_infinite]\` 임의값) · 1382(\`animate-in fade-in\`) ·
844~850(\`<style dangerouslySetInnerHTML>\` 로 주입되는 \`.flow-line { animation: pipeFlow … }\`).
\`app/globals.css\` 의 기존 reduced-motion 블록(L157·L197)은 특정 클래스 전용이라 이것들을 덮지 않는다.
→ **유틸리티 12지점에 \`motion-reduce:animate-none\` 을 직접 붙여라.** 주입 CSS(844~850)는 그 \`<style>\` 안에
\`@media (prefers-reduced-motion: reduce){ .flow-line{ animation: none } }\` 를 더한다.
(전역 CSS 일괄 처리는 §10 이 명시한 수단과 달라지므로 이번엔 쓰지 않는다.)

【C6 · 본문 금지색 — S】
\`app/page.tsx:1551\` \`text-[#9AA3AF]\` — 모바일 랜딩 1페이지 '이동' 카드 기능 라벨. 흰 배경 대비 **2.58:1**(11px 라 large-text 예외 없음).
→ \`text-[#5B6573]\`(= text-gray, 4.83:1)로 교체.
**L392·L2007 은 손대지 마라** — \`aria-hidden\` 구분자·가운뎃점이라 장식이다(§10 은 본문만 금지).
${'' /* B5 는 PLAN B 전용 */}
【테스트】 소스 스캔 테스트를 \`test/ui/pageSource.test.ts\` 에 신설:
\`focus:outline-none\` 이 \`focus-visible:\` 동반 없이 존재하면 실패 · \`animate-(bounce|pulse|spin|ping)\` 또는 \`animate-[\` 가
\`motion-reduce:animate-none\` 없이 존재하면 실패 · 본문 줄에 \`#9AA3AF\` 가 있으면 실패(\`aria-hidden\` 줄은 예외).`,
    planB_extra: `

【B5 · CTA 명칭 통일 — M · PLAN B 전용 · 주인님 확정① = A안】
렌더되는 CTA 6곳 5종. **\`L526 무료 견적 검토 신청\` 이 기준값이며 §10 확정 문구다 — 절대 수정 금지.**
통일 대상 5곳: L644(\`무료 견적 검토 의뢰하기\`) · L806(\`무료 출장 견적 신청하기\`) · L1569(\`무료 견적 의뢰하기\`) ·
L1764(\`무료 견적 의뢰\`) · L2033(\`무료 출장 견적 신청\`).
6곳 모두 \`setActiveTabAtTop('request')\` = 채널 선택 화면으로 간다 — visit/quick 양쪽을 다 여므로 "출장"으로 단정한 L806·L2033 이 오히려 부정확하다.
→ ① \`lib/constants/\` 에 CTA 라벨 단일 상수를 신설하고 5곳이 그것을 참조하게 한다(헌법 제4조·제10조).
   ② **제외 대상은 건드리지 마라**: \`components/layout/TopHeader.tsx:56\` 의 \`예상견적 의뢰하기\`(탭 라벨, §10-A 화면 명칭) ·
      \`RequestWizard\` 의 \`무료 견적 신청\`(채널 카드 제목, §10-A O-31 "제목은 카드 제목과 동기").
   ③ 주석 2곳(L273 · L1751)의 구 문구도 동기화.
   ④ 테스트에 "허용 CTA 문구 1종 외 변형 리터럴 0건" 스캔 케이스를 추가한다.`,
  },
  {
    key: 'shell-color',
    planB_only: true, // C2 는 확정③ 필요 → PLAN B 전용
    prompt: `【너의 파일】 components/layout/AppShell.tsx (820줄) · app/layout.tsx

【C2 · 모바일 홈 다크 네이비 → 조문 이행 — L · 주인님 확정③ = A안(홈 랜딩만 화이트)】
§10-A 공통 1항이 \`#041B33\` 을 문자열째 금지한다. 현재 살아 있는 지점 **23~24곳**:
480 · 515 · 521-527 · 536 · 540 · 561 · 625 · 627 · 631 · 634 · 643 · 644 · 653 · 678 · 685 · 686 · 692 · 739 · 753 · 757 · 767 · 777 · 787 · 797
**배경 5개를 바꾸면 그 위 글자·아이콘·테두리 18개가 연쇄로 뒤집힌다**(다크 위 \`text-white/60\` 계열 → 네이비 \`#0F1E35\` / 그레이 \`#5B6573\`).
515행처럼 **랜딩·비랜딩이 클래스 문자열을 공유**하는 곳이 있으니 분기를 정확히 갈라라.
조문이 지정한 값: 배경 \`#FFFFFF\` · 헤드라인 \`#0F1E35\` · 본문 \`#5B6573\` · 아이콘 **스틸블루 \`#1E4D8C\` 단색** ·
카드 화이트+헤어라인 \`#E4EAF2\` · 주 CTA **오렌지 \`#E0701A\` 하나만**. 템플릿·레이아웃은 유지하고 **컬러만 교체**한다.
→ \`app/layout.tsx\` 의 viewport \`themeColor: "#0F1E35"\` 와 \`appleWebApp.statusBarStyle: "black-translucent"\` 도 함께 판단하라
  (셸이 화이트가 되면 상태바 대비가 뒤집힌다).

【C10 · 헤더 터치 타깃 44px 미만 — S · 5지점】
516-542(로고 32px) · 548-556(간편 로그인/등록 29px) · 568-582(AI NATIVE 23px) · 559-565(메뉴 열기 \`w-9 h-9\` 36px) + 1곳 더.
→ **헤더 총높이를 키우지 않는 방식**으로 확보하라. 현재 헤더는 \`px-5 py-4\`(랜딩)/\`py-4.5\`(비랜딩)로 콘텐츠 32px + 패딩 = 64/68px 다.
  자식을 44px 로 키우면 그대로 +12px 가 되므로, **패딩을 회수해 총높이를 유지**한다(§10-A O-38 "폰트 축소로 세로를 줄이는 방식 금지" 준수).

【검증】 이 기수는 **픽셀 게이트 재측정 대상**이다. 마치기 전 보고에 "O-37·O-38 재측정 필요"를 명시하라(측정은 오케스트레이터가 한다).`,
  },
  {
    key: 'wizard-validate',
    planB_only: false,
    prompt: `【너의 파일】 components/forms/RequestWizard.tsx (1,040줄) · lib/forms/requestForm.ts · test/forms/requestForm.test.ts

【B9-a · 이메일 형식 검증 부재 — M】
클라이언트 검사는 공백 여부뿐이다: \`:421\`(validateStep STEP2) \`if (!formData.email.trim()) return failValidation('이메일 회신처를 입력해 주세요.');\` ·
\`:451\`(validateAll) 동일. 형식 정규식은 전화번호만 있다(\`:409 isPhoneValid\`). 서버(\`app/api/data/route.ts:100-106 firstInvalidField\`)에도 없다.
→ \`lib/forms/requestForm.ts\` 에 순수 함수 \`isValidEmail\` 을 만들고 클라 2곳(:421·:451)에서 호출. 입력칸은 \`:960-969\`.
  문구 예: "이메일 주소 형식을 확인해 주세요. 예) name@example.com"

【B9-b · 희망 방문일 범위 무제한 — M】
\`:868-876\` date input 에 \`min\`·\`max\` 가 없고 검사도 존재 여부뿐이다(\`:422\`·\`:457\`).
→ \`lib/utils/date.ts\` 의 \`kstToday()\`(:36-38)를 쓴다(§13 — \`toISOString().slice(0,10)\` 직접 사용 금지).
  \`min={kstToday()}\` + 합리적 상한(예: 90일). **피커 min 은 키보드 입력으로 우회 가능하므로 JS 검사도 함께** 넣는다.
  판정 함수는 \`lib/forms/requestForm.ts\` 에 두어 문구 원천을 1곳으로 유지한다.

【B9-c · '새 등록하기'가 직전 입력을 물려준다 — S】
\`:539-545 resetWizard\` 는 화면 상태만 되돌리고 \`formData\` 를 손대지 않는다 → 직전 첨부파일·개인정보 동의가 그대로 남는다.
→ \`setFormData({ ...defaultFormData, customer_name, phone, company_name, email, site_address })\` 형태로
  **로그인 고객의 신원만 보존**하고 나머지(특히 \`files\`·\`agreePrivacy\`)는 초기화. \`:508\` 의 draft 삭제와 함께 처리.

【B9-d · 방문 시간대 임시저장 누락 — S】
\`:877-893\` 오전/오후 버튼, 핵심은 \`:882\`. 8/7 에 저장이 \`saveDraft\`(:156-159) 한 곳으로 통합됐는데 **이 버튼만 빠졌다**.
→ \`selectScope\` 와 같은 형태로 \`setFormData(prev => { const updated = {...prev, visit_time: t}; saveDraft(updated); return updated; })\`.

【N3 · customer_type 을 고객에게 묻지 않는다 — M】
\`:134 customer_type: '일반'\` 하드코딩 → \`:494\` 무조건 전송. 화면 어디에도 입력이 없다(B1 과 정확히 같은 유형).
한편 \`:473·:475-477\` 은 업종을 \`request_detail\` 자유문구 태그로 우회 저장한다.
→ 업종 입력에서 \`customer_type\` 을 파생시키는 순수 함수를 \`lib/forms/requestForm.ts\` 에 두고, \`:134\` 기본값을 제거한다.
  **헌법 제10조 준수**: \`customer_type\` 저장과 \`request_detail\` 업종 태그를 동시에 두면 \`PrintableScopeSheet\` 한 장에 업종이 2회 표시된다 — 태그를 제거하라.

【테스트】 \`test/forms/requestForm.test.ts\` 에 추가: 이메일 형식 거부/통과 · 과거·초과 미래 방문일 거부 ·
resetWizard 후 files·agreePrivacy 초기화 + 신원 보존 · 시간대 선택이 draft 에 반영 · customer_type 파생.`,
  },
  {
    key: 'metrics',
    planB_only: false,
    prompt: `【너의 파일】 components/PerformanceInsights.tsx (333줄) · lib/constants/trust.ts · test/ 신규

【B4 · 공개 실적 집계 정의 불일치 — M · 최우선】
**발동 원천이 확인됐다**: \`lib/forms/requestForm.ts\` 의 \`WORK_TYPE_OPTIONS\` 는 **10개**인데
\`PerformanceInsights.tsx:10-19 WORK_TYPES\` 는 **8개**다(\`배관+장비설치\`·\`기타\` 누락).
2026-08-07 에 의뢰 폼이 공사 종류를 실제로 받게 됐으므로, 8종 밖 값으로 접수 1건만 들어와도 결함이 발동한다.

① **검토 비율이 100%를 넘을 수 있다** — 분자와 분모의 모집단이 다르다.
   분모: \`:116-135\` 집계 루프, \`:118\` \`if (!matrix[w]) return;\` → \`grandTotal\` 은 8종 해당 행만 센다.
   분자: \`:153 reviewDoneCount\` 는 필터 없이 전체를 센다 → \`:166\` 에서 분자 > 분모가 성립한다.
② **'견적 건수' KPI 와 히트맵 '합계'가 다른 값**을 가리킬 수 있다(같은 원인).

→ **(A) 최소 수정안을 택한다**: 집계 시작에서 모집단을 한 번 확정하고(\`const scoped = estimates.filter(e => WORK_TYPES.includes(e.work_type))\`)
  이후 모든 지표(\`reviewDoneCount\`·metrics 입력·\`grandTotal\`·KPI '견적 건수')를 **같은 모수**로 계산한다.
  라벨·색·레이아웃은 불변이라 §10-A 실적 화면 조문과 충돌하지 않는다.
  ※ 히트맵을 10공종으로 확장하는 (B)안은 §10-A '공종 색 = 작업 특성 기반 8색' 조문 개정이 필요하다 — **쓰지 마라.**
  ※ 8종 밖 접수가 지표에서 빠지는 것이 걱정되면 그 사실을 보고에 적어라(다음 차수 판단 사항).

【테스트】 \`test/performance/insights.test.ts\` 신설 — 집계를 순수 함수로 뽑아:
8종 밖 \`work_type\` 이 섞여도 검토 비율 ≤ 100% · '견적 건수' == 히트맵 합계 · 8종만 있을 때 기존 값과 동일(회귀).
현재 \`test/\` 에 실적 집계 테스트가 **없다** — 이번에 처음 깐다.`,
    planB_extra: `

【확정② · 신뢰지표 246 — S · PLAN B 전용 · 주인님 확정 = A안(라벨 분리)】
\`lib/constants/trust.ts:20 cumulativeReviews: 246\` · \`:36 cumulative: \\\`\${TRUST.cumulativeReviews}건\\\`\`.
소스 참조 4지점, 화면 렌더 5지점(\`app/page.tsx\` 는 **다른 기수 소유라 손대지 마라** — 라벨 상수만 바꾸면 그쪽이 따라온다).
실적 탭은 DB 실측(현재 101건, 그중 99건이 \`est-test-*\` 시드)을 렌더해 같은 방문자가 246 과 101 을 본다.
→ \`TRUST_LABEL.cumulative\` 를 출처가 드러나는 라벨로 바꾼다(예: \`누적 검증(30년 실적)\`), 숫자 246 은 유지.
  그리고 이 파일의 실적 KPI 라벨을 \`온라인 접수 현황\` 계열로 구분한다.
  ⚠ **§10-A 사업소개 조문에 "신뢰 지표 클러스터(30년·246건·98.4%)" 가 리터럴로 박혀 있다** — 라벨 변경분을
  \`AGENTS.md\` 조문에 1줄 반영하고 구 값을 \`docs/00_orchestration/agents-archive.md\` 에 1행 기록해야 한다.
  **AGENTS.md 수정은 하지 말고**(오케스트레이터 몫) 보고에 개정 문안을 적어라.`,
  },
  {
    key: 'admin-save',
    planB_only: false,
    prompt: `【너의 파일】 components/admin/CustomerList.tsx · components/admin/VisitList.tsx

【N1 · 고객 등급·메모 저장 실패가 화면에 안 뜬다 — S · 높음】
\`CustomerList.tsx:62-84 handleSaveClick\` 의 catch(\`:81-83\`)가 \`console.error\` 뿐이다. 화면 상태를 건드리는 코드가 0줄이라
운영자는 저장된 줄 안다. **8/7 에 붙은 배너는 '조회' 전용**이다(\`:17 loadError\` 는 \`loadCustomers\` 에서만 설정) — 저장은 별개다.
→ \`saveError\` 상태 1개 + \`role="alert"\` 배너 1개(\`:138-147\` 기존 배너를 그대로 복제) + 편집 시작(\`:56-60\`)에서 초기화.
  \`lib/admin/loadState.ts\` 의 \`resolveAdminLoadError\` 를 저장 헤드라인으로 재사용하면 새 로직이 없다(그 파일은 읽기만).

【N2 · 방문 완료 실패가 alert 6글자 — S】
\`VisitList.tsx:48-84 handleCompleteVisit\`, \`:82 alert('상태 변경 실패')\`. 사유(권한 만료/네트워크/대상 없음)를 버린다.
같은 파일 성공 경로(\`:75-79\`)는 전후 상태를 대조해 상세히 알리는데 실패만 6글자다.
→ **권장안**: \`actionError\` 상태 + \`:131-140\` 기존 배너 재사용(alert 제거). 관리자 화면 일관성 확보. R1(\`role="alert"\`) 필수.

【테스트】 \`test/admin/loadState.test.ts\` 에 케이스를 추가한다(저장 실패 헤드라인 산출). 컴포넌트 렌더는 테스트하지 않는다.`,
  },
  {
    key: 'gate',
    planB_only: false,
    prompt: `【너의 파일】 .claude/hooks/ui-quality-gate.mjs (123줄) · .claude/settings.json · test/ 신규

【D1 · 게이트가 조문의 7룰 중 3룰만 구현 — L · 근본 처방】
현재: 룰 정의 \`lint()\` 43~64줄 / R1 51~57(role=alert) / R2 58~59(text-gray-light) / R3 60~61(터치 44px). 모드 파싱 20줄.
AGENTS §11-2 가 요구하는 7룰 = role=alert · 대비 4.5:1 · 터치 44px · **focus-visible** · **no-emoji** · **reduced-motion** · **tabular-nums**.

→ ① **룰 4종 신설**
   R4 \`focus:outline-none\` 이 같은 className 에 \`focus-visible:\` 동반 없이 존재
   R5 \`animate-(bounce|pulse|spin|ping)\` 또는 \`animate-[\` 가 \`motion-reduce:animate-none\` 없이 존재
   R6 이모지 아이콘(문자 클래스 기반 탐지 — 오탐 정책을 정하고 \`➔\` 같은 딩벳 허용 여부를 주석에 남겨라)
   R7 숫자 표시에 \`tabular-nums\` 누락(경고 등급 권장)
② **R2 정밀화** — 현재 \`if (/text-gray-light/.test(src))\` 는 **파일 단위**라 오탐이 난다(실측: \`app/page.tsx\` 는
   \`aria-hidden\` 구분자 1곳뿐인데 경고가 뜨고, 정작 진짜 위반인 \`text-[#9AA3AF]\`(L1551)는 못 잡는다).
   → **줄 단위 판정 + 헥스 \`#9AA3AF\` 형태 추가 + \`aria-hidden\` 줄 예외.**
③ **\`--all\` 전수 스윕 + 베이스라인 스냅샷** — 지금 게이트는 **변경된 \`.tsx\` 만** 채점해서 기존 부채가 영원히 안 걸린다(§15-5).
   전 소스를 스캔해 룰별 위반 수를 세고 \`.claude/.gate-baseline.json\` 에 기록한다.
   이후 \`--check\` 는 **베이스라인보다 늘면 차단**한다(줄이는 것은 항상 통과).
④ 모드 파싱을 단일 인자에서 **플래그 조합**(\`--check --all\` 등)으로 바꾼다. \`.claude/settings.json\` Stop 배열의 호출 인자도 맞춘다.

⚠ **차단 등급을 낮추지 마라.** 기존 R1 차단은 그대로 두고, 신설 룰은 오탐 위험에 따라 경고/차단을 명시적으로 정해 주석에 근거를 남긴다.
⚠ 이 게이트는 **마감을 막는 장치**다. 스스로 통과시키려고 룰을 약화하는 방향은 금지(선례: 2026-07-30 안전 분류기 차단).

【테스트】 \`test/hooks/uiQualityGate.test.ts\` 신설 — 룰별로 위반 샘플/정상 샘플 문자열을 넣어 판정이 맞는지.
베이스라인 비교(늘면 차단·줄면 통과) 케이스 포함.`,
  },
]

// ── 파도 2 ──────────────────────────────────────────────────────────────────
const WAVE2 = [
  {
    key: 'shell-behavior',
    prompt: `【너의 파일】 components/layout/AppShell.tsx · components/layout/LeftSidebar.tsx · lib/context/ShellContext.tsx

【C7 · 모바일 종료 팝업 '닫기' 무반응 — S】
\`:231-234\` \`const handleExitClose = () => { setShowExitConfirm(false); window.close(); };\`
\`window.close()\` 는 스크립트가 연 창이 아니면 브라우저가 차단한다. 폴백이 없어 팝업만 사라지고, 그 뒤 **뒤로가기 가드가 한 층 소진돼 화면과 URL 이 어긋난다**.
→ close 시도 후 짧은 타임아웃(약 300ms)으로 문서가 살아 있으면 \`window.history.pushState({ zerosShell: true }, '', 현재 URL)\` 로 가드를 재무장하고 \`lastShellUrlRef\` 를 갱신한다.
  §10-A 공통 6항의 제약 유지: **popstate 핸들러(\`:199-206\`)에서 가드 state 는 \`applyUrlState\` 를 태우지 말 것.**

【C8 · 좌측 공종 선택이 URL 에 미반영 — M】
\`:261-267\` URL 생성부가 **배타 else-if 체인**이라 \`tab\` 과 \`menu/budget\` 이 동시에 실리지 않는다. 복원부는 \`:185-195\`, 무조건 초기화는 \`:160-161\`.
원인 유발부는 \`LeftSidebar.tsx:69-86\`(\`activeTab='review'\` 동반 설정).
→ 배타 분기를 **병렬 기록**으로 바꾼다: \`if (activeTab !== 'home') params.set('tab', …); if (selectedMenu) params.set('menu', …); else if (selectedBudget) params.set('budget', …);\`
  복원부도 대응시키고, \`lastShellUrlRef\` 비교(\`:272\`)·popstate·가드와의 상호작용을 다시 확인하라.

【D6 · 죽은 3초 인터벌 — M】
\`:294-302\`(죽은 자동스크롤 이펙트) · \`:598-599 isLandingActive\` · \`:603 activeColor\` · \`:608 data-landing-active\`. 인터벌 본체는 \`app/page.tsx\`(다른 기수 소유 — **읽기만**).
칩바 렌더 조건(\`:588\`)이 \`!isMobileLanding\` 인데 \`isMobileLanding\`(\`:476-477\`)이 참일 때만 인터벌이 의미를 갖는다 → **조건이 배타적이라 하이라이트가 절대 발동하지 않는다**(재검증에서 도달 불가 확인).
→ **(b) 제거안**을 택한다: AppShell \`:294-302\`·\`:598-599\`·\`:603\`·\`:608\` 삭제 + \`ShellContext\` 인터페이스 \`:32-37\` 4필드 · \`:140-141\` state · \`:199-202\` value 삭제.
  \`app/page.tsx\` 쪽 참조(227-228 · 279-291 · 1774)는 **손대지 말고 보고**하라 — 그 파일은 다른 기수 소유다. 계약 변경이 필요하면 보고에 정확히 적어라.
  ※ (a) 살리는 안은 §10-A 홈 화면 동작을 바꾸므로 쓰지 마라.

【C9 · 플레이스홀더 — S】
\`LeftSidebar.tsx:181-189\` '빠른 메뉴' 블록 전체(문자열은 \`:187\` '바로가기 기능 준비 중입니다') 삭제. 참조 코드 0건(grep 확인됨).
§10-A O-33 은 공사영역·외주제작·견적규모 3블록의 **라벨**만 규율하므로 이 블록 삭제는 조문 접점이 없다.

【테스트】 C7·C8 의 판정부를 순수 함수로 뽑아 \`test/shell/urlState.test.ts\` 에 고정한다
(\`test/a11y/modalDialog.test.ts\` 가 쓰는 패턴을 따르라). D6 은 삭제라 회귀 테스트만.`,
  },
  {
    key: 'quote-modal',
    prompt: `【너의 파일】 components/admin/EstimateDetailModal.tsx (1,131줄)
※ \`lib/quote/*\` · \`lib/calculations.ts\` · \`lib/payments/*\` · \`lib/crm/*\` 는 **테스트 보호 모듈**(§14-2) — 읽기만, 호출만.

【B8 · AI 견적 품목표 편집분이 저장되지 않는다 — M】
\`:80 quoteItems\` 상태 · \`:120\` 최초 적재 · \`:353-374\` 편집 핸들러 4종 · **\`:400-431 handleQuoteSend\` 가 유일한 저장 경로**
(\`:412-419\` \`ZerosService.updateEstimate(estimate.id, { line_items, estimated_amount, estimate_pdf_url })\`).
즉 **발송하지 않고 모달을 닫으면 편집분이 통째로 사라진다.** 닫기 지점은 \`:455-460\`·\`:1155-1160\`.
→ ① '초안 저장'(발송 없이 \`line_items\` 만 persist) 버튼 + 핸들러 신설
  ② 저장본 대비 dirty 추적(초기 \`estimate.line_items\` 스냅샷 보관)
  ③ 닫기 2곳에 미저장 확인 게이트
  ④ **§14-4 금액 단위 불변식 필수** — 초안 저장 시 \`estimated_amount\` 는 반드시 **공급가액(\`quoteSubtotal\`)** 만.
     총액(\`quoteTotal\`) 저장 금지. 초안 저장이 상태를 '견적서 송부완료'로 바꾸지 않게 하라.

【C4·C5·C6 (admin 몫) — S】
이 파일의 \`focus:outline-none\` 지점 · \`animate-*\` 가드 누락(\`:524\`) · 본문 \`text-gray-light\` **3곳**
(\`:553\` 첨부 업로드 날짜 값 외 2곳 — 총 22개 문자열 중 본문만. 폼 라벨·테이블 th·아이콘 className 은 장식이니 **손대지 마라**).

【테스트】 dirty 판정을 순수 함수로 뽑아 \`test/admin/quoteDraft.test.ts\` 에 고정
(초기 스냅샷과 동일하면 clean · 수량/단가 변경 시 dirty · 저장 후 clean).`,
  },
  {
    key: 'infra',
    prompt: `【너의 파일】 lib/supabase/client.ts (870줄) · app/api/data/route.ts · supabase/supabase-setup.sql · test/api/dataRoute.test.ts
⚠ \`app/api/data/route.ts\` 는 §13 데이터 보안 게이트웨이다. **익명 견적 분기가 \`adminSessionInvalid\` 검사보다 앞에 있어야 한다** — 순서를 바꾸지 마라(과거 실제 회귀).

【D2 · mock-data 정적 import — S】
\`lib/supabase/client.ts:4\` 가 \`./mock-data\`(1,393줄)를 정적 import 한다. 소비처는 \`MockZerosService.init()\` \`:721-751\`(728·733·736·739·742·745), 서비스 선택은 \`:868-870\`.
\`isSupabaseEnabled\` 가 항상 true 라 **실행되지 않는 코드가 고객 첫 로드 번들에 실린다**(현재 첫 로드 JS 338KB gzip / 1,174KB raw).
→ 4줄 정적 import 제거 · \`init\` 을 async 로 · 내부 5개 참조를 \`const m = await import('./mock-data')\` 로 치환. 계약·타입 변경 없음, 호출부 무수정.
  \`lib/supabase/mock-data.ts\` 의 최상위 생성 호출(93줄 부근)이 있으면 함수 안으로 옮겨야 트리셰이킹이 산다 — 확인하고 처리하라.

【D7 · Storage 익명 업로드 무제한 — M】
\`supabase/supabase-setup.sql\` §5 = 103~130줄(§5-1 정리 109-121 · §5-2 익명 insert 정책 123-127 · §5-3 비공개 전환 129-130).
버킷에 \`file_size_limit\`·\`allowed_mime_types\` 가 없어 익명 anon 키만으로 용량·요금을 소진시킬 수 있다.
→ SQL 에 \`update storage.buckets set file_size_limit = 52428800, allowed_mime_types = array[...] where id = 'estimate-files';\` 를 **멱등**으로 추가(§6 다음 절로).
  MIME 목록은 \`lib/constants/uploadLimits.ts\` 및 \`lib/supabase/storage.ts\`(42-79)의 클라이언트 한도와 **정확히 동기**시켜라(상수 1곳 관리 원칙).
  §12 조문("버킷 비공개 + insert 만 익명 허용")은 유지되므로 조문 개정은 불필요하다.
  ⚠ **라이브 DB 반영은 주인님 액션**이다 — SQL 만 넣고, 반영 전에도 코드가 정상 동작해야 한다. 그 사실을 SQL 주석에 남겨라.

【N6 · 결제 행 삭제 경로 부재 — M】
op 목록: \`:322 list\` · \`:379 upsert\` · \`:396 createEstimate\` · \`:578 deleteEstimate\` · \`:603\` 미지원 폴백. \`deletePayment\` 가 없다.
→ \`deleteEstimate\`(route.ts \`:578-601\` · client.ts \`:857-861\`)를 **완성 선례로 그대로 본떠** \`deletePayment\` op(관리자 전용)를 신설한다.
  삭제 후 견적의 \`payment_status\` 는 저장하지 말고 **행 집합에서 파생**시켜라(\`lib/payments/status.ts\` — 읽기만, §14-4).

【테스트】 \`test/api/dataRoute.test.ts\` 에 \`deletePayment\` 케이스 추가(관리자만 200 · 익명/고객 403 · 삭제 후 파생 상태).`,
  },
  {
    key: 'radiogroup',
    prompt: `【너의 파일】 components/forms/RequestWizard.tsx · lib/a11y/ (신규 모듈) · test/a11y/

【N4 · radiogroup tab stop 18개 — M】
\`:763-782\`(공사 종류 10개) · \`:791-810\`(현장 유형 8개) 의 칩이 전부 tab stop 이다.
\`lib/forms/requestForm.ts:19-30 WORK_TYPE_OPTIONS\`(10) · \`:32-41 SITE_TYPE_OPTIONS\`(8) → 렌더는 \`:764\`·\`:792\`.
ARIA APG 의 radiogroup 은 **tab stop 1개 + 방향키 이동**이 기대치다. 지금은 키보드 사용자가 다음 입력칸까지 Tab 을 18번 눌러야 한다.
→ ① \`lib/a11y/\` 에 roving tabindex 판정 순수 함수를 만든다(\`modalDialog.ts:19-28 nextTrapTarget\` 이 같은 디렉터리의 분리 선례다).
  ② 공용 칩 그룹 컴포넌트를 만들어 두 렌더 블록을 치환한다. 선택된 칩만 \`tabIndex=0\`, 나머지 \`-1\`. 방향키(←→↑↓)로 이동 + 이동 시 선택.
     미선택 상태에서는 첫 칩이 tab stop 이 된다.
  ③ **기존 클래스 계약을 그대로 옮겨라** — \`min-h-[44px]\` · \`focus-visible\` ring · \`motion-reduce\` 가드 · \`role="radio"\`/\`aria-checked\` · \`aria-labelledby\`.
     (§10 터치 44px · focus-visible 가시, §11 게이트 R3)
  ④ \`:877-893\` 오전/오후 버튼도 같은 성격이면 함께 적용할지 판단하고 보고하라.

⚠ 이 기수는 **파도 1 의 wizard-validate 기수와 같은 파일**을 만진다. 파도가 다르므로 시간이 겹치지 않지만,
   착수 시 \`git diff\` 로 앞 파도의 변경을 먼저 읽고 그 위에 얹어라.

【테스트】 \`test/a11y/rovingTabindex.test.ts\` 신설 — 방향키 이동 인덱스 산출(순환 포함) · 선택 없을 때 첫 칩 · 끝에서 되감기.`,
  },
  {
    key: 'rightpanel',
    prompt: `【너의 파일】 components/layout/RightSidebar.tsx (620줄) · components/layout/MobileSimulator.tsx

【C4 · focus:outline-none 단독 — S】
\`RightSidebar.tsx:311-317\` 1지점(예상 견적 조절 슬라이더). \`focus-visible:outline focus-visible:outline-2 focus-visible:outline-steel\` 추가.
\`app/page.tsx:1726\` 의 aria-label 문구('예상 견적 조절 슬라이더')와 동기시키되 **그 파일은 읽기만** 하라.

【C5 · motion-reduce 가드 — S】
\`RightSidebar.tsx:597\` 1지점(관리자 확인 패널 '실시간' 표시의 \`animate-pulse\`). \`MobileSimulator.tsx\` 13·18 도 확인.

【C6 · 본문 금지색 — S · 7지점】
\`RightSidebar.tsx\` 본문 텍스트 **320 · 331 · 357 · 400 · 595 · 606 · 654** → \`text-gray-light\` 를 \`text-gray\`(#5B6573)로.
**비본문 3지점은 손대지 마라**: 283(아이콘색) · 308(눈금 \`bg-gray-light\`) · 395(\`toneDot\` 계열).
\`MobileSimulator.tsx:28\` 도 같은 패턴 1건.
⚠ 같은 §10 조문의 '본문 ≥16px' 은 이 파일에서 대량 위반 중(11~13.5px)이나 **이번 범위 밖**이다.
  폰트를 키우면 \`w-72\` 패널 레이아웃이 무너진다 — **색만 고치고 크기는 두어라.**

【테스트】 색·클래스 치환이라 단위 테스트 대상이 아니다. \`ui-quality-gate --check\` 재실행 결과를 보고에 적어라.`,
  },
]

// ── 파도 3 (단독) ───────────────────────────────────────────────────────────
const WAVE3 = [
  {
    key: 'naming',
    prompt: `【너의 파일】 lib/constants/menu.ts · components/admin/EstimateList.tsx · KanbanBoard.tsx · EstimateDetailModal.tsx ·
PrintableScopeSheet.tsx · PerformanceDashboard.tsx · components/MyRequestsView.tsx · MyRequestsModal.tsx

⚠ **이 기수는 단독 파도다.** 앞 파도의 변경이 모두 커밋된 뒤 시작하므로, 착수 시 \`git log\`·\`git diff\` 로 최신 상태를 먼저 읽어라.

【N5 · 공종 표기 3종 혼재 — M · 14지점】
같은 \`WorkType\` 키가 화면마다 다른 이름으로 나간다.
· 표시명 = \`lib/constants/menu.ts:7-26 MENU_DISPLAY_NAMES\` ('배관공사'→'일반 배관공사' · '생산설비 배관 연결'→'공정 배관공사' · 'CAPEX 개·증설 검토'→'CAPEX개선,증설')
· 사용처: \`RequestWizard.tsx:778 {menuDisplayName(w)}\` (기준)
· **원시값 렌더**: \`MyRequestsView.tsx:231·:491\` · \`MyRequestsModal.tsx\` · \`admin/EstimateList.tsx:449-454\` ·
  \`admin/KanbanBoard.tsx:252-255\` · \`admin/EstimateDetailModal.tsx:502\` · \`PrintableScopeSheet.tsx:83\` · \`PerformanceDashboard\`
  → \`components/admin\` 전체에서 \`menuDisplayName\` import **0건**(grep 확인).

→ ① \`lib/constants/menu.ts\` 의 \`MENU_DISPLAY_NAMES\` 에 누락 키 **'배관+장비설치'·'기타'** 2개를 추가한다(\`types/estimate.ts\` 유니온과 전수 대조).
  ② 원시값 렌더 지점을 전부 \`menuDisplayName(...)\` 으로 치환한다. **DB 저장 키(select 의 value 등)는 절대 바꾸지 마라** — 표시 문자열만이다(§10-A O-33).
  ③ 관리자 필터 옵션 라벨도 표시명으로(값은 DB 키 유지).
  ④ \`PerformanceDashboard\` 는 집계 축이라 라벨만 바꾸고 키 사용은 그대로 두어라.

⚠ **누락 위험이 가장 큰 작업이다**(선례: memory 'Workflow 단일 편집 누락' — 이질적 다건 편집을 한 기수에 몰면 일부가 조용히 빠진다).
  작업 후 반드시 \`grep -rn "{est.work_type}\\|{estimate.work_type}\\|{e.work_type}" components/ app/\` 로 잔존 0건을 **기계 확인**하고 결과를 보고에 적어라.

【테스트】 \`test/constants/menu.test.ts\` 신설 — \`MENU_DISPLAY_NAMES\` 가 \`WorkType\` 유니온 전체를 덮는가(누락 시 실패) ·
\`menuDisplayName\` 이 미등록 키에 대해 원본을 반환하는가.`,
  },
]

// ── 실행 ────────────────────────────────────────────────────────────────────
const pick = (list) =>
  list.filter((a) => !(a.planB_only && PLAN === 'A')).map((a) => ({
    ...a,
    prompt: COMMON + '\n' + a.prompt + (PLAN === 'B' && a.planB_extra ? a.planB_extra : ''),
  }))

const WAVES = { 1: pick(WAVE1), 2: pick(WAVE2), 3: pick(WAVE3) }

if (WAVE === 4) {
  // 적대 검증 전용 파도 — 앞 파도가 전부 커밋된 뒤 돌린다.
  const LENSES = [
    {
      key: 'security',
      focus: `**보안·데이터 무결성 렌즈.**
- D7 버킷 한도가 **정상 업로드를 막지 않는가**(클라이언트 한도 \`uploadLimits.ts\` 와 MIME 목록이 정확히 같은가).
- N6 \`deletePayment\` 가 관리자 외에 열려 있지 않은가. 삭제 후 \`payment_status\` 가 저장값이 아니라 파생인가(§14-4).
- D2 동적 import 가 \`isSupabaseEnabled\` 판정 순서를 바꾸지 않았는가.
- §13 불변식 유지: 익명 견적 분기가 \`adminSessionInvalid\` 검사보다 **앞**에 있는가. 익명 \`list zeros_estimates\` 가 여전히 200 + PII 제거 행인가.
- B8 초안 저장이 \`estimated_amount\` 에 **총액**을 넣지 않는가(공급가액만 — §14-4).`,
    },
    {
      key: 'journey',
      focus: `**고객 여정·접근성 렌즈.**
- B9 4건이 **정상 접수를 막지 않는가** — 이메일 정규식이 정상 주소를 거부하지 않는가, 방문일 상한이 합리적인가,
  resetWizard 가 로그인 신원까지 지우지 않는가.
- N4 roving tabindex 가 **선택 상태를 깨지 않는가** — 방향키 이동이 곧 선택인가, 미선택에서 첫 칩이 tab stop 인가,
  \`min-h-[44px]\`·\`focus-visible\`·\`role="radio"\`/\`aria-checked\` 가 그대로 남았는가.
- C7 종료 팝업 '닫기' 이후 뒤로가기 계층이 정상인가. C8 URL 병렬 기록이 popstate·가드와 충돌하지 않는가.
- 새 오류 UI 전부 \`role="alert"\` 인가. 같은 정보를 두 곳에 표시하지 않는가(헌법 제10조).
- \`node .claude/hooks/ui-quality-gate.mjs --check\` 를 실행해 차단룰 위반을 확인하라.`,
    },
    {
      key: 'doctrine',
      focus: `**조문·픽셀 렌즈.**
- §10 / §10-A 확정 조문 위반이 있는가. 특히: 사업소개 CTA \`무료 견적 검토 신청\`(§10) 불변 · O-32 Footer 구성·문구·순서·
  \`border-t-2 border-navy pt-4\`·\`max-w-3xl lg:max-w-4xl\` · O-33 좌측 메뉴 라벨 · O-37 홈 세로 예산 · O-38 사업소개 세로 예산.
- C2(PLAN B)를 했다면 다크 잔존(\`#041B33\`·\`#061F3C\`·\`text-white\` 계열)이 남아 있지 않은가. \`app/layout.tsx\` themeColor 도 정합한가.
- D1 게이트 개편이 **차단 등급을 낮추지 않았는가**(R1 차단 유지). 베이스라인이 현재 위반 수를 정확히 담았는가.
- N5 치환 후 원시 \`work_type\` 렌더 잔존이 0건인가(직접 grep 하라).
- \`npx tsc --noEmit\` · \`npm test\` · \`npm run build\` 를 실행해 결과를 적어라.`,
    },
  ]
  phase('적대검증')
  const verdicts = await parallel(
    LENSES.map((l) => () =>
      agent(
        `${COMMON}

【너의 역할: 적대적 검증관 — ${l.key}】
**수정하지 않는다. 읽고 판정만 한다.** "이 수정은 틀렸다"를 기본 입장으로 반증하라.
보고서를 믿지 말고 \`git diff\` 와 파일을 직접 열어라. 확신이 없으면 FAIL 로 기울여라 — 라이브 배포되는 코드다.

이번 파도에서 바뀐 것: \`git diff master...HEAD --stat\` 및 \`git log --oneline master..HEAD\` 로 직접 확인하라.

${l.focus}`,
        { label: `검증:${l.key}`, phase: '적대검증', schema: VERIFY_SCHEMA, effort: 'high' }
      )
    )
  )
  return { plan: PLAN, wave: 4, verdicts: verdicts.filter(Boolean) }
}

const agents = WAVES[WAVE] || []
log(`PLAN ${PLAN} · 파도 ${WAVE} · 수정 ${agents.length}기 착수`)

phase('수정')
const results = (await parallel(
  agents.map((a) => () => agent(a.prompt, { label: `W${WAVE}:${a.key}`, phase: '수정', schema: REPORT_SCHEMA }))
)).filter(Boolean)

return {
  plan: PLAN,
  wave: WAVE,
  agents: agents.length,
  reports: results,
  changed_files: [...new Set(results.flatMap((r) => r.changed_files || []))],
  needs_pixel_gate: WAVE === 1 && PLAN === 'B',
}
