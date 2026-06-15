// src/components/admin/media/MediaReferencesDialog.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MediaReferencesDialog } from "./MediaReferencesDialog";

describe("MediaReferencesDialog", () => {
  it("참조 목록(유형·제목)을 표시하고 삭제 버튼은 없다", () => {
    render(
      <MediaReferencesDialog
        open
        onOpenChange={() => {}}
        references={[{ type: "sermon", id: 1, title: "주일설교" }]}
      />,
    );
    expect(screen.getByText("주일설교")).toBeDefined();
    expect(screen.getByText("sermon")).toBeDefined();
    expect(screen.queryByRole("button", { name: "삭제" })).toBeNull();
  });
});
