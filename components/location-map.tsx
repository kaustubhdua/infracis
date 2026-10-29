"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type L from "leaflet";
import { MapPin, Satellite, Map as MapIcon, AlertTriangle } from "lucide-react";
import type { LocationData, AmenityItem } from "@/lib/types";
import { escapeHtml } from "@/lib/escape-html";

const EMPTY_AMENITIES: AmenityItem[] = [];
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const NASA_LAYER = "VIIRS_SNPP_CorrectedReflectance_TrueColor";

interface LocationMapProps {
  location: LocationData;
  amenities?: AmenityItem[];
  onPickCoordinates?: (lat: number, lon: number) => void;
}

export default function LocationMap({ location, amenities = EMPTY_AMENITIES, onPickCoordinates }: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const amenityLayerRef = useRef<L.LayerGroup | null>(null);
  const streetLayerRef = useRef<L.TileLayer | null>(null);
  const nasaLayerRef = useRef<L.TileLayer | null>(null);
  const pickHandlerRef = useRef(onPickCoordinates);
  const [mapStyle, setMapStyle] = useState<"street" | "satellite">("street");
  const [mapError, setMapError] = useState("");
  const [tileError, setTileError] = useState(false);

  useEffect(() => { pickHandlerRef.current = onPickCoordinates; }, [onPickCoordinates]);

  // A small, non-sensitive cookie remembers the preferred map style. The report itself stays in browser storage, not in a size-limited cookie.
  useEffect(() => {
    try {
      const savedStyle = document.cookie.split("; ").find((entry) => entry.startsWith("infracis_map_style="))?.split("=")[1];
      if (savedStyle === "street" || savedStyle === "satellite") setMapStyle(savedStyle);
    } catch { /* cookies may be disabled; the default style still works */ }
  }, []);

  useEffect(() => {
    try {
      document.cookie = `infracis_map_style=${mapStyle}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
    } catch { /* map style preference is optional */ }
  }, [mapStyle]);

  useEffect(() => {
    let cancelled = false;
    let map: L.Map | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    let windowResizeHandler: (() => void) | undefined;

    async function initialize() {
      if (!mapContainerRef.current) return;
      try {
        const leaflet = (await import("leaflet")).default;
        if (cancelled || !mapContainerRef.current) return;

        map = leaflet.map(mapContainerRef.current, {
          zoomControl: false,
          preferCanvas: true,
          scrollWheelZoom: true
        }).setView([location.latitude, location.longitude], 14);
        mapInstanceRef.current = map;
        leaflet.control.zoom({ position: "topright" }).addTo(map);

        const streetUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL || OSM_TILES;
        const street = leaflet.tileLayer(streetUrl, {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
          maxZoom: 19,
          maxNativeZoom: 19,
          crossOrigin: true
        });
        street.on("tileerror", () => setTileError(true));
        street.addTo(map);
        streetLayerRef.current = street;

        // NASA GIBS publishes public, pre-rendered Earth-observation tiles. No API key is required for this tile service.
        const nasa = leaflet.tileLayer(
          `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${NASA_LAYER}/default/${new Date().toISOString().slice(0, 10)}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
          {
            attribution: 'NASA Global Imagery Browse Services (GIBS) / Earth Science Data and Information System',
            maxZoom: 19,
            maxNativeZoom: 9,
            opacity: 0.88,
            crossOrigin: true
          }
        );
        nasa.on("tileerror", () => setTileError(true));
        nasaLayerRef.current = nasa;
        if (mapStyle === "satellite") nasa.addTo(map);

        const propertyIcon = leaflet.divIcon({
          className: "infracis-property-pin",
          html: '<span class="infracis-property-pin__dot"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span>',
          iconSize: [38, 44],
          iconAnchor: [19, 40],
          popupAnchor: [0, -38]
        });
        leaflet.marker([location.latitude, location.longitude], { icon: propertyIcon })
          .addTo(map)
          .bindPopup(`<div class="infracis-map-popup"><strong>Investigated location</strong><span>${escapeHtml(location.label)}</span><small>${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}</small></div>`);

        amenityLayerRef.current = leaflet.layerGroup().addTo(map);
        map.on("click", (event: L.LeafletMouseEvent) => {
          pickHandlerRef.current?.(event.latlng.lat, event.latlng.lng);
        });

        resizeObserver = new ResizeObserver(() => {
          if (!map || cancelled) return;
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => map?.invalidateSize({ pan: false }), 80);
        });
        resizeObserver.observe(mapContainerRef.current);
        windowResizeHandler = () => map?.invalidateSize({ pan: false });
        window.addEventListener("resize", windowResizeHandler, { passive: true });
        setMapError("");
        requestAnimationFrame(() => map?.invalidateSize({ pan: false }));
      } catch {
        if (!cancelled) setMapError("The interactive map could not load. Check your connection and try again.");
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (windowResizeHandler) window.removeEventListener("resize", windowResizeHandler);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (map) map.remove();
      mapInstanceRef.current = null;
      amenityLayerRef.current = null;
      streetLayerRef.current = null;
      nasaLayerRef.current = null;
    };
  }, [location.latitude, location.longitude, location.label]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const street = streetLayerRef.current;
    const nasa = nasaLayerRef.current;
    if (!map || !street || !nasa) return;
    if (mapStyle === "satellite") {
      if (map.hasLayer(street)) map.removeLayer(street);
      if (!map.hasLayer(nasa)) nasa.addTo(map);
    } else {
      if (map.hasLayer(nasa)) map.removeLayer(nasa);
      if (!map.hasLayer(street)) street.addTo(map);
    }
    map.invalidateSize({ pan: false });
  }, [mapStyle]);

  useEffect(() => {
    const layer = amenityLayerRef.current;
    const map = mapInstanceRef.current;
    if (!layer || !map) return;
    void import("leaflet").then(({ default: leaflet }) => {
      layer.clearLayers();
      const colors: Record<string, string> = {
        transit: "#2874c8", healthcare: "#d64c4c", education: "#25845a",
        essentials: "#d68a20", civic: "#7957b5", other: "#687b8d"
      };
      amenities.forEach((item) => {
        if (item.lat === null || item.lon === null ||
            !Number.isFinite(item.lat) || !Number.isFinite(item.lon) ||
            item.lat < -90 || item.lat > 90 || item.lon < -180 || item.lon > 180) return;
        const color = colors[item.group] || colors.other;
        const icon = leaflet.divIcon({
          className: "infracis-amenity-pin",
          html: `<span style="--amenity-color:${color}" class="infracis-amenity-pin__dot"></span>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });
        leaflet.marker([item.lat, item.lon], { icon })
          .addTo(layer)
          .bindPopup(`<div class="infracis-map-popup"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.group)} · ${escapeHtml(item.category.replace(/_/g, " "))}</span><small>~${Math.max(0, Math.round(item.distanceMeters))} m straight-line distance</small></div>`);
      });
    }).catch(() => setMapError("The amenity markers could not be rendered."));
  }, [amenities, location.latitude, location.longitude]);

  const retryMap = useCallback(() => {
    setMapError("");
    setTileError(false);
    const map = mapInstanceRef.current;
    map?.invalidateSize({ pan: false });
    streetLayerRef.current?.redraw();
    nasaLayerRef.current?.redraw();
  }, []);

  return (
    <section className="overflow-hidden rounded-3xl border border-[#d7e1d5] bg-white shadow-[0_18px_50px_rgba(21,55,38,0.09)]" aria-label="Location map">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7ede4] bg-[#fbfcf8] px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#e7f0e4] text-[#174b38]"><MapPin size={19} /></span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[#183b2b]">Location intelligence map</h3>
            <p className="truncate text-xs text-[#718275]">{location.label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-[#dce5d9] bg-white p-1" aria-label="Map style">
          <button type="button" aria-pressed={mapStyle === "street"} onClick={() => setMapStyle("street")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a] ${mapStyle === "street" ? "bg-[#174b38] text-white shadow-sm" : "text-[#53675a] hover:bg-[#f0f5ed]"}`}>
            <MapIcon size={14} /> Street
          </button>
          <button type="button" aria-pressed={mapStyle === "satellite"} onClick={() => setMapStyle("satellite")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a] ${mapStyle === "satellite" ? "bg-[#174b38] text-white shadow-sm" : "text-[#53675a] hover:bg-[#f0f5ed]"}`}>
            <Satellite size={14} /> NASA imagery
          </button>
        </div>
      </div>
      {mapError && <div role="alert" className="flex items-start gap-2 border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><span>{mapError}</span><button type="button" className="ml-auto underline" onClick={retryMap}>Retry</button></div>}
      {tileError && !mapError && <div role="status" className="px-4 py-2 text-xs text-amber-800 bg-amber-50">Some map tiles did not load. Other map features remain available. <button type="button" onClick={retryMap} className="ml-1 underline">Retry tiles</button></div>}
      <div ref={mapContainerRef} className="infracis-map-canvas h-[360px] w-full sm:h-[440px]" />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e7ede4] px-4 py-3 text-[11px] text-[#718275] sm:px-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5"><i className="infracis-legend-dot bg-[#174b38]" /> Subject location</span>
          <span className="inline-flex items-center gap-1.5"><i className="infracis-legend-dot bg-[#2874c8]" /> Transit</span>
          <span className="inline-flex items-center gap-1.5"><i className="infracis-legend-dot bg-[#d64c4c]" /> Healthcare</span>
          <span className="inline-flex items-center gap-1.5"><i className="infracis-legend-dot bg-[#25845a]" /> Education</span>
          <span className="inline-flex items-center gap-1.5"><i className="infracis-legend-dot bg-[#d68a20]" /> Essentials</span>
        </div>
        {onPickCoordinates && <span>Click the map to investigate another point</span>}
      </div>
      {mapStyle === "satellite" && <p className="border-t border-[#edf1e9] px-4 py-2 text-[10px] text-[#819084]">NASA GIBS satellite imagery · Date: {new Date().toISOString().slice(0, 10)} · imagery availability varies by layer and location.</p>}
    </section>
  );
}
