// UserPromptSubmit 훅 — 매 지시마다 작업 원칙을 강제 재주입한다.
// (1) §0 스킬 우선 적용: 어떤 작업이든 착수 전 적용 가능한 스킬을 먼저 확인·실행(2026-06-27 사용자 상시 지시).
// (2) §1-A 지시 항목 전수 처리: 다항목/이미지 지시에서 라벨로 단정해 건너뛰는 누락 방지(2026-06-21 FOOTER 소개란).
// 짧게 유지(매 턴 토큰 비용). 실제 수행은 모델이 이 규칙을 따라 진행한다.
const reminder = [
  '[스킬 우선 적용 — AGENTS.md §0 · 필수]',
  '· 작업 종류 불문(프런트·백엔드·업무문서), 착수 전 **적용 가능한 스킬을 먼저 확인**하고 해당되면 **무조건 호출 후** 작업. "수동으로 하면 된다"며 건너뛰지 말 것.',
  '·   - UI/프런트=ui-ux-pro-max·frontend-design / 엑셀 견적서·보고서=xlsx·excel-report / PPT 제안·보고=pptx(+도메인: ve-report-generator·dc-mech-proposal-ppt 등) / 문서=docx·pdf.',
  '',
  '[작업 원칙 자동 점검 — AGENTS.md §1-A]',
  '· 이미지·주석·다항목 지시면: 표시된 **모든 항목을 번호로 전수 나열**하고 시작. 라벨처럼 보여도 임의 제외 금지(애매하면 먼저 확인).',
  '· 완료 선언 전, 번호별로 화면/코드 검증해 "①완료 ②완료…"로 보고.',
].join('\n');

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'UserPromptSubmit',
    additionalContext: reminder,
  },
}));
