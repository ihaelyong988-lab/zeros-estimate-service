<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 자기개선 원칙 (Self-Improvement) — 모든 작업 최우선

> **핵심 규칙: 사용자가 한 번 설명한 작업 지시·요청 방식·선호는 두 번 다시 설명하게 하지 않는다.**
> 같은 지시를 2~3번 반복하게 만든다면, 그것은 하네스가 그 지시를 기록·적용하지 못한 **실패 신호**다.
> 한 번 받은 지시는 **그 자리에서 영구 규칙으로 굳혀**, 사용자가 다시 입력하는 수고를 없앤다.

1. **첫 지시에 즉시 규칙화(그 턴 안에)**: 작업 명령·방식·선호·교정·금지가 나오면 곧바로 적는다 — 프로젝트 규칙 → 본 `AGENTS.md`/`docs/`, 작업 맥락 → `docs/_worklog/`, 상태 → `docs/00_orchestration/`.
2. **재설명 요구 금지**: 이미 기록된 지시는 다시 묻지 않고, 새 작업 전 `AGENTS.md`·`docs/`를 먼저 조회해 적용한다.
3. **마감 자기점검**: 종료 시 "이번에 사용자가 설명한 지시·방식·교정"을 규칙으로 남겼는지 확인. 안 남기면 다음에 또 같은 설명을 요구하게 됨.

---

# 0. 저장소 지도 (Repo Map) — 에이전트 진입점

> **작업 시작 전 여기서 "무엇이 어디 있는지"를 잡는다.** 소스/설정 위치는 Next.js 규약상 고정.

| 위치 | 무엇 | 비고 |
|---|---|---|
| `app/` | Next.js App Router (page/layout/api) | `app/page.tsx` = 중앙 라우터 |
| `components/` | UI — `admin/` 백오피스 · `forms/` 위저드 · `layout/` 3-Pane Shell | 재사용 컴포넌트 |
| `lib/` | 로직 — `calculations.ts`(영업계산식) · `constants/`(매뉴얼 맵) · `supabase/`(영속 래퍼·시드) | 콘텐츠는 데이터(맵)로 분리 |
| `types/` | TypeScript 인터페이스 | `estimate.ts` |
| `docs/` | 협업 가이드·역할 정의 (`docs/README.md`가 인덱스) | `00_orchestration/`이 상태/이월/결정 |
| `docs/_worklog/` | 일자별 작업 기록 (날짜 prefix) | 최신 작업 맥락 추적용 |
| `docs/assets/` | 디자인 원본 (편집용 PPTX 등) | 바이너리 |
| `scripts/` | 로컬 보조 스크립트 | `open_chrome.ps1`, `open-browser.bat` |
| `supabase/` | DB 스키마/셋업 SQL | `supabase-setup.sql` |
| `graphify-out/` | 지식 그래프 (god node·커뮤니티) | 구조 질문 전 `GRAPH_REPORT.md` 먼저 |
| 루트 | `package.json`·`next.config.ts`·`tsconfig.json`·`CLAUDE.md`·`AGENTS.md` | **위치 고정** |

**상태 동기화**: PHASE 시작 전 `docs/00_orchestration/state.md` + `handoff.md` 확인 → 종료 시 `docs/03_qa_deploy/gate-checks.md` 게이트 기록.

---

# 작업 원칙 (Working Agreement) — 모든 AI 도구/에이전트 공통

> 사용자 지시로 기록 (2026-06-20). 이 저장소에서 작업하는 **모든 도구(Claude/Cursor/Copilot 등)** 가 우선 적용한다. 도구가 바뀌어도 같은 실수를 반복하지 않기 위함.

## 0. 스킬 우선 적용 (착수 전 — 가장 먼저) · 필수
> 사용자 상시 지시 (2026-06-27). **프런트엔드·백엔드·인프라·문서 등 작업 종류를 가리지 않고**, 코드/산출물에 손대기 전에 **적용 가능한 스킬을 먼저 확인하고, 해당되면 무조건 호출한 뒤** 착수한다.

- **UI/프런트엔드**: `ui-ux-pro-max`(반드시 `scripts/search.py … --design-system` 부터 실행) · `frontend-design`.
- **업무문서(필수 의무화)**: 엑셀 견적서·정산·보고서 = `xlsx` / `excel-report` · PPT 제안서·보고 = `pptx`(도메인: `ve-report-generator`·`dc-mech-proposal-ppt`·`spec-to-ppt-training-v2`·`construction-pm-dashboard` 등) · 워드/문서 = `docx` / `pdf`. **손으로 표·슬라이드를 짜지 말고 반드시 해당 스킬로 생성**한다.
- **그 외 작업**: 맞는 스킬이 있으면 무조건 사용 — 예) MCP 서버=mcp-builder, 심층조사=deep-research 등.
- **"직접/수동으로 하면 된다"고 건너뛰지 않는다.** 적용 가능한 스킬이 **없을 때만** 바로 진행한다.
- 근거: 2026-06-27 — UI 작업에서 스킬을 건너뛰고 수동 설계해 결과가 반복적으로 어설펐음. (UserPromptSubmit 훅이 이 규칙을 매 지시마다 자동 재주입한다.)

