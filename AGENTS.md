<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 반복금지 헌법 (Anti-Repetition Constitution) — 모든 조항에 우선하는 최상위법
> 제정 2026-06-30 · **제7조 추가 2026-07-04** (전 폴더 공통 배포). 목적 = **사용자의 시간을 지킨다.** 같은 걸 두 번 말하게 만드는 것이 최우선 실패다.
> - **제1조 (한 번 = 영구):** 한 번 설명한 지시·방식·선호·교정은 그 턴 안에 영구 규칙으로 기록(AGENTS/docs/memory). 두 번 묻지 않는다.
> - **제2조 (먼저 조회·적용):** 새 작업 착수 전 기존 규칙을 먼저 조회해 적용한다.
> - **제3조 (첫 시도에 정확히):** 의도가 모호하면 **만들기 전에** 시안(before→after)·질문으로 1회 확정. 추측 후 사후 교정 = 반복작업 = 위반.
> - **제4조 (근본까지 규칙화):** 교정은 증상이 아니라 근본 원인을 규칙으로 박는다 — 같은 류 재발 0.
> - **제5조 (반복 = 실패):** 같은 취지를 2번 말하게 하면 하네스 실패 → 즉시 사과·재발방지 규칙화.
> - **제6조 (마감 게이트):** 마감 시 "이번 지시·교정을 규칙화했고 다음엔 같은 설명이 불필요한가" 자기점검 통과가 조건.
> - **제7조 (정밀 판독·덤벙 금지):** 훑어읽기·추측 착수 금지 — **"빨리 만든 오답이 가장 비싼 낭비, 시간을 버는 것이 최고의 작업."** ① 지시·캡쳐를 문장/마크업 단위로 분해 해석 + 산출 후 원 지시와 **1:1 재대조(누락 0)** 후에만 보고. ② 삭제 X 마크업 = 개별 항목이 아니라 **그 도형·스트립·카드 전체.** ③ 해석이 둘 이상이면 만들기 전 before→after 1줄로 1회 확정. ④ 같은 실수 유형 2회째 = 규칙 미비 → 즉시 조문 추가.

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
- **상·하 여백·폰트 균형 상시 점검(2026-07-05 상시 지시).** 모든 화면 작업에서 **세로 리듬(상·하 여백)과 폰트 크기 위계의 균형감**을 기본 점검 항목으로 삼는다 — 한 요소를 키우거나 줄이면 인접 요소의 여백·크기를 **함께** 조정해 한쪽만 크거나 답답하지 않게(상·하 섹션 행간 동기, 좌·우 열 폰트 대칭 선례). 마감 자기점검에 "상하 여백·폰트 위계 균형 확인"을 포함한다.

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
- **원격 판정법(2026-07-05 확정 — "전부 변화 없음" 보고를 1회에 격리):** `curl -s https://zerospipe.co.kr` → HTML 속 `/_next/static/chunks/*.js` 전부 내려받아 **이번 변경의 마커 문자열 grep**(신규 문구 존재 + 구 문구 0건). ①마커 있음 = 배포 정상 → 원인은 기기 캐시(시크릿 창·Ctrl+Shift+R·설치형 PWA는 완전 종료 후 **2회** 실행 — 1회차에 kill-switch SW가 캐시를 지우고 2회차에 새 화면) ②마커 없음 = 배포 실패 → Vercel/원격 조사로 전환. 코드 수정은 항상 그 다음이다. (git 동기는 `git log origin/master -1`로 별도 확인.)
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

### 10-A. 확정 패턴 추가 (2026-07-01 · PHASE O-12/O-13 — 여러 번 반복 교정받아 영구화)
> 근거: `ui-ux-pro-max`(Trust & Authority · Executive/Data-Dense Dashboard). 아래는 **반복 교정 방지용 확정 규칙**이니 다음 작업 때 재추론·재질문 없이 따른다.

