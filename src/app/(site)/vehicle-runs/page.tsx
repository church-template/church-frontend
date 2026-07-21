import { Suspense } from "react";
import { Container } from "@/components/shell/Container";
import { VehicleGate } from "@/components/vehicles/VehicleGate";
import { VehicleRunList } from "@/components/vehicles/VehicleRunList";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

export const metadata = { title: "차량 탑승 신청" };

// 회원 전용 — 서버 프리렌더 없음, 게이트 통과 후 클라이언트가 전부 조회(챌린지 패턴).
export default function VehicleRunsPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>차량 탑승 신청</h1>
      <Suspense>
        <VehicleGate>
          <VehicleRunList />
        </VehicleGate>
      </Suspense>
    </Container>
  );
}
