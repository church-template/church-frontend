"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { formatDate } from "@/lib/date";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DetailSkeleton } from "@/components/common/DetailSkeleton";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { SermonVideo } from "./SermonVideo";
import { SermonAudio } from "./SermonAudio";
import { SermonDetailActions } from "./SermonAdminActions";
import { useSermon } from "./queries";

// 상세 클라이언트 — 영상 우선 레이아웃(스펙 D6)·클릭 메타로 목록 필터(D9)는 RSC 시절 그대로.
// 조회수+1 부수효과는 fetchSermon GET에 포함(쿼리 캐시 내 재방문은 미증가 — 갤러리와 동일 시맨틱).
export function SermonDetail({ id }: { id: number }) {
  const { data: sermon, isPending, isError, refetch } = useSermon(id);

  if (isPending) {
    return (
      <div className="mt-base">
        <DetailSkeleton />
      </div>
    );
  }
  if (isError || !sermon) {
    return (
      <div className="mt-lg flex flex-col items-start gap-sm">
        <p className={cn(typo.bodyMd, "text-muted")}>설교를 불러오지 못했습니다.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }
  return (
    <>
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
    </>
  );
}
