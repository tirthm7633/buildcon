"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setUserFeaturePermission, setUserFloorAccess, setUserWalkInsDataScope } from "@/lib/actions/permissions";
import type { FloorId, PageFeatureKey } from "@/lib/supabase/types";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export interface MemberFloorAccess {
  floorId: FloorId;
  floorName: string;
  hasAccess: boolean;
  /** Whether the viewer is allowed to change anything in this floor's
   * section — false renders every control disabled (still visible, so the
   * person's actual state is never hidden from a viewer who can see it). */
  canEdit: boolean;
  features: { key: PageFeatureKey; label: string; enabled: boolean }[];
  walkInsDataScope: "all" | "own";
}

export function MemberAccessPanel({
  userId,
  isStaffTarget,
  floors,
}: {
  userId: string;
  isStaffTarget: boolean;
  floors: MemberFloorAccess[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggleFloorAccess(floorId: FloorId, enabled: boolean) {
    startTransition(async () => {
      const result = await setUserFloorAccess({ userId, floorId, enabled });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function toggleFeature(floorId: FloorId, key: PageFeatureKey, enabled: boolean) {
    startTransition(async () => {
      const result = await setUserFeaturePermission({ userId, floorId, key, enabled });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  function changeDataScope(floorId: FloorId, scope: "all" | "own") {
    startTransition(async () => {
      const result = await setUserWalkInsDataScope({ userId, floorId, scope });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {floors.map((floor) => (
        <Card key={floor.floorId}>
          <CardHeader>
            <CardTitle className="text-base">{floor.floorName}</CardTitle>
            <CardDescription>{floor.hasAccess ? "Has access to this floor" : "No access to this floor"}</CardDescription>
            <CardAction>
              <Switch
                checked={floor.hasAccess}
                disabled={isPending || !floor.canEdit}
                onCheckedChange={(checked) => toggleFloorAccess(floor.floorId, checked)}
                aria-label={`${floor.floorName} floor access`}
              />
            </CardAction>
          </CardHeader>

          {floor.hasAccess && floor.features.length > 0 ? (
            <CardContent className="divide-y divide-border/60">
              {floor.features.map((feature) => (
                <div key={feature.key}>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <p className="text-sm font-medium text-foreground">{feature.label}</p>
                    <Switch
                      checked={feature.enabled}
                      disabled={isPending || !floor.canEdit}
                      onCheckedChange={(checked) => toggleFeature(floor.floorId, feature.key, checked)}
                      aria-label={`${floor.floorName} access to ${feature.label}`}
                    />
                  </div>

                  {isStaffTarget && feature.key === "page.walk_ins" && feature.enabled ? (
                    <div className="flex items-center justify-between gap-4 py-2.5 pl-4">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">Which walk-ins they can see</p>
                        <p className="text-xs text-muted-foreground">
                          All walk-ins, or only the ones they created or are assigned to.
                        </p>
                      </div>
                      <Select
                        value={floor.walkInsDataScope}
                        onValueChange={(v) => changeDataScope(floor.floorId, v as "all" | "own")}
                        disabled={isPending || !floor.canEdit}
                      >
                        <SelectTrigger className="h-8 w-40 text-xs">
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
          ) : null}

          {!floor.canEdit ? (
            <p className="px-(--card-spacing) text-xs text-muted-foreground">
              Only the owner, or a Head of this floor, can change this.
            </p>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
