// src/app/(site)/sermons/page.tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import { Container } from "@/components/shell/Container";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";
import { MemberGate } from "@/components/common/MemberGate";
import { SermonList } from "@/components/sermons/SermonList";
import { SermonListAction } from "@/components/sermons/SermonAdminActions";

export const metadata: Metadata = { title: "설교" };

// 회원전용 설교 목록(가이드 2.3). 게이트가 권한(SERMON_VIEW)을 선판단하고, SermonList가
// useSearchParams로 필터를 읽어 TanStack Query로 조회한다. useSearchParams 때문에 Suspense 경계 필요.
export default function SermonsPage() {
  return (
    <Container as="section" className="py-section">
      {/* 등록 버튼은 공지·일정처럼 제목 행에 — 필터 행에 두면 알약이 폭을 나눠 써 일찍 줄바꿈된다. */}
      <div className="flex items-center justify-between gap-base">
        <h1 className={cn(typo.displayMd, "text-ink")}>설교</h1>
        <SermonListAction />
      </div>
      <Suspense fallback={null}>
        <MemberGate permission="SERMON_VIEW" domainLabel="설교">
          <SermonList />
        </MemberGate>
      </Suspense>
    </Container>
  );
}
