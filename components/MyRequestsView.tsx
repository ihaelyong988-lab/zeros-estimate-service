'use client';

import React, { useState } from 'react';
import { useShell } from '@/lib/context/ShellContext';
import { openSecureFile } from '@/lib/files/secureFile';
import { useMyRequests } from '@/lib/requests/useMyRequests';
import { RequestsLoadBanner } from '@/lib/requests/RequestsLoadBanner';
import {
  toneBg, toneSoft, toneText, STAGES, STATUS_TONE, fmtDate, fmtDateTime, stageIndex,
} from '@/lib/requests/timeline';
import { useOtpVerify } from '@/lib/otp/useOtpVerify';
import { CustomerOtpLoginForm } from '@/lib/otp/CustomerOtpLoginForm';
import { menuDisplayName } from '@/lib/constants/menu';
import {
  History, LogOut, ListChecks, FileText, Clock, Inbox, ArrowRight,
  ShieldCheck, UserCheck, Download
} from 'lucide-react';

export const MyRequestsView: React.FC = () => {
  const { customerAuth, setCustomerAuth, logoutCustomer, setActiveTab } = useShell();

  const otp = useOtpVerify({
    resetOnVerified: true,
    onVerified: ({ name, phone, sessionToken }) => {
      setCustomerAuth({
        name,
        phone,
        verifiedAt: new Date().toISOString(),
        sessionToken, // 본인 견적서 파일 열람용(서버 재검증)
      });
    },
  });

  // 탭 화면이라 마운트 즉시 조회한다(오버레이는 열릴 때).
  const { estimates, events, loading, loadError, phoneDigits, retryLoad, reauth } = useMyRequests({ enabled: true });
  const [activeTabKey, setActiveTabKey] = useState<'timeline' | 'list'>('timeline');

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
          <span className="text-[11.5px] text-gray leading-relaxed mt-0.5">
            의뢰 시 작성하신 휴대전화 번호로 로그인하시면 별도의 비밀번호 없이 진행 단계를 확인 및 동기화합니다.
          </span>
        </div>

        <CustomerOtpLoginForm otp={otp} variant="page" />
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
                active ? 'text-navy' : 'text-gray hover:text-navy'
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
          <div className="text-[13px] font-bold text-gray text-center py-12">접수현황을 불러오는 중...</div>
        ) : (
        <div className="flex flex-col gap-3">
        <RequestsLoadBanner error={loadError} onRetry={retryLoad} onReauth={reauth} />
        {estimates.length === 0 ? (
          loadError ? null : (
          <div className="flex flex-col items-center justify-center text-center gap-3 py-10">
            <span className="w-12 h-12 rounded-full bg-bg border border-border flex items-center justify-center">
              <Inbox className="w-6 h-6 text-gray" />
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
          )
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
                    <span className="text-[10.5px] font-bold text-gray tabular-nums">{fmtDateTime(ev.ts)}</span>
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
                      <span className="text-[13.5px] font-black text-navy truncate">{menuDisplayName(e.work_type)}</span>
                      <span className="text-[11px] text-gray font-semibold">
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
                              <span className={`text-[9.5px] font-bold ${done ? toneText[tone] : 'text-gray'}`}>{st}</span>
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
        )}
      </div>

      {/* 푸터 영역 */}
      <div className="bg-bg-subtle border-t border-border px-4 py-3.5 flex items-center justify-between gap-2 shrink-0">
        {/* 상태 알림 문자 발송 경로가 아직 없어 문자 약속을 뺐다 — 발송이 붙으면 되돌린다. */}
        <span className="text-[11px] text-gray font-medium flex items-center gap-1.5 leading-tight">
          <Clock className="w-3.5 h-3.5 text-steel shrink-0" />
          상태 변경은 이 화면에서 확인합니다.
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
