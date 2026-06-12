// src/components/sermons/SermonSearch.tsx
// 설교 검색 = 공유 SearchPill에 설교용 문구 주입(동작 동일, 로직은 SearchPill가 단일 소유).
import { SearchPill, SearchPillForm } from "@/components/common/SearchPill";

const SERMON_SEARCH = {
  placeholder: "제목·설교자·시리즈·성경구절",
  ariaLabel: "설교 검색",
} as const;

export function SermonSearch() {
  return <SearchPill {...SERMON_SEARCH} />;
}

// 기존 단위 테스트(SermonSearch.test.tsx) 호환 — Form 변형 유지.
export function SermonSearchForm() {
  return <SearchPillForm {...SERMON_SEARCH} />;
}
