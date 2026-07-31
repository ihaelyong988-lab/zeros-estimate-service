import { isSmsConfigured } from '@/lib/sms/send';

// GET /api/otp/status
// SMS(Solapi) 설정이 완료되었는지 알려준다.
// 설정 전에는 휴대폰 인증 게이트를 비활성화하여, 테스트 모드 인증번호가
// 실제 고객에게 노출되는 것을 방지한다. 키를 등록하면 자동으로 활성화된다.
// 키 등록 직후 브라우저가 캐시된 옛 값을 계속 읽으면 인증 게이트가 어긋난다
// (화면은 "인증 불필요"인데 서버는 인증을 요구하는 상태). 이 응답은 캐시하지 않는다.
export async function GET() {
  return Response.json(
    { enabled: isSmsConfigured() },
    { headers: { 'Cache-Control': 'no-store, must-revalidate' } }
  );
}
