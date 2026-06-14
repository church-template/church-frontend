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
}

// 미리보기 MarkdownContent는 tab==="preview"일 때만 마운트 → 작성 중(키 입력)엔 renderMarkdown 미실행.
// (Radix는 비활성 TabsContent를 언마운트하지 않고 hidden으로 유지하므로 tab 상태로 직접 게이트한다.)
export function MarkdownEditor({ value, onChange, id, error, placeholder }: MarkdownEditorProps) {
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
        />
      </TabsContent>
      <TabsContent value="preview">
        {tab === "preview" ? (
          value.trim() ? (
            <MarkdownContent source={value} />
          ) : (
            <p className={cn(typo.bodySm, "text-muted")}>미리볼 내용이 없습니다.</p>
          )
        ) : null}
      </TabsContent>
    </Tabs>
  );
}
