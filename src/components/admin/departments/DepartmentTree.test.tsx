import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { buildDepartmentTree } from "@/lib/api/departments";
import { DepartmentTree } from "./DepartmentTree";

const flat = [
  { id: 1, name: "학생부", leader: "김집사", parentId: null, sortOrder: 10 },
  { id: 2, name: "중등부", leader: "이전도", parentId: 1, sortOrder: 10 },
  { id: 3, name: "고등부", leader: "박전도", parentId: 1, sortOrder: 20 },
  { id: 5, name: "1학년부", leader: "김교사", parentId: 2, sortOrder: 10 },
  { id: 4, name: "청년부", leader: "최목사", parentId: null, sortOrder: 20 },
];
const roots = buildDepartmentTree(flat);
function noop() {}

describe("DepartmentTree", () => {
  it("접힘 없으면 모든 노드를 렌더한다", () => {
    render(<DepartmentTree roots={roots} collapsed={new Set()} onToggle={noop} onCreateChild={noop} onEdit={noop} onDelete={noop} />);
    ["학생부", "중등부", "1학년부", "고등부", "청년부"].forEach((n) => expect(screen.getByText(n)).toBeDefined());
  });

  it("접힌 노드의 하위는 숨긴다", () => {
    render(<DepartmentTree roots={roots} collapsed={new Set([2])} onToggle={noop} onCreateChild={noop} onEdit={noop} onDelete={noop} />);
    expect(screen.queryByText("1학년부")).toBeNull();
  });

  it("chevron 클릭 시 onToggle, 잎 노드엔 접기/펼치기 버튼이 없다", () => {
    const onToggle = vi.fn();
    render(<DepartmentTree roots={roots} collapsed={new Set()} onToggle={onToggle} onCreateChild={noop} onEdit={noop} onDelete={noop} />);
    fireEvent.click(screen.getByRole("button", { name: "학생부 접기" }));
    expect(onToggle).toHaveBeenCalledWith(1);
    expect(screen.queryByRole("button", { name: /청년부 (접기|펼치기)/ })).toBeNull();
  });

  it("노드 ＋하위·수정·삭제가 올바른 인자로 콜백한다", () => {
    const onCreateChild = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<DepartmentTree roots={roots} collapsed={new Set()} onToggle={noop} onCreateChild={onCreateChild} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: "중등부 하위 추가" }));
    expect(onCreateChild).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "중등부 수정" }));
    expect(onEdit).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "중등부 삭제" }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });

  it("부서가 없으면 안내를 보인다", () => {
    render(<DepartmentTree roots={[]} collapsed={new Set()} onToggle={noop} onCreateChild={noop} onEdit={noop} onDelete={noop} />);
    expect(screen.getByText("등록된 부서가 없습니다.")).toBeDefined();
  });
});
