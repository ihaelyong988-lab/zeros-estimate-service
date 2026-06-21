'use client';

import React, { useState } from 'react';
import { ZerosService } from '@/lib/supabase/client';
import { CreditCard, ShieldCheck, CheckCircle2, Lock, X } from 'lucide-react';

interface TossPaymentModalProps {
  estimateId: string;
  estimateNo: string;
  amount: number;
  paymentType: '온라인검토비' | '출장견적비' | '프로젝트 사전진단비';
  onClose: () => void;
  onSuccess: () => void;
}

export const TossPaymentModal: React.FC<TossPaymentModalProps> = ({
  estimateId,
  estimateNo,
  amount,
  paymentType,
  onClose,
  onSuccess
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'transfer'>('card');
  const [selectedCard, setSelectedCard] = useState('shinhan');
  const [pin, setPin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMethod === 'card' && pin.length < 6) {
      alert('비밀번호 6자리를 입력해 주세요.');
      return;
    }

    setIsProcessing(true);

    // 모의 결제 딜레이
    setTimeout(async () => {
      try {
        const transactionId = `TOSS-TX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        await ZerosService.createPayment({
          estimate_id: estimateId,
          payment_type: paymentType,
          amount: amount,
          payment_status: '결제완료',
          payment_provider: selectedMethod === 'card' ? '토스페이먼츠(신용카드)' : '토스페이먼츠(계좌이체)',
          transaction_id: transactionId,
          memo: `[모의승인] 접수번호 ${estimateNo} 건에 대한 ${paymentType} 입금 확인 완료.`
        });
        
        setIsProcessing(false);
        setIsCompleted(true);
      } catch (err) {
        console.error(err);
        setIsProcessing(false);
        alert('결제 처리 중 요류가 발생하였습니다.');
      }
    }, 2000);
  };

  if (isCompleted) {
    return (
      <div className="fixed inset-0 bg-navy/55 backdrop-blur-sm flex items-center justify-center z-[100] p-4 select-none font-sans">
        <div className="bg-bg border border-border w-full max-w-sm rounded-custom shadow-custom-md overflow-hidden flex flex-col p-6 items-center text-center gap-4">
          <div className="bg-success/15 text-success p-3.5 rounded-full mt-2 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-black text-navy">안전 결제가 완료되었습니다</h3>
            <p className="text-xs text-gray leading-relaxed max-w-xs mt-1.5">
              접수번호 <span className="font-extrabold text-navy tabular-nums">{estimateNo}</span> 의 {paymentType} 수납이 완료되었습니다. 영업 WBS 상태가 즉시 업데이트됩니다.
            </p>
          </div>
          <button
            onClick={() => {
              onSuccess();
              onClose();
            }}
            className="w-full bg-navy text-bg hover:bg-steel transition-all rounded-custom py-2.5 text-xs font-black tracking-wide mt-2"
          >
            확인 및 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-navy/55 backdrop-blur-sm flex items-center justify-center z-[100] p-4 select-none font-sans">
      <div className="bg-bg border border-border w-full max-w-md rounded-custom shadow-custom-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* 헤더 */}
        <div className="bg-[#1F8CE6] text-bg p-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            <h3 className="text-[14.5px] font-black tracking-tight">toss payments 안전 결제 창</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-bg/80 hover:text-bg bg-bg/10 hover:bg-bg/25 rounded-custom p-1 transition-all"
            disabled={isProcessing}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 결제 정보 요약 */}
        <div className="bg-bg-subtle/80 border-b border-border p-4.5 text-xs flex flex-col gap-2.5">
          <div className="flex justify-between items-center">
            <span className="text-gray-light font-bold">결제 대상 건</span>
            <span className="font-black text-navy tabular-nums">{estimateNo} ({paymentType})</span>
          </div>
          <div className="flex justify-between items-center border-t border-border/60 pt-2.5">
            <span className="text-gray-light font-bold">최종 결제 금액</span>
            <span className="text-base font-black text-[#1F8CE6] tabular-nums">
              ₩{amount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* 폼 */}
        <form onSubmit={handlePaymentSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">
          
          {/* 수단 선택 */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] text-gray-light font-bold uppercase tracking-wider">결제 수단 선택</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                className={`py-2 px-3 border rounded-custom text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                  selectedMethod === 'card' 
                    ? 'border-[#1F8CE6] bg-[#1F8CE6]/5 text-[#1F8CE6]' 
                    : 'border-border bg-bg text-gray hover:bg-bg-subtle'
                }`}
              >
                신용카드 결제
              </button>
              <button
                type="button"
                onClick={() => setSelectedMethod('transfer')}
                className={`py-2 px-3 border rounded-custom text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                  selectedMethod === 'transfer' 
                    ? 'border-[#1F8CE6] bg-[#1F8CE6]/5 text-[#1F8CE6]' 
                    : 'border-border bg-bg text-gray hover:bg-bg-subtle'
                }`}
              >
                실시간 가상계좌
              </button>
            </div>
          </div>

          {selectedMethod === 'card' ? (
            <div className="flex flex-col gap-4 animate-in slide-in-from-top-1 duration-150">
              
              {/* 카드 선택 */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-gray-light font-bold uppercase tracking-wider">카드사 선택</span>
                <select
                  value={selectedCard}
                  onChange={(e) => setSelectedCard(e.target.value)}
                  className="text-xs border border-border rounded-custom bg-bg px-2.5 py-2 focus:outline-none focus:border-[#1F8CE6] font-bold text-navy"
                >
                  <option value="shinhan">신한카드 (모의승인)</option>
                  <option value="kookmin">국민카드 (모의승인)</option>
                  <option value="samsung">삼성카드 (모의승인)</option>
                  <option value="hyundai">현대카드 (모의승인)</option>
                  <option value="toss">토스뱅크카드 (모의승인)</option>
                </select>
              </div>

              {/* 비밀번호 6자리 */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-gray-light font-bold uppercase tracking-wider">결제 비밀번호 (모의 6자리)</span>
                <div className="relative">
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="******"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full text-center tracking-widest text-base font-black border border-border rounded-custom px-3 py-2 focus:outline-none focus:border-[#1F8CE6] bg-bg text-navy"
                  />
                  <Lock className="w-3.5 h-3.5 text-gray-light absolute left-3 top-3" />
                </div>
                <span className="text-[9.5px] text-gray-light leading-normal mt-0.5">
                  * 실제 보안카드 인증이 아닌 모의 테스트용 입력창입니다. 아무 숫자를 기입하셔도 통과됩니다.
                </span>
              </div>

            </div>
          ) : (
            <div className="bg-bg-subtle/60 border border-border p-3.5 rounded-custom flex flex-col gap-1.5 animate-in slide-in-from-top-1 duration-150">
              <span className="text-xs font-bold text-navy">실시간 가상계좌 (토스 에스크로)</span>
              <p className="text-[11px] text-gray leading-normal">
                결제 요청 즉시 ZEROS 전용 농협 가상계좌(NH 302-0000-***-**)가 발부되며, 송금 즉시 실시간 입금 상태가 `결제완료`로 동기화됩니다. (모의 테스트로 즉시 승인 가능)
              </p>
            </div>
          )}

          {/* 보안 서약 및 확인 버튼 */}
          <div className="flex items-center gap-1.5 justify-center text-[10px] text-gray-light mt-2 select-none">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1F8CE6]" />
            <span>토스페이먼츠 SSL 256비트 암호화 가상 보안 게이트웨이</span>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className={`w-full text-xs font-black tracking-wide rounded-custom py-3 text-bg flex items-center justify-center gap-2 transition-all mt-2 ${
              isProcessing 
                ? 'bg-gray-light cursor-not-allowed' 
                : 'bg-[#1F8CE6] hover:bg-[#1571bc] active:scale-[0.99]'
            }`}
          >
            {isProcessing ? '모의 거래 승인 요청 중...' : '₩' + amount.toLocaleString() + ' 안전 결제하기'}
          </button>

        </form>

      </div>
    </div>
  );
};
