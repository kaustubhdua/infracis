interface ScoreRingProps {
  value: number | null;
  size?: number;
  /** CSS colour (a var() works). */
  color?: string;
  label: string;
  caption?: string;
  highlight?: boolean;
}

/** Circular 0–100 gauge. Renders an explicit "n/a" state instead of a misleading empty ring. */
export default function ScoreRing({ value, size = 132, color = "var(--ix-brand-2)", label, caption, highlight = false }: ScoreRingProps) {
  const stroke = Math.max(8, Math.round(size / 11));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <figure className="m-0 flex flex-col items-center gap-2 text-center" aria-label={`${label}: ${value === null ? "not scored" : `${Math.round(clamped)} out of 100`}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--ix-brand-soft)" strokeWidth={stroke} />
          {value !== null && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${(circumference * clamped) / 100} ${circumference}`}
              style={{ transition: "stroke-dasharray 700ms cubic-bezier(0.2,0.7,0.2,1)" }}
            />
          )}
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div>
            <div className="text-3xl font-extrabold leading-none tracking-tight text-[color:var(--ix-ink)]">{value === null ? "n/a" : Math.round(clamped)}</div>
            {value !== null && <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--ix-muted)]">of 100</div>}
          </div>
        </div>
      </div>
      <figcaption>
        <div className={`text-sm font-bold ${highlight ? "text-[color:var(--ix-brand)]" : "text-[color:var(--ix-ink-2)]"}`}>{label}</div>
        {caption && <div className="mt-0.5 max-w-[11rem] text-[11px] leading-snug text-[color:var(--ix-muted)]">{caption}</div>}
      </figcaption>
    </figure>
  );
}
