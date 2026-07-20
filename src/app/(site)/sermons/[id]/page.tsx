// src/app/(site)/sermons/[id]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { MemberGate } from "@/components/common/MemberGate";
import { DetailSkeleton } from "@/components/common/DetailSkeleton";
import { SermonDetail } from "@/components/sermons/SermonDetail";

export const metadata: Metadata = { title: "설교" };

// 회원전용 설교 상세(가이드 2.3). RSC는 id 검증만 — 데이터는 SermonDetail이 클라 조회(조회수 부수효과 포함).
export default async function SermonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId <= 0) notFound();

  return (
    <Container as="section" className="py-section">
      <Link
        href="/sermons"
        className={cn(typo.bodySm, "inline-flex items-center gap-xxs text-primary")}
      >
        <ChevronLeft size={16} aria-hidden />
        설교 목록
      </Link>
      <MemberGate
        permission="SERMON_VIEW"
        domainLabel="설교"
        skeleton={
          <div className="mt-base">
            <DetailSkeleton />
          </div>
        }
      >
        <SermonDetail id={numId} />
      </MemberGate>
    </Container>
  );
}
