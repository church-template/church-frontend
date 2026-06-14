import { z } from "zod";

// 빈 문자열 선택 필드는 그대로 통과(전송 단계에서 undefined로 정리). 필수만 min(1).
export const sermonSchema = z.object({
  title: z.string().min(1, "제목을 입력해 주세요.").max(200),
  preacher: z.string().min(1, "설교자를 입력해 주세요.").max(100),
  preachedAt: z.string().min(1, "설교일을 선택해 주세요."),
  series: z.string().max(100).optional().default(""),
  scripture: z.string().max(200).optional().default(""),
  content: z.string().max(50000).optional().default(""),
  videoUrl: z.string().max(500).optional().default(""),
  audioUrl: z.string().max(500).optional().default(""),
  tagIds: z.array(z.number()).default([]),
});

export type SermonFormValues = z.infer<typeof sermonSchema>;
