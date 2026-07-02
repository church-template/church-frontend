// src/app/(site)/sermons/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { Badge } from "@/components/ui/Badge";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { getSermon } from "@/lib/api/sermons";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { SermonVideo } from "@/components/sermons/SermonVideo";
import { SermonAudio } from "@/components/sermons/SermonAudio";
import { SermonDetailActions } from "@/components/sermons/SermonAdminActions";

// 공개 설교 상세. no-store(getSermon) → 동적. 영상 우선 레이아웃(스펙 D6). 클릭 메타로 목록 필터(D9).
export default async function SermonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  const sermon = await getSermon(numId);
  if (!sermon) notFound();

  return (
    <Container as="section" className="py-section">
      <Link
        href="/sermons"
        className={cn(typo.bodySm, "inline-flex items-center gap-xxs text-primary")}
      >
        <ChevronLeft size={16} aria-hidden />
        설교 목록
      </Link>

      {sermon.videoUrl ? (
        <div className="mt-base">
          <SermonVideo url={sermon.videoUrl} title={sermon.title} />
        </div>
      ) : null}

      <h1 className={cn(typo.titleLg, "mt-lg text-ink")}>{sermon.title}</h1>
      <SermonDetailActions id={sermon.id} />

      <p className={cn(typo.datetime, "mt-xs text-muted")}>
        <Link
          href={`/sermons?preacher=${encodeURIComponent(sermon.preacher)}`}
          className="text-primary"
        >
          {sermon.preacher}
        </Link>
        {` · ${formatDate(sermon.preachedAt)} · 조회 ${sermon.viewCount.toLocaleString("ko-KR")}`}
        {sermon.author ? ` · ${sermon.author}` : ""}
      </p>

      {sermon.scripture || sermon.series ? (
        <p className={cn(typo.bodyMd, "mt-xxs text-body")}>
          {sermon.scripture ? <span>{sermon.scripture}</span> : null}
          {sermon.scripture && sermon.series ? " · " : ""}
          {sermon.series ? (
            <Link
              href={`/sermons?series=${encodeURIComponent(sermon.series)}`}
              className="text-primary"
            >
              {sermon.series}
            </Link>
          ) : null}
        </p>
      ) : null}

      {sermon.tags.length > 0 ? (
        <div className="mt-base flex flex-wrap gap-xs">
          {sermon.tags.map((t) => (
            <Link key={t.id} href={`/sermons?tagId=${t.id}`}>
              <Badge>{t.name}</Badge>
            </Link>
          ))}
        </div>
      ) : null}

      {sermon.audioUrl ? (
        <div className="mt-base">
          <SermonAudio url={sermon.audioUrl} />
        </div>
      ) : null}

      <div className="mt-lg border-t border-hairline" />
      <MarkdownContent source={sermon.content} className="mt-lg" />
    </Container>
  );
}
