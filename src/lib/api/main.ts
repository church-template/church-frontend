import { apiUrl } from "@/lib/auth/apiBase";
import type { MainResponse } from "./types";

// 메인 통합 조회(공개, 인증 불필요) — 서버 컴포넌트 전용.
// revalidate 60 = fetch 데이터 캐시 TTL. 백엔드 Redis TTL 60s와 동기(백엔드 답변 F).
export async function getMain(): Promise<MainResponse> {
  const res = await fetch(apiUrl("/api/main"), { next: { revalidate: 60 } });
  if (!res.ok) {
    // 메인 전용 에러 UI 없이 루트 error.tsx로 위임한다(스펙 D4).
    throw new Error(`GET /api/main 실패: ${res.status}`);
  }
  const data = (await res.json()) as Partial<MainResponse>;
  // 자체 백엔드 + OpenAPI 단일 진실 → zod 검증은 과함. 배열 누락만 방어(스펙 §4).
  return {
    sermons: data.sermons ?? [],
    notices: data.notices ?? [],
    upcomingEvents: data.upcomingEvents ?? [],
  };
}
