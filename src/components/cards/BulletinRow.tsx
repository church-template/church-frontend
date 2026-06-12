import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface BulletinRowProps {
  title: string;
  /** formatDate(serviceDate) 결과 — 포맷 책임은 호출부(스펙 §4) */
  date: string;
  /** 서버 마스킹 그대로 표기(가이드 7장). null/빈 값이면 줄 생략 */
  author?: string | null;
  /** apiUrl 결합 완료된 /api/media/{mediaId} URL */
  pdfUrl: string;
}

// 주보 행(DESIGN.md bulletin-row) — notice-row 변형. 외부(백엔드 오리진) PDF라
// next/link 대신 anchor + 새 탭. 행 전체가 클릭 영역, 하단 hairline.
export function BulletinRow({ title, date, author, pdfUrl }: BulletinRowProps) {
  return (
    <a
      href={pdfUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex items-center justify-between gap-base border-b border-hairline py-base",
        "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
      )}
    >
      <span className="flex min-w-0 flex-col gap-xs">
        {/* hover 시 제목만 primary로 전이 — 행 전체가 링크임을 조용히 알린다(NoticeRow와 동일). */}
        <span
          className={cn(
            typo.titleSm,
            "truncate text-ink transition-colors duration-150 ease-out group-hover:text-primary",
          )}
        >
          {title}
          <span className="sr-only">(새 탭에서 PDF 열림)</span>
        </span>
        {author ? (
          <span className={cn(typo.bodySm, "text-muted")}>{author}</span>
        ) : null}
      </span>
      <span className={cn(typo.datetime, "shrink-0 text-muted")}>{date}</span>
    </a>
  );
}
