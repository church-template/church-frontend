"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SiteShell } from "@/components/shell/SiteShell";
import { Container } from "@/components/shell/Container";
import { Button, buttonVariants } from "@/components/ui/Button";
import { typo } from "@/constants/typography";
import { cn } from "@/lib/utils";

// 런타임 에러 바운더리(Next 16.2: reset 대신 unstable_retry, 스펙 D3).
// 스택·원문 메시지는 사용자에게 노출하지 않는다.
export default function ErrorBoundary({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // 서버 로깅 연동 지점(콘솔에만, 화면 비노출).
    console.error(error);
  }, [error]);

  return (
    <SiteShell showCtaBand={false}>
      <Container as="section" className="flex flex-col items-center gap-lg py-section text-center">
        <h1 className={cn(typo.displayMd, "text-ink")}>문제가 발생했습니다</h1>
        <p className={cn(typo.bodyMd, "text-muted")}>잠시 후 다시 시도해 주세요.</p>
        <div className="flex gap-sm">
          <Button variant="primary" onClick={() => unstable_retry()}>
            다시 시도
          </Button>
          <Link href="/" className={buttonVariants("secondary")}>
            홈으로
          </Link>
        </div>
      </Container>
    </SiteShell>
  );
}
