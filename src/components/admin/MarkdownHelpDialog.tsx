"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

// 어드민 UI 도움말 텍스트(교회별 콘텐츠 아님 — church.ts 주입 대상이 아니다).
// 이미지·유튜브는 예시로 렌더하면 실제 네트워크 요청이 생겨 규칙 목록으로만 안내한다.
const EXAMPLES = [
  "# 큰 제목",
  "## 중간 제목",
  "### 작은 제목",
  "**굵게** 와 *기울임* 과 ~~지운 글씨~~",
  "- 글머리 목록",
  "1. 번호 목록",
  "> 인용문",
  "[교회 소개](https://example.com)",
  "| 항목 | 값 |\n| --- | --- |\n| 예배 | 11시 |",
];

const RULES = [
  "문단을 나누려면 빈 줄을 한 줄 넣습니다.",
  "유튜브 주소를 한 줄에 혼자 두면 본문에서 영상으로 보입니다.",
  "이미지는 툴바의 이미지 버튼으로 넣습니다 — 코드는 자동 입력됩니다.",
  "구분선(---)은 한 줄에 혼자 둡니다.",
];

export interface MarkdownHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarkdownHelpDialog({ open, onOpenChange }: MarkdownHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 2열 치트시트라 기본 모달 폭(32rem)이 좁다 — 라이트박스 폭 토큰으로 확장(PhotoLightbox 선례) */}
      <DialogContent aria-describedby={undefined} className="max-w-[var(--container-lightbox)]">
        <DialogHeader>
          <DialogTitle>마크다운 사용법</DialogTitle>
        </DialogHeader>
        <p className={cn(typo.bodySm, "text-body")}>
          왼쪽처럼 쓰면 오른쪽처럼 보입니다. 툴바 버튼을 누르면 기호가 자동으로 입력됩니다.
        </p>
        <ul className="flex flex-col">
          {EXAMPLES.map((syntax) => (
            <li
              key={syntax}
              className="grid grid-cols-2 items-center gap-base border-t border-hairline py-sm first:border-t-0"
            >
              <pre className={cn(typo.bodySm, "whitespace-pre-wrap text-muted")}>{syntax}</pre>
              <MarkdownContent source={syntax} />
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-xxs">
          <h3 className={cn(typo.titleSm, "text-ink")}>알아두면 좋아요</h3>
          <ul className={cn(typo.bodySm, "flex list-disc flex-col gap-xxs pl-base text-body")}>
            {RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
