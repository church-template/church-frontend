import { z } from "zod";

export const noticeSchema = z.object({
  title: z.string().min(1, "제목을 입력해 주세요.").max(200),
  content: z.string().max(50000).optional().default(""),
  isPinned: z.boolean().default(false),
  tagIds: z.array(z.number()).default([]),
});

export type NoticeFormValues = z.infer<typeof noticeSchema>;
