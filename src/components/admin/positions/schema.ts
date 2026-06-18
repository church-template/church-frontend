import { z } from "zod";

// optional().default() 미사용(zodResolver 입출력 타입 불일치 회피). sortOrder는 number|null(빈값=null).
// zod v4 — number 커스텀 메시지 인자(invalid_type_error) 미사용(departments/schema.ts 동형).
export const positionSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(50, "50자 이내로 입력해 주세요."),
  sortOrder: z.number().int().nonnegative().nullable(),
});
export type PositionFormValues = z.infer<typeof positionSchema>;
