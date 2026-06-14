import { z } from "zod";

// 빈 문자열 선택 필드는 그대로 통과(전송 단계에서 undefined로 정리). 필수만 min(1).
// optional().default()를 쓰면 z.infer가 `string | undefined`를 반환해 useForm 제네릭과 불일치 → TS2322.
// 선택 필드는 plain string으로 두고, 빈값 초기화는 useForm defaultValues에서 담당한다.
export const sermonSchema = z.object({
  title: z.string().min(1, "제목을 입력해 주세요.").max(200),
  preacher: z.string().min(1, "설교자를 입력해 주세요.").max(100),
  preachedAt: z.string().min(1, "설교일을 선택해 주세요."),
  series: z.string().max(100),
  scripture: z.string().max(200),
  content: z.string().max(50000),
  videoUrl: z.string().max(500),
  audioUrl: z.string().max(500),
  tagIds: z.array(z.number()),
});

export type SermonFormValues = z.infer<typeof sermonSchema>;
