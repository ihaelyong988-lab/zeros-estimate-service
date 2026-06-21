// UserPromptSubmit 훅 — 매 지시마다 '지시 항목 전수 처리' 체크리스트를 강제 재주입한다.
// 목적: 다항목/이미지 지시에서 일부 항목을 라벨로 단정해 건너뛰는 누락(2026-06-21 FOOTER 소개란)을 방지.
// 짧게 유지(매 턴 토큰 비용). 검증 자체는 모델이 이 규칙을 따라 수행한다.
const reminder = [
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
