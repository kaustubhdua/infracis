import {
  LocationData,
  WeatherData,
  AirQualityData,
  AmenitiesSummary,
  EvidenceRecord,
  LocationReport
} from "./types";
import {
  calculateProximityScore,
  calculateDataCompleteness
} from "./geo";
import { generateDueDiligenceChecklist } from "./checklist";
import { generateGroundedFindings } from "./synthesizer";

export function assembleLocationReport(
  query: string,
  location: LocationData,
  weather: WeatherData | null,
  airQuality: AirQualityData | null,
  amenities: AmenitiesSummary | null,
  generatedAt: string
): LocationReport {
  const evidence: EvidenceRecord[] = [];
  const unknowns: string[] = [];

  // 1. Geocoded Coordinate Evidence (Observed)
  evidence.push({
    id: "ev-geo-01",
    category: "location",
    title: "Resolved Geographic Coordinates",
    value: `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`,
    classification: "observed",
    provider: location.geocodingProvider === "photon" ? "Photon (OpenStreetMap-backed geocoder)" : "OpenStreetMap Nominatim",
    sourceUrl: location.geocodingProvider === "photon" ? "https://photon.komoot.io/" : "https://nominatim.openstreetmap.org/",
    retrievedAt: generatedAt,
    geographicResolution: "Point geometry from text geocoding",
    coverage: "Global OpenStreetMap",
    license: "ODbL (Open Database License)",
    limitations: "Text geocoding matches point centroids, not cadastral survey parcels or title boundaries."
  });

  // 2. Weather & Elevation Evidence
  if (weather) {
    if (weather.temperature !== null) {
      evidence.push({
        id: "ev-weather-temp",
        category: "weather",
        title: "Modeled Ambient Temperature",
        value: weather.temperature,
        unit: weather.units.temperature_2m || "°C",
        classification: "provider_model",
        provider: "Open-Meteo Weather API",
        sourceUrl: "https://open-meteo.com/",
        retrievedAt: generatedAt,
        observedAt: weather.observedTime || undefined,
        geographicResolution: "11 km numerical weather model grid",
        coverage: "Global numerical forecast models (ECMWF, GFS, ICON)",
        license: "CC BY 4.0",
        limitations: "Derived from numerical weather prediction models; not an on-site thermal sensor."
      });
    }

    if (weather.precipitation !== null) {
      evidence.push({
        id: "ev-weather-precip",
        category: "weather",
        title: "Modeled Precipitation",
        value: weather.precipitation,
        unit: weather.units.precipitation || "mm",
        classification: "provider_model",
        provider: "Open-Meteo Weather API",
        sourceUrl: "https://open-meteo.com/",
        retrievedAt: generatedAt,
        observedAt: weather.observedTime || undefined,
        limitations: "Hourly modeled precipitation, not local rain-gauge measurement."
      });
    }

    if (weather.elevationMeters !== null) {
      evidence.push({
        id: "ev-topography-elevation",
        category: "topography",
        title: "Terrain Elevation Estimate",
        value: weather.elevationMeters,
        unit: "meters",
        classification: "provider_model",
        provider: "Open-Meteo / Copernicus DEM",
        sourceUrl: "https://open-meteo.com/",
        retrievedAt: generatedAt,
        geographicResolution: "90 m digital elevation model (DEM)",
        coverage: "Global",
        limitations: "Topographic surface elevation model. Does not capture micro-drainage slope or basement depression risk."
      });
    }
  } else {
    unknowns.push("Current weather and temperature data was unavailable from the numerical forecast provider.");
  }

  // 3. Air Quality Evidence
  if (airQuality && airQuality.europeanAqi !== null) {
    evidence.push({
      id: "ev-aqi-eu",
      category: "air_quality",
      title: "Modeled European Air Quality Index (AQI)",
      value: airQuality.europeanAqi,
      unit: "index (1-100+)",
      classification: "provider_model",
      provider: "Open-Meteo Air Quality (CAMS / Copernicus)",
      sourceUrl: "https://open-meteo.com/en/docs/air-quality-api",
      retrievedAt: generatedAt,
      observedAt: airQuality.observedTime || undefined,
      geographicResolution: "0.1 degree Copernicus CAMS reanalysis grid",
      coverage: "Global atmospheric reanalysis",
      limitations: "Grid-cell reanalysis model; does not account for street-canyon traffic spikes or immediate diesel generator exhaust."
    });

    if (airQuality.pm25 !== null) {
      evidence.push({
        id: "ev-aqi-pm25",
        category: "air_quality",
        title: "Modeled Fine Particulate Matter (PM2.5)",
        value: airQuality.pm25,
        unit: airQuality.units.pm2_5 || "µg/m³",
        classification: "provider_model",
        provider: "Open-Meteo Air Quality",
        sourceUrl: "https://open-meteo.com/",
        retrievedAt: generatedAt,
        limitations: "Atmospheric grid model estimate."
      });
    }
  } else {
    unknowns.push("Continuous air quality monitoring is unavailable for this coordinate in public open feeds.");
  }

  // 4. Nearby Amenities Evidence
  if (amenities) {
    evidence.push({
      id: "ev-amenity-total",
      category: "civic",
      title: amenities.resultLimitReached
        ? `Mapped Amenity Sample (response cap reached) within ~${amenities.radiusMeters}m`
        : `Mapped Amenities within ~${amenities.radiusMeters}m`,
      value: amenities.totalCount,
      unit: amenities.resultLimitReached ? "valid-coordinate features in capped response" : "features",
      classification: "observed",
      provider: "OpenStreetMap via Overpass API",
      sourceUrl: "https://overpass-api.de/",
      retrievedAt: generatedAt,
      geographicResolution: "Coordinate radius search",
      coverage: "Crowdsourced OpenStreetMap database",
      license: "ODbL",
      limitations: amenities.resultLimitReached
        ? "The upstream response reached its 100-element cap. This is a partial sample: total/category counts and nearest-facility results may be incomplete. Absence from this sample does not prove a facility is absent."
        : "Crowdsourced map completeness varies by locality. Absence of a mapped amenity does not prove it does not exist."
    });

    if (amenities.resultLimitReached) {
      unknowns.push("The Overpass response reached its 100-element output cap; category counts and nearest-facility distances are unverified for this partial sample.");
    }

    // Closest Transit
    if (amenities.nearest.transit) {
      evidence.push({
        id: "ev-transit-nearest",
        category: "transit",
        title: "Nearest Mapped Public Transit",
        value: `${amenities.nearest.transit.name} (${amenities.nearest.transit.distanceMeters}m)`,
        unit: "meters",
        classification: "calculated",
        provider: "Infracis Haversine Calculation over OSM",
        sourceUrl: "https://www.openstreetmap.org/",
        retrievedAt: generatedAt,
        limitations: "Great-circle straight-line distance; actual pedestrian walking path may be longer depending on barriers/enclosures."
      });
    } else {
      unknowns.push(amenities.resultLimitReached
        ? "Nearest public transit could not be verified because the mapped amenity response was capped."
        : "No public transit stops (bus, metro, rail) are mapped within 1.2 km in OpenStreetMap.");
    }

    // Closest Healthcare
    if (amenities.nearest.healthcare) {
      evidence.push({
        id: "ev-health-nearest",
        category: "healthcare",
        title: "Nearest Mapped Healthcare Facility",
        value: `${amenities.nearest.healthcare.name} (${amenities.nearest.healthcare.distanceMeters}m)`,
        unit: "meters",
        classification: "calculated",
        provider: "Infracis Haversine Calculation over OSM",
        sourceUrl: "https://www.openstreetmap.org/",
        retrievedAt: generatedAt,
        limitations: "Straight-line distance. Does not verify whether clinic is currently open, staffing levels, or ICU capability."
      });
    } else {
      unknowns.push(amenities.resultLimitReached
        ? "Nearest healthcare facility could not be verified because the mapped amenity response was capped."
        : "No hospitals or clinics are recorded within 1.2 km in OpenStreetMap.");
    }

    // Closest Education
    if (amenities.nearest.education) {
      evidence.push({
        id: "ev-edu-nearest",
        category: "education",
        title: "Nearest Mapped Educational Facility",
        value: `${amenities.nearest.education.name} (${amenities.nearest.education.distanceMeters}m)`,
        unit: "meters",
        classification: "calculated",
        provider: "Infracis Haversine Calculation over OSM",
        sourceUrl: "https://www.openstreetmap.org/",
        retrievedAt: generatedAt,
        limitations: "Straight-line distance. Does not evaluate school board accreditation, admissions, or quality."
      });
    } else {
      unknowns.push(amenities.resultLimitReached
        ? "Nearest education facility could not be verified because the mapped amenity response was capped."
        : "No schools or education facilities are mapped within 1.2 km.");
    }

    // Closest Essentials
    if (amenities.nearest.essentials) {
      evidence.push({
        id: "ev-essentials-nearest",
        category: "essentials",
        title: "Nearest Daily Grocery / Supermarket / Pharmacy",
        value: `${amenities.nearest.essentials.name} (${amenities.nearest.essentials.distanceMeters}m)`,
        unit: "meters",
        classification: "calculated",
        provider: "Infracis Haversine Calculation over OSM",
        sourceUrl: "https://www.openstreetmap.org/",
        retrievedAt: generatedAt,
        limitations: "Straight-line distance. Commercial inventory and hours are not tracked."
      });
    }
  } else {
    unknowns.push("Amenity mapping data could not be retrieved from the Overpass service.");
  }

  // 5. Environmental & Legal Unknowns (Critical for due diligence)
  unknowns.push("Historical urban waterlogging / monsoon drain overflow records require local municipality verification.");
  unknowns.push("Drinking water supply source (municipal piped vs. groundwater borewell vs. private tanker) is unrecorded in open geospatial layers.");
  unknowns.push("Property ownership title, land use zoning approvals, and layout building sanction cannot be certified by mapping tools.");
  unknowns.push("Nighttime noise levels and commercial vehicular traffic density cannot be observed from static maps.");

  // Deterministic Step-Function Scoring
  const transitScore = calculateProximityScore(amenities?.nearest.transit?.distanceMeters, 400, 1500);
  const healthcareScore = calculateProximityScore(amenities?.nearest.healthcare?.distanceMeters, 600, 2500);
  const educationScore = calculateProximityScore(amenities?.nearest.education?.distanceMeters, 800, 3000);
  const essentialsScore = calculateProximityScore(amenities?.nearest.essentials?.distanceMeters, 500, 2000);

  const completenessScore = calculateDataCompleteness({
    hasCoordinates: true,
    hasWeather: Boolean(weather && weather.temperature !== null),
    hasAirQuality: Boolean(airQuality && airQuality.europeanAqi !== null),
    // A capped Overpass response is a partial sample, not a verified amenities dimension.
    hasAmenities: Boolean(amenities && !amenities.resultLimitReached),
    hasElevation: Boolean(weather && weather.elevationMeters !== null)
  });

  const calculationFormulas = {
    transitAccessibilityScore: "Linear decay: 100 if transit <= 400m; 0 if >= 1500m; straight-line distance.",
    dailyConvenienceScore: "Linear decay: 100 if grocery/supermarket <= 500m; 0 if >= 2000m.",
    healthcareAccessScore: "Linear decay: 100 if hospital/clinic <= 600m; 0 if >= 2500m.",
    educationAccessScore: "Linear decay: 100 if school <= 800m; 0 if >= 3000m.",
    completenessScore: "Available dimensions (coords, weather, air quality, uncapped amenities, elevation) / 5 * 100%"
  };

  const checklist = generateDueDiligenceChecklist(location, weather, airQuality, amenities);
  const findings = generateGroundedFindings(location, weather, airQuality, amenities, evidence);

  const sources: LocationReport["sources"] = [
    {
      name: "OpenStreetMap Nominatim",
      url: "https://nominatim.openstreetmap.org/",
      retrievedAt: generatedAt,
      status: "available",
      license: "ODbL (Open Database License)",
      note: "Location geocoding and centroid matching."
    },
    {
      name: "OpenStreetMap via Overpass",
      url: "https://overpass-api.de/",
      retrievedAt: generatedAt,
      status: amenities ? "available" : "unavailable",
      license: "ODbL",
      note: `Bounded amenity and transit point search within ~${amenities?.radiusMeters || 1200}m${amenities?.resultLimitReached ? "; response cap reached, sample incomplete" : ""}.`
    },
    {
      name: "Open-Meteo Weather Model",
      url: "https://open-meteo.com/",
      retrievedAt: generatedAt,
      status: weather ? "available" : "unavailable",
      license: "CC BY 4.0",
      note: "Current numerical weather forecast output for the coordinate."
    },
    {
      name: "Open-Meteo / Copernicus Air Quality",
      url: "https://air-quality-api.open-meteo.com/",
      retrievedAt: generatedAt,
      status: airQuality ? "available" : "unavailable",
      license: "CC BY 4.0 / Copernicus Open Access",
      note: "Atmospheric reanalysis model for AQI, PM2.5, and PM10."
    }
  ];

  const limitations = [
    "Infracis provides location context analysis; it is NOT an engineering survey, structural report, legal title check, or financial valuation.",
    "Straight-line (great-circle) distances do not reflect physical roadblocks, gated community walls, or terrain contours.",
    "OpenStreetMap data is community-curated; absence of a feature does not establish non-existence.",
    "Weather and Air Quality values represent regional grid-model outputs, not micro-climate on-property sensors.",
    "Buyers and renters must verify legal encumbrances, water connection authenticity, and municipal property tax receipts directly."
  ];

  return {
    id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    generatedAt,
    location,
    weather,
    airQuality,
    amenities,
    evidence,
    scores: {
      completenessScore,
      transitAccessibilityScore: transitScore,
      dailyConvenienceScore: essentialsScore,
      healthcareAccessScore: healthcareScore,
      educationAccessScore: educationScore,
      calculationFormulas
    },
    findings,
    unknowns,
    checklist,
    sources,
    limitations
  };
}
