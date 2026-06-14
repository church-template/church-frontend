import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { getEvents, EVENTS_PAGE_SIZE } from "@/lib/api/events";
import { getTags } from "@/lib/api/tags";
import { buildCalendarModel, resolveMonth, kstCivilFromDate } from "@/lib/calendar";
import { TagFilter } from "@/components/common/TagFilter";
import { EventCalendar } from "@/components/events/EventCalendar";
import { EventListAction } from "@/components/events/EventAdminActions";

type SearchParams = Record<string, string | string[] | undefined>;

function toNum(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

// 공개 일정 캘린더. searchParams 접근 → 동적 렌더(CI 빌드 prerender 미시도). 목록·태그 병렬.
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const { year, month } = resolveMonth({ year: toNum(sp.year), month: toNum(sp.month) }, now);
  const tagId = toNum(sp.tagId);

  const [data, tags] = await Promise.all([
    getEvents({ year, month, tagId, size: EVENTS_PAGE_SIZE }),
    getTags(),
  ]);
  const model = buildCalendarModel({
    year,
    month,
    today: kstCivilFromDate(now),
    events: data.content,
  });

  return (
    <Container as="section" className="py-section">
      <div className="flex items-center justify-between gap-base">
        <h1 className={cn(typo.displayMd, "text-ink")}>일정</h1>
        <EventListAction />
      </div>
      <div className="mt-lg">
        <TagFilter tags={tags} />
      </div>
      <div className="mt-lg">
        <EventCalendar model={model} tagId={tagId} />
      </div>
    </Container>
  );
}
