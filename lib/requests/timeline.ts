// ==========================================
// 내 접수현황 — 공용 상태 표기 규약 (순수)
// ==========================================
// MyRequestsView(마이페이지 탭)와 MyRequestsModal(오버레이)은 같은 진행 이력을 다른 껍데기로
// 보여준다. 상태색·단계·날짜 표기를 각자 들고 있으면 한쪽만 고쳐졌을 때 같은 건이 화면마다
// 다르게 읽힌다 — 규약은 여기 한 곳에만 둔다.

export type Tone = 'steel' | 'warning' | 'accent' | 'info' | 'success' | 'navy' | 'gray';

export const toneText: Record<Tone, string> = {
  steel: 'text-steel', warning: 'text-warning', accent: 'text-accent', info: 'text-info',
  success: 'text-success', navy: 'text-navy', gray: 'text-gray',
};
export const toneBg: Record<Tone, string> = {
  steel: 'bg-steel', warning: 'bg-warning', accent: 'bg-accent', info: 'bg-info',
  success: 'bg-success', navy: 'bg-navy', gray: 'bg-gray-light',
};
export const toneSoft: Record<Tone, string> = {
  steel: 'bg-steel/10 text-steel border-steel/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  accent: 'bg-accent/10 text-accent border-accent/20',
  info: 'bg-info/10 text-info border-info/20',
  success: 'bg-success/10 text-success border-success/20',
  navy: 'bg-navy/10 text-navy border-navy/20',
  gray: 'bg-gray-light/10 text-gray border-gray-light/30',
};

export const STATUS_TONE: Record<string, Tone> = {
  '접수완료': 'steel', '검토중': 'warning', '추가자료요청': 'warning', '출장견적 결제대기': 'accent',
  '방문일정 조율중': 'info', '현장방문 예정': 'info', '현장방문 완료': 'info', '견적서 작성중': 'navy',
  '견적서 송부완료': 'success', '수주성공': 'success', '수주실패': 'gray', '보류': 'gray', '취소': 'gray',
};

// 알림 템플릿 코드 → 시계열 이벤트 라벨/색
export const TPL: Record<string, { label: string; tone: Tone }> = {
  ZR_REG_COMPLETE: { label: '접수완료', tone: 'steel' },
  ZR_REVIEWING: { label: '검토중', tone: 'warning' },
  ZR_REQ_DOCS: { label: '추가자료요청', tone: 'warning' },
  ZR_PAY_WAIT: { label: '결제대기', tone: 'accent' },
  ZR_VISIT_PLAN: { label: '현장방문 예정', tone: 'info' },
  ZR_VISIT_COMPLETE: { label: '현장방문 완료', tone: 'info' },
  ZR_QUOTE_SENT: { label: '견적서 송부완료', tone: 'success' },
  ZR_WON_COMPLETE: { label: '수주성공', tone: 'success' },
  ZR_STATUS_UPDATE: { label: '상태 업데이트', tone: 'gray' },
  ZR_COMMON: { label: '알림', tone: 'gray' },
};

export const STAGES = ['접수', '검토', '방문', '견적', '수주'];
export function stageIndex(status: string): number {
  switch (status) {
    case '접수완료': return 0;
    case '검토중': case '추가자료요청': case '출장견적 결제대기': return 1;
    case '방문일정 조율중': case '현장방문 예정': case '현장방문 완료': return 2;
    case '견적서 작성중': case '견적서 송부완료': return 3;
    case '수주성공': return 4;
    default: return -1; // 수주실패·취소·보류 등 종결/중단
  }
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fmtDate(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

export interface TLEvent {
  id: string;
  ts: string;
  estimateNo: string;
  label: string;
  desc: string;
  tone: Tone;
}
