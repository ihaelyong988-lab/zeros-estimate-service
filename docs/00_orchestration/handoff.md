# 역할 간 인계 메모 (Handoff)

## 🔄 최신 이월 (2026-06-21, PHASE M 이후)
- **[완료]** `.claude` 하네스 **git 공유 전환 완료**(2026-06-21, `b319ae7`): 훅·커맨드·공유 `settings.json` 추적, 개인 `settings.local.json`만 제외.
- **[보류]** ②번 **DB·AI Agent 견적 자동화**(단가 마스터부터) — 사용자 지시로 보류. 재개 시: 단가 마스터 엑셀 → Supabase 실연동 → Claude API 분석/검증.
- **master 배포 완료**(`22c9e94`): 폴더 하네스 정리 + 고객 UI(사이드바·사업소개·CAPEX칩). 상세 `docs/_worklog/2026-06-21_작업정리.md`.
- **경로 변동 주의:** SQL=`supabase/`, 스크립트=`scripts/`, 디자인원본=`docs/assets/`, 날짜로그=`docs/_worklog/`.
- **사이드바 디자인 기준:** 색막대 금지·액센트 **steel 단일**·항목 보통굵기(활성만 강조). 같은 톤 유지할 것.
- **하네스(.claude, git 공유됨):** SessionStart/Stop/UserPromptSubmit 훅·슬래시커맨드 4종이 커밋됨 → 다른 머신/도구에서도 동작. 개인 권한(`settings.local.json`)만 로컬.

## 🔄 PHASE 0 ➔ PHASE A 인계 사항
- **보내는 역할:** 00_오케스트레이터 (PM)
- **받는 역할:** 01_프론트엔드/디자인 (Frontend Design)
- **이전 작업 요약:**
  - Next.js 뼈대 프로젝트가 `zeros-estimate-service` 경로에 성공적으로 부트스트랩 완료되었습니다.
  - `/agents` 및 `/workspace` 에이전트 협업 폴더 구조 및 기본 정의 메타 문서가 무결하게 생성되었습니다.
- **다음 역할 미션:**
  - Next.js의 기본 보일러플레이트 중 불필요한 홈 스타일을 제거하고, `app/globals.css`를 ZEROS 디자인 시스템 CSS 변수로 오버라이드 해주세요.
  - 반응형 AppShell, LeftSidebar, RightSidebar 및 TopHeader를 구현하여 데스크탑 화면에서 깔끔한 3-Pane 구조가 정위치에 렌더링되도록 뼈대를 올려야 합니다.
