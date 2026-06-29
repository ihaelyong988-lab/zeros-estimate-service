// UI 품질 검증 루프 (Stop 훅) — "스킬 호출만 하고 결과 미적용" 구멍을 구조적으로 차단한다.
//
// 동작:
//  - 이번 작업에서 UI(.tsx: app/·components/) 파일이 변경됐는데
//    아직 이 세션의 "검증 통과 마커"가 없으면 → 마감을 BLOCK 하고 체크리스트를 재주입(loop).
//  - 통과 마커는 `node .claude/hooks/ui-quality-gate.mjs --pass` 로만 기록되며,
//    이때 결정적(grep) 룰을 채점해 위반이 있으면 기록을 거부한다.
//  - 무한 루프 방지: 세션당 BLOCK 3회 초과 시 경고만 내고 통과(사람이 판단).
//
// 모드:
//   (인자 없음)  Stop 훅 — 마커/위반 검사 후 block 여부 결정
//   --check      변경 .tsx 채점 결과를 사람이 읽게 출력(기록 안 함)
//   --pass       채점 통과 시에만 이 세션 검증 마커 기록(루프 해제)
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const stateDir = join(root, '.claude', 'hooks', '.state');
const mode = process.argv[2] || '';

const sh = (cmd) => { try { return execSync(cmd, { cwd: root, encoding: 'utf8' }); } catch { return ''; } };

// 이번 변경분(.tsx) 수집 — master 기준 브랜치 diff ∪ 미커밋 변경. app/·components/ 한정.
function changedTsx() {
  const set = new Set();
  const add = (p) => {
    p = p.trim().replace(/^"|"$/g, '');
    if (/^(app|components)\/.+\.tsx$/.test(p)) set.add(p);
  };
  let base = sh('git merge-base HEAD master').trim();
  if (base) sh(`git diff --name-only ${base} HEAD`).split('\n').filter(Boolean).forEach(add);
  sh('git status --porcelain').split('\n').filter(Boolean).forEach((l) => {
    let p = l.slice(3); if (p.includes(' -> ')) p = p.split(' -> ').pop(); add(p);
  });
  return [...set];
}

// 결정적 채점 룰. block=true 는 마감 차단, false 는 경고(권고).
//  R1 에러 메시지 announce 누락(High, 저오탐) — block
//  R2 본문 금지색 text-gray-light(AGENTS §10) — 경고
//  R3 작은 터치 타깃 w-8/9 h-8/9 + cursor-pointer(44px 미만) — 경고
function lint(files) {
  const out = [];
  for (const f of files) {
    let src = '';
    try { src = readFileSync(join(root, f), 'utf8'); } catch { continue; }
    const hasErrRender = /\{\s*errorMsg\s*&&/.test(src) || /errorMessage\s*&&/.test(src);
    const hasAlert = /role=["']alert["']/.test(src) || /aria-live=/.test(src);
    if (hasErrRender && !hasAlert)
      out.push({ file: f, block: true, rule: 'R1 에러 alert 누락', fix: '에러 표시 div에 role="alert" 또는 aria-live 추가' });
    if (/text-gray-light/.test(src))
      out.push({ file: f, block: false, rule: 'R2 본문 금지색 text-gray-light', fix: '본문이면 text-gray 이상(대비 4.5:1). 장식이면 무시' });
    if (/w-[89] h-[89][^"']*cursor-pointer|cursor-pointer[^"']*w-[89] h-[89]/.test(src))
      out.push({ file: f, block: false, rule: 'R3 터치 타깃<44px', fix: 'min-w/h 44px 이상 또는 패딩 확대' });
  }
  return out;
}

function readStdin() { try { return JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { return {}; } }
function ensureState() { if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true }); }

// ---- --check / --pass (사람/에이전트가 직접 호출) ----
if (mode === '--check' || mode === '--pass') {
  const files = changedTsx();
  const v = lint(files);
  const blocking = v.filter((x) => x.block);
  if (files.length === 0) { process.stdout.write('변경된 UI(.tsx) 없음 — 검증 불필요.\n'); process.exit(0); }
  process.stdout.write(`검사 대상 ${files.length}개: ${files.join(', ')}\n`);
  if (v.length === 0) process.stdout.write('위반 0건.\n');
  else v.forEach((x) => process.stdout.write(`${x.block ? '❌' : '⚠️'} ${x.rule} — ${x.file}\n   → ${x.fix}\n`));
  if (mode === '--pass') {
    if (blocking.length > 0) { process.stdout.write('\n차단 룰 위반 — 마커 미기록. 먼저 수정하세요.\n'); process.exit(2); }
    ensureState(); writeFileSync(join(stateDir, 'uiux-pass'), String(Date.now()));
    process.stdout.write('\n검증 통과 — 마커 기록. 마감 진행 가능.\n');
  }
  process.exit(0);
}

// ---- Stop 훅 모드 ----
const input = readStdin();
const sessionId = input.session_id || 'nosession';
const files = changedTsx();
if (files.length === 0) process.exit(0); // UI 변경 없음 → 통과

ensureState();
const passMarker = join(stateDir, 'uiux-pass');
const blockMarker = join(stateDir, `uiux-blocks-${sessionId}`);

// 통과 마커가 이번 변경 이후 기록됐는지: 단순화 — 마커 존재 + 차단 룰 0건이면 통과로 간주.
const violations = lint(files);
const blocking = violations.filter((x) => x.block);
if (existsSync(passMarker) && blocking.length === 0) process.exit(0);

// 무한 루프 방지 — 세션당 3회 초과 차단 시 경고만 내고 통과.
let n = 0; if (existsSync(blockMarker)) { try { n = parseInt(readFileSync(blockMarker, 'utf8'), 10) || 0; } catch {} }
if (n >= 3) {
  process.stdout.write(JSON.stringify({ systemMessage: '⚠️ UI 품질 게이트: 검증 미통과지만 3회 초과로 통과시킵니다. 수동 점검 권장.' }));
  process.exit(0);
}
writeFileSync(blockMarker, String(n + 1));

const lines = violations.length
  ? violations.map((x) => `  ${x.block ? '❌' : '⚠️'} ${x.rule} (${x.file}) → ${x.fix}`).join('\n')
  : '  (자동 룰 위반은 없으나 검증 기록이 없음)';

const reason = [
  'UI 품질 게이트(검증 루프): UI(.tsx)를 변경했는데 ui-ux-pro-max 기준 검증 기록이 없습니다.',
  '아래를 점검·수정한 뒤 마감하세요(스킬 호출만으로는 통과 불가):',
  lines,
  '',
  '기준: design-system/zeros/MASTER.md + AGENTS.md §10(대비 4.5:1·터치 44px·role=alert·focus-visible·tabular-nums).',
  '점검: `node .claude/hooks/ui-quality-gate.mjs --check`',
  '통과 기록(차단 룰 0건일 때만): `node .claude/hooks/ui-quality-gate.mjs --pass`',
].join('\n');

process.stdout.write(JSON.stringify({ decision: 'block', reason }));
