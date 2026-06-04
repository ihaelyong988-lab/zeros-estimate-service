'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from "@/components/layout/AppShell";
import { useShell } from "@/lib/context/ShellContext";
import { RequestWizard } from "@/components/forms/RequestWizard";
import { manualData } from "@/lib/constants/manuals";
import { ZerosService } from "@/lib/supabase/client";
import { Estimate, EstimateStatus } from "@/types/estimate";

// 관리자 컴포넌트 임포트
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { EstimateList } from "@/components/admin/EstimateList";
import { KanbanBoard } from "@/components/admin/KanbanBoard";
import { EstimateDetailModal } from "@/components/admin/EstimateDetailModal";
import { VisitList } from "@/components/admin/VisitList";
import { PerformanceDashboard } from "@/components/admin/PerformanceDashboard";
import { CustomerList } from "@/components/admin/CustomerList";
import { NotificationLog } from "@/components/admin/NotificationLog";

import {
  BookOpen,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Award,
  Briefcase,
  MapPin,
  Truck
} from 'lucide-react';

export default function Home() {
  const {
    isUserMode,
    activeTab,
    setActiveTab,
    selectedMenu,
    setSelectedMenu,
    selectedBudget,
    setSelectedBudget,
    adminView,
    setAdminView,
    adminSubView,
    setAdminSubView,
    selectedEstimateId,
    setSelectedEstimateId
  } = useShell();

  const [guideClosed, setGuideClosed] = useState(false);
  const router = useRouter();

  // 견적 목록 상태 관리 (실시간 동기화용)
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTradeIdx, setActiveTradeIdx] = useState(0);

  // 실시간 공종 쇼케이스 애니메이션 로테이션 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTradeIdx(prev => (prev + 1) % 8);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // 실시간 데이터 로딩
  useEffect(() => {
    const load = async () => {
      try {
        const list = await ZerosService.getEstimates();
        setEstimates(list);
      } catch (e) {
        console.error('Failed to load estimates in page root', e);
      }
    };
    load();
  }, [refreshTrigger, isUserMode, adminView]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 칸반 보드 혹은 모달에서의 실시간 상태 변경 리액티브 액션 - §6.11
  const handleStatusChange = async (id: string, newStatus: EstimateStatus) => {
    try {
      await ZerosService.updateEstimate(id, { status: newStatus });
      handleRefresh(); // 실시간 리액티브 갱신
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const handleBudgetClick = (budgetVal: string) => {
    setActiveTab('home');
    setSelectedBudget(budgetVal);
    setSelectedMenu(''); // 영역 필터 해제
  };

  // ==========================================
  // 1. 고객 모드 탭 렌더러
  // ==========================================
  const renderAboutTab = () => {
    const smartPlan = [
      { code: 'S', title: '범위 고정', desc: '공사 목적, 대상 설비, 배관 구간, 제외 범위를 한 문장으로 고정합니다.' },
      { code: 'M', title: '수치화', desc: '관경, 길이, 층고, 수량, 예산 상한, 희망 일정을 숫자로 입력합니다.' },
      { code: 'A', title: '실행 가능성', desc: '반입 동선, 셧다운 가능 시간, 작업 높이, 안전 제약을 확인합니다.' },
      { code: 'R', title: '사업 연관성', desc: '증설, 보수, 긴급 복구, CAPEX 승인 등 의사결정 목적과 연결합니다.' },
      { code: 'T', title: '기한 설정', desc: '24시간 1차 검토, 현장 실측 필요 여부, 견적 요청 기한을 구분합니다.' },
    ];

    const requiredDocs = [
      { level: '필수', item: '현장 사진 3장 이상', check: '전체 전경, 접속부, 장애물/반입 동선을 분리 촬영' },
      { level: '필수', item: '작업 목적', check: '누수 보수, 라인 증설, 장비 연결, 노후 교체 중 하나로 명시' },
      { level: '필수', item: '기본 치수', check: '배관 관경, 대략 길이, 층고, 장비 설치 면적을 숫자로 입력' },
      { level: '권장', item: '도면/P&ID/Layout', check: 'PDF, 이미지, CAD 캡처 중 가능한 자료를 첨부' },
      { level: '권장', item: '운전 조건', check: '유체, 압력, 온도, 셧다운 가능 시간, 청정도 요구조건 입력' },
      { level: '권장', item: '예산/일정 한도', check: '승인 가능한 금액 범위와 착공 희망일을 함께 제시' },
    ];

    const workflow = [
      { step: '01', title: '자료 접수', desc: '도면·사진·제원서 누락 여부를 확인하고 검토 가능/보완 필요를 분류합니다.' },
      { step: '02', title: 'AI 1차 검증', desc: '사진·도면에서 관경, 연결부, 접근성, 위험 요소 후보를 추출합니다.' },
      { step: '03', title: 'PM 판정', desc: '35년 현장 PM 기준으로 공사 범위, 예산 밴드, 출장 필요성을 판단합니다.' },
      { step: '04', title: '액션 확정', desc: '온라인 검토, 추가자료 요청, 출장 실측, 프로젝트 진단 중 다음 단계를 지정합니다.' },
    ];

    const decisionOutputs = [
      { title: '온라인 검토 가능', desc: '사진과 치수만으로 1차 범위와 예상 예산 밴드를 제시할 수 있는 건' },
      { title: '추가자료 요청', desc: '도면, 치수, 운전 조건, 현장 사진이 부족해 오판 가능성이 높은 건' },
      { title: '출장 실측 권장', desc: '고소 작업, 협소 반입, 가동 중 연결, 안전 리스크가 있는 건' },
      { title: '프로젝트 진단 전환', desc: '1억 초과 CAPEX, 복수 공종, 입찰 비교 기준 수립이 필요한 건' },
    ];

    return (
      <div className="flex flex-col gap-5 max-w-4xl mx-auto py-4">
        <section className="bg-bg border border-border rounded-custom p-5 md:p-6 shadow-custom-sm flex flex-col gap-5">
          <div className="flex flex-col gap-2 border-b border-border pb-4">
            <span className="text-[12px] text-steel font-black uppercase tracking-wider">SMART Action Template</span>
            <h2 className="text-2xl font-black text-navy tracking-tight">
              AI Native 검증 제출 SMART 플랜
            </h2>
            <p className="text-[13.5px] text-gray leading-relaxed font-semibold max-w-3xl">
              자료를 많이 받는 화면이 아니라, 공사 범위·예산·리스크·다음 행동을 빠르게 확정하기 위한 검증 제출 템플릿입니다.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 select-none">
            {[
              { label: '1차 검토 목표', value: '24h' },
              { label: '필수 입력 묶음', value: '3종' },
              { label: '판정 결과', value: '4가지' },
              { label: '최종 산출물', value: 'Scope Sheet' },
            ].map((metric) => (
              <div key={metric.label} className="bg-bg-subtle border border-border rounded-custom p-3.5">
                <span className="text-[12px] text-gray-light font-bold block">{metric.label}</span>
                <span className="text-[18px] text-navy font-black tracking-tight mt-1 block">{metric.value}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {smartPlan.map((item) => (
              <div key={item.code} className="bg-bg-subtle border border-border rounded-custom p-3.5 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-custom bg-steel text-bg flex items-center justify-center text-[13px] font-black">
                    {item.code}
                  </span>
                  <span className="text-[13.5px] font-black text-navy">{item.title}</span>
                </div>
                <p className="text-[12px] text-gray leading-normal font-semibold">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-bg border border-border rounded-custom p-5 shadow-custom-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <FileCheck className="w-4 h-4 text-steel" />
              <h3 className="text-[16px] font-black text-navy">제출자료 체크리스트</h3>
            </div>
            <div className="flex flex-col gap-2">
              {requiredDocs.map((doc) => (
                <div key={doc.item} className="grid grid-cols-[52px_1fr] gap-3 border border-border rounded-custom p-3 bg-bg-subtle/70">
                  <span className={`text-[12px] font-black ${doc.level === '필수' ? 'text-accent' : 'text-steel'}`}>
                    {doc.level}
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="text-[12.5px] font-black text-navy">{doc.item}</span>
                    <span className="text-[12px] text-gray leading-normal">{doc.check}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-bg border border-border rounded-custom p-5 shadow-custom-sm flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <ShieldCheck className="w-4 h-4 text-steel" />
              <h3 className="text-[16px] font-black text-navy">검증 워크플로우</h3>
            </div>
            <div className="flex flex-col gap-3">
              {workflow.map((item) => (
                <div key={item.step} className="flex gap-3 items-start">
                  <span className="w-8 h-8 shrink-0 rounded-custom bg-steel text-bg flex items-center justify-center text-[12px] font-black">
                    {item.step}
                  </span>
                  <div className="flex flex-col gap-1 border-b border-border pb-3 w-full">
                    <span className="text-[13px] font-black text-navy">{item.title}</span>
                    <span className="text-[12px] text-gray leading-normal">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-bg border border-border rounded-custom p-5 shadow-custom-sm flex flex-col gap-4">
          <div className="flex flex-col gap-1 border-b border-border pb-3">
            <span className="text-[12px] text-steel font-black uppercase tracking-wider">Decision Output</span>
            <h3 className="text-[18px] font-black text-navy">검증 후 바로 내려야 하는 4가지 판정</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {decisionOutputs.map((item, index) => (
              <div key={item.title} className="border border-border rounded-custom p-4 bg-bg-subtle flex flex-col gap-2">
                <span className="text-[12px] font-black text-steel">판정 {index + 1}</span>
                <span className="text-[13.5px] font-black text-navy">{item.title}</span>
                <p className="text-[12px] text-gray leading-normal">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-navy text-bg rounded-custom p-5 md:p-6 shadow-custom-md flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-5 items-start">
            <div className="flex flex-col gap-2">
              <span className="text-[12px] text-bg/70 font-black uppercase tracking-wider">Final Scope Sheet</span>
              <h3 className="text-xl font-black tracking-tight">최종 화면 하단 산출물</h3>
              <p className="text-[13px] text-bg/75 leading-relaxed font-semibold">
                제출이 끝나면 범위 고정표, 리스크 레지스터, 예산 밴드, 다음 액션을 한 장의 검토 시트로 정리합니다.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[12px]">
              {['공사 범위', '예산 밴드', '리스크 등급', '다음 조치'].map((item) => (
                <div key={item} className="bg-bg/10 border border-bg/15 rounded-custom p-3 font-black">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => setActiveTab('request')}
              className="flex-1 bg-steel hover:bg-bg hover:text-navy text-bg px-5 py-3 rounded-custom text-[12px] font-black transition-all active:scale-95"
            >
              AI Native 검증 제출 시작
            </button>
            <button
              onClick={() => {
                setSelectedMenu('');
                setSelectedBudget('');
                setActiveTab('home');
              }}
              className="flex-1 bg-bg/10 hover:bg-bg/15 border border-bg/20 text-bg px-5 py-3 rounded-custom text-[12px] font-black transition-all active:scale-95"
            >
              견적 검토 홈으로 돌아가기
            </button>
          </div>
        </section>
      </div>
    );
  };

  const renderPerformanceTab = () => (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto py-4">
      <div className="bg-bg border border-border rounded-custom p-8 shadow-custom-sm flex flex-col gap-6">
        <h2 className="text-2xl font-black text-navy tracking-tight border-b border-border pb-4">
          ZEROS 사전검토 트랙 레코드
        </h2>
        <p className="text-[15px] text-gray leading-relaxed">
          과장된 홍보 실적을 지양하고, 투명한 검토 기준과 누적된 익명 설비 분석 데이터 포트폴리오를 숫자로만 신뢰성 있게 보고합니다.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
          <div className="bg-bg-subtle border border-border p-4.5 rounded-custom text-center shadow-sm">
            <span className="text-[12px] text-gray-light font-bold block uppercase tracking-wider mb-1">총 의뢰 건수</span>
            <span className="text-2xl font-black text-navy tracking-tight tabular-nums">246건</span>
          </div>
          <div className="bg-bg-subtle border border-border p-4.5 rounded-custom text-center shadow-sm">
            <span className="text-[12px] text-gray-light font-bold block uppercase tracking-wider mb-1">1차 검토 준수율</span>
            <span className="text-2xl font-black text-navy tracking-tight tabular-nums">98.4%</span>
          </div>
          <div className="bg-bg-subtle border border-border p-4.5 rounded-custom text-center shadow-sm">
            <span className="text-[12px] text-gray-light font-bold block uppercase tracking-wider mb-1">출장 실측 만족도</span>
            <span className="text-2xl font-black text-navy tracking-tight tabular-nums">96.8%</span>
          </div>
          <div className="bg-bg-subtle border border-border p-4.5 rounded-custom text-center shadow-sm">
            <span className="text-[12px] text-gray-light font-bold block uppercase tracking-wider mb-1">설계변경 감소율</span>
            <span className="text-2xl font-black text-navy tracking-tight tabular-nums">34.2%</span>
          </div>
        </div>

        <h3 className="text-[18px] font-extrabold text-navy mt-4 mb-2">대표적인 유틸리티 진단 영역</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-border p-4 rounded-custom flex flex-col gap-2">
            <span className="font-bold text-steel text-[15px]">A. 정밀 제조 배관 시스템 (Semi-conductor / Sanitary)</span>
            <p className="text-[12px] text-gray leading-normal">
              초순수 배관 내 박테리아 고임 구조 철저 제거 설계 진단 및 반도체 훅업 EP 자재 적합성 검토 48건 완료.
            </p>
          </div>
          <div className="border border-border p-4 rounded-custom flex flex-col gap-2">
            <span className="font-bold text-steel text-[15px]">B. 중대형 보일러 / 스팀 라인 에너지 진단</span>
            <p className="text-[12px] text-gray leading-normal">
              스팀 배관 워터해머 및 고온 응축수 열 회수 설계 타당성 평가, 에너지 손실 비용 최소화 62건 분석 완료.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRequestTab = () => (
    <div className="py-4">
      <RequestWizard
        onComplete={(newEst) => {
          router.push(`/request/complete?no=${newEst.estimate_no}&cat=${newEst.estimate_category}&name=${encodeURIComponent(newEst.customer_name)}&email=${encodeURIComponent(newEst.email)}`);
        }}
      />
    </div>
  );

  // 카테고리별 초정밀 엔지니어링 3D/2D 벡터 그래픽 시뮬레이터 구성 - §3.2
  const getCategoryVisuals = (menuKey: string) => {
      const matchKey = menuKey || '배관공사';
      
      if (matchKey === '배관공사') {
        return {
          bgGradient: 'from-[#0A162B] via-[#0E2343] to-[#173B6C]',
          badgeText: 'Industrial Piping & Fluidic Dynamics',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-cyan-400/70 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes pipeFlow {
                  0% { stroke-dashoffset: 20; }
                  100% { stroke-dashoffset: 0; }
                }
                .flow-line { stroke-dasharray: 4 6; animation: pipeFlow 1s linear infinite; }
              ` }} />
              <defs>
                <pattern id="grid-piping" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.1"/>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid-piping)" className="opacity-10" />
              <path d="M10,30 L60,30 Q70,30 70,40 L70,80" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10,30 L60,30 Q70,30 70,40 L70,80" stroke="#06b6d4" strokeWidth="1" className="flow-line" />
              <path d="M30,50 L80,50 Q90,50 90,60 L90,90" stroke="currentColor" strokeWidth="1.5" />
              <path d="M30,50 L80,50 Q90,50 90,60 L90,90" stroke="#f97316" strokeWidth="1" className="flow-line" />
              <circle cx="70" cy="30" r="3" fill="#06b6d4" className="animate-ping" />
              <circle cx="70" cy="30" r="2" fill="#06b6d4" />
              <circle cx="90" cy="50" r="2" fill="#f97316" />
              {/* 압력계 계기판 */}
              <circle cx="45" cy="30" r="6" fill="#0c162b" stroke="currentColor" strokeWidth="0.75" />
              <line x1="45" y1="30" x2="48" y2="26" stroke="#06b6d4" strokeWidth="1" />
              <text x="43" y="38" fill="currentColor" fontSize="2.5" className="font-mono">P</text>
            </svg>
          ),
          specText: 'Darcy-Weisbach 관마찰·Reynolds 유동 검증으로 관경 적정성 자동 진단'
        };
      } else if (matchKey === '장비설치') {
        return {
          bgGradient: 'from-[#081222] via-[#0E213D] to-[#1B3A64]',
          badgeText: 'Heavy Equipment Structural Load Dynamics',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-amber-500/70 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes pulseGrid {
                  0%, 100% { opacity: 0.2; }
                  50% { opacity: 0.6; }
                }
                .stress-node { animation: pulseGrid 2s infinite ease-in-out; }
              ` }} />
              {/* 3D 아이소메트릭 장비 프레임 */}
              <rect x="25" y="35" width="40" height="25" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <line x1="25" y1="35" x2="10" y2="20" stroke="currentColor" strokeDasharray="2 2" />
              <line x1="65" y1="35" x2="50" y2="20" stroke="currentColor" strokeDasharray="2 2" />
              {/* 응력 및 진동 분포선 */}
              <circle cx="45" cy="47" r="8" stroke="#f59e0b" strokeWidth="0.75" strokeDasharray="2 1" className="stress-node" />
              <circle cx="45" cy="47" r="14" stroke="#ef4444" strokeWidth="0.5" strokeDasharray="3 2" className="stress-node" />
              {/* 하중 분산 표시 벡터 화살표 */}
              <path d="M45,25 L45,34 M45,34 L42,31 M45,34 L48,31" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="40" y="22" fill="#f59e0b" fontSize="3" className="font-mono font-black">5.2 ton</text>
              <text x="27" y="58" fill="currentColor" fontSize="2.2" className="font-mono">FOUNDATION MESH OK</text>
            </svg>
          ),
          specText: '기초 패드 하중분산 응력(Stress Tensor)·펌프 진동 방진 가이드 자동 검토'
        };
      } else if (matchKey === 'Utility 배관') {
        return {
          bgGradient: 'from-[#071326] via-[#0E2442] to-[#1E4475]',
          badgeText: 'Steam & Clean Air Utility Thermodynamic Loop',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-cyan-300/70 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes steamVent {
                  0% { transform: translateY(0px) scale(0.8); opacity: 0; }
                  50% { opacity: 0.8; }
                  100% { transform: translateY(-8px) scale(1.2); opacity: 0; }
                }
                .steam-puff { animation: steamVent 1.5s infinite ease-out; }
              ` }} />
              {/* 스팀 루프 구조 */}
              <path d="M15,60 C25,25 75,25 85,60" stroke="currentColor" strokeWidth="1.5" />
              {/* 트랩 스테이션 */}
              <rect x="42" y="30" width="16" height="8" rx="1" fill="#071326" stroke="#06b6d4" strokeWidth="1" />
              <circle cx="50" cy="34" r="2.5" fill="#f43f5e" />
              {/* 스팀 응축수 배출 애니메이션 */}
              <path d="M50,37 L50,45" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 1" />
              <g className="steam-puff" style={{ transformOrigin: '50px 42px' }}>
                <circle cx="50" cy="48" r="2.5" fill="currentColor" opacity="0.5" />
                <circle cx="53" cy="50" r="1.5" fill="currentColor" opacity="0.4" />
              </g>
              <text x="36" y="26" fill="currentColor" fontSize="2.5" className="font-mono">STEAM TRAP ST.</text>
            </svg>
          ),
          specText: '보온 두께 대비 열손실·드립포켓 간격·압축공기 응축수 트랩 적정성 수치 검증'
        };
      } else if (matchKey === '공장증설') {
        return {
          bgGradient: 'from-[#0A182F] via-[#10274A] to-[#E0701A]/30',
          badgeText: 'Factory Capacity Expansion & Branch Tie-in',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-accent/80 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              {/* 기존 관로 (Dimmed) */}
              <line x1="10" y1="25" x2="90" y2="25" stroke="#94a3b8" strokeWidth="2" strokeOpacity="0.4" />
              {/* 분기 신설 관로 (Active Orange) */}
              <path d="M50,25 L50,75 L85,75" stroke="#E0701A" strokeWidth="2" />
              {/* 티인 조인트 결합부 */}
              <circle cx="50" cy="25" r="4.5" fill="#0A182F" stroke="#E0701A" strokeWidth="1.5" className="animate-pulse" />
              <circle cx="50" cy="25" r="2" fill="#E0701A" />
              {/* 크로스헤어 정밀 조준 스케일 */}
              <circle cx="50" cy="25" r="12" stroke="#E0701A" strokeWidth="0.5" strokeDasharray="3 3" strokeOpacity="0.7" />
              <line x1="50" y1="8" x2="50" y2="42" stroke="#E0701A" strokeWidth="0.25" strokeOpacity="0.5" />
              <line x1="33" y1="25" x2="67" y2="25" stroke="#E0701A" strokeWidth="0.25" strokeOpacity="0.5" />
              <text x="56" y="21" fill="#E0701A" fontSize="3.2" className="font-mono font-black">HOT-TAP 80A</text>
            </svg>
          ),
          specText: '무중단 Hot-Tapping 공법 적합성·증설부 유량 손실 압력 구배 매핑'
        };
      } else if (matchKey === '노후배관교체') {
        return {
          bgGradient: 'from-[#0C1B33] via-[#122A4E] to-[#204984]',
          badgeText: 'Corrosion Inspection & Piping Lifecycle Audit',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-emerald-400/80 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes erosionScan {
                  0%, 100% { stroke-dashoffset: 0; }
                  50% { stroke-dashoffset: 16; }
                }
                .scan-dash { stroke-dasharray: 4 4; animation: erosionScan 4s infinite linear; }
              ` }} />
              {/* 배관 단면도 */}
              <rect x="15" y="30" width="70" height="40" rx="2" stroke="currentColor" strokeWidth="1.5" />
              {/* 부식 한도 스캔 레이저 */}
              <line x1="30" y1="30" x2="30" y2="70" stroke="#f43f5e" strokeWidth="1" className="scan-dash" />
              <line x1="70" y1="30" x2="70" y2="70" stroke="#10b981" strokeWidth="1" className="scan-dash" />
              {/* 부식 노드와 정상 자재 경계면 */}
              <path d="M16,50 Q23,45 30,50 T44,50 Q51,55 58,50 T72,50 T84,50" stroke="#f43f5e" strokeWidth="0.75" strokeDasharray="2 2" />
              <text x="18" y="25" fill="#f43f5e" fontSize="2.8" className="font-mono">OLD: CARBON CORROSION</text>
              <text x="56" y="78" fill="#10b981" fontSize="2.8" className="font-mono">NEW: SUS316L 100%</text>
            </svg>
          ),
          specText: '스케일 잔존 두께 비파괴 데이터·유체 화학식 기반 최적 내식재(SUS316L) 치환 판단'
        };
      } else if (matchKey === '기계실개선') {
        return {
          bgGradient: 'from-[#061224] via-[#0D213E] to-[#193B6B]',
          badgeText: 'Mechanical Room Cavitation & Flow Optimization',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-teal-400/80 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes vortexSpin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                .vortex-group { animation: vortexSpin 8s infinite linear; transform-origin: 50px 50px; }
              ` }} />
              {/* 펌프 하우징 하이테크 그래픽 */}
              <circle cx="50" cy="50" r="24" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="50" cy="50" r="10" stroke="currentColor" strokeWidth="0.75" />
              <g className="vortex-group">
                <line x1="50" y1="50" x2="50" y2="28" stroke="#0d9488" strokeWidth="1" />
                <line x1="50" y1="50" x2="72" y2="50" stroke="#0d9488" strokeWidth="1" />
                <line x1="50" y1="50" x2="28" y2="50" stroke="#0d9488" strokeWidth="1" />
                <line x1="50" y1="50" x2="50" y2="72" stroke="#0d9488" strokeWidth="1" />
                <path d="M38,38 A16,16 0 0,1 62,38" stroke="#0d9488" strokeWidth="1" fill="none" />
                <path d="M62,62 A16,16 0 0,1 38,62" stroke="#0d9488" strokeWidth="1" fill="none" />
              </g>
              <text x="32" y="21" fill="currentColor" fontSize="2.8" className="font-mono">ECCENTRIC REDUCER OK</text>
            </svg>
          ),
          specText: '흡입측 캐비테이션 차단 편심이경관·복합 매니폴드 균등 압력 유체 검토'
        };
      } else if (matchKey === '생산설비 배관 연결') {
        return {
          bgGradient: 'from-[#091529] via-[#0F2241] to-[#1E4473]',
          badgeText: 'Ultra-High Purity (UHP) Cleanroom Hook-Up',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-sky-400/80 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              {/* 반도체 가스 판넬 / 오비탈 용접 시각화 */}
              <rect x="20" y="20" width="60" height="60" rx="2" stroke="currentColor" strokeWidth="1" />
              <line x1="20" y1="40" x2="80" y2="40" stroke="currentColor" strokeWidth="0.75" />
              <line x1="20" y1="60" x2="80" y2="60" stroke="currentColor" strokeWidth="0.75" />
              <circle cx="35" cy="40" r="4" fill="#091529" stroke="#38bdf8" strokeWidth="1.5" />
              <circle cx="65" cy="60" r="4" fill="#091529" stroke="#38bdf8" strokeWidth="1.5" />
              {/* 초미세 여과 필터 유닛 */}
              <path d="M50,15 L50,85" stroke="#38bdf8" strokeWidth="1.5" />
              <rect x="44" y="44" width="12" height="12" rx="0.5" fill="#091529" stroke="#10b981" strokeWidth="1" />
              <text x="47" y="52" fill="#10b981" fontSize="2.8" className="font-mono font-black">0.01㎛</text>
              <text x="25" y="15" fill="currentColor" fontSize="2.8" className="font-mono">UHP GAS MANIFOLD</text>
            </svg>
          ),
          specText: '초순수(DIW)·반도체 특수가스 크린룸 오비탈 용접 EP등급 자재 타당성 심사'
        };
      } else if (matchKey === 'CAPEX 개·증설 검토') {
        return {
          bgGradient: 'from-[#0B1E35] via-[#152E51] to-[#E0701A]/20',
          badgeText: 'CAPEX Engineering Cost Valuation & Risk Audit',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-accent/80 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes chartMove {
                  0%, 100% { stroke-dashoffset: 0; }
                  50% { stroke-dashoffset: 5; }
                }
                .trend-line { stroke-dasharray: 100; stroke-dashoffset: 0; animation: chartMove 5s infinite ease-in-out; }
              ` }} />
              {/* 축 선 */}
              <line x1="15" y1="85" x2="85" y2="85" stroke="currentColor" strokeWidth="1.2" />
              <line x1="15" y1="15" x2="15" y2="85" stroke="currentColor" strokeWidth="1.2" />
              {/* 시공사 견적 버블 추이선 */}
              <path d="M15,55 L35,20 L55,48 L75,15 L85,25" stroke="#f43f5e" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.7" />
              {/* ZEROS 정직 AI 단가 보정선 */}
              <path d="M15,75 L35,60 L55,65 L75,50 L85,52" stroke="#E0701A" strokeWidth="2.2" className="trend-line" />
              <circle cx="75" cy="50" r="3.5" fill="#0B1E35" stroke="#E0701A" strokeWidth="1.5" />
              <text x="18" y="48" fill="#f43f5e" fontSize="2.8" className="font-mono">INFLATED PROPOSALS (BUBBLE)</text>
              <text x="32" y="74" fill="#E0701A" fontSize="3" className="font-mono font-black">ZEROS AI AUDIT REFERENCE</text>
            </svg>
          ),
          specText: '유사 1군 실거래 n건 DB 기반 정량적 CAPEX 버블 억제 분석'
        };
      } else if (matchKey === 'spool') {
        return {
          bgGradient: 'from-[#0A162B] via-[#0E2343] to-[#173B6C]',
          badgeText: 'Pipe Spool Prefabrication & Shop Welding',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-cyan-400/70 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spoolFlow { 0% { stroke-dashoffset: 20; } 100% { stroke-dashoffset: 0; } }
                .spool-flow { stroke-dasharray: 4 6; animation: spoolFlow 1.2s linear infinite; }
              ` }} />
              {/* 플랜지가 달린 사전제작 스풀 */}
              <path d="M20,40 L55,40 Q65,40 65,50 L65,78" stroke="currentColor" strokeWidth="1.5" />
              <path d="M20,40 L55,40 Q65,40 65,50 L65,78" stroke="#06b6d4" strokeWidth="1" className="spool-flow" />
              {/* 플랜지 단부 */}
              <line x1="18" y1="34" x2="18" y2="46" stroke="currentColor" strokeWidth="2" />
              <line x1="59" y1="72" x2="71" y2="72" stroke="currentColor" strokeWidth="2" transform="rotate(90 65 78)" />
              <line x1="59" y1="78" x2="71" y2="78" stroke="currentColor" strokeWidth="2" />
              {/* 용접 비드 노드 */}
              <circle cx="55" cy="40" r="2" fill="#f97316" className="animate-pulse" />
              <circle cx="65" cy="50" r="2" fill="#f97316" className="animate-pulse" />
              <text x="20" y="30" fill="currentColor" fontSize="2.8" className="font-mono">ISO SPOOL · RT PASS</text>
            </svg>
          ),
          specText: 'ISO 도면 기반 스풀 분할 및 팹샵 사전 용접·비파괴(RT/PMI) 검사 통제 환경 모듈 제작 검증'
        };
      } else if (matchKey === 'skid') {
        return {
          bgGradient: 'from-[#081222] via-[#0E213D] to-[#1B3A64]',
          badgeText: 'Skid-Mounted Package Module & FAT',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-amber-500/70 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              {/* 스키드 프레임 */}
              <rect x="22" y="55" width="56" height="22" rx="1" stroke="currentColor" strokeWidth="1.5" />
              <line x1="22" y1="71" x2="78" y2="71" stroke="currentColor" strokeWidth="0.6" />
              {/* 탑재 장비: 펌프/탱크/계장 */}
              <circle cx="36" cy="46" r="7" stroke="#f59e0b" strokeWidth="1.2" />
              <line x1="36" y1="46" x2="36" y2="40" stroke="#f59e0b" strokeWidth="1" className="animate-[spin_4s_linear_infinite]" style={{ transformOrigin: '36px 46px' }} />
              <rect x="52" y="38" width="14" height="17" rx="1" stroke="currentColor" strokeWidth="1" />
              <path d="M43,50 L52,50" stroke="#06b6d4" strokeWidth="1" strokeDasharray="2 1.5" />
              <text x="24" y="34" fill="#f59e0b" fontSize="2.8" className="font-mono font-bold">FAT TESTED</text>
            </svg>
          ),
          specText: '단일 프레임 패키지 모듈 공장 조립 및 계장·제어 사전 시운전(FAT) 검증 후 현장 반입 표준화'
        };
      } else if (matchKey === 'structure') {
        return {
          bgGradient: 'from-[#0A182F] via-[#10274A] to-[#E0701A]/25',
          badgeText: 'Steel Structure Shop Fabrication',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-accent/80 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              {/* 철구조 가대/트러스 프레임 */}
              <rect x="20" y="25" width="60" height="55" stroke="currentColor" strokeWidth="1.5" />
              <line x1="20" y1="25" x2="80" y2="80" stroke="#E0701A" strokeWidth="1" />
              <line x1="80" y1="25" x2="20" y2="80" stroke="#E0701A" strokeWidth="1" />
              <line x1="20" y1="52" x2="80" y2="52" stroke="currentColor" strokeWidth="0.8" />
              {/* 볼트 접합 노드 */}
              <circle cx="20" cy="25" r="2.2" fill="#0A182F" stroke="#E0701A" strokeWidth="1" />
              <circle cx="80" cy="25" r="2.2" fill="#0A182F" stroke="#E0701A" strokeWidth="1" />
              <circle cx="20" cy="80" r="2.2" fill="#0A182F" stroke="#E0701A" strokeWidth="1" />
              <circle cx="80" cy="80" r="2.2" fill="#0A182F" stroke="#E0701A" strokeWidth="1" />
              <text x="22" y="20" fill="#E0701A" fontSize="2.8" className="font-mono font-black">SHOP DRAWING ±1mm</text>
            </svg>
          ),
          specText: '구조 도면 기반 강재 절단·천공·용접 공장 가공 및 도장·아연도금 후 현장 볼팅 조립 표준화'
        };
      } else if (matchKey === 'small') {
        return {
          bgGradient: 'from-[#071328] via-[#0D2140] to-[#1B3E6E]',
          badgeText: 'Instant Online Review Algorithm',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-cyan-400 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              <rect x="20" y="20" width="60" height="60" stroke="currentColor" strokeWidth="1" strokeDasharray="5 5" />
              <circle cx="50" cy="50" r="16" stroke="currentColor" strokeWidth="1.5" />
              <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="0.5" />
              <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="0.5" />
              <text x="25" y="15" fill="currentColor" fontSize="3" className="font-mono">FAST AUDIT LAYOUT</text>
            </svg>
          ),
          specText: '제출된 현장 사진 및 치수 정보 기준의 간이 관내 마찰 손실값 연산 및 24시간 내 초고속 권장 사양 도출'
        };
      } else if (matchKey === 'medium') {
        return {
          bgGradient: 'from-[#08152D] via-[#10274C] to-[#1E4A83]',
          badgeText: 'Laser Real-Measurement & Calibration',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-amber-500 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              {/* 3차원 좌표계 및 레이저 스캔 */}
              <path d="M20,70 L50,45 L80,70 M50,45 L50,15" stroke="currentColor" strokeWidth="1" />
              <circle cx="50" cy="45" r="4.5" fill="#08152D" stroke="#f59e0b" strokeWidth="1.5" className="animate-ping" />
              <circle cx="50" cy="45" r="2" fill="#f59e0b" />
              <line x1="50" y1="45" x2="25" y2="65" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 1" />
              <line x1="50" y1="45" x2="75" y2="65" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 1" />
              <text x="22" y="15" fill="currentColor" fontSize="3" className="font-mono">3D SPACE MEASURE</text>
            </svg>
          ),
          specText: '배테랑 실측 엔지니어 현장 파견을 통한 주요 간섭 반입로 레이저 정밀 계측 및 시공 장애 원천 봉쇄 검토'
        };
      } else if (matchKey === 'large') {
        return {
          bgGradient: 'from-[#0A162B] via-[#112543] to-[#E0701A]/20',
          badgeText: 'Total Enterprise CAPEX Architecture PM',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-accent/80 stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              {/* 복잡 프로젝트 상관 매트릭스 그리드 */}
              <circle cx="30" cy="30" r="5" fill="#0A162B" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="70" cy="30" r="5" fill="#0A162B" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="50" cy="70" r="5" fill="#0A162B" stroke="currentColor" strokeWidth="1.5" />
              <line x1="35" y1="30" x2="65" y2="30" stroke="currentColor" strokeWidth="1" />
              <line x1="30" y1="35" x2="45" y2="65" stroke="#E0701A" strokeWidth="1.5" className="animate-pulse" />
              <line x1="70" y1="35" x2="55" y2="65" stroke="currentColor" strokeWidth="1" />
              <text x="25" y="15" fill="currentColor" fontSize="3" className="font-mono">PM COST RELATION MATRIX</text>
            </svg>
          ),
          specText: '대단위 설비 투자를 조망하는 기획 VE(Value Engineering) 분석 및 공종별 실행 예산 가이드 라인 종합 통제'
        };
      } else {
        return {
          bgGradient: 'from-[#0B1E35] via-[#0F2036] to-[#1A385E]',
          badgeText: 'ZEROS Engineering Standard Standard Review',
          svgBackdrop: (
            <svg className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.25] text-white stroke-2 pointer-events-none select-none" fill="none" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="32" stroke="currentColor" />
              <circle cx="50" cy="50" r="12" stroke="currentColor" />
              <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" />
              <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" />
            </svg>
          ),
          specText: 'ZEROS 엔지니어 매니저 직접 분석을 통한 최적의 예상견적 및 검토 방향 수립 배정'
        };
      }
    };

    const getDynamicMetrics = (menuKey: string) => {
      const matchKey = menuKey || '배관공사';
      switch (matchKey) {
        case '배관공사':
          return {
            sampleCount: 74,
            confidence: 99.8,
            bubbleRate: 28.4,
            accentBg: 'bg-cyan-500/5',
            accentText: 'text-cyan-600',
            accentBorder: 'border-cyan-200/80',
            badgeBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-700',
            bubbleWidth: 'w-[28.4%]',
            checklist: ['ASME/KS 자재 마진 필터링', 'Darcy-Weisbach 손실 수치 검증', '1군 표준 품셈 공기 산출']
          };
        case '장비설치':
          return {
            sampleCount: 48,
            confidence: 99.6,
            bubbleRate: 22.1,
            accentBg: 'bg-amber-500/5',
            accentText: 'text-amber-600',
            accentBorder: 'border-amber-200/80',
            badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-700',
            bubbleWidth: 'w-[22.1%]',
            checklist: ['양중 경로·크레인 간섭 검토', '방진 패드 하중분산 적합성', '고소 안전비계·방진 스펙 필터링']
          };
        case 'Utility 배관':
          return {
            sampleCount: 62,
            confidence: 99.5,
            bubbleRate: 24.6,
            accentBg: 'bg-sky-500/5',
            accentText: 'text-sky-600',
            accentBorder: 'border-sky-200/80',
            badgeBg: 'bg-sky-500/10 border-sky-500/20 text-sky-700',
            bubbleWidth: 'w-[24.6%]',
            checklist: ['보온 열손실율 열역학 계산', '응축수 트랩 위치 검토', '차단밸브 조작 동선 매핑']
          };
        case '공장증설':
          return {
            sampleCount: 35,
            confidence: 99.2,
            bubbleRate: 31.5,
            accentBg: 'bg-accent/5',
            accentText: 'text-accent',
            accentBorder: 'border-accent/20',
            badgeBg: 'bg-accent/10 border-accent/20 text-accent-700',
            bubbleWidth: 'w-[31.5%]',
            checklist: ['무중단 Hot-tapping 리스크 필터링', '증설 전후 유량 차압 시뮬레이션', '분기 조인트 화학 안정성 검증']
          };
        case '노후배관교체':
          return {
            sampleCount: 51,
            confidence: 99.7,
            bubbleRate: 26.8,
            accentBg: 'bg-emerald-500/5',
            accentText: 'text-emerald-600',
            accentBorder: 'border-emerald-200/80',
            badgeBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700',
            bubbleWidth: 'w-[26.8%]',
            checklist: ['스케일 비파괴 잔존수명 검증', '최적 내식재(SUS) 규격 치환', '안전 세정·배출 노무 필터링']
          };
        case '기계실개선':
          return {
            sampleCount: 42,
            confidence: 99.9,
            bubbleRate: 29.3,
            accentBg: 'bg-teal-500/5',
            accentText: 'text-teal-600',
            accentBorder: 'border-teal-200/80',
            badgeBg: 'bg-teal-500/10 border-teal-500/20 text-teal-700',
            bubbleWidth: 'w-[29.3%]',
            checklist: ['편심 이경관 캐비테이션 차단', '매니폴드 균등 압력 분배 분석', '루프 반입구·간섭 유효성 검토']
          };
        case '생산설비 배관 연결':
          return {
            sampleCount: 45,
            confidence: 99.9,
            bubbleRate: 34.2,
            accentBg: 'bg-indigo-500/5',
            accentText: 'text-indigo-600',
            accentBorder: 'border-indigo-200/80',
            badgeBg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700',
            bubbleWidth: 'w-[34.2%]',
            checklist: ['초순수/UHP EP 자재 등급 검증', '오비탈 용접 노무 과다 필터링', '0.01㎛ 필터·감압밸브 배치']
          };
        case 'CAPEX 개·증설 검토':
          return {
            sampleCount: 88,
            confidence: 99.5,
            bubbleRate: 37.6,
            accentBg: 'bg-[#0f1e35]/5',
            accentText: 'text-navy',
            accentBorder: 'border-[#0f1e35]/15',
            badgeBg: 'bg-[#0f1e35]/10 border-[#0f1e35]/20 text-navy',
            bubbleWidth: 'w-[37.6%]',
            checklist: ['WBS 공종별 예산 상한 매핑', '유사 1군 실거래 정량 대조', 'CAPEX 초과 리스크 조기 감지']
          };
        case 'spool':
          return {
            sampleCount: 68,
            confidence: 99.6,
            bubbleRate: 50.0,
            accentBg: 'bg-cyan-500/5',
            accentText: 'text-cyan-600',
            accentBorder: 'border-cyan-200/80',
            badgeBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-700',
            bubbleWidth: 'w-[50%]',
            checklist: ['ISO 도면 운반·조립 단위 스풀 분할 최적화', '팹샵 통제 환경 용접 및 RT/PMI 비파괴 검사 기록', '스풀 식별 마킹 기반 현장 무오류 조립 시퀀스 매핑']
          };
        case 'skid':
          return {
            sampleCount: 54,
            confidence: 99.7,
            bubbleRate: 40.0,
            accentBg: 'bg-amber-500/5',
            accentText: 'text-amber-600',
            accentBorder: 'border-amber-200/80',
            badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-700',
            bubbleWidth: 'w-[40%]',
            checklist: ['단일 프레임 장비·배관·계장 3D 통합 배치 설계', '공장 사전 시운전(FAT) 기밀·제어 로직 검증', '반입구 치수·하중·유틸리티 인터페이스 정합성 대조']
          };
        case 'structure':
          return {
            sampleCount: 47,
            confidence: 99.5,
            bubbleRate: 35.0,
            accentBg: 'bg-accent/5',
            accentText: 'text-accent',
            accentBorder: 'border-accent/20',
            badgeBg: 'bg-accent/10 border-accent/20 text-accent',
            bubbleWidth: 'w-[35%]',
            checklist: ['Shop Drawing 기반 강재 절단·천공 ±1mm 정밀 가공', '하중 기준 용접·치수 검사 구조 안전성 검증', '도장·아연도금 표면처리 후 현장 볼팅 조립 가이드']
          };
        case 'small':
          return {
            sampleCount: 124,
            confidence: 99.4,
            bubbleRate: 18.2,
            accentBg: 'bg-cyan-500/5',
            accentText: 'text-cyan-600',
            accentBorder: 'border-cyan-200/80',
            badgeBg: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-700',
            bubbleWidth: 'w-[18.2%]',
            checklist: ['현장 사진 매핑을 통한 기본 노무량 분석', '온라인 제출 치수 기준 관 마찰 유속 유동 검증', '자재 교체용 간이 스펙 비교 정합성 매핑']
          };
        case 'medium':
          return {
            sampleCount: 96,
            confidence: 99.8,
            bubbleRate: 27.5,
            accentBg: 'bg-amber-500/5',
            accentText: 'text-amber-600',
            accentBorder: 'border-amber-200/80',
            badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-700',
            bubbleWidth: 'w-[27.5%]',
            checklist: ['레이저 3D ISO 실측 실 데이터 100% 매핑', '기계실 물리 간섭 및 구조 하중 설계 타당성 대조', '현장 가동중단(셧다운) 스케줄 리스크 완화 매핑']
          };
        case 'large':
          return {
            sampleCount: 26,
            confidence: 99.7,
            bubbleRate: 35.4,
            accentBg: 'bg-accent/5',
            accentText: 'text-accent',
            accentBorder: 'border-accent/20',
            badgeBg: 'bg-accent/10 border-accent/20 text-accent-700',
            bubbleWidth: 'w-[35.4%]',
            checklist: ['대단위 CAPEX 공종 실행 한도(WBS) 종합 설계', '기획 VE(Value Engineering) 유사 실거래 대조', '입찰 시공사 복수 견적서 1:1 동일 기준 심사']
          };
        default:
          return {
            sampleCount: 30,
            confidence: 99.0,
            bubbleRate: 25.0,
            accentBg: 'bg-[#1e4d8c]/5',
            accentText: 'text-steel',
            accentBorder: 'border-[#1e4d8c]/20',
            badgeBg: 'bg-[#1e4d8c]/10 border-[#1e4d8c]/20 text-steel',
            bubbleWidth: 'w-[25%]',
            checklist: ['ZEROS 표준 품셈 노무 분석 기준 적용', '실거래 가격 단가 오차 범위 대조 확인', '과도 인건비 거품 및 설계 위험 조기 제거']
          };
      }
    };

  const renderManualDetail = (key: string) => {
    const manual = manualData[key] || manualData['배관공사'];
    const visuals = getCategoryVisuals(key);
    const metrics = getDynamicMetrics(key);

    return (
      <div key={key} className="flex flex-col gap-6 max-w-4xl mx-auto py-2 animate-in fade-in duration-300">

        {/* 뒤로가기 — 견적 검토 홈(랜딩)으로 복귀 */}
        <button
          onClick={() => { setSelectedMenu(''); setSelectedBudget(''); setActiveTab('home'); }}
          style={{ touchAction: 'manipulation' }}
          className="self-start inline-flex items-center gap-1.5 text-[12px] font-bold text-gray hover:text-navy bg-bg border border-border hover:bg-bg-subtle px-3 py-1.5 rounded-custom transition-all duration-150 active:scale-95 cursor-pointer shadow-sm -mb-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          견적 검토 홈으로
        </button>

        {/* ============================================================
            상단 (TOP) — 주제 + 데이터분석 + AI툴 신뢰 작업 FLOW
            ============================================================ */}
        <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm flex flex-col gap-4 relative overflow-hidden">

          {/* 섹션 식별 라벨 */}
          <div className="flex items-center justify-between gap-2 select-none">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-accent rounded-full" />
              <span className="text-[12px] font-bold text-navy uppercase tracking-wider">견적 작업 FLOW</span>
            </div>
            <span className="text-[12px] font-mono font-bold text-gray-light tracking-wider">REQUEST · DATA · AI · SUBMIT</span>
          </div>

          {/* 7단계 견적 작업 시계열 타임라인 (애니메이션) */}
          <div className="bg-bg-subtle/70 border border-border/70 rounded-custom px-3 py-2.5 select-none overflow-x-auto no-scrollbar">
            <div className="flex items-start justify-between gap-1 min-w-[560px] md:min-w-0">
              {['견적 요청', '데이터 수집', '데이터 가공', '데이터 정제', 'AI툴 검증', '적합성 검토', '고객 제출'].map((label, i, arr) => (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-black shadow-sm border-2 animate-[pulse_3s_infinite] ${
                        i === arr.length - 1 ? 'bg-success text-bg border-success' : 'bg-bg text-steel border-steel/40'
                      }`}
                      style={{ animationDelay: `${i * 0.3}s` }}
                    >
                      {i + 1}
                    </div>
                    <span className="text-[12px] font-bold text-navy leading-none whitespace-nowrap">{label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-accent/50 shrink-0 mt-[5px] animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            
            {/* Box 1: Engineering Target & Information Box */}
            <div className={`relative overflow-hidden bg-bg text-navy p-5 rounded-custom border ${metrics.accentBorder} flex flex-col justify-between gap-4 transition-all shadow-sm`}>
              {/* 하이 테크 백그라운드 그리드 레이아웃 (라이트 버전) */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.007)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.007)_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />
              <div className={`absolute inset-0 ${metrics.accentBg} opacity-20 pointer-events-none`} />
              
              <div className="flex flex-col gap-4 z-10 relative">
                {/* 타이틀 및 핵심 엔지니어링 문제 정의 (상단) */}
                <div className="flex flex-col gap-2">
                  <h2 className="text-[18px] md:text-[18px] font-black tracking-tight leading-tight text-navy select-none">
                    {manual.title}
                  </h2>
                  <p className="text-[12px] text-gray leading-snug font-semibold font-sans mt-0.5">
                    {manual.problemDefinition}
                  </p>
                </div>

                {/* 공종 배지 + 데이터 AI 정직 검증 수치 대시보드 */}
                <div className="flex flex-col gap-2">
                  <span className={`self-start text-[12px] tracking-widest uppercase font-black px-2.5 py-1 rounded-custom shadow-inner ${metrics.badgeBg}`}>
                    {visuals.badgeText}
                  </span>
                  <div className="grid grid-cols-3 gap-2.5 bg-bg-subtle/80 border border-border/70 p-2.5 rounded-custom shadow-inner select-none">
                  <div className="text-center flex flex-col justify-center">
                    <span className="text-[12px] text-gray-light font-bold block uppercase tracking-wide break-keep leading-tight mb-0.5">AI 분석 신뢰도</span>
                    <span className="text-[15px] font-black text-navy tracking-tight tabular-nums">{metrics.confidence}%</span>
                  </div>
                  <div className="text-center flex flex-col justify-center border-l border-border/60">
                    <span className="text-[12px] text-gray-light font-bold block uppercase tracking-wide break-keep leading-tight mb-0.5">실거래 표준 품셈</span>
                    <span className="text-[15px] font-black text-success tracking-tight">100% 매핑</span>
                  </div>
                  <div className="text-center flex flex-col justify-center border-l border-border/60">
                    <span className="text-[12px] text-gray-light font-bold block uppercase tracking-wide break-keep leading-tight mb-0.5">평균 거품 절감</span>
                    <span className="text-[15px] font-black text-accent tracking-tight tabular-nums">-{metrics.bubbleRate}%</span>
                  </div>
                </div>
              </div>
              </div>

            </div>

            {/* Box 2: Agent AI Technical Simulation & Honest pricing */}
            <div className="relative overflow-hidden bg-bg text-navy p-5 rounded-custom border border-border flex flex-col justify-between gap-4 transition-all shadow-sm">
              {/* 하이 테크 백그라운드 그리드 레이아웃 */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.007)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.007)_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />
              
              {/* 동적 카테고리 매핑 초정밀 애니메이션 SVG 백드롭 */}
              <div className="absolute right-2 -bottom-2 w-72 h-72 opacity-[0.16] pointer-events-none select-none">
                {visuals.svgBackdrop}
              </div>

              {/* Agent AI 정직 견적 신뢰 코어 패널 */}
              <div className="flex flex-col gap-3 z-10 select-none">
                {/* 타이틀 (아이콘 제거, 폰트 좌측 제목과 동일) + 스펙 */}
                <div className="flex flex-col gap-1">
                  <span className="text-[18px] md:text-[18px] font-black text-navy tracking-tight leading-tight">
                    ZEROS Agent AI 정직 단가 교정 모니터
                  </span>
                  <span className="text-[12px] text-gray/80 font-bold mt-0.5 leading-relaxed">
                    {visuals.specText}
                  </span>
                </div>

                {/* 정밀 공종별 체크사항 목록 */}
                <ul className="flex flex-col gap-1 mt-0">
                  {metrics.checklist.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[12px] text-gray font-semibold leading-tight">
                      <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                {/* 정직·신뢰 실시간 교정 비교 바 (하단) + 버블 제로 필터링 배지 우상단 */}
                <div className="relative flex flex-col gap-2 bg-bg-subtle/80 border border-border/60 p-2.5 rounded-custom shadow-inner mt-1">
                  <span className="absolute -top-2 right-2 bg-[#10b981]/10 border border-[#10b981]/20 text-success text-[12px] px-1.5 py-0.5 rounded-full font-black shadow-sm">
                    버블 제로 필터링
                  </span>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[12px] font-bold text-gray">
                      <span>시공사 평균 거품 청구 (Average Inflated Bid)</span>
                      <span className="text-danger font-mono font-bold tabular-nums">135%</span>
                    </div>
                    <div className="w-full bg-border/40 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-danger/80 h-full w-[80%] rounded-full" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 border-t border-border/50 pt-2">
                    <div className="flex justify-between text-[12px] font-black text-navy">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-success animate-pulse" />
                        ZEROS AI 교정 단가 (Honest Calibrated Cost)
                      </span>
                      <span className="text-success font-mono font-bold tabular-nums">100% (버블 0%)</span>
                    </div>
                    <div className="w-full bg-border/40 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-success h-full w-[55%] rounded-full animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* ============================================================
            중단 (MIDDLE) — 좌: 작업 준비사항 / 우: 작업 SOP
            ============================================================ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

          {/* 좌측 박스: 작업 준비사항 */}
          <div className="bg-bg border border-border p-6 rounded-custom shadow-custom-sm flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-3 select-none">
              <div className="flex items-center gap-2 text-navy">
                <BookOpen className="w-4 h-4 text-steel" />
                <span className="font-extrabold text-[15px]">작업 준비사항</span>
              </div>
              <span className="text-[12px] font-black text-steel bg-steel/10 border border-steel/15 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Prepare</span>
            </div>
            <p className="text-[12px] text-gray-light font-semibold leading-normal -mt-1">정확한 진단을 위해 아래 자료를 사전에 준비해 주세요.</p>
            <ul className="flex flex-col gap-3">
              {manual.preparationDocs.map((doc, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-[12px] text-gray font-medium">
                  <CheckCircle2 className="w-4 h-4 text-steel shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{doc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 우측 박스: 작업 SOP (표준 작업 절차) */}
          <div className="bg-bg border border-border p-6 rounded-custom shadow-custom-sm flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-3 select-none">
              <div className="flex items-center gap-2 text-navy">
                <FileCheck className="w-4 h-4 text-accent" />
                <span className="font-extrabold text-[15px]">작업 SOP</span>
              </div>
              <span className="text-[12px] font-black text-accent bg-accent/10 border border-accent/15 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Procedure</span>
            </div>
            <ol className="flex flex-col gap-0 relative">
              {manual.sop.map((step, idx) => (
                <li key={idx} className="flex items-stretch gap-3 group">
                  {/* 타임라인 인디케이터 */}
                  <div className="flex flex-col items-center shrink-0">
                    <span className="w-6 h-6 rounded-full bg-navy text-bg text-[12px] font-black flex items-center justify-center shadow-sm shrink-0 z-10">
                      {idx + 1}
                    </span>
                    {idx < manual.sop.length - 1 && (
                      <span className="w-[1.5px] flex-1 bg-border my-0.5" />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 pb-4">
                    <span className="text-[12px] font-black text-accent uppercase tracking-widest leading-none">{step.phase}</span>
                    <span className="text-[13.5px] font-bold text-navy leading-tight mt-0.5">{step.title}</span>
                    <span className="text-[12px] text-gray font-medium leading-normal mt-0.5">{step.action}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* ============================================================
            하단 (BOTTOM) — 결과 지표 & Benefit 효과 증빙
            ============================================================ */}
        <div className="bg-bg border border-border p-6.5 rounded-custom shadow-custom-sm flex flex-col gap-5">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-3.5 select-none">
            <div className="flex items-center gap-2">
              <span className="w-1 h-4 bg-success rounded-full" />
              <h3 className="text-[15px] font-extrabold text-navy">결과 지표 &amp; Benefit 효과 증빙</h3>
            </div>
            <span className="text-[12px] font-black text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Proven
            </span>
          </div>

          {/* Benefit 효과 카드 (정량 증빙) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {manual.benefits.map((b, idx) => (
              <div key={idx} className="bg-bg-subtle/70 border border-border p-4.5 rounded-custom flex flex-col gap-1.5 relative overflow-hidden shadow-sm hover:shadow-custom-md transition-all">
                <div className="absolute right-0 top-0 w-16 h-16 bg-[radial-gradient(circle_at_top_right,rgba(31,122,77,0.06),transparent_70%)] pointer-events-none" />
                <span className="text-2xl font-black text-navy tracking-tight tabular-nums leading-none">{b.metric}</span>
                <span className="text-[12px] font-extrabold text-steel leading-none mt-1">{b.label}</span>
                <span className="text-[12px] text-gray font-medium leading-normal mt-1">{b.desc}</span>
              </div>
            ))}
          </div>

          {/* 최종 제공 리포트 (산출물) */}
          <div className="bg-bg-subtle/50 border border-border/80 rounded-custom p-4.5 flex flex-col gap-3">
            <div className="flex items-center gap-2 select-none">
              <FileCheck className="w-3.5 h-3.5 text-steel" />
              <span className="text-[12px] font-extrabold text-navy uppercase tracking-wide">최종 제공 리포트</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {manual.deliverables.map((del, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-bg border border-border/70 rounded-custom px-3 py-2.5">
                  <span className="w-4 h-4 rounded-full bg-navy text-bg text-[12px] font-black flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                  <span className="text-[12px] text-gray font-medium leading-snug">{del}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 상세 유의점 */}
          <div className="border-t border-border pt-4 flex flex-col gap-2">
            <span className="text-[12px] font-black text-navy uppercase tracking-wide">진단 프로세스 상세 유의점</span>
            <p className="text-[12px] text-gray leading-relaxed font-medium">{manual.details}</p>
            <span className="text-[12px] text-gray-light font-medium block mt-1">
              * 제공해주신 자료가 불충분할 경우 담당 엔지니어가 추가 자료를 요청(전화/이메일)할 수 있습니다.
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderLandingDashboard = () => {
    const landingTrades = [
      '배관공사',
      '장비설치',
      'Utility 배관',
      '공장증설',
      '노후배관교체',
      '기계실개선',
      '생산설비 배관 연결',
      'CAPEX 개·증설 검토'
    ];
    const activeTradeName = landingTrades[activeTradeIdx];
    const activeManual = manualData[activeTradeName];
    const activeMetrics = getDynamicMetrics(activeTradeName);
    const activeVisuals = getCategoryVisuals(activeTradeName);

    return (
      <div className="flex flex-col gap-4 max-w-4xl mx-auto">

      {/* ============================================================
          핵심 주제 히어로 — 무료 출장 견적 컨설팅 + 35년 PM 신뢰
          ============================================================ */}
      <section className="relative overflow-hidden bg-bg border border-border rounded-custom shadow-custom-sm p-5 md:p-7 flex flex-col gap-4 select-none">
        {/* 밝고 신뢰감 있는 맥킨지 톤 배경 */}
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(245,247,250,0.9),rgba(255,255,255,0)_55%)] pointer-events-none" />
        <div className="absolute right-0 top-0 w-64 h-64 bg-[radial-gradient(circle_at_top_right,rgba(30,77,140,0.06),transparent_70%)] pointer-events-none" />
        <div className="absolute left-0 bottom-0 h-1 w-full bg-gradient-to-r from-steel via-accent to-transparent opacity-70 pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-3.5">
          {/* 주요 CTA(하나) + 보조 버튼 — 시선 집중 */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
            <button
              onClick={() => setActiveTab('request')}
              style={{
                touchAction: 'manipulation',
                fontFamily: '"Malgun Gothic", "맑은 고딕", "Noto Sans KR", sans-serif'
              }}
              className="flex-1 inline-flex min-h-[54px] items-center justify-center gap-2.5 bg-[#F97316] text-bg text-[18px] md:text-[18px] font-bold px-4 py-2.5 rounded-custom tracking-normal shadow-sm shadow-orange-500/20 whitespace-nowrap antialiased transition-all hover:bg-[#EA670F] active:scale-95 cursor-pointer"
            >
              <FileCheck className="w-6 h-6 shrink-0" />
              <span className="hidden sm:inline">AI Native 검증 제출하기</span>
              <span className="sm:hidden">AI Native 검증 제출</span>
            </button>
            <button
              onClick={() => setActiveTab('about')}
              style={{
                touchAction: 'manipulation',
                fontFamily: '"Malgun Gothic", "맑은 고딕", "Noto Sans KR", sans-serif'
              }}
              className="sm:w-auto inline-flex min-h-[54px] items-center justify-center gap-2 bg-bg border border-[#9FB3CC] hover:bg-bg-subtle text-[#0B2F5B] text-[15px] md:text-[18px] font-black px-4 py-2.5 rounded-custom tracking-tight shadow-sm transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <FileCheck className="w-5 h-5 shrink-0" /> 컨설팅 절차 보기
            </button>
          </div>

          {/* 전국 무료 방문 신뢰 칩 (정보 — 클릭 액션 아님) */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-[#F0F5FB] border border-[#B8C7DA] text-[#123A63] text-[12px] font-bold px-3 py-1.5 rounded-full select-none">
              <MapPin className="w-3.5 h-3.5 text-steel" /> 전국 현장 무료 방문
            </span>
            <span className="inline-flex items-center gap-1.5 bg-[#F0F5FB] border border-[#B8C7DA] text-[#123A63] text-[12px] font-bold px-3 py-1.5 rounded-full select-none">
              <Truck className="w-3.5 h-3.5 text-accent" /> 출장비 0원
            </span>
            <span className="inline-flex items-center gap-1.5 bg-[#F0F5FB] border border-[#B8C7DA] text-[#123A63] text-[12px] font-bold px-3 py-1.5 rounded-full select-none">
              <ShieldCheck className="w-3.5 h-3.5 text-success" /> AI Native 1차 검증
            </span>
          </div>

          {/* 핵심 카피 */}
          <div className="flex flex-col gap-2">
            <h1
              style={{ fontFamily: '"Noto Sans KR", "Pretendard", "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif' }}
              className="text-2xl md:text-[28px] font-semibold text-[#0B2F5B] tracking-normal leading-tight antialiased"
            >
              무료 출장 견적 <span className="text-[#143E6D]">컨설팅 서비스</span>
            </h1>
            <p className="text-[13.5px] md:text-[15px] text-gray leading-relaxed font-semibold max-w-2xl">
              도면·사진·제원서를 제출하면 AI 1차 검증 후 <strong className="text-navy font-extrabold">35년 현장통 국가자격증 PM</strong>이
              공사 범위(Scope)·비용(Budget)·리스크(Risk)를 정직하게 확인합니다.
            </p>
          </div>

          {/* 35년 PM 신뢰 증빙 배지 3종 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-1 items-stretch">
            <div className="flex h-[54px] items-center gap-2.5 bg-bg-subtle/70 border border-border rounded-custom px-3 py-2 shadow-sm">
              <div className="w-8 h-8 rounded-custom bg-navy/5 border border-navy/10 flex items-center justify-center shrink-0 text-navy">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[18px] md:text-[18px] font-bold text-navy tracking-normal">35년</span>
                <span className="text-[12px] text-gray font-bold mt-1.5">현장통 실무 경력</span>
              </div>
            </div>
            <div className="flex h-[54px] items-center gap-2.5 bg-bg-subtle/70 border border-border rounded-custom px-3 py-2 shadow-sm">
              <div className="w-8 h-8 rounded-custom bg-steel/5 border border-steel/15 flex items-center justify-center shrink-0 text-steel">
                <Award className="w-5 h-5" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[18px] md:text-[18px] font-bold text-navy tracking-normal">국가자격증</span>
                <span className="text-[12px] text-gray font-bold mt-1.5">보유 기술 전문가</span>
              </div>
            </div>
            <div className="flex h-[54px] items-center gap-2.5 bg-bg-subtle/70 border border-border rounded-custom px-3 py-2 shadow-sm">
              <div className="w-8 h-8 rounded-custom bg-accent/5 border border-accent/15 flex items-center justify-center shrink-0 text-accent">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-[18px] md:text-[18px] font-bold text-navy tracking-normal">PM 역량</span>
                <span className="text-[12px] text-gray font-bold mt-1.5">프로젝트 총괄 관리</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {!guideClosed && (
        <div className="bg-bg border border-border p-4.5 rounded-custom flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="bg-steel/10 p-2 rounded-custom text-steel mt-0.5 md:mt-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-black text-navy leading-none">처음 방문자를 위한 ZEROS 3단계 활용 가이드</span>
              <span className="text-[12px] text-gray leading-relaxed mt-0.5">
                ① 좌측 영역 메뉴 탐색 ➔ ② 우측 의사결정 위젯으로 평균 소요기간/견적범위 확인 ➔ ③ 상담문의 사전진단서 접수.
              </span>
            </div>
          </div>
          <button
            onClick={() => setGuideClosed(true)}
            className="text-[12px] font-black text-gray hover:text-navy hover:underline bg-bg-subtle px-3 py-1.5 rounded-custom border border-border"
          >
            안내 닫기
          </button>
        </div>
      )}

      {/* Symmetrical Single Full-Width Box matching the very bottom card's specifications */}
      <div className="bg-bg border border-border p-4.5 rounded-custom shadow-custom-sm flex flex-col gap-4 relative overflow-hidden animate-in fade-in duration-300">
        
        {/* 공종 선택 대화식 탭 바 (전체 메뉴 8종) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border/70 select-none no-scrollbar z-10 relative">
          {landingTrades.map((tradeName, idx) => {
            const isActive = activeTradeIdx === idx;
            const tradeMetrics = getDynamicMetrics(tradeName);
            return (
              <button
                key={tradeName}
                onClick={() => setActiveTradeIdx(idx)}
                className={`px-3 py-1.5 rounded-custom text-[12px] font-black transition-all whitespace-nowrap active:scale-95 cursor-pointer border ${
                  isActive
                    ? `${tradeMetrics.badgeBg} border-current scale-[1.02] shadow-sm`
                    : 'bg-bg-subtle text-gray hover:text-navy border-transparent'
                }`}
              >
                {tradeName}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 items-stretch z-10 relative">
          
          {/* Box 1: ZEROS B2B Engineering Core copywriting & Active Menu Data */}
          <div className={`relative overflow-hidden bg-bg text-navy p-4.5 rounded-custom border ${activeMetrics.accentBorder} flex flex-col justify-between gap-4 transition-all shadow-sm`}>
            {/* 하이 테크 백그라운드 그리드 레이아웃 (라이트 버전) */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.007)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.007)_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />
            <div className={`absolute inset-0 ${activeMetrics.accentBg} opacity-20 pointer-events-none`} />

            <div className="flex flex-col gap-3.5 z-10 relative">
              {/* AI 신뢰성 배지 & 실시간 데이터 매핑 */}
              <div className="flex items-center justify-between gap-2 select-none">
                <span className={`text-[12px] tracking-widest uppercase font-black px-2 py-0.5 rounded-custom shadow-inner ${activeMetrics.badgeBg}`}>
                  {activeVisuals.badgeText}
                </span>
                <div className="flex items-center gap-1.5 bg-bg border border-border/85 px-2 py-0.5 rounded-custom shadow-sm text-[12px] font-mono font-bold text-steel">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  n={activeMetrics.sampleCount} 표본 대조
                </div>
              </div>
              
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] text-gray-light font-black tracking-wider block uppercase">현재 탐색 공종</span>
                <h1 className="text-xl font-black leading-tight tracking-tight text-navy font-sans">
                  {activeManual.title}
                </h1>
                <p className="text-[12px] text-gray leading-relaxed font-semibold font-sans mt-0.5">
                  {activeManual.problemDefinition}
                </p>
              </div>

              {/* 데이터 AI 정직 검증 수치 대시보드 */}
              <div className="grid grid-cols-3 gap-3 bg-bg-subtle/80 border border-border/70 p-3 rounded-custom shadow-inner my-0.5 select-none">
                <div className="text-center flex flex-col justify-center">
                  <span className="text-[12px] text-gray-light font-bold block uppercase tracking-wide break-keep leading-tight mb-0.5">AI 분석 신뢰도</span>
                  <span className="text-[12px] font-black text-navy tracking-tight tabular-nums">{activeMetrics.confidence}%</span>
                </div>
                <div className="text-center flex flex-col justify-center border-l border-border/60">
                  <span className="text-[12px] text-gray-light font-bold block uppercase tracking-wide break-keep leading-tight mb-0.5">실거래 표준 품셈</span>
                  <span className="text-[12px] font-black text-success tracking-tight">100% 매핑</span>
                </div>
                <div className="text-center flex flex-col justify-center border-l border-border/60">
                  <span className="text-[12px] text-gray-light font-bold block uppercase tracking-wide break-keep leading-tight mb-0.5">평균 거품 절감</span>
                  <span className="text-[12px] font-black text-accent tracking-tight tabular-nums">-{activeMetrics.bubbleRate}%</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-1 select-none">
              <button
                onClick={() => setActiveTab('request')}
                className="flex-1 min-h-10 bg-steel hover:bg-navy text-bg px-4 py-2.5 rounded-custom text-[12px] sm:text-[12px] font-black tracking-wide shadow-sm hover:scale-[1.01] active:scale-95 transition-all duration-150 cursor-pointer text-center"
              >
                AI Native 검증 제출
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className="flex-1 min-h-10 bg-steel hover:bg-navy text-bg px-4 py-2.5 rounded-custom text-[12px] sm:text-[12px] font-black tracking-wide shadow-sm hover:scale-[1.01] active:scale-95 transition-all duration-150 cursor-pointer text-center"
              >
                ZEROS 진단 절차
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 4대 공통 리스크 경고 */}
      <section className="bg-bg border border-border p-4.5 rounded-custom shadow-custom-sm text-center grid grid-cols-2 md:grid-cols-4 gap-4 select-none">
        <div className="p-1">
          <span className="text-[12px] text-gray-light font-bold uppercase tracking-wider block mb-1">1차 검토 목표시간</span>
          <span className="text-xl font-black text-navy tracking-tight">24h 이내</span>
        </div>
        <div className="p-1 border-l border-border/80">
          <span className="text-[12px] text-gray-light font-bold uppercase tracking-wider block mb-1">검토 핵심 공종</span>
          <span className="text-xl font-black text-navy tracking-tight">8대 핵심 영역</span>
        </div>
        <div className="p-1 border-l border-border/80">
          <span className="text-[12px] text-gray-light font-bold uppercase tracking-wider block mb-1">주요 집중 견적규모</span>
          <span className="text-xl font-black text-navy tracking-tight">1,000만 ~ 1억</span>
        </div>
        <div className="p-1 border-l border-border/80">
          <span className="text-[12px] text-gray-light font-bold uppercase tracking-wider block mb-1">의사결정 프로세스</span>
          <span className="text-xl font-black text-navy tracking-tight">3-Step 진행</span>
        </div>
      </section>

      <section className="bg-bg border border-border p-6.5 rounded-custom shadow-custom-sm flex flex-col gap-5">
        <div className="flex flex-col gap-1 border-b border-border pb-3.5 select-none">
          <span className="text-[12px] text-accent font-black uppercase tracking-wider">Common Risks</span>
          <h2 className="text-[18px] font-black text-navy">
            공사비보다 먼저 확인해야 할 것은 공사 범위입니다.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex gap-3 items-start">
            <div className="bg-danger/10 text-danger p-2 rounded-custom shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-bold text-navy">공사 범위 불명확</span>
              <span className="text-[12px] text-gray leading-normal">
                공사가 시작된 후 범위 조율 실패로 공사비 상승 및 잦은 분쟁이 유발됩니다.
              </span>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="bg-danger/10 text-danger p-2 rounded-custom shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-bold text-navy">현장 조건 누락</span>
              <span className="text-[12px] text-gray leading-normal">
                기계실 협소 반입구, 천장 보 지지 한계 등 현장 제약이 견적 시 누락되어 단가가 급증합니다.
              </span>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="bg-danger/10 text-danger p-2 rounded-custom shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-bold text-navy">예산 범위 오판</span>
              <span className="text-[12px] text-gray leading-normal">
                원가 구조에 대한 이해 부족으로 과한 마진이 포함되거나 불합리한 예산 초과가 초래됩니다.
              </span>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="bg-danger/10 text-danger p-2 rounded-custom shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[12px] font-bold text-navy">업체 비교 곤란</span>
              <span className="text-[12px] text-gray leading-normal">
                규격과 자재 사양서(Schedules)가 달라 복수의 견적서 항목을 1:1로 비교 분석하기 어렵습니다.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm flex flex-col gap-2 relative">
          <span className="text-3xl font-black text-navy/10 absolute right-4 top-4 select-none">01</span>
          <span className="text-[12px] text-steel font-black uppercase tracking-wider">Step 1</span>
          <h3 className="text-[15px] font-bold text-navy mt-1">자료 정밀 검토</h3>
          <p className="text-[12px] text-gray leading-relaxed">
            P&ID, Layout 도면 및 현장 근접 사진 등 고객이 업로드한 원천 정보의 치수 오류와 연결 규격을 확인합니다.
          </p>
        </div>
        <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm flex flex-col gap-2 relative">
          <span className="text-3xl font-black text-navy/10 absolute right-4 top-4 select-none">02</span>
          <span className="text-[12px] text-steel font-black uppercase tracking-wider">Step 2</span>
          <h3 className="text-[15px] font-bold text-navy mt-1">현장 제약 확인</h3>
          <p className="text-[12px] text-gray leading-relaxed">
            협소 공간 밸브 조작 반경, 크레인 접근로 등 물리적 걸림돌과 가동 중단(Shut-down) 일정 등 특수 리스크를 체크합니다.
          </p>
        </div>
        <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm flex flex-col gap-2 relative">
          <span className="text-3xl font-black text-navy/10 absolute right-4 top-4 select-none">03</span>
          <span className="text-[12px] text-steel font-black uppercase tracking-wider">Step 3</span>
          <h3 className="text-[15px] font-bold text-navy mt-1">공사 범위 정리</h3>
          <p className="text-[12px] text-gray leading-relaxed">
            도출된 설계 인자들을 단일 양식에 고정하여 동일한 자재 스펙 하에서 여러 업체가 견적할 수 있는 척도를 제공합니다.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-[18px] font-extrabold text-navy px-1">
          공사 규모에 따라 검토 방식이 달라집니다.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab('request')}
                style={{ touchAction: 'manipulation' }}
                className="bg-bg-subtle text-gray border border-border px-2 py-1 rounded-custom text-[12px] font-bold w-fit hover:bg-border/30 active:scale-95 transition-all cursor-pointer text-left"
              >
                금액 1,000만 이하
              </button>
              <h3 className="text-[15px] font-bold text-navy">온라인 간편검토</h3>
              <p className="text-[12px] text-gray leading-relaxed">
                제출해주신 사진과 요구 제원서를 바탕으로 자재 소요 및 기본 파이프라인 마찰 손실을 간이 계산하여 24시간 내 권장 스코프를 제시합니다.
              </p>
            </div>
            <button
              onClick={() => handleBudgetClick('small')}
              className="text-[12px] font-black text-steel hover:text-navy flex items-center gap-1 mt-2"
            >
              온라인 검토 상세 보기
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab('request')}
                style={{ touchAction: 'manipulation' }}
                className="bg-steel/15 text-steel border border-steel/20 px-2 py-1 rounded-custom text-[12px] font-bold w-fit hover:bg-steel/25 active:scale-95 transition-all cursor-pointer text-left"
              >
                금액 1,000만 ~ 1억
              </button>
              <h3 className="text-[15px] font-bold text-navy">출장 실측견적 검토</h3>
              <p className="text-[12px] text-gray leading-relaxed">
                베테랑 엔지니어가 직접 출장하여 기계실 배치, 유틸리티 우회 관로, 빔 하중 상태를 레이저 실측하고 1차 오차를 예방하는 정밀 리포트를 제공합니다.
              </p>
            </div>
            <button
              onClick={() => handleBudgetClick('medium')}
              className="text-[12px] font-black text-steel hover:text-navy flex items-center gap-1 mt-2"
            >
              출장 실측 상세 보기
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="bg-bg border border-border p-5 rounded-custom shadow-custom-sm flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setActiveTab('request')}
                style={{ touchAction: 'manipulation' }}
                className="bg-navy text-bg px-2 py-1 rounded-custom text-[12px] font-bold w-fit hover:bg-navy/90 active:scale-95 transition-all cursor-pointer text-left"
              >
                금액 1억 초과
              </button>
              <h3 className="text-[15px] font-bold text-navy">프로젝트 사전진단</h3>
              <p className="text-[12px] text-gray leading-relaxed">
                공장 전체 신·증설 컨셉 기획 단계부터 개입하여 전체 라인 공법 믹스, Schedules 매핑, CAPEX 리스크 구조를 종합 관리하는 PM 서비스를 탑재합니다.
              </p>
            </div>
            <button
              onClick={() => handleBudgetClick('large')}
              className="text-[12px] font-black text-steel hover:text-navy flex items-center gap-1 mt-2"
            >
              프로젝트 진단 상세 보기
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      <section className="bg-bg border border-border p-6.5 rounded-custom shadow-custom-sm flex flex-col gap-4">
        <h2 className="text-[18px] font-extrabold text-navy">
          중소형 사업장의 설비투자 의사결정을 지원합니다.
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center select-none">
          <div className="bg-bg-subtle p-4 rounded-custom border border-border">
            <span className="font-bold text-navy text-[12px] block">바이오 / 제약 공장</span>
          </div>
          <div className="bg-bg-subtle p-4 rounded-custom border border-border">
            <span className="font-bold text-navy text-[12px] block">식품 가공 사업장</span>
          </div>
          <div className="bg-bg-subtle p-4 rounded-custom border border-border">
            <span className="font-bold text-navy text-[12px] block">빌딩 기계실 배관</span>
          </div>
          <div className="bg-bg-subtle p-4 rounded-custom border border-border">
            <span className="font-bold text-navy text-[12px] block">제조 공장 개·증설</span>
          </div>
        </div>
      </section>

      <section className="bg-bg border border-border p-6.5 rounded-custom shadow-custom-sm flex flex-col gap-5">
        <h2 className="text-[18px] font-extrabold text-navy">
          접수부터 견적서 송부까지 명확하게 진행합니다.
        </h2>
        <div className="flex flex-col md:flex-row items-stretch justify-between gap-4 pt-2">
          {[
            { step: '01', title: '온라인 접수', desc: '도면 및 현장 정보 제출' },
            { step: '02', title: '자료 검토', desc: '1차 규격 분석 및 손실 계산' },
            { step: '03', title: '출장 실측', desc: '정밀 현장 장애 식별 (권장)' },
            { step: '04', title: '범위 고정', desc: '상세 스코프 리포트 송부' },
          ].map((item, idx) => (
            <div key={idx} className="flex-1 bg-bg-subtle border border-border/80 p-4 rounded-custom flex flex-col gap-1 relative">
              <span className="text-[12px] font-black text-steel block">Step {item.step}</span>
              <span className="text-[15px] font-bold text-navy mt-1 block">{item.title}</span>
              <span className="text-[12px] text-gray-light font-medium leading-normal mt-0.5 block">{item.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA 섹션 */}
      <section className="bg-gradient-to-br from-[#0c162b] via-[#10243e] to-[#15345e] text-white p-9.5 rounded-custom shadow-custom-lg text-center flex flex-col items-center gap-4 relative overflow-hidden border border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(224,112,26,0.15),transparent_50%)] pointer-events-none"></div>
        
        <div className="bg-[#E0701A]/10 border border-[#E0701A]/30 text-accent text-[12px] px-2.5 py-1 rounded-custom font-black tracking-widest uppercase mb-1 z-10 animate-pulse">
          PROVEN INDUSTRIAL ENGINEERING REVIEW
        </div>
        
        <h2 className="text-2xl md:text-3xl font-black tracking-tight max-w-xl z-10 text-white font-sans">
          공사를 시작하기 전, 먼저 검토하십시오.
        </h2>
        
        <p className="text-[13.5px] text-[#A5C3EC] max-w-md leading-relaxed font-semibold z-10">
          불명확한 공사 범위와 잦은 현장 설계 변경 리스크를 ZEROS만의 1차 엔지니어링 검토로 원천 차단하십시오.
        </p>
        
        <button
          onClick={() => setActiveTab('request')}
          className="mt-3 bg-accent hover:bg-accent/90 text-bg px-9 py-4 rounded-custom text-[12px] font-black tracking-wider shadow-lg shadow-accent/25 hover:scale-[1.01] active:scale-95 transition-all duration-150 z-10 cursor-pointer"
        >
          AI Native 검증 제출하기
        </button>
      </section>
    </div>
    );
  };

  // ==========================================
  // 2. 관리자 백오피스 탭 렌더러
  // ==========================================
  const renderAdminView = () => {
    switch (adminView) {
      case 'estimates':
        return (
          <div className="flex flex-col gap-4">
            {adminSubView === 'table' ? (
              <EstimateList
                estimates={estimates}
                onRefresh={handleRefresh}
                onSelectEstimate={(id) => setSelectedEstimateId(id)}
                onToggleView={(v) => setAdminSubView(v)}
                currentSubView={adminSubView}
              />
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between bg-bg border border-border p-4 rounded-custom shadow-sm select-none">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] text-steel font-bold uppercase">영업 파이프라인 관제</span>
                    <span className="text-[15px] font-black text-navy">드래그 앤 드롭 영업 칸반 보드</span>
                  </div>
                  <button
                    onClick={() => setAdminSubView('table')}
                    className="flex items-center gap-1.5 border border-border rounded-custom bg-bg px-3 py-1.5 text-[12px] text-navy hover:bg-bg-subtle"
                  >
                    리스트 테이블로 전환
                  </button>
                </div>
                <KanbanBoard
                  estimates={estimates}
                  onStatusChange={handleStatusChange}
                  onSelectCard={(id) => setSelectedEstimateId(id)}
                />
              </div>
            )}
          </div>
        );
      case 'visits':
        return <VisitList />;
      case 'customers':
        return <CustomerList />;
      case 'performance':
        return <PerformanceDashboard />;
      case 'notifications':
        return <NotificationLog />;
      case 'dashboard':
      default:
        return <AdminDashboard onNavigateToView={(view) => setAdminView(view)} />;
    }
  };

  const renderContent = () => {
    if (!isUserMode) {
      return renderAdminView();
    }

    switch (activeTab) {
      case 'about':
        return renderAboutTab();
      case 'performance':
        return renderPerformanceTab();
      case 'request':
        return renderRequestTab();
      case 'home':
      default:
        if (selectedMenu && !selectedBudget) {
          return renderManualDetail(selectedMenu);
        }
        if (selectedBudget && !selectedMenu) {
          return renderManualDetail(selectedBudget);
        }
        return renderLandingDashboard();
    }
  };

  return (
    <AppShell>
      {renderContent()}

      {/* 정밀 제어 상세 모달 렌더러 (관리자 모드에서 상세 진입 시) */}
      {selectedEstimateId && (
        <EstimateDetailModal
          estimateId={selectedEstimateId}
          onClose={() => setSelectedEstimateId(null)}
          onSaved={handleRefresh}
        />
      )}
    </AppShell>
  );
}
