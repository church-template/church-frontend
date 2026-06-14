"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/Textarea";
import { MarkdownContent } from "@/components/common/MarkdownContent";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  error?: string;
  placeholder?: string;
  /** Textarea 행 수. 미지정 시 Textarea 기본(12) 유지 — 폼별로 높이를 조정할 때 사용. */
  rows?: number;
}

// Radix TabsContent는 비활성 탭의 자식을 아예 마운트하지 않는다.
// → preview 탭이 선택될 때만 MarkdownContent가 마운트되므로 작성 중 renderMarkdown은 실행되지 않는다.
export function MarkdownEditor({ value, onChange, id, error, placeholder, rows }: MarkdownEditorProps) {
  const [tab, setTab] = useState("write");
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="write">작성</TabsTrigger>
        <TabsTrigger value="preview">미리보기</TabsTrigger>
      </TabsList>
      <TabsContent value="write">
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          error={error}
          placeholder={placeholder}
          rows={rows}
        />
      </TabsContent>
      <TabsContent value="preview">
        {value.trim() ? (
          <MarkdownContent source={value} />
        ) : (
          <p className={cn(typo.bodySm, "text-muted")}>미리볼 내용이 없습니다.</p>
        )}
      </TabsContent>
    </Tabs>
  );
}
