// src/components/bulletins/schemas.ts
import { z } from "zod";

export const bulletinSchema = z.object({
  title: z.string().min(1, "제목을 입력해 주세요.").max(200),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "예배일을 선택해 주세요."),
  mediaId: z.number().int().positive("PDF 파일을 선택해 주세요."),
});
export type BulletinFormValues = z.infer<typeof bulletinSchema>;
