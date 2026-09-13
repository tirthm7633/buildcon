"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Calendar, ChevronLeft, ChevronRight, MapPin, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SLIDE_DELAY_MS = 3500;
const SLIDE_COUNT = 3;

// Soft radial wash behind the brand moments (slides 1 and 3) instead of
// flat white — kept off slide 2, where 10 differently-colored logos
// already carry enough visual weight on their own.
const BRAND_WASH = "radial-gradient(ellipse 70% 55% at 50% 50%, var(--accent) 0%, var(--background) 72%)";

// Drop files at these exact paths (public/brands/<file>) and they appear
// automatically — nothing else to wire up. Until a file exists, that card
// falls back to the brand's name as text rather than a broken image.
const BRAND_PARTNERS: { name: string; file: string }[] = [
  { name: "Grohe", file: "grohe.png" },
  { name: "Hansgrohe", file: "hansgrohe.png" },
  { name: "Axor", file: "axor.png" },
  { name: "Geberit", file: "geberit.png" },
  { name: "Vitra", file: "vitra.png" },
  { name: "Oyster", file: "oyster.png" },
  { name: "Qutone", file: "qutone.png" },
  { name: "Nexion", file: "nexion.png" },
  { name: "Dimore", file: "dimore.png" },
  { name: "MCM Ittimi", file: "mcm-ittimi.png" },
];

const CONTACT_DETAILS = [
  { icon: MapPin, text: "Rajkot, Saurashtra" },
  { icon: Calendar, text: "Founded 11 October 2009" },
  { icon: Phone, text: "+91 99099 06652" },
];

// matchMedia is the textbook useSyncExternalStore case: a browser-only
// value that can change out from under React without React ever calling
// setState itself.
function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function getReducedMotionServerSnapshot() {
  return false;
}
function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, getReducedMotionServerSnapshot);
}

// public/logo-mark.png — cropped from public/logo.png (itself downloaded
// from the same file already live as the company logo; pixel-verified:
// fully transparent ground, solidly opaque artwork, composites cleanly on
// any background). The source lockup has "Let you live better" baked in as
// a script-font tagline below the wordmark; cropped that off here since the
// slide renders its own tagline in the site's actual serif — otherwise it
// says the tagline twice, in two different typefaces. Real dimensions, not
// guessed. Swap this path if a higher-res/SVG replacement shows up later.
const BRAND_MARK_SRC = "/logo-mark.png";
const BRAND_MARK_WIDTH = 911;
const BRAND_MARK_HEIGHT = 139;

/** The real brand mark — a static project asset, not the dynamic
 * Supabase-hosted company logo used elsewhere in the app. Sized by height
 * only; width follows the image's real aspect ratio via w-auto. */
function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src={BRAND_MARK_SRC}
      alt="Buildcon House"
      width={BRAND_MARK_WIDTH}
      height={BRAND_MARK_HEIGHT}
      priority
      className={cn("w-auto object-contain", className)}
    />
  );
}

