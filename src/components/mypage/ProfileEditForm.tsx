"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { notify } from "@/lib/notify";
import { updateMe } from "@/lib/auth/authApi";
import { ApiError } from "@/lib/auth/apiError";
import { handleApiError } from "@/lib/auth/handleApiError";
import type { MeResponse, MeUpdateRequest } from "@/lib/auth/types";
import { Button } from "@/components/ui/Button";
import { ACTION } from "@/constants/actionButton";
import { Input } from "@/components/ui/Input";
import { formatPhone } from "@/components/auth/formatPhone";
import { profileSchema, type ProfileFormValues } from "./schemas";

// 서버 errors[].field 화이트리스트 — 편집 가능한 필드만 폼에 매핑(직분·password 등은 토스트 폴백).
const EDITABLE = ["name", "phone", "email"] as const;
function isEditable(field: string): field is (typeof EDITABLE)[number] {
  return (EDITABLE as readonly string[]).includes(field);
}

export function ProfileEditForm({ me, onDone }: { me: MeResponse; onDone: () => void }) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: me.name, phone: me.phone, email: me.email ?? "" },
  });

  const mutation = useMutation({
    mutationFn: (req: MeUpdateRequest) => updateMe(req),
    onSuccess: (res) => {
      queryClient.setQueryData(["me"], res); // PATCH 응답이 전체 MeResponse → 즉시 갱신
      notify.success("정보가 수정되었습니다.");
      onDone();
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        handleApiError(e, {
          onFieldErrors: (fes) => {
            for (const fe of fes) {
              if (isEditable(fe.field)) setError(fe.field, { message: fe.reason });
              else notify.error(fe.reason);
            }
          },
          onDuplicate: () => setError("phone", { message: "이미 사용 중인 전화번호입니다." }),
        });
      } else {
        notify.error("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    },
  });

  // 변경분(dirty)만 전송 — 빈 이메일은 전송 제외(빈 문자열 전송 시 서버 email 형식 400 회피).
  // 변경 없음은 zodResolver 실행 전에 조기 종료(동기 onDone 보장 — 테스트 단언 호환).
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dirty = Object.keys(dirtyFields);
    if (dirty.length === 0) {
      onDone();
      return;
    }
    void handleSubmit((values) => {
      const req: MeUpdateRequest = {};
      if (dirtyFields.name) req.name = values.name;
      if (dirtyFields.phone) req.phone = values.phone;
      if (dirtyFields.email) req.email = values.email === "" ? undefined : values.email;
      if (Object.keys(req).length === 0) {
        onDone();
        return;
      }
      mutation.mutate(req);
    })(e);
  };

  return (
    <form onSubmit={onSubmit} noValidate className="mt-md flex flex-col gap-md">
      <div className="flex flex-col gap-xxs">
        <label htmlFor="me-name" className={cn(typo.bodySm, "text-ink")}>이름</label>
        <Input id="me-name" autoComplete="name" error={errors.name?.message} {...register("name")} />
      </div>
      <div className="flex flex-col gap-xxs">
        <label htmlFor="me-phone" className={cn(typo.bodySm, "text-ink")}>전화번호</label>
        <Input
          id="me-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register("phone")}
          onChange={(e) => setValue("phone", formatPhone(e.target.value), { shouldDirty: true })}
        />
      </div>
      <div className="flex flex-col gap-xxs">
        <label htmlFor="me-email" className={cn(typo.bodySm, "text-ink")}>이메일</label>
        <Input id="me-email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      </div>
      {/* 취소→저장 순서: 파괴적 액션 방어(실수 제출 최소화) */}
      <div className="flex gap-sm">
        <Button type="button" variant="tertiary" onClick={onDone}>{ACTION.cancel.label}</Button>
        <Button type="submit" loading={mutation.isPending}>{ACTION.save.label}</Button>
      </div>
    </form>
  );
}
