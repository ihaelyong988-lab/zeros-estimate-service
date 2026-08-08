'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ZerosService } from '@/lib/supabase/client';
import { Estimate } from '@/types/estimate';
import { aggregatePerformance, BUDGET_COLS, WORK_TYPES } from '@/lib/performance/insights';
import { PERFORMANCE_LABEL } from '@/lib/constants/trust';
// 공종 표시명은 menu.ts 단일 소스를 쓴다(§10-A O-33 이 이 파일을 동기 대상으로 명시).
// 집계·색 매핑은 DB 저장 키(WORK_TYPES)로 그대로 두고, 화면 문자열만 표시명으로 바꾼다.
import { menuDisplayName } from '@/lib/constants/menu';
import { LayoutGrid, Grid3x3, BarChart3, Activity } from 'lucide-react';

// 공종별 색 = '작업 특성'에 맞춘 의미 기반 팔레트(색상심리) —
//   물/유체 배관=블루 · 유틸리티=스틸블루 · 기계실/HVAC=틸 · 금속 장비=그래파이트
//   · 건설/증설=앰버 · 노후·부식 교체=러스트 · 라인 연결·통합=인디고 · 자본 검토=딥네이비.
//   딥·뮤트 톤으로 통일해 8색이 함께 있어도 정돈되고 전문적. 막대·히트맵이 같은 체계를 공유한다.
const TRADE_COLORS: Record<string, string> = {
  '배관공사': '#1D6E93',           // 블루 — 배관/유체
  'Utility 배관': '#3B7CA8',       // 스틸블루 — 유틸리티 배관
  '기계실개선': '#1E7A72',         // 틸 — 기계실·HVAC
  '장비설치': '#566270',           // 그래파이트 — 금속 장비
  '공장증설': '#B5762A',           // 앰버/오커 — 건설·증설
  '노후배관교체': '#9E4B2C',       // 러스트 — 노후·부식 교체
  '생산설비 배관 연결': '#4A56A6', // 인디고 — 라인 연결·통합
  'CAPEX 개·증설 검토': '#1E3A5F', // 딥네이비 — 자본·검토
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
};

