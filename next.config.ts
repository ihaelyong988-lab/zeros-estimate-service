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
