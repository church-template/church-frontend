import { z } from "zod";

// 장 수 입력 — 백엔드 ChallengeReadRequest.chapters(1~1189)와 동일 범위. zod v4: 커스텀 메시지는 두 번째 인자.
export const readSchema = z.object({
  chapters: z.coerce.number().int("정수로 입력해 주세요.")
    .min(1, "1장 이상 입력해 주세요.")
    .max(1189, "1189장 이하로 입력해 주세요."),
});
export type ReadFormValues = z.infer<typeof readSchema>;
