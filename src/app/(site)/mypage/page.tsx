import type { Metadata } from "next";
import { MypageContent } from "@/components/mypage/MypageContent";

export const metadata: Metadata = {
  title: "마이페이지",
  // 회원 전용 — robots.txt 차단과 별개로 외부 링크 유입 색인도 막는다(이중 방어, 스펙 1장).
  robots: { index: false, follow: false },
};

export default function MypagePage() {
  return <MypageContent />;
}
