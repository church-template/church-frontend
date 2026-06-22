"use client";

import { useState } from "react";
import type { HeroMedia } from "@/hero/types";

export interface HistoryMediaProps {
  media: HeroMedia;
  priority?: boolean; // 첫 챕터만 eager, 나머지 lazy
}

// 연출 장식 미디어 — CrossHero/MediaCollage와 동일 onError→poster 폴백. 콘텐츠 이미지가 아니라 next/image 미사용.
export function HistoryMedia({ media, priority = false }: HistoryMediaProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  if (media.type === "video" && !videoFailed) {
    return (
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        src={media.src}
        poster={media.poster}
        onError={() => setVideoFailed(true)}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 연출용 장식 미디어(콘텐츠 이미지는 next/image)
    <img
      src={media.type === "video" ? (media.poster ?? "") : media.src}
      alt={media.type === "image" ? (media.alt ?? "") : ""}
      loading={priority ? "eager" : "lazy"}
    />
  );
}
