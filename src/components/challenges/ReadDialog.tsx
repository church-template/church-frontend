"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { readSchema, type ReadFormValues } from "./schema";

export interface ReadDialogTarget {
  date: string; // "YYYY-MM-DD"
  label: string; // "1월 20일" — 제목 표기
  existing: number | null; // 그날 이미 기록한 장 수(없으면 null → 기록 모드)
  defaultChapters: number; // 기록 모드 기본값 = 하루 목표(남은 목표)
}

interface ReadDialogProps {
  target: ReadDialogTarget | null;
  onOpenChange: (v: boolean) => void;
  pending: boolean;
  error?: string; // 서버 400(INVALID_INPUT_VALUE) detail 인라인 표시(스펙 §7)
  onRecord: (date: string, chapters: number) => void;
  onCancelRecord: (date: string) => void;
}

// 오늘/과거 공용 기록·취소 다이얼로그 — 달력 탭 = 입구(스펙 §4). 어르신 대상: 화면당 액션 1개 원칙.
export function ReadDialog({ target, onOpenChange, pending, error, onRecord, onCancelRecord }: ReadDialogProps) {
  // z.coerce.number()는 입력(unknown)과 출력(number) 타입이 달라 useForm 제네릭을 셋 다 명시해야 한다
  // (RHF 기본값 TFieldValues=TTransformedValues 가정이 코어스 필드와 어긋남 — tsc가 감지).
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.input<typeof readSchema>, unknown, ReadFormValues>({
    resolver: zodResolver(readSchema),
    defaultValues: { chapters: target?.defaultChapters ?? 1 },
  });

  // 열릴 때마다 기본값 리셋(TagFormDialog 선례 — effect+reset만).
  useEffect(() => {
    if (target) reset({ chapters: target.defaultChapters });
  }, [target, reset]);

  return (
    <Dialog open={target != null} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{target ? `${target.label} 읽기 기록` : "읽기 기록"}</DialogTitle>
        </DialogHeader>
        {target?.existing != null ? (
          <div className="flex flex-col gap-base">
            <p className={cn(typo.bodyMd, "text-ink")}>이날 {target.existing}장 읽음으로 기록되어 있어요.</p>
            {error ? <p className={cn(typo.caption, "text-error")}>{error}</p> : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="tertiary">닫기</Button>
              </DialogClose>
              <Button type="button" variant="secondary" loading={pending} onClick={() => onCancelRecord(target.date)}>
                기록 취소
              </Button>
            </DialogFooter>
          </div>
        ) : target ? (
          <form
            onSubmit={handleSubmit((v) => onRecord(target.date, v.chapters))}
            className="flex flex-col gap-base"
          >
            <div className="flex flex-col gap-xxs">
              <label htmlFor="read-chapters" className={cn(typo.bodySm, "text-body")}>읽은 장 수</label>
              {/* min/step(네이티브 제약)은 넣지 않는다 — jsdom·브라우저가 submit 이벤트 자체를 조용히
                  가로막아 RHF+zod 검증 메시지가 아예 뜨지 않는다(실제 재현·확인). 검증은 zod가 전담. */}
              <Input
                id="read-chapters" type="number" inputMode="numeric"
                error={errors.chapters?.message ?? error}
                {...register("chapters")}
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="tertiary">취소</Button>
              </DialogClose>
              <Button type="submit" variant="primary" loading={pending}>기록하기</Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
