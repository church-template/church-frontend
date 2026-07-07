import { Suspense } from "react";
import { Container } from "@/components/shell/Container";
import { ChallengeGate } from "@/components/challenges/ChallengeGate";
import { ChallengeList } from "@/components/challenges/ChallengeList";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

export const metadata = { title: "성경통독 챌린지" };

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
