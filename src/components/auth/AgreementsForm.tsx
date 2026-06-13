// src/components/auth/AgreementsForm.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { notify } from "@/lib/notify";
import { ApiError } from "@/lib/auth/apiError";
import { handleApiError } from "@/lib/auth/handleApiError";
import { useAuthStore } from "@/lib/auth/authStore";
import { getMyAgreements, updateMyAgreements } from "@/lib/auth/agreementsApi";
import { sanitizeNext } from "@/lib/auth/nextParam";
import { TERMS_OF_SERVICE, PRIVACY_POLICY } from "@/constants/terms";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { AuthCard } from "./AuthCard";
import { TermsDialog } from "./TermsDialog";
import { agreementsSchema, type AgreementsFormValues } from "./schemas";

export function AgreementsForm() {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  // 진입 가드: 재동의는 회원 영역 — 비로그인은 로그인으로(복귀 경로 유지, 스펙 4.3). 마운트 1회만.
  useEffect(() => {
    if (!useAuthStore.getState().accessToken) router.replace("/login?next=/agreements");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isPending, isError } = useQuery({
    queryKey: ["me", "agreements"],
    queryFn: getMyAgreements,
    enabled: !!accessToken,
    retry: false, // 401 refresh는 authFetch가 처리 — query 재시도는 이중 처리
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AgreementsFormValues>({
    resolver: zodResolver(agreementsSchema),
    defaultValues: { termsAgreed: false, privacyAgreed: false },
    // GET 결과를 초기값에 반영 — 이미 동의된 항목은 체크 상태로 시작(스펙 4.3)
    values: data ? { termsAgreed: data.termsAgreed, privacyAgreed: data.privacyAgreed } : undefined,
  });

  const mutation = useMutation({
    // TanStack Query v5는 mutationFn(variables, context) 두 인수로 호출 — 래퍼로 첫 인수만 전달.
    mutationFn: (values: AgreementsFormValues) => updateMyAgreements(values),
    onSuccess: async () => {
      // useMe 캐시의 termsAgreed/privacyAgreed stale 방지 — ["me"] 프리픽스 일괄 무효화(스펙 4.3)
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      notify.success("약관 동의가 완료되었습니다.");
      router.replace(sanitizeNext(next));
    },
    onError: (e) => {
      if (e instanceof ApiError) handleApiError(e); // 400 INVALID_INPUT_VALUE 등 → 토스트(방어적)
      else notify.error("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));
  // 둘 다 체크 시에만 제출 활성(스펙 4.3 — zod와 이중 방어). useWatch: 구독 단위 리렌더 + 컴파일러 호환.
  const [termsAgreed, privacyAgreed] = useWatch({
    control,
    name: ["termsAgreed", "privacyAgreed"],
  });
  const bothAgreed = termsAgreed && privacyAgreed;

  return (
    <AuthCard title="약관 동의" subtitle="서비스 이용을 위해 두 약관 모두 동의해야 계속할 수 있습니다.">
      {isPending ? (
        <p className={cn(typo.bodySm, "mt-lg text-muted")}>동의 상태를 불러오는 중…</p>
      ) : isError ? (
        <p className={cn(typo.bodySm, "mt-lg text-error")}>
          동의 상태를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.
        </p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-lg flex flex-col gap-md">
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
          <Button type="submit" disabled={!bothAgreed} loading={mutation.isPending}>
            동의하고 계속하기
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
