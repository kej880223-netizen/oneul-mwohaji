import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import NotificationScheduler from "@/components/NotificationScheduler";
import FamilySync from "@/components/FamilySync";
import StorageErrorToast from "@/components/StorageErrorToast";

export const metadata: Metadata = {
  applicationName: "오늘 뭐하지?",
  title: "오늘 뭐하지?",
  description:
    "24~48개월 아이를 키우는 부모를 위한 AI 육아 도우미. 오늘의 놀이 추천과 육아 상황별 대응을 30초 안에.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  // iOS에서 홈 화면 추가 시 전체화면 앱처럼 실행
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "오늘 뭐하지?",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 확대(핀치 줌) 허용 — 저시력 사용자의 사진·글자 확대를 막지 않는다.
  viewportFit: "cover",
  themeColor: "#FDF8F3",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="app-shell">
          {/* 하단 네비 높이만큼 여백 확보 */}
          <main className="pb-24 min-h-[100dvh]">{children}</main>
          <BottomNav />
        </div>
        <ServiceWorkerRegister />
        <NotificationScheduler />
        <FamilySync />
        <StorageErrorToast />
      </body>
    </html>
  );
}
