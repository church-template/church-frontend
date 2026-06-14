import { z } from "zod";

// datetime-local/date 문자열은 0-패딩 ISO 형태라 사전식 비교가 시간순과 일치(동일 포맷 전제).
export const eventSchema = z
  .object({
    title: z.string().min(1, "제목을 입력해 주세요.").max(200),
    startAt: z.string().min(1, "시작 일시를 선택해 주세요."),
    endAt: z.string().optional().default(""),
    allDay: z.boolean().default(false),
    location: z.string().max(200).optional().default(""),
    description: z.string().max(50000).optional().default(""),
    tagIds: z.array(z.number()).default([]),
  })
  .refine((v) => v.endAt === "" || v.endAt > v.startAt, {
    message: "종료는 시작보다 이후여야 합니다.",
    path: ["endAt"],
  });

export type EventFormValues = z.infer<typeof eventSchema>;
