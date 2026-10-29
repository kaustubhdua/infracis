export type EvidenceClassification = "observed" | "provider_model" | "calculated" | "rule_based_interpretation" | "unknown";

export type EvidenceCategory =
  | "location"
  | "transit"
  | "education"
  | "healthcare"
  | "essentials"
  | "civic"
  | "weather"
  | "air_quality"
  | "topography"
  | "due_diligence";

export interface EvidenceRecord {
  id: string;
  category: EvidenceCategory;
  title: string;
  value: string | number | boolean | null;
  unit?: string;
  classification: EvidenceClassification;
  provider: string;
  sourceUrl: string;
  retrievedAt: string;
  observedAt?: string;
  geographicResolution?: string;
  coverage?: string;
  license?: string;
  limitations: string;
  confidenceNote?: string;
}

export interface AmenityItem {
  id: string;
  name: string;
  category: string;
  group: "transit" | "education" | "healthcare" | "essentials" | "civic" | "other";
  distanceMeters: number;
  lat: number | null;
  lon: number | null;
}

export interface LocationData {
  label: string;
  latitude: number;
  longitude: number;
  boundingbox?: [number, number, number, number];
  mapUrl: string;
  osmType?: string;
  /** Actual text geocoder used; persisted so evidence provenance stays accurate. */
  geocodingProvider?: "nominatim" | "photon";
}

export interface WeatherData {
  temperature: number | null;
  humidity: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  weatherCode: number | null;
  weatherDescription: string;
  observedTime: string | null;
  elevationMeters: number | null;
  units: Record<string, string>;
}

export interface AirQualityData {
  europeanAqi: number | null;
  aqiLabel: string;
  pm25: number | null;
  pm10: number | null;
  nitrogenDioxide: number | null;
  ozone: number | null;
  observedTime: string | null;
  units: Record<string, string>;
}

export interface AmenitiesSummary {
  totalCount: number;
  radiusMeters: number;
  /** True when the upstream query reached its configured output cap; counts/nearest results may be incomplete. */
  resultLimitReached?: boolean;
  byGroup: {
    transit: number;
    education: number;
    healthcare: number;
    essentials: number;
    civic: number;
  };
  nearest: {
    transit?: AmenityItem;
    education?: AmenityItem;
    healthcare?: AmenityItem;
    essentials?: AmenityItem;
    civic?: AmenityItem;
  };
  items: AmenityItem[];
}

export interface DueDiligenceItem {
  id: string;
  category: string;
  question: string;
  rationale: string;
  verificationSource: string;
  priority: "high" | "medium" | "low";
}

export interface LocationReport {
  id: string;
  generatedAt: string;
  location: LocationData;
  weather: WeatherData | null;
  airQuality: AirQualityData | null;
  amenities: AmenitiesSummary | null;
  evidence: EvidenceRecord[];
  scores: {
    completenessScore: number; // 0-100% of verifiable metrics retrieved
    transitAccessibilityScore: number | null; // 0-100 based on verified distances
    dailyConvenienceScore: number | null; // 0-100 based on essential services
    healthcareAccessScore: number | null; // 0-100 based on clinics/hospitals
    educationAccessScore: number | null; // 0-100 based on schools
    calculationFormulas: Record<string, string>;
  };
  findings: Array<{
    id: string;
    headline: string;
    explanation: string;
    classification: EvidenceClassification;
    supportingEvidenceIds: string[];
    riskLevel?: "neutral" | "favorable" | "caution";
  }>;
  unknowns: string[];
  checklist: DueDiligenceItem[];
  sources: Array<{
    name: string;
    url: string;
    retrievedAt: string;
    status: "available" | "unavailable";
    license: string;
    note: string;
  }>;
  limitations: string[];
}

export type PreferenceProfile = "balanced" | "family" | "transit" | "healthcare" | "quiet";

export interface ComparisonReport {
  generatedAt: string;
  preferenceProfile: PreferenceProfile;
  locationA: LocationReport;
  locationB: LocationReport;
  deltas: Array<{
    metric: string;
    category: string;
    valueA: string | number | null;
    valueB: string | number | null;
    unit?: string;
    differenceSummary: string;
    favoredSide: "A" | "B" | "neutral" | "incomparable";
    incomparableReason?: string;
  }>;
  preferenceSummary: string;
  nextSteps: string[];
}
