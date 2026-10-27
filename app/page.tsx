import AnalyzeClient from "./analyze-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Infracis | Location Due Diligence & Property Intelligence",
  description:
    "Know the place before the property. Traceable location evidence, transparent calculations, explicit unknowns, and customized due-diligence checklists."
};

export default function HomePage() {
  return <AnalyzeClient />;
}
