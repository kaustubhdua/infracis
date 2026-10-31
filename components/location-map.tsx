"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type L from "leaflet";
import {
  AlertTriangle,
  Globe,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Moon,
  Mountain,
  Satellite,
  Sparkles
} from "lucide-react";
import type { AmenityItem, LocationData } from "@/lib/types";
import { escapeHtml } from "@/lib/escape-html";
import { calculateHaversineDistance } from "@/lib/geo";
import {
  LABELS_OVERLAY_URL,
  MAP_THEME_CONFIGS,
  MAP_THEME_ORDER,
  nasaImageryDate,
  resolveThemeUrl
} from "@/lib/map-themes";
import type { MapTheme } from "@/lib/preferences";
import { usePreferences } from "@/lib/use-preferences";

const EMPTY_AMENITIES: AmenityItem[] = [];
const INDIA_CENTER: [number, number] = [22.9734, 78.6569];
const SEARCH_RADIUS_METERS = 1200;

const THEME_ICONS: Record<MapTheme, typeof MapIcon> = {
  voyager: MapIcon,
  dark: Moon,
  satellite: Satellite,
  terrain: Mountain,
  "nasa-true": Globe,
  "nasa-night": Sparkles
};

const GROUPS = [
  { key: "transit", label: "Transit", color: "#2f7bd9" },
  { key: "healthcare", label: "Healthcare", color: "#e0525a" },
  { key: "education", label: "Education", color: "#2a9d6b" },
  { key: "essentials", label: "Essentials", color: "#e69a2c" },
  { key: "civic", label: "Civic", color: "#8a63c9" }
] as const;
type GroupKey = (typeof GROUPS)[number]["key"];

