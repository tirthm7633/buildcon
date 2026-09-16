"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { APP_THEMES, DARK_THEMES, DEFAULT_THEME, THEME_STORAGE_KEY, type AppTheme } from "@/lib/theme";

export function ThemeSwitcher() {
  // Matches the layout's blocking init script: no attribute means Light is active.
  const [active, setActive] = useState<AppTheme>(DEFAULT_THEME);

  useEffect(() => {
    // The theme itself is already applied by the blocking init script
    // before hydration — this only syncs which swatch shows as selected,
    // which can't be known during SSR (no document there).
    const current = document.documentElement.getAttribute("data-app-theme") as AppTheme | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading a browser-only API after mount, not derivable during render
    if (current) setActive(current);
  }, []);

  function choose(theme: AppTheme) {
    setActive(theme);
    if (theme === DEFAULT_THEME) {
      document.documentElement.removeAttribute("data-app-theme");
    } else {
      document.documentElement.setAttribute("data-app-theme", theme);
    }
    document.documentElement.classList.toggle("dark", DARK_THEMES.includes(theme));
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Private browsing or blocked storage — the choice just won't survive a reload.
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {APP_THEMES.map((theme) => (
        <button
          key={theme.value}
          type="button"
          onClick={() => choose(theme.value)}
          aria-pressed={active === theme.value}
          className={cn(
            "flex flex-col gap-3 rounded-lg border p-3 text-left transition-colors",
            active === theme.value ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground/40"
          )}
        >
          <div className="flex overflow-hidden rounded-md border border-border/50">
            {theme.swatch.map((color, i) => (
              <span key={i} className="h-10 flex-1" style={{ backgroundColor: color }} />
            ))}
          </div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">{theme.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{theme.description}</p>
            </div>
            {active === theme.value ? <Check className="mt-0.5 size-4 shrink-0 text-primary" /> : null}
          </div>
        </button>
      ))}
    </div>
  );
}
