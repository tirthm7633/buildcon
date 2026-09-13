"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { setFeaturePermission, setWalkInsDataScope } from "@/lib/actions/permissions";
import { GATABLE_ROLES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { FloorId, PageFeatureKey } from "@/lib/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type GatableRole = (typeof GATABLE_ROLES)[number]["value"];

const ROLE_LABEL: Record<GatableRole, string> = { head: "Head", manager: "Manager", staff: "Staff" };

export interface FeatureItem {
  key: PageFeatureKey;
  label: string;
}

export function RolePermissionsPanel({
  floorId,
  floorName,
  editableRoles,
  features,
  permissionsByRole,
  walkInsDataScope,
}: {
  floorId: FloorId;
  floorName: string;
  editableRoles: GatableRole[];
  features: FeatureItem[];
  permissionsByRole: Record<GatableRole, Record<string, boolean>>;
  walkInsDataScope: "all" | "own";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState<GatableRole>(editableRoles[0]);
  const currentPermissions = permissionsByRole[selectedRole];

  function toggleFeature(key: PageFeatureKey, enabled: boolean) {
    startTransition(async () => {
      const result = await setFeaturePermission({ floorId, role: selectedRole, key, enabled });
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
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Feature permissions</CardTitle>
        <CardDescription>
          Turn pages on or off per role on the {floorName} floor. Off pages disappear from that role&apos;s sidebar,
          and a direct link is blocked too.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {editableRoles.length > 1 ? (
          <div className="flex gap-1 rounded-lg bg-secondary p-1">
            {editableRoles.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  selectedRole === role
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {ROLE_LABEL[role]}
              </button>
            ))}
          </div>
        ) : null}

        <div className="divide-y divide-border/60">
          {features.map(({ key, label }) => (
            <div key={key}>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <Switch
                  checked={currentPermissions[key] ?? true}
                  disabled={isPending}
                  onCheckedChange={(checked) => toggleFeature(key, checked)}
                  aria-label={`${ROLE_LABEL[selectedRole]} access to ${label}`}
                />
              </div>

              {key === "page.walk_ins" && selectedRole === "staff" && currentPermissions[key] ? (
                <div className="flex items-center justify-between gap-4 py-2.5 pl-4">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">Which walk-ins Staff can see</p>
                    <p className="text-xs text-muted-foreground">
                      All walk-ins, or only the ones they created or are assigned to.
                    </p>
                  </div>
                  <Select
                    value={walkInsDataScope}
                    onValueChange={(v) => changeDataScope(v as "all" | "own")}
                    disabled={isPending}
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
        </div>
      </CardContent>
    </Card>
  );
}
