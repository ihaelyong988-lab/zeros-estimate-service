'use client';

import { RefObject, useEffect, useRef } from 'react';

/** Tab 으로 도달 가능한 요소만 트랩 대상으로 삼는다(disabled·tabindex=-1 제외). */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Tab 이 모달 밖으로 나가려 할 때 되돌릴 요소를 고른다. 되돌릴 필요가 없으면 null(브라우저 기본 이동).
 * DOM 없이 판정할 수 있도록 순수 함수로 분리했다.
 */
export function nextTrapTarget<T>(items: readonly T[], active: T | null, shiftKey: boolean): T | null {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];
  const index = active === null ? -1 : items.indexOf(active);
  // 포커스가 모달 밖에 있으면(예: 배경 클릭) 진행 방향의 끝으로 끌어온다.
  if (index === -1) return shiftKey ? items[items.length - 1] : items[0];
  if (shiftKey && index === 0) return items[items.length - 1];
  if (!shiftKey && index === items.length - 1) return items[0];
  return null;
}

interface ModalDialogOptions {
  open: boolean;
  onClose: () => void;
  containerRef: RefObject<HTMLElement | null>;
  /** 열릴 때 먼저 포커스할 요소. 없으면 컨테이너의 첫 포커스 요소. */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * 다이얼로그 키보드 동작(ESC 닫기 · 포커스 트랩 · 첫 포커스 · 닫을 때 트리거 복귀).
 * 마우스 없이도 모달을 빠져나갈 수 있게 하는 최소 계약이다.
 */
export function useModalDialog({ open, onClose, containerRef, initialFocusRef }: ModalDialogOptions): void {
  // onClose 는 렌더마다 새 함수라 의존성에 넣으면 effect 가 매 렌더 재실행되며 입력 중 포커스를 빼앗는다.
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;

    // 닫은 뒤 키보드 사용자가 원래 자리로 돌아가야 하므로 여는 순간의 포커스를 기억한다.
    const trigger = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeRef.current(); return; }
      if (e.key !== 'Tab') return;
      const target = nextTrapTarget(focusables(), document.activeElement as HTMLElement | null, e.shiftKey);
      if (!target) return;
      e.preventDefault();
      target.focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    (initialFocusRef?.current ?? focusables()[0])?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, [open, containerRef, initialFocusRef]);
}
