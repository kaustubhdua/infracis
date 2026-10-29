const CARTO_VOYAGER_TEMPLATE =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

/**
 * CARTO basemaps require a project-owned key. This is intentionally a public
 * browser key, so restrict it to the application's production/preview hosts
 * in the CARTO dashboard. Never use a CARTO master or private data API token.
 */
export function cartoVoyagerTileUrl(apiKey?: string | null): string | null {
  const key = apiKey?.trim();
  if (!key) return null;

  const separator = CARTO_VOYAGER_TEMPLATE.includes("?") ? "&" : "?";
  return `${CARTO_VOYAGER_TEMPLATE}${separator}key=${encodeURIComponent(key)}`;
}
