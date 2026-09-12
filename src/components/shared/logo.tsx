import Image from "next/image";

import { cn } from "@/lib/utils";

// The uploaded mark is a light/glowing lockup on a transparent ground — on
// this app's light surfaces it measures ~1.1:1 contrast (near-invisible) with
// nothing behind it. A soft drop-shadow on the artwork itself (not a filled
// background shape) gives it just enough edge to read on light surfaces
// without looking like a "box". Native 1536x1024 source, so anything under
// ~500px wide stays sharp — we only ever downscale.
const LOGO_SOURCE_ASPECT = 1536 / 1024;
const LOGO_GROUND_SHADOW =
  "drop-shadow(0 1px 1px rgba(0,0,0,0.45)) drop-shadow(0 0 6px rgba(0,0,0,0.25))";

export function Logo({
  logoUrl,
  companyName = "Buildcon House",
  variant = "light",
  className,
  showWordmark = true,
  size,
  width,
  plate = false,
}: {
  logoUrl?: string | null;
  companyName?: string;
  variant?: "light" | "dark";
  className?: string;
  showWordmark?: boolean;
  /** Compact square mode (icon rail, thumbnails, nav-height corner mark). */
  size?: number;
  /** Hero mode: renders at the mark's native aspect ratio, no crop/letterbox. */
  width?: number;
  /** Dark backing plate. Off by default — use only for large, isolated placements. */
  plate?: boolean;
}) {
  const hero = !!width && !size;
  const boxWidth = hero ? width! : (size ?? 32);
  const boxHeight = hero ? Math.round(width! / LOGO_SOURCE_ASPECT) : (size ?? 32);
  const padX = plate ? Math.round(Math.min(24, Math.max(12, boxWidth * 0.12))) : 0;
  const padY = plate ? Math.round(Math.min(18, Math.max(9, boxHeight * 0.16))) : 0;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {logoUrl ? (
        <div
          className={cn(
            "flex shrink-0 items-center overflow-hidden rounded-lg",
            plate && "justify-center bg-[#161310] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
          )}
          style={{
            width: boxWidth + padX * 2,
            height: boxHeight + padY * 2,
          }}
        >
          <Image
            src={logoUrl}
            alt={companyName}
            width={1536}
            height={1024}
            className="object-contain object-left"
            style={{ width: boxWidth, height: "auto", filter: plate ? undefined : LOGO_GROUND_SHADOW }}
            unoptimized
            priority={hero}
          />
        </div>
      ) : (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md text-[13px] font-bold tracking-tight",
            variant === "light" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
          )}
          style={{ width: size ?? 32, height: size ?? 32 }}
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
