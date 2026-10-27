import { LocationData, WeatherData, AirQualityData, AmenitiesSummary, DueDiligenceItem } from "./types";

export function generateDueDiligenceChecklist(
  location: LocationData,
  weather: WeatherData | null,
  airQuality: AirQualityData | null,
  amenities: AmenitiesSummary | null
): DueDiligenceItem[] {
  const checklist: DueDiligenceItem[] = [];

  // 1. Waterlogging and Elevation Check
  const elevation = weather?.elevationMeters;
  const elevationNote =
    elevation !== null && elevation !== undefined
      ? `Recorded elevation is ~${elevation}m above sea level.`
      : "Elevation not verified.";

  checklist.push({
    id: "chk-drainage",
    category: "Drainage & Monsoon Waterlogging",
    question: "Does rainwater accumulate on the immediate approach road or compound during peak monsoon showers?",
    rationale: `${elevationNote} Micro-topography and storm-water drain maintenance determine localized flooding far more than regional elevation.`,
    verificationSource: "Interview 2 nearby shopkeepers and residents who have lived in the lane for >3 years.",
    priority: "high"
  });

  // 2. Potable Water Supply Source & Quality
  checklist.push({
    id: "chk-water-source",
    category: "Water Supply & Potability",
    question: "What is the primary water source: municipal piped supply, borewell groundwater, or private water tankers?",
    rationale: "Groundwater depletion and tanker dependency add substantial monthly costs (often ₹2,000–₹6,000/mo) and water hardness issues (TDS > 1000).",
    verificationSource: "Inspect the building's water meter, underground sump, and ask the building association / landlord for recent water bills.",
    priority: "high"
  });

  // 3. Last-Mile Pedestrian Walkability & Transit Access
  const nearestTransit = amenities?.nearest.transit;
  const transitDesc = nearestTransit
    ? `Nearest transit stop is ${nearestTransit.name} (~${nearestTransit.distanceMeters}m straight-line).`
    : "No transit stop mapped within 1.2 km.";

  checklist.push({
    id: "chk-transit-walk",
    category: "Mobility & Transit Access",
    question: "Is the pedestrian path to the nearest public transit safe, lit at night, and equipped with usable sidewalks?",
    rationale: `${transitDesc} Straight-line distance does not account for open storm drains, unpaved muddy shoulders, or highway crossing hazards.`,
    verificationSource: "Perform a physical walk between the property and transit point between 8:00 PM and 9:30 PM.",
    priority: "medium"
  });

  // 4. Power Infrastructure & DG Backup
  checklist.push({
    id: "chk-electricity",
    category: "Power Grid & Backup",
    question: "How frequent are unscheduled power outages, and does the building have an automatic 100% DG (Diesel Generator) power backup?",
    rationale: "Frequent voltage fluctuations and prolonged summer outages impact work-from-home viability and appliance lifespan.",
    verificationSource: "Ask local grocery store owners and building security about power cuts and backup diesel consumption charges.",
    priority: "medium"
  });

  // 5. Legal Clearances, Title, and RERA/Zoning Verification
  checklist.push({
    id: "chk-legal-title",
    category: "Title & Regulatory Due Diligence",
    question: "Are the property's Title Deed, Encumbrance Certificate (30 years), RERA registration, and Occupancy Certificate (OC) verifiable?",
    rationale: "Properties lacking an Occupancy Certificate (OC) cannot legally obtain individual water/electricity meters in many jurisdictions and risk demolition or regularization penalties.",
    verificationSource: "Review original title documents with an independent property lawyer and search state land records registry.",
    priority: "high"
  });

  // 6. Air Quality & Environmental Exposure
  const aqiVal = airQuality?.europeanAqi;
  checklist.push({
    id: "chk-environment",
    category: "Environmental & Acoustic Buffer",
    question: "Are there heavy truck corridors, waste dumping grounds, or open nullahs within a 500-meter radius?",
    rationale: `${aqiVal !== null && aqiVal !== undefined ? `Regional AQI index is ${aqiVal}. ` : ""}Open sewage drains emit noxious hydrogen sulfide gases that corrode copper AC coils and cause chronic respiratory discomfort.`,
    verificationSource: "Inspect the neighborhood perimeter within a 10-minute walk radius in early morning and late evening.",
    priority: "medium"
  });

  return checklist;
}
