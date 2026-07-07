import { z } from "zod";

// 백엔드 ChallengeCreateRequest 제약과 동일(제목 ≤100, 소개 ≤50000, 권 1~66, 일수 1~3650).
// zod v4 — number()에 invalid_type_error 없음: coerce + 메시지 인자만 사용(전역 규칙).
// startBook·endBook은 <select>를 Controller로 감싸 onChange에서 이미 Number() 변환(DepartmentFormDialog
// parentId/sortOrder 선례) → 여기선 coerce 불필요·plain z.number()(coerce였다면 입출력 타입이 갈려
// useForm 제네릭을 셋 다 명시해야 함, ReadDialog 선례). targetDays만 네이티브 input이라 coerce 유지.
export const challengeSchema = z
  .object({
    title: z.string().trim().min(1, "제목을 입력해 주세요.").max(100, "100자 이내로 입력해 주세요."),
    description: z.string().max(50000, "소개가 너무 깁니다."),
    startBook: z.number().int().min(1).max(66),
    endBook: z.number().int().min(1).max(66),
    startDate: z.string().min(1, "시작일을 선택해 주세요."),
    targetDays: z.coerce.number({ error: "목표 일수를 입력해 주세요." }).int("정수로 입력해 주세요.")
      .min(1, "1일 이상이어야 합니다.").max(3650, "3650일 이하여야 합니다."),
  })
  .refine((v) => v.startBook <= v.endBook, {
    path: ["endBook"],
    message: "끝 권은 시작 권보다 앞설 수 없습니다.",
  });
export type ChallengeFormValues = z.infer<typeof challengeSchema>;