## 1. 의도·맥락 우선 (가장 중요)
- 작업 지시를 받으면 **먼저 "의도(intent)와 맥락(context)"을 파악**한다.
- 화면/이미지/텍스트를 **자세히 보고** 무엇을 원하는지 이해한 다음 움직인다.
- **조금이라도 헷갈리면 임의로 진행하지 말고 먼저 확인받는다.**
- 확인 없이 판단대로 작업하면 = **재작업(rework)** = 시간 낭비·신뢰 손상.
- **지시 문장만 그대로 실행하지 않는다.** 작업 내내 맥락의 디테일(정렬·크기·대비·톤·타깃 고객)을 계속 생각하며 결정한다.

### 1-A. 지시 항목 전수 처리 (빼먹기 방지 — 필수)
- 지시(특히 **이미지·주석·다항목**)를 받으면 표시된 **모든 항목을 번호로 전수 나열**하고 시작한다. 라벨처럼 보여도 **임의 제외 금지** — 애매하면 "이건 ②번 작업인가?"를 **먼저 확인**한다.
- 완료 선언 **전에**, 나열한 **번호 각각을 화면/코드로 검증**하고 "①완료 ②완료…" 형태로 보고한다. **하나라도 미확인이면 끝난 게 아니다.**
- 근거: 2026-06-21 사업소개 **'FOOTER 소개란' 누락** — X표시 버튼만 처리하고 'FOOTER 소개란' 지시를 라벨로 단정해 건너뜀.
- (UserPromptSubmit 훅이 이 체크리스트를 매 지시마다 자동 재주입한다 — `.claude/hooks/prompt-checklist.mjs`.)

## 2. 시안 먼저, 코드 나중
- 코드 반영 전에 **시안(mockup)을 먼저 보여주고** 사용자가 고르게 한다.
- "혼자 삽질"하지 않는다. 가진 디자인/시각화/프리뷰 도구를 쓴다.

## 3. 범위 엄수
- "딱 이곳만"이라고 하면 **그 범위만** 작업한다. 다른 곳을 임의로 건드리거나 되돌리지 않는다.
- 사용자가 의도적으로 단순화/삭제한 것을 **임의로 되살리지 않는다.**

## 4. 디자인 철학 (이 프로젝트)
- 핵심: **단순 · 간결 · 하이라이트화.** 정보량보다 **위계(hierarchy)** — 다 강조하면 강조가 없다.
- **직관 우선.** 사람 뇌는 "생각해서 이해"보다 "보고 즉시 공감"에 끌리고 복잡함을 회피한다. 읽게 만들지 말고 보면 바로 느끼게.
- **설명문 = 핵심 내용·키워드만(짧게).** 뻔한 라벨·완성형 문장 금지. **결과값 = 시각화 지표**(그래프·막대·눈금·아이콘 칩).
- **중복 금지.** 같은 숫자·문구·절차를 여러 곳에 반복하지 않는다. 각 영역은 **자기 하이라이트 하나만**.
- **키워드는 지표처럼 크게**(작은 칩보다 큰 에디토리얼 헤드라인). 폰트는 **Pretendard**.
- 눈의 피로 감소: 박스(도형) 남발 대신 여백·헤어라인, 색은 핵심 하나에만.
- **중장년 타깃** — 불필요한 영어 절제.
- **단정적 표현 금지**(거품·과다청구·부풀려진 단가 등). ZEROS는 **최적합 견적을 산출·제공하는 서비스** 회사다(시공/공사하는 곳 아님).

## 5. 위임 모드("자동 전환")
- "작업 완료하세요 / 자동 전환합니다"처럼 **명시적으로 위임**하면, 매 항목 확인하지 말고 **도메인 기준 합리적 기본값**으로 진행한다.
- 단, 추후 교체가 쉽도록 **콘텐츠는 데이터(맵)로 분리**해 둔다(공종별 키워드/검토 항목 등).

## 6. "마감처리" = 끝까지 (반복 지시 금지)
- "마감처리"라고 하면 매번 묻지 말고 **전 과정을 자동 수행**한다:
  **빌드 확인 → (master면) 새 브랜치 → 【작업 기록 자동 갱신】 → 커밋 → 푸시 → master 머지 → master 푸시(=호스팅 자동 배포)**.
