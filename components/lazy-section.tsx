"use client";

import type { ReactNode } from "react";
import { useInView } from "@/lib/use-in-view";

interface LazySectionProps {
  children: ReactNode;
  /** Reserved height so the page does not jump when the section mounts. */
  minHeight?: number;
  label?: string;
  rootMargin?: string;
  className?: string;
}

/**
 * Mounts its children only when they are about to scroll into view.
 * Used for below-the-fold report sections so their code, data fetching
 * (e.g. the AI interpretation) and map tiles load on demand.
 */
export default function LazySection({ children, minHeight = 220, label = "section", rootMargin, className }: LazySectionProps) {
  const [ref, inView] = useInView<HTMLDivElement>(rootMargin);
  return (
    <div ref={ref} className={className} style={inView ? undefined : { minHeight }}>
      {inView ? children : <SectionSkeleton height={minHeight} label={label} />}
    </div>
  );
}

export function SectionSkeleton({ height = 220, label = "section" }: { height?: number; label?: string }) {
  return (
    <div
      role="status"
      aria-label={`Loading ${label}`}
      className="ix-skeleton"
      style={{ minHeight: height }}
    >
      <span className="ix-skeleton__bar w-1/3" />
      <span className="ix-skeleton__bar w-2/3" />
      <span className="ix-skeleton__bar w-1/2" />
    </div>
  );
}
