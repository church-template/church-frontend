// src/components/events/EventFormDialog.tsx
"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ACTION } from "@/constants/actionButton";
import { Checkbox } from "@/components/ui/Checkbox";
import { DateTimePicker } from "@/components/admin/DateTimePicker";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { TagMultiSelect } from "@/components/admin/TagMultiSelect";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { notify } from "@/lib/notify";
import { revalidateEvents } from "@/lib/admin/revalidate";
import { toServerDateTime, toLocalInput } from "@/lib/date";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import {
  createEvent,
  updateEvent,
  type EventCreateRequest,
  type EventUpdateRequest,
} from "@/lib/api/events.admin";
import type { EventDetailResponse } from "@/lib/api/types";
import { eventSchema, type EventFormValues } from "./schemas";

export interface EventFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  initial?: EventDetailResponse;
  // 저장 성공 후 호출 — 상세 모달 안에서 수정 시 부모 모달을 닫아 옛 데이터 잔존을 막는다.
  onSaved?: () => void;
}

// 저장 성공 안내 — updateTag로 ISR 캐시를 즉시 무효화하므로 지연 없음.
const SAVED_NOTICE = "저장했습니다.";

// 폼 값 → 서버 요청 body 변환. offset 없는 LocalDateTime 직렬화는 toServerDateTime이 담당.
function toBody(v: EventFormValues): EventCreateRequest {
  const opt = (s: string) => (s.trim() === "" ? undefined : s);
  return {
    title: v.title,
    startAt: toServerDateTime(v.startAt, v.allDay),
    endAt: v.endAt === "" ? undefined : toServerDateTime(v.endAt, v.allDay),
    allDay: v.allDay,
    location: opt(v.location),
    description: opt(v.description),
    tagIds: v.tagIds,
  };
}

export function EventFormDialog({ open, onOpenChange, mode, initial, onSaved }: EventFormDialogProps) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: initial?.title ?? "",
      startAt: toLocalInput(initial?.startAt ?? "", initial?.allDay ?? false),
      endAt: toLocalInput(initial?.endAt ?? "", initial?.allDay ?? false),
      allDay: initial?.allDay ?? false,
      location: initial?.location ?? "",
      description: initial?.description ?? "",
      tagIds: initial?.tags.map((t) => t.id) ?? [],
    },
  });
  // allDay 상태를 실시간으로 DateTimePicker에 전달 — watch가 리렌더를 유발한다.
  const allDay = watch("allDay");

  const mutation = useMutation({
    mutationFn: (v: EventFormValues) => {
      const body = toBody(v);
      if (mode === "edit" && initial) {
        // 낙관락: 서버가 응답한 version을 그대로 PUT body에 실어 충돌을 감지한다(가이드 8장).
        const put: EventUpdateRequest = { ...body, version: initial.version };
        return updateEvent(initial.id, put);
      }
      return createEvent(body);
    },
    onError: adminOnError({
      onFieldErrors: (fes) =>
        fes.forEach((fe) => setError(fe.field as keyof EventFormValues, { message: fe.reason })),
      onReedit: () => router.refresh(),
    }),
    onSuccess: async () => {
      // updateTag 서버 액션으로 events 태그 ISR 캐시를 즉시 무효화한 뒤 알림·새로고침·닫기.
      await revalidateEvents();
      notify.success(SAVED_NOTICE);
      router.refresh();
      onOpenChange(false);
      onSaved?.();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "일정 수정" : "새 일정"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((v) => mutation.mutate(v))}
          className="flex flex-col gap-base"
        >
          <Field id="event-title" label="제목">
            <Input id="event-title" error={errors.title?.message} {...register("title")} />
          </Field>
          <Controller
            control={control}
            name="allDay"
            render={({ field }) => (
              <Checkbox
                label="종일"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
              />
            )}
          />
          <Field id="event-startAt" label="시작">
            <Controller
              control={control}
              name="startAt"
              render={({ field }) => (
                <DateTimePicker
                  id="event-startAt"
                  value={field.value}
                  onChange={field.onChange}
                  allDay={allDay}
                  error={errors.startAt?.message}
                />
              )}
            />
          </Field>
          <Field id="event-endAt" label="종료(선택)">
            <Controller
              control={control}
              name="endAt"
              render={({ field }) => (
                <DateTimePicker
                  id="event-endAt"
                  value={field.value}
                  onChange={field.onChange}
                  allDay={allDay}
                  error={errors.endAt?.message}
                />
              )}
            />
          </Field>
          <Field id="event-location" label="장소(선택)">
            <Input id="event-location" {...register("location")} />
          </Field>
          <div className="flex flex-col gap-xs">
            <span className={cn(typo.bodySm, "text-ink")}>본문(선택)</span>
            <Controller
              control={control}
              name="description"
              render={({ field }) => (
                <MarkdownEditor
                  value={field.value}
                  onChange={field.onChange}
                  id="event-description"
                  rows={5}
                />
              )}
            />
          </div>
          <div className="flex flex-col gap-xs">
            <span className={cn(typo.bodySm, "text-ink")}>태그(선택)</span>
            <Controller
              control={control}
              name="tagIds"
              render={({ field }) => (
                <TagMultiSelect value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="tertiary">{ACTION.cancel.label}</Button>
            </DialogClose>
            <Button type="submit" variant="primary" loading={mutation.isPending}>
              {ACTION.save.label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// 폼 필드 레이블 + 콘텐츠를 묶는 래퍼. label htmlFor가 DateTimePicker·Input에 연결된다.
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
