import { z } from "zod";
import { phoneSchema } from "@/components/auth/schemas";

// PATCH지만 폼은 세 필드 전체 제출. 전화 규칙은 가입 폼과 동일(phoneSchema 재사용).
// 이메일은 선택(빈 문자열 허용) — zod v4 top-level z.email() 사용(z.string().email() 아님).
export const memberUpdateSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(50, "50자 이내로 입력해 주세요."),
  phone: phoneSchema,
  email: z.union([z.literal(""), z.email("이메일 형식을 확인해 주세요.")]),
});
export type MemberFormValues = z.infer<typeof memberUpdateSchema>;
