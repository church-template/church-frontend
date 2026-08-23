import { Container } from "@/components/shell/Container";
import { ChallengeGate } from "@/components/challenges/ChallengeGate";
import { ChallengeDetail } from "@/components/challenges/ChallengeDetail";

export const metadata = {
  title: "성경통독",
  // 회원 전용 — robots.txt 차단과 별개로 외부 링크 유입 색인도 막는다(이중 방어, 스펙 1장).
  robots: { index: false, follow: false },
};

// 회원 전용 — 서버 프리렌더 없음, 게이트 통과 후 클라이언트가 전부 조회(스펙 §2).
export default async function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Container as="section" className="py-section">
      <ChallengeGate>
        <ChallengeDetail id={Number(id)} />
      </ChallengeGate>
    </Container>
  );
}
