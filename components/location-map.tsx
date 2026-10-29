"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type L from "leaflet";
import { MapPin, Satellite, Map as MapIcon, AlertTriangle, Sun } from "lucide-react";
import type { LocationData, AmenityItem } from "@/lib/types";
import { escapeHtml } from "@/lib/escape-html";

const EMPTY_AMENITIES: AmenityItem[] = [];
const OSM_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
// CARTO Voyager adds legible roads, neighbourhood labels and restrained colour without overwhelming the evidence markers.\nconst VOYAGER_TILES = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const NASA_LAYER = "VIIRS_SNPP_CorrectedReflectance_TrueColor";
// Near-real-time satellite products can lag ingestion by a day or more.
const NASA_TILE_DATE = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

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
  const lightLayerRef = useRef<L.TileLayer | null>(null);
  const preNasaZoomRef = useRef<number | null>(null);
  const pickHandlerRef = useRef(onPickCoordinates);
  const [mapStyle, setMapStyle] = useState<"light" | "street" | "nasa">("light");
  const [mapStylePreferenceLoaded, setMapStylePreferenceLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapRetry, setMapRetry] = useState(0);
  const [mapError, setMapError] = useState("");
  const [tileError, setTileError] = useState(false);

  useEffect(() => { pickHandlerRef.current = onPickCoordinates; }, [onPickCoordinates]);

  // A small, non-sensitive cookie remembers the preferred map style. The report itself stays in browser storage, not in a size-limited cookie.
  useEffect(() => {
    try {
      const savedStyle = document.cookie.split("; ").find((entry) => entry.startsWith("infracis_map_style="))?.split("=")[1];
      if (savedStyle === "light" || savedStyle === "street" || savedStyle === "nasa") setMapStyle(savedStyle);
    } catch { /* cookies may be disabled; the default style still works */ }
    finally {
      // Do not write the default before the saved preference has been read.
      // Otherwise the first effect cycle can overwrite the saved basemap preference.
      setMapStylePreferenceLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!mapStylePreferenceLoaded) return;
    try {
      document.cookie = `infracis_map_style=${mapStyle}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    } catch { /* map style preference is optional */ }
  }, [mapStyle, mapStylePreferenceLoaded]);

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
        let fallbackAttempted = false;
        let street = leaflet.tileLayer(streetUrl, {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
          maxZoom: 19,
          maxNativeZoom: 19,
          crossOrigin: true
        });
        street.on("tileerror", () => {
          setTileError(true);
          // A broken custom tile URL should not leave the user with a blank map.
          if (!fallbackAttempted && streetUrl !== OSM_TILES) {
            fallbackAttempted = true;
            map?.removeLayer(street);
            const fallback = leaflet.tileLayer(OSM_TILES, {
              attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
              maxZoom: 19,
              maxNativeZoom: 19,
              crossOrigin: true
            });
            fallback.on("tileload", () => setTileError(false));
            fallback.on("tileerror", () => setTileError(true));
            fallback.addTo(map!);
            street = fallback;
            streetLayerRef.current = fallback;
          }
        });
        street.addTo(map);
        streetLayerRef.current = street;

        // NASA GIBS provides regional Earth-observation imagery, not parcel-level aerial photos.
        // Its VIIRS layer has native zoom 9; switch to regional scale rather than upscaling at street level.
        const light = leaflet.tileLayer(VOYAGER_TILES, {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
          subdomains: "abcd", maxZoom: 20, crossOrigin: true
        });
        light.on("tileload", () => setTileError(false));
        light.on("tileerror", () => setTileError(true));
        lightLayerRef.current = light;

        const nasa = leaflet.tileLayer(
          `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${NASA_LAYER}/default/${NASA_TILE_DATE}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
          {
            attribution: '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noreferrer">NASA GIBS / Earthdata</a>',
            maxZoom: 9, maxNativeZoom: 9, opacity: 1, crossOrigin: true
          }
        );
        nasa.on("tileload", () => setTileError(false));
        nasa.on("tileerror", () => setTileError(true));
        nasaLayerRef.current = nasa;

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
        setMapReady(true);
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
      setMapReady(false);
      amenityLayerRef.current = null;
      streetLayerRef.current = null;
      nasaLayerRef.current = null;
      lightLayerRef.current = null;
      preNasaZoomRef.current = null;
    };
  }, [location.latitude, location.longitude, location.label, mapRetry]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const street = streetLayerRef.current;
    const light = lightLayerRef.current;
    const nasa = nasaLayerRef.current;
    if (!map || !street || !light || !nasa) return;
    [street, light, nasa].forEach((layer) => { if (map.hasLayer(layer)) map.removeLayer(layer); });
    if (mapStyle === "nasa") {
      if (preNasaZoomRef.current === null) preNasaZoomRef.current = map.getZoom();
      if (map.getZoom() > 9) map.setZoom(9);
      nasa.addTo(map);
    } else {
      (mapStyle === "light" ? light : street).addTo(map);
      if (preNasaZoomRef.current !== null) {
        map.setZoom(Math.min(19, Math.max(3, preNasaZoomRef.current)));
        preNasaZoomRef.current = null;
      }
    }
    map.invalidateSize({ pan: false });
  }, [mapStyle, mapReady]);

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
  }, [amenities, location.latitude, location.longitude, mapReady]);

  const retryMap = useCallback(() => {
    setMapError("");
    setTileError(false);
    const map = mapInstanceRef.current;
    if (!map) {
      setMapRetry((value) => value + 1);
      return;
    }
    map.invalidateSize({ pan: false });
    streetLayerRef.current?.redraw();
    lightLayerRef.current?.redraw();
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
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-[#dce5d9] bg-white p-1" aria-label="Map basemap">
          <button type="button" aria-pressed={mapStyle === "light"} onClick={() => setMapStyle("light")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a] ${mapStyle === "light" ? "bg-[#174b38] text-white shadow-sm" : "text-[#53675a] hover:bg-[#f0f5ed]"}`}>
            <Sun size={14} /> Explore
          </button>
          <button type="button" aria-pressed={mapStyle === "street"} onClick={() => setMapStyle("street")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a] ${mapStyle === "street" ? "bg-[#174b38] text-white shadow-sm" : "text-[#53675a] hover:bg-[#f0f5ed]"}`}>
            <MapIcon size={14} /> Street
          </button>
          <button type="button" aria-pressed={mapStyle === "nasa"} onClick={() => setMapStyle("nasa")} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8a23a] ${mapStyle === "nasa" ? "bg-[#174b38] text-white shadow-sm" : "text-[#53675a] hover:bg-[#f0f5ed]"}`}>
            <Satellite size={14} /> NASA overview
          </button>
        </div>
      </div>
      {mapError && <div role="alert" className="flex items-start gap-2 border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><span>{mapError}</span><button type="button" className="ml-auto underline" onClick={retryMap}>Retry</button></div>}
      {tileError && !mapError && <div role="status" className="px-4 py-2 text-xs text-amber-800 bg-amber-50">Some map tiles did not load. Other map features remain available. <button type="button" onClick={retryMap} className="ml-1 underline">Retry tiles</button></div>}
      {mapStyle === "nasa" && <p className="border-t border-[#e7ede4] bg-[#f8faf7] px-4 py-2 text-[11px] leading-relaxed text-[#647468]">NASA VIIRS imagery is a regional Earth-observation layer with native zoom up to level 9; it is not parcel-level satellite photography. Return to Clean or Street for nearby amenity inspection.</p>}
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
      {mapStyle === "nasa" && <p className="border-t border-[#edf1e9] px-4 py-2 text-[10px] text-[#819084]">NASA GIBS regional imagery · Date: {NASA_TILE_DATE} · imagery availability varies by layer and location.</p>}
    </section>
  );
}
