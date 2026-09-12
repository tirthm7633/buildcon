"use client";

import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

import type { AppTableFeatures } from "@/lib/table-features";
import type { Customer } from "@/lib/supabase/types";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const helper = createColumnHelper<AppTableFeatures, Customer>();

export function getCustomerColumns({ onArchive }: { onArchive: (row: Customer) => void }) {
  return [
    helper.accessor("name", {
      header: "Customer",
      cell: (info) => {
        const row = info.row.original;
        return (
          <Link href={`/customers/${row.id}`} className="block">
            <p className="font-medium text-foreground hover:underline">{row.name}</p>
            {row.company_name ? <p className="text-xs text-muted-foreground">{row.company_name}</p> : null}
          </Link>
        );
      },
    }),
    helper.accessor("phone", {
      header: "Phone",
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    }),
    helper.accessor((row) => row.email ?? "—", {
      id: "email",
      header: "Email",
    }),
    helper.accessor((row) => row.delivery_location ?? row.address ?? "—", {
      id: "location",
      header: "Location",
    }),
    helper.accessor("is_archived", {
      header: "Status",
      cell: (info) =>
        info.getValue() ? (
          <Badge variant="outline" className="border-border text-muted-foreground">
            Archived
          </Badge>
        ) : (
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
            Active
          </Badge>
        ),
    }),
    helper.accessor("created_at", {
      header: "Added",
      sortFn: "datetime",
      cell: (info) => formatDate(info.getValue()),
    }),
    helper.display({
      id: "actions",
      header: "",
      cell: (info) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/customers/${info.row.original.id}`}>View details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onArchive(info.row.original)}>
              {info.row.original.is_archived ? "Unarchive" : "Archive"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ];
}
