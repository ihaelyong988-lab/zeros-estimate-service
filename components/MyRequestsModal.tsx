'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useShell } from '@/lib/context/ShellContext';
import { ZerosService } from '@/lib/supabase/client';
import { Estimate, NotificationLog } from '@/types/estimate';
import { X, LogOut, History, ListChecks, FileText, Clock, Inbox, ArrowRight } from 'lucide-react';

type Tone = 'steel' | 'warning' | 'accent' | 'info' | 'success' | 'navy' | 'gray';

const toneText: Record<Tone, string> = {
  steel: 'text-steel', warning: 'text-warning', accent: 'text-accent', info: 'text-info',
  success: 'text-success', navy: 'text-navy', gray: 'text-gray',
};
const toneBg: Record<Tone, string> = {
  steel: 'bg-steel', warning: 'bg-warning', accent: 'bg-accent', info: 'bg-info',
  success: 'bg-success', navy: 'bg-navy', gray: 'bg-gray-light',
};
const toneSoft: Record<Tone, string> = {
  steel: 'bg-steel/10 text-steel border-steel/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  accent: 'bg-accent/10 text-accent border-accent/20',
  info: 'bg-info/10 text-info border-info/20',
  success: 'bg-success/10 text-success border-success/20',
  navy: 'bg-navy/10 text-navy border-navy/20',
  gray: 'bg-gray-light/10 text-gray border-gray-light/30',
};

const STATUS_TONE: Record<string, Tone> = {
  '접수완료': 'steel', '검토중': 'warning', '추가자료요청': 'warning', '출장견적 결제대기': 'accent',
  '방문일정 조율중': 'info', '현장방문 예정': 'info', '현장방문 완료': 'info', '견적서 작성중': 'navy',
  '견적서 송부완료': 'success', '수주성공': 'success', '수주실패': 'gray', '보류': 'gray', '취소': 'gray',
};

