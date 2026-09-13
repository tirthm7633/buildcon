"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { Logo } from "@/components/shared/logo";
import { FloorSwitcher } from "@/components/layout/floor-switcher";
import { SidebarSearch } from "@/components/layout/sidebar-search";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { filterNavItemsByDisabledKeys, getNavItems } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { FloorConfig } from "@/lib/floors";
import type { FloorId, Profile } from "@/lib/supabase/types";

export function Topbar({
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
  const [open, setOpen] = useState(false);
  const navItems = filterNavItemsByDisabledKeys(getNavItems(floor), disabledPages);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 lg:hidden">
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu className="size-5" />
      </Button>
      <Logo logoUrl={logoUrl} variant="dark" showWordmark={false} height={32} className="flex-1" />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetHeader className="h-16 flex-row items-center border-b border-sidebar-border px-5">
            <SheetTitle>
              <Logo logoUrl={logoUrl} variant="light" showWordmark={false} height={32} />
            </SheetTitle>
          </SheetHeader>
          <div className="flex h-[calc(100%-4rem)] flex-col gap-3 overflow-y-auto px-3 py-3">
            <FloorSwitcher activeFloorId={activeFloorId} accessibleFloorIds={accessibleFloorIds} />
            <SidebarSearch items={navItems} />
            <SidebarNav items={navItems} onNavigate={() => setOpen(false)} />
            <div className="mt-auto border-t border-sidebar-border pt-3">
              <UserMenu name={profile.full_name} email={profile.email} role={profile.role} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
