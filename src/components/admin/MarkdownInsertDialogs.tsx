"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { parseYouTubeId } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

// 마크다운 템플릿을 그대로 꽂으면 결국 문법을 알아야 하므로, 입력을 받아 완성형으로 삽입한다.
// 두 Dialog 모두 조건부 마운트 전제(닫히면 언마운트) — 필드 상태 리셋이 필요 없다.
interface InsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (snippet: string) => void;
}

export function LinkInsertDialog({ open, onOpenChange, onInsert }: InsertDialogProps) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  function confirm() {
    const u = url.trim();
    if (!/^https?:\/\//.test(u)) {
      setError("https:// 로 시작하는 주소를 입력해 주세요.");
      return;
    }
    onInsert(`[${label.trim() || u}](${u})`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>링크 넣기</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-sm">
          <label className="flex flex-col gap-xxs">
            <span className={cn(typo.bodySm, "text-ink")}>표시할 문구 (선택)</span>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="예: 교회 소개" />
          </label>
          <label className="flex flex-col gap-xxs">
            <span className={cn(typo.bodySm, "text-ink")}>주소</span>
            <Input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(undefined);
              }}
              error={error}
              placeholder="https://"
            />
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" variant="primary" onClick={confirm}>
            넣기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function YoutubeInsertDialog({ open, onOpenChange, onInsert }: InsertDialogProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  function confirm() {
    const u = url.trim();
    if (!parseYouTubeId(u)) {
      setError("유튜브 주소가 아닙니다.");
      return;
    }
    onInsert(u);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>유튜브 영상 넣기</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-sm">
          <label className="flex flex-col gap-xxs">
            <span className={cn(typo.bodySm, "text-ink")}>유튜브 주소</span>
            <Input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(undefined);
              }}
              error={error}
              placeholder="https://youtu.be/..."
            />
          </label>
          <p className={cn(typo.caption, "text-muted")}>본문에서 자동으로 영상 화면으로 보입니다.</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" variant="primary" onClick={confirm}>
            넣기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
