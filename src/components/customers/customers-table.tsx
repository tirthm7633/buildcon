"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Download, Users } from "lucide-react";
import { toast } from "sonner";

import { archiveCustomer } from "@/lib/actions/customers";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { getCustomerColumns } from "@/components/customers/customer-columns";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/lib/supabase/types";

function toCsv(rows: Customer[]) {
  const header = ["Name", "Phone", "Email", "Company", "Address", "GSTIN", "Added"];
  const lines = rows.map((r) =>
    [r.name, r.phone, r.email ?? "", r.company_name ?? "", r.address ?? "", r.gstin ?? "", r.created_at.slice(0, 10)]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

export function CustomersTable({ customers }: { customers: Customer[] }) {
  const router = useRouter();

  function startArchive(row: Customer) {
    archiveCustomer(row.id, !row.is_archived).then((result) => {
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(row.is_archived ? "Customer restored" : "Customer archived");
      router.refresh();
    });
  }

  const columns = useMemo(() => getCustomerColumns({ onArchive: startArchive }), []); // eslint-disable-line react-hooks/exhaustive-deps

  function exportCsv() {
    const blob = new Blob([toCsv(customers)], { type: "text/csv;charset=utf-8;" });
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
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </div>
      <DataTable columns={columns} data={customers} searchPlaceholder="Search by name, phone, email…" />
    </div>
  );
}
