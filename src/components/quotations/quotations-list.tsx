"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface QuotationListRow {
  id: string;
  quotation_number: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  total: number;
  statusLabel: string;
  statusClass: string;
  issueDateLabel: string;
}

export function QuotationsList({ rows }: { rows: QuotationListRow[] }) {
  const router = useRouter();
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
        <div className="rounded-lg border border-border">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="w-[18%] p-3 sm:w-[15%]">No.</th>
                <th className="w-[32%] p-3 sm:w-[22%]">Customer</th>
                <th className="hidden p-3 lg:table-cell lg:w-[15%]">Phone</th>
                <th className="w-[26%] p-3 sm:w-[18%]">Status</th>
                <th className="w-[24%] p-3 text-right sm:w-[15%]">Amount</th>
                <th className="hidden p-3 lg:table-cell lg:w-[15%]">Date</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={0}
                  role="link"
                  onClick={() => router.push(`/quotations/${row.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/quotations/${row.id}`);
                    }
                  }}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none"
                >
                  <td className="truncate p-3 font-mono text-xs font-medium text-foreground">{row.quotation_number}</td>
                  <td className="truncate p-3 text-foreground">{row.customer_name || "—"}</td>
                  <td className="hidden p-3 text-muted-foreground lg:table-cell">{row.customer_phone || "—"}</td>
                  <td className="p-3">
                    <StatusBadge label={row.statusLabel} className={cn(row.statusClass, "h-auto w-fit max-w-full whitespace-normal text-center leading-tight")} />
                  </td>
                  <td className="p-3 text-right font-medium tabular-nums text-foreground">{formatINR(row.total)}</td>
                  <td className="hidden p-3 text-muted-foreground lg:table-cell">{row.issueDateLabel}</td>
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
