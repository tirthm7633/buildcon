"use client";

import { useMemo, useState } from "react";
import { Download, Search, Users } from "lucide-react";

import { CUSTOMER_TIERS } from "@/lib/constants";
import { EmptyState } from "@/components/shared/empty-state";
import { CustomerCard } from "@/components/customers/customer-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Customer } from "@/lib/supabase/types";

function toCsv(rows: Customer[]) {
  const header = ["Name", "Phone", "Email", "Company", "Tier", "Address", "GSTIN", "Added"];
  const tierLabel = Object.fromEntries(CUSTOMER_TIERS.map((t) => [t.value, t.label]));
  const lines = rows.map((r) =>
    [
      r.name,
      r.phone,
      r.email ?? "",
      r.company_name ?? "",
      tierLabel[r.tier] ?? r.tier,
      r.address ?? "",
      r.gstin ?? "",
      r.created_at.slice(0, 10),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function CustomersList({ customers }: { customers: Customer[] }) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");

  const counts = useMemo(() => {
    const byTier: Record<string, number> = { all: customers.length };
    for (const tier of CUSTOMER_TIERS) byTier[tier.value] = 0;
    for (const c of customers) byTier[c.tier] = (byTier[c.tier] ?? 0) + 1;
    return byTier;
  }, [customers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (tierFilter !== "all" && c.tier !== tierFilter) return false;
      if (
        q &&
        !(
          (c.name ?? "").toLowerCase().includes(q) ||
          (c.phone ?? "").includes(q) ||
          (c.company_name ?? "").toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [customers, search, tierFilter]);

  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "customers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!customers.length) {
    return <EmptyState icon={Users} title="No customers yet" description="Convert a walk-in or add a customer directly." />;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tierFilter} onValueChange={setTierFilter}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            {CUSTOMER_TIERS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label} ({counts[t.value] ?? 0})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or company…"
          className="pl-8"
        />
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">No customers match these filters.</p>
      )}
    </div>
  );
}
