import { z } from "zod";

export const tagSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요.").max(50, "50자 이내로 입력해 주세요."),
});
export type TagFormValues = z.infer<typeof tagSchema>;
