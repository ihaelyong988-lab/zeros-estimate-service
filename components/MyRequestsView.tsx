'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useShell } from '@/lib/context/ShellContext';
import { ZerosService } from '@/lib/supabase/client';
import { openSecureFile } from '@/lib/files/secureFile';
import { Estimate, NotificationLog } from '@/types/estimate';
import {
  History, LogOut, ListChecks, FileText, Clock, Inbox, ArrowRight,
  ShieldCheck, Phone, MessageSquare, CheckCircle2, UserCheck, Download
} from 'lucide-react';

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
    default: return -1;
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

function formatPhone(v: string): string {
  const d = v.replace(/[^0-9]/g, '').slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

interface TLEvent {
  id: string;
  ts: string;
  estimateNo: string;
  label: string;
  desc: string;
  tone: Tone;
}

export const MyRequestsView: React.FC = () => {
  const { customerAuth, setCustomerAuth, logoutCustomer, setActiveTab } = useShell();

  // inline login states
  const [phone, setPhone] = useState('');
  const [phase, setPhase] = useState<'input' | 'code'>('input');
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [testCode, setTestCode] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // request lists states
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTabKey, setActiveTabKey] = useState<'timeline' | 'list'>('timeline');

  const digits = phone.replace(/[^0-9]/g, '');
  const phoneValid = /^01[0-9]{8,9}$/.test(digits);
  const phoneDigits = (customerAuth?.phone || '').replace(/\D/g, '');

  // Fetch requests data once authenticated
  useEffect(() => {
    if (!customerAuth) return;
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
  }, [customerAuth, phoneDigits]);

  // Handle OTP request
  const requestCode = async () => {
    setAuthError(null);
    if (!phoneValid) { setAuthError('휴대폰 번호를 010-0000-0000 형식으로 입력해 주세요.'); return; }
    setAuthLoading(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '인증번호 발송에 실패했습니다.');
      setToken(data.token);
      setTestCode(data.devCode || null);
      setPhase('code');
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : '인증번호 발송 중 오류가 발생했습니다.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle OTP verification
  const verifyCode = async () => {
    setAuthError(null);
    if (code.replace(/[^0-9]/g, '').length < 6) { setAuthError('인증번호 6자리를 입력해 주세요.'); return; }
    setAuthLoading(true);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: digits, code, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '인증에 실패했습니다.');
      setCustomerAuth({
        name: '',
        phone: formatPhone(digits),
        verifiedAt: new Date().toISOString(),
        sessionToken: data.sessionToken, // 본인 견적서 파일 열람용(서버 재검증)
      });
      // clear local states
      setPhone('');
      setPhase('input');
      setToken('');
      setCode('');
      setTestCode(null);
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : '인증 처리 중 오류가 발생했습니다.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Parse events for timeline
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

  const goRequest = () => {
    setActiveTab('request');
  };

  // Case 1: Unauthenticated -> Render Inline Login Form
  if (!customerAuth) {
    return (
      <div className="max-w-md mx-auto bg-bg border border-border rounded-custom p-5 flex flex-col gap-4 shadow-sm animate-in fade-in duration-200">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-black text-steel uppercase tracking-wider">MY PAGE</span>
          <h2 className="text-[20px] font-black text-navy">마이페이지 로그인</h2>
          <p className="text-[13px] text-gray font-semibold leading-relaxed">
            전화번호 하나로 3초 만에 가입/로그인하고, 실시간 견적 접수 현황을 확인하세요.
          </p>
        </div>

        {/* 안내 */}
        <div className="bg-bg-subtle border border-border/85 rounded-custom p-3.5 flex flex-col gap-1">
          <span className="text-[12px] font-bold text-navy flex items-center gap-1.5 leading-none">
            <ShieldCheck className="w-3.5 h-3.5 text-steel shrink-0" />
            등록된 본인만 이용 내역을 열람할 수 있습니다
          </span>
          <span className="text-[11.5px] text-gray/80 leading-relaxed mt-0.5">
            의뢰 시 작성하신 휴대전화 번호로 로그인하시면 별도의 비밀번호 없이 진행 단계를 확인 및 동기화합니다.
          </span>
        </div>

        {/* 휴대폰 번호 입력 */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-bold text-navy flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-gray" /> 휴대폰 번호
          </span>
          <div className="flex gap-2">
            <input
              value={phone}
              onChange={(e) => { setPhone(formatPhone(e.target.value)); setAuthError(null); }}
              disabled={phase === 'code'}
              inputMode="numeric"
              placeholder="010-0000-0000"
              onKeyDown={(e) => { if (e.key === 'Enter' && phase === 'input') requestCode(); }}
              className="flex-1 bg-bg border border-border rounded-custom px-3.5 py-2.5 text-[14px] font-medium text-navy outline-none focus:ring-2 focus:ring-steel/40 disabled:bg-bg-subtle disabled:text-gray"
            />
            {phase === 'input' && (
              <button
                type="button"
                onClick={requestCode}
                disabled={authLoading}
                className="shrink-0 bg-steel hover:bg-navy text-bg px-4 py-2.5 rounded-custom text-[12px] font-black transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
              >
                {authLoading ? '발송 중...' : '인증번호 전송'}
              </button>
            )}
          </div>
        </label>

        {/* OTP 코드 입력 */}
        {phase === 'code' && (
          <div className="flex flex-col gap-3 border-t border-border/70 pt-3 animate-in slide-in-from-top-2 duration-200">
            {testCode && (
              <div className="bg-accent/10 border border-accent/30 rounded-custom px-3 py-2 text-[12px] text-accent font-bold leading-relaxed">
                ⚙️ 테스트 모드: 인증번호는 <span className="font-black">{testCode}</span> 입니다.
              </div>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-[12px] font-bold text-navy flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-gray" /> 인증번호 6자리
              </span>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6)); setAuthError(null); }}
                  inputMode="numeric"
                  autoFocus
                  placeholder="문자로 받은 6자리"
                  onKeyDown={(e) => { if (e.key === 'Enter') verifyCode(); }}
                  className="flex-1 bg-bg border border-border rounded-custom px-3.5 py-2.5 text-[14px] font-bold tracking-widest text-navy outline-none focus:ring-2 focus:ring-steel/40"
                />
                <button
                  type="button"
                  onClick={verifyCode}
                  disabled={authLoading}
                  className="shrink-0 bg-accent hover:bg-navy text-bg px-5 py-2.5 rounded-custom text-[12px] font-black transition-all active:scale-95 disabled:opacity-50"
                >
                  {authLoading ? '확인 중...' : '로그인'}
                </button>
              </div>
            </label>
            <button
              type="button"
              onClick={() => { setPhase('input'); setCode(''); setTestCode(null); setAuthError(null); }}
              className="text-[12px] font-bold text-gray-light hover:text-navy transition-colors self-start"
            >
              번호 다시 입력하기
            </button>
          </div>
        )}

        {authError && (
          <div className="bg-danger/5 border border-danger/20 rounded-custom px-3 py-2 text-[12px] font-bold text-danger">
            {authError}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-[12px] text-gray-light font-medium mt-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
          입력하신 번호는 본인확인 용도로만 사용되며 안전하게 보호됩니다.
        </div>
      </div>
    );
  }

  // Case 2: Authenticated -> Render Requests Status / Current Progress Page
  const displayName = estimates[0]?.customer_name || '고객';
  const maskedPhone = customerAuth.phone;

  return (
    <div className="max-w-md mx-auto bg-bg border border-border rounded-custom flex flex-col overflow-hidden shadow-sm animate-in fade-in duration-200">
      
      {/* 회원 프로필 헤더 */}
      <div className="bg-[#04204C] text-white px-4 py-4 flex items-center justify-between select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-custom bg-accent/90 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4 text-white" />
          </span>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-[14.5px] font-black tracking-tight truncate">{displayName}님</span>
            <span className="text-[11.5px] font-semibold text-white/60 tabular-nums">{maskedPhone} 인증완료</span>
          </div>
        </div>
        <button
          onClick={logoutCustomer}
          className="h-8 inline-flex items-center gap-1.5 rounded-custom border border-white/20 bg-white/5 hover:bg-white/15 text-white/90 px-2.5 text-[11.5px] font-bold transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> 로그아웃
        </button>
      </div>

      {/* 탭 가로 셀렉터 (시계열 vs 접수 건별) */}
      <div className="bg-bg border-b border-border px-4 pt-3 flex items-center gap-1 shrink-0">
        {([
          { key: 'timeline', label: '시계열 진행현황', icon: History },
          { key: 'list', label: '접수 내역', icon: ListChecks },
        ] as const).map(({ key, label, icon: Icon }) => {
          const active = activeTabKey === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTabKey(key)}
              className={`relative px-3.5 py-2 text-[12.5px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                active ? 'text-navy' : 'text-gray-light hover:text-gray'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
              <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-bg-subtle border border-border text-[9.5px] font-black text-gray tabular-nums">
                {key === 'timeline' ? events.length : estimates.length}
              </span>
              {active && <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-accent rounded-full" />}
            </button>
          );
        })}
      </div>

      {/* 본문 스크롤 영역 */}
      <div className="p-4 flex-1 overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="text-[13px] font-bold text-gray-light text-center py-12">접수현황을 불러오는 중...</div>
        ) : estimates.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-10">
            <span className="w-12 h-12 rounded-full bg-bg border border-border flex items-center justify-center">
              <Inbox className="w-6 h-6 text-gray-light" />
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-[13.5px] font-black text-navy">접수된 사전진단 내역이 없습니다</span>
              <span className="text-[11.5px] text-gray font-medium">{maskedPhone} 번호로 진행중인 건이 없습니다.</span>
            </div>
            <button
              onClick={goRequest}
              className="mt-1 inline-flex items-center gap-1.5 bg-accent hover:bg-[#c95f12] text-white px-4 py-2.5 rounded-custom text-[12.5px] font-black transition-colors cursor-pointer"
            >
              무료 견적 의뢰하기 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : activeTabKey === 'timeline' ? (
          /* ── 1. 시계열 타임라인 뷰 ── */
          <div className="relative pl-6 py-1">
            <div className="absolute top-2 bottom-2 left-[7px] w-0.5 bg-border" />
            <div className="flex flex-col gap-4">
              {events.map((ev) => (
                <div key={ev.id} className="relative flex flex-col gap-1">
                  <span className={`absolute -left-[22px] top-1 w-3.5 h-3.5 rounded-full ring-4 ring-bg-subtle ${toneBg[ev.tone]}`} />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-black border ${toneSoft[ev.tone]}`}>{ev.label}</span>
                    <span className="text-[10.5px] font-bold text-gray-light tabular-nums">{fmtDateTime(ev.ts)}</span>
                    <span className="text-[10px] font-mono font-bold text-steel ml-auto">{ev.estimateNo}</span>
                  </div>
                  <p className="text-[12px] text-gray font-medium leading-snug bg-bg border border-border rounded-custom px-3 py-2 shadow-custom-sm">
                    {ev.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── 2. 접수 건별 카드 뷰 ── */
          <div className="flex flex-col gap-3">
            {estimates.map((e) => {
              const tone = STATUS_TONE[e.status] || 'gray';
              const si = stageIndex(e.status);
              const terminated = si === -1;
              return (
                <div key={e.id} className="bg-bg border border-border rounded-custom p-4 flex flex-col gap-3 shadow-custom-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[10px] font-mono font-bold text-steel">{e.estimate_no}</span>
                      <span className="text-[13.5px] font-black text-navy truncate">{e.work_type}</span>
                      <span className="text-[11px] text-gray-light font-semibold">
                        {e.site_type} · 접수 {fmtDate(e.created_at)}
                      </span>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-black border ${toneSoft[tone]}`}>
                      {e.status}
                    </span>
                  </div>

                  {/* 단계별 스태퍼 바 */}
                  {terminated ? (
                    <div className="text-[11px] font-bold text-gray bg-bg-subtle border border-border/70 rounded-custom px-2.5 py-2">
                      진행이 종료된 건입니다. (현재 상태: {e.status})
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 pt-1">
                      {STAGES.map((st, i) => {
                        const done = i <= si;
                        return (
                          <React.Fragment key={st}>
                            <div className="flex flex-col items-center gap-1 shrink-0">
                              <span className={`w-2.5 h-2.5 rounded-full ${done ? toneBg[tone] : 'bg-border'}`} />
                              <span className={`text-[9.5px] font-bold ${done ? toneText[tone] : 'text-gray-light'}`}>{st}</span>
                            </div>
                            {i < STAGES.length - 1 && (
                              <span className={`flex-1 h-0.5 -mt-3.5 ${i < si ? toneBg[tone] : 'bg-border'}`} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}

                  {(e.estimate_sent_at || e.expected_budget_range) && (
                    <div className="flex items-center justify-between border-t border-border/60 pt-2.5 text-[11.5px]">
                      <span className="text-gray font-semibold">예상 규모</span>
                      <span className="font-black text-navy">{e.expected_budget_range}</span>
                    </div>
                  )}

                  {e.estimate_pdf_url && (
                    <button
                      type="button"
                      onClick={() =>
                        openSecureFile(e.estimate_pdf_url!, {
                          phone: phoneDigits,
                          sessionToken: customerAuth?.sessionToken,
                        }).catch(err => alert(err instanceof Error ? err.message : '다운로드에 실패했습니다.'))
                      }
                      style={{ touchAction: 'manipulation' }}
                      className="min-h-11 w-full flex items-center justify-center gap-1.5 bg-steel hover:bg-navy text-bg rounded-custom text-[12.5px] font-black transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-navy"
                    >
                      <Download className="w-4 h-4" />
                      견적서 다운로드 (엑셀)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 푸터 영역 */}
      <div className="bg-bg-subtle border-t border-border px-4 py-3.5 flex items-center justify-between gap-2 shrink-0">
        <span className="text-[11px] text-gray-light font-medium flex items-center gap-1.5 leading-tight">
          <Clock className="w-3.5 h-3.5 text-steel shrink-0" />
          상태 변경 시 문자로도 실시간 안내됩니다.
        </span>
        <button
          onClick={goRequest}
          className="inline-flex items-center gap-1 bg-steel hover:bg-navy text-bg px-3 py-2 rounded-custom text-[12px] font-black transition-colors cursor-pointer whitespace-nowrap"
        >
          <FileText className="w-3.5 h-3.5" /> 새 의뢰
        </button>
      </div>
    </div>
  );
};