- **모바일 메인화면 = 화이트 배경(고정).** 다크 네이비 배경(`#041B33` 등)·네온 아이콘색(sky/indigo/emerald)은 **"AI 도구 느낌" → 금지.** 배경 `#FFFFFF` · 헤드라인/본문 네이비 `#0F1E35`/그레이 `#5B6573` · 아이콘 **스틸블루 `#1E4D8C` 단색** · 카드 화이트+헤어라인 `#E4EAF2` · 주 CTA **오렌지 솔리드 `#E0701A` 하나만**. (템플릿·레이아웃은 유지, 컬러만 교체.)
- **정렬 = 좌측 단일 축(고정).** 한 섹션 안에서 헤드라인만 가운데+본문 좌측 같은 **혼합 축 금지.** 모든 섹션을 동일 좌측 기준선으로. 세로는 중앙(`justify-center`) 허용.
- **필요 이상 라벨(eyebrow) 금지(2026-07-02 사용자 지시 — "이런 필요 이상의 것 삭제").** 모바일 랜딩 제목 위 소문자 트래킹 라벨("AI NATIVE 견적 검증"·"AI NATIVE 정량 분석"·"AI 실시간 정량 분석") 전부 삭제됨. **제목과 의미가 중복되는 장식 라벨을 새로 추가하지 않는다** — 섹션은 eyebrow 없이 제목부터 시작(좌측 축은 유지).
- **서비스 프로세스 9단계 = 간결·직관(2026-07-02 확정 — 사용자 "나의 컨셉").** ①P1/P2/P3 국면 범례는 **한 줄 인라인**(세로폭 낭비 금지) ②단계 카드는 `번호+제목+주체칩 한 줄 → 한 줄 설명 → 산출물 칩`만 — **아이콘 박스·영문 이중 표기(REQUEST INTAKE 등)·Q&A 문장 금지** ③설명은 1문장 함축. 단계형 안내 화면 전반에 동일 기준 적용.
- **차트/실적 공종 색 = "작업 특성 기반" 의미 팔레트(고정).** 단색으로 flatten 금지, 무지개(고채도 8색)도 금지 — **딥·뮤트 톤**으로 통일하되 공종 성격에 맞춘 의미색: 배관/유체=블루 `#1D6E93` · 유틸리티=스틸블루 `#3B7CA8` · 기계실/HVAC=틸 `#1E7A72` · 금속 장비=그래파이트 `#566270` · 건설/증설=앰버 `#B5762A` · 노후/부식=러스트 `#9E4B2C` · 라인 연결=인디고 `#4A56A6` · 자본/검토=딥네이비 `#1E3A5F`(`TRADE_COLORS` in `PerformanceInsights.tsx`). **막대·히트맵·세부카드 3곳이 같은 색 체계로 코디**(히트맵 각 행=자기 공종 색 농도, 카드 상단보더·닷·%칩=공종 색). 히트맵 셀 글자색은 **밝기(luminance) 기반**으로 산출해 어떤 공종 색이든 대비 확보. 막대는 격자·축 제거 + **끝 값 라벨(`LabelList`)** 로 정리.
- **실적 상단 밴드·행간(2026-07-05 최종 — 구 지배지표 조문 대체).** ①좌측 지배 KPI 블록(누적 견적 건수 크게) = **폐지**(사용자 X 마크업·도형 샘플 확정). 최상단 한 행 = **좌 "공종별 견적 실적 분포 (건수·비중)" 헤더 + 우 KPI 4종 균일 클러스터**(견적 건수·검토 비율·평균 소요·공종 수, 라벨 12px·숫자 23px 네이비 — 오렌지·펄스 닷 없음). ②막대 차트 세로폭(2026-07-11 갱신 — 캡쳐 지시 "히트맵 가로셀 폭과 균형"): 막대 컨테이너 **`h-[296px]`(행 pitch 37px)·레일 `h-[18px]`** — 히트맵 가로셀(폭 ≈190px)의 덩어리감과 좌우·상하 균형이 우선(구 2026-07-05 "합계 행 첫 화면 노출 우선 h-[240px]/레일 14px" 압축 대체, 밀림은 섹션 gap 소폭 회수로 보상). 히트맵 셀 `py-1.5`는 유지.
- **견적검토 히어로·FLOW 상하 균형(2026-07-04 확정 · 2026-07-09 PHASE O-25 갱신).** ①FLOW 스트립 제목 = **좌측 CAPEX 타이틀과 동일 26px**(오렌지 세로바 h-6 동반) + **부제 삭제**(구 "하단 다크 밴드 동기 21px·부제 '단계를 누르면…'" 대체 — 2026-07-09 캡쳐 지시), 탭은 15.5px 유지 ②히어로 우측 열 제목 "사전 견적 후 결과 지표" = **좌측 CAPEX 타이틀과 상단선 정렬**(pt 제거 — 구 "pt-2 살짝 하향" 철회) · 동일 26px, benefit 불릿 = **16px**(구 15px, 본문 ≥16px 규칙 충족), 그래프 라벨·세부 지표는 13~17.5px로 좌우 대칭 + 세로 여백 넓게(pt-5·mt-4) — 우측만 잘게 두지 않는다. ③사업소개 헤드라인 = 데스크톱 **한 줄**(`clamp(30px,3vw,38px)`+nowrap, 모바일 2줄 유지), 절약분은 3단계 타임라인 확대(제목 19px·설명 15.5px·±5% 52px·gap-7)에 배분.
- **실적 화면 용어·히트맵 제목·분리선(2026-07-05 확정, PHASE O-20).** ①실적 화면 표기 = **"견적"**("진단" 금지 — 단 견적규모 카테고리명 "프로젝트 사전진단"은 서비스 명칭이라 유지): 누적 견적 건수 · 공종별 견적 실적 분포 · 셀 = 견적 건수. ②히트맵 제목 = **표 좌상단 빈 코너 셀 내장**(별도 제목 행 금지 — 세로폭 절약으로 하단 합계 행이 스크롤 없이 보이게 하는 것이 의도). **2026-07-05 재확정: 코너 문구 = "실적 히트맵" 단독 14px**("공종 × 견적규모" 부제·"(셀 = 견적 건수)" 캡션 삭제 — 사용자 취소선 마크업). ③섹션 분리선 = 회색 헤어라인 좌측에 **공종 8색 미니 스트립**(`TradeStrip`, 각 섹션 등장 순서 색)으로 다음 섹션을 예고 — 전부 같은 회색 분리선 금지.
- **실적 화면 제목·우측패널·이중선(2026-07-07 확정, PHASE O-23 — 사용자 캡쳐 마크업).** ①상단 밴드 헤더 = **"실적 분포" 단독**("공종별 견적"·"(건수·비중)" 삭제 — §152 구 문구 "공종별 견적 실적 분포 (건수·비중)" 대체). ②"실적 분포"·"실적 히트맵" **두 섹션 제목 폰트 = KPI 수치와 동일 `text-[23px]`**(견적 건수 "101"과 같게, 아이콘도 `w-5 h-5` 동반 — §154 "코너 문구 단독 14px" 대체). ③**우측 "예상 견적범위" 패널 = 실적(`activeTab==='performance'`) 화면 기본 숨김** — `AppShell` 자동숨김 useEffect 조건에 performance 추가, 우측 "검토" 세로 엣지 탭 클릭 시에만 펼침(문맥에 안 맞아 기본 접힘). ④**세부 실적 구간 "이중선" 제거** — "공종별 세부 실적" 헤더 컬러 스트립(`TradeStrip`)·각 카드 상단 2px 컬러선(`border-t-2`) 삭제(회색 헤어라인 위 컬러선 = 눈 피로), 카드 색 코딩은 닷·%칩으로 유지(§151 "카드 상단보더=공종색" 부분 철회). **상단 분포·히트맵의 `TradeStrip`은 유지**(§154 ③ 잔존, 세부 실적 구간만 예외).
- **AI Native / SOP = 실제 데이터 분석 파이프라인(고정).** 얕은 6단어 키워드로 단순화 금지 — 표준 데이터 분석 생애주기(수집 → **데이터 검증·정제** → 전처리 → 모델링 → 분석·**이상치 검증** → **결과 검증** → 전달)를 반영하고, 각 단계에 방법론 칩(Vision AI·Feature Engineering·Z-score 이상치·신뢰구간 ±5%)과 데이터 변환(io)을 노출. **데이터 검증 단계 누락 = 실패**(재지적받음). 코드/다크콘솔이 아닌 깔끔한 인포그래픽으로. 상세 memory: `sop-infographic-must-reflect-real-data-pipeline`.
- **모바일 실적 상단 밴드 수평 스와이프(2026-07-11 확정).** 휴대폰에서는 `실적 분포` 제목과 KPI 4종(견적 건수·검토 비율·평균 소요·공종 수)을 줄바꿈하지 않는다. 히트맵과 동일하게 내부 `overflow-x-auto no-scrollbar`로 한 줄 가로 이동만 허용해 세로폭을 늘리지 않으며, 차트·히트맵·스트립·데스크톱 KPI 우측 정렬은 변경하지 않는다.

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
- **성장 게이트(2026-07-02 신설)**: `.claude/hooks/growth-gate.mjs`(Stop) — 오늘 커밋이 있는데 worklog/결정로그/state 기록이 갱신되지 않았으면 마감 차단(세션 2회 cap, `--check` 점검). "작업 후 자동 업데이트"의 기계 강제 — 동일 게이트를 개인용 PMIS·꽁아코스 `scripts/`에도 이식. 표준 절차·개선 프롬프트(자동 견적서 P1 등)는 `docs/OPTIMIZE.md`.

