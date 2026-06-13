import { Suspense } from "react";
import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "회원가입" };

// useSearchParams(next 복귀)는 정적 페이지에서 Suspense 경계 필수 — 없으면 프로덕션 빌드 실패(Next16).
export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
