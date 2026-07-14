import { Container } from "@/components/shell/Container";
import { LocationContact } from "@/components/about/LocationContact";
import { LocationDirections } from "@/components/about/LocationDirections";
import { InquirySection } from "@/components/about/InquirySection";

// 연락처·오시는 길 — 정적 생성(공개 콘텐츠는 상수 주입, API 호출 없음).
// 문의 폼은 제출(POST)만 하는 client 섹션이라 페이지의 정적 생성을 깨지 않는다.
export default function LocationPage() {
  return (
    <>
      <LocationContact />

      {/* 회색 밴드 — 흰 섹션(연락처) 다음의 교차 밴드. 좌 찾아오는 방법 : 우 문의 카드(5:7).
          문의가 이 페이지의 주 행동이라 폭을 더 준다. 좁은 화면에서는 DOM 순서대로 세로로 쌓인다. */}
      <div className="bg-surface-soft py-section">
        <Container>
          <div className="grid gap-xl lg:grid-cols-[5fr_7fr] lg:items-start">
            <LocationDirections />
            <InquirySection />
          </div>
        </Container>
      </div>
    </>
  );
}
