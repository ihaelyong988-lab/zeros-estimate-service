'use client';

import React from 'react';
import { X, RotateCw, Sparkles } from 'lucide-react';
import { useShell } from '@/lib/context/ShellContext';

export const MobileSimulator: React.FC = () => {
  const { showSimulator, setShowSimulator } = useShell();

  if (!showSimulator) return null;

  return (
    <div className="fixed inset-0 z-50 bg-navy/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* 닫기 배경 클릭 */}
      <div className="absolute inset-0" onClick={() => setShowSimulator(false)} />

      {/* 시뮬레이터 카드 */}
      <div className="relative bg-bg border border-border shadow-custom-xl rounded-[32px] w-full max-w-[480px] p-6 flex flex-col items-center gap-4 z-10 animate-in zoom-in-95 duration-200">
        
        {/* 헤더 컨트롤 바 */}
        <div className="w-full flex items-center justify-between pb-2 border-b border-border select-none">
          <div className="flex items-center gap-2">
            <div className="bg-accent/15 p-1 rounded-custom">
              <Sparkles className="w-4 h-4 text-accent" />
            </div>
            <div className="flex flex-col">
              <span className="text-[12px] font-black text-navy leading-none">ZEROS Mobile Simulator</span>
              <span className="text-[12px] text-gray-light font-bold uppercase tracking-wide mt-0.5">
                모바일 앱 라이브 테스트
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const iframe = document.getElementById('zeros-sim-frame') as HTMLIFrameElement;
                if (iframe) iframe.src = iframe.src;
              }}
              title="새로고침"
              className="p-2 hover:bg-bg-subtle rounded-custom border border-border text-gray hover:text-navy transition-all duration-100 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowSimulator(false)}
              className="p-2 hover:bg-danger/10 hover:text-danger rounded-custom border border-border text-gray transition-all duration-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 설명 가이드 */}
        <p className="text-[12px] text-gray text-center leading-normal max-w-sm font-sans select-none">
          💡 모바일 앱 화면에서 사전진단을 신청하시면, 실시간으로 데스크톱 대시보드(CRM, 칸반보드)에 데이터가 동기화되는 모습을 확인할 수 있습니다!
        </p>

        {/* 폰 바디 */}
        <div className="relative w-[360px] h-[720px] bg-[#0c1626] rounded-[48px] p-3 shadow-2xl border-[6px] border-[#222d3d] flex flex-col overflow-hidden select-none">
          
          {/* 스피커 리시버 홀 */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-1 bg-[#1a2330] rounded-full z-30"></div>
          
          {/* 다이내믹 아일랜드 / 노치 */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[110px] h-6 bg-[#000000] rounded-full z-20 flex items-center justify-end px-2.5">
            {/* 셀카 렌즈 눈알 */}
            <div className="w-2.5 h-2.5 rounded-full bg-[#111] border border-[#222] mr-0.5"></div>
          </div>

          {/* 폰 내부 화면 영역 */}
          <div className="relative w-full h-full bg-[#0F1E35] rounded-[38px] overflow-hidden flex flex-col border border-[#172230]">
            <iframe
              id="zeros-sim-frame"
              src="/?mobile=true"
              className="w-full h-full border-none bg-bg"
              title="ZEROS Mobile Live Preview"
            />
          </div>

          {/* iOS 하단 홈 바 */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-32 h-1 bg-[#444] rounded-full z-30"></div>
        </div>
      </div>
    </div>
  );
};
