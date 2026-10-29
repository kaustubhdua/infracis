export const NASA_GIBS_LAYER = "VIIRS_SNPP_CorrectedReflectance_TrueColor";

/** NASA GIBS imagery is publicly served; this map layer does not need NASA_API_KEY. */
export function nasaGibsTileUrl(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("NASA GIBS tile date must be a real calendar date in YYYY-MM-DD format.");
  }
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) {
    throw new Error("NASA GIBS tile date must be a real calendar date in YYYY-MM-DD format.");
  }
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${NASA_GIBS_LAYER}/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`;
}

/** Avoid switching basemaps for a few missing tiles; fallback only if no tile loaded. */
export function shouldFallbackFromNasaTiles(successfulTiles: number, failedTiles: number): boolean {
  return successfulTiles === 0 && failedTiles >= 4;
}
