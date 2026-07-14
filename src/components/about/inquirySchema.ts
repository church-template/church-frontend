import { z } from "zod";
import { phoneSchema } from "@/components/auth/schemas";

// API 제약(api-docs InquiryCreateRequest)과 1:1 — 이름 ≤50 · 연락처 ≤20 · 이메일 ≤100 · 내용 10~2000.
export const inquirySchema = z.object({
  name: z.string().min(1, "이름을 입력해 주세요.").max(50, "이름은 50자 이하로 입력해 주세요."),
  phone: phoneSchema, // 하이픈 허용·자릿수 검증(가입 폼과 공유)
  // 선택 입력: 빈 문자열 허용(제출 시 undefined로 변환), 값이 있으면 형식 검증
  email: z.union([
    z.literal(""),
    z.email("이메일 형식을 확인해 주세요.").max(100, "이메일은 100자 이하로 입력해 주세요."),
  ]),
  content: z
    .string()
    .min(10, "문의 내용을 10자 이상 입력해 주세요.")
    .max(2000, "문의 내용은 2000자 이하로 입력해 주세요."),
  privacyAgreed: z.boolean().refine((v) => v === true, "개인정보 수집·이용에 동의해 주세요."),
});
export type InquiryFormValues = z.infer<typeof inquirySchema>;
