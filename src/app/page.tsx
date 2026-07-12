import { connection } from "next/server";
import { HeroHeaderSync } from "@/components/main/HeroHeaderSync";
import { WorshipSection } from "@/components/main/WorshipSection";
import { SermonSection } from "@/components/main/SermonSection";
import { NoticeSection } from "@/components/main/NoticeSection";
import { EventSection } from "@/components/main/EventSection";
import { CtaBand } from "@/components/shell/CtaBand";
import { SiteFooter } from "@/components/shell/SiteFooter";
import { getMain } from "@/lib/api/main";
import { HistoryBand } from "@/components/main/HistoryBand";
import { MinistryCards } from "@/components/main/MinistryCards";
import {
  HERO,
  HERO_CAPTION,
  HERO_POSTER_ASPECT,
  COLLAGE_TILES,
} from "@/constants/church";

// 메인(가이드 13.4) — 공개 콘텐츠 서버 fetch. SiteShell 대신 투명 헤더를 직접 합성(T07 §5.2).
export default async function Home() {
  // CI가 백엔드 없이 build하므로 prerender(= 빌드 시 /api/main 호출)를 요청 시점으로 미룬다(스펙 D8).
  // force-dynamic과 달리 fetch 데이터 캐시(revalidate 60)는 그대로 동작 — 백엔드 부하는 60s 캐시가 흡수.
  await connection();
  const main = await getMain();

  // 줄 단위 카피 배열 → block span 합성(가이드 13.3의 "\n" 이슈 원천 차단, 줄별 텍스트 노드 유지)
  const caption = HERO_CAPTION.map((line, i) => (
    <span key={i} className="block">
      {line}
    </span>
  ));

  return (
    <>
      <HeroHeaderSync
        media={HERO}
        caption={caption}
        tiles={COLLAGE_TILES}
        posterAspect={HERO_POSTER_ASPECT}
      >
        <HistoryBand />
        <MinistryCards />
        <WorshipSection />
        <SermonSection sermons={main.sermons} />
        <NoticeSection notices={main.notices} />
        <EventSection events={main.upcomingEvents} />
      </HeroHeaderSync>
      <CtaBand />
      <SiteFooter />
    </>
  );
}
