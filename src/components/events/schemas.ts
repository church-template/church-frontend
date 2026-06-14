import { z } from "zod";

// optional().default()를 쓰면 zod 입력 타입(undefined 허용)과 출력 타입(required)이 어긋나
// zodResolver + useForm 제네릭에서 TS2322가 발생한다.
// 기본값은 useForm defaultValues에서 주입하고, 스키마는 plain 타입으로 유지한다(notices/schemas.ts 동일 패턴).
// datetime-local/date 문자열은 0-패딩 ISO 형태라 사전식 비교가 시간순과 일치(동일 포맷 전제).
export const eventSchema = z
  .object({
    title: z.string().min(1, "제목을 입력해 주세요.").max(200),
    startAt: z.string().min(1, "시작 일시를 선택해 주세요."),
    endAt: z.string().max(50),
    allDay: z.boolean(),
    location: z.string().max(200),
    description: z.string().max(50000),
    tagIds: z.array(z.number()),
  })
  .refine((v) => v.endAt === "" || v.endAt > v.startAt, {
    message: "종료는 시작보다 이후여야 합니다.",
    path: ["endAt"],
  });

export type EventFormValues = z.infer<typeof eventSchema>;
