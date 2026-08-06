import type { Metadata } from "next";
import { WorshipRegular } from "@/components/worship/WorshipRegular";
import { WorshipSpecial } from "@/components/worship/WorshipSpecial";
import { WorshipPlace } from "@/components/worship/WorshipPlace";
import { CHURCH_NAME } from "@/constants/church";
import { WORSHIP } from "@/constants/content";

export const metadata: Metadata = {
  title: WORSHIP.title,
  description: `${CHURCH_NAME} 예배 시간과 장소를 안내합니다.`,
  alternates: { canonical: "/worship" },
};

// 예배 시간 안내 — 정적 생성(공개 콘텐츠는 상수 주입, API 호출 없음).
export default function WorshipPage() {
  return (
    <>
      <WorshipRegular />
      <WorshipSpecial />
      <WorshipPlace />
    </>
  );
}
