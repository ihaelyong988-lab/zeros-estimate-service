// 성장 게이트 (Stop 훅) — "기록 없는 마감"을 구조적으로 차단한다. 반복금지 헌법 제1조(한 번 = 영구)의 기계 강제 장치.
//
// 원리: 오늘 커밋(=산출물이 실제로 나감)이 존재하는데, 기록 파일(워크로그·결정로그·CONVENTIONS·state)이
//       오늘 갱신(커밋 포함 또는 파일 mtime)되지 않았으면 → 마감을 BLOCK 하고 기록을 요구한다.
// 저노이즈 설계: 오늘 커밋이 없으면 어떤 턴도 차단하지 않는다. 비-git 폴더는 항상 통과.
//               세션당 차단 2회 초과 시 경고만 내고 통과(사람 판단).
//
// 모드: (인자 없음)=Stop 훅 / --check=점검 결과 출력(기록·차단 없음)
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const stateDir = join(dirname(fileURLToPath(import.meta.url)), '.state');
const mode = process.argv[2] || '';
const sh = (cmd) => { try { return execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; } };

// 기록으로 인정하는 경로 — 전 프로젝트 공통(존재하는 것만 검사)
const RECORD_PATHS = ['AGENTS.md', 'docs/CONVENTIONS.md', 'docs/WORKFLOWS.md', 'docs/00_orchestration/state.md'];
const RECORD_DIRS = ['docs/_worklog'];

function committedToday() {
  const out = sh('git log --since=midnight --name-only --pretty=format:');
  return out.split('\n').map((s) => s.trim().replace(/\\/g, '/')).filter(Boolean);
}
const isRecordPath = (p) => RECORD_PATHS.includes(p) || RECORD_DIRS.some((d) => p.startsWith(d + '/'));
function mtimeToday(abs) {
  try {
    const m = statSync(abs).mtime, now = new Date();
    return m.getFullYear() === now.getFullYear() && m.getMonth() === now.getMonth() && m.getDate() === now.getDate();
  } catch { return false; }
}
function recordUpdatedToday() {
  for (const p of RECORD_PATHS) if (mtimeToday(join(root, p))) return p;
  for (const d of RECORD_DIRS) {
    const abs = join(root, d);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) if (mtimeToday(join(abs, f))) return `${d}/${f}`;
  }
  return null;
}

const commits = committedToday();
const shipped = commits.length > 0;
const recordedInCommit = commits.some(isRecordPath);
const recordedOnDisk = recordUpdatedToday();

if (mode === '--check') {
  process.stdout.write(`오늘 커밋 파일: ${commits.length}개${shipped ? '' : ' (마감 없음 → 게이트 비활성)'}\n`);
  if (shipped) process.stdout.write(recordedInCommit || recordedOnDisk
    ? `기록 확인: ${recordedInCommit ? '커밋에 기록 포함' : recordedOnDisk} → 통과\n`
    : '→ 기록 없음: 워크로그/결정로그/CONVENTIONS 갱신 필요(마감 시 차단됨)\n');
  process.exit(0);
}

// ---- Stop 훅 모드 ----
if (!shipped || recordedInCommit || recordedOnDisk) process.exit(0);

let input = {}; try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
const sessionId = input.session_id || 'nosession';
if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
const blockMarker = join(stateDir, `growth-blocks-${sessionId}`);
let n = 0; if (existsSync(blockMarker)) { try { n = parseInt(readFileSync(blockMarker, 'utf8'), 10) || 0; } catch {} }
if (n >= 2) {
  process.stdout.write(JSON.stringify({ systemMessage: '⚠️ 성장 게이트: 기록 미확인이지만 2회 초과로 통과시킵니다. 워크로그/결정로그 수동 기입 권장.' }));
  process.exit(0);
}
writeFileSync(blockMarker, String(n + 1));
process.stdout.write(JSON.stringify({
  decision: 'block',
  reason: [
    '성장 게이트(작업 후 자동 업데이트): 오늘 커밋된 산출물이 있는데 작업 기록이 갱신되지 않았습니다.',
    '반복금지 헌법 제1조(한 번 = 영구) — 아래 중 해당 위치에 이번 작업·지시·교정을 기록한 뒤 마감하세요:',
    '  · 일자별 워크로그: docs/_worklog/<오늘날짜>_작업정리.md (없는 프로젝트는 생략)',
    '  · 결정 로그: AGENTS.md §9 append 또는 docs/CONVENTIONS.md 규칙 1줄',
    '  · 상태: docs/00_orchestration/state.md "최신 반영·다음 할 일" (있는 프로젝트만)',
    '기록 후 점검: growth-gate.mjs --check',
  ].join('\n'),
}));
