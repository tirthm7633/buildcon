import type { Metadata } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import Script from "next/script";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { THEME_STORAGE_KEY } from "@/lib/theme";

import "./globals.css";

// Runs before paint so a stored theme (see ThemeSwitcher) applies on the
// very first frame — without this, the page would flash Light (the CSS
// default) then snap to the stored choice a moment later. Also toggles the
// `dark` class alongside data-app-theme for the couple of components that
// key off Tailwind's dark: variant rather than the CSS tokens directly.
const themeInitScript = `
  try {
    var t = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    if (t === "dark" || t === "obsidian-steel") {
      document.documentElement.setAttribute("data-app-theme", t);
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
`;

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Buildcon House",
  description: "Walk-ins, quotations, orders, purchases and payments across every Buildcon House floor.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${mono.variable} h-full antialiased`}
      // The theme-init script (below) adds the `dark` class and a
      // data-app-theme attribute to this element before React hydrates, so
      // its actual DOM state legitimately differs from what was
      // server-rendered — exactly the documented case this prop exists for.
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
      </head>
      <body className="min-h-full bg-background text-foreground">
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </TooltipProvider>
      </body>
    </html>
  );
}
