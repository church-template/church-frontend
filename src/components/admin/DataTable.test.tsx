// src/components/admin/DataTable.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataTable, type Column } from "./DataTable";

interface Row { id: number; name: string }
const columns: Column<Row>[] = [{ key: "name", header: "이름", cell: (r) => r.name }];

describe("DataTable", () => {
  it("rows를 셀로 렌더하고 actions 셀을 붙인다", () => {
    render(
      <DataTable
        columns={columns}
        rows={[{ id: 1, name: "주보.pdf" }]}
        rowKey={(r) => r.id}
        actions={(r) => <button type="button">삭제 {r.id}</button>}
      />,
    );
    expect(screen.getByText("주보.pdf")).toBeDefined();
    expect(screen.getByRole("button", { name: "삭제 1" })).toBeDefined();
  });

  it("rows가 비면 empty를 보여준다", () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} />);
    expect(screen.getByText("데이터가 없습니다.")).toBeDefined();
  });

  it("loading이면 행 대신 스켈레톤(aria-busy)을 보여준다", () => {
    const { container } = render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} loading />);
    expect(container.querySelector("[aria-busy]")).not.toBeNull();
  });

  it("표를 가로 스크롤 컨테이너로 감싼다(반응형)", () => {
    const { container } = render(
      <DataTable columns={columns} rows={[{ id: 1, name: "주보.pdf" }]} rowKey={(r) => r.id} />,
    );
    expect(container.querySelector(".overflow-x-auto")).not.toBeNull();
  });
});
