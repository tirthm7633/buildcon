"use client";

import Link from "next/link";
import { createColumnHelper } from "@tanstack/react-table";
import { MessageCircle, MoreHorizontal, Phone } from "lucide-react";

import type { AppTableFeatures } from "@/lib/table-features";
import type { Profile, WalkIn } from "@/lib/supabase/types";
import { findBadgeClass, findLabel, WALKIN_SOURCES, WALKIN_STATUSES } from "@/lib/constants";
import { formatDate, formatINR } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface WalkInRow extends WalkIn {
  assignedProfile: Profile | null;
}

const helper = createColumnHelper<AppTableFeatures, WalkInRow>();

export function getWalkInColumns({ onDelete }: { onDelete: (row: WalkInRow) => void }) {
  return [
    helper.accessor("name", {
      header: "Visitor",
      cell: (info) => {
        const row = info.row.original;
        return (
          <Link href={`/walk-ins/${row.id}`} className="block">
            <p className="font-medium text-foreground hover:underline">{row.name}</p>
            {row.company_name ? <p className="text-xs text-muted-foreground">{row.company_name}</p> : null}
          </Link>
        );
      },
    }),
    helper.display({
      id: "contact",
      header: "Contact",
      cell: (info) => (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{info.row.original.phone}</span>
          <a
            href={`tel:${info.row.original.phone}`}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Call"
          >
            <Phone className="size-3.5" />
          </a>
          <a
            href={`https://wa.me/${(info.row.original.whatsapp || info.row.original.phone).replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-emerald-600"
            title="WhatsApp"
          >
            <MessageCircle className="size-3.5" />
          </a>
        </div>
      ),
    }),
    helper.accessor("source", {
      header: "Source",
      cell: (info) => findLabel(WALKIN_SOURCES, info.getValue()),
    }),
    helper.accessor("status", {
      header: "Status",
      sortFn: "text",
      cell: (info) => (
        <StatusBadge
          label={findLabel(WALKIN_STATUSES, info.getValue())}
          className={findBadgeClass(WALKIN_STATUSES, info.getValue())}
        />
      ),
    }),
    helper.accessor((row) => row.assignedProfile?.full_name ?? "—", {
      id: "assigned",
      header: "Sales executive",
    }),
    helper.accessor("budget_estimate", {
      header: "Budget",
      cell: (info) => (info.getValue() ? formatINR(info.getValue()) : "—"),
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
              <Link href={`/walk-ins/${info.row.original.id}`}>View details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(info.row.original)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ];
}
