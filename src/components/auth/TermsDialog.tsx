"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import type { TermsDocument } from "@/constants/terms";

// 체크박스 행 옆 "전문 보기" — 페이지 이탈 없이 약관 본문 확인(스펙 7.2). 가입·재동의 공용.
export function TermsDialog({ doc }: { doc: TermsDocument }) {
  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          typo.caption,
          "inline-flex min-h-12 shrink-0 items-center rounded-sm text-primary underline underline-offset-2",
          "hover:text-primary-active",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        )}
      >
        전문 보기
      </DialogTrigger>
      {/* 본문이 길어 Description 대신 스크롤 영역 사용 — Radix 경고 억제 */}
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{doc.title}</DialogTitle>
        </DialogHeader>
        <div className={cn(typo.bodySm, "max-h-[60vh] overflow-y-auto whitespace-pre-line text-body")}>
          {doc.body}
        </div>
      </DialogContent>
    </Dialog>
  );
}
