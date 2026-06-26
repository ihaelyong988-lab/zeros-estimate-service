'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ZerosService } from '@/lib/supabase/client';
import { Estimate, WorkType, EstimateCategory } from '@/types/estimate';
import { calculatePerformanceMetrics } from '@/lib/calculations';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { LayoutGrid, Grid3x3, BarChart3, Activity } from 'lucide-react';

// 좌측 메뉴와 동일한 8대 공종 순서 (LeftSidebar workCategories와 일치)
const WORK_TYPES: WorkType[] = [
  '배관공사',
  '장비설치',
  'Utility 배관',
  '공장증설',
  '노후배관교체',
  '기계실개선',
  '생산설비 배관 연결',
  'CAPEX 개·증설 검토',
];

// 견적규모 4등급 (LeftSidebar budgetCategories와 일치)
const BUDGET_COLS: { key: EstimateCategory; label: string; range: string }[] = [
  { key: 'small', label: '온라인 간편검토', range: '≤1,000만' },
  { key: 'medium', label: '출장견적', range: '1,000만~1억' },
  { key: 'large', label: '프로젝트 사전진단', range: '>1억' },
  { key: 'unknown', label: '공사규모·금액 미정', range: '온라인 컨설팅' },
];

// 공종별 시그니처 색 — 좌측 메뉴·견적 검토 히어로(LANDING_SIGNATURE_HEX)와 동일 체계.
// 분포 막대를 공종마다 다른 색으로 칠해 가독성·식별성을 준다(무지개 남발 아님 — 의미 있는 색).
const TRADE_COLORS: Record<string, string> = {
  '배관공사': '#0891B2',
  '장비설치': '#D97706',
  'Utility 배관': '#0284C7',
  '공장증설': '#D2691E',
  '노후배관교체': '#059669',
  '기계실개선': '#0D9488',
  '생산설비 배관 연결': '#4F46E5',
  'CAPEX 개·증설 검토': '#16365F',
};

const REVIEW_DONE: ReadonlySet<string> = new Set([
  '견적서 송부완료', '수주성공', '수주실패',
]);

// 단일 색상(스틸블루) 순차 스케일 — 정직한 데이터 시각화
const heatCellStyle = (v: number, max: number): React.CSSProperties => {
  if (v === 0) return { backgroundColor: 'transparent', color: '#9AA3AF' };
  const t = max > 0 ? v / max : 0;
  const alpha = 0.14 + 0.78 * t;
  return {
    backgroundColor: `rgba(30, 77, 140, ${alpha.toFixed(2)})`,
    color: alpha > 0.55 ? '#FFFFFF' : '#0F1E35',
  };
};

