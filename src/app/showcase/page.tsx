import { notFound } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { SermonCard } from "@/components/cards/SermonCard";
import { NoticeRow } from "@/components/cards/NoticeRow";
import { ScheduleCard } from "@/components/cards/ScheduleCard";
import { EventCard } from "@/components/cards/EventCard";
import { FeatureCard } from "@/components/cards/FeatureCard";
import {
  Button as ButtonBefore,
  buttonVariants as buttonVariantsBefore,
} from "./_before/Button";
import { Badge as BadgeBefore } from "./_before/Badge";
import { Input as InputBefore } from "./_before/Input";
import { SermonCard as SermonCardBefore } from "./_before/SermonCard";
import { NoticeRow as NoticeRowBefore } from "./_before/NoticeRow";
import { EventCard as EventCardBefore } from "./_before/EventCard";
import { cn } from "@/lib/utils";
import { typo } from "@/constants/typography";
import { BehaviorShowcase } from "./_behavior/BehaviorShowcase";

// 폴리시 전(_before 스냅샷)/후를 한 화면에서 비교하는 검증 페이지 — 프로덕션 미노출.
function Compare({
  title,
  hint,
  before,
  after,
}: {
  title: string;
  hint?: string;
  before: ReactNode;
  after: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-base">
      <div className="flex flex-wrap items-baseline gap-base">
        <h2 className={cn(typo.titleLg, "text-ink")}>{title}</h2>
        {hint ? (
          <span className={cn(typo.caption, "text-muted")}>{hint}</span>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
        <div className="flex flex-col gap-base rounded-xl border border-hairline p-xl">
          <span className={cn(typo.captionStrong, "text-muted")}>BEFORE</span>
          {before}
        </div>
        <div className="flex flex-col gap-base rounded-xl border border-hairline p-xl">
          <span className={cn(typo.captionStrong, "text-primary")}>AFTER</span>
          {after}
        </div>
      </div>
    </section>
  );
}

export default function ShowcasePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex max-w-[var(--container-max)] flex-col gap-section px-lg py-section">
      <Compare
        title="Button"
        hint="필 → 16px 라운드(중첩 원칙) · hover · press(꾹 누르기) · Tab 포커스 비교"
        before={
          <div className="flex flex-wrap items-center gap-base">
            <ButtonBefore variant="primary">기본 CTA</ButtonBefore>
            <ButtonBefore variant="primary" disabled>
              비활성
            </ButtonBefore>
            <ButtonBefore variant="secondary">보조</ButtonBefore>
            <ButtonBefore variant="tertiary">텍스트 버튼</ButtonBefore>
            <ButtonBefore variant="pillCta">새가족 안내</ButtonBefore>
            <Link href="#" className={buttonVariantsBefore("pillCta")}>
              링크형 CTA
            </Link>
          </div>
        }
        after={
          <div className="flex flex-wrap items-center gap-base">
            <Button variant="primary">기본 CTA</Button>
            <Button variant="primary" disabled>
              비활성
            </Button>
            <Button variant="primary" loading>
              저장 중
            </Button>
            <Button variant="secondary">보조</Button>
            <Button variant="tertiary">텍스트 버튼</Button>
            <Button variant="pillCta">새가족 안내</Button>
            <Link href="#" className={buttonVariants("pillCta")}>
              링크형 CTA
            </Link>
          </div>
        }
      />

      <Compare
        title="Button — 다크 밴드"
        hint="hover 시 on-dark 10% 틴트(After)"
        before={
          <div className="flex flex-wrap items-center gap-base rounded-xl bg-surface-dark p-xl">
            <ButtonBefore variant="outlineOnDark">오시는 길</ButtonBefore>
            <ButtonBefore variant="outlineOnDark" disabled>
              비활성
            </ButtonBefore>
          </div>
        }
        after={
          <div className="flex flex-wrap items-center gap-base rounded-xl bg-surface-dark p-xl">
            <Button variant="outlineOnDark">오시는 길</Button>
            <Button variant="outlineOnDark" disabled>
              비활성
            </Button>
          </div>
        }
      />

      <Compare
        title="Badge"
        hint="풀필 → 8px(rounded-sm) — 칩의 템플릿 인상 제거"
        before={
          <div className="flex items-center gap-base">
            <BadgeBefore>기본</BadgeBefore>
            <BadgeBefore variant="primary">이번 주</BadgeBefore>
            <BadgeBefore variant="primary">NEW</BadgeBefore>
          </div>
        }
        after={
          <div className="flex items-center gap-base">
            <Badge>기본</Badge>
            <Badge variant="primary">이번 주</Badge>
            <Badge variant="primary">NEW</Badge>
          </div>
        }
      />

      <Compare
        title="Input"
        hint="hover 보더 톤 · 에러 보더 · disabled 처리 비교"
        before={
          <div className="flex flex-col gap-base">
            <InputBefore placeholder="이름을 입력하세요" />
            <InputBefore
              placeholder="이메일"
              error="이메일 형식이 올바르지 않습니다"
            />
            <InputBefore placeholder="비활성" disabled />
            <InputBefore variant="searchPill" placeholder="검색" />
          </div>
        }
        after={
          <div className="flex flex-col gap-base">
            <Input placeholder="이름을 입력하세요" />
            <Input placeholder="이메일" error="이메일 형식이 올바르지 않습니다" />
            <Input placeholder="비활성" disabled />
            <Input variant="searchPill" placeholder="검색" />
          </div>
        }
      />

      <Compare
        title="SermonCard"
        hint="hover 시 2px 리프트 + soft drop(After) · 썸네일 줌은 동일"
        before={
          <SermonCardBefore
            thumbnailUrl="/window.svg"
            title="은혜의 강가에서"
            preacher="김목사"
            date="2026.06.08"
            href="#"
          />
        }
        after={
          <SermonCard
            thumbnailUrl="/window.svg"
            title="은혜의 강가에서"
            preacher="김목사"
            date="2026.06.08"
            href="#"
          />
        }
      />

      <Compare
        title="NoticeRow"
        hint="hover 시 제목 primary 전이(After)"
        before={
          <Card className="p-xl">
            <NoticeRowBefore
              title="2026년 상반기 제직회 안내"
              date="2026.06.05"
              href="#"
              isNew
            />
            <NoticeRowBefore title="주차장 공사 안내" date="2026.06.01" href="#" />
          </Card>
        }
        after={
          <Card className="p-xl">
            <NoticeRow
              title="2026년 상반기 제직회 안내"
              date="2026.06.05"
              href="#"
              isNew
            />
            <NoticeRow title="주차장 공사 안내" date="2026.06.01" href="#" />
          </Card>
        }
      />

      <Compare
        title="EventCard"
        hint="hover 시 2px 리프트 + soft drop(After)"
        before={
          <EventCardBefore
            date="06.15"
            title="여름 수련회"
            summary="온 교우가 함께하는 여름 수련회에 초대합니다."
            href="#"
          />
        }
        after={
          <EventCard
            date="06.15"
            title="여름 수련회"
            summary="온 교우가 함께하는 여름 수련회에 초대합니다."
            href="#"
          />
        }
      />

      {/* 변경 없음 — 단일 렌더 */}
      <section className="flex flex-col gap-base">
        <div className="flex flex-wrap items-baseline gap-base">
          <h2 className={cn(typo.titleLg, "text-ink")}>변경 없음</h2>
          <span className={cn(typo.caption, "text-muted")}>
            ScheduleCard · FeatureCard
          </span>
        </div>
        <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
          <ScheduleCard name="주일 1부 예배" time="오전 09:00" place="본당" />
          <FeatureCard
            title="처음 오셨나요?"
            description="새가족 등록과 안내를 도와드립니다."
          />
        </div>
      </section>
      <BehaviorShowcase />
    </main>
  );
}
