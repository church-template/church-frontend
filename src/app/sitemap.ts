import type { MetadataRoute } from "next";
import { CHURCH_URL } from "@/constants/church";
import { DEPARTMENTS, allDepartmentSlugs } from "@/constants/departments";
import { getNotices } from "@/lib/api/notices";
import { getEvents } from "@/lib/api/events";
import { parseServerDate } from "@/lib/date";

// 하루 1회 재생성 — 새 공지·행사가 다음날 sitemap에 반영된다(sitemap = 캐시되는 Route Handler).
export const revalidate = 86400;

// 공개 정적 라우트. 설교·갤러리·챌린지는 회원 전용 전환으로 수집 제외(스펙 1장).
const PUBLIC_PATHS = [
  "",
  "/about",
  "/about/history",
  "/about/location",
  "/about/pastor",
  "/about/photos",
  "/worship",
  "/notices",
  "/bulletins",
  "/events",
  "/departments",
];

// 상세 URL 수집 상한 — 소형 사이트라 실질 도달 불가한 안전 상한(폭주 방지).
const MAX_DETAIL_ENTRIES = 500;
const NOTICE_PAGE_SIZE = 100;
// 행사 API는 월 단위 필수(year·month 쌍) — 과거 12개월 + 향후 3개월 창을 월별 순회한다.
const EVENT_MONTHS_BACK = 12;
const EVENT_MONTHS_AHEAD = 3;

// 공지 상세 — 페이지 순회 수집. 실패하면 빈 배열(CI 등 백엔드 없는 빌드는 정적 엔트리만).
async function noticeEntries(): Promise<MetadataRoute.Sitemap> {
  try {
    const entries: MetadataRoute.Sitemap = [];
    let page = 0;
    let totalPages = 1;
    while (page < totalPages && entries.length < MAX_DETAIL_ENTRIES) {
      const res = await getNotices({ page, size: NOTICE_PAGE_SIZE });
      totalPages = res.page.totalPages;
      for (const n of res.content) {
        if (entries.length >= MAX_DETAIL_ENTRIES) break;
        entries.push({
          url: `${CHURCH_URL}/notices/${n.id}`,
          lastModified: parseServerDate(n.createdAt),
        });
      }
      page += 1;
    }
    return entries;
  } catch {
    return [];
  }
}

// 행사 상세 — 월별 조회라 실패한 달만 건너뛴다(allSettled). 걸친 행사는 id로 중복 제거.
async function eventEntries(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const months: { year: number; month: number }[] = [];
  for (let i = -EVENT_MONTHS_BACK; i <= EVENT_MONTHS_AHEAD; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  const results = await Promise.allSettled(months.map((m) => getEvents(m)));
  const entries: MetadataRoute.Sitemap = [];
  const seen = new Set<number>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const e of r.value.content) {
      if (seen.has(e.id) || entries.length >= MAX_DETAIL_ENTRIES) continue;
      seen.add(e.id);
      entries.push({
        url: `${CHURCH_URL}/events/${e.id}`,
        lastModified: parseServerDate(e.startAt),
      });
    }
  }
  return entries;
}

// /sitemap.xml 자동 생성. 부서 상세는 프론트 상수(DEPARTMENTS) 구동이라 백엔드 없이 정적으로 포함한다
// (allDepartmentSlugs는 generateStaticParams와 같은 헬퍼라 sitemap URL이 실제 라우트와 정확히 일치).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const staticEntries = PUBLIC_PATHS.map((path) => ({
    url: `${CHURCH_URL}${path}`,
    lastModified,
  }));
  const deptEntries = allDepartmentSlugs(DEPARTMENTS).map((slug) => ({
    url: `${CHURCH_URL}/departments/${slug}`,
    lastModified,
  }));
  const [notices, events] = await Promise.all([
    noticeEntries(),
    eventEntries(),
  ]);
  return [...staticEntries, ...deptEntries, ...notices, ...events];
}
