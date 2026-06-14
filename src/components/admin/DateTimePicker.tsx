// src/components/admin/DateTimePicker.tsx
"use client";

import { Input } from "@/components/ui/Input";

export interface DateTimePickerProps {
  value: string; // datetime-local("YYYY-MM-DDTHH:mm") 또는 date("YYYY-MM-DD")
  onChange: (value: string) => void;
  allDay?: boolean;
  id?: string;
  error?: string;
}

// date-fns 없이 네이티브 입력만 사용. allDay면 date 입력 + 값 날짜 슬라이스.
// naive 값을 그대로 다루고 직렬화는 toServerDateTime가 담당(TZ 미개입).
export function DateTimePicker({ value, onChange, allDay = false, id, error }: DateTimePickerProps) {
  const shown = allDay ? value.slice(0, 10) : value;
  return (
    <Input
      id={id}
      type={allDay ? "date" : "datetime-local"}
      value={shown}
      onChange={(e) => onChange(e.target.value)}
      error={error}
    />
  );
}
