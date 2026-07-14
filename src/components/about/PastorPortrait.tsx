import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./PastorPortrait.module.css";

export interface PastorPortraitProps {
  image: { src: string; alt: string; aspect: number } | null;
}

// 세로 초상 액자. 액자 비율을 **사진 비율(aspect)에 맞춘다** — 고정 3:4에 cover로 밀어넣으면
// 원본이 더 긴 사진은 아래가 잘린다(HeroReveal 콜라주와 같은 원칙).
// 자산 미준비(null)면 CSS 기본 3:4 + 장식 아이콘(가짜 사진 끼우지 않음).
// 두 분기 모두 프레임이 박스를 예약 → 자산 도착 시 CLS 0.
export function PastorPortrait({ image }: PastorPortraitProps) {
  return (
    <div
      className={cn(
        styles.frame,
        "overflow-hidden rounded-xl border border-hairline",
      )}
      style={image ? { aspectRatio: image.aspect } : undefined}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- 코드베이스 관례(콘텐츠 이미지 next/image 전환은 후속)
        <img src={image.src} alt={image.alt} className={styles.media} />
      ) : (
        <div className={cn(styles.placeholder, "bg-surface-soft text-muted")}>
          <UserRound size={64} aria-hidden />
        </div>
      )}
    </div>
  );
}
