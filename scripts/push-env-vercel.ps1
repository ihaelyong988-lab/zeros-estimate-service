# .env.local → Vercel Production 환경변수 원클릭 등록 (docs/03_qa_deploy/prod-env-setup.md)
# 사용법(주인님이 직접 실행 — 키 값은 AI를 거치지 않고 이 스크립트가 로컬에서 바로 전송):
#   1) .env.local의 빈 키에 값 붙여넣기 (SOLAPI 3종 · ZEROS_ADMIN_PASSWORD, OTP_SERVER_SECRET은 이미 있음)
#   2) 최초 1회: vercel login  (브라우저 인증) → 이 폴더에서 vercel link (프로젝트 연결)
#   3) .\scripts\push-env-vercel.ps1 실행
#   4) Claude에게 "재배포하고 검증해" 지시 → 빈 커밋 푸시로 재배포 + prod-probe 3/3 PASS 확인

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env.local'
$keys = @('SOLAPI_API_KEY','SOLAPI_API_SECRET','SOLAPI_SENDER','ZEROS_ADMIN_PASSWORD','OTP_SERVER_SECRET')

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  Write-Host '[중단] Vercel CLI 없음 → npm i -g vercel 후 재실행' -ForegroundColor Red; exit 1
}
try { $who = vercel whoami 2>$null } catch { $who = $null }
if (-not $who) {
  Write-Host '[중단] 로그인 필요 → 터미널에서 vercel login 실행(브라우저 인증) 후 재실행' -ForegroundColor Red; exit 1
}
if (-not (Test-Path (Join-Path $root '.vercel/project.json'))) {
  Write-Host '[중단] 프로젝트 미연결 → 이 폴더에서 vercel link 실행(프로젝트 선택) 후 재실행' -ForegroundColor Red; exit 1
}
if (-not (Test-Path $envFile)) { Write-Host "[중단] .env.local 없음: $envFile" -ForegroundColor Red; exit 1 }

# .env.local 파싱 (KEY=VALUE, 따옴표 제거)
$envMap = @{}
foreach ($line in Get-Content $envFile) {
  if ($line -match '^\s*([A-Z0-9_]+)\s*=\s*(.*)$') {
    $envMap[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
  }
}

$done = @(); $skipped = @()
foreach ($k in $keys) {
  $v = $envMap[$k]
  if (-not $v) { $skipped += $k; Write-Host "[건너뜀] $k — .env.local에 값 없음" -ForegroundColor Yellow; continue }
  vercel env rm $k production --yes 2>$null | Out-Null   # 기존 값 제거(없으면 무시)
  $v | vercel env add $k production | Out-Null
  $done += $k
  Write-Host "[등록] $k → Production" -ForegroundColor Green
}

Write-Host '---'
Write-Host ("등록 {0}건: {1}" -f $done.Count, ($done -join ', '))
if ($skipped.Count) { Write-Host ("미등록 {0}건(값 비어있음): {1}" -f $skipped.Count, ($skipped -join ', ')) -ForegroundColor Yellow }
Write-Host '다음 단계: Claude에게 "재배포하고 검증해" 지시 (env는 재배포 시점에 반영됩니다)'
