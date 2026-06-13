import { Suspense } from "react";
import type { Metadata } from "next";
import { AgreementsForm } from "@/components/auth/AgreementsForm";

export const metadata: Metadata = { title: "약관 동의" };

// useSearchParams(next 복귀)는 정적 페이지에서 Suspense 경계 필수 — 없으면 프로덕션 빌드 실패(Next16).
export default function AgreementsPage() {
  return (
    <Suspense fallback={null}>
      <AgreementsForm />
    </Suspense>
  );
}
