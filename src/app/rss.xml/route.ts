// RSS 2.0 피드 — 공지·행사 통합 최신 50건. 네이버 서치어드바이저 제출용(스펙 6장).
// 백엔드 실패 시 해당 도메인만 건너뛰고 빈 채널이라도 반환한다(CI 빌드·장애 폴백).
import {
  CHURCH_DESCRIPTION,
  CHURCH_NAME,
  CHURCH_URL,
} from "@/constants/church";
import { getEvents } from "@/lib/api/events";
import { getNotices } from "@/lib/api/notices";
import { formatDate, parseServerDate } from "@/lib/date";
import { buildRssXml, type RssItem } from "@/lib/rss";

// sitemap과 같은 주기(하루 1회) 재생성.
export const revalidate = 86400;

const RSS_MAX_ITEMS = 50;

export async function GET(): Promise<Response> {
  const items: RssItem[] = [];

  try {
    const notices = await getNotices({ page: 0, size: RSS_MAX_ITEMS });
    for (const n of notices.content) {
      items.push({
        title: n.title,
        link: `${CHURCH_URL}/notices/${n.id}`,
        pubDate: parseServerDate(n.createdAt),
        // 목록 응답에 본문이 없어 제목으로 갈음(상세 조회는 조회수 부수효과라 금지).
        description: n.title,
      });
    }
  } catch {
    // 공지 없이 계속 — 부분 실패 허용(스펙 8장)
  }

  // 행사 API는 월 단위 — 전월·당월·익월 3개 달만 훑는다(피드는 "최근 소식"이면 충분).
  const now = new Date();
  const months = [-1, 0, 1].map((i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const results = await Promise.allSettled(months.map((m) => getEvents(m)));
  const seen = new Set<number>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const e of r.value.content) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      items.push({
        title: e.title,
        link: `${CHURCH_URL}/events/${e.id}`,
        pubDate: parseServerDate(e.startAt),
        description: `일정 ${formatDate(e.startAt)}${e.location ? ` · ${e.location}` : ""}`,
      });
    }
  }

  items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  const xml = buildRssXml(
    { title: CHURCH_NAME, link: CHURCH_URL, description: CHURCH_DESCRIPTION },
    items.slice(0, RSS_MAX_ITEMS),
  );
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
