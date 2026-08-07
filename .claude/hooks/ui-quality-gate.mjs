// UI 품질 검증 루프 (Stop 훅) — "스킬 호출만 하고 결과 미적용" 구멍을 구조적으로 차단한다.
//
// 동작:
//  - 이번 작업에서 UI(.tsx: app/·components/) 파일이 변경됐는데
//    아직 이 세션의 "검증 통과 마커"가 없으면 → 마감을 BLOCK 하고 체크리스트를 재주입(loop).
//  - 통과 마커는 `--pass` 로만 기록되며, 이때 결정적(grep) 룰을 채점해 위반이 있으면 기록을 거부한다.
//  - 무한 루프 방지: 세션당 BLOCK 3회 초과 시 경고만 내고 통과(사람이 판단).
//
// 모드(플래그 조합):
//   --stop | (무인자)   Stop 훅 — 마커·위반·베이스라인 회귀 검사 후 block 여부 결정
//   --check             채점 결과를 사람이 읽게 출력(기록 안 함). `--all` 동반 시 전 소스 채점
//   --pass              차단 사유 0건일 때만 이 세션 검증 마커 기록(루프 해제)
//   --baseline          전 소스를 스윕해 룰별 위반 수를 `.claude/.gate-baseline.json` 에 스냅샷
//
// 왜 베이스라인인가(§15-5): 변경된 .tsx 만 채점하면 저장소가 깨끗할 때 "검증 불필요"만 나오고
// 기존 접근성 부채는 어떤 마감에서도 검출되지 않는다. 전수 스윕 수치를 동결해 두고
// **늘면 차단, 줄면 항상 통과**로 판정하면 부채를 고정하면서 신규 유입만 막을 수 있다.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const stateDir = join(root, '.claude', 'hooks', '.state');
const baselinePath = join(root, '.claude', '.gate-baseline.json');
const SCAN_DIRS = ['app', 'components'];

