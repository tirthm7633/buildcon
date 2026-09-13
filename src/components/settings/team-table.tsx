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
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="p-3">Staff</th>
            <th className="p-3">Role</th>
            <th className="p-3">Floor access</th>
            <th className="p-3">Active</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => (
            <tr key={member.id} className="border-b border-border last:border-0 align-top">
              <td className="p-3">
                <Link href={`/team/${member.id}`} className="flex items-center gap-2.5 hover:underline">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                      {initials(member.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{member.full_name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </Link>
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
              </td>
              <td className="p-3">
                <Switch
                  checked={member.is_active}
                  disabled={isPending || member.id === currentUserId}
                  onCheckedChange={(checked) => toggleActive(member.id, checked)}
                />
              </td>
              <td className="p-3 text-right">
                <Link
                  href={`/team/${member.id}`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Manage access
                  <ChevronRight className="size-3.5" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
