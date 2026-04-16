import { useEffect } from "react";
import { useProgressStore } from "@/lib/progress-store";

/**
 * Listens for custom events from other stores and feeds them into the progress/gamification store.
 * Mount once at the app root level.
 */
export function useProgressEvents() {
  const { trackEvent, trackLinesWritten } = useProgressStore();

  useEffect(() => {
    const onPortfolioSave = () => trackEvent("portfolio");
    const onLinesWritten = (e: Event) => {
      const count = (e as CustomEvent<number>).detail ?? 1;
      trackLinesWritten(count);
    };

    window.addEventListener("bluej:portfolio-save", onPortfolioSave);
    window.addEventListener("bluej:lines-written", onLinesWritten);
    return () => {
      window.removeEventListener("bluej:portfolio-save", onPortfolioSave);
      window.removeEventListener("bluej:lines-written", onLinesWritten);
    };
  }, [trackEvent, trackLinesWritten]);
}
