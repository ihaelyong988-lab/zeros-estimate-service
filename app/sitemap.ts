import type { MetadataRoute } from 'next';

// 라이브 도메인(AGENTS §8). robots.ts와 동일 기준.
const SITE_URL = 'https://zerospipe.co.kr';

// /sitemap.xml — 화면 전환이 전부 클라이언트 상태(?tab=…)로 처리되는 단일 페이지 앱이라
// 색인 대상 URL은 루트 1개다. 탭 쿼리를 개별 항목으로 나열하면 같은 문서가 중복 등록된다.
// 이 라우트는 정적 프리렌더라 new Date()를 쓰면 lastmod가 '빌드 시각'으로 굳는다.
// 문서가 바뀌지 않아도 배포할 때마다 갱신된 것처럼 보이므로 크롤러에게 사실이 아니다.
// 콘텐츠가 실제로 바뀐 날짜를 손으로 적는다 — 홈 카피·구성을 고칠 때 함께 올린다.
const CONTENT_LAST_MODIFIED = '2026-08-01';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: CONTENT_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
