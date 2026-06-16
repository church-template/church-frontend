import { z } from "zod";

// optional().default() 미사용(zodResolver 입력/출력 타입 불일치 회피) — 기본값은 useForm defaultValues에서 주입.
// parentId/sortOrder는 number|null로 모델링(폼 select·number 입력의 빈값=null).
export const departmentSchema = z.object({
  name: z.string().min(1, "부서명을 입력해 주세요.").max(100),
  description: z.string().max(50000),
  leader: z.string().max(100),
  parentId: z.number().nullable(),
  sortOrder: z.number().int().nonnegative().nullable(),
});

export type DepartmentFormValues = z.infer<typeof departmentSchema>;