function BrandLogoCard({ name, file }: { name: string; file: string }) {
  const [errored, setErrored] = useState(false);
  return (
    <div className="relative flex h-20 items-center justify-center rounded-xl border border-border bg-card p-3 sm:h-24 sm:p-4">
      {errored ? (
        <span className="text-center text-xs font-medium text-muted-foreground">{name}</span>
      ) : (
        <Image
          src={`/brands/${file}`}
          alt={name}
          fill
          className="object-contain p-2"
          sizes="(min-width: 1024px) 140px, (min-width: 640px) 180px, 45vw"
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
}

export function IntroSlides({ onComplete }: { onComplete: () => void }) {
  const reducedMotion = usePrefersReducedMotion();
  // A lazy useState initializer (not useRef) so the plugin instance is
  // created exactly once without ever reading a ref during render.
  const [autoplay] = useState(() => Autoplay({ delay: SLIDE_DELAY_MS, stopOnInteraction: false, stopOnMouseEnter: true }));
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false }, [autoplay]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (reducedMotion) autoplay.stop();
  }, [reducedMotion, autoplay]);

  // Embla measures its viewport at mount, but that viewport is sized by
  // absolute positioning against this component's own root — force one
  // re-measure once the layout has actually painted, as cheap insurance.
  useEffect(() => {
    if (!emblaApi) return;
    const raf = requestAnimationFrame(() => emblaApi.reInit());
    return () => cancelAnimationFrame(raf);
  }, [emblaApi]);

  useEffect(() => {
    // Deferred a frame so the browser actually paints the "not entered"
    // state first — flipping synchronously can get coalesced into the same
    // paint, and the transition never visibly plays.
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // The autoplay plugin advances slide-to-slide; once someone lands on the
  // last slide (by autoplay, swipe, or a dot), a fresh dwell timer decides
  // when the whole sequence hands off to the login page underneath.
  useEffect(() => {
    if (selectedIndex !== SLIDE_COUNT - 1) return;
    if (reducedMotion) return;
    const timer = setTimeout(onComplete, SLIDE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [selectedIndex, onComplete, reducedMotion]);

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      {/* The carousel viewport is absolutely positioned against this
       * relative root — deliberately not a flex sibling of the Skip/arrow/
       * dot chrome below. Percentage heights cascading through nested flex
       * children (h-full on h-full on flex-1) is a known-fragile pattern;
       * inset-0 against a sized ancestor has no such ambiguity, so every
       * slide reliably gets the *entire* viewport instead of only the
       * content's own height. The chrome overlays on top (z-10). */}
      <div className="absolute inset-0 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          <div className="relative flex h-full w-full flex-[0_0_100%] items-center justify-center px-6">
            <div className="absolute inset-0 -z-10" style={{ background: BRAND_WASH }} />
            <div
              className={cn(
                "flex flex-col items-center gap-6 text-center transition-all duration-700 ease-out",
                entered ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
              )}
            >
              <BrandMark className="h-28 sm:h-36 md:h-44" />
              <p className="font-heading text-xl italic text-foreground sm:text-2xl">Let you live better</p>
            </div>
          </div>

          {/* items-center can't safely centre content taller than the
           * viewport inside an overflow-hidden ancestor — it clips equally
           * off both ends instead of scrolling, silently hiding cards.
           * overflow-y-auto here + min-h-full on the inner wrapper covers
           * both cases: short content still centres, tall content scrolls
           * instead of losing brands off-screen. */}
          <div className="h-full w-full flex-[0_0_100%] overflow-y-auto px-6 sm:px-10">
            <div className="flex min-h-full w-full flex-col items-center justify-center gap-8 py-16 text-center sm:gap-10">
              <h2 className="font-heading text-2xl font-medium tracking-tight text-foreground sm:text-3xl">
                Authorized Dealer Of
              </h2>
              <div className="grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
                {BRAND_PARTNERS.map((brand) => (
                  <BrandLogoCard key={brand.file} {...brand} />
                ))}
              </div>
            </div>
          </div>

          <div className="relative flex h-full w-full flex-[0_0_100%] items-center justify-center px-6">
            <div className="absolute inset-0 -z-10" style={{ background: BRAND_WASH }} />
            <div className="flex max-w-sm flex-col items-center gap-10 text-center">
              <h2 className="font-heading text-2xl font-medium tracking-tight text-balance text-foreground sm:text-3xl">
                Serving Rajkot &amp; Saurashtra since 2009.
              </h2>
              <div className="flex flex-col items-start gap-4">
                {CONTACT_DETAILS.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent">
                      <Icon className="size-4 text-accent-foreground" strokeWidth={1.75} />
                    </span>
                    <span className="text-sm text-foreground">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 top-0 z-10 flex justify-end p-4 sm:p-8">
        <Button variant="ghost" size="sm" onClick={onComplete} className="text-muted-foreground">
          Skip
        </Button>
      </div>

      {/* Click-to-navigate for desktop, which has no swipe gesture. */}
      {selectedIndex > 0 ? (
        <button
          type="button"
          aria-label="Previous slide"
          onClick={scrollPrev}
          className="absolute left-2 top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:flex"
        >
          <ChevronLeft className="size-5" />
        </button>
      ) : null}
      {selectedIndex < SLIDE_COUNT - 1 ? (
        <button
          type="button"
          aria-label="Next slide"
          onClick={scrollNext}
          className="absolute right-2 top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:flex"
        >
          <ChevronRight className="size-5" />
        </button>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-2 pb-8 pt-4 sm:pb-12">
        {Array.from({ length: SLIDE_COUNT }).map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Go to slide ${index + 1}`}
            onClick={() => scrollTo(index)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              index === selectedIndex ? "w-6 bg-primary" : "w-1.5 bg-primary/25"
            )}
          />
        ))}
      </div>
    </div>
  );
}
