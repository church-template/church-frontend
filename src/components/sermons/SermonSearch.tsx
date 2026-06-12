// src/components/sermons/SermonSearch.tsx
"use client";

import { Suspense, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/Input";

interface SearchFormProps {
  initialQ: string;
}

// URL에서 초기값을 받아 독립적으로 동작. key={initialQ}로 마운트하면 URL 변경 시 입력값이 동기화된다.
function SearchFormInner({ initialQ }: SearchFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQ);

  // 기존 쿼리(tagId 등) 보존하며 q만 set/delete + page 리셋.
  const navigate = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const q = next.trim();
    if (q) params.set("q", q);
    else params.delete("q");
    params.delete("page");
    const s = params.toString();
    router.push(s ? `${pathname}?${s}` : pathname);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate(value);
  };

  const onClear = () => {
    setValue("");
    navigate("");
  };

  return (
    <form role="search" onSubmit={onSubmit} className="relative">
      <Input
        variant="searchPill"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="제목·설교자·시리즈·성경구절"
        aria-label="설교 검색"
        className="pr-12"
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="검색어 지우기"
          className="absolute top-1/2 right-4 -translate-y-1/2 text-muted hover:text-ink"
        >
          <X size={18} aria-hidden />
        </button>
      ) : (
        <button
          type="submit"
          aria-label="검색"
          className="absolute top-1/2 right-4 -translate-y-1/2 text-muted hover:text-ink"
        >
          <Search size={18} aria-hidden />
        </button>
      )}
    </form>
  );
}

function SermonSearchForm() {
  const searchParams = useSearchParams();
  const currentQ = searchParams.get("q") ?? "";
  // 외부 URL 변경(활성칩 ✕로 q 제거 등)을 입력값에 반영 — key로 remount해 동기화.
  return <SearchFormInner key={currentQ} initialQ={currentQ} />;
}

// 공개 export — useSearchParams Suspense 경계(빌드 게이트, TagFilter 패턴).
export function SermonSearch() {
  return (
    <Suspense fallback={<div className="h-11" aria-hidden />}>
      <SermonSearchForm />
    </Suspense>
  );
}

export { SermonSearchForm };
