import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AlertCircle } from 'lucide-react';
import { AlertBanner } from '@/components/admin/AlertBanner';

// 통합 전 AdminDashboard·CustomerList·VisitList·NotificationLog 에 6번 복사돼 있던 배너.
// 이 마크업과 렌더 결과가 같아야 "통합이지 리디자인이 아니다" 가 성립한다.
// (JSX 를 못 쓰는 .test.ts 라 createElement 로 같은 트리를 세운다.)
const legacyBanner = (message: string) =>
  React.createElement(
    'div',
    {
      role: 'alert',
      'aria-live': 'assertive',
      className: 'bg-danger/5 border border-danger/20 rounded-custom px-4 py-3 flex items-start gap-2',
    },
    React.createElement(AlertCircle, { className: 'w-5 h-5 shrink-0 mt-px text-danger' }),
    React.createElement('span', { className: 'text-[13.5px] font-bold text-danger leading-snug' }, message),
  );

describe('AlertBanner', () => {
  it('메시지가 있으면 통합 전 배너와 같은 마크업을 낸다', () => {
    const message = '고객 데이터베이스를 불러오지 못했습니다. 관리자 세션이 만료되었습니다.';

    expect(renderToStaticMarkup(React.createElement(AlertBanner, { message }))).toBe(
      renderToStaticMarkup(legacyBanner(message)),
    );
  });

  it('메시지가 없으면 아무것도 그리지 않는다', () => {
    // 호출부에서 `{loadError && (…)}` 를 떼어낸 대가를 컴포넌트가 대신 진다.
    expect(renderToStaticMarkup(React.createElement(AlertBanner, { message: undefined }))).toBe('');
    expect(renderToStaticMarkup(React.createElement(AlertBanner, { message: null }))).toBe('');
  });
});
