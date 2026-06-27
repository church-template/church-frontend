import { LocationContact } from "@/components/about/LocationContact";
import { LocationDirections } from "@/components/about/LocationDirections";

// 연락처·오시는 길 — 정적 생성(공개 콘텐츠는 상수 주입, API 호출 없음).
export default function LocationPage() {
  return (
    <>
      <LocationContact />
      <LocationDirections />
    </>
  );
}
