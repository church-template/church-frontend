"use client";

import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { getTags } from "@/lib/api/tags";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface TagMultiSelectProps {
  value: number[];
  onChange: (value: number[]) => void;
}

// 기존 태그 선택 전용(신규 생성=06 TAG_MANAGE 소관). 옵션은 공개 getTags.
// 인라인 칩 토글 — 플로팅(Popover)이면 모달(z-overlay 50) 뒤에 깔려 조작 불가라 포탈 자체를 쓰지 않는다.
export function TagMultiSelect({ value, onChange }: TagMultiSelectProps) {
  const { data: tags = [], isPending, isError } = useQuery({ queryKey: ["tags"], queryFn: getTags });
  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }
  if (isError) {
    return <p className={cn(typo.bodySm, "text-error")}>태그를 불러오지 못했습니다.</p>;
  }
  if (isPending) {
    return <p className={cn(typo.bodySm, "text-muted")}>불러오는 중…</p>;
  }
  if (tags.length === 0) {
    return <p className={cn(typo.bodySm, "text-muted")}>등록된 태그가 없습니다.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-xs">
      {tags.map((t) => {
        const selected = value.includes(t.id);
        return (
          <li key={t.id}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(t.id)}
              className={cn(
                typo.bodySm,
                "inline-flex items-center gap-xxs rounded-sm px-sm py-xs whitespace-nowrap",
                "transition duration-150 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                selected ? "bg-primary text-on-primary" : "bg-surface-strong text-ink",
              )}
            >
              {selected ? <Check size={16} aria-hidden /> : null}
              {t.name}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
