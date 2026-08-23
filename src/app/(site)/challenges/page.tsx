import { Suspense } from "react";
import { Container } from "@/components/shell/Container";
import { ChallengeGate } from "@/components/challenges/ChallengeGate";
import { ChallengeList } from "@/components/challenges/ChallengeList";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "성경통독 챌린지",
  // 회원 전용 — robots.txt 차단과 별개로 외부 링크 유입 색인도 막는다(이중 방어, 스펙 1장).
  robots: { index: false, follow: false },
};

export default function ChallengesPage() {
  return (
    <Container as="section" className="py-section">
      <h1 className={cn(typo.displayMd, "text-ink")}>성경통독 챌린지</h1>
      <Suspense>
        <ChallengeGate>
          <ChallengeList />
        </ChallengeGate>
      </Suspense>
    </Container>
  );
}
