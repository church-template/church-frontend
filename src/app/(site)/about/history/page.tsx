import type { Metadata } from "next";
import { HistoryStory } from "@/components/history/HistoryStory";
import { HISTORY } from "@/constants/content";

export const metadata: Metadata = { title: "연혁" };

// 공개 연혁 — 상수 구동(백엔드 무관, 부서 인트로와 동일 격리). 서버 컴포넌트가 client 스토리를 감싼다.
export default function HistoryPage() {
  return <HistoryStory content={HISTORY} />;
}
