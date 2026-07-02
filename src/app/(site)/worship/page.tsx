import { WorshipRegular } from "@/components/worship/WorshipRegular";
import { WorshipSpecial } from "@/components/worship/WorshipSpecial";
import { WorshipPlace } from "@/components/worship/WorshipPlace";

// 예배 시간 안내 — 정적 생성(공개 콘텐츠는 상수 주입, API 호출 없음).
export default function WorshipPage() {
  return (
    <>
      <WorshipRegular />
      <WorshipSpecial />
      <WorshipPlace />
    </>
  );
}
