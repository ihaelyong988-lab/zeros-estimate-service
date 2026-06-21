// SessionStart 훅 — 새 세션마다 직전 작업 상태를 자동 주입한다.
// 출처: docs/00_orchestration/state.md (현재 단계 + 다음 할 일) + docs/_worklog 최신본.
// 어떤 일이 있어도 세션을 깨지 않도록 전부 try/catch로 감싼다.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const blocks = [];

// "## 헤더" 로 시작하는 섹션 하나를 다음 "## " 직전까지 잘라낸다.
function section(md, marker) {
  const i = md.indexOf(marker);
  if (i < 0) return '';
  const rest = md.slice(i + marker.length);
  const next = rest.search(/\n##\s/);
  return (marker + (next < 0 ? rest : rest.slice(0, next))).trim();
}

try {
  const statePath = join(root, 'docs', '00_orchestration', 'state.md');
  if (existsSync(statePath)) {
    const md = readFileSync(statePath, 'utf8');
    const cur = section(md, '## 📌 현재 단계');
    const next = section(md, '## 📝 다음 이어서 할 일');
    if (cur) blocks.push(cur);
    if (next) blocks.push(next);
  }
} catch { /* state.md 없거나 파싱 실패 → 무시 */ }

try {
  const wlDir = join(root, 'docs', '_worklog');
  if (existsSync(wlDir)) {
    // 파일명 어디에 있든 YYYY-MM-DD 를 정렬 키로. 없으면 빈 문자열(가장 오래된 취급).
    const dateKey = (f) => (f.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? '');
    const files = readdirSync(wlDir)
      .filter((f) => f.endsWith('.md'))
      .sort((a, b) => (dateKey(a) < dateKey(b) ? -1 : dateKey(a) > dateKey(b) ? 1 : a.localeCompare(b)));
    if (files.length) blocks.push('## 🗒 최신 worklog\n- `docs/_worklog/' + files[files.length - 1] + '`');
  }
} catch { /* worklog 없음 → 무시 */ }

if (blocks.length) {
  const context = [
    '# 🔄 세션 연속성 — 직전 작업 상태 (자동 주입)',
    '아래는 `docs/00_orchestration/state.md` 기준 직전 진행 상황입니다.',
    '"이어서", "계속", "다음" 류 지시가 오면 이 맥락에 바로 연결하세요. 새 세션이어도 어디까지 했는지 다시 묻지 않습니다.',
    '',
    blocks.join('\n\n'),
  ].join('\n');

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: context,
    },
  }));
}