// 알림 템플릿 코드 → 시계열 이벤트 라벨/색
const TPL: Record<string, { label: string; tone: Tone }> = {
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

const STAGES = ['접수', '검토', '방문', '견적', '수주'];
function stageIndex(status: string): number {
  switch (status) {
    case '접수완료': return 0;
    case '검토중': case '추가자료요청': case '출장견적 결제대기': return 1;
    case '방문일정 조율중': case '현장방문 예정': case '현장방문 완료': return 2;
    case '견적서 작성중': case '견적서 송부완료': return 3;
    case '수주성공': return 4;
    default: return -1; // 수주실패·취소·보류 등 종결/중단
  }
}

function fmtDateTime(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fmtDate(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

interface TLEvent {
  id: string;
  ts: string;
  estimateNo: string;
  label: string;
  desc: string;
  tone: Tone;
}

// 메인화면 "내 접수현황" — 휴대폰 인증으로 로그인한 본인의 사전진단 진행 상황을
// 시계열(타임라인) 및 건별 카드로 확인한다.
export const MyRequestsModal: React.FC = () => {
  const {
    showMyRequests, setShowMyRequests, customerAuth, logoutCustomer, setActiveTab,
  } = useShell();

  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'timeline' | 'list'>('timeline');

  const phoneDigits = (customerAuth?.phone || '').replace(/\D/g, '');

  useEffect(() => {
    if (!showMyRequests || !customerAuth) return;
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const [est, lg] = await Promise.all([
          ZerosService.getEstimates(),
          ZerosService.getNotificationLogs(),
        ]);
        if (!alive) return;
        setEstimates(est.filter(e => e.phone.replace(/\D/g, '') === phoneDigits));
        setLogs(lg.filter(l => l.phone.replace(/\D/g, '') === phoneDigits));
      } catch (e) {
        console.error('접수현황 로드 실패', e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [showMyRequests, customerAuth, phoneDigits]);

  // 시계열 이벤트 구성: 알림 로그가 있으면 그것을(권위 있는 상태변경 이력),
  // 없으면(시드/구접수) 견적 타임스탬프로 마일스톤을 합성한다.
  const events = useMemo<TLEvent[]>(() => {
    const out: TLEvent[] = [];
    if (logs.length > 0) {
      for (const l of logs) {
        const t = TPL[l.template_code] || { label: '알림', tone: 'gray' as Tone };
        out.push({ id: l.id, ts: l.sent_at, estimateNo: l.estimate_no, label: t.label, desc: l.content, tone: t.tone });
      }
    } else {
      for (const e of estimates) {
        out.push({
          id: `${e.id}-reg`, ts: e.created_at, estimateNo: e.estimate_no,
          label: '접수완료', desc: `${e.work_type} · ${e.site_type} 사전진단 접수`, tone: 'steel',
        });
        if (e.estimate_sent_at) {
          out.push({
            id: `${e.id}-sent`, ts: e.estimate_sent_at, estimateNo: e.estimate_no,
            label: '견적서 송부완료', desc: '예상 원가 검토서 송부', tone: 'success',
          });
        }
        if (e.contract_won_at) {
          out.push({
            id: `${e.id}-won`, ts: e.contract_won_at, estimateNo: e.estimate_no,
            label: '수주성공', desc: '최종 계약 체결', tone: 'success',
          });
        }
        // 현재 상태가 위 마일스톤과 다르면 현재 진행 상태도 노드로 표시
        if (!['접수완료', '견적서 송부완료', '수주성공'].includes(e.status)) {
          out.push({
            id: `${e.id}-cur`, ts: e.created_at, estimateNo: e.estimate_no,
            label: e.status, desc: '현재 진행 상태', tone: STATUS_TONE[e.status] || 'gray',
          });
        }
      }
    }
    return out.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
  }, [logs, estimates]);

  if (!showMyRequests || !customerAuth) return null;

  const displayName = customerAuth.name || estimates[0]?.customer_name || '고객';
  const maskedPhone = customerAuth.phone;

  const goRequest = () => {
    setShowMyRequests(false);
    setActiveTab('request');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-navy/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={() => setShowMyRequests(false)} />

      <div className="relative z-10 w-full max-w-[560px] h-[82vh] max-h-[720px] bg-bg-subtle border border-border rounded-[20px] shadow-custom-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 헤더 */}
        <div className="bg-[#04204C] text-white px-5 py-4 flex items-center justify-between select-none shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-custom bg-accent/90 flex items-center justify-center shrink-0">
              <History className="w-4 h-4 text-white" />
            </span>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[15px] font-black tracking-tight truncate">{displayName}님의 접수현황</span>
              <span className="text-[11.5px] font-semibold text-white/60 tabular-nums">{maskedPhone} · 본인인증 완료</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={logoutCustomer}
              className="h-8 inline-flex items-center gap-1.5 rounded-custom border border-white/20 bg-white/5 hover:bg-white/15 text-white/90 px-2.5 text-[12px] font-bold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> 로그아웃
            </button>
            <button
              onClick={() => setShowMyRequests(false)}
              className="w-8 h-8 inline-flex items-center justify-center rounded-custom text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              aria-label="닫기"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* 탭 — 시계열 / 건별 */}
        <div className="bg-bg border-b border-border px-4 pt-3 flex items-center gap-1 shrink-0">
          {([
            { key: 'timeline', label: '시계열', icon: History },
            { key: 'list', label: '접수 건별', icon: ListChecks },
          ] as const).map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`relative px-3.5 py-2 text-[13px] font-bold flex items-center gap-1.5 transition-colors ${
                  active ? 'text-navy' : 'text-gray-light hover:text-gray'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
                <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-bg-subtle border border-border text-[10px] font-black text-gray tabular-nums">
                  {key === 'timeline' ? events.length : estimates.length}
                </span>
                {active && <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-accent rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4">
          {loading ? (
            <div className="text-[13px] font-bold text-gray-light text-center py-16">접수현황을 불러오는 중...</div>
          ) : estimates.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center gap-3 py-16">
              <span className="w-12 h-12 rounded-full bg-bg border border-border flex items-center justify-center">
                <Inbox className="w-6 h-6 text-gray-light" />
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-[14px] font-black text-navy">접수된 사전진단 내역이 없습니다</span>
                <span className="text-[12px] text-gray font-medium">{maskedPhone} 번호로 접수된 건이 없습니다.</span>
              </div>
              <button
                onClick={goRequest}
                className="mt-1 inline-flex items-center gap-1.5 bg-accent hover:bg-[#c95f12] text-white px-4 py-2.5 rounded-custom text-[13px] font-black transition-colors"
              >
                무료 견적 의뢰하기 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : tab === 'timeline' ? (
            /* ── 시계열 타임라인 ── */
            <div className="relative pl-6">
              <div className="absolute top-2 bottom-2 left-[7px] w-0.5 bg-border" />
              <div className="flex flex-col gap-4">
                {events.map((ev) => (
                  <div key={ev.id} className="relative flex flex-col gap-1">
                    <span className={`absolute -left-[22px] top-1 w-3.5 h-3.5 rounded-full ring-4 ring-bg-subtle ${toneBg[ev.tone]}`} />
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-black border ${toneSoft[ev.tone]}`}>{ev.label}</span>
                      <span className="text-[11px] font-bold text-gray-light tabular-nums">{fmtDateTime(ev.ts)}</span>
                      <span className="text-[10.5px] font-mono font-bold text-steel ml-auto">{ev.estimateNo}</span>
                    </div>
                    <p className="text-[12.5px] text-gray font-medium leading-snug bg-bg border border-border rounded-custom px-3 py-2 shadow-custom-sm">
                      {ev.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── 접수 건별 카드 ── */
            <div className="flex flex-col gap-3">
              {estimates.map((e) => {
                const tone = STATUS_TONE[e.status] || 'gray';
                const si = stageIndex(e.status);
                const terminated = si === -1;
                return (
                  <div key={e.id} className="bg-bg border border-border rounded-custom p-4 flex flex-col gap-3 shadow-custom-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[10.5px] font-mono font-bold text-steel">{e.estimate_no}</span>
                        <span className="text-[14px] font-black text-navy truncate">{e.work_type}</span>
                        <span className="text-[11.5px] text-gray-light font-semibold">
                          {e.site_type} · 접수 {fmtDate(e.created_at)}
                        </span>
                      </div>
                      <span className={`shrink-0 px-2.5 py-1 rounded-full text-[11.5px] font-black border ${toneSoft[tone]}`}>
                        {e.status}
                      </span>
                    </div>

                    {/* 단계 스테퍼 */}
                    {terminated ? (
                      <div className="text-[11.5px] font-bold text-gray bg-bg-subtle border border-border/70 rounded-custom px-3 py-2">
                        진행이 종료된 건입니다. (현재 상태: {e.status})
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {STAGES.map((st, i) => {
                          const done = i <= si;
                          return (
                            <React.Fragment key={st}>
                              <div className="flex flex-col items-center gap-1">
                                <span className={`w-2.5 h-2.5 rounded-full ${done ? toneBg[tone] : 'bg-border'}`} />
                                <span className={`text-[10px] font-bold ${done ? toneText[tone] : 'text-gray-light'}`}>{st}</span>
                              </div>
                              {i < STAGES.length - 1 && (
                                <span className={`flex-1 h-0.5 -mt-4 ${i < si ? toneBg[tone] : 'bg-border'}`} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )}

                    {(e.estimate_sent_at || e.expected_budget_range) && (
                      <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-[11.5px]">
                        <span className="text-gray-light font-semibold">예상 규모</span>
                        <span className="font-black text-navy">{e.expected_budget_range}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="bg-bg border-t border-border px-4 py-3 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11.5px] text-gray-light font-medium flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-steel shrink-0" />
            상태가 바뀌면 문자로도 안내됩니다.
          </span>
          <button
            onClick={goRequest}
            className="inline-flex items-center gap-1.5 bg-steel hover:bg-navy text-bg px-3.5 py-2 rounded-custom text-[12.5px] font-black transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> 새 견적 의뢰
          </button>
        </div>
      </div>
    </div>
  );
};
