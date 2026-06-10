"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { notify } from "@/lib/notify";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-sm">
      <span className={cn(typo.captionStrong, "text-muted")}>{label}</span>
      <div className="flex flex-wrap items-center gap-base">{children}</div>
    </div>
  );
}

export function BehaviorShowcase() {
  return (
    <section className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-baseline gap-base">
        <h2 className={cn(typo.titleLg, "text-ink")}>동작 컴포넌트</h2>
        <span className={cn(typo.caption, "text-muted")}>
          shadcn 재스킨 — Dialog · Sheet · Toast · Popover · Dropdown · Select · Tabs
        </span>
      </div>

      <div className="flex flex-col gap-lg rounded-xl border border-hairline p-xl">
        <Row label="Toast (notify seam)">
          <Button variant="primary" onClick={() => notify.success("저장되었습니다")}>
            성공 토스트
          </Button>
          <Button
            variant="secondary"
            onClick={() => notify.error("저장에 실패했습니다")}
          >
            오류 토스트
          </Button>
        </Row>

        <Row label="Dialog (Modal)">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="primary">모달 열기</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>다시 편집하시겠어요?</DialogTitle>
                <DialogDescription>
                  다른 사용자가 먼저 수정했습니다. 최신 내용을 불러온 뒤 다시 편집합니다.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary">취소</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="primary">다시 편집</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Row>

        <Row label="Sheet (모바일 네비)">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary">
                <Menu size={18} aria-hidden /> 메뉴
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetTitle>메뉴</SheetTitle>
              <SheetDescription>교회 소개 · 예배 · 설교 · 소식</SheetDescription>
            </SheetContent>
          </Sheet>
        </Row>

        <Row label="Popover">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="tertiary">+2 더보기</Button>
            </PopoverTrigger>
            <PopoverContent>
              <p className={cn(typo.bodySm, "text-body")}>
                같은 날 일정 2건이 더 있습니다.
              </p>
            </PopoverContent>
          </Popover>
        </Row>

        <Row label="DropdownMenu">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">교육부서</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>부서</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>유년부</DropdownMenuItem>
              <DropdownMenuItem>중고등부</DropdownMenuItem>
              <DropdownMenuItem>청년부</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Row>

        <Row label="Select">
          <Select>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="예배 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sun1">주일 1부</SelectItem>
              <SelectItem value="sun2">주일 2부</SelectItem>
              <SelectItem value="wed">수요 예배</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        <Row label="Tabs">
          <Tabs defaultValue="intro" className="w-full">
            <TabsList>
              <TabsTrigger value="intro">소개</TabsTrigger>
              <TabsTrigger value="worship">예배</TabsTrigger>
              <TabsTrigger value="location">오시는 길</TabsTrigger>
            </TabsList>
            <TabsContent value="intro">
              <p className={cn(typo.bodyMd, "text-body")}>교회 소개 내용</p>
            </TabsContent>
            <TabsContent value="worship">
              <p className={cn(typo.bodyMd, "text-body")}>예배 안내 내용</p>
            </TabsContent>
            <TabsContent value="location">
              <p className={cn(typo.bodyMd, "text-body")}>오시는 길 내용</p>
            </TabsContent>
          </Tabs>
        </Row>
      </div>
    </section>
  );
}
