"use client";

import { useMemo, useState } from "react";
import { Download, Footprints, Search } from "lucide-react";
import { toast } from "sonner";

import { WALKIN_SOURCES, WALKIN_STATUSES, findLabel } from "@/lib/constants";
import { EmptyState } from "@/components/shared/empty-state";
import { WalkInCard, type WalkInCardData } from "@/components/walk-ins/walk-in-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * A real .xlsx, not CSV — CSV has no cell types or column widths at all, so
 * Excel guesses: it reads a 10-digit phone as a number and mangles it into
 * scientific notation, and a date column has no way to say "make this wide
 * enough to read" (Excel prints "####" instead of resizing itself). Phone
 * gets an explicit text format so it's never treated as a number; the date
 * column gets a real date cell, a short format, and a fixed width.
 */
async function exportXlsx(rows: WalkInCardData[], walkInLabel: string) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(walkInLabel || "Walk-ins");

  sheet.columns = [
    { header: "Walk-in ID", key: "walk_in_number", width: 12 },
    { header: "Name", key: "name", width: 24 },
    { header: "Phone", key: "phone", width: 15 },
    { header: "Email", key: "email", width: 26 },
    { header: "Source", key: "source", width: 14 },
    { header: "Status", key: "status", width: 18 },
    { header: "Made by", key: "made_by", width: 18 },
    { header: "Added", key: "added", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const r of rows) {
    const row = sheet.addRow({
      walk_in_number: r.walk_in_number,
      name: r.name,
      phone: r.phone,
      email: r.email ?? "",
      source: findLabel(WALKIN_SOURCES, r.source),
      status: findLabel(WALKIN_STATUSES, r.status),
      made_by: r.createdByProfile?.full_name ?? "",
      added: new Date(r.created_at),
    });
    row.getCell("phone").numFmt = "@";
    row.getCell("added").numFmt = "dd mmm yyyy";
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${walkInLabel.toLowerCase().replace(/\s+/g, "-")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function WalkInsList({ walkIns, walkInLabel }: { walkIns: WalkInCardData[]; walkInLabel: string }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return walkIns.filter((w) => {
      if (statusFilter !== "all" && w.status !== statusFilter) return false;
      if (sourceFilter !== "all" && w.source !== sourceFilter) return false;
      if (
        q &&
        !(
          (w.name ?? "").toLowerCase().includes(q) ||
          (w.phone ?? "").includes(q) ||
          (w.walk_in_number ?? "").toLowerCase().includes(q)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [walkIns, search, statusFilter, sourceFilter]);

  async function handleExport() {
    try {
      await exportXlsx(filtered, walkInLabel);
    } catch {
      toast.error("Couldn't build the export file");
    }
  }

  if (!walkIns.length) {
    return (
      <EmptyState
        icon={Footprints}
        title={`No ${walkInLabel.toLowerCase()} yet`}
        description="New showroom visits and enquiries will show up here."
      />
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or ID…"
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {WALKIN_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {WALKIN_SOURCES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="ml-auto" onClick={handleExport}>
          <Download className="size-4" />
          Export Excel
        </Button>
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((walkIn) => (
            <WalkInCard key={walkIn.id} walkIn={walkIn} />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">No walk-ins match these filters.</p>
      )}
    </div>
  );
}