interface LocationMapProps {
  /** Primary location. When omitted the map shows India and waits for a click. */
  location?: LocationData;
  /** Second location for side-by-side comparison. */
  secondary?: LocationData;
  amenities?: AmenityItem[];
  title?: string;
  onPickCoordinates?: (lat: number, lon: number) => void;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

export default function LocationMap({
  location,
  secondary,
  amenities = EMPTY_AMENITIES,
  title,
  onPickCoordinates
}: LocationMapProps) {
  const { prefs, update } = usePreferences();
  const theme = prefs.mapTheme;
  const config = MAP_THEME_CONFIGS[theme];

  const containerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof L | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseRef = useRef<L.TileLayer | null>(null);
  const labelsRef = useRef<L.TileLayer | null>(null);
  const pinLayerRef = useRef<L.LayerGroup | null>(null);
  const radiusLayerRef = useRef<L.LayerGroup | null>(null);
  const amenityLayerRef = useRef<L.LayerGroup | null>(null);
  const pickHandlerRef = useRef(onPickCoordinates);
  const initialLocationRef = useRef(location);
  const cappedFromZoomRef = useRef<number | null>(null);
  const tileErrorCountRef = useRef(0);

  const [mapReady, setMapReady] = useState(false);
  const [mapRetry, setMapRetry] = useState(0);
  const [mapError, setMapError] = useState("");
  const [tileError, setTileError] = useState(false);
  const [showRadius, setShowRadius] = useState(true);
  const [hiddenGroups, setHiddenGroups] = useState<GroupKey[]>([]);

  useEffect(() => { pickHandlerRef.current = onPickCoordinates; }, [onPickCoordinates]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of amenities) counts[item.group] = (counts[item.group] || 0) + 1;
    return counts;
  }, [amenities]);

  // 1) Create the Leaflet map once. It stays alive while the location changes.
  useEffect(() => {
    let cancelled = false;
    let map: L.Map | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    async function initialize() {
      if (!containerRef.current) return;
      try {
        const leaflet = (await import("leaflet")).default;
        if (cancelled || !containerRef.current) return;
        leafletRef.current = leaflet;

        const start = initialLocationRef.current;
        map = leaflet.map(containerRef.current, {
          zoomControl: false,
          preferCanvas: true,
          scrollWheelZoom: true,
          minZoom: 3,
          worldCopyJump: true
        }).setView(start ? [start.latitude, start.longitude] : INDIA_CENTER, start ? 14 : 5);
        mapRef.current = map;
        leaflet.control.zoom({ position: "topright" }).addTo(map);
        leaflet.control.scale({ position: "bottomleft", imperial: false }).addTo(map);

        radiusLayerRef.current = leaflet.layerGroup().addTo(map);
        amenityLayerRef.current = leaflet.layerGroup().addTo(map);
        pinLayerRef.current = leaflet.layerGroup().addTo(map);

        map.on("click", (event: L.LeafletMouseEvent) => {
          pickHandlerRef.current?.(event.latlng.lat, event.latlng.lng);
        });

        resizeObserver = new ResizeObserver(() => {
          if (!map || cancelled) return;
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => map?.invalidateSize({ pan: false }), 80);
        });
        resizeObserver.observe(containerRef.current);

        setMapError("");
        setMapReady(true);
        requestAnimationFrame(() => map?.invalidateSize({ pan: false }));
      } catch {
        if (!cancelled) setMapError("The interactive map could not load. Check your connection and try again.");
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      map?.remove();
      mapRef.current = null;
      baseRef.current = null;
      labelsRef.current = null;
      pinLayerRef.current = null;
      radiusLayerRef.current = null;
      amenityLayerRef.current = null;
      setMapReady(false);
    };
  }, [mapRetry]);

  // 2) Apply the selected theme (base tiles, optional labels overlay, NASA zoom cap).
  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet || !mapReady) return;

    tileErrorCountRef.current = 0;
    setTileError(false);
    if (baseRef.current) map.removeLayer(baseRef.current);
    if (labelsRef.current) map.removeLayer(labelsRef.current);
    baseRef.current = null;
    labelsRef.current = null;

    const base = leaflet.tileLayer(resolveThemeUrl(config), {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      maxNativeZoom: config.maxNativeZoom,
      subdomains: config.subdomains ?? "abc",
      keepBuffer: 3,
      updateWhenIdle: true
    });
    base.on("tileerror", () => {
      tileErrorCountRef.current += 1;
      if (tileErrorCountRef.current >= 3) setTileError(true);
    });
    base.addTo(map);
    base.bringToBack();
    baseRef.current = base;

    if (config.labelsUrl) {
      const labels = leaflet.tileLayer(config.labelsUrl || LABELS_OVERLAY_URL, {
        maxZoom: 20,
        subdomains: "abcd",
        pane: "shadowPane",
        opacity: 0.9
      });
      labels.addTo(map);
      labelsRef.current = labels;
    }

    if (config.nasa && config.contextZoom) {
      const zoom = map.getZoom();
      if (zoom > config.contextZoom && cappedFromZoomRef.current === null) cappedFromZoomRef.current = zoom;
      map.setMaxZoom(config.contextZoom);
    } else {
      map.setMaxZoom(config.maxZoom);
      if (cappedFromZoomRef.current !== null) {
        map.setZoom(cappedFromZoomRef.current, { animate: !prefersReducedMotion() });
        cappedFromZoomRef.current = null;
      }
    }

    containerRef.current?.classList.toggle("ix-map--dark", config.dark === true);
  }, [theme, config, mapReady]);

  // 3) Place the location pin(s) and move the view when the location changes.
  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    const layer = pinLayerRef.current;
    if (!map || !leaflet || !layer || !mapReady) return;
    layer.clearLayers();
    if (!location) return;

    const makeIcon = (kind: "primary" | "secondary" | "single", letter: string) => leaflet.divIcon({
      className: "ix-pin-wrap",
      html: `<span class="ix-pin ix-pin--${kind}"><span class="ix-pin__pulse"></span><span class="ix-pin__core">${
        kind === "single"
          ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'
          : escapeHtml(letter)
      }</span></span>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -22]
    });
    const popup = (heading: string, place: LocationData) =>
      `<div class="ix-popup"><strong>${escapeHtml(heading)}</strong><span>${escapeHtml(place.label)}</span><small>${place.latitude.toFixed(5)}, ${place.longitude.toFixed(5)}</small></div>`;

    leaflet.marker([location.latitude, location.longitude], { icon: makeIcon(secondary ? "primary" : "single", "A"), zIndexOffset: 800 })
      .addTo(layer)
      .bindPopup(popup(secondary ? "Location A" : "Investigated location", location));

    const animate = !prefersReducedMotion();
    if (secondary) {
      leaflet.marker([secondary.latitude, secondary.longitude], { icon: makeIcon("secondary", "B"), zIndexOffset: 700 })
        .addTo(layer)
        .bindPopup(popup("Location B", secondary));
      const kilometres = calculateHaversineDistance(location.latitude, location.longitude, secondary.latitude, secondary.longitude) / 1000;
      leaflet.polyline(
        [[location.latitude, location.longitude], [secondary.latitude, secondary.longitude]],
        { color: "#e8a23a", weight: 3, opacity: 0.9, dashArray: "6 8" }
      ).addTo(layer).bindTooltip(`${kilometres.toFixed(1)} km apart (straight line)`, { permanent: true, direction: "center", className: "ix-map-tooltip" });
      const bounds = leaflet.latLngBounds([[location.latitude, location.longitude], [secondary.latitude, secondary.longitude]]);
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 14, animate });
    } else {
      const zoom = config.nasa && config.contextZoom ? Math.min(config.contextZoom, 9) : Math.max(map.getZoom(), 14);
      if (animate) map.flyTo([location.latitude, location.longitude], zoom, { duration: 0.9 });
      else map.setView([location.latitude, location.longitude], zoom, { animate: false });
    }
    // The view should move only when the place changes, not when the theme does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.latitude, location?.longitude, location?.label, secondary?.latitude, secondary?.longitude, secondary?.label, mapReady]);

  // 4) The ~1.2 km analysis radius.
  useEffect(() => {
    const layer = radiusLayerRef.current;
    const leaflet = leafletRef.current;
    if (!layer || !leaflet || !mapReady) return;
    layer.clearLayers();
    if (!showRadius) return;
    for (const place of [location, secondary]) {
      if (!place) continue;
      leaflet.circle([place.latitude, place.longitude], {
        radius: SEARCH_RADIUS_METERS,
        color: place === secondary ? "#e8a23a" : "#1f8a64",
        weight: 1.5,
        opacity: 0.8,
        fillOpacity: 0.07,
        interactive: false
      }).addTo(layer);
    }
  }, [location?.latitude, location?.longitude, secondary?.latitude, secondary?.longitude, showRadius, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // 5) Amenity markers, filtered by the legend toggles.
  useEffect(() => {
    const layer = amenityLayerRef.current;
    const leaflet = leafletRef.current;
    if (!layer || !leaflet || !mapReady) return;
    layer.clearLayers();
    const colors = Object.fromEntries(GROUPS.map((group) => [group.key, group.color])) as Record<string, string>;
    for (const item of amenities) {
      if (item.lat === null || item.lon === null ||
          !Number.isFinite(item.lat) || !Number.isFinite(item.lon) ||
          item.lat < -90 || item.lat > 90 || item.lon < -180 || item.lon > 180) continue;
      if (hiddenGroups.includes(item.group as GroupKey)) continue;
      const color = colors[item.group] || "#687b8d";
      const icon = leaflet.divIcon({
        className: "ix-dot-wrap",
        html: `<span class="ix-dot" style="--dot:${color}"></span>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      leaflet.marker([item.lat, item.lon], { icon })
        .addTo(layer)
        .bindTooltip(escapeHtml(item.name), { direction: "top", offset: [0, -8], className: "ix-map-tooltip" })
        .bindPopup(`<div class="ix-popup"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.group)} · ${escapeHtml(item.category.replace(/_/g, " "))}</span><small>~${Math.max(0, Math.round(item.distanceMeters))} m straight-line distance</small></div>`);
    }
  }, [amenities, hiddenGroups, mapReady]);

  const recenter = useCallback(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet) return;
    const animate = !prefersReducedMotion();
    if (location && secondary) {
      map.fitBounds(
        leaflet.latLngBounds([[location.latitude, location.longitude], [secondary.latitude, secondary.longitude]]),
        { padding: [70, 70], maxZoom: 14, animate }
      );
    } else if (location) {
      map.setView([location.latitude, location.longitude], Math.min(map.getMaxZoom(), 14), { animate });
    } else {
      map.setView(INDIA_CENTER, 5, { animate });
    }
  }, [location, secondary]);

  const retryMap = useCallback(() => {
    setMapError("");
    setTileError(false);
    tileErrorCountRef.current = 0;
    if (!mapRef.current) {
      setMapRetry((value) => value + 1);
      return;
    }
    mapRef.current.invalidateSize({ pan: false });
    baseRef.current?.redraw();
  }, []);

  const toggleGroup = (key: GroupKey) =>
    setHiddenGroups((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));

  const heading = title ?? (secondary ? "Both locations on the map" : location ? "Location intelligence map" : "Pick a point to investigate");
  const subheading = secondary
    ? `${location?.label ?? ""} · ${secondary.label}`
    : location?.label ?? "Click anywhere on the map, or search above";

  return (
    <section className="ix-card overflow-hidden" aria-label="Location map">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--ix-line)] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="ix-icon-badge"><MapPin size={19} aria-hidden="true" /></span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[color:var(--ix-ink)]">{heading}</h3>
            <p className="truncate text-xs text-[color:var(--ix-muted)]">{subheading}</p>
          </div>
        </div>
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-[color:var(--ix-line)] bg-[color:var(--ix-surface-2)] p-1" role="group" aria-label="Map theme">
          {MAP_THEME_ORDER.map((id) => {
            const Icon = THEME_ICONS[id];
            const active = theme === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                title={MAP_THEME_CONFIGS[id].description}
                onClick={() => update({ mapTheme: id })}
                className={`ix-chip-btn ${active ? "ix-chip-btn--active" : ""}`}
              >
                <Icon size={14} aria-hidden="true" /> {MAP_THEME_CONFIGS[id].label}
              </button>
            );
          })}
        </div>
      </div>

      {mapError && (
        <div role="alert" className="flex items-start gap-2 border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" /><span>{mapError}</span>
          <button type="button" className="ml-auto underline" onClick={retryMap}>Retry</button>
        </div>
      )}
      {tileError && !mapError && (
        <div role="status" className="flex flex-wrap items-center gap-2 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          Some map tiles did not load for the {config.label} theme.
          <button type="button" onClick={retryMap} className="underline">Retry tiles</button>
          {theme !== "voyager" && <button type="button" onClick={() => update({ mapTheme: "voyager" })} className="underline">Use the Clean map</button>}
        </div>
      )}

      <div className="relative">
        <div ref={containerRef} className="ix-map h-[360px] w-full sm:h-[460px]" />
        {!mapReady && !mapError && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[color:var(--ix-surface-2)] text-sm text-[color:var(--ix-muted)]">Loading interactive map…</div>
        )}
        <div className="absolute bottom-3 right-3 z-[500] flex flex-col gap-2">
          <button type="button" onClick={recenter} aria-label="Re-centre map" className="ix-map-fab"><LocateFixed size={16} aria-hidden="true" /></button>
        </div>
        {!location && !secondary && (
          <div className="pointer-events-none absolute left-3 top-3 z-[500] max-w-[15rem] rounded-xl border border-[color:var(--ix-line)] bg-[color:var(--ix-surface)] px-3 py-2 text-xs text-[color:var(--ix-ink-2)] shadow-lg backdrop-blur">
            Tap or click any point to run an investigation for it.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--ix-line)] px-4 py-3 text-[11px] text-[color:var(--ix-muted)] sm:px-5">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Amenity layers">
          {GROUPS.map((group) => {
            const count = groupCounts[group.key] ?? 0;
            const hidden = hiddenGroups.includes(group.key);
            return (
              <button
                key={group.key}
                type="button"
                aria-pressed={!hidden}
                disabled={amenities.length === 0}
                onClick={() => toggleGroup(group.key)}
                className={`ix-legend-btn ${hidden ? "ix-legend-btn--off" : ""}`}
              >
                <i className="ix-legend-dot" style={{ background: group.color }} aria-hidden="true" />
                {group.label}{amenities.length > 0 ? ` ${count}` : ""}
              </button>
            );
          })}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={showRadius} onChange={(event) => setShowRadius(event.target.checked)} className="h-3.5 w-3.5 accent-[color:var(--ix-brand)]" />
          Show {(SEARCH_RADIUS_METERS / 1000).toFixed(1)} km analysis radius
        </label>
      </div>
      {config.nasa && (
        <p className="border-t border-[color:var(--ix-line)] px-4 py-2 text-[11px] leading-relaxed text-[color:var(--ix-muted)] sm:px-5">
          NASA GIBS imagery is regional context only (zoom limited to {config.contextZoom}).
          {theme === "nasa-true" ? ` Imagery date: ${nasaImageryDate()}; clouds and availability vary.` : " Night-light composite of Earth, not a live view."} No API key is needed for these public tiles. Use Clean or Satellite for street-level detail.
        </p>
      )}
    </section>
  );
}
