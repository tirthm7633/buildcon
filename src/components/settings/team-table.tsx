"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";

import { setStaffActive, updateStaffRole } from "@/lib/actions/settings";
import { USER_ROLES } from "@/lib/constants";
import { initials } from "@/lib/format";
import { FLOORS } from "@/lib/floors";
import type { FloorId, Profile, UserRole } from "@/lib/supabase/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export interface StaffRow extends Profile {
  floorIds: FloorId[];
}

const FLOOR_LABEL: Record<FloorId, string> = Object.fromEntries(FLOORS.map((f) => [f.id, f.shortLabel])) as Record<
  FloorId,
  string
>;

export function TeamTable({ staff, currentUserId }: { staff: StaffRow[]; currentUserId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeRole(userId: string, role: UserRole) {
    startTransition(async () => {
      const result = await updateStaffRole(userId, role);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function toggleActive(userId: string, active: boolean) {
    startTransition(async () => {
      const result = await setStaffActive(userId, active);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {staff.map((member) => (
        <div key={member.id} className="flex flex-col gap-3 p-3">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/team/${member.id}`} className="flex min-w-0 items-center gap-2.5 hover:underline">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                  {initials(member.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{member.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
              </div>
            </Link>
            <Link
              href={`/team/${member.id}`}
              className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Manage
              <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {member.role === "owner" ? (
              <Badge variant="outline">Owner</Badge>
            ) : (
              <Select value={member.role} onValueChange={(v) => changeRole(member.id, v as UserRole)} disabled={isPending}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.filter((r) => r.value !== "owner").map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {member.role === "owner" ? (
              <span className="text-xs text-muted-foreground">All floors</span>
            ) : member.floorIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {member.floorIds.map((id) => (
                  <Badge key={id} variant="outline" className="text-xs font-normal">
                    {FLOOR_LABEL[id]}
                  </Badge>
                ))}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">No floors yet</span>
            )}

            <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              Active
              <Switch
                checked={member.is_active}
                disabled={isPending || member.id === currentUserId}
                onCheckedChange={(checked) => toggleActive(member.id, checked)}
              />
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