- **작업 기록은 마감처리에 포함된 자동 단계다(사용자가 매번 시키지 않는다).** 커밋 직전에 `docs/_worklog/<오늘날짜>_작업정리.md` 항목 추가(같은 날짜면 이어붙임) + `docs/00_orchestration/state.md` "최신 반영"·"다음 할 일" 갱신 → **같은 커밋에 포함**. 상세 절차: `.claude/commands/마감처리.md`.
- 배포 메커니즘: 로컬 vercel/deploy 스크립트 없음 → **origin master 푸시 시 GitHub 연동 호스팅 자동 배포**. 원격: `ihaelyong988-lab/zeros-estimate-service`.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **순번 결과 보고(마감 마지막 단계)**: 마감 완료 후 한 일을 **①②③… 순번으로 간결히** 정리 + 배포 URL·PR/머지 등 남은 1클릭을 명시한다. (매번 따로 시키지 않는다)

## 7. 오늘 확정된 구조 (2026-06-20)
- **견적 작업 FLOW**: 공종 상세에서 제거 → **견적 검토 랜딩 히어로 박스**에만 1곳.
- **공종 상세 히어로**: 좌=검토 항목(문제 도출)+"최대 N% 견적 차이" / 우=ZEROS Agent AI **견적 검증**+"최적합 견적 확정". **전 공종 공통·데이터 연동**(`tradeReviewItems`, `metrics.bubbleRate`).
- **주요 견적 키워드 밴드**: 공종 상세 최상단, 큰 키워드, 공종별 `tradeKeywords`로 교체.
- **우측 결과 패널**: 견적 검토 진입 시 숨김 → 우측 상단 "검토" 엣지 탭(음영 없음)으로 펼침, 헤더 `›`로 접기.
- 일자별 상세 기록: `docs/_worklog/2026-06-20_작업정리.md`.

## 8. 변경 검증·배포 확인 프로토콜 (필수 — "똑같다" 무한반복 방지)
> 2026-06-27 — 사용자가 배포 후 "똑같은데"를 반복했고, 매번 디자인을 더 고치려다 헛돌았다. **거의 전부 캐시 문제였다.** 아래를 반드시 지킨다.

- **헤드리스 프리뷰(`preview_*`)는 신뢰 불가**: 이 앱은 `AppShell`이 `layoutReady`(rAF)까지 스플래시를 띄우는데, 헤드리스 탭은 백그라운드 rAF 스로틀로 **스플래시에서 멈춘다**(스크린샷 타임아웃). → 시각 검증은 **(a) `npm run build` 0에러 + (b) `show_widget` 시안**으로 대체한다. 프리뷰 스크린샷에 매달리지 말 것.
- **배포 후 "똑같다" 1순위 원인 = PWA/브라우저 캐시.** 코드·배포는 정상인데(커밋 해시로 증명) 캐시가 옛 화면을 보여준다. → 사용자에게 **시크릿(incognito) 창 / 하드리프레시(Ctrl+Shift+R)** 로 확인 요청. 설치형 PWA면 완전 종료 후 재실행.
- **"똑같다" 보고가 오면 코드부터 고치지 않는다.** 먼저 **(1) 지금 보이는 헤드라인 문구 한 줄, (2) 보는 주소(`zerospipe.co.kr` vs localhost)** 를 확인해 **캐시인지 기대 불일치인지** 가린 뒤 움직인다.
- **라이브 도메인**: `zerospipe.co.kr`(프로젝트 폴더명과 동일). 배포 = master 푸시 → 호스팅 자동.
- **마감처리 git은 단계별 출력을 확인**한다. 여러 명령을 한 줄로 묶을 때 도구 호출이 깨져 **푸시가 안 나가는 일**이 있었음(2026-06-27) → `push`/`merge` 결과(`xxx..yyy master -> master`)를 **눈으로 확인**하고 보고.

## 9. 데이터 소스 = Supabase (Mock 아님 — 중요)
> 2026-06-27 — 실적 테스트데이터를 `mock-data.ts`에 시드했는데 화면에 안 떴다. **이 앱은 Mock이 아니라 Supabase(실클라우드)를 읽기 때문**이었다.

- `lib/supabase/supabaseBrowser.ts`에 **DEFAULT Supabase URL/anon 키가 하드코딩**돼 있고 `.env.local`에도 실 키가 있어 **`isSupabaseEnabled = true` 항상** → 앱은 **`SupabaseZerosService`(실 DB)** 를 쓴다. `MockZerosService`(localStorage)는 **이 환경에서 실행되지 않는다.**
- 따라서 `lib/supabase/mock-data.ts` 시드는 **Mock 경로 전용** — Supabase 환경에선 화면에 안 보인다. **견적/실적 데이터를 채우려면 Supabase에 직접 시드**한다: `SupabaseZerosService.loadTable`에 멱등 시드(클라우드에 없을 때만 upsert), 테스트행은 `est-test-*` id로 추후 일괄 삭제 가능.
- 라이브 Supabase 프로젝트: `xtljznrfmythnnpeorgz.supabase.co`. 같은 키로 막힘없이 select/upsert 가능(RLS 통과 확인).

