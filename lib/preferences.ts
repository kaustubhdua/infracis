import type { PreferenceProfile } from "./types";

/**
 * Small, non-sensitive UI preferences stored in ONE first-party cookie.
 * Full reports and private reviews stay in localStorage because cookies are
 * size-limited and are sent with every request.
 */

export const PREFS_COOKIE = "infracis_prefs";
export const MAX_RECENT_SEARCHES = 6;
const MAX_COOKIE_VALUE_LENGTH = 3000;

export const UI_THEMES = ["original", "ux4g-white", "ux4g-dark"] as const;
export type UiTheme = (typeof UI_THEMES)[number];

export const MAP_THEMES = ["voyager", "dark", "satellite", "terrain", "nasa-true", "nasa-night"] as const;
export type MapTheme = (typeof MAP_THEMES)[number];

const PROFILES: PreferenceProfile[] = ["balanced", "family", "transit", "healthcare", "quiet"];

export interface Preferences {
  v: 1;
  /** When false nothing but this flag is written to the cookie. */
  remember: boolean;
  uiTheme: UiTheme;
  mapTheme: MapTheme;
  profile: PreferenceProfile;
  recent: string[];
  compare: { a: string; b: string } | null;
}

export const DEFAULT_PREFERENCES: Preferences = {
  v: 1,
  remember: true,
  uiTheme: "original",
  mapTheme: "voyager",
  profile: "balanced",
  recent: [],
  compare: null
};

function cleanQuery(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
  return cleaned.length >= 3 ? cleaned : null;
}

/** Validate untrusted cookie content; anything unexpected falls back to defaults. */
export function parsePreferences(raw: unknown): Preferences {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_PREFERENCES };
  const input = raw as Record<string, unknown>;
  const remember = input.remember !== false;
  if (!remember) return { ...DEFAULT_PREFERENCES, remember: false };

  const recent: string[] = [];
  if (Array.isArray(input.recent)) {
    for (const item of input.recent) {
      const cleaned = cleanQuery(item);
      if (cleaned && !recent.some((existing) => existing.toLowerCase() === cleaned.toLowerCase())) recent.push(cleaned);
      if (recent.length >= MAX_RECENT_SEARCHES) break;
    }
  }

  let compare: Preferences["compare"] = null;
  if (input.compare && typeof input.compare === "object" && !Array.isArray(input.compare)) {
    const pair = input.compare as Record<string, unknown>;
    const a = cleanQuery(pair.a);
    const b = cleanQuery(pair.b);
    if (a && b) compare = { a, b };
  }

  return {
    v: 1,
    remember: true,
    uiTheme: UI_THEMES.includes(input.uiTheme as UiTheme) ? (input.uiTheme as UiTheme) : DEFAULT_PREFERENCES.uiTheme,
    mapTheme: MAP_THEMES.includes(input.mapTheme as MapTheme) ? (input.mapTheme as MapTheme) : DEFAULT_PREFERENCES.mapTheme,
    profile: PROFILES.includes(input.profile as PreferenceProfile) ? (input.profile as PreferenceProfile) : DEFAULT_PREFERENCES.profile,
    recent,
    compare
  };
}

function readCookieValue(cookieString: string, name: string): string | null {
  for (const part of cookieString.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) return trimmed.slice(name.length + 1);
  }
  return null;
}

/** Pure helper (testable): parse preferences from a `document.cookie` string, migrating the older single-purpose cookies. */
export function readPreferencesFromCookieString(cookieString: string): Preferences {
  const value = readCookieValue(cookieString, PREFS_COOKIE);
  if (value) {
    try {
      return parsePreferences(JSON.parse(decodeURIComponent(value)));
    } catch {
      return { ...DEFAULT_PREFERENCES };
    }
  }

  // Migrate cookies written by earlier versions.
  const legacy: Partial<Preferences> = {};
  const legacyMap = readCookieValue(cookieString, "infracis_map_style");
  if (legacyMap === "satellite") legacy.mapTheme = "satellite";
  const legacyProfile = readCookieValue(cookieString, "infracis_analysis_profile");
  if (legacyProfile && PROFILES.includes(legacyProfile as PreferenceProfile)) legacy.profile = legacyProfile as PreferenceProfile;
  return { ...DEFAULT_PREFERENCES, ...legacy };
}

/** Serialise, trimming the oldest recent searches until the value fits comfortably in a cookie. */
export function serializePreferences(prefs: Preferences): string {
  if (!prefs.remember) return encodeURIComponent(JSON.stringify({ v: 1, remember: false }));
  const working: Preferences = { ...prefs, recent: [...prefs.recent] };
  let encoded = encodeURIComponent(JSON.stringify(working));
  while (encoded.length > MAX_COOKIE_VALUE_LENGTH && working.recent.length > 0) {
    working.recent.pop();
    encoded = encodeURIComponent(JSON.stringify(working));
  }
  if (encoded.length > MAX_COOKIE_VALUE_LENGTH) {
    working.compare = null;
    encoded = encodeURIComponent(JSON.stringify(working));
  }
  return encoded;
}

/** Add a search to the front of the recent list (case-insensitive de-duplication, bounded length). */
export function addRecentSearch(recent: string[], query: string): string[] {
  const cleaned = cleanQuery(query);
  if (!cleaned || /^coordinates\s/i.test(cleaned)) return recent;
  const without = recent.filter((item) => item.toLowerCase() !== cleaned.toLowerCase());
  return [cleaned, ...without].slice(0, MAX_RECENT_SEARCHES);
}

// ---- Browser helpers (no-ops during server rendering) ----

export function loadPreferences(): Preferences {
  if (typeof document === "undefined") return { ...DEFAULT_PREFERENCES };
  let prefs = readPreferencesFromCookieString(document.cookie);
  // Migrate the theme that earlier versions kept only in localStorage.
  if (!readCookieValue(document.cookie, PREFS_COOKIE)) {
    try {
      const legacyTheme = window.localStorage.getItem("infracis-theme");
      if (UI_THEMES.includes(legacyTheme as UiTheme)) prefs = { ...prefs, uiTheme: legacyTheme as UiTheme };
    } catch { /* storage may be blocked */ }
  }
  return prefs;
}

export function savePreferences(prefs: Preferences): boolean {
  if (typeof document === "undefined") return false;
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${PREFS_COOKIE}=${serializePreferences(prefs)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    return readCookieValue(document.cookie, PREFS_COOKIE) !== null;
  } catch {
    return false;
  }
}

/** Remove the preferences cookie plus the cookies written by earlier versions. */
export function clearPreferences(): void {
  if (typeof document === "undefined") return;
  const expire = "Path=/; Max-Age=0; SameSite=Lax";
  for (const name of [PREFS_COOKIE, "infracis_map_style", "infracis_analysis_profile"]) {
    document.cookie = `${name}=; ${expire}`;
  }
}
