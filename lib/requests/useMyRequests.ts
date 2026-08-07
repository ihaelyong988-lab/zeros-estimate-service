'use client';

import { useEffect, useMemo, useState } from 'react';
import { useShell } from '@/lib/context/ShellContext';
import { ZerosService } from '@/lib/supabase/client';
import { resolveRequestsLoad, RequestsLoadError } from '@/lib/requests/loadOutcome';
import { buildTimelineEvents, TLEvent } from '@/lib/requests/timeline';
import { Estimate, NotificationLog } from '@/types/estimate';

// ==========================================
// 내 접수현황 적재 (마이페이지 탭 · 오버레이 공용)
// ==========================================
// MyRequestsView 와 MyRequestsModal 은 같은 두 요청을 각자 복사해 돌리고 있었다. 조회 시점만
// 다르다 — 탭은 마운트 즉시, 오버레이는 열릴 때. 그 차이를 enabled 로 받고 나머지는 공유한다.

export interface UseMyRequestsResult {
  estimates: Estimate[];
  events: TLEvent[];
  loading: boolean;
  loadError: RequestsLoadError | null;
  /** 인증된 번호(숫자만) — 견적서 서명 URL 요청에 쓴다. */
  phoneDigits: string;
  retryLoad: () => void;
  /** 세션 만료 복구 — 상태를 비우고 로그아웃까지 한다. 이후 화면 전환은 호출부가 정한다. */
  reauth: () => void;
}

export function useMyRequests({ enabled }: { enabled: boolean }): UseMyRequestsResult {
  const { customerAuth, logoutCustomer } = useShell();

  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  // 조회를 마친 번호. 로딩 표시는 여기서 파생한다 — effect 안에서 setLoading(true)를 동기 호출하면
  // 연쇄 렌더가 생긴다(react-hooks/set-state-in-effect).
  const [loadedPhone, setLoadedPhone] = useState<string | null>(null);
  // 조회 실패는 "0건"과 분리해 보관한다. 합치면 접수한 고객에게 내역이 사라진 것처럼 보인다.
  const [loadError, setLoadError] = useState<RequestsLoadError | null>(null);
  // 다시 시도 트리거 — 값이 바뀌면 조회 effect 가 재실행된다.
  const [reloadKey, setReloadKey] = useState(0);

  const phoneDigits = (customerAuth?.phone || '').replace(/\D/g, '');
  const loading = loadedPhone !== phoneDigits;

  // allSettled — 세션 만료 시 견적은 200(익명 허용목록 행), 알림은 401 이라 all 로 묶으면 401 하나가
  // 전체를 실패로 만들고 화면은 "내역 없음"으로 위장한다. 성공한 쪽은 표시하고 실패는 배너로 알린다.
  useEffect(() => {
    if (!enabled || !customerAuth) return;
    let alive = true;
    (async () => {
      const [est, lg] = await Promise.allSettled([
        ZerosService.getEstimates(),
        ZerosService.getNotificationLogs(),
      ]);
      if (!alive) return;
      const result = resolveRequestsLoad(est, lg, phoneDigits);
      setEstimates(result.estimates);
      setLogs(result.logs);
      setLoadError(result.error);
      setLoadedPhone(phoneDigits);
    })();
    return () => { alive = false; };
  }, [enabled, customerAuth, phoneDigits, reloadKey]);

  const events = useMemo(() => buildTimelineEvents(logs, estimates), [logs, estimates]);

  return {
    estimates,
    events,
    loading,
    loadError,
    phoneDigits,
    // 다시 시도 — 로딩 표시가 loadedPhone 파생값이라 초기화까지 함께 한다.
    retryLoad: () => {
      setLoadError(null);
      setLoadedPhone(null);
      setReloadKey(k => k + 1);
    },
    // 세션 만료(401·403) — 같은 화면에서 다시 눌러도 실패하므로 인증부터 다시 받는다.
    reauth: () => {
      setLoadError(null);
      setEstimates([]);
      setLogs([]);
      setLoadedPhone(null);
      logoutCustomer();
    },
  };
}
