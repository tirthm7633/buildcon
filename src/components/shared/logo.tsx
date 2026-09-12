import Image from "next/image";

import { cn } from "@/lib/utils";

export function Logo({
  logoUrl,
  companyName = "Buildcon House",
  variant = "light",
  className,
  showWordmark = true,
  size = 36,
}: {
  logoUrl?: string | null;
  companyName?: string;
  variant?: "light" | "dark";
  className?: string;
  showWordmark?: boolean;
  size?: number;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={companyName}
          width={size}
          height={size}
          className="shrink-0 rounded-md object-contain"
          style={{ width: size, height: size }}
          unoptimized
        />
      ) : (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md text-[13px] font-bold tracking-tight",
            variant === "light" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
          )}
          style={{ width: size, height: size }}
        >
          BH
        </div>
      )}
      {showWordmark ? (
        <span
          className={cn(
            "text-[15px] font-semibold tracking-tight",
            variant === "light" ? "text-sidebar-foreground" : "text-foreground"
          )}
        >
          {companyName}
        </span>
      ) : null}
    </div>
  );
}
