import { z } from "zod";

// priority 상한이 런타임(maxPriority)이라 스키마 팩토리. optional().default() 미사용(zodResolver 입출력 타입 일치).
// zod v4 — number 커스텀 메시지 인자(invalid_type_error) 미사용. 하한 없음(계약 무제약, 음수 maxPriority 폼 불능 방지).
export function createRoleSchema(maxPriority: number) {
  return z.object({
    name: z.string().trim().min(1, "이름을 입력해 주세요.").max(50, "50자 이내로 입력해 주세요."),
    priority: z.number().int().max(maxPriority, "내 등급보다 높게 만들 수 없습니다."),
    description: z.string().trim().max(255, "255자 이내로 입력해 주세요."),
  });
}
export type RoleFormValues = z.infer<ReturnType<typeof createRoleSchema>>;
