// src/components/auth/SignupForm.tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { notify } from "@/lib/notify";
import { login, signup } from "@/lib/auth/authApi";
import { ApiError } from "@/lib/auth/apiError";
import { handleApiError } from "@/lib/auth/handleApiError";
import { useAuthStore } from "@/lib/auth/authStore";
import { afterLoginDestination, sanitizeNext } from "@/lib/auth/nextParam";
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from "@/constants/terms";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { AuthCard } from "./AuthCard";
import { formatPhone } from "./formatPhone";
import { TermsDialog } from "./TermsDialog";
import { signupSchema, type SignupFormValues } from "./schemas";

// 위저드 스텝 — 한 화면 = 한 질문(스펙 §5.1). fields는 "다음" 시 trigger 검증 대상.
const STEPS: { question: string; fields: FieldPath<SignupFormValues>[] }[] = [
  { question: "전화번호를 알려주세요", fields: ["phone"] },
  { question: "이름을 알려주세요", fields: ["name"] },
  { question: "비밀번호를 만들어주세요", fields: ["password", "passwordConfirm"] },
  { question: "이메일이 있으신가요? (선택)", fields: ["email"] },
  { question: "약관에 동의해주세요", fields: ["termsAgreed", "privacyAgreed"] },
];

// 서버 errors[].field 화이트리스트 + 필드가 속한 스텝(서버 에러 시 해당 스텝으로 복귀 — 스펙 §5.2).
// passwordConfirm은 클라 전용이라 서버가 모름.
const FIELD_STEP = {
  phone: 0,
  name: 1,
  password: 2,
  email: 3,
  termsAgreed: 4,
  privacyAgreed: 4,
} as const;
type SignupField = keyof typeof FIELD_STEP;
function isSignupField(field: string): field is SignupField {
  return field in FIELD_STEP;
}

