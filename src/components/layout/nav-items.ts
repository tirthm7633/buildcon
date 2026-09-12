import {
  BarChart3,
  Bell,
  BookOpen,
  Footprints,
  ListChecks,
  Receipt,
  Settings,
  ShoppingCart,
  Sun,
  Truck,
  Users,
  Users2,
  Wallet,
  FileText,
  type LucideIcon,
} from "lucide-react";

import type { FloorConfig } from "@/lib/floors";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export function getNavItems(floor: FloorConfig): NavItem[] {
  const items: NavItem[] = [];
  const m = floor.modules;

  if (m.today) items.push({ href: "/", label: "Today", icon: Sun });
  items.push({ href: "/walk-ins", label: m.walkInsLabel, icon: Footprints });
  if (m.catalog) items.push({ href: "/catalog", label: "Catalog", icon: BookOpen });
  if (m.customers) items.push({ href: "/customers", label: "Customers", icon: Users });
  if (m.payments) items.push({ href: "/payments", label: "Payments", icon: Wallet });
  if (m.paymentList) items.push({ href: "/payment-list", label: "Payment List", icon: Receipt });
  if (m.purchases) items.push({ href: "/purchases", label: "Purchases", icon: ShoppingCart });
  if (m.followUps) items.push({ href: "/follow-ups", label: "Follow-ups", icon: ListChecks });
  if (m.quotationsLabel) items.push({ href: "/quotations", label: m.quotationsLabel, icon: FileText });
  if (m.tileOrders) items.push({ href: "/orders", label: "Tile Orders", icon: Truck });
  if (m.notifications) items.push({ href: "/notifications", label: "Notifications", icon: Bell });
  if (m.salesData) items.push({ href: "/sales-data", label: "Sales Data", icon: BarChart3 });
  if (m.team) items.push({ href: "/team", label: "Team", icon: Users2 });
  if (m.settings) items.push({ href: "/settings", label: "Settings", icon: Settings });

  return items;
}
