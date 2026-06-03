import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ShellProvider } from "@/lib/context/ShellContext";

export const metadata: Metadata = {
  title: "ZEROS — 산업설비 예상견적 서비스",
  description: "공사 전에 배관 및 장비설치의 범위, 리스크, 예산을 먼저 검토하는 산업설비 예상견적 플랫폼. 합리적인 CAPEX 투자를 지원합니다.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ZEROS",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F1E35",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
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