## 10. 확정 디자인 패턴 (이번 세션 — 히어로/KPI, 4번의 연장)
> 2026-06-27 확정. ui-ux-pro-max(Style=Trust & Authority, Pattern=Minimal Single Column·Exaggerated Minimalism) 근거.

- **사업소개 히어로**: eyebrow 없음 · **오버사이즈 헤드라인**(`clamp ~50px`, `font-extrabold`=800; 900은 과해서 품위↓) · **accent(오렌지)는 키워드 한 곳만** · 본문 `max-w-[560px]`로 줄길이 균형(가독 65~75자) · **단일 CTA "무료 견적 검토 신청"** · Footer는 `mt-auto`+`min-h-[calc(100vh-128px)]`로 **하단 앵커+한 화면**(안전여백 둬 미세 스크롤 방지) · 헤드라인 카피는 **격식 어미("…책정합니다")**, 구어체("들쑥날쑥/남깁니다") 지양.
- **위계 규칙**: 헤드라인이 항상 최상위. 보조 지표(±5% 등)는 **헤드라인보다 작게**(역전 금지).
- **실적 KPI**: 박스 없이 **상·하 헤어라인만** · 누적 건수만 오렌지(펄스 점+숫자+짧은 룰) · 나머지 무채색(navy/gray) · 막대그래프=**공종 시그니처 색**(`TRADE_COLORS`, `fillOpacity 0.9`).
- **가독성 체크리스트(ui-ux-pro-max)**: 본문 **≥16px**, 대비 **4.5:1**(→ `gray-light`#9AA3AF는 본문 금지, `gray`#5B6573 이상) · `prefers-reduced-motion` 존중(`motion-reduce:animate-none`) · `tabular-nums`로 숫자 정렬.

## 11. 하네스 · Loop 엔지니어링 규칙 (검증 루프 강제)
> 사용자 지시로 명문화(2026-06-30). 핵심: **"리마인더가 아니라 검증."** 규칙은 말로 된 지시가 아니라 **기계가 채점하는 게이트**로 구현한다. 스킬은 "호출"이 아니라 **"결과를 산출물에 반영"까지가 완료**다. (전역 `~/.claude/CLAUDE.md`에 동일 명문화 — 모든 작업 적용.)

### 0. 왜 (근본 원인 차단)
- 리마인더만 있으면 **검사 가능한 것(=호출)** 만 하고 **검사 안 되는 것(=결과 적용)** 을 건너뛰어 같은 구멍이 반복된다(시간·토큰 낭비).
- 처방: **산출물을 기계가 채점**하고 미통과면 **마감 자체를 차단**한다 → "호출만 하고 적용 안 하기"를 구조적으로 불가능하게.

### 1. 3계층 구조
1. **기준파일**: `design-system/zeros/MASTER.md`(UI 기준 + AGENTS §10 ZEROS 오버라이드 최상단 고정). 매번 재추론하지 말고 이 파일을 따른다.
2. **검증 루프(핵심)**: `.claude/hooks/ui-quality-gate.mjs` — 변경 `.tsx`를 결정적 룰로 채점. **차단룰 R1(에러 `role="alert"` 누락)**, 경고 R2(`text-gray-light` 본문)·R3(터치<44px). 미검증·차단룰 위반 시 **Stop 훅이 마감을 `decision:block` 으로 차단 → 통과까지 loop**(세션당 3회 초과 시 경고 후 통과). `.claude/settings.json` Stop 배열에 등록(graphify 훅과 병행).
3. **강제 게이트(선택)**: 필요 시 PreToolUse로 편집 전 스킬 호출 마커 검사.

### 2. 작동 규약 (UI 변경 시 마감 전 필수)
- `node .claude/hooks/ui-quality-gate.mjs --check` → 위반 수정 → `node .claude/hooks/ui-quality-gate.mjs --pass`(차단룰 0건일 때만 마커 기록). 미통과면 Stop 게이트가 마감을 막는다.
- 차단/경고 룰은 §10 가독성 체크리스트와 동기화(role=alert · 대비 4.5:1 · 터치 44px · focus-visible · no-emoji · reduced-motion · tabular-nums).
- 마감 자기점검에 **"이번 산출물이 검증 루프(--pass)를 통과했는가"** 포함.
