export type AppTheme = "light" | "dark" | "obsidian-steel";

export const THEME_STORAGE_KEY = "bch-theme";
export const DEFAULT_THEME: AppTheme = "light";

/** Themes whose own colors are dark — the ones that should also carry
 * Tailwind's `.dark` class, for the handful of components (toaster, chart
 * tooltips) that key off `dark:` variants rather than the CSS tokens. */
export const DARK_THEMES: AppTheme[] = ["dark", "obsidian-steel"];

export const APP_THEMES: { value: AppTheme; label: string; description: string; swatch: [string, string, string] }[] = [
  {
    value: "light",
    label: "Light",
    description: "The original warm cream and brass look.",
    swatch: ["#faf8f4", "#8a6a3b", "#ffffff"],
  },
  {
    value: "dark",
    label: "Dark",
    description: "Warm near-black with the brand's own brass-gold accent.",
    swatch: ["#1b1712", "#c9a165", "#231e18"],
  },
  {
    value: "obsidian-steel",
    label: "Obsidian Steel",
    description: "True black with blue pulled almost to grey.",
    swatch: ["#0c0d0f", "#5b7aa5", "#17181b"],
  },
];
