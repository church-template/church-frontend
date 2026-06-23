import type { Metadata } from "next";
import { PastorIntro } from "@/components/about/PastorIntro";
import { PastorQuote } from "@/components/about/PastorQuote";
import { PastorDossier } from "@/components/about/PastorDossier";

export const metadata: Metadata = { title: "목회자 인사말" };

// 공개 인사말 — 상수 구동 서버 컴포넌트. 흰→다크(인용)→회색→전역 다크 CTA 밴드 리듬.
export default function PastorPage() {
  return (
    <>
      <PastorIntro />
      <PastorQuote />
      <PastorDossier />
    </>
  );
}
