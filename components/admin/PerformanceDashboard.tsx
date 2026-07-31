'use client';

import React, { useEffect, useState } from 'react';
import { ZerosService } from '@/lib/supabase/client';
import { Estimate, Payment } from '@/types/estimate';
import { calculatePerformanceMetrics } from '@/lib/calculations';
import { kstMonthStr } from '@/lib/utils/date';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, Award, DollarSign, Percent } from 'lucide-react';

const COLORS = ['#0F1E35', '#1E4D8C', '#E0701A', '#5B6573', '#9AA3AF', '#1F7A4D', '#C8841A', '#B23A3A'];

export const PerformanceDashboard: React.FC = () => {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false); // SSR Hydration Mismatch 방지 - 핵심 기법!

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setMounted(true);
    });

    // 견적·결제를 각각 try/catch 로 적재한다. Promise.all 로 묶으면 한쪽 실패(세션 만료 등)가
    // 다른 쪽 결과까지 버려 실적 화면 전체가 0건으로 위장된다.
    const load = async () => {
      try {
        const ests = await ZerosService.getEstimates();
        setEstimates(ests);
      } catch (e) {
        console.error('Failed to load estimates for performance metrics', e);
      }

      try {
        const pays = await ZerosService.getPayments();
        setPayments(pays);
      } catch (e) {
        console.error('Failed to load payments for outstanding amount', e);
        setPayments([]);
      }

      setLoading(false);
    };
    load();
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  if (loading) {
    return <div className="text-xs font-bold text-gray-light text-center py-12">실적 통계 적재 중...</div>;
  }

  // calculations 연동
  const metrics = calculatePerformanceMetrics(estimates, payments);

  // 매출 귀속월 = 수주 확정월(contract_won_at).
  // contract_won_at 기록 이전에 마감된 과거 수주건은 값이 없으므로 접수월(created_at)로 폴백한다.
  const revenueMonthOf = (e: Estimate) => kstMonthStr(e.contract_won_at || e.created_at);

  // 1. 월별 접수 및 매출 추이 동적 가공
  const getMonthlyData = () => {
    const monthlyMap: Record<string, { month: string; count: number; revenue: number }> = {};

    // 현재(KST) 기준 최근 7개월 뼈대를 매번 동적 생성 — 하드코딩 시 이후 달이 통째 누락된다.
    const now = new Date();
    const months: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    months.forEach(m => {
      monthlyMap[m] = { month: m, count: 0, revenue: 0 };
    });

    estimates.forEach(e => {
      const receivedMonth = kstMonthStr(e.created_at);
      if (monthlyMap[receivedMonth]) {
        monthlyMap[receivedMonth].count += 1;
      }
      if (e.status === '수주성공') {
        const wonMonth = revenueMonthOf(e);
        if (monthlyMap[wonMonth]) {
          monthlyMap[wonMonth].revenue += (e.confirmed_contract_amount || 0);
        }
      }
    });

    return Object.values(monthlyMap);
  };

  const monthlyData = getMonthlyData();

  // 창(최근 7개월) 안 매출과 창 밖 매출을 분리 표기한다.
  // 창 밖 수주건은 어느 막대에도 안 잡히므로, 표기하지 않으면 차트 합계와 누적 확정매출이 어긋난다.
  const windowRevenue = monthlyData.reduce((acc, m) => acc + m.revenue, 0);
  const outsideWindowRevenue = Math.max(0, metrics.confirmedRevenue - windowRevenue);

  // 2. 공사 종류별 비중 가공
  const getWorkTypeData = () => {
    const workMap: Record<string, number> = {};
    estimates.forEach(e => {
      workMap[e.work_type] = (workMap[e.work_type] || 0) + 1;
    });

    return Object.entries(workMap).map(([name, value]) => ({
      name,
      value
    }));
  };

  const workTypeData = getWorkTypeData();

  // 3. 견적규모별 실적 가공
  const getCategoryData = () => {
    const catMap: Record<string, { name: string; total: number; won: number }> = {
      small: { name: '온라인 간편', total: 0, won: 0 },
      medium: { name: '출장 실측', total: 0, won: 0 },
      large: { name: '종합 프로젝트', total: 0, won: 0 },
      unknown: { name: '규모 미정', total: 0, won: 0 },
    };

    estimates.forEach(e => {
      if (catMap[e.estimate_category]) {
        catMap[e.estimate_category].total += 1;
        if (e.status === '수주성공') {
          catMap[e.estimate_category].won += 1;
        }
      }
    });

    return Object.values(catMap).map(c => {
      const wonRate = c.total > 0 ? Math.round((c.won / c.total) * 100) : 0;
      return {
        name: c.name,
        '전체 접수': c.total,
        '수주 성공': c.won,
        '수주율 (%)': wonRate
      };
    });
  };

  const categoryData = getCategoryData();

  return (
    <div className="flex flex-col gap-6 select-none font-sans max-w-5xl mx-auto py-2">
      
      {/* 타이틀 및 헤더 */}
      <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm">
        <h2 className="text-xl font-black text-navy leading-none">영업 성과 및 파이프라인 분석</h2>
        <p className="text-[12.5px] text-gray leading-relaxed mt-1">
          사전진단 신청 유입부터 수주 확정 매출, 서비스 수수료 미수금, 공종별 분석까지 집계합니다.
          금액 지표는 공급가액(VAT 별도) 기준이며, 미수금은 청구액에서 수납액을 뺀 값입니다.
        </p>
      </div>

      {/* 13종의 핵심 KPI 카드 세션 - §6.9 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-bg border border-border p-4 rounded-custom shadow-sm">
          <span className="text-[9.5px] text-gray-light font-bold block uppercase tracking-wider mb-1">총 접수 건수</span>
          <span className="text-xl font-black text-navy tabular-nums">{metrics.totalCount}건</span>
        </div>

        <div className="bg-bg border border-border p-4 rounded-custom shadow-sm">
          <span className="text-[9.5px] text-gray-light font-bold block uppercase tracking-wider mb-1">신규 대기</span>
          <span className="text-xl font-black text-navy tabular-nums">{metrics.newCount}건</span>
        </div>

        <div className="bg-bg border border-border p-4 rounded-custom shadow-sm">
          <span className="text-[9.5px] text-gray-light font-bold block uppercase tracking-wider mb-1">엔지니어 검토중</span>
          <span className="text-xl font-black text-navy tabular-nums">{metrics.reviewingCount}건</span>
        </div>

        <div className="bg-bg border border-border p-4 rounded-custom shadow-sm">
          <span className="text-[9.5px] text-gray-light font-bold block uppercase tracking-wider mb-1">방문 실측 조율중</span>
          <span className="text-xl font-black text-navy tabular-nums">{metrics.visitWaitingCount}건</span>
        </div>

        <div className="bg-bg border border-border p-4 rounded-custom shadow-sm">
          <span className="text-[9.5px] text-gray-light font-bold block uppercase tracking-wider mb-1">방문 실측 완료</span>
          <span className="text-xl font-black text-navy tabular-nums">{metrics.visitCompletedCount}건</span>
        </div>

        <div className="bg-bg border border-border p-4 rounded-custom shadow-sm">
          <span className="text-[9.5px] text-gray-light font-bold block uppercase tracking-wider mb-1">견적 대기</span>
          <span className="text-xl font-black text-navy tabular-nums">{metrics.quoteWritingCount}건</span>
        </div>

        <div className="bg-bg border border-border p-4 rounded-custom shadow-sm">
          <span className="text-[9.5px] text-gray-light font-bold block uppercase tracking-wider mb-1">최종 계약 성공</span>
          <span className="text-xl font-black text-success tabular-nums">{metrics.wonCount}건</span>
        </div>

        <div className="bg-bg border border-border p-4 rounded-custom shadow-sm">
          <span className="text-[9.5px] text-gray-light font-bold block uppercase tracking-wider mb-1">최종 계약 실패</span>
          <span className="text-xl font-black text-danger tabular-nums">{metrics.lostCount}건</span>
        </div>

        <div className="bg-bg border border-border p-4 rounded-custom shadow-sm">
          <span className="text-[9.5px] text-gray-light font-bold block uppercase tracking-wider mb-1">견적 전환율</span>
          <span className="text-xl font-black text-steel tracking-tight tabular-nums">{metrics.quoteConversionRate}%</span>
        </div>

        <div className="bg-bg border border-border p-4 rounded-custom shadow-sm">
          <span className="text-[9.5px] text-gray-light font-bold block uppercase tracking-wider mb-1">수주 전환율</span>
          <span className="text-xl font-black text-steel tracking-tight tabular-nums">{metrics.wonConversionRate}%</span>
        </div>

        <div className="bg-bg border border-border p-4 rounded-custom shadow-sm">
          <span className="text-[9.5px] text-gray-light font-bold block uppercase tracking-wider mb-1">출장 실측 전환율</span>
          <span className="text-xl font-black text-steel tracking-tight tabular-nums">{metrics.visitConversionRate}%</span>
        </div>

        <div className="bg-bg border border-border p-4 rounded-custom shadow-sm">
          <span className="text-[9.5px] text-gray-light font-bold block uppercase tracking-wider mb-1">평균 검토 소요일</span>
          <span className="text-xl font-black text-navy tracking-tight tabular-nums">{metrics.averageProcessDays}일</span>
        </div>

        <div className="bg-bg border border-border p-4 rounded-custom shadow-sm col-span-2">
          <span className="text-[9.5px] text-gray-light font-bold block uppercase tracking-wider mb-1">평균 견적 산출액</span>
          <span className="text-lg font-black text-navy tracking-tight tabular-nums">
            ₩{metrics.averageQuoteAmount.toLocaleString()}
          </span>
        </div>

        <div className="bg-bg border border-border p-4 rounded-custom shadow-sm col-span-2">
          <span className="text-[9.5px] text-danger font-bold block uppercase tracking-wider mb-1">서비스 수수료 미수금</span>
          <span className="text-lg font-black text-danger tracking-tight tabular-nums">
            ₩{metrics.outstandingAmount.toLocaleString()}
          </span>
        </div>

      </div>

      {/* Recharts 시각화 영역 (마운트 체크 적용) */}
      {mounted && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 차트 1: 월별 접수 추이 */}
          <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm">
            <h4 className="text-xs font-bold text-navy mb-4 flex items-center gap-1.5 border-b border-border/60 pb-2">
              <TrendingUp className="w-4 h-4 text-steel" />
              월별 사전진단 유입 추이 (건)
            </h4>
            <div className="h-64 min-h-64 min-w-0">
              <ResponsiveContainer width="100%" height={256}>
                <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="count" stroke="#1E4D8C" strokeWidth={2.5} name="접수 건수" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 차트 2: 월별 확정 매출 추이 */}
          <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm">
            <h4 className="text-xs font-bold text-navy mb-4 flex items-center gap-1.5 border-b border-border/60 pb-2">
              <DollarSign className="w-4 h-4 text-steel" />
              월별 확정 계약 매출 (수주월 기준, 원)
            </h4>
            <div className="h-64 min-h-64 min-w-0">
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip 
                    formatter={(val) => `₩${Number(val).toLocaleString()}`} 
                    wrapperStyle={{ fontSize: 10 }} 
                  />
                  <Bar dataKey="revenue" fill="#0F1E35" radius={[4, 4, 0, 0]} name="확정 매출액" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] font-bold text-gray tabular-nums">
              차트 구간 ₩{windowRevenue.toLocaleString()} · 구간 밖 수주 ₩{outsideWindowRevenue.toLocaleString()}
            </p>
          </div>

          {/* 차트 3: 공사 종류별 비중 */}
          <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm">
            <h4 className="text-xs font-bold text-navy mb-4 flex items-center gap-1.5 border-b border-border/60 pb-2">
              <Award className="w-4 h-4 text-steel" />
              공사종류별 사전진단 비중 (%)
            </h4>
            <div className="h-64 min-h-64 min-w-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={256}>
                <PieChart>
                  <Pie
                    data={workTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {workTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip wrapperStyle={{ fontSize: 10 }} />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right" 
                    iconSize={8}
                    wrapperStyle={{ fontSize: 9, lineHeight: '1.6' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 차트 4: 견적규모별 수주율 */}
          <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm">
            <h4 className="text-xs font-bold text-navy mb-4 flex items-center gap-1.5 border-b border-border/60 pb-2">
              <Percent className="w-4 h-4 text-steel" />
              견적규모별 최종 수주 계약율 (%)
            </h4>
            <div className="h-64 min-h-64 min-w-0">
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                  <Tooltip formatter={(val) => `${val}%`} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="수주율 (%)" fill="#E0701A" radius={[4, 4, 0, 0]} name="수주 성공율" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}

      {/* 영업 WBS 통계 대장 표 */}
      <div className="bg-bg border border-border rounded-custom shadow-custom-sm overflow-hidden">
        <div className="p-4 bg-bg-subtle/50 border-b border-border">
          <span className="font-extrabold text-[12.5px] text-navy">견적규모별 유입 대장</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-navy text-left border-collapse">
            <thead className="bg-bg-subtle text-[10px] text-gray-light font-bold border-b border-border uppercase">
              <tr>
                <th className="p-3">견적규모 등급</th>
                <th className="p-3 text-center">전체 접수</th>
                <th className="p-3 text-center">계약 성공</th>
                <th className="p-3 text-right">수주성공율</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categoryData.map((row) => (
                <tr key={row.name} className="hover:bg-bg-subtle/30 font-medium">
                  <td className="p-3 font-bold">{row.name}</td>
                  <td className="p-3 text-center tabular-nums">{row['전체 접수']} 건</td>
                  <td className="p-3 text-center font-bold text-success tabular-nums">{row['수주 성공']} 건</td>
                  <td className="p-3 text-right font-extrabold text-steel tabular-nums">{row['수주율 (%)']}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
