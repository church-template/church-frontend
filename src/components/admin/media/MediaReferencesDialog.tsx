// src/components/admin/media/MediaReferencesDialog.tsx
"use client";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import type { MediaReference } from "@/lib/auth/apiError";

export interface MediaReferencesDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  references: MediaReference[];
}

// 차단형 삭제 안내(DESIGN media-references-list). 참조 type/title만 표시, 삭제 버튼 없음(편집 유도).
// type casing 미확정(스펙 §11.4)이라 분기·딥링크 없이 텍스트로만 노출.
export function MediaReferencesDialog({ open, onOpenChange, references }: MediaReferencesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>삭제할 수 없습니다</DialogTitle>
          <DialogDescription>
            이 미디어를 사용 중인 콘텐츠가 있어 삭제할 수 없습니다. 아래 콘텐츠에서 먼저 제거해 주세요.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col">
          {references.map((r) => (
            <li
              key={`${r.type}-${r.id}`}
              className={cn(typo.bodyMd, "flex items-center gap-sm border-b border-hairline py-sm text-ink")}
            >
              <span className={cn(typo.caption, "shrink-0 text-muted")}>{r.type}</span>
              <span className="truncate">{r.title}</span>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
