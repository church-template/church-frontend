// src/components/sermons/SermonVideo.tsx
"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { parseYouTubeId } from "@/lib/youtube";
import { buttonVariants } from "@/components/ui/Button";
import { isSafeHttpUrl } from "@/lib/url";

export interface SermonVideoProps {
  url: string;
  title: string;
}

// 유튜브면 썸네일 facade(가벼움) → 클릭 시에만 iframe 로드. 그 외 URL은 링크 폴백(스펙 D7).
export function SermonVideo({ url, title }: SermonVideoProps) {
  const id = parseYouTubeId(url);
  const [playing, setPlaying] = useState(false);

  if (!id) {
    // 안전하지 않은 스킴(javascript:·data:)이면 렌더하지 않는다(저장형 XSS 방어).
    if (!isSafeHttpUrl(url)) return null;
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants("secondary")}
      >
        영상 보기
      </a>
    );
  }

  if (playing) {
    return (
      <div className="aspect-video overflow-hidden rounded-xl bg-surface-dark">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube.com/embed/${id}?autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`${title} 영상 재생`}
      className="group relative block aspect-video w-full overflow-hidden rounded-xl bg-surface-dark"
    >
      {/* 유튜브 정적 썸네일 — 별도 업로드 불필요. eslint-disable: facade라 next/image 불필요 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
        alt=""
        className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-surface-dark/70 text-on-dark">
          <Play size={28} aria-hidden />
        </span>
      </span>
    </button>
  );
}
