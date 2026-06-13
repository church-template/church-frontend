import { z } from "zod";

// 전화 규칙은 auth/schemas의 phoneSchema와 동일 산식(도메인 분리로 별도 정의). 하이픈 허용·자릿수만 검증.
const phone = z
  .string()
  .min(1, "전화번호를 입력해 주세요.")
  .regex(/^[0-9-]+$/, "전화번호는 숫자와 하이픈만 입력할 수 있습니다.")
  .refine((v) => {
    const digits = v.replace(/-/g, "").length;
    return digits >= 9 && digits <= 11;
  }, "전화번호 자릿수를 확인해 주세요.");

export const profileSchema = z.object({
  name: z.string().min(1, "이름을 입력해 주세요.").max(50, "이름은 50자 이내여야 합니다."),
  phone,
  // 선택: 빈 문자열 허용(제출 시 전송 제외), 값이 있으면 형식 검증
  email: z.union([z.literal(""), z.email("이메일 형식을 확인해 주세요.")]),
});
export type ProfileFormValues = z.infer<typeof profileSchema>;

export const passwordChangeSchema = z
  .object({
    password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다.").max(72, "비밀번호는 72자 이내여야 합니다."),
    passwordConfirm: z.string().min(1, "비밀번호를 한 번 더 입력해 주세요."),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "비밀번호가 일치하지 않습니다.",
  });
export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;

// 회원 탈퇴 재인증 — 현재 비밀번호(WithdrawRequest, 서버 minLength 1). 비어있지 않음만 검증.
export const withdrawSchema = z.object({
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});
export type WithdrawValues = z.infer<typeof withdrawSchema>;
