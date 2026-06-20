# ZEROS 에이전트 협업 운영 가이드

본 폴더는 ZEROS 사전진단 웹앱 개발 프로젝트를 순차적이고 안정적으로 이끌어가기 위해 정의된 역할 지침서 및 메타 문서들을 보관합니다. 

단일 AI 환경에서도 아래 4가지 시니어 핵심 페르소나로 완벽히 빙의 및 전환하여 순차 파이프라인을 작동시킵니다.

## 👥 에이전트 역할 구성
1. **00_오케스트레이터 (PM)**: 전체 로드맵 조율, 의사결정 기록, 각 단계 검증 게이트 통과 관리.
2. **01_프론트엔드/디자인 (Frontend)**: AppShell 3-Pane 레이아웃, CSS 변수 디자인 토큰 엄수, 5단계 위저드, 칸반 보드 및 사용성(4-State, 접근성) 책임.
3. **02_백엔드/DB (Backend)**: Supabase PostgreSQL 스키마 및 RLS, 30건 이상의 분석용 시드 데이터 구축, 로컬 Mock client 및 실적 분석 수식 책임.
4. **03_QA/배포 (QA)**: 11단계 비즈니스 통합 시나리오 수동/자동 테스트 검증, 모바일 가로스크롤 및 한 손 터치 품질 확보, 빌드 에러 0건 유지 및 배포 패키징 책임.

## ⚙️ 협업 파이프라인 수칙
- **상태 동기화**: 모든 역할은 새로운 PHASE를 시작하기 전에 반드시 `docs/00_orchestration/state.md`와 `docs/00_orchestration/handoff.md`를 읽어 이전 변경사항과 이월 사항을 확인해야 합니다.
- **게이트 승인**: 각 PHASE가 끝날 때마다 담당 역할은 `docs/03_qa_deploy/gate-checks.md`에 자체검증 결과를 표로 작성하고 오케스트레이터의 승인을 받습니다.
- **결정 로그**: 사소한 추측성 코딩을 배제하고, 합리적 기본값(Rational Defaults)으로 설정된 핵심 비즈니스 로직은 `docs/00_orchestration/decisions.md`에 지속 기록합니다.

---

## 🗂 문서 카테고리 구조 (Agent 작업형 분류)

문서/프로세스 자료는 에이전트 작업 역할 기준으로 아래와 같이 분류·보관합니다.

```
docs/
├── README.md                       # 본 인덱스 (협업 가이드 + 카테고리 맵)
├── 00_orchestration/               # PM·오케스트레이션 (조율/상태/이월/의사결정)
│   ├── orchestrator.md             # PM 역할 정의서
│   ├── state.md                    # 현재 진행 PHASE 및 다음 행동
│   ├── handoff.md                  # 단계 간 이월 사항
│   └── decisions.md                # 합리적 기본값 결정 로그
├── 01_frontend_design/             # 프론트엔드·디자인
│   └── frontend_design.md          # 프론트/디자인 역할 정의서
├── 02_backend_db/                  # 백엔드·DB
│   └── backend_db.md               # 백엔드/DB 역할 정의서
├── 03_qa_deploy/                   # QA·배포 (검증/게이트)
│   ├── qa_deploy.md                # QA/배포 역할 정의서
│   └── gate-checks.md              # PHASE별 자체검증 게이트 로그
├── _worklog/                       # 일자별 작업 기록 (날짜 prefix)
│   ├── 2026-06-20_작업정리.md
│   └── mobile-landing-2026-06-09.md
└── assets/                         # 디자인 원본 (편집용 PPTX 등)
```

> 보조 스크립트는 루트 `scripts/`(open_chrome.ps1, open-browser.bat), DB 셋업 SQL은 루트 `supabase/`에 있습니다.
> 참고: 소스 코드(`app/`, `components/`, `lib/`, `types/`)와 루트 설정 파일(`package.json`, `next.config.ts`, `CLAUDE.md`, `AGENTS.md` 등)은 Next.js 빌드 규약상 위치를 옮기지 않습니다.
