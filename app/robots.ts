import type { MetadataRoute } from 'next';

// 라이브 도메인(AGENTS §8). sitemap 절대 URL과 동일 기준.
const SITE_URL = 'https://zerospipe.co.kr';

// /robots.txt — 크롤러 접근 규칙. 관리자 백오피스(/admin)와 API 라우트는 색인에서 제외한다.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
