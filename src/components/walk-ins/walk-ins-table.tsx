"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Footprints } from "lucide-react";
import { toast } from "sonner";

import { deleteWalkIn } from "@/lib/actions/walk-ins";
import { WALKIN_SOURCES, WALKIN_STATUSES, findLabel } from "@/lib/constants";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { getWalkInColumns, type WalkInRow } from "@/components/walk-ins/walk-in-columns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function toCsv(rows: WalkInRow[]) {
  const header = ["Name", "Phone", "WhatsApp", "Email", "Source", "Status", "Assigned to", "Budget", "Added"];
  const lines = rows.map((r) =>
    [
      r.name,
      r.phone,
      r.whatsapp ?? "",
      r.email ?? "",
      findLabel(WALKIN_SOURCES, r.source),
      findLabel(WALKIN_STATUSES, r.status),
      r.assignedProfile?.full_name ?? "",
      r.budget_estimate ?? "",
      r.created_at.slice(0, 10),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function WalkInsTable({ walkIns, walkInLabel }: { walkIns: WalkInRow[]; walkInLabel: string }) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<WalkInRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const columns = useMemo(() => getWalkInColumns({ onDelete: setPendingDelete }), []);

  const filtered = walkIns.filter(
    (w) => (statusFilter === "all" || w.status === statusFilter) && (sourceFilter === "all" || w.source === sourceFilter)
  );

  async function confirmDelete() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    const result = await deleteWalkIn(pendingDelete.id);
    setIsDeleting(false);
    setPendingDelete(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Walk-in deleted");
    router.refresh();
  }

  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${walkInLabel.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
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
        <Button variant="outline" size="sm" className="ml-auto" onClick={exportCsv}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>

      <DataTable columns={columns} data={filtered} searchPlaceholder="Search by name, phone, email…" />

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
