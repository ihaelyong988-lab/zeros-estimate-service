import type { NextConfig } from "next";

// 전역 보안 응답 헤더. CSP 전체 정책은 인라인 스크립트와 충돌하므로 넣지 않는다.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
];

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    'mardi-von-framed-outdoors.trycloudflare.com',
    '*.trycloudflare.com',
    'localhost:3000'
  ],
  devIndicators: false,
  // 이미지 최적화 — public/ 원본(공종 실사 16장·히어로)은 표시 슬롯보다 2배 이상 크다.
  // next/image가 요청 폭에 맞춰 리사이즈하고 Accept 헤더에 따라 AVIF→WebP 순으로 내려준다.
  images: {
    formats: ["image/avif", "image/webp"],
    // 원본 파일은 교체 시 파일명을 유지하는 운영 규칙(AGENTS §10-A 공종 실사 사진)이라
    // 캐시 TTL은 정적 헤더(/images/*)와 같은 1년으로 맞춘다.
    minimumCacheTTL: 31536000,
    // public/ 로컬 자산만 최적화하고 쿼리스트링은 막는다(임의 파라미터로 캐시를 부풀리는 요청 차단).
    // 외부 호스트는 remotePatterns 미설정이라 기본 차단이다.
    localPatterns: [{ pathname: "/**", search: "" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      {
        // 공종 실사 사진 등 정적 이미지는 1년 캐시한다.
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
