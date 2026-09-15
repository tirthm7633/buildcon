import Link from "next/link";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/orders", label: "Customer" },
  { href: "/orders/dispatches", label: "Dispatch List" },
  { href: "/orders/register", label: "Material Movement Register" },
] as const;

export function OrdersTabNav({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <div className="mb-5 flex flex-wrap gap-x-5 gap-y-2 border-b border-border">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "-mb-px border-b-2 pb-2 text-sm font-medium transition-colors",
            active === tab.href
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