## 12. 파일 업로드·다운로드 데이터 흐름 (2026-07-05 전수 판독 — 재조사 불필요)
- **업로드는 제출 전 즉시 실행**: `RequestWizard` 파일 선택 → `uploadEstimateFiles`(`lib/supabase/storage.ts`) → Storage 버킷 `estimate-files`의 `drawings|photos|etc|quotes/<ts>-<rand>-<safe>` 경로 + `getPublicUrl` 공개 URL → `FileMeta`. 한도 = `lib/constants/uploadLimits.ts`(카테고리 5·총 15·개당 50MB·합계 100MB).
- **제출**: `createEstimate`가 `submitted_files` 포함 `zeros_estimates`(id+data jsonb) upsert + 자동 연쇄(`zeros_customers` CRM 누적 · `zeros_notification_logs` 알림 이력 · visit 채널은 `zeros_site_visits`).
- **관리자 다운로드 가능**: `EstimateDetailModal` 첨부 카드에서 `file_url` 새 창 열람/다운로드 + 관리자 업로드·견적서 xlsx 발송(`estimate_pdf_url` → 고객 마이페이지 노출).
- **파일 보안(2026-07-05 잠금 완료)**: 버킷 비공개 + 열람은 `/api/files/sign` 서명 URL(10분)로만. 관리자=`/api/admin/login` 서버 검증(비밀번호 env `ZEROS_ADMIN_PASSWORD`, 클라이언트 하드코딩 금지) 후 관리자 토큰 / 고객=OTP `sessionToken`(30일)으로 **본인 건 파일만**. 신규 업로드는 `file_path`만 저장(`file_url`은 레거시 호환 — sign API가 공개 URL에서 경로 추출). 서명에 `SUPABASE_SERVICE_ROLE_KEY`(서버 전용, .env.local+Vercel) 필수. 잠금 SQL = `supabase/supabase-setup.sql` §5(버킷 private + insert만 익명 허용). **새 파일 링크 UI를 만들 때 `<a href={file_url}>` 직결 금지 — `openSecureFile()`(`lib/files/secureFile.ts`) 사용.**
- **잔여 유의**: 관리자 "삭제"는 `submitted_files` 메타만 제거, Storage 실물은 안 지움(`storage.remove` 미사용) — 비공개 전환 후엔 접근 불가라 위험도 낮음.
- **오류 원장(2026-07-05)**: `@supabase/supabase-js` 서버 라우트에서 ①클라이언트를 `ReturnType<typeof createClient>`로 타이핑하면 row가 `never` 추론 → 처방: 파라미터는 `SupabaseClient` 타입 임포트로, select 결과는 `as { data: T }[]` 캐스팅. ②제네릭 불일치(`"public"` vs `never`)도 동일 처방.
- **오류 원장(2026-07-05 ②)**: 신형 Supabase 키(`sb_secret_*`)로 REST 직접 호출 시 `Authorization: Bearer` 단독은 `Invalid Compact JWS` 403 → 처방: **`apikey: <sb_secret_키>` 헤더로 호출**. supabase-js `createClient(url, key)`는 자동 처리되므로 앱 코드는 수정 불필요.

