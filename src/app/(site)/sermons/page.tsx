// src/app/(site)/sermons/page.tsx
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { getSermons, type SermonListParams } from "@/lib/api/sermons";
import { getTags } from "@/lib/api/tags";
import { SermonCard } from "@/components/cards/SermonCard";
import { TagFilter } from "@/components/common/TagFilter";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { SermonSearch } from "@/components/sermons/SermonSearch";
import { ActiveFilters } from "@/components/sermons/ActiveFilters";
import { SermonListAction } from "@/components/sermons/SermonAdminActions";

type SearchParams = Record<string, string | string[] | undefined>;

// 문자열 정규화: 배열이면 첫 값, trim 후 빈 값은 undefined.
function toStr(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  return t ? t : undefined;
}
function toNum(v: string | string[] | undefined): number | undefined {
  const s = toStr(v);
  if (s == null) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined; // NaN 방어
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// 날짜 필터는 yyyy-MM-dd 형식만 통과(비정상 값 백엔드 전달 차단).
function toDate(v: string | string[] | undefined): string | undefined {
  const s = toStr(v);
  return s && DATE_RE.test(s) ? s : undefined;
}

function parseParams(sp: SearchParams): SermonListParams {
  return {
    page: toNum(sp.page),
    tagId: toNum(sp.tagId),
    q: toStr(sp.q),
    preacher: toStr(sp.preacher),
    series: toStr(sp.series),
    from: toDate(sp.from),
    to: toDate(sp.to),
  };
}

// 공개 설교 목록. searchParams 접근 → 동적 렌더(CI 빌드 prerender 미시도). 목록·태그 병렬 fetch.
export default async function SermonsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const params = parseParams(sp);
  const [data, tags] = await Promise.all([getSermons(params), getTags()]);

  return (
    <Container as="section" className="py-section">
      <div className="flex items-center justify-between gap-base">
        <h1 className={cn(typo.displayMd, "text-ink")}>설교</h1>
        <SermonListAction />
      </div>

      <div className="mt-lg flex flex-col gap-base">
        <SermonSearch />
        <TagFilter tags={tags} />
        <ActiveFilters />
      </div>

      {data.content.length === 0 ? (
        <EmptyState message="조건에 맞는 설교가 없습니다." className="mt-xl" />
      ) : (
        <div className="mt-xl grid gap-base sm:grid-cols-2 lg:grid-cols-3">
          {data.content.map((s) => (
            <SermonCard
              key={s.id}
              href={`/sermons/${s.id}`}
              title={s.title}
              preacher={s.preacher}
              date={formatDate(s.preachedAt)}
              series={s.series}
              scripture={s.scripture}
              tags={s.tags.map((t) => t.name)}
            />
          ))}
        </div>
      )}

      {data.page.totalPages > 1 ? (
        <div className="mt-xl">
          <Pagination page={data.page} />
        </div>
      ) : null}
    </Container>
  );
}
