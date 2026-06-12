// src/components/sermons/SermonAudio.tsx
import { buttonVariants } from "@/components/ui/Button";
import { isSafeHttpUrl } from "@/lib/url";

// 네이티브 audio는 상호작용 JS 불필요 → 서버 컴포넌트. 직접 음원이면 플레이어, 아니면 링크(스펙 D8).
const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|wav)(\?.*)?$/i;

export interface SermonAudioProps {
  url: string;
}

export function SermonAudio({ url }: SermonAudioProps) {
  // 안전하지 않은 스킴이면 렌더하지 않는다(저장형 XSS 방어).
  if (!isSafeHttpUrl(url)) return null;
  if (AUDIO_EXT.test(url)) {
    return <audio controls preload="none" src={url} className="w-full" />;
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants("secondary")}
    >
      오디오 듣기
    </a>
  );
}
