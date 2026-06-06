// GET /api/otp/status
// SMS(Solapi) 설정이 완료되었는지 알려준다.
// 설정 전에는 휴대폰 인증 게이트를 비활성화하여, 테스트 모드 인증번호가
// 실제 고객에게 노출되는 것을 방지한다. 키를 등록하면 자동으로 활성화된다.
export async function GET() {
  const enabled = !!(
    process.env.SOLAPI_API_KEY &&
    process.env.SOLAPI_API_SECRET &&
    process.env.SOLAPI_SENDER
  );
  return Response.json({ enabled });
}
