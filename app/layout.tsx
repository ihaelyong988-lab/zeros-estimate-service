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
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                      for (let registration of registrations) {
                        registration.unregister().then(function(boolean) {
                          if (boolean) {
                            console.log('ZEROS local dev SW unregistered successfully.');
                            window.location.reload();
                          }
                        });
                      }
                    });
                  } else {
                    navigator.serviceWorker.register('/sw.js').then(function(reg) {
                      console.log('ZEROS Service Worker registered with scope:', reg.scope);
                    }).catch(function(err) {
                      console.error('Service Worker registration failed:', err);
                    });
                  }
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

