<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

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
  **빌드 확인 → (master면) 새 브랜치 커밋 → 푸시 → master 머지 → master 푸시(=호스팅 자동 배포)**.
- 배포 메커니즘: 로컬 vercel/deploy 스크립트 없음 → **origin master 푸시 시 GitHub 연동 호스팅 자동 배포**. 원격: `ihaelyong988-lab/zeros-estimate-service`.
- 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## 7. 오늘 확정된 구조 (2026-06-20)
- **견적 작업 FLOW**: 공종 상세에서 제거 → **견적 검토 랜딩 히어로 박스**에만 1곳.
- **공종 상세 히어로**: 좌=검토 항목(문제 도출)+"최대 N% 견적 차이" / 우=ZEROS Agent AI **견적 검증**+"최적합 견적 확정". **전 공종 공통·데이터 연동**(`tradeReviewItems`, `metrics.bubbleRate`).
- **주요 견적 키워드 밴드**: 공종 상세 최상단, 큰 키워드, 공종별 `tradeKeywords`로 교체.
- **우측 결과 패널**: 견적 검토 진입 시 숨김 → 우측 상단 "검토" 엣지 탭(음영 없음)으로 펼침, 헤더 `›`로 접기.
- 일자별 상세 기록: `docs/_worklog/2026-06-20_작업정리.md`.
