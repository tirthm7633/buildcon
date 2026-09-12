"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown } from "lucide-react";

import { setActiveFloor } from "@/lib/actions/floor";
import { FLOORS } from "@/lib/floors";
import type { FloorId } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function FloorSwitcher({
  activeFloorId,
  accessibleFloorIds,
  collapsed = false,
}: {
  activeFloorId: FloorId;
  accessibleFloorIds: FloorId[];
  collapsed?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const active = FLOORS.find((f) => f.id === activeFloorId) ?? FLOORS[0];
  const options = FLOORS.filter((f) => accessibleFloorIds.includes(f.id));

  function selectFloor(id: FloorId) {
    if (id === activeFloorId) return;
    startTransition(async () => {
      const result = await setActiveFloor(id);
      if (!result.error) {
        router.push("/");
        router.refresh();
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-2.5 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent disabled:opacity-60",
          collapsed && "justify-center px-0"
        )}
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-semibold text-primary">
          {active.shortLabel.slice(0, 1)}
        </span>
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 truncate font-medium text-sidebar-foreground">{active.shortLabel}</span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {options.map((floor) => (
          <DropdownMenuItem key={floor.id} onSelect={() => selectFloor(floor.id)} className="justify-between">
            <span>{floor.name}</span>
            {floor.id === activeFloorId ? <Check className="size-4" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
