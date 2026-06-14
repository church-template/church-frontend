import { z } from "zod";

// optional().default()를 쓰면 zod 입력 타입(undefined 허용)과 출력 타입(required)이 어긋나
// zodResolver + useForm 제네릭에서 TS2322/TS2345 에러가 발생한다.
// 기본값은 useForm defaultValues에서 주입하고 스키마는 plain 타입으로 유지한다(sermons/schemas.ts 동일 패턴).
export const noticeSchema = z.object({
  title: z.string().min(1, "제목을 입력해 주세요.").max(200),
  content: z.string().max(50000),
  isPinned: z.boolean(),
  tagIds: z.array(z.number()),
});

export type NoticeFormValues = z.infer<typeof noticeSchema>;
