"use client";

import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { parseYouTubeId } from "@/lib/youtube";
import { buildTable } from "@/lib/markdownEditing";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

// 마크다운 템플릿을 그대로 꽂으면 결국 문법을 알아야 하므로, 입력을 받아 완성형으로 삽입한다.
// 모든 Dialog는 조건부 마운트 전제(닫히면 언마운트) — 필드 상태 리셋이 필요 없다.
interface InsertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (snippet: string) => void;
}

// 세 Dialog가 같은 뼈대(제목 + 필드 + 취소/넣기)를 공유한다 — 세 번째 Dialog 등장을 계기로 추출.
function InsertDialogShell({
  open,
  onOpenChange,
  title,
  onConfirm,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onConfirm: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-sm">{children}</div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type="button" variant="primary" onClick={onConfirm}>
            넣기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
    <InsertDialogShell open={open} onOpenChange={onOpenChange} title="링크 넣기" onConfirm={confirm}>
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
    </InsertDialogShell>
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
    <InsertDialogShell open={open} onOpenChange={onOpenChange} title="유튜브 영상 넣기" onConfirm={confirm}>
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
    </InsertDialogShell>
  );
}

export function TableInsertDialog({ open, onOpenChange, onInsert }: InsertDialogProps) {
  const [cols, setCols] = useState("2");
  const [rows, setRows] = useState("2");
  const [error, setError] = useState<string | undefined>(undefined);

  function confirm() {
    const m = Number(cols);
    const n = Number(rows);
    if (!Number.isInteger(m) || m < 1 || m > 8 || !Number.isInteger(n) || n < 1 || n > 20) {
      setError("열은 1~8, 행은 1~20 사이로 입력해 주세요.");
      return;
    }
    onInsert(buildTable(m, n));
  }

  return (
    <InsertDialogShell open={open} onOpenChange={onOpenChange} title="표 넣기" onConfirm={confirm}>
      <div className="grid grid-cols-2 gap-sm">
        <label className="flex flex-col gap-xxs">
          <span className={cn(typo.bodySm, "text-ink")}>열 수 (가로 칸)</span>
          <Input
            type="number"
            min={1}
            max={8}
            value={cols}
            onChange={(e) => {
              setCols(e.target.value);
              setError(undefined);
            }}
          />
        </label>
        <label className="flex flex-col gap-xxs">
          <span className={cn(typo.bodySm, "text-ink")}>행 수 (세로 줄)</span>
          <Input
            type="number"
            min={1}
            max={20}
            value={rows}
            onChange={(e) => {
              setRows(e.target.value);
              setError(undefined);
            }}
          />
        </label>
      </div>
      {error ? <p className={cn(typo.caption, "text-error")}>{error}</p> : null}
      <p className={cn(typo.caption, "text-muted")}>
        첫 줄(제목1·제목2…)은 표의 머리글입니다 — 넣은 뒤 내용을 바꿔 쓰세요.
      </p>
    </InsertDialogShell>
  );
}
