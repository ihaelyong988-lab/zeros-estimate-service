import crypto from 'crypto';

// ==========================================
// SMS 발송 어댑터 (Solapi)
// ==========================================
// 환경변수(SOLAPI_API_KEY/SECRET/SENDER)가 모두 있으면 실제 문자 발송,
// 하나라도 없으면 '테스트 모드'(실제 발송 없이 testMode=true 반환)로 동작한다.

export interface SendResult {
  sent: boolean;
  testMode: boolean;
}

export async function sendSms(toPhone: string, text: string): Promise<SendResult> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const sender = process.env.SOLAPI_SENDER;

  // 키 미설정 → 테스트 모드 (실제 발송 없음)
  if (!apiKey || !apiSecret || !sender) {
    return { sent: false, testMode: true };
  }

  // Solapi HMAC-SHA256 인증 헤더 구성
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString('hex');
  const signature = crypto.createHmac('sha256', apiSecret).update(date + salt).digest('hex');
  const authorization = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

  const res = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        to: toPhone.replace(/[^0-9]/g, ''),
        from: sender.replace(/[^0-9]/g, ''),
        text,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`SMS 발송 실패 (${res.status}) ${detail}`.trim());
  }

  return { sent: true, testMode: false };
}
