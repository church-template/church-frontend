import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./PastorPortrait.module.css";

export interface PastorPortraitProps {
  image: { src: string; alt: string } | null;
}

// 3:4 초상 액자. 자산 미준비(null)면 surface-soft 폴백 + 장식 아이콘(가짜 사진 끼우지 않음).
// 두 분기 모두 동일 프레임이 박스를 예약 → 자산 도착 시 CLS 0.
export function PastorPortrait({ image }: PastorPortraitProps) {
  return (
    <div className={cn(styles.frame, "overflow-hidden rounded-xl border border-hairline")}>
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
