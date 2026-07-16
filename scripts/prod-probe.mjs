// 라이브(프로덕션) 필수 환경 프로브 — 마감처리 배포 후 검증 단계 (AGENTS.md §13)
// 사용: node scripts/prod-probe.mjs [baseUrl] [--strict]
//  - baseUrl 생략 시 https://zerospipe.co.kr
//  - 기본은 보고만(exit 0), --strict 면 WARN/FAIL 1건이라도 있으면 exit 1
// 판정 근거:
//  - GET  /api/otp/status      → enabled:true = SOLAPI 3종 등록(문자 인증 활성) / false = 테스트 모드
//  - POST /api/admin/login(오답) → 401 = ZEROS_ADMIN_PASSWORD 등록됨 / 503 = 미설정(로그인 불가)

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const base = (args.find((a) => !a.startsWith('--')) || 'https://zerospipe.co.kr').replace(/\/$/, '');

const results = [];
const record = (level, name, detail) => {
  results.push({ level, name, detail });
  console.log(`[${level}] ${name} — ${detail}`);
};

const fetchSafe = async (url, init) => {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(20000) });
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
};

// ① 사이트 응답
{
  const res = await fetchSafe(`${base}/`);
  if (res.error) record('FAIL', '사이트 응답', `요청 실패: ${res.error}`);
  else if (res.status === 200) record('PASS', '사이트 응답', `GET / → 200`);
  else record('FAIL', '사이트 응답', `GET / → ${res.status}`);
}

// ② OTP 문자 인증(SOLAPI 키)
{
  const res = await fetchSafe(`${base}/api/otp/status`);
  if (res.error || res.status !== 200) {
    record('FAIL', 'OTP 상태 API', res.error ? `요청 실패: ${res.error}` : `status ${res.status}`);
  } else {
    const body = await res.json().catch(() => null);
    if (body?.enabled === true) record('PASS', '휴대폰 인증 문자', 'SOLAPI 등록됨 — 실제 발송 활성');
    else record('WARN', '휴대폰 인증 문자', '테스트 모드 — SOLAPI_API_KEY/SECRET/SENDER 미등록(게이트 생략 중)');
  }
}

// ③ 관리자 로그인 env — 일부러 틀린 비밀번호로 프로브(성공 자체가 아니라 env 존재만 판정)
{
  const res = await fetchSafe(`${base}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: '__prod_probe_wrong__' }),
  });
  if (res.error) record('FAIL', '관리자 로그인 env', `요청 실패: ${res.error}`);
  else if (res.status === 401) record('PASS', '관리자 로그인 env', 'ZEROS_ADMIN_PASSWORD 등록됨(오답 401 정상)');
  else if (res.status === 503) record('WARN', '관리자 로그인 env', 'ZEROS_ADMIN_PASSWORD 미설정 — 프로덕션 관리자 로그인 불가');
  else record('FAIL', '관리자 로그인 env', `예상 밖 응답 ${res.status}`);
}

const bad = results.filter((r) => r.level !== 'PASS');
console.log('---');
console.log(bad.length === 0 ? '프로브 통과: 3/3 PASS' : `주의 ${bad.length}건: ${bad.map((r) => r.name).join(', ')}`);
if (strict && bad.length > 0) process.exit(1);
