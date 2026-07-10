// ==========================================
// KST(UTC+9) 기준 날짜 유틸
// ==========================================
// new Date(iso).toISOString()은 UTC 기준이라, 한국시간 00:00~09:00 사이의 시각은
// 날짜가 하루 밀린다("오늘 발송" 0건·칸반 접수일 오표기의 원인). 아래 함수들은 KST
// 기준으로 날짜 문자열을 만들고, 잘못된 날짜 입력은 빈 문자열로 안전 처리한다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function parse(iso: string | undefined | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** KST 기준 YYYY-MM-DD. 잘못된 값이면 ''. */
export function kstDateStr(iso: string | undefined | null): string {
  const d = parse(iso);
  if (!d) return '';
  return new Date(d.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** KST 기준 YYYY-MM(월). 잘못된 값이면 ''. */
export function kstMonthStr(iso: string | undefined | null): string {
  const s = kstDateStr(iso);
  return s ? s.slice(0, 7) : '';
}

/** KST 기준 MM-DD(표시용). 잘못된 값이면 '—'. */
export function kstMonthDay(iso: string | undefined | null): string {
  const s = kstDateStr(iso);
  return s ? s.slice(5) : '—';
}

/** 오늘(KST) YYYY-MM-DD. */
export function kstToday(): string {
  return new Date(Date.now() + KST_OFFSET_MS).toISOString().slice(0, 10);
}
