"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ACTION } from "@/constants/actionButton";
import { SERMON_DEFAULT_PREACHER } from "@/constants/church";
import { todayKstDate } from "@/lib/date";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { TagMultiSelect } from "@/components/admin/TagMultiSelect";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import {
  createSermon,
  updateSermon,
  type SermonCreateRequest,
  type SermonUpdateRequest,
} from "@/lib/api/sermons.admin";
import type { SermonDetailResponse } from "@/lib/api/types";
import { sermonSchema, type SermonFormValues } from "./schemas";

export interface SermonFormProps {
  mode: "create" | "edit";
  initial?: SermonDetailResponse;
}

// 쓰기 직후 쿼리 무효화로 목록·상세가 즉시 갱신되므로 지연 안내 불필요.
const SAVED_NOTICE = "저장했습니다.";

// 선택 필드 빈 문자열은 전송에서 제외(PUT 전체 교체 시 의미 없는 빈값 방지).
function toBody(v: SermonFormValues): SermonCreateRequest {
  const opt = (s: string) => (s.trim() === "" ? undefined : s);
  return {
    title: v.title,
    preacher: v.preacher,
    preachedAt: v.preachedAt,
    series: opt(v.series ?? ""),
    scripture: opt(v.scripture ?? ""),
    content: opt(v.content ?? ""),
    videoUrl: opt(v.videoUrl ?? ""),
    audioUrl: opt(v.audioUrl ?? ""),
    tagIds: v.tagIds,
  };
}

export function SermonForm({ mode, initial }: SermonFormProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<SermonFormValues>({
    resolver: zodResolver(sermonSchema),
    defaultValues: {
      title: initial?.title ?? "",
      // 등록 모드 프리필: 설교자는 교회 상수, 설교일은 오늘(KST) — 수정 모드는 기존 값 유지.
      preacher: initial?.preacher ?? SERMON_DEFAULT_PREACHER,
      preachedAt: initial?.preachedAt ?? todayKstDate(),
      series: initial?.series ?? "",
      scripture: initial?.scripture ?? "",
      content: initial?.content ?? "",
      videoUrl: initial?.videoUrl ?? "",
      audioUrl: initial?.audioUrl ?? "",
      tagIds: initial?.tags.map((t) => t.id) ?? [],
    },
  });

  const mutation = useMutation({
    mutationFn: (v: SermonFormValues) => {
      const body = toBody(v);
      if (mode === "edit" && initial) {
        const put: SermonUpdateRequest = { ...body, version: initial.version };
        return updateSermon(initial.id, put);
      }
      return createSermon(body);
    },
    onError: adminOnError({
      onFieldErrors: (fes) =>
        fes.forEach((fe) =>
          setError(fe.field as keyof SermonFormValues, { message: fe.reason }),
        ),
      // 409 재편집: 상세 쿼리 무효화 → SermonEditLoader가 최신 version으로 다시 시드한다(AlbumForm 관례).
      onReedit: () => qc.invalidateQueries({ queryKey: initial ? ["sermon", initial.id] : ["sermons"] }),
    }),
    onSuccess: (res) => {
      // 쓰기 성공 즉시 회원 쿼리 캐시 무효화 → 목록·상세가 fresh 데이터를 받음(회원전용 전환으로 ISR 태그 아님).
      qc.invalidateQueries({ queryKey: ["sermons"] });
      if (mode === "edit" && initial) qc.invalidateQueries({ queryKey: ["sermon", initial.id] });
      notify.success(SAVED_NOTICE);
      router.push(`/sermons/${res.id}`);
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-lg">
      <Field id="sermon-title" label="제목">
        <Input id="sermon-title" error={errors.title?.message} {...register("title")} />
      </Field>
      <Field id="sermon-preacher" label="설교자">
        <Input id="sermon-preacher" error={errors.preacher?.message} {...register("preacher")} />
      </Field>
      <Field id="sermon-preachedAt" label="설교일">
        <Input
          id="sermon-preachedAt"
          type="date"
          // max로 연도 세그먼트를 4자리로 제한 — 4자리 입력 시 월로 자동 이동(연도 6자리 입력 방지).
          max="9999-12-31"
          error={errors.preachedAt?.message}
          {...register("preachedAt")}
        />
      </Field>
      <Field id="sermon-series" label="시리즈(선택)">
        <Input id="sermon-series" {...register("series")} />
      </Field>
      <Field id="sermon-scripture" label="본문 말씀(선택)">
        <Input id="sermon-scripture" {...register("scripture")} />
      </Field>
      <Field id="sermon-videoUrl" label="영상 링크(선택)">
        <Input id="sermon-videoUrl" {...register("videoUrl")} />
      </Field>
      <Field id="sermon-audioUrl" label="오디오 링크(선택)">
        <Input id="sermon-audioUrl" {...register("audioUrl")} />
      </Field>
      <div className="flex flex-col gap-xs">
        <span className={cn(typo.bodySm, "text-ink")}>본문(선택)</span>
        <Controller
          control={control}
          name="content"
          render={({ field }) => (
            <MarkdownEditor value={field.value ?? ""} onChange={field.onChange} id="sermon-content" />
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
        <Button type="button" variant="tertiary" onClick={() => router.back()}>{ACTION.cancel.label}</Button>
        <Button type="submit" variant="primary" loading={mutation.isPending}>{ACTION.save.label}</Button>
      </div>
    </form>
  );
}

// 라벨+입력 묶음(Input은 자체 라벨이 없어 htmlFor로 연결).
function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={id} className={cn(typo.bodySm, "text-ink")}>
        {label}
      </label>
      {children}
    </div>
  );
}
