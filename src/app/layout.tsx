import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CHURCH_NAME } from "@/constants/church";

// Pretendard Variable self-host (CDN import 금지, DESIGN.md). 가변 폰트라 100~900 전부 커버.
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: CHURCH_NAME,
  description: `${CHURCH_NAME} 홈페이지`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
