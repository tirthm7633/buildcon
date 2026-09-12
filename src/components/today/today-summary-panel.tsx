import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { findBadgeClass, findLabel, QUOTATION_STATUSES } from "@/lib/constants";
import { formatINRCompact } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";

interface PipelineQuotation {
  id: string;
  quotation_number: string;
  status: string;
  total: number;
  customers: { name: string } | { name: string }[] | null;
}

function customerName(row: PipelineQuotation) {
  if (!row.customers) return "Unknown";
  return Array.isArray(row.customers) ? row.customers[0]?.name ?? "Unknown" : row.customers.name;
}

export function TodaySummaryPanel({
  stats,
  pipeline,
}: {
  stats: {
    collectedThisMonth: number;
    paymentsReceivedCount: number;
    outstandingAmount: number;
    overdueOrders: number;
    openPipelineValue: number;
    quotationsThisMonth: number;
    wonThisMonth: number;
    awaitingApproval: number;
  };
  pipeline: PipelineQuotation[];
}) {
  const rows = [
    { label: "Collected this month", value: formatINRCompact(stats.collectedThisMonth) },
    { label: "Payments received", value: String(stats.paymentsReceivedCount) },
    { label: "Outstanding amount", value: formatINRCompact(stats.outstandingAmount) },
    { label: "Overdue orders", value: String(stats.overdueOrders) },
    { label: "Open pipeline", value: formatINRCompact(stats.openPipelineValue) },
    { label: "Quotations this month", value: String(stats.quotationsThisMonth) },
    { label: "Won this month", value: String(stats.wonThisMonth) },
  ];

  return (
    <aside className="space-y-6 border-l border-border pl-8">
      <div>
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">This floor</p>
        <dl className="mt-4 space-y-3.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-3">
              <dt className="text-sm text-muted-foreground">{row.label}</dt>
              <dd className="text-sm font-medium text-foreground tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {stats.awaitingApproval > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-accent bg-accent/40 p-3 text-sm text-accent-foreground">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>
            {stats.awaitingApproval} quotation{stats.awaitingApproval === 1 ? "" : "s"} waiting for approval
          </span>
        </div>
      ) : null}

      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Pipeline</p>
          <Link href="/quotations" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <ul className="mt-3 space-y-3">
          {pipeline.length ? (
            pipeline.map((q) => (
              <li key={q.id}>
                <Link href={`/quotations/${q.id}`} className="block">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{customerName(q)}</span>
                    <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{formatINRCompact(q.total)}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="truncate text-xs text-muted-foreground">{q.quotation_number}</span>
                    <StatusBadge
                      label={findLabel(QUOTATION_STATUSES, q.status)}
                      className={`${findBadgeClass(QUOTATION_STATUSES, q.status)} text-[10px]`}
                    />
                  </div>
                </Link>
              </li>
            ))
          ) : (
            <li className="text-sm text-muted-foreground">No quotations yet.</li>
          )}
        </ul>
      </div>
    </aside>
  );
}
