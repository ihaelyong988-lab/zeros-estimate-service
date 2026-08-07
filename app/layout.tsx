import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ShellProvider } from "@/lib/context/ShellContext";

// 라이브 도메인(AGENTS §8). openGraph 상대 경로를 절대 URL로 승격하는 기준이 된다.
const SITE_URL = "https://zerospipe.co.kr";
const SITE_TITLE = "ZEROS — 산업설비 예상견적 서비스";
const SITE_DESCRIPTION =
  "공사 전에 배관 및 장비설치의 범위, 리스크, 예산을 먼저 검토하는 산업설비 예상견적 플랫폼. 합리적인 CAPEX 투자를 지원합니다.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  appleWebApp: {
    capable: true,
    // 모바일 메인화면이 화이트 셸이라(§10-A 공통 1항) black-translucent 의 흰 상태바 글자가 보이지 않는다.
    // default 는 상태바 글자를 검정으로 두고 뷰포트를 상태바 아래에서 시작시킨다 — 헤더가 가려지지도 않는다.
    statusBarStyle: "default",
    title: "ZEROS",
  },
  // 카카오톡·검색엔진 링크 미리보기용(2026-08-01 P3-2). 이미지는 홈 히어로에 이미 쓰는 파일을 재사용한다.
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "ZEROS",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/hero-engineers.jpg",
        width: 1536,
        height: 1024,
        alt: "현장 엔지니어가 노트북으로 배관 설비를 검토하는 모습",
      },
    ],
  },
};

export const viewport: Viewport = {
  // 주소창·작업전환기 색은 모바일 메인화면(홈 랜딩)과 맞춘다 — 랜딩이 화이트가 되면서 네이비는 어긋난다.
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* manifest·상태바 스타일은 metadata 한 곳에서만 선언한다(HTML 중복 출력 방지).
            아래 capable 은 Next 가 내보내는 mobile-web-app-capable 의 구형 iOS 대체 이름이라 중복이 아니다. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 서비스 워커는 더 이상 사용하지 않는다.
              // 과거에 설치된 워커와 캐시를 모든 환경에서 정리해 stale 화면을 방지한다.
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    registrations.forEach(function(registration) {
                      registration.unregister();
                    });
                  });
                });
              }
              if ('caches' in window && caches.keys) {
                caches.keys().then(function(keys) {
                  keys.forEach(function(key) { caches.delete(key); });
                });
              }
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg-subtle text-text">
        <ShellProvider>
          {children}
        </ShellProvider>
      </body>
    </html>
  );
}