## 13. 데이터 접근 보안 게이트웨이 (2026-07-11 — 전수 감사 후 잠금)
> 배경: 전수 디버깅 감사에서 **테이블 RLS 전면 개방(anon `for all`)** 이 발견됨 — 공개 anon 키만으로 전 고객 PII(이름·전화·주소·견적) 조회·수정·삭제 가능(2026-07-05 §5 잠금은 스토리지만 닫았고 테이블은 그대로 열려 있었음). 근본 원인 = localStorage 어댑터를 그대로 Supabase에 이식해 **브라우저가 anon 키로 테이블을 직접 read/write** 하던 구조.
- **불변식: 브라우저는 테이블에 직접 접근하지 않는다.** 모든 데이터 입출력은 `POST /api/data`(서버, `getServiceClient()` = service_role + 신원 검증)로만. `lib/supabase/client.ts`의 `SupabaseZerosService.loadTable/persistTable`는 이 라우트를 호출하는 얇은 래퍼다(anon 직접 쿼리·시드 로직 제거됨). **새 데이터 경로를 만들 때 `getSupabase()`(anon)로 테이블을 쿼리하지 말 것** — 스토리지 업로드(`storage.ts`)만 anon 유지.
- **권한 3계층(`/api/data`)**: 관리자 토큰=전체 read/write · 고객 세션 토큰=본인 휴대폰 건(견적·알림)만 read · 익명=견적은 **PII 제거 분석 행만**(공개 실적 화면용), 그 외 테이블 차단. 쓰기(`upsert`)는 관리자 전용. 공개 접수(`createEstimate`)는 OTP verified/session 토큰 검증 후 **서버가 접수번호 채번·단건 생성**(클라이언트 count+1 경쟁 제거).
- **fail-closed 원칙**: `OTP_SERVER_SECRET` 미설정 시 추측 가능한 상수 대신 프로세스 랜덤키로 폴백(토큰 위조 불가·env 필수) · `ZEROS_ADMIN_PASSWORD` 미설정 시 로그인 503 거부(기본값 `zeros1234!` 폴백 폐기). **필수 env(서버): `SUPABASE_SERVICE_ROLE_KEY`·`ZEROS_ADMIN_PASSWORD`·`OTP_SERVER_SECRET` — 로컬 .env.local 확인됨, Vercel에도 반드시 등록.**
- **배포 순서(중요)**: (1) master 배포(서버 게이트웨이 코드는 이미 anon 미사용) → (2) `supabase/supabase-setup.sql` §3 실행(anon 테이블 정책 DROP → 누출 차단). 코드가 먼저 올라가 있어야 SQL 실행 시 화면이 안 끊긴다.
- **✅ 실행 완료(2026-07-11)**: 위 잠금이 라이브 DB에 **실제 적용·검증됨**(Supabase Management API `POST /v1/projects/<ref>/database/query` + 일회용 액세스 토큰으로 실행). 검증: anon 정책 6→0, RLS 6테이블 활성, anon REST 조회 3행→0행, 라이브 `/api/data` 200·PII 공란. **`pg_policies`에서 `zeros_*` anon 정책이 다시 생기면 안 된다**(누출 재발). service_role 키로는 DDL 불가 — 정책 변경은 대시보드 SQL Editor 또는 Management API(액세스 토큰)로만. supabase CLI(v2.109) 설치돼 있으나 로그인/`--db-url` 필요.
- **H-2 동반 수정**: 신청 화면 OTP 인증 시 `sessionToken`(30일)을 `customerAuth`에 저장(`PhoneVerifyGate`→`RequestWizard.handleVerified`) — 이게 없으면 접수·본인 견적서 다운로드가 서버 재검증에서 막힌다.
- **P-1 후속(2026-07-11 동일 세션에 이어서 완결)**: ✅ C-2 서버 delete op(`/api/data` `deleteEstimate`, 관리자 전용·연관 결제/방문/알림 동반 삭제 + `ZerosService.deleteEstimate`) · ✅ C-3 `updateEstimate`의 무조건 가산 제거 → `syncCustomerOnStatusChange`(수주성공 전이 시에만 won 통계, 되돌리면 상쇄·멱등) · ✅ H-5 `lib/otp/rateLimit.ts` 인메모리 제한(verify 번호5/10분·IP30, send 번호5/시간·IP20, 429) — 서버리스 인스턴스별 베스트에포트, 완전방어는 공유 저장소(Redis) 후속 · ✅ 월별 차트 현재기준 최근7개월 동적 생성(`PerformanceDashboard.tsx`) · ✅ **KST 날짜 유틸 `lib/utils/date.ts`**(`kstDateStr/kstMonthStr/kstMonthDay/kstToday`) — RightSidebar '오늘 발송'·주간 집계·KanbanBoard 접수일(toISOString 크래시 가드 포함) 적용. **날짜 표기는 신규 코드도 이 유틸을 쓸 것**(`new Date().toISOString().slice(0,10)` 직접 사용 금지 — KST 하루 밀림).
- **여전히 남은 개선(비중대)**: UI 접근성 다건(모달 ESC·포커스트랩, 터치 44px, 이모지 아이콘, reduced-motion 전역, role="alert" 정규식 맹점), 번들 코드스플리팅(관리자+recharts 지연로드), 데이터 계층 캐시(탭 전환 중복 풀스캔), TossPaymentModal 결제행 갱신, NotificationLog 상태 하드코딩 — 상세는 `docs/_worklog/2026-07-11_작업정리.md`.
