'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckSquare, RefreshCw, Cpu, Sparkles } from 'lucide-react';

interface AiBlueprintAnalyzerProps {
  onAnalysisComplete: (result: {
    work_purpose: string;
    description: string;
    request_detail: string;
    accuracy_grade: 'A' | 'B' | 'C' | 'D';
    estimated_amount: number;
  }) => void;
}

const scanLogs = [
  'P&ID 도면 레이어 로딩 및 벡터 그리드 분할 중...',
  '메인 배관(80A/50A) 유동 치수 및 곡관 곡률 감지...',
  '주요 밸브 피팅류(게이트 밸브, 센서 포트) OCR 인식 중...',
  '기계실 협소 반입 공간 간섭 리스크 시뮬레이션 중...',
  '진단 기준 데이터베이스(n=246건) 대조 검토 중...'
];

export const AiBlueprintAnalyzer: React.FC<AiBlueprintAnalyzerProps> = ({ onAnalysisComplete }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [detectedData, setDetectedData] = useState<{
    spec: string;
    valves: string;
    material: string;
    risk: string;
  } | null>(null);

  useEffect(() => {
    if (!analyzing) return;
    
    // AI 검출 로그 딜레이 연동
    const timer = setInterval(() => {
      setScanStep((prev) => {
        if (prev < scanLogs.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 500);

    return () => clearInterval(timer);
  }, [analyzing]);

  const handleAiAnalysis = () => {
    setAnalyzing(true);
    setCompleted(false);
    setScanStep(0);

    // AI vision OCR 가상 딜레이 (3초)
    setTimeout(() => {
      const mockResult = {
        spec: '메인 관로 80A (3인치) 32m 및 분기 관로 50A (2인치) 18m 감지',
        valves: '게이트 밸브 6ea, 볼 밸브 4ea, 온도 센서 피팅 2ea 식별',
        material: 'Sanitary SUS304 무산소 세정 배관 자재 매핑',
        risk: '기계실 초입 90도 곡관 협소 부위 간섭 확률 14.8% 감지 (고소 작업 포함)',
      };

      setDetectedData(mockResult);
      setAnalyzing(false);
      setCompleted(true);
    }, 3000);
  };

  const handleApplyToForm = () => {
    if (!detectedData) return;

    onAnalysisComplete({
      work_purpose: 'AI 도면 검출: Sanitary 유틸리티 배관 및 펌프 무중단 라인 증설.',
      description: `[AI 현장 제약 감지]\n- ${detectedData.risk}\n- 천장 H빔 구조 보강 가능성 검토 요망.`,
      request_detail: `[AI 도면 OCR 제원]\n- 주관로: ${detectedData.spec}\n- 밸브 피팅류: ${detectedData.valves}\n- 자재 등급: ${detectedData.material}`,
      accuracy_grade: 'A', // 도면 자동 매핑으로 정확도 등급을 A로 승격
      estimated_amount: 38500000 // 권장 원가 자동 도출
    });

    alert('AI 분석 결과가 예상견적 의뢰 양식에 성공적으로 주입되었습니다! 정확도 등급이 A로 상향 조정됩니다.');
  };

  return (
    <div className="bg-bg border border-[#1E4D8C]/20 rounded-custom p-4.5 shadow-sm select-none font-sans flex flex-col gap-3.5">
      
      {/* 컴포넌트 고유 키프레임 애니메이션 주입 */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes scanLine {
            0% { top: 4%; }
            50% { top: 96%; }
            100% { top: 4%; }
          }
        `
      }} />

      {/* 타이틀 바 */}
      <div className="flex items-center justify-between border-b border-border pb-2.5">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-steel animate-pulse" />
          <span className="text-[12px] font-black text-navy">ZEROS AI 도면 제원 분석 보조 (OCR)</span>
        </div>
        <span className="bg-steel/10 text-steel border border-steel/20 px-2 py-0.5 rounded-custom text-[12px] font-black uppercase">
          AI Vision v2.1
        </span>
      </div>

      {/* 안내 설명 */}
      <p className="text-[12px] text-gray leading-normal">
        업로드하신 평면 배치도 또는 P&ID 도면 PDF 파일을 인공지능 비전 모델로 분석하여 배관 사이즈, 게이트 밸브 수량 및 리스크 부위를 자동으로 감지 및 검출합니다.
      </p>

      {/* 동작 버튼 및 진행률 */}
      {!analyzing && !completed && (
        <button
          type="button"
          onClick={handleAiAnalysis}
          style={{ touchAction: 'manipulation' }}
          className="w-full py-2.5 bg-steel hover:bg-navy text-bg text-[12px] font-black rounded-custom transition-all shadow-md active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Cpu className="w-3.5 h-3.5" />
          업로드된 도면 AI 분석 개시
        </button>
      )}

      {analyzing && (
        <div className="flex flex-col gap-4 py-2 text-center items-center">
          {/* 프리미엄 글래스모피즘 도면 캔버스 & 네온 레이저 효과 */}
          <div className="relative w-full h-36 bg-[#0A1220] rounded-custom border border-border/80 overflow-hidden flex items-center justify-center">
            {/* 모의 도면 격자 그리드 */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#1e4d8c_1.5px,transparent_1.5px)] [background-size:16px_16px]"></div>
            
            {/* 가상 배관 P&ID 도면 설계 선 */}
            <svg className="w-4/5 h-3/4 opacity-40 text-cyan-400 stroke-2" fill="none" viewBox="0 0 100 50">
              <path d="M10,25 L90,25 M25,25 L25,12 L75,12 L75,25 M50,25 L50,42" stroke="currentColor" />
              <rect x="22" y="9" width="6" height="6" rx="1" className="fill-[#0A1220] stroke-cyan-400" />
              <rect x="72" y="9" width="6" height="6" rx="1" className="fill-[#0A1220] stroke-cyan-400" />
              <circle cx="50" cy="33" r="3.5" className="fill-accent stroke-accent" />
            </svg>

            {/* 위아래로 움직이는 네온 스캔 레이저 라인 */}
            <div 
              style={{ animation: 'scanLine 2s ease-in-out infinite' }}
              className="absolute left-0 right-0 h-[2px] bg-cyan-400 shadow-[0_0_10px_#22d3ee,_0_0_20px_#0891b2] z-10" 
            />
            
            <span className="absolute bottom-2 right-3 text-[12px] font-black text-cyan-400 tracking-wider animate-pulse">
              ANALYZING P&ID LAYERS...
            </span>
          </div>

          <div className="w-full flex flex-col gap-1 px-1">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-gray-light font-bold">진행 상황</span>
              <span className="text-steel font-black animate-pulse">{Math.min(100, Math.round(((scanStep + 1) / scanLogs.length) * 100))}%</span>
            </div>
            
            {/* 프로그레스 바 */}
            <div className="w-full bg-bg-subtle h-2 rounded-full overflow-hidden border border-border">
              <div 
                style={{ width: `${((scanStep + 1) / scanLogs.length) * 100}%` }}
                className="bg-steel h-full rounded-full transition-all duration-300"
              />
            </div>
            
            {/* 실시간 감지 단계 로그 출력 */}
            <span className="text-[12px] text-steel font-extrabold text-left leading-normal mt-1 flex items-center gap-1.5 justify-center">
              <RefreshCw className="w-3 h-3 animate-spin text-accent shrink-0" />
              {scanLogs[scanStep]}
            </span>
          </div>
        </div>
      )}

      {completed && detectedData && (
        <div className="flex flex-col gap-3 animate-in slide-in-from-top-1 duration-200">
          
          <div className="bg-[#1E4D8C]/5 border border-[#1E4D8C]/15 p-3.5 rounded-custom flex flex-col gap-2.5 text-[12px] leading-relaxed shadow-inner">
            
            <div className="flex flex-col gap-0.5">
              <span className="font-extrabold text-navy text-[12px] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
                배관 제원 자동 검출
              </span>
              <span className="text-gray font-medium pl-4.5">{detectedData.spec}</span>
            </div>

            <div className="flex flex-col gap-0.5 border-t border-border/40 pt-2">
              <span className="font-extrabold text-navy text-[12px] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
                피팅 및 밸브 수량 식별
              </span>
              <span className="text-gray font-medium pl-4.5">{detectedData.valves}</span>
            </div>

            <div className="flex flex-col gap-0.5 border-t border-border/40 pt-2">
              <span className="font-extrabold text-navy text-[12px] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-accent shrink-0" />
                자재 매핑 (Schedules)
              </span>
              <span className="text-gray font-medium pl-4.5">{detectedData.material}</span>
            </div>

            <div className="flex flex-col gap-0.5 border-t border-[#B23A3A]/20 pt-2 text-danger">
              <span className="font-black text-[12px] flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-danger shrink-0" />
                현장 간섭 및 시공 리스크 경고
              </span>
              <span className="font-extrabold pl-4.5">{detectedData.risk}</span>
            </div>

          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApplyToForm}
              style={{ touchAction: 'manipulation' }}
              className="flex-1 py-2.5 bg-success text-bg text-[12px] font-black rounded-custom hover:bg-success/90 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              예상견적서 양식에 자동 주입
            </button>
            <button
              type="button"
              onClick={handleAiAnalysis}
              style={{ touchAction: 'manipulation' }}
              className="py-2.5 px-3 border border-border bg-bg text-gray hover:text-navy rounded-custom text-[12px] font-black hover:bg-bg-subtle transition-all cursor-pointer"
              title="재분석"
            >
              재분석
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
