"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { Container } from "@/components/shell/Container";
import { Reveal } from "@/components/main/Reveal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { TermsDialog } from "@/components/auth/TermsDialog";
import { formatPhone } from "@/components/auth/formatPhone";
import { PRIVACY_POLICY } from "@/constants/terms";
import { ApiError } from "@/lib/auth/apiError";
import { handleApiError } from "@/lib/auth/handleApiError";
import { createInquiry } from "@/lib/api/inquiries";
import { inquirySchema, type InquiryFormValues } from "./inquirySchema";

// 서버 errors[].field 화이트리스트 — 그 외 필드명은 무시(토스트 폴백).
const SERVER_FIELDS = ["name", "phone", "email", "content", "privacyAgreed"] as const;
type InquiryField = (typeof SERVER_FIELDS)[number];
const isInquiryField = (f: string): f is InquiryField =>
  (SERVER_FIELDS as readonly string[]).includes(f);

// 흰 캔버스 — 연락처 페이지의 세 번째 채널(전화·이메일 다음). 비로그인 방문자도 제출한다.
export function InquirySection() {
  // 접수번호를 들고 있으면 완료 패널을 렌더한다 — 토스트만으로는 고령 사용자가 접수를 놓친다.
  const [ticketId, setTicketId] = useState<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // 제출 버튼이 사라지며 포커스가 body로 유실되는 것을 막는다 — 완료 제목으로 옮긴다(setState 아닌 ref 포커스).
  useEffect(() => {
    if (ticketId != null) headingRef.current?.focus();
  }, [ticketId]);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InquiryFormValues>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { name: "", phone: "", email: "", content: "", privacyAgreed: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await createInquiry({
        name: values.name,
        phone: values.phone,
        email: values.email === "" ? undefined : values.email, // 빈 문자열은 보내지 않는다(선택 필드)
        content: values.content,
        privacyAgreed: values.privacyAgreed,
      });
      setTicketId(res.id);
    } catch (e) {
      if (e instanceof ApiError) {
        handleApiError(e, {
          onFieldErrors: (fieldErrors) => {
            for (const fe of fieldErrors) {
              if (isInquiryField(fe.field)) setError(fe.field, { message: fe.reason });
            }
          },
        });
      } else {
        // detail이 아니라 title에 실어야 handleApiError의 default 분기(error.title)가 문구를 읽는다.
        handleApiError(new ApiError(0, undefined, undefined, "네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."));
      }
    }
  });

  const restart = () => {
    reset();
    setTicketId(null);
  };

  return (
    <Container as="section" className="break-keep py-section">
      <Reveal>
        <h2 className={cn(typo.displayMd, "text-ink")}>문의 남기기</h2>
        <p className={cn(typo.bodyLg, "mt-base text-body")}>
          궁금한 점을 남겨 주시면 담당자가 연락처로 회신드립니다.
        </p>

        {/* 폼 읽기 컬럼 폭 — 마이페이지·계정 폼과 같은 토큰(t-shirt max-w-*는 spacing 토큰과 충돌해 금지). */}
        <div className="mt-xxl max-w-[var(--container-narrow)]">
          {ticketId != null ? (
            <div
              role="status"
              className="flex flex-col items-start gap-base rounded-xl border border-hairline bg-surface-soft p-xl"
            >
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-primary text-on-primary">
                <Check size={24} aria-hidden />
              </span>
              <h3 ref={headingRef} tabIndex={-1} className={cn(typo.titleMd, "text-ink")}>
                문의가 접수되었습니다
              </h3>
              <p className={cn(typo.bodyMd, "text-body")}>
                남겨주신 연락처로 담당자가 회신드립니다.
              </p>
              <p className={cn(typo.datetime, "text-muted")}>{`접수번호 ${ticketId}`}</p>
              <Button type="button" variant="secondary" onClick={restart}>
                다시 문의하기
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-base" noValidate>
              {/* 필수/선택은 라벨 텍스트로 표기한다(별표 아님 — 고령 사용자가 놓치기 쉽다). 가입 폼과 같은 관례.
                  native required는 noValidate라 브라우저 팝업을 띄우지 않고 aria-required만 부여한다(스크린리더용). */}
              <div className="flex flex-col gap-xxs">
                <label htmlFor="inquiry-name" className={cn(typo.bodySm, "text-ink")}>
                  이름 (필수)
                </label>
                <Input id="inquiry-name" autoComplete="name" required error={errors.name?.message} {...register("name")} />
              </div>

              <div className="flex flex-col gap-xxs">
                <label htmlFor="inquiry-phone" className={cn(typo.bodySm, "text-ink")}>
                  연락처 (필수)
                </label>
                <Input
                  id="inquiry-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                  error={errors.phone?.message}
                  {...register("phone")}
                  // 자동 하이픈 — 가입·로그인 폼과 동일한 입력 경험.
                  onChange={(e) => setValue("phone", formatPhone(e.target.value))}
                />
              </div>

              <div className="flex flex-col gap-xxs">
                <label htmlFor="inquiry-email" className={cn(typo.bodySm, "text-ink")}>
                  이메일 (선택)
                </label>
                <Input id="inquiry-email" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
              </div>

              <div className="flex flex-col gap-xxs">
                <label htmlFor="inquiry-content" className={cn(typo.bodySm, "text-ink")}>
                  문의 내용 (필수)
                </label>
                <Textarea id="inquiry-content" rows={8} required error={errors.content?.message} {...register("content")} />
              </div>

              <div className="flex items-start justify-between gap-sm">
                <Checkbox
                  label="개인정보 수집·이용 동의 (필수)"
                  required
                  error={errors.privacyAgreed?.message}
                  {...register("privacyAgreed")}
                />
                <TermsDialog doc={PRIVACY_POLICY} />
              </div>

              <Button type="submit" loading={isSubmitting} className="self-start">
                문의 남기기
              </Button>
            </form>
          )}
        </div>
      </Reveal>
    </Container>
  );
}
