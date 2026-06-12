// src/app/(site)/notices/page.tsx
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { getNotices, type NoticeListParams } from "@/lib/api/notices";
import { getTags } from "@/lib/api/tags";
import { NoticeRow } from "@/components/cards/NoticeRow";
import { TagFilter } from "@/components/common/TagFilter";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";
import { SearchPill } from "@/components/common/SearchPill";

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

function parseParams(sp: SearchParams): NoticeListParams {
  return {
    page: toNum(sp.page),
    tagId: toNum(sp.tagId),
    q: toStr(sp.q),
  };
}

// 공개 공지 목록. searchParams 접근 → 동적 렌더. 목록·태그 병렬 fetch. 서버 정렬(고정 우선) 신뢰.
export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const params = parseParams(sp);
  const [data, tags] = await Promise.all([getNotices(params), getTags()]);

  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>공지</h1>

      <div className="mt-lg flex flex-col gap-base">
        <SearchPill placeholder="제목" ariaLabel="공지 검색" />
        <TagFilter tags={tags} />
      </div>

      {data.content.length === 0 ? (
        <EmptyState message="조건에 맞는 공지가 없습니다." className="mt-xl" />
      ) : (
        <div className="mt-xl">
          {data.content.map((n) => (
            <NoticeRow
              key={n.id}
              href={`/notices/${n.id}`}
              title={n.title}
              date={formatDate(n.createdAt)}
              isPinned={n.isPinned}
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