const sh = (cmd) => { try { return execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch { return ''; } };

// ---------------------------------------------------------------------------
// 룰 정의 — AGENTS §11-2 가 요구하는 7종 전부.
//
// severity : 변경 파일 채점 등급
//   block      1건이라도 있으면 즉시 마감 차단 (탐지 정확도 높고 결과가 치명적)
//   regression 즉시 차단하지 않고 전수 회귀(베이스라인 초과)일 때만 차단
//   warn       보고만
// guard : 'baseline' 이면 전수 스윕 수치를 베이스라인과 대조해 회귀를 차단한다.
//
// 등급 근거(임의로 낮추지 말 것):
//   R1 기존 차단 등급 유지. 에러를 못 듣는 사용자는 실패를 인지할 수단이 없다.
//   R2·R3 기존 경고 등급 유지 + 베이스라인 감시 추가 — 부채는 동결하고 신규 유입만 막는다.
//   R4·R5 className 덩어리 단위로 판정해 오탐이 낮다. 다만 기존 부채가 12지점 이상이라
//         즉시 차단하면 무관한 마감이 전부 멈춘다 → 회귀분만 차단.
//   R6·R7 문자열 카피 속 기호와 아이콘, 로직상의 숫자 포매팅과 화면 숫자를 grep 으로
//         구분할 수 없다(오탐 위험 중~상) → 경고 전용, 베이스라인 감시 제외.
export const RULES = [
  { id: 'R1', severity: 'block', guard: 'baseline', title: '에러 alert 누락', fix: '에러 표시 div에 role="alert" 또는 aria-live 추가' },
  { id: 'R2', severity: 'warn', guard: 'baseline', title: '본문 금지색(대비 4.5:1 미달)', fix: '본문이면 text-gray(#5B6573) 이상. 장식이면 aria-hidden 표기' },
  { id: 'R3', severity: 'warn', guard: 'baseline', title: '터치 타깃<44px', fix: 'min-w/h 44px 이상 또는 패딩 확대' },
  { id: 'R4', severity: 'regression', guard: 'baseline', title: 'focus-visible 대체 스타일 없음', fix: '같은 className 에 focus-visible:ring/outline 추가' },
  { id: 'R5', severity: 'regression', guard: 'baseline', title: 'reduced-motion 가드 없음', fix: 'animate 유틸리티에 motion-reduce:animate-none 동반' },
  { id: 'R6', severity: 'warn', guard: 'none', title: '이모지 아이콘', fix: 'SVG 아이콘(lucide)으로 교체' },
  { id: 'R7', severity: 'warn', guard: 'none', title: '숫자 tabular-nums 누락', fix: '숫자 표시 요소에 tabular-nums 추가(장식·로직값이면 무시)' },
];
const RULE_BY_ID = Object.fromEntries(RULES.map((r) => [r.id, r]));

const lineOf = (src, index) => src.slice(0, index).split('\n').length;

// className 값을 한 덩어리로 뽑는다. 줄바꿈된 className 에서 focus-visible 이 다음 줄에 있다는
// 이유로 위반 처리하는 오탐(줄 단위 판정의 한계)을 막는 것이 목적이다.
function classNameBlocks(src) {
  const blocks = [];
  for (const m of src.matchAll(/className\s*=\s*/g)) {
    const at = m.index + m[0].length;
    const open = src[at];
    let value = '';
    let end = at;
    if (open === '"' || open === "'") {
      const close = src.indexOf(open, at + 1);
      if (close < 0) continue;
      value = src.slice(at + 1, close);
      end = close;
    } else if (open === '{') {
      let depth = 0;
      for (let j = at; j < src.length; j += 1) {
        if (src[j] === '{') depth += 1;
        else if (src[j] === '}') { depth -= 1; if (depth === 0) { end = j; break; } }
      }
      if (end <= at) continue;
      value = src.slice(at + 1, end);
    } else continue;
    blocks.push({ value, startLine: lineOf(src, m.index), endLine: lineOf(src, end) });
  }
  return blocks;
}

// 이모지 판정 정책: "그림으로 렌더되는 문자"만 잡는다 = Emoji_Presentation 기본값이거나
// 이형 선택자 U+FE0F 가 붙은 경우. 텍스트 표현이 기본인 딩벳(➔ U+2794 · ✓ U+2713)과
// 화살표(→)는 아이콘이 아니라 활자로 쓰이므로 허용한다.
const VS16 = String.fromCharCode(0xfe0f); // 이형 선택자 — 기호를 이모지 그림으로 렌더시킨다
function emojiIcons(text) {
  const chars = [...text];
  const found = [];
  chars.forEach((ch, i) => {
    if (!/\p{Extended_Pictographic}/u.test(ch)) return;
    if (/\p{Emoji_Presentation}/u.test(ch) || chars[i + 1] === VS16) found.push(ch);
  });
  return found;
}

/** 소스 1개를 채점한다. 파일 입출력이 없어 테스트에서 문자열로 직접 검증한다. */
export function lintSource(file, src) {
  const out = [];
  const lines = src.split(/\r?\n/);
  const push = (id, line, detail) => out.push({
    id, file, line,
    rule: `${id} ${RULE_BY_ID[id].title}`,
    severity: RULE_BY_ID[id].severity,
    fix: RULE_BY_ID[id].fix,
    detail: detail || '',
  });

  // --- R1 에러 메시지 announce (파일 단위 판정 유지) ---
  // 탐지 범위(2026-07-30 강화): errorMsg·errorMessage 두 변수명만 잡아 `{error &&`·`{authError &&`
  // 렌더를 놓쳤다 → *error* 를 포함한 임의 식별자를 탐지한다. 기존 두 패턴도 그대로 남긴다(강화 전용).
  const errRender = [/\{\s*errorMsg\s*&&/, /errorMessage\s*&&/, /\{\s*!*\s*[\w$]*[eE]rror[\w$]*\s*&&/];
  const errLine = lines.findIndex((l) => errRender.some((re) => re.test(l)));
  const hasAlert = /role=["']alert["']/.test(src) || /aria-live=/.test(src);
  if (errLine >= 0 && !hasAlert) push('R1', errLine + 1);

  // --- 줄 단위 판정 준비 ---
  const blocks = classNameBlocks(src);
  const blockStartOf = new Map(); // 줄 → 그 줄을 감싸는 className 시작 줄
  blocks.forEach((b) => { for (let n = b.startLine; n <= b.endLine; n += 1) blockStartOf.set(n, b.startLine); });
  // aria-hidden 은 요소 여는 줄에 붙고 색 클래스는 줄바꿈된 className 안쪽에 올 수 있다.
  const decorated = (no) => {
    const own = lines[no - 1] || '';
    const owner = lines[(blockStartOf.get(no) || no) - 1] || '';
    return own.includes('aria-hidden') || owner.includes('aria-hidden');
  };

  lines.forEach((line, i) => {
    const no = i + 1;

    // R2 본문 대비 — 줄 단위 + 헥스 표기 + aria-hidden 예외.
    // 파일 단위 판정은 장식 1곳 때문에 파일 전체를 위반으로 올리고(오탐) 정작 헥스 직접 지정은 놓쳤다.
    // 대상은 "글자색"에 한정한다(테두리·배경·svg fill 의 같은 색은 본문 가독성과 무관).
    if ((/text-gray-light\b/.test(line) || /text-\[#9aa3af/i.test(line) || /color:\s*['"]?#9aa3af/i.test(line)) && !decorated(no))
      push('R2', no);

    // R3 터치 타깃 — 44px 미만 클릭 요소.
    if (/w-[89] h-[89][^"']*cursor-pointer|cursor-pointer[^"']*w-[89] h-[89]/.test(line)) push('R3', no);

    // R6 이모지 아이콘.
    const emoji = emojiIcons(line);
    if (emoji.length > 0) push('R6', no, emoji.join(''));

    // R7 숫자 정렬 — 화면 숫자 포매팅 휴리스틱. className 은 여는 줄에 있는 경우가 많아
    // 자기 줄과 위 2줄까지 tabular-nums 를 찾는다. 로직상의 포매팅도 걸리므로 경고 등급이다.
    if (/\.toLocaleString\(|\.toFixed\(/.test(line)) {
      const window = lines.slice(Math.max(0, i - 2), i + 1).join('\n');
      if (!window.includes('tabular-nums')) push('R7', no);
    }
  });

  // --- className 덩어리 단위 판정(R4·R5) ---
  // 덩어리에 속하지 않는 줄(상수로 뽑아 둔 클래스 문자열 등)도 같은 룰로 본다.
  const units = blocks.map((b) => ({ text: b.value, line: b.startLine }));
  lines.forEach((line, i) => { if (!blockStartOf.has(i + 1)) units.push({ text: line, line: i + 1 }); });
  units.sort((a, b) => a.line - b.line);
  for (const u of units) {
    if (/focus:outline-none/.test(u.text) && !/focus-visible:/.test(u.text)) push('R4', u.line);
    // animate-none 은 그 자체가 정지 지시라 대상이 아니다. 임의값 animate-[...] 과 animate-in 도 본다.
    if (/\banimate-(bounce|pulse|spin|ping|in)\b|\banimate-\[/.test(u.text) && !u.text.includes('motion-reduce:animate-none'))
      push('R5', u.line);
  }

  return out.sort((a, b) => a.line - b.line || a.id.localeCompare(b.id));
}

/** 룰별 위반 수. 정의된 7룰은 위반이 없어도 0 으로 채워 베이스라인 비교에서 누락되지 않게 한다. */
export function countByRule(violations) {
  const counts = Object.fromEntries(RULES.map((r) => [r.id, 0]));
  for (const v of violations) counts[v.id] = (counts[v.id] || 0) + 1;
  return counts;
}

/** 베이스라인 대비 증가분만 회귀로 본다. 줄어드는 방향은 항상 통과. 스냅샷이 없으면 판정 보류. */
export function compareBaseline(counts, baseline) {
  if (!baseline || !baseline.counts) return [];
  const out = [];
  for (const id of Object.keys(counts)) {
    const base = baseline.counts[id] ?? 0;
    if (counts[id] > base) out.push({ id, base, now: counts[id] });
  }
  return out;
}

/** 단일 인자 파싱이던 것을 플래그 조합으로 바꾼다(`--check --all` 등). */
export function parseFlags(argv) {
  const flags = { stop: false, check: false, pass: false, all: false, baseline: false, unknown: [] };
  for (const a of argv) {
    if (a === '--stop') flags.stop = true;
    else if (a === '--check') flags.check = true;
    else if (a === '--pass') flags.pass = true;
    else if (a === '--all') flags.all = true;
    else if (a === '--baseline') flags.baseline = true;
    else flags.unknown.push(a);
  }
  // 모드 플래그가 없으면 Stop 훅(무인자 호출 호환). `--all` 단독은 사람이 돌리는 전수 점검으로 본다.
  if (!flags.check && !flags.pass && !flags.baseline) {
    if (flags.all) flags.check = true;
    else flags.stop = true;
  }
  return flags;
}

// ---------------------------------------------------------------------------
// 파일 수집 · 채점 (I/O)
const isTargetPath = (p) => /^(app|components)\/.+\.tsx$/.test(p);

// 이번 변경분(.tsx) — master 기준 브랜치 diff ∪ 미커밋 변경. app/·components/ 한정.
function changedTsx() {
  const set = new Set();
  const add = (p) => {
    p = p.trim().replace(/^"|"$/g, '');
    if (isTargetPath(p)) set.add(p);
  };
  const base = sh('git merge-base HEAD master').trim();
  if (base) sh(`git diff --name-only ${base} HEAD`).split('\n').filter(Boolean).forEach(add);
  sh('git status --porcelain').split('\n').filter(Boolean).forEach((l) => {
    let p = l.slice(3); if (p.includes(' -> ')) p = p.split(' -> ').pop(); add(p);
  });
  return [...set];
}

// 전 소스(.tsx) — 베이스라인 스냅샷·회귀 판정의 대상.
function allTsx() {
  const out = [];
  const walk = (rel) => {
    const abs = join(root, rel);
    if (!existsSync(abs)) return;
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      const child = `${rel}/${e.name}`;
      if (e.isDirectory()) walk(child);
      else if (e.name.endsWith('.tsx')) out.push(child);
    }
  };
  SCAN_DIRS.forEach(walk);
  return out.sort();
}

function lintFiles(files) {
  const out = [];
  for (const f of files) {
    let src = '';
    try { src = readFileSync(join(root, f), 'utf8'); } catch { continue; }
    out.push(...lintSource(f, src));
  }
  return out;
}

function readBaseline() {
  try { return JSON.parse(readFileSync(baselinePath, 'utf8')); } catch { return null; }
}

function sweep() {
  const files = allTsx();
  return { files, counts: countByRule(lintFiles(files)) };
}

/** 베이스라인 감시 대상(guard: 'baseline') 룰의 회귀만 차단 사유로 삼는다. */
function guardedRegressions(counts, baseline) {
  return compareBaseline(counts, baseline).filter((r) => RULE_BY_ID[r.id]?.guard === 'baseline');
}

const mark = (severity) => (severity === 'block' ? '[차단]' : severity === 'regression' ? '[회귀감시]' : '[경고]');
const readStdin = () => { try { return JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { return {}; } };
const ensureState = () => { if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true }); };

function printViolations(violations) {
  for (const v of violations)
    process.stdout.write(`${mark(v.severity)} ${v.rule} — ${v.file}:${v.line}${v.detail ? ` (${v.detail})` : ''}\n   → ${v.fix}\n`);
}

function printRegressions(regressed) {
  for (const r of regressed)
    process.stdout.write(`[차단] ${r.id} ${RULE_BY_ID[r.id].title} 전수 ${r.base} → ${r.now} 건 증가 — ${RULE_BY_ID[r.id].fix}\n`);
}

// ---------------------------------------------------------------------------
function runBaseline() {
  const { files, counts } = sweep();
  const snapshot = {
    generatedAt: new Date().toISOString(),
    commit: sh('git rev-parse --short HEAD').trim(),
    files: files.length,
    counts,
  };
  writeFileSync(baselinePath, `${JSON.stringify(snapshot, null, 2)}\n`);
  process.stdout.write(`베이스라인 기록: ${files.length}개 파일\n`);
  process.stdout.write(`${RULES.map((r) => `${r.id} ${counts[r.id]}`).join(' · ')}\n`);
  process.stdout.write('이후 --check 는 이 수치를 넘으면 차단합니다(줄이는 방향은 항상 통과).\n');
}

function runReport(flags) {
  const files = flags.all ? allTsx() : changedTsx();
  const violations = lintFiles(files);
  const blocking = violations.filter((v) => v.severity === 'block');
  const { counts } = sweep();
  const baseline = readBaseline();
  const regressed = guardedRegressions(counts, baseline);

  if (files.length === 0) process.stdout.write('변경된 UI(.tsx) 없음 — 전수 회귀만 판정합니다.\n');
  else {
    process.stdout.write(`검사 대상 ${files.length}개${flags.all ? '(전수)' : ''}: ${files.join(', ')}\n`);
    if (violations.length === 0) process.stdout.write('위반 0건.\n');
    else printViolations(violations);
  }

  process.stdout.write(`\n전수 스윕: ${RULES.map((r) => `${r.id} ${counts[r.id]}`).join(' · ')}\n`);
  if (!baseline) process.stdout.write('베이스라인 없음 — `--baseline` 으로 스냅샷을 먼저 기록하세요(회귀 판정 보류).\n');
  else if (regressed.length === 0) process.stdout.write(`베이스라인(${baseline.generatedAt}) 대비 회귀 없음.\n`);
  else printRegressions(regressed);

  if (flags.pass) {
    if (blocking.length > 0 || regressed.length > 0) {
      process.stdout.write('\n차단 사유가 남아 있어 마커를 기록하지 않았습니다. 먼저 수정하세요.\n');
      process.exit(2);
    }
    ensureState();
    writeFileSync(join(stateDir, 'uiux-pass'), String(Date.now()));
    process.stdout.write('\n검증 통과 — 마커 기록. 마감 진행 가능.\n');
  }
  process.exit(0);
}

function runStopHook() {
  const input = readStdin();
  const sessionId = input.session_id || 'nosession';
  const files = changedTsx();
  if (files.length === 0) process.exit(0); // UI 변경 없음 → 통과

  ensureState();
  const passMarker = join(stateDir, 'uiux-pass');
  const blockMarker = join(stateDir, `uiux-blocks-${sessionId}`);

  const violations = lintFiles(files);
  const blocking = violations.filter((v) => v.severity === 'block');
  const regressed = guardedRegressions(sweep().counts, readBaseline());
  if (existsSync(passMarker) && blocking.length === 0 && regressed.length === 0) process.exit(0);

  // 무한 루프 방지 — 세션당 3회 초과 차단 시 경고만 내고 통과.
  let n = 0;
  if (existsSync(blockMarker)) { try { n = parseInt(readFileSync(blockMarker, 'utf8'), 10) || 0; } catch { n = 0; } }
  if (n >= 3) {
    process.stdout.write(JSON.stringify({ systemMessage: 'UI 품질 게이트: 검증 미통과지만 3회 초과로 통과시킵니다. 수동 점검 권장.' }));
    process.exit(0);
  }
  writeFileSync(blockMarker, String(n + 1));

  // 차단 사유(회귀·block)를 먼저 세우고 경고를 뒤에 둔다 — 무엇을 고쳐야 풀리는지가 첫 줄에 보이게.
  const detail = [
    ...regressed.map((r) => `  [차단] ${r.id} ${RULE_BY_ID[r.id].title} 전수 ${r.base} → ${r.now} 건 증가 → ${RULE_BY_ID[r.id].fix}`),
    ...violations.filter((v) => v.severity === 'block').map((v) => `  [차단] ${v.rule} (${v.file}:${v.line}) → ${v.fix}`),
    ...violations.filter((v) => v.severity !== 'block').map((v) => `  ${mark(v.severity)} ${v.rule} (${v.file}:${v.line}) → ${v.fix}`),
  ];

  const reason = [
    'UI 품질 게이트(검증 루프): UI(.tsx)를 변경했는데 기준 검증 기록이 없거나 차단 사유가 남아 있습니다.',
    '아래를 점검·수정한 뒤 마감하세요(스킬 호출만으로는 통과 불가):',
    detail.length > 0 ? detail.join('\n') : '  (자동 룰 위반은 없으나 검증 기록이 없음)',
    '',
    '기준: design-system/zeros/MASTER.md + AGENTS.md §11-2(role=alert · 대비 4.5:1 · 터치 44px · focus-visible · reduced-motion · no-emoji · tabular-nums).',
    '점검: `node .claude/hooks/ui-quality-gate.mjs --check` (전수: `--check --all`)',
    '통과 기록(차단 사유 0건일 때만): `node .claude/hooks/ui-quality-gate.mjs --pass`',
  ].join('\n');

  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
}

// 테스트가 룰 함수만 import 할 수 있도록, CLI 는 직접 실행됐을 때만 돈다.
const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.unknown.length > 0) process.stdout.write(`알 수 없는 플래그: ${flags.unknown.join(' ')}\n`);
  if (flags.baseline) { runBaseline(); process.exit(0); }
  if (flags.check || flags.pass) runReport(flags);
  else runStopHook();
}
