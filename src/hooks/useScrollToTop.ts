import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Scrolls to top on every route change.
 * Fixes the issue where navigating to a new page starts at the bottom.
 */
export function useScrollToTop() {
  const [loc] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [loc]);
}
