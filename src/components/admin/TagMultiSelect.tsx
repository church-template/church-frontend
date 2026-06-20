"use client";

import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getTags } from "@/lib/api/tags";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface TagMultiSelectProps {
  value: number[];
  onChange: (value: number[]) => void;
}

// 기존 태그 선택 전용(신규 생성=06 TAG_MANAGE 소관). 옵션은 공개 getTags.
export function TagMultiSelect({ value, onChange }: TagMultiSelectProps) {
  const { data: tags = [], isPending, isError } = useQuery({ queryKey: ["tags"], queryFn: getTags });
  const selected = tags.filter((t) => value.includes(t.id));
  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }
  return (
    <div className="flex flex-col gap-sm">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="secondary">
            태그 선택
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start">
          {isError ? (
            <p className={cn(typo.bodySm, "text-error")}>태그를 불러오지 못했습니다.</p>
          ) : isPending ? (
            <p className={cn(typo.bodySm, "text-muted")}>불러오는 중…</p>
          ) : tags.length > 0 ? (
            <ul className="flex flex-col gap-xs">
              {tags.map((t) => (
                <li key={t.id}>
                  <Checkbox
                    label={t.name}
                    checked={value.includes(t.id)}
                    onChange={() => toggle(t.id)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className={cn(typo.bodySm, "text-muted")}>등록된 태그가 없습니다.</p>
          )}
        </PopoverContent>
      </Popover>
      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-xs">
          {selected.map((t) => (
            <li key={t.id}>
              <Badge variant="primary">{t.name}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
