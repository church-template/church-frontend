"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import type { MeResponse } from "@/lib/auth/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { permissionLabel } from "@/constants/permissions";
import { ProfileEditForm } from "./ProfileEditForm";

export function ProfileCard({ me }: { me: MeResponse }) {
  const [editing, setEditing] = useState(false);
  // 승인 판정은 백엔드 단일 소스(me.approved) — roles.includes("MEMBER")로 직접 계산하면
  // 어드민/슈퍼어드민(MEMBER 없이 승인)이 manage 화면과 어긋난다(가이드 1.5 라이브 권한).
  const approved = me.approved;

  return (
    <section className="rounded-xl border border-hairline bg-surface-card p-xl">
      <div className="flex items-start justify-between gap-md">
        <div className="flex items-center gap-md">
          <span
            aria-hidden
            className={cn(typo.titleLg, "flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary")}
          >
            {me.name.slice(0, 1)}
          </span>
          <div className="flex flex-col gap-xxs">
            <div className="flex flex-wrap items-center gap-sm">
              <h2 className={cn(typo.titleLg, "text-ink")}>{me.name}</h2>
              <Badge variant={approved ? "primary" : "default"}>{approved ? "승인" : "승인 대기"}</Badge>
              {/* 본인 역할(RBAC) 칩 — 승인 배지 옆에 나열 */}
              {me.roles.map((r) => (
                <Badge key={r}>{r}</Badge>
              ))}
            </div>
            <span className={cn(typo.bodySm, "text-muted")}>{me.email || "이메일 미등록"}</span>
          </div>
        </div>
        {editing ? null : (
          <Button variant="tertiary" className="shrink-0" onClick={() => setEditing(true)}>
            수정
          </Button>
        )}
      </div>

      {editing ? (
        <ProfileEditForm me={me} onDone={() => setEditing(false)} />
      ) : (
        <dl className="mt-lg flex flex-col">
          <Row label="전화" value={me.phone} datetime />
          {me.position ? <Row label="직분" value={me.position} /> : null}
        </dl>
      )}

      {me.permissions.length > 0 ? (
        <div className="mt-lg flex flex-col gap-xs">
          <span className={cn(typo.caption, "text-muted")}>이용 권한</span>
          <div className="flex flex-wrap gap-xs">
            {me.permissions.map((p) => (
              <Badge key={p}>{permissionLabel(p)}</Badge>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Row({ label, value, datetime = false }: { label: string; value: string; datetime?: boolean }) {
  return (
    <div className="flex gap-lg border-t border-hairline py-sm first:border-t-0">
      <dt className={cn(typo.bodySm, "w-16 shrink-0 text-muted")}>{label}</dt>
      <dd className={cn(datetime ? typo.datetime : typo.bodyMd, "text-ink")}>{value}</dd>
    </div>
  );
}
