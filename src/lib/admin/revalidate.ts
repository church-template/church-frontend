"use server";

import { updateTag } from "next/cache";

// 어드민 쓰기(생성·수정·삭제) 성공 후 client onSuccess에서 await 호출 → 해당 도메인 공개 ISR 캐시를
// 즉시 무효화(read-your-own-writes). updateTag는 server action 전용·단일 인자·즉시(Next 16).
// 다음 요청이 stale 캐시 없이 fresh 데이터를 fetches한다.
// (revalidateTag 단일 인자는 legacy behavior — updateTag가 read-your-own-writes 전용 명시 API)
export async function revalidateEvents() {
  updateTag("events");
}

export async function revalidateNotices() {
  updateTag("notices");
}

export async function revalidateBulletins() {
  updateTag("bulletins");
}

export async function revalidateTags() {
  updateTag("tags");
}
