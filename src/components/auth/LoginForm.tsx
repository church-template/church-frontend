"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { notify } from "@/lib/notify";
import { login } from "@/lib/auth/authApi";
import { ApiError } from "@/lib/auth/apiError";
import { handleApiError } from "@/lib/auth/handleApiError";
import { useAuthStore } from "@/lib/auth/authStore";
import { afterLoginDestination, sanitizeNext } from "@/lib/auth/nextParam";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { CHURCH_NAME } from "@/constants/church";
import { AuthCard } from "./AuthCard";
import { formatPhone } from "./formatPhone";
import { loginSchema, type LoginFormValues } from "./schemas";

export function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");

  // 역가드: 마운트 1회만 판정 — member를 구독하면 제출 후 리다이렉트와 경합해 next를 잃는다(스펙 4.4).
  useEffect(() => {
    if (useAuthStore.getState().member) router.replace("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await login(values.phone, values.password); // 세션 저장은 authApi가 수행(T5)
      router.replace(afterLoginDestination(res.requiresAgreement, next));
    } catch (e) {
      if (e instanceof ApiError) {
        // 미존재 번호·비번 불일치 동일 메시지(가입 여부 비노출 — 가이드 1.2/4.3)
        handleApiError(e, { onAuthFailed: (message) => setError("root", { message }) });
      } else {
        notify.error("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    }
  });

  return (
    <AuthCard title="로그인" subtitle={`${CHURCH_NAME} 홈페이지에 로그인하세요`}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-md">
        <div className="flex flex-col gap-xxs">
          <label htmlFor="login-phone" className={cn(typo.bodySm, "text-ink")}>
            전화번호
          </label>
          <Input
            id="login-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="010-1234-5678"
            error={errors.phone?.message}
            {...register("phone")}
            onChange={(e) => setValue("phone", formatPhone(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-xxs">
          <label htmlFor="login-password" className={cn(typo.bodySm, "text-ink")}>
            비밀번호
          </label>
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
        </div>
        {errors.root?.message ? (
          <p role="alert" className={cn(typo.caption, "text-error")}>
            {errors.root.message}
          </p>
        ) : null}
        <Button type="submit" loading={isSubmitting}>
          로그인
        </Button>
      </form>
      <p className={cn(typo.bodySm, "mt-lg text-body")}>
        아직 계정이 없으신가요?{" "}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(sanitizeNext(next))}` : "/signup"}
          className="text-primary hover:text-primary-active"
        >
          회원가입
        </Link>
      </p>
    </AuthCard>
  );
}