// 공종별 색을 건수에 따라 농도(alpha)로 채운 순차 스케일 — 각 행이 자기 공종 색을 입어 히트맵이 막대와 코디된다.
// 글자색은 흰 배경과 alpha 블렌딩한 '실제 셀 색'의 밝기로 정한다 → 어떤 공종 색(밝은 앰버·어두운 네이비)이든 대비 확보.
const heatCellStyle = (v: number, max: number, baseHex: string): React.CSSProperties => {
  if (v === 0) return { backgroundColor: 'transparent', color: '#9AA3AF' };
  const t = max > 0 ? v / max : 0;
  const alpha = 0.16 + 0.78 * t;
  const { r, g, b } = hexToRgb(baseHex);
  const blend = (c: number) => c * alpha + 255 * (1 - alpha);
  const lum = 0.299 * blend(r) + 0.587 * blend(g) + 0.114 * blend(b);
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`,
    color: lum < 150 ? '#FFFFFF' : '#0F1E35',
  };
};

// 섹션 분리선용 공종 8색 미니 스트립 — 헤어라인 좌측에 얹어 "다음 섹션의 색 체계"를 예고하는 미니 범례.
// 분리선이 전부 같은 회색이라 직관적이지 않다는 지시(2026-07-04)의 처방: 분리선이 다음 내용을 상징한다.
const TradeStrip: React.FC<{ colors: string[] }> = ({ colors }) => (
  <span aria-hidden="true" className="absolute -bottom-px left-0 flex h-[2px] w-24 overflow-hidden rounded-full">
    {colors.map((c, i) => (
      <span key={i} className="flex-1" style={{ backgroundColor: c }} />
    ))}
  </span>
);

export const PerformanceInsights: React.FC = () => {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  // 집계는 lib/performance/insights.ts 한 곳에서만 한다 —
  // KPI·분포·히트맵이 같은 모집단을 쓰도록 정의를 화면 밖에 두고 테스트로 고정한다.
  const agg = useMemo(() => aggregatePerformance(estimates), [estimates]);

  if (loading) {
    return <div className="text-[12px] font-bold text-gray text-center py-16">실적 집계 데이터를 적재 중입니다…</div>;
  }

  // 표본이 최소 기준에 못 미치면 지표 대신 '준비 중'을 낸다(2026-08-08).
  // 한두 건으로 그린 분포·평균·비율은 실적이 아니라 오해다 — 기준값과 판정은
  // lib/performance/insights.ts(PERFORMANCE_MIN_SAMPLE)에 있고 테스트가 채점한다.
  if (!agg.isPublishable) {
    return (
      <div className="max-w-5xl mx-auto flex flex-col gap-3 py-16">
        <h3 className="flex items-center gap-2 text-[23px] font-extrabold leading-none tracking-[-0.01em] text-navy">
          <BarChart3 className="w-5 h-5 text-steel" />
          실적 공개 준비 중
        </h3>
        <p className="max-w-[54ch] break-keep text-[16px] font-semibold leading-relaxed text-gray">
          온라인 접수 표본이 쌓이는 대로 공종별 분포와 검토 실적을 공개합니다.
        </p>
      </div>
    );
  }

  const { metrics, matrix, rowTotal, colTotal, matrixMax, grandTotal, distribution, cards, reviewDoneRate } = agg;

  // 분리선 스트립 색 = 각 섹션에 실제 등장하는 순서 그대로(스트립이 곧 미니 범례가 되도록)
  const distColors = distribution.map((d) => TRADE_COLORS[d.name] || '#1E4D8C');
  const workTypeColors = WORK_TYPES.map((w) => TRADE_COLORS[w] || '#1E4D8C');

  return (
    <div className="flex flex-col gap-3 max-w-5xl mx-auto py-1">

      {/* 최상단 한 행 — 좌=분포 헤더(상단 이동, 2026-07-05 지시) / 우=KPI 4종 균일 클러스터
          (좌측 지배 KPI 블록 삭제 → 접수 건수를 보조와 동일 스타일로 편입, 세로폭 확보) */}
      <section className="relative border-b border-border pb-2.5">
        <div className="overflow-x-auto no-scrollbar">
          <div className="flex min-w-full w-max items-end gap-x-8">
            <h3 className="shrink-0 whitespace-nowrap text-[23px] font-extrabold text-navy flex items-center gap-2 leading-none tracking-[-0.01em]">
          <BarChart3 className="w-5 h-5 text-steel" />
          실적 분포
        </h3>
            <div className="flex shrink-0 items-end gap-x-6 ml-auto">
          {[
            { label: PERFORMANCE_LABEL.intake, value: metrics.totalCount, unit: '건' },
            { label: '검토 비율', value: reviewDoneRate, unit: '%' },
            { label: '평균 소요', value: metrics.averageProcessDays, unit: '일' },
            { label: '공종 수', value: WORK_TYPES.length, unit: '종' },
          ].map((k, i) => (
            <div
              key={k.label}
              className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none"
              style={{ animationDelay: `${120 + i * 80}ms` }}
            >
              <span className="text-[12px] font-bold text-gray tracking-tight whitespace-nowrap">{k.label}</span>
              <span className="text-[23px] font-black text-navy tabular-nums leading-none tracking-[-0.02em]">
                {k.value}<span className="text-[13px] font-extrabold text-gray ml-0.5">{k.unit}</span>
              </span>
            </div>
          ))}
        </div>
          </div>
        </div>
        <TradeStrip colors={distColors} />
      </section>

      {/* 분포 차트 — 레일형 에디토리얼 막대. 높이 296px(행 pitch 37px)·레일 18px.
          열 그리드 = 히트맵과 공유(2026-07-12 캡쳐 지시: 라벨 176px 좌측 정렬 · 레일 시작 = 셀 시작 · 건수 104px = 합계 열) */}
      <div className="flex flex-col gap-2">
        <div className="h-[296px] min-w-0 flex flex-col py-1.5">
          {(() => {
            const maxCount = Math.max(0, ...distribution.map((x) => x.value));
            return distribution.map((d) => {
            const hex = TRADE_COLORS[d.name] || '#1E4D8C';
            const widthPct = maxCount > 0 ? Math.max((d.value / maxCount) * 100, d.value > 0 ? 3 : 0) : 0;
            const share = grandTotal > 0 ? Math.round((d.value / grandTotal) * 1000) / 10 : 0;
            return (
              <div key={d.name} className="grid grid-cols-[176px_1fr_104px] items-center flex-1 min-h-0" title={`${menuDisplayName(d.name)} · ${d.value}건 (${share}%)`}>
                {/* 라벨 셀 — 히트맵 행 라벨(td) 미러: 3px 공종색 보더 + pl-3 좌측 정렬로 하나의 수직 일직선 */}
                <span
                  className="self-stretch flex items-center pl-3 pr-2 text-[13px] font-bold text-navy text-left leading-tight whitespace-nowrap truncate"
                  style={{ borderLeft: `3px solid ${hex}` }}
                >
                  {menuDisplayName(d.name)}
                </span>
                <div className="relative h-[18px] rounded-[3px] bg-[#EFF3F8] overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-[3px] transition-[width] duration-500 motion-reduce:transition-none"
                    style={{ width: `${widthPct}%`, backgroundColor: hex, opacity: 0.92 }}
                  />
                </div>
                <span className="flex items-baseline gap-1 pl-2 whitespace-nowrap tabular-nums">
                  <span className="text-[14px] font-black text-navy">{d.value}</span>
                  <span className="text-[12px] font-bold text-gray">건</span>
                  <span className="text-[12px] font-semibold text-gray">· {share}%</span>
                </span>
              </div>
            );
            });
          })()}
        </div>
        {/* 막대 하단 스트립 — 상단 헤더(L203)와 대칭, 분포 순서 8색 (2026-07-07 지시) */}
        <div className="relative border-b border-border/60">
          <TradeStrip colors={distColors} />
        </div>
      </div>

      {/* 히트맵 박스 — 공종 × 견적규모. 제목은 표 좌상단 코너 셀 내장(2026-07-04 지시):
          제목 행을 없애 세로폭을 절약 → 하단 합계 행이 스크롤 없이 바로 보인다. 섹션 경계는 헤어라인+스트립만 */}
      <div className="flex flex-col gap-3">
        <div className="relative border-b border-border/60">
          <TradeStrip colors={workTypeColors} />
        </div>
        <div className="overflow-x-auto">
          {/* 표 기본 13px(2026-07-12 한 단계 업) · 라벨 열 176px/합계 열 104px = 분포 차트와 공유 세로 그리드 */}
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="sticky left-0 bg-bg p-2 pr-3 text-left align-middle w-[176px] min-w-[176px]">
                  {/* 코너 제목 — "실적 히트맵"만 크게(2026-07-05 지시: 부제·캡션 삭제) */}
                  <div className="flex items-center gap-2 text-[23px] font-extrabold text-navy leading-none tracking-[-0.01em] whitespace-nowrap">
                    <Grid3x3 className="w-5 h-5 text-steel shrink-0" />
                    실적 히트맵
                  </div>
                </th>
                {BUDGET_COLS.map((c) => (
                  <th key={c.key} className="p-2 text-center font-bold text-navy whitespace-nowrap">
                    <div className="text-[13px] font-black">{c.label}</div>
                    <div className="text-[13px] text-gray font-semibold tabular-nums">{c.range}</div>
                  </th>
                ))}
                <th className="p-2 text-center font-black text-navy whitespace-nowrap w-[104px]">합계</th>
              </tr>
            </thead>
            <tbody>
              {WORK_TYPES.map((w) => {
                const rowHex = TRADE_COLORS[w] || '#1E4D8C';
                return (
                <tr key={w}>
                  <td
                    className="sticky left-0 bg-bg py-1.5 px-2 pl-3 font-bold text-navy whitespace-nowrap border-t border-border/50"
                    style={{ borderLeft: `3px solid ${rowHex}` }}
                  >
                    {menuDisplayName(w)}
                  </td>
                  {BUDGET_COLS.map((c) => {
                    const v = matrix[w][c.key];
                    return (
                      <td
                        key={c.key}
                        className="p-0 text-center border border-bg-subtle"
                        style={heatCellStyle(v, matrixMax, rowHex)}
                        title={`${menuDisplayName(w)} · ${c.label}: ${v}건`}
                      >
                        <div className="py-1.5 font-black tabular-nums">{v > 0 ? v : '·'}</div>
                      </td>
                    );
                  })}
                  <td className="py-1.5 px-2 text-center font-black text-steel tabular-nums border-t border-border/50">{rowTotal[w]}</td>
                </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border">
                <td className="sticky left-0 bg-bg py-1.5 px-2 font-black text-navy">합계</td>
                {BUDGET_COLS.map((c) => (
                  <td key={c.key} className="py-1.5 px-2 text-center font-black text-navy tabular-nums">{colTotal[c.key]}</td>
                ))}
                <td className="py-1.5 px-2 text-center font-black text-accent tabular-nums">{grandTotal}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {/* 히트맵 하단 스트립 — 상단(L239)과 대칭, 공종 8색. 밀도 범례는 삭제(2026-07-07 "X표시 삭제") */}
        <div className="relative border-b border-border/60">
          <TradeStrip colors={workTypeColors} />
        </div>
      </div>

      {/* 하위 세부 박스 — 공종별 세부 항목 */}
      <div className="flex flex-col gap-4">
        <h3 className="text-[14px] font-extrabold text-navy flex items-center gap-1.5 border-b border-border/60 pb-3">
          <LayoutGrid className="w-4 h-4 text-steel" />
          공종별 세부 실적 <span className="text-gray font-bold">(건수 · 비중 · 평균 검토일 · 대표 현장)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((card) => {
            const cardHex = TRADE_COLORS[card.name] || '#1E4D8C';
            return (
            <div key={card.name} className="pt-1 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-black text-navy leading-tight flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5" style={{ background: cardHex }} />
                  {menuDisplayName(card.name)}
                </span>
                <span className="shrink-0 text-[12px] font-black text-navy tabular-nums px-1.5 py-0.5 rounded-full border" style={{ backgroundColor: `${cardHex}1A`, borderColor: `${cardHex}45` }}>{card.share}%</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-navy tabular-nums tracking-tight">{card.count}</span>
                <span className="text-[12px] text-gray font-bold">건</span>
              </div>
              <div className="flex flex-col gap-1 border-t border-border/50 pt-2 text-[12px] font-semibold">
                <div className="flex items-center justify-between">
                  <span className="text-gray flex items-center gap-1"><Activity className="w-3 h-3" />평균 검토</span>
                  <span className="text-navy font-bold tabular-nums">{card.avgDays !== null ? `${card.avgDays}일` : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray">대표 현장</span>
                  <span className="text-navy font-bold">{card.topSite}</span>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
