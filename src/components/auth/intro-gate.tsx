"use client";

import { useState, useSyncExternalStore } from "react";

import { IntroSlides } from "@/components/auth/intro-slides";

const INTRO_SEEN_KEY = "bh_intro_seen";

function subscribe() {
  return () => {};
}
function getSnapshot() {
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) !== "1";
  } catch {
    // Storage blocked (private mode, locked-down browser, etc.) — never let
    // that stand between someone and the login form.
    return false;
  }
}
function getServerSnapshot() {
  return false;
}

export function IntroGate({ children }: { children: React.ReactNode }) {
  const storedShowIntro = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);
  const showIntro = storedShowIntro && !dismissed;

  function finishIntro() {
    try {
      localStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      // Nothing to do — worst case the intro plays again next time.
    }
    setDismissed(true);
  }

  if (showIntro) return <IntroSlides onComplete={finishIntro} />;
  return <>{children}</>;
}
