export type ComparisonSide = "A" | "B" | "neutral" | "incomparable";

export interface ComparisonMetricResult {
  metric: string;
  category: string;
  favoredSide: ComparisonSide;
}

export interface ComparisonResultSummary {
  headline: string;
  summary: string;
  winsA: number;
  winsB: number;
  neutral: number;
  incomparable: number;
  comparable: number;
}

/**
 * Summarize comparable evidence without manufacturing a weighted property score.
 * Completeness is about data coverage, not whether a location is better to live in.
 */
export function summarizeComparisonResult(
  deltas: ComparisonMetricResult[]
): ComparisonResultSummary {
  const relevant = deltas.filter((delta) =>
    delta.category.toLocaleLowerCase() !== "audit & provenance" &&
    delta.metric.toLocaleLowerCase() !== "data completeness index"
  );

  const winsA = relevant.filter((delta) => delta.favoredSide === "A").length;
  const winsB = relevant.filter((delta) => delta.favoredSide === "B").length;
  const neutral = relevant.filter((delta) => delta.favoredSide === "neutral").length;
  const incomparable = relevant.filter((delta) => delta.favoredSide === "incomparable").length;
  const comparable = winsA + winsB + neutral;

  if (comparable === 0) {
    return {
      headline: "There isn't enough comparable evidence yet",
      summary: "The available provider results do not support a fair lead for either location. Review missing data and retry when sources are available.",
      winsA, winsB, neutral, incomparable, comparable
    };
  }

  if (winsA === winsB) {
    return {
      headline: "No clear overall lead",
      summary: `The locations have a balanced split across ${comparable} comparable metrics. Choose based on the specific factors that matter most to you, and verify the unresolved items in person.`,
      winsA, winsB, neutral, incomparable, comparable
    };
  }

  const leader = winsA > winsB ? "Location A" : "Location B";
  const lead = Math.abs(winsA - winsB);
  return {
    headline: `${leader} leads on the comparable metrics`,
    summary: `${leader} is favored on ${Math.max(winsA, winsB)} comparable metrics, a net lead of ${lead}. This is not a universal property recommendation: ${winsA + winsB} metrics favor one side, ${neutral} are similar, and ${incomparable} cannot be compared fairly.`,
    winsA, winsB, neutral, incomparable, comparable
  };
}
