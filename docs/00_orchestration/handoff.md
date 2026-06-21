# 역할 간 인계 메모 (Handoff)

## 🔄 최신 이월 (2026-06-21, PHASE M 이후)
- **[보류 · 다시 물어볼 것]** `.claude` 하네스(훅·커맨드·settings)를 **git 공유로 전환할지** — 사용자가 "나중에 다시 물어봐줘"라고 함(2026-06-21). 다음 세션 시작 시 재확인할 것.
- **master 배포 완료**(`22c9e94`): 폴더 하네스 정리 + 고객 UI(사이드바·사업소개·CAPEX칩). 상세 `docs/_worklog/2026-06-21_작업정리.md`.
- **경로 변동 주의:** SQL=`supabase/`, 스크립트=`scripts/`, 디자인원본=`docs/assets/`, 날짜로그=`docs/_worklog/`.
- **사이드바 디자인 기준:** 색막대 금지·액센트 **steel 단일**·항목 보통굵기(활성만 강조). 같은 톤 유지할 것.
- **로컬 하네스(.claude, git 제외):** SessionStart/Stop 훅·슬래시커맨드 4종. 다른 머신엔 없음 → 공유하려면 별도 조치.

## 🔄 PHASE 0 ➔ PHASE A 인계 사항
- **보내는 역할:** 00_오케스트레이터 (PM)
- **받는 역할:** 01_프론트엔드/디자인 (Frontend Design)
- **이전 작업 요약:**
  - Next.js 뼈대 프로젝트가 `zeros-estimate-service` 경로에 성공적으로 부트스트랩 완료되었습니다.
  - `/agents` 및 `/workspace` 에이전트 협업 폴더 구조 및 기본 정의 메타 문서가 무결하게 생성되었습니다.
- **다음 역할 미션:**
  - Next.js의 기본 보일러플레이트 중 불필요한 홈 스타일을 제거하고, `app/globals.css`를 ZEROS 디자인 시스템 CSS 변수로 오버라이드 해주세요.
  - 반응형 AppShell, LeftSidebar, RightSidebar 및 TopHeader를 구현하여 데스크탑 화면에서 깔끔한 3-Pane 구조가 정위치에 렌더링되도록 뼈대를 올려야 합니다.
