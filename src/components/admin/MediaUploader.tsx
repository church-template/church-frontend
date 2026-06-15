// src/components/admin/MediaUploader.tsx
"use client";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Button } from "@/components/ui/Button";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { uploadMedia, type MediaResponse } from "@/lib/api/media.admin";

// accept별 허용 MIME(백엔드 매직바이트 검증과 동일 — 즉시 피드백으로 413/400 왕복 감소).
const MIME: Record<"image" | "pdf" | "all", string[]> = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  pdf: ["application/pdf"],
  all: ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"],
};
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export interface MediaUploaderProps {
  // "all"은 라이브러리 페이지 전용. MediaPicker는 image|pdf만 사용.
  accept: "image" | "pdf" | "all";
  multiple?: boolean;
  onUploaded: (media: MediaResponse[]) => void;
  disabled?: boolean;
}

export function MediaUploader({ accept, multiple = false, onUploaded, disabled }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allowed = MIME[accept];

  function validate(files: File[]): string | null {
    for (const f of files) {
      if (!allowed.includes(f.type)) return "허용하지 않는 형식입니다. (JPEG·PNG·GIF·WEBP·PDF)";
      if (f.size > MAX_BYTES) return "파일 용량이 10MB를 초과했습니다.";
    }
    return null;
  }

  async function handleFiles(fileList: FileList | null) {
    setError(null);
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const v = validate(files);
    if (v) {
      setError(v);
      return;
    }
    setPending(true);
    // uploaded는 try 밖에 둔다 — 다중 업로드 중 일부만 성공하고 실패하면, 이미 라이브러리에 저장된
    // 성공분을 catch에서 onUploaded로 호출부에 전달(선택 상태 반영). 그 후 에러 토스트.
    const uploaded: MediaResponse[] = [];
    try {
      for (const f of files) uploaded.push(await uploadMedia(f));
      onUploaded(uploaded);
    } catch (e) {
      if (uploaded.length > 0) onUploaded(uploaded);
      adminOnError()(e); // FILE_SIZE_EXCEEDED 등은 errorCode 토스트로 처리
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-xs">
      <input
        ref={inputRef}
        type="file"
        accept={allowed.join(",")}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled || pending}
      />
      <Button type="button" variant="secondary" loading={pending} disabled={disabled} onClick={() => inputRef.current?.click()}>
        파일 선택
      </Button>
      {error ? <span className={cn(typo.caption, "text-error")}>{error}</span> : null}
    </div>
  );
}
