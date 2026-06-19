import { z } from "zod";

// 하이픈 허용 입력 → 숫자만 세어 자릿수 검증. 전송은 입력 그대로(서버가 정규화 — 가이드 11장).
export const phoneSchema = z
  .string()
  .min(1, "전화번호를 입력해 주세요.")
  .regex(/^[0-9-]+$/, "전화번호는 숫자와 하이픈만 입력할 수 있습니다.")
  .refine((v) => {
    const digits = v.replace(/-/g, "").length;
    // 02-XXX-XXXX(9자리) ~ 010-XXXX-XXXX(11자리) 커버
    return digits >= 9 && digits <= 11;
  }, "전화번호 자릿수를 확인해 주세요.");

const agreedTrue = (message: string) => z.boolean().refine((v) => v === true, message);

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "비밀번호를 입력해 주세요."), // 로그인은 존재만 — 길이 정책은 가입 전용
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    name: z.string().min(1, "이름을 입력해 주세요."),
    phone: phoneSchema,
    // 최소 길이만 강제 — 특수문자·대소문자 규칙 없음(고령 배려, 가이드 12장)
    password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
    passwordConfirm: z.string().min(1, "비밀번호를 한 번 더 입력해 주세요."),
    // 선택 입력: 빈 문자열 허용(제출 시 undefined로 변환), 값이 있으면 형식 검증
    email: z.union([z.literal(""), z.email("이메일 형식을 확인해 주세요.")]),
    termsAgreed: agreedTrue("이용약관에 동의해 주세요."),
    privacyAgreed: agreedTrue("개인정보처리방침에 동의해 주세요."),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "비밀번호가 일치하지 않습니다.",
  });
export type SignupFormValues = z.infer<typeof signupSchema>;

export const agreementsSchema = z.object({
  termsAgreed: agreedTrue("이용약관에 동의해 주세요."),
  privacyAgreed: agreedTrue("개인정보처리방침에 동의해 주세요."),
});
export type AgreementsFormValues = z.infer<typeof agreementsSchema>;
