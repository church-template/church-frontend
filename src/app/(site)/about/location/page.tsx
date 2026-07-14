import { LocationContact } from "@/components/about/LocationContact";
import { LocationDirections } from "@/components/about/LocationDirections";
import { InquirySection } from "@/components/about/InquirySection";

// 연락처·오시는 길 — 정적 생성(공개 콘텐츠는 상수 주입, API 호출 없음).
// 문의 폼은 제출(POST)만 하는 client 섹션이라 페이지의 정적 생성을 깨지 않는다.
export default function LocationPage() {
  return (
    <>
      <LocationContact />
      <LocationDirections />
      <InquirySection />
    </>
  );
}
