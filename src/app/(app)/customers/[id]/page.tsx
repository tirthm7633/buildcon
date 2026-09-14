import Link from "next/link";
import { notFound } from "next/navigation";

import { canManageCustomerTier } from "@/lib/auth";
import { requirePageAccess } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { CUSTOMER_TIERS, findBadgeClass, findLabel, QUOTATION_STATUSES } from "@/lib/constants";
import { formatDate, formatINR } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/customers/customer-form";
import { CustomerQuickActions } from "@/components/customers/customer-quick-actions";
import { FileText, IndianRupee, Package, Wallet } from "lucide-react";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile, floor } = await requireFloor((f) => f.modules.customers);
  await requirePageAccess(floor, profile, "page.customers");

  const supabase = await createClient();

  const { data: customer } = await supabase.from("customers").select("*").eq("id", id).eq("floor_id", floor.id).single();
  if (!customer) notFound();

  const [{ data: walkIns }, { data: quotations }, { data: orders }, { data: payments }, { data: activities }, canEditTier] =
    await Promise.all([
      supabase.from("walk_ins").select("id, name, status, created_at").eq("customer_id", id),
      supabase.from("quotations").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
      floor.modules.tileOrders
        ? supabase.from("tile_orders").select("*").eq("customer_id", id).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from("payments").select("*").eq("customer_id", id).order("payment_date", { ascending: false }),
      supabase
        .from("activities")
        .select("id, action, meta, created_at, profiles(full_name)")
        .eq("entity_type", "customer")
        .eq("entity_id", id)
        .order("created_at", { ascending: false }),
      canManageCustomerTier(floor.id),
    ]);

  const totalQuoted = (quotations ?? []).reduce((sum, q) => sum + Number(q.total), 0);
  const totalAccepted = (quotations ?? []).filter((q) => q.status === "accepted").reduce((sum, q) => sum + Number(q.total), 0);
  const totalPaid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const outstanding = Math.max(totalAccepted - totalPaid, 0);

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
        title={customer.name}
        description={customer.company_name ?? customer.phone}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
              label={findLabel(CUSTOMER_TIERS, customer.tier)}
              className={findBadgeClass(CUSTOMER_TIERS, customer.tier)}
            />
            <CustomerForm
              customer={customer}
              canEditTier={canEditTier}
              trigger={<Button variant="outline">Edit</Button>}
            />
          </div>
        }
      />

      <CustomerQuickActions customer={customer} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total quoted" value={formatINR(totalQuoted)} icon={FileText} />
        <StatCard label="Accepted value" value={formatINR(totalAccepted)} icon={Package} accent="accent" />
        <StatCard label="Paid to date" value={formatINR(totalPaid)} icon={IndianRupee} />
        <StatCard label="Outstanding" value={formatINR(outstanding)} icon={Wallet} accent={outstanding > 0 ? "accent" : "default"} />
      </div>

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
                <span>{customer.phone}</span>
              </div>
              {customer.whatsapp ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">WhatsApp</span>
                  <span>{customer.whatsapp}</span>
                </div>
              ) : null}
              {customer.email ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="truncate">{customer.email}</span>
                </div>
              ) : null}
              {customer.address ? (
                <div className="flex justify-between gap-4">
                  <span className="shrink-0 text-muted-foreground">Address</span>
                  <span className="text-right">{customer.address}</span>
                </div>
              ) : null}
              {customer.delivery_location ? (
                <div className="flex justify-between gap-4">
                  <span className="shrink-0 text-muted-foreground">Delivery</span>
                  <span className="text-right">{customer.delivery_location}</span>
                </div>
              ) : null}
              {customer.gstin ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GSTIN</span>
                  <span>{customer.gstin}</span>
                </div>
              ) : null}
              {customer.notes ? (
                <div className="pt-2">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="text-foreground/80">{customer.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {quotations && quotations.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quotations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quotations.map((q) => (
                  <Link key={q.id} href={`/quotations/${q.id}`} className="flex items-center justify-between text-sm">
                    <span className="hover:underline">{q.quotation_number}</span>
                    <StatusBadge
                      label={findLabel(QUOTATION_STATUSES, q.status)}
                      className={findBadgeClass(QUOTATION_STATUSES, q.status)}
                    />
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {orders && orders.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Orders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {orders.map((o) => (
                  <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between text-sm hover:underline">
                    <span>{o.order_number}</span>
                    <span className="text-muted-foreground">{formatINR(o.order_value)}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {payments && payments.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{formatDate(p.payment_date)}</span>
                    <span className="font-medium">{formatINR(p.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {walkIns && walkIns.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Linked walk-ins</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {walkIns.map((w) => (
                  <Link key={w.id} href={`/walk-ins/${w.id}`} className="flex items-center justify-between text-sm hover:underline">
                    <span>{w.name}</span>
                    <span className="text-muted-foreground">{formatDate(w.created_at)}</span>
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
