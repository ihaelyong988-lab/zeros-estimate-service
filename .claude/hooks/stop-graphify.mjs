// Stop 훅 — 응답을 마칠 때 코드(.ts/.tsx)가 변경돼 있으면 그래프 최신화를 1회 안내한다.
// CLAUDE.md 규칙("코드 수정 후 graphify update .")을 강제 실행이 아닌 "안내"로 구현.
// 세션당 1회만 알리도록 session_id 마커로 중복 제거(Stop 은 매 턴 발생하므로).
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

// Stop 훅은 stdin 으로 JSON(session_id 포함)을 받는다.
let sessionId = '';
try {
  const input = readFileSync(0, 'utf8');
  sessionId = (JSON.parse(input || '{}').session_id) || '';
} catch { /* stdin 없음 → 빈 값 */ }

try {
  const status = execSync('git status --porcelain', { cwd: root, encoding: 'utf8' });
  const codeChanged = status.split('\n').filter(Boolean).some((line) => {
    let p = line.slice(3);                       // 'XY ' 상태 플래그 제거
    if (p.includes(' -> ')) p = p.split(' -> ').pop(); // 이름 변경(R) 처리
    p = p.replace(/^"|"$/g, '');                 // 따옴표 감싼 경로 처리
    return /^(app|components|lib|types)\/.+\.(ts|tsx)$/.test(p);
  });
  if (!codeChanged) process.exit(0);

  const stateDir = join(root, '.claude', 'hooks', '.state');
  const marker = join(stateDir, 'graphify-reminded');
  let last = '';
  if (existsSync(marker)) { try { last = readFileSync(marker, 'utf8').trim(); } catch {} }
  if (sessionId && last === sessionId) process.exit(0); // 이미 이 세션에서 안내함

  if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
  if (sessionId) writeFileSync(marker, sessionId);

  process.stdout.write(JSON.stringify({
    systemMessage: '📊 코드(.ts/.tsx)가 변경되었습니다. 그래프 최신화 권장: `graphify update .` (AST 전용·무비용)',
  }));
} catch { /* git 없거나 오류 → 조용히 통과 */ }
