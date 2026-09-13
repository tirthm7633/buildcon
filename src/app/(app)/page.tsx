import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { getCurrentProfile } from "@/lib/auth";
import { getActiveFloorId } from "@/lib/floor-context";
import { getFloorConfig } from "@/lib/floors";
import { disabledKeysForRole, getRolePermissions } from "@/lib/permissions";
import { getTodayDashboardData } from "@/lib/queries/today";
import { getFollowUpEntityHref } from "@/lib/follow-up-links";
import { findLabel, FOLLOW_UP_TYPES } from "@/lib/constants";
import { formatDateTime, formatINRCompact } from "@/lib/format";
import { filterNavItemsByDisabledKeys, getNavItems } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { TodaySummaryPanel } from "@/components/today/today-summary-panel";

export default async function TodayPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const floorId = await getActiveFloorId();
  const floor = getFloorConfig(floorId);

  // Every other page redirects home when it's disabled — Today can't do
  // that to itself, so when Today is unavailable (module off, or toggled
  // off for this role) it hands off to the first page that IS available,
  // falling back to a plain empty state if nothing is.
  const disabledKeys =
    profile.role === "owner" ? [] : disabledKeysForRole(floor, profile.role, await getRolePermissions(floorId, profile.role));

  if (!floor.modules.today || disabledKeys.includes("page.today")) {
    const nextItem = filterNavItemsByDisabledKeys(getNavItems(floor), disabledKeys)[0];
    if (nextItem) redirect(nextItem.href);

    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
        <CheckCircle2 className="size-8 text-muted-foreground/60" strokeWidth={1.25} />
        <p className="font-heading text-lg text-foreground">Nothing available yet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Every page on this floor is currently switched off for your role. Ask an owner or head to enable one from
          Settings.
        </p>
      </div>
    );
  }

  const data = await getTodayDashboardData(floorId, profile);
  const upNext = data.followUps[0];

  const now = new Date();
  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  const hour = Number(
    new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(now)
  );
  const greetingWord = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const firstName = profile.full_name.split(" ")[0];

  const summaryLine =
    data.followUps.length > 0
      ? `${data.followUps.length} follow-up${data.followUps.length === 1 ? "" : "s"} need${
          data.followUps.length === 1 ? "s" : ""
        } you · ${formatINRCompact(data.totalValueAtStake)} at stake · about ${data.totalMinutes} minutes.`
      : "Nothing is waiting on you. Enjoy the quiet.";

  return (
    <div className="grid grid-cols-1 gap-10 xl:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        <div>
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">{dateLabel}</p>
          <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight text-foreground">
            Good {greetingWord}, {firstName}.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] text-muted-foreground">{summaryLine}</p>

          {upNext ? (
            <Button asChild size="lg" className="mt-6">
              <Link href={getFollowUpEntityHref(upNext.entity_type, upNext.entity_id)}>
                Start with No. 1
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : null}
        </div>

        {upNext ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Up next</p>
            <Link
              href={getFollowUpEntityHref(upNext.entity_type, upNext.entity_id)}
              className="block rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-heading text-lg font-medium text-foreground">{upNext.entityLabel}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {findLabel(FOLLOW_UP_TYPES, upNext.type)} · due {formatDateTime(upNext.due_at)}
                  </p>
                  {upNext.notes ? <p className="mt-2 text-sm text-foreground/80">{upNext.notes}</p> : null}
                </div>
                {upNext.value > 0 ? (
                  <span className="shrink-0 text-sm font-medium text-primary">{formatINRCompact(upNext.value)}</span>
                ) : null}
              </div>
            </Link>
            <Link href="/follow-ups" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              All follow-ups
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
            <CheckCircle2 className="size-8 text-muted-foreground/60" strokeWidth={1.25} />
            <p className="font-heading text-lg text-foreground">All clear. No follow-ups waiting.</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              New tasks appear here as quotations age, payments come due, and customers go quiet.
            </p>
          </div>
        )}
      </div>

      <TodaySummaryPanel stats={data.stats} pipeline={data.pipeline} />
    </div>
  );
}
