"use client";

import { LogOut, MoreVertical, User } from "lucide-react";

import { logout } from "@/lib/actions/auth";
import { findLabel, USER_ROLES } from "@/lib/constants";
import { initials } from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu({
  name,
  email,
  role,
  collapsed = false,
}: {
  name: string;
  email: string;
  role: string;
  collapsed?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-sidebar-accent/60 ${collapsed ? "justify-center px-0" : ""}`}
      >
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        {!collapsed ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{findLabel(USER_ROLES, role)}</p>
            </div>
            <MoreVertical className="size-4 shrink-0 text-muted-foreground" />
          </>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/settings">
            <User className="size-4" />
            Account settings
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => logout()}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
