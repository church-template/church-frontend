import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import {
  CHURCH_DESCRIPTION,
  CHURCH_NAME,
  CHURCH_URL,
} from "@/constants/church";
import { Toaster } from "@/components/ui/sonner";
import { ChurchJsonLd } from "@/components/seo/ChurchJsonLd";
import { Providers } from "./providers";

// Pretendard Variable self-host (CDN import 금지, DESIGN.md). 가변 폰트라 100~900 전부 커버.
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  // og:image 등 상대 경로를 절대 URL로 변환하는 기준. 도메인 상수(church.ts)에서 온다.
  metadataBase: new URL(CHURCH_URL),
  // 하위 페이지가 title 문자열만 주면 template이 "페이지명 | 은샘교회"로 조립한다. 홈은 default.
  title: {
    default: CHURCH_NAME,
    template: `%s | ${CHURCH_NAME}`,
  },
  description: CHURCH_DESCRIPTION,
  applicationName: CHURCH_NAME,
  // canonical·og:url은 전역에 두지 않는다 — root에 넣으면 전 페이지가 홈을 정본으로 가리키는 SEO 버그.
  openGraph: {
    type: "website",
    siteName: CHURCH_NAME,
    locale: "ko_KR",
    title: CHURCH_NAME,
    description: CHURCH_DESCRIPTION,
    images: [
      {
        // OG는 webp 미지원 채널(카카오톡·페이스북)이 있어 JPEG로 둔다.
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: `${CHURCH_NAME} 대표 이미지`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: CHURCH_NAME,
    description: CHURCH_DESCRIPTION,
    images: ["/og-image.jpg"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ChurchJsonLd />
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
