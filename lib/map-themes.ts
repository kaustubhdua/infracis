import type { MapTheme } from "./preferences";
import { cartoVoyagerTileUrl } from "./carto-tiles";

export interface MapThemeConfig {
  id: MapTheme;
  label: string;
  description: string;
  /** Leaflet tile URL template. `{date}` is replaced for NASA GIBS time-varying layers. */
  url: string;
  attribution: string;
  maxZoom: number;
  maxNativeZoom?: number;
  subdomains?: string;
  /** Optional labels-only overlay drawn above imagery. */
  labelsUrl?: string;
  /** Dark base map: UI chrome and popups switch to a dark treatment. */
  dark?: boolean;
  /** NASA Earth-observation themes are regional context; zoom is capped to the imagery's native resolution. */
  nasa?: boolean;
  /** Highest zoom at which this theme is still useful. */
  contextZoom?: number;
}

const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';
const CARTO_ATTRIBUTION = `${OSM_ATTRIBUTION} &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>`;
const NASA_ATTRIBUTION = 'Imagery: <a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noreferrer">NASA EOSDIS GIBS</a>';
const GIBS_BASE = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

const ESRI_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, FAO, NOAA, USGS, OpenStreetMap contributors';
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

/**
 * CARTO's public basemaps now require a project key, so every default theme uses
 * keyless Esri tiles. The Clean theme upgrades to CARTO Voyager only when the
 * (public, domain-restricted) NEXT_PUBLIC_CARTO_API_KEY is configured.
 */
const CARTO_VOYAGER_URL = cartoVoyagerTileUrl(process.env.NEXT_PUBLIC_CARTO_API_KEY);

/** Keyless place-name / boundary overlay drawn above satellite and NASA imagery. */
export const LABELS_OVERLAY_URL = `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`;

export const MAP_THEME_CONFIGS: Record<MapTheme, MapThemeConfig> = {
  voyager: {
    id: "voyager",
    label: "Clean",
    description: "Soft, readable street map",
    url: CARTO_VOYAGER_URL ?? `${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    attribution: CARTO_VOYAGER_URL ? CARTO_ATTRIBUTION : ESRI_ATTRIBUTION,
    maxZoom: CARTO_VOYAGER_URL ? 20 : 19,
    maxNativeZoom: CARTO_VOYAGER_URL ? undefined : 16,
    subdomains: CARTO_VOYAGER_URL ? "abcd" : undefined,
    labelsUrl: undefined
  },
  dark: {
    id: "dark",
    label: "Dark",
    description: "Low-glare night style",
    url: `${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    attribution: ESRI_ATTRIBUTION,
    maxZoom: 19,
    maxNativeZoom: 16,
    dark: true
  },
  satellite: {
    id: "satellite",
    label: "Satellite",
    description: "High-resolution aerial imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics and the GIS User Community',
    maxZoom: 19,
    labelsUrl: LABELS_OVERLAY_URL,
    dark: true
  },
  terrain: {
    id: "terrain",
    label: "Terrain",
    description: "Contours and relief",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: `Map data: ${OSM_ATTRIBUTION}, <a href="https://viewfinderpanoramas.org" target="_blank" rel="noreferrer">SRTM</a> | Style: <a href="https://opentopomap.org" target="_blank" rel="noreferrer">OpenTopoMap</a>`,
    maxZoom: 17,
    subdomains: "abc"
  },
  "nasa-true": {
    id: "nasa-true",
    label: "NASA Earth",
    description: "Daily true-colour satellite view (regional context)",
    url: `${GIBS_BASE}/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/{date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    attribution: `${NASA_ATTRIBUTION} · VIIRS true colour`,
    maxZoom: 9,
    maxNativeZoom: 9,
    labelsUrl: LABELS_OVERLAY_URL,
    nasa: true,
    contextZoom: 9,
    dark: true
  },
  "nasa-night": {
    id: "nasa-night",
    label: "NASA Night",
    description: "Earth at night — urban light footprint",
    url: `${GIBS_BASE}/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png`,
    attribution: `${NASA_ATTRIBUTION} · Black Marble night lights`,
    maxZoom: 8,
    maxNativeZoom: 8,
    labelsUrl: LABELS_OVERLAY_URL,
    nasa: true,
    contextZoom: 8,
    dark: true
  }
};

export const MAP_THEME_ORDER: MapTheme[] = ["voyager", "dark", "satellite", "terrain", "nasa-true", "nasa-night"];

/** Near-real-time NASA products can lag ingestion by a day or more, so request imagery from two days ago (UTC). */
export function nasaImageryDate(now: number = Date.now()): string {
  return new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function resolveThemeUrl(config: MapThemeConfig, now: number = Date.now()): string {
  return config.url.replace("{date}", nasaImageryDate(now));
}
