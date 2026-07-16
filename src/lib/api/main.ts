import { apiUrl } from "@/lib/auth/apiBase";
import type { MainResponse } from "./types";

// 메인 통합 조회(공개, 인증 불필요) — 서버 컴포넌트 전용.
// revalidate 60 = fetch 데이터 캐시 TTL. 백엔드 Redis TTL 60s와 동기(백엔드 답변 F).
export async function getMain(): Promise<MainResponse> {
  const res = await fetch(apiUrl("/api/main"), { next: { revalidate: 60 } });
  if (!res.ok) {
    // 던지면 page의 getMain().catch가 null로 흡수해 소식 영역에만 폴백(MainFeedsError)을 그린다.
    // Hero·연혁·사역·예배시간·CTA·푸터는 영향받지 않는다(스펙 D4: 루트 error.tsx 위임 → 장애 격리로 갱신).
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
