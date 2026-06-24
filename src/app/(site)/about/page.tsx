import type { Metadata } from "next";
import { VisionHero } from "@/components/about/VisionHero";
import { SymbolismList } from "@/components/about/SymbolismList";
import { HopeStatement } from "@/components/about/HopeStatement";
import { VisionGoals } from "@/components/about/VisionGoals";
import { ChurchStory } from "@/components/about/ChurchStory";
import { ABOUT } from "@/constants/content";

export const metadata: Metadata = { title: ABOUT.title };

// 소개 및 비전 — 상수 구동 서버 컴포넌트. 흰→회색→흰→회색→흰 밴드 리듬(빅타이포 에디토리얼).
export default function AboutPage() {
  return (
    <>
      <VisionHero />
      <SymbolismList />
      <HopeStatement />
      <VisionGoals />
      <ChurchStory />
    </>
  );
}
