import Image from "next/image";

import { cn } from "@/lib/utils";

// Real lockup: a wide horizontal wordmark on a solid white ground (measured
// 1037x240 from the live upload). Sized by height so it's never squeezed
// into a square slot (which clips most of it to a sliver) or stretched off
// its real proportions.
const LOGO_ASPECT = 1037 / 240;

export function Logo({
  logoUrl,
  companyName = "Buildcon House",
  variant = "light",
  className,
  showWordmark = true,
  height = 32,
  priority = false,
}: {
  logoUrl?: string | null;
  companyName?: string;
  variant?: "light" | "dark";
  className?: string;
  showWordmark?: boolean;
  /** Rendered height in px — width follows the logo's real aspect ratio. */
  height?: number;
  /** Above-the-fold placements (login, splash) should load eagerly. */
  priority?: boolean;
}) {
  const width = Math.round(height * LOGO_ASPECT);

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {logoUrl ? (
        // The uploaded lockup sits on a solid white ground (see the note
        // above) — this plate keeps that ground looking deliberate instead
        // of a stray white rectangle now that every surface behind it is
        // dark. Intentionally not theme-driven: its job is to neutralize
        // the asset's own background, not to match the app's palette.
        <div className="shrink-0 rounded-md bg-white p-1.5">
          <Image
            src={logoUrl}
            alt={companyName}
            width={1037}
            height={240}
            className="object-contain"
            style={{ width, height }}
            unoptimized
            priority={priority}
          />
        </div>
      ) : (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md text-[13px] font-bold tracking-tight",
            variant === "light" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
          )}
          style={{ width: height, height }}
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
