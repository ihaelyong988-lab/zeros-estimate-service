'use client';

import React, { useEffect, useState } from 'react';
import { NotificationLog as NotificationType } from '@/types/estimate';
import { ZerosService } from '@/lib/supabase/client';
import { resolveAdminLoadError, type AdminLoadError } from '@/lib/admin/loadState';
import { Search, Mail, MessageSquare, Check, AlertCircle, MinusCircle, RefreshCw } from 'lucide-react';

// 전송 상태 배지 — 저장된 status 값을 그대로 표시한다.
// '미발송' = 이력만 남고 실제 발송 API 호출이 없었던 건(무채색으로 구분, 기존 토큰만 사용).
const STATUS_BADGE: Record<
  NotificationType['status'],
  { cls: string; Icon: typeof Check }
> = {
  발송완료: { cls: 'bg-success/15 text-success border-success/35', Icon: Check },
  발송오류: { cls: 'bg-danger/15 text-danger border-danger/35', Icon: AlertCircle },
  미발송: { cls: 'bg-gray/15 text-gray border-gray/35', Icon: MinusCircle },
};

export const NotificationLog: React.FC = () => {
  const [logs, setLogs] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<AdminLoadError | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadLogs = async (showPending = true) => {
    if (showPending) {
      await Promise.resolve();
      setLoading(true);
    }
    try {
      const list = await ZerosService.getNotificationLogs();
      setLogs(list);
      setLoadError(null);
    } catch (e) {
      console.error('Failed to load notification logs', e);
      // 조회 실패를 빈 목록으로 떨어뜨리면 화면이 "발송 이력 없음"을 사실로 안내한다.
      setLogs([]);
      setLoadError(resolveAdminLoadError('발송 로그를 불러오지 못했습니다.', e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      void loadLogs(false);
    });
  }, []);

  const filteredLogs = logs.filter(l => 
    l.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.estimate_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.phone.includes(searchTerm) ||
    l.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.template_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 select-none font-sans max-w-5xl mx-auto py-2">
      
      {/* 타이틀 및 헤더 */}
      <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-navy leading-none mt-0.5">고객 안내 알림톡 & 이메일 발송 로그</h2>
            <p className="text-[12.5px] text-gray leading-relaxed mt-1">
              영업 프로세스 상태가 전환될 때 생성되는 고객 안내 알림톡·이메일 이력입니다.
            </p>
          </div>
          <button 
            onClick={() => {
              void loadLogs();
            }}
            className="p-2 border border-border rounded-custom bg-bg hover:bg-bg-subtle text-gray hover:text-navy transition-all"
            title="새로고침"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-danger/5 border border-danger/20 rounded-custom px-4 py-3 flex items-start gap-2"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-px text-danger" />
          <span className="text-[13.5px] font-bold text-danger leading-snug">{loadError.message}</span>
        </div>
      )}

      {/* 검색 바 */}
      <div className="bg-bg border border-border p-4 rounded-custom shadow-custom-sm">
        <div className="relative">
          <input
            type="text"
            placeholder="접수번호, 고객명, 연락처, 발송 내용 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs border border-border rounded-custom px-3 py-2 pl-8 focus:outline-none focus:border-steel placeholder-gray-light font-medium bg-bg text-navy"
          />
          <Search className="w-3.5 h-3.5 text-gray-light absolute left-3 top-2.5" />
        </div>
      </div>

      {/* 로그 대장 리스트 테이블 */}
      <div className="bg-bg border border-border rounded-custom shadow-custom-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-bg-subtle text-[10px] text-gray-light font-bold border-b border-border uppercase">
              <tr>
                <th className="p-3">발송 유형</th>
                <th className="p-3">수신자 (접수번호)</th>
                <th className="p-3">연락처</th>
                <th className="p-3">템플릿 코드</th>
                <th className="p-3">전송 메시지 내용</th>
                <th className="p-3 text-center">전송 상태</th>
                <th className="p-3 text-right">발정 시각</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs font-bold text-gray-light">
                    로그 데이터를 가져오는 중...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs font-bold text-gray">
                    {loadError
                      ? '조회 실패로 로그를 표시하지 못했습니다.'
                      : '기록된 알림톡 발송 로그가 없습니다. 견적서의 진행 상태를 전환하면 자동으로 로그가 추가됩니다.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-bg-subtle/25 font-medium transition-colors">
                    {/* 발송유형 */}
                    <td className="p-3 font-bold text-navy">
                      <div className="flex items-center gap-1.5">
                        {l.notification_type === '카카오톡 알림톡' ? (
                          <div className="bg-[#FFE000]/25 text-[#3A1D1D] px-2 py-0.5 rounded-custom text-[9.5px] font-black flex items-center gap-0.5">
                            <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                            알림톡
                          </div>
                        ) : (
                          <div className="bg-steel/15 text-steel px-2 py-0.5 rounded-custom text-[9.5px] font-black flex items-center gap-0.5">
                            <Mail className="w-2.5 h-2.5 shrink-0" />
                            이메일
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 수신자 / 접수번호 */}
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-navy">{l.customer_name}</span>
                        <span className="text-[9.5px] text-gray-light font-bold mt-0.5 tabular-nums">{l.estimate_no}</span>
                      </div>
                    </td>

                    {/* 연락처 */}
                    <td className="p-3 text-gray tabular-nums">{l.phone}</td>

                    {/* 템플릿 코드 */}
                    <td className="p-3">
                      <span className="font-bold text-steel bg-bg-subtle border border-border/80 px-1.5 py-0.5 rounded-custom text-[10px]">
                        {l.template_code}
                      </span>
                    </td>

                    {/* 메시지 내용 */}
                    <td className="p-3 max-w-[280px]">
                      <p className="text-gray text-[11px] leading-relaxed truncate font-medium" title={l.content}>
                        {l.content}
                      </p>
                    </td>

                    {/* 전송상태 */}
                    <td className="p-3 text-center">
                      {(() => {
                        const badge = STATUS_BADGE[l.status] || STATUS_BADGE.미발송;
                        const Icon = badge.Icon;
                        return (
                          <span className={`${badge.cls} border px-2 py-0.5 rounded-custom text-[9.5px] font-black inline-flex items-center gap-0.5`}>
                            <Icon className="w-2.5 h-2.5" />
                            {l.status}
                          </span>
                        );
                      })()}
                    </td>

                    {/* 발정시각 */}
                    <td className="p-3 text-right text-gray-light tabular-nums">
                      {new Date(l.sent_at).toLocaleTimeString('ko-KR', {
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
