"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setStaffPagePermission, setWalkInsDataScope } from "@/lib/actions/permissions";
import { STAFF_PAGE_PERMISSIONS } from "@/lib/constants";
import type { FloorId, PagePermissionKey } from "@/lib/supabase/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export function StaffPermissionsPanel({
  floorId,
  floorName,
  pagePermissions,
  walkInsDataScope,
}: {
  floorId: FloorId;
  floorName: string;
  pagePermissions: Record<PagePermissionKey, boolean>;
  walkInsDataScope: "all" | "own";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function togglePage(key: PagePermissionKey, enabled: boolean) {
    startTransition(async () => {
      const result = await setStaffPagePermission({ floorId, key, enabled });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function changeDataScope(scope: "all" | "own") {
    startTransition(async () => {
      const result = await setWalkInsDataScope({ floorId, scope });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(scope === "all" ? "Staff can now see all walk-ins" : "Staff now see only their own walk-ins");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Staff permissions</CardTitle>
        <CardDescription>What staff can access on the {floorName} floor.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {STAFF_PAGE_PERMISSIONS.map(({ key, label, description }) => (
          <div key={key}>
            <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
              <Switch
                checked={pagePermissions[key]}
                disabled={isPending}
                onCheckedChange={(checked) => togglePage(key, checked)}
                aria-label={`Staff access to ${label}`}
              />
            </div>

            {key === "page.walk_ins" && pagePermissions[key] ? (
              <div className="flex items-center justify-between gap-4 border-t border-border/60 py-3 pl-4">
                <div className="min-w-0">
                  <p className="text-sm text-foreground">Which walk-ins staff can see</p>
                  <p className="text-xs text-muted-foreground">
                    Applies to the Walk-ins list and search on this floor.
                  </p>
                </div>
                <Select value={walkInsDataScope} onValueChange={(v) => changeDataScope(v as "all" | "own")} disabled={isPending}>
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All walk-ins</SelectItem>
                    <SelectItem value="own">Only their own</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
