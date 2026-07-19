import { renderMarkdown, splitYouTubeSegments } from "@/lib/markdown";
import { SermonVideo } from "@/components/sermons/SermonVideo";

export interface MarkdownContentProps {
  /** raw 마크다운 본문(sermon.content 등, 서버가 없으면 null). renderMarkdown이 변환·새니타이즈한다. */
  source: string | null;
  className?: string;
}

// 순수 표시(서버 컴포넌트 가능) — ISR 시 서버에서 새니타이즈된 HTML을 주입한다.
// 새니타이즈는 renderMarkdown(allowlist)이 책임지므로 dangerouslySetInnerHTML이 안전하다.
// 문단 전체가 유튜브 링크 하나면 SermonVideo(썸네일 facade, client island) 임베드로 렌더한다.
export function MarkdownContent({ source, className }: MarkdownContentProps) {
  const wrapperClass = className ? `prose-church ${className}` : "prose-church";
  const segments = splitYouTubeSegments(source);
  if (!segments.some((s) => s.type === "youtube")) {
    // 유튜브 단독 문단이 없으면 기존과 동일한 단일 주입(마크업 변화 없음)
    return (
      <div
        className={wrapperClass}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(source) }}
      />
    );
  }
  return (
    <div className={wrapperClass}>
      {segments.map((s, i) =>
        s.type === "youtube" ? (
          <SermonVideo key={i} url={s.url} title={s.label ?? "본문 영상"} />
        ) : (
          // 내부에도 prose-church — 문단 간격 규칙(.prose-church > * + *)이 직계 자식에만 걸리기 때문
          <div
            key={i}
            className="prose-church"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(s.source) }}
          />
        ),
      )}
    </div>
  );
}