export const PerformanceInsights: React.FC = () => {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false); // recharts SSR 미스매치 방지

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => setMounted(true));
    const load = async () => {
      try {
        setEstimates(await ZerosService.getEstimates());
      } catch (e) {
        console.error('Failed to load performance insights', e);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const agg = useMemo(() => {
    const metrics = calculatePerformanceMetrics(estimates);

    // 공종 × 규모 매트릭스 (건수)
    const matrix: Record<string, Record<string, number>> = {};
    const rowTotal: Record<string, number> = {};
    const colTotal: Record<string, number> = {};
    WORK_TYPES.forEach((w) => {
      matrix[w] = {};
      rowTotal[w] = 0;
      BUDGET_COLS.forEach((c) => { matrix[w][c.key] = 0; });
    });
    BUDGET_COLS.forEach((c) => { colTotal[c.key] = 0; });

    // 공종별 부가 지표
    const detail: Record<string, { count: number; daysSum: number; daysN: number; sites: Record<string, number> }> = {};
    WORK_TYPES.forEach((w) => { detail[w] = { count: 0, daysSum: 0, daysN: 0, sites: {} }; });

    let matrixMax = 0;
    let grandTotal = 0;

    estimates.forEach((e) => {
      const w = e.work_type as string;
      if (!matrix[w]) return; // 8대 공종 외(배관+장비설치/기타)는 매트릭스 제외
      const c = e.estimate_category;
      matrix[w][c] = (matrix[w][c] || 0) + 1;
      rowTotal[w] += 1;
      colTotal[c] += 1;
      grandTotal += 1;
      if (matrix[w][c] > matrixMax) matrixMax = matrix[w][c];

      const d = detail[w];
      d.count += 1;
      if (e.estimate_sent_at) {
        const days = Math.round(
          (new Date(e.estimate_sent_at).getTime() - new Date(e.created_at).getTime()) / 86_400_000,
        );
        if (days >= 0) { d.daysSum += days; d.daysN += 1; }
      }
      if (e.site_type) d.sites[e.site_type] = (d.sites[e.site_type] || 0) + 1;
    });

    // 분포 차트용 (공종별 건수 내림차순)
    const distribution = WORK_TYPES
      .map((w) => ({ name: w, value: rowTotal[w] }))
      .sort((a, b) => b.value - a.value);

    // 세부 카드용
    const cards = WORK_TYPES.map((w) => {
      const d = detail[w];
      const topSite = Object.entries(d.sites).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
      return {
        name: w,
        count: d.count,
        share: grandTotal > 0 ? Math.round((d.count / grandTotal) * 1000) / 10 : 0,
        avgDays: d.daysN > 0 ? Math.round(d.daysSum / d.daysN) : null,
        topSite,
      };
    }).sort((a, b) => b.count - a.count);

    const reviewDoneCount = estimates.filter((e) => REVIEW_DONE.has(e.status)).length;

    return {
      metrics, matrix, rowTotal, colTotal, matrixMax, grandTotal,
      distribution, cards, reviewDoneCount,
    };
  }, [estimates]);

  if (loading) {
    return <div className="text-[12px] font-bold text-gray-light text-center py-16">실적 집계 데이터를 적재 중입니다…</div>;
  }

  const { metrics, matrix, rowTotal, colTotal, matrixMax, grandTotal, distribution, cards, reviewDoneCount } = agg;
  const reviewDoneRate = grandTotal > 0 ? Math.round((reviewDoneCount / grandTotal) * 100) : 0;

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto py-3">

      {/* 헤더 — 박스 제거 */}
      <div className="flex flex-col gap-2 border-b border-border pb-4">
        <h2 className="text-2xl font-black text-navy tracking-tight">ZEROS 실적 집계표</h2>
        <p className="text-[13.5px] text-gray leading-relaxed font-semibold max-w-3xl">
          홍보용 과장 수치 대신, 누적된 사전진단 포트폴리오를 공종·견적규모 축으로 그대로 집계해 한눈에 보여드립니다.
          모든 수치는 실제 접수·검토 데이터에서 실시간으로 산출됩니다.
        </p>
      </div>

      {/* KPI 하이라이트 — 박스 없이 상·하 헤어라인만. 의도적 비대칭(좌 지배지표 / 우 보조 클러스터),
          색은 '누적 진단 건수' 한 묶음(점·숫자·베이스라인 룰)에만, 나머지 무채색. 로드 시 스태거 페이드인 */}
      <section className="border-t border-b border-border py-7 flex flex-wrap items-end gap-x-10 gap-y-6">
        {/* 누적 진단 건수 — 유일한 컬러 하이라이트 */}
        <div className="flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none">
          <span className="flex items-center gap-2 text-[12.5px] font-bold text-gray tracking-tight">
            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 animate-pulse motion-reduce:animate-none" title="실시간 집계" />
            누적 진단 건수
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-[clamp(52px,6.5vw,72px)] font-black text-accent tabular-nums leading-[0.78] tracking-[-0.045em]">{metrics.totalCount}</span>
            <span className="text-[22px] font-black text-navy">건</span>
          </span>
          <span className="h-[3px] w-14 bg-accent rounded-full" />
        </div>

        {/* 보조 3종 — 무채색, 우측 클러스터(의도적 비대칭 여백) */}
        <div className="flex flex-wrap items-end gap-x-9 gap-y-5 ml-auto">
          {[
            { label: '검토 완료율', value: reviewDoneRate, unit: '%' },
            { label: '평균 검토 소요', value: metrics.averageProcessDays, unit: '일' },
            { label: '진단 공종 수', value: WORK_TYPES.length, unit: '종' },
          ].map((k, i) => (
            <div
              key={k.label}
              className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none"
              style={{ animationDelay: `${120 + i * 90}ms` }}
            >
              <span className="text-[12.5px] font-bold text-gray tracking-tight">{k.label}</span>
              <span className="text-[30px] font-black text-navy tabular-nums leading-none tracking-[-0.02em]">
                {k.value}<span className="text-[16px] font-extrabold text-gray-light ml-0.5">{k.unit}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 분포 차트 박스 */}
      <div className="flex flex-col gap-4">
        <h3 className="text-[14px] font-extrabold text-navy flex items-center gap-1.5 border-b border-border/60 pb-3">
          <BarChart3 className="w-4 h-4 text-steel" />
          공종별 진단 실적 분포 <span className="text-gray-light font-bold">(건수)</span>
        </h3>
        <div className="min-w-0">
          {mounted ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={distribution}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                barCategoryGap={6}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={132} />
                <Tooltip formatter={(v) => [`${v}건`, '진단 건수']} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} name="진단 건수">
                  {distribution.map((d) => (
                    <Cell key={d.name} fill={TRADE_COLORS[d.name] || '#1E4D8C'} fillOpacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-[12px] text-gray-light font-bold">차트 준비 중…</div>
          )}
        </div>
      </div>

      {/* 히트맵 박스 — 공종 × 견적규모 */}
      <div className="flex flex-col gap-4">
        <h3 className="text-[14px] font-extrabold text-navy flex items-center gap-1.5 border-b border-border/60 pb-3">
          <Grid3x3 className="w-4 h-4 text-steel" />
          공종 × 견적규모 실적 히트맵 <span className="text-gray-light font-bold">(셀 = 진단 건수)</span>
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="sticky left-0 bg-bg p-2 text-left font-bold text-gray-light min-w-[120px]" />
                {BUDGET_COLS.map((c) => (
                  <th key={c.key} className="p-2 text-center font-bold text-navy whitespace-nowrap">
                    <div className="text-[12px] font-black">{c.label}</div>
                    <div className="text-[12px] text-gray-light font-semibold tabular-nums">{c.range}</div>
                  </th>
                ))}
                <th className="p-2 text-center font-black text-navy whitespace-nowrap">합계</th>
              </tr>
            </thead>
            <tbody>
              {WORK_TYPES.map((w) => (
                <tr key={w}>
                  <td className="sticky left-0 bg-bg p-2 font-bold text-navy whitespace-nowrap border-t border-border/50">{w}</td>
                  {BUDGET_COLS.map((c) => {
                    const v = matrix[w][c.key];
                    return (
                      <td
                        key={c.key}
                        className="p-0 text-center border border-bg-subtle"
                        style={heatCellStyle(v, matrixMax)}
                        title={`${w} · ${c.label}: ${v}건`}
                      >
                        <div className="py-2.5 font-black tabular-nums">{v > 0 ? v : '·'}</div>
                      </td>
                    );
                  })}
                  <td className="p-2 text-center font-black text-steel tabular-nums border-t border-border/50">{rowTotal[w]}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border">
                <td className="sticky left-0 bg-bg p-2 font-black text-navy">합계</td>
                {BUDGET_COLS.map((c) => (
                  <td key={c.key} className="p-2 text-center font-black text-navy tabular-nums">{colTotal[c.key]}</td>
                ))}
                <td className="p-2 text-center font-black text-accent tabular-nums">{grandTotal}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {/* 범례 */}
        <div className="flex items-center gap-2 text-[12px] text-gray-light font-semibold">
          <span>적음</span>
          <div className="flex h-2.5 w-32 rounded-full overflow-hidden border border-border/60">
            {[0.14, 0.32, 0.5, 0.68, 0.86, 0.92].map((a) => (
              <div key={a} className="flex-1" style={{ backgroundColor: `rgba(30,77,140,${a})` }} />
            ))}
          </div>
          <span>많음</span>
        </div>
      </div>

      {/* 하위 세부 박스 — 공종별 세부 항목 */}
      <div className="flex flex-col gap-4">
        <h3 className="text-[14px] font-extrabold text-navy flex items-center gap-1.5 border-b border-border/60 pb-3">
          <LayoutGrid className="w-4 h-4 text-steel" />
          공종별 세부 실적 <span className="text-gray-light font-bold">(건수 · 비중 · 평균 검토일 · 대표 현장)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((card) => (
            <div key={card.name} className="border-t-2 border-border/70 pt-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-black text-navy leading-tight">{card.name}</span>
                <span className="shrink-0 text-[12px] font-black text-steel bg-steel/10 border border-steel/20 px-1.5 py-0.5 rounded-full tabular-nums">{card.share}%</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-navy tabular-nums tracking-tight">{card.count}</span>
                <span className="text-[12px] text-gray-light font-bold">건</span>
              </div>
              <div className="flex flex-col gap-1 border-t border-border/50 pt-2 text-[12px] font-semibold">
                <div className="flex items-center justify-between">
                  <span className="text-gray-light flex items-center gap-1"><Activity className="w-3 h-3" />평균 검토</span>
                  <span className="text-navy font-bold tabular-nums">{card.avgDays !== null ? `${card.avgDays}일` : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-light">대표 현장</span>
                  <span className="text-navy font-bold">{card.topSite}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
