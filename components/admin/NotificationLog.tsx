'use client';

import React, { useEffect, useState } from 'react';
import { NotificationLog as NotificationType } from '@/types/estimate';
import { ZerosService } from '@/lib/supabase/client';
import { Search, Mail, MessageSquare, Check, RefreshCw } from 'lucide-react';

export const NotificationLog: React.FC = () => {
  const [logs, setLogs] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadLogs = async (showPending = true) => {
    if (showPending) {
      await Promise.resolve();
      setLoading(true);
    }
    try {
      const list = await ZerosService.getNotificationLogs();
      setLogs(list);
    } catch (e) {
      console.error('Failed to load notification logs', e);
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
            <span className="text-[10px] text-steel font-black uppercase tracking-widest">Notification Dispatch Center</span>
            <h2 className="text-xl font-black text-navy leading-none mt-0.5">고객 안내 알림톡 & 이메일 발송 로그</h2>
            <p className="text-[12.5px] text-gray leading-relaxed mt-1">
              WBS 영업 프로세스 상태가 전환될 때 고객사의 휴대폰으로 발송되는 카카오 알림톡 및 전송 이력을 실시간 모니터링합니다.
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
                  <td colSpan={7} className="p-8 text-center text-xs font-bold text-gray-light">
                    기록된 알림톡 발송 로그가 없습니다. 견적서의 진행 상태를 전환하면 자동으로 로그가 추가됩니다.
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
                      <span className="bg-success/15 text-success border border-success/35 px-2 py-0.5 rounded-custom text-[9.5px] font-black inline-flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" />
                        발송 성공
                      </span>
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
