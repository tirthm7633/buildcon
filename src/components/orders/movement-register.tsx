"use client";

import { useMemo, useState } from "react";
import { Search, History } from "lucide-react";

import { formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";

export interface MovementRow {
  id: string;
  timestamp: string;
  customerName: string;
  itemLabel: string;
  movement: string;
  qty: number;
  from: string;
  to: string;
  reference: string;
  user: string;
}

export function MovementRegister({ rows }: { rows: MovementRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.customerName, r.itemLabel, r.movement, r.reference, r.user].some((v) => v.toLowerCase().includes(q))
    );
  }, [rows, search]);

  if (!rows.length) {
    return <EmptyState icon={History} title="No movements yet" description="Every release and dispatch will be logged here." />;
  }

  return (
    <div>
      <div className="relative mb-5 max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer, tile, movement, or reference…"
          className="pl-8"
        />
      </div>

      {filtered.length ? (
        <div className="divide-y divide-border rounded-lg border border-border">
          {filtered.map((row) => (
            <div key={row.id} className="flex flex-col gap-1 p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{row.movement}</p>
                <p className="shrink-0 text-sm font-medium tabular-nums text-foreground">{row.qty} boxes</p>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {row.customerName} — {row.itemLabel}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {row.from} → {row.to}
                </span>
                {row.reference !== "—" ? <span>Ref: {row.reference}</span> : null}
                <span>{row.user}</span>
                <span>{formatDateTime(row.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">No movements match this search.</p>
      )}
    </div>
  );
}
