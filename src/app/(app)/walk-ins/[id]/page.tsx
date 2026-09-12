import Link from "next/link";
import { notFound } from "next/navigation";

import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { findBadgeClass, findLabel, WALKIN_SOURCES, WALKIN_STATUSES } from "@/lib/constants";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WalkInForm } from "@/components/walk-ins/walk-in-form";
import { WalkInQuickActions } from "@/components/walk-ins/walk-in-quick-actions";

export default async function WalkInDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { floor } = await requireFloor();
  const supabase = await createClient();

  const { data: walkIn } = await supabase.from("walk_ins").select("*").eq("id", id).eq("floor_id", floor.id).single();
  if (!walkIn) notFound();

  const [{ data: staff }, { data: activities }, { data: followUps }, { data: quotations }] = await Promise.all([
    supabase.from("profiles").select("*").eq("is_active", true).order("full_name"),
    supabase
      .from("activities")
      .select("id, action, meta, created_at, profiles(full_name)")
      .eq("entity_type", "walk_in")
      .eq("entity_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("follow_ups").select("*").eq("entity_type", "walk_in").eq("entity_id", id).order("due_at"),
    walkIn.customer_id
      ? supabase.from("quotations").select("id, quotation_number, status, total").eq("customer_id", walkIn.customer_id)
      : Promise.resolve({ data: [] }),
  ]);

  const staffList = staff ?? [];
  const assignedProfile = staffList.find((s) => s.id === walkIn.assigned_to) ?? null;

  const timelineEntries = (activities ?? []).map((a) => ({
    id: a.id,
    action: a.action,
    meta: a.meta,
    created_at: a.created_at,
    actorName: (a as unknown as { profiles: { full_name: string } | null }).profiles?.full_name ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={walkIn.name}
        description={walkIn.company_name ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
              label={findLabel(WALKIN_STATUSES, walkIn.status)}
              className={findBadgeClass(WALKIN_STATUSES, walkIn.status)}
            />
            <WalkInForm
              walkIn={walkIn}
              floorId={floor.id}
              staff={staffList}
              trigger={<Button variant="outline">Edit</Button>}
            />
          </div>
        }
      />

      <WalkInQuickActions walkIn={walkIn} floorId={floor.id} staff={staffList} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline entries={timelineEntries} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{walkIn.phone}</span>
              </div>
              {walkIn.whatsapp ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">WhatsApp</span>
                  <span>{walkIn.whatsapp}</span>
                </div>
              ) : null}
              {walkIn.email ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="truncate">{walkIn.email}</span>
                </div>
              ) : null}
              {walkIn.address ? (
                <div className="flex justify-between gap-4">
                  <span className="shrink-0 text-muted-foreground">Address</span>
                  <span className="text-right">{walkIn.address}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source</span>
                <span>{findLabel(WALKIN_SOURCES, walkIn.source)}</span>
              </div>
              {walkIn.category ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Interested in</span>
                  <span>{walkIn.category}</span>
                </div>
              ) : null}
              {walkIn.budget_estimate ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget</span>
                  <span>{formatINR(walkIn.budget_estimate)}</span>
                </div>
              ) : null}
              {walkIn.expected_purchase_date ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected purchase</span>
                  <span>{formatDate(walkIn.expected_purchase_date)}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sales executive</span>
                <span>{assignedProfile?.full_name ?? "Unassigned"}</span>
              </div>
              {walkIn.requirements ? (
                <div className="pt-2">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Requirements
                  </p>
                  <p className="text-foreground/80">{walkIn.requirements}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {followUps && followUps.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Follow-ups</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {followUps.map((f) => (
                  <div key={f.id} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{formatDateTime(f.due_at)}</span>
                    <StatusBadge
                      label={f.status}
                      className={
                        f.status === "completed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {quotations && quotations.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quotations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quotations.map((q) => (
                  <Link key={q.id} href={`/quotations/${q.id}`} className="flex items-center justify-between text-sm hover:underline">
                    <span>{q.quotation_number}</span>
                    <span className="text-muted-foreground">{formatINR(q.total)}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
