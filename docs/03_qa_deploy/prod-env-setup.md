# 프로덕션 환경변수 등록 가이드 (휴대폰 인증 문자 · 관리자 로그인 활성화)

> 2026-07-16 라이브 실측: Vercel에 아래 키가 미등록 상태 — 휴대폰 인증 문자 = 테스트 모드(발송 없음, 게이트 자동 생략), 관리자 로그인 = 503 불가.
> 키·비밀번호는 **사람이 직접** 등록한다(보안 원칙상 AI에게 값을 전달하거나 채팅·코드·커밋에 붙여넣지 않는다). 코드 수정은 필요 없다 — 등록만 하면 자동 활성.

## 1. 휴대폰 인증 문자 (SOLAPI 3종)

| 단계 | 내용 |
|---|---|
| 1 | [solapi.com](https://solapi.com) 가입 |
| 2 | 콘솔에서 **발신번호 사전등록**(통신사 서류 심사, 통상 1~2일) — 등록된 번호만 발신 가능 |
| 3 | 콘솔 → API Key 메뉴에서 **API Key / API Secret** 발급 |
| 4 | Vercel 등록(아래 §3) — `SOLAPI_API_KEY` · `SOLAPI_API_SECRET` · `SOLAPI_SENDER`(발신번호, 숫자만) |
| 5 | 로컬 `.env.local`의 같은 키에도 채움(로컬 테스트용, 선택) |

- 문자 단가는 건당 과금(SMS 기준 십수 원대) — 남용 완화는 코드에 이미 있음(번호당 1시간 5회, IP당 20회. `lib/otp/rateLimit.ts`).

## 2. 관리자 로그인 (ZEROS_ADMIN_PASSWORD) + 토큰 서명키 (OTP_SERVER_SECRET)

| 키 | 값 | 비고 |
|---|---|---|
| `ZEROS_ADMIN_PASSWORD` | 직접 정한 강한 비밀번호 | 미설정 시 관리자 로그인 503(현재 상태). 로컬 `.env.local`에도 동일하게 |
| `OTP_SERVER_SECRET` | 로컬 `.env.local`에 이미 있는 값을 복사해 등록 | 미설정 시 로그인 세션(30일)·인증 토큰이 서버 인스턴스마다 무효화됨 |

- 새 시크릿이 필요하면 생성: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- `SUPABASE_SERVICE_ROLE_KEY`는 이미 라이브에서 동작 확인됨(2026-07-11 §13) — 재등록 불필요.

## 3. Vercel 등록 절차 (공통)

1. [vercel.com](https://vercel.com) 대시보드 → 해당 프로젝트 → **Settings → Environment Variables**
2. 키 이름을 위 표와 **철자 그대로** 입력, Environment는 **Production**(Preview까지 체크해도 무방)
3. 저장 후 **Redeploy**(Deployments → 최신 배포 → Redeploy) — env는 재배포 시점에 반영된다.

## 4. 등록 후 검증 (기계 판정)

```bash
node scripts/prod-probe.mjs
```

- 기대: `휴대폰 인증 문자 PASS(활성)` + `관리자 로그인 env PASS(오답 401)` → 3/3 PASS.
- 마지막으로 실기기 1회: 예상견적 의뢰 → 휴대폰 인증 → 문자 수신 → 인증번호 입력 → 접수 → 관리자 화면에서 확인.
- OTP 활성화 이후에는 서버가 접수 시 본인 인증 토큰을 강제하므로(`/api/data`), 인증 없는 장난 접수도 함께 차단된다.
