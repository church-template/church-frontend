import type { Metadata } from "next";
import { MypageContent } from "@/components/mypage/MypageContent";

export const metadata: Metadata = { title: "마이페이지" };

export default function MypagePage() {
  return <MypageContent />;
}
