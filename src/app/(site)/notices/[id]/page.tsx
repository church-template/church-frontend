// src/app/(site)/notices/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Badge } from "@/components/ui/Badge";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { getNotice } from "@/lib/api/notices";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { NoticeDetailActions } from "@/components/notices/NoticeAdminActions";

// 공개 공지 상세. no-store(getNotice) → 동적. 영상/오디오 없음. isPinned 배지·클릭 태그 필터.
export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const notice = await getNotice(numId);
  if (!notice) notFound();

  return (
    <Container as="section" className="py-section">
      <Link
        href="/notices"
        className={cn(typo.bodySm, "inline-flex items-center gap-xxs text-primary")}
      >
        <ChevronLeft size={16} aria-hidden />
        공지 목록
      </Link>

      {notice.isPinned ? (
        <div className="mt-lg">
          <Badge variant="primary">고정</Badge>
        </div>
      ) : null}

      <h1 className={cn(typo.titleLg, "text-ink", notice.isPinned ? "mt-xs" : "mt-lg")}>
        {notice.title}
      </h1>
      <NoticeDetailActions id={notice.id} version={notice.version} isPinned={notice.isPinned} />

      <p className={cn(typo.datetime, "mt-xs text-muted")}>
        {`${formatDate(notice.createdAt)} · 조회 ${notice.viewCount.toLocaleString("ko-KR")}`}
        {notice.author ? ` · ${notice.author}` : ""}
      </p>

      {notice.tags.length > 0 ? (
        <div className="mt-base flex flex-wrap gap-xs">
          {notice.tags.map((t) => (
            <Link key={t.id} href={`/notices?tagId=${t.id}`}>
              <Badge>{t.name}</Badge>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-lg border-t border-hairline" />
      <MarkdownContent source={notice.content} className="mt-lg" />
    </Container>
  );
}