export function SignupForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [step, setStep] = useState(0);

  // 역가드: 마운트 1회만 — 가입 자동 로그인 직후 member 변화로 next를 잃지 않도록(스펙 4.4).
  useEffect(() => {
    if (useAuthStore.getState().member) router.replace("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    setFocus,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      phone: "",
      password: "",
      passwordConfirm: "",
      email: "",
      termsAgreed: false,
      privacyAgreed: false,
    },
  });

  // 스텝 전환 시 첫 입력으로 포커스(키보드·스크린리더 흐름). 체크박스 스텝은 질문 낭독 우선이라 제외.
  useEffect(() => {
    const first = STEPS[step].fields[0];
    if (first === "termsAgreed") return;
    setFocus(first);
  }, [step, setFocus]);

  // 서버 에러를 필드에 매핑하고 가장 이른 에러 스텝으로 복귀(스펙 §5.2).
  const applyServerFieldErrors = (fields: { field: SignupField; message: string }[]) => {
    let earliest = STEPS.length - 1;
    for (const f of fields) {
      setError(f.field, { message: f.message });
      earliest = Math.min(earliest, FIELD_STEP[f.field]);
    }
    setStep(earliest);
  };

  const submitAll = handleSubmit(async (values) => {
    try {
      await signup({
        name: values.name,
        phone: values.phone, // 하이픈 포함 그대로 — 서버가 정규화(가이드 11장)
        password: values.password,
        email: values.email === "" ? undefined : values.email,
        termsAgreed: values.termsAgreed,
        privacyAgreed: values.privacyAgreed,
      });
    } catch (e) {
      if (e instanceof ApiError) {
        handleApiError(e, {
          onFieldErrors: (fieldErrors) => {
            const known: { field: SignupField; message: string }[] = [];
            for (const fe of fieldErrors) {
              if (isSignupField(fe.field)) known.push({ field: fe.field, message: fe.reason });
              else notify.error(fe.reason);
            }
            if (known.length > 0) applyServerFieldErrors(known);
          },
          onDuplicate: () =>
            applyServerFieldErrors([{ field: "phone", message: "이미 가입된 전화번호입니다." }]),
        });
      } else {
        notify.error("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
      return;
    }

    // 가입 201(토큰 없음) → 같은 자격으로 자동 로그인(스펙 4.2). 실패해도 가입은 유효 — 로그인 폴백.
    try {
      const res = await login(values.phone, values.password);
      notify.success("가입을 환영합니다.");
      router.replace(afterLoginDestination(res.requiresAgreement, next));
    } catch {
      notify.error("가입은 완료되었습니다. 로그인해 주세요.");
      router.replace(next ? `/login?next=${encodeURIComponent(sanitizeNext(next))}` : "/login");
    }
  });

  const isLast = step === STEPS.length - 1;

  // Enter·다음 버튼 공용: 마지막 스텝 전엔 현재 스텝만 검증 후 진행(스펙 §5.1).
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (isLast) {
      void submitAll(e);
      return;
    }
    e.preventDefault();
    const current = step;
    void trigger(STEPS[current].fields).then((ok) => {
      // 더블클릭으로 trigger가 두 번 resolve돼도 한 스텝만 진행(고령 사용자 더블클릭 방어)
      if (ok) setStep((s) => (s === current ? s + 1 : s));
    });
  };

  // 건너뛰기: 잘못 입력하다 만 이메일이 최종 제출을 막지 않도록 비우고, 남은 형식 에러도 함께 지운다.
  const skipEmail = () => {
    setValue("email", "", { shouldValidate: true });
    setStep((s) => s + 1);
  };

  return (
    <AuthCard title="회원가입">
      {/* 진행 도트(DESIGN wizard-progress) — 장식이라 aria-hidden, 단계는 sr-only로 제공(스펙 §5.3) */}
      <div className="flex items-center gap-xs" aria-hidden>
        {STEPS.map((s, i) => (
          <span
            key={s.question}
            className={cn("h-1.5 w-6 rounded-full", i <= step ? "bg-primary" : "bg-hairline")}
          />
        ))}
      </div>
      <p className="sr-only" role="status">
        {STEPS.length}단계 중 {step + 1}단계
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-lg flex flex-col gap-md">
        <h2 className={cn(typo.titleLg, "text-ink")}>{STEPS[step].question}</h2>

        {step === 0 ? (
          <div className="flex flex-col gap-xxs">
            <label htmlFor="signup-phone" className={cn(typo.bodySm, "text-ink")}>
              전화번호
            </label>
            <Input
              id="signup-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="010-1234-5678"
              error={errors.phone?.message}
              {...register("phone")}
              onChange={(e) => setValue("phone", formatPhone(e.target.value))}
            />
          </div>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-xxs">
            <label htmlFor="signup-name" className={cn(typo.bodySm, "text-ink")}>
              이름
            </label>
            <Input
              id="signup-name"
              autoComplete="name"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <>
            <div className="flex flex-col gap-xxs">
              <label htmlFor="signup-password" className={cn(typo.bodySm, "text-ink")}>
                비밀번호
              </label>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                placeholder="8자 이상"
                error={errors.password?.message}
                {...register("password")}
              />
            </div>
            <div className="flex flex-col gap-xxs">
              <label htmlFor="signup-password-confirm" className={cn(typo.bodySm, "text-ink")}>
                비밀번호 확인
              </label>
              <Input
                id="signup-password-confirm"
                type="password"
                autoComplete="new-password"
                error={errors.passwordConfirm?.message}
                {...register("passwordConfirm")}
              />
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-xxs">
            <label htmlFor="signup-email" className={cn(typo.bodySm, "text-ink")}>
              이메일 (선택)
            </label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
          </div>
        ) : null}

        {step === 4 ? (
          <div className="flex flex-col gap-xs">
            <div className="flex items-start justify-between gap-sm">
              <Checkbox
                label="이용약관 동의 (필수)"
                error={errors.termsAgreed?.message}
                {...register("termsAgreed")}
              />
              <TermsDialog doc={TERMS_OF_SERVICE} />
            </div>
            <div className="flex items-start justify-between gap-sm">
              <Checkbox
                label="개인정보처리방침 동의 (필수)"
                error={errors.privacyAgreed?.message}
                {...register("privacyAgreed")}
              />
              <TermsDialog doc={PRIVACY_POLICY} />
            </div>
          </div>
        ) : null}

        <Button type="submit" loading={isSubmitting}>
          {isLast ? "가입하기" : "다음"}
        </Button>
        {step === 3 ? (
          <Button variant="tertiary" type="button" onClick={skipEmail}>
            건너뛰기
          </Button>
        ) : null}
        {step > 0 ? (
          <Button variant="tertiary" type="button" disabled={isSubmitting} onClick={() => setStep((s) => s - 1)}>
            이전
          </Button>
        ) : null}
      </form>

      <p className={cn(typo.bodySm, "mt-lg text-body")}>
        이미 계정이 있으신가요?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(sanitizeNext(next))}` : "/login"}
          className="text-primary hover:text-primary-active"
        >
          로그인
        </Link>
      </p>
    </AuthCard>
  );
}
