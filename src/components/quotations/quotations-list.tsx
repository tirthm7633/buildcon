"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface QuotationListRow {
  id: string;
  quotation_number: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  statusLabel: string;
  statusClass: string;
  issueDateLabel: string;
}

export function QuotationsList({ rows }: { rows: QuotationListRow[] }) {
  const [tab, setTab] = useState<"selections" | "quotations">("selections");

  const selections = useMemo(() => rows.filter((r) => r.status === "draft"), [rows]);
  const quotations = useMemo(() => rows.filter((r) => r.status !== "draft"), [rows]);
  const shown = tab === "selections" ? selections : quotations;

  if (!rows.length) {
    return <EmptyState icon={FileText} title="No selections yet" description="Start a new selection to shortlist products for a customer." />;
  }

  return (
    <div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-5">
        <TabsList>
          <TabsTrigger value="selections">Selections ({selections.length})</TabsTrigger>
          <TabsTrigger value="quotations">Quotations ({quotations.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {shown.length ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="p-3">No.</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Status</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <Link href={`/quotations/${row.id}`} className="font-mono text-xs font-medium text-foreground hover:underline">
                      {row.quotation_number}
                    </Link>
                  </td>
                  <td className="p-3 text-foreground">{row.customer_name || "—"}</td>
                  <td className="p-3 text-muted-foreground">{row.customer_phone || "—"}</td>
                  <td className="p-3">
                    <StatusBadge label={row.statusLabel} className={row.statusClass} />
                  </td>
                  <td className="p-3 text-muted-foreground">{row.issueDateLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">
          {tab === "selections" ? "No selections in progress." : "No approved quotations yet."}
        </p>
      )}
    </div>
  );
}
