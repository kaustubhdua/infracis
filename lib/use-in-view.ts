"use client";

import { useEffect, useRef, useState } from "react";

/**
 * True once the element has come within `rootMargin` of the viewport.
 * Browsers without IntersectionObserver, and printing, show content immediately.
 */
export function useInView<T extends Element>(rootMargin = "320px"): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    const showForPrint = () => setInView(true);
    window.addEventListener("beforeprint", showForPrint);
    return () => {
      observer.disconnect();
      window.removeEventListener("beforeprint", showForPrint);
    };
  }, [inView, rootMargin]);

  return [ref, inView];
}
