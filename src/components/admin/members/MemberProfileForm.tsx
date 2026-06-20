"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ACTION } from "@/constants/actionButton";
import { adminOnError } from "@/lib/admin/mutationHandlers";
import { adminKeys } from "@/lib/admin/queryKeys";
import { notify } from "@/lib/notify";
import { useMe } from "@/lib/auth/useMe";
import { formatPhone } from "@/components/auth/formatPhone";
import { updateMember, type MemberDetailResponse } from "@/lib/api/members.admin";
import { memberUpdateSchema, type MemberFormValues } from "./schema";

export function MemberProfileForm({ member }: { member: MemberDetailResponse }) {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [editing, setEditing] = useState(false);

  const seed = { name: member.name, phone: member.phone, email: member.email ?? "" };
  const { register, handleSubmit, reset, setValue, setError, formState: { errors } } = useForm<MemberFormValues>({
    resolver: zodResolver(memberUpdateSchema),
    defaultValues: seed,
  });

  const mutation = useMutation({
    mutationFn: (v: MemberFormValues) => updateMember(member.uuid, { name: v.name, phone: v.phone, email: v.email }),
    onError: adminOnError({
      onDuplicate: () => setError("phone", { message: "이미 사용 중인 전화번호입니다." }),
      onFieldErrors: (fes) => fes.forEach((fe) => setError(fe.field as keyof MemberFormValues, { message: fe.reason })),
    }),
    onSuccess: (updated) => {
      qc.setQueryData(adminKeys.detail("members", member.uuid), updated);
      qc.invalidateQueries({ queryKey: adminKeys.listAll("members") });
      // 운영자가 자기 프로필을 고치면 useMe 스냅샷도 갱신.
      if (member.uuid === me?.uuid) qc.invalidateQueries({ queryKey: ["me"] });
      notify.success("저장했습니다.");
      setEditing(false);
    },
  });

  if (!editing) {
    return (
      <section className="flex flex-col gap-xs">
        <div className="flex items-center justify-between">
          <h3 className={cn(typo.titleSm, "text-ink")}>기본 정보</h3>
          <Button type="button" variant="tertiary" aria-label="내 정보 수정" onClick={() => { reset(seed); setEditing(true); }}>
            <ACTION.edit.Icon size={18} aria-hidden />
            <span className="hidden lg:inline">{ACTION.edit.label}</span>
          </Button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-base gap-y-xxs">
          <dt className={cn(typo.bodySm, "text-muted")}>이름</dt><dd className={typo.bodyMd}>{member.name}</dd>
          <dt className={cn(typo.bodySm, "text-muted")}>전화</dt><dd className={typo.datetime}>{member.phone}</dd>
          <dt className={cn(typo.bodySm, "text-muted")}>이메일</dt><dd className={typo.bodyMd}>{member.email || "—"}</dd>
        </dl>
      </section>
    );
  }
  return (
    <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="flex flex-col gap-base">
      <div className="flex flex-col gap-xxs">
        <label htmlFor="member-name" className={cn(typo.bodySm, "text-body")}>이름</label>
        <Input id="member-name" error={errors.name?.message} {...register("name")} />
      </div>
      <div className="flex flex-col gap-xxs">
        <label htmlFor="member-phone" className={cn(typo.bodySm, "text-body")}>전화번호</label>
        <Input
          id="member-phone"
          inputMode="numeric"
          error={errors.phone?.message}
          {...register("phone", { onChange: (e) => setValue("phone", formatPhone(e.target.value)) })}
        />
      </div>
      <div className="flex flex-col gap-xxs">
        <label htmlFor="member-email" className={cn(typo.bodySm, "text-body")}>이메일(선택)</label>
        <Input id="member-email" type="email" error={errors.email?.message} {...register("email")} />
      </div>
      <div className="flex justify-end gap-sm">
        <Button type="button" variant="tertiary" onClick={() => setEditing(false)}>{ACTION.cancel.label}</Button>
        <Button type="submit" variant="primary" loading={mutation.isPending}>{ACTION.save.label}</Button>
      </div>
    </form>
  );
}
