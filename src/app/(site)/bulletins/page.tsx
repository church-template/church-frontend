// src/app/(site)/bulletins/page.tsx
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { apiUrl } from "@/lib/auth/apiBase";
import { getBulletins } from "@/lib/api/bulletins";
import { BulletinRow } from "@/components/cards/BulletinRow";
import { BulletinListAction, BulletinRowActions } from "@/components/bulletins/BulletinAdminActions";
import { Pagination } from "@/components/common/Pagination";
import { EmptyState } from "@/components/common/EmptyState";

type SearchParams = Record<string, string | string[] | undefined>;

// page만 파싱(주보는 검색·태그 필터 없음 — 가이드 10장). NaN 방어는 공지와 동일.
function toNum(v: string | string[] | undefined): number | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  const t = s?.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

// 공개 주보 목록. searchParams 접근 → 동적 렌더. 서버 정렬(serviceDate,desc) 신뢰.
// 행 클릭 = /api/media/{mediaId} 새 탭 PDF(스펙 D1 — 상세 페이지 없음).
export default async function BulletinsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const data = await getBulletins({ page: toNum(sp.page) });

  return (
    <Container as="section" className="py-section">
      <div className="flex items-center justify-between gap-base">
        <h1 className={cn(typo.displayMd, "text-ink")}>주보</h1>
        <BulletinListAction />
      </div>

      {data.content.length === 0 ? (
        <EmptyState message="등록된 주보가 없습니다." className="mt-xl" />
      ) : (
        <div className="mt-xl">
          {data.content.map((b) => (
            <BulletinRow
              key={b.id}
              title={b.title}
              date={formatDate(b.serviceDate)}
              author={b.author}
              pdfUrl={apiUrl(`/api/media/${b.mediaId}`)}
              actions={<BulletinRowActions b={b} />}
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
