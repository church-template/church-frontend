"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { TagMultiSelect } from "@/components/admin/TagMultiSelect";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import {
  createNotice,
  updateNotice,
  type NoticeCreateRequest,
  type NoticeUpdateRequest,
} from "@/lib/api/notices.admin";
import type { NoticeDetailResponse } from "@/lib/api/types";
import { noticeSchema, type NoticeFormValues } from "./schemas";

export interface NoticeFormProps {
  mode: "create" | "edit";
  initial?: NoticeDetailResponse;
}

// 공개 반영 지연(ISR 60초)을 표준 문구로 안내(가이드 4·15장).
const SAVED_NOTICE = "저장했습니다. 공개 페이지 반영은 최대 1분 걸릴 수 있습니다.";

// 선택 필드 빈 문자열은 전송에서 제외(PUT 전체 교체 시 의미 없는 빈값 방지).
function toBody(v: NoticeFormValues): NoticeCreateRequest {
  return {
    title: v.title,
    content: v.content.trim() === "" ? undefined : v.content,
    isPinned: v.isPinned,
    tagIds: v.tagIds,
  };
}

export function NoticeForm({ mode, initial }: NoticeFormProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<NoticeFormValues>({
    resolver: zodResolver(noticeSchema),
    defaultValues: {
      title: initial?.title ?? "",
      content: initial?.content ?? "",
      isPinned: initial?.isPinned ?? false,
      tagIds: initial?.tags.map((t) => t.id) ?? [],
    },
  });

  const mutation = useMutation({
    mutationFn: (v: NoticeFormValues) => {
      const body = toBody(v);
      if (mode === "edit" && initial) {
        const put: NoticeUpdateRequest = { ...body, version: initial.version };
        return updateNotice(initial.id, put);
      }
      return createNotice(body);
    },
    onError: adminOnError({
      onFieldErrors: (fes) =>
        fes.forEach((fe) =>
          setError(fe.field as keyof NoticeFormValues, { message: fe.reason }),
        ),
      onReedit: () => router.refresh(),
    }),
    onSuccess: (res) => {
      notify.success(SAVED_NOTICE);
      router.push(`/notices/${res.id}`);
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        <label htmlFor="notice-title" className={cn(typo.bodySm, "text-ink")}>제목</label>
        <Input
          id="notice-title"
          aria-label="제목"
          error={errors.title?.message}
          {...register("title")}
        />
      </div>
      <Controller
        control={control}
        name="isPinned"
        render={({ field }) => (
          <Checkbox
            label="상단 고정"
            checked={field.value}
            onChange={(e) => field.onChange(e.target.checked)}
          />
        )}
      />
      <div className="flex flex-col gap-xs">
        <span className={cn(typo.bodySm, "text-ink")}>본문(선택)</span>
        <Controller
          control={control}
          name="content"
          render={({ field }) => (
            <MarkdownEditor value={field.value} onChange={field.onChange} id="notice-content" />
          )}
        />
      </div>
      <div className="flex flex-col gap-xs">
        <span className={cn(typo.bodySm, "text-ink")}>태그(선택)</span>
        <Controller
          control={control}
          name="tagIds"
          render={({ field }) => <TagMultiSelect value={field.value} onChange={field.onChange} />}
        />
      </div>
      <div className="flex gap-sm">
        <Button type="submit" variant="primary" loading={mutation.isPending}>저장</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>취소</Button>
      </div>
    </form>
  );
}
