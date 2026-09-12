"use client";

import { useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { FloorSwitcher } from "@/components/layout/floor-switcher";
import { SidebarSearch } from "@/components/layout/sidebar-search";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { filterNavItemsByDisabledKeys, getNavItems } from "@/components/layout/nav-items";
import type { FloorConfig } from "@/lib/floors";
import type { FloorId, Profile } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export function Sidebar({
  logoUrl,
  profile,
  floor,
  activeFloorId,
  accessibleFloorIds,
  disabledPages = [],
}: {
  logoUrl: string | null;
  profile: Profile;
  floor: FloorConfig;
  activeFloorId: FloorId;
  accessibleFloorIds: FloorId[];
  disabledPages?: string[];
}) {
  const [collapsed, setCollapsed] = useState(false);
  const navItems = filterNavItemsByDisabledKeys(getNavItems(floor), disabledPages);

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 lg:flex",
        collapsed ? "w-[76px]" : "w-64"
      )}
    >
      <div className={cn("flex h-16 items-center gap-2 border-b border-sidebar-border px-4", collapsed && "justify-center px-2")}>
        {!collapsed ? <Logo logoUrl={logoUrl} variant="light" showWordmark={false} size={32} className="flex-1" /> : null}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          {collapsed ? <PanelLeftOpen className="size-4.5" /> : <PanelLeftClose className="size-4.5" />}
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
        <FloorSwitcher activeFloorId={activeFloorId} accessibleFloorIds={accessibleFloorIds} collapsed={collapsed} />
        <SidebarSearch items={navItems} collapsed={collapsed} />
        <SidebarNav items={navItems} collapsed={collapsed} />
      </div>

      <div className="border-t border-sidebar-border px-3 py-3">
        <UserMenu name={profile.full_name} email={profile.email} role={profile.role} collapsed={collapsed} />
      </div>
    </aside>
  );
}
