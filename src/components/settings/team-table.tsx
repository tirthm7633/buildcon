"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setStaffActive, setStaffFloorAccess, updateStaffRole } from "@/lib/actions/settings";
import { USER_ROLES } from "@/lib/constants";
import { initials } from "@/lib/format";
import { FLOORS } from "@/lib/floors";
import type { FloorId, Profile, UserRole } from "@/lib/supabase/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export interface StaffRow extends Profile {
  floorIds: FloorId[];
}

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

  function toggleFloor(userId: string, current: FloorId[], floorId: FloorId, checked: boolean) {
    const next = checked ? [...current, floorId] : current.filter((f) => f !== floorId);
    startTransition(async () => {
      const result = await setStaffFloorAccess(userId, next);
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
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="p-3">Staff</th>
            <th className="p-3">Role</th>
            <th className="p-3">Floor access</th>
            <th className="p-3">Active</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.id} className="border-b border-border last:border-0 align-top">
              <td className="p-3">
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                      {initials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
              </td>
              <td className="p-3">
                {member.role === "owner" ? (
                  <Badge variant="outline">Owner</Badge>
                ) : (
                  <Select
                    value={member.role}
                    onValueChange={(v) => changeRole(member.id, v as UserRole)}
                    disabled={isPending}
                  >
                    <SelectTrigger className="h-8 w-44 text-xs">
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
              </td>
              <td className="p-3">
                {member.role === "owner" ? (
                  <span className="text-xs text-muted-foreground">All floors</span>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {FLOORS.map((floor) => (
                      <label key={floor.id} className="flex items-center gap-1.5 text-xs">
                        <Checkbox
                          checked={member.floorIds.includes(floor.id)}
                          disabled={isPending}
                          onCheckedChange={(checked) => toggleFloor(member.id, member.floorIds, floor.id, !!checked)}
                        />
                        {floor.shortLabel}
                      </label>
                    ))}
                  </div>
                )}
              </td>
              <td className="p-3">
                <Switch
                  checked={member.is_active}
                  disabled={isPending || member.id === currentUserId}
                  onCheckedChange={(checked) => toggleActive(member.id, checked)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
