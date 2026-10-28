"use client";

import { useEffect, useRef } from "react";
import type L from "leaflet";
import { LocationData, AmenityItem } from "@/lib/types";
import { escapeHtml } from "@/lib/escape-html";

interface LocationMapProps {
  location: LocationData;
  amenities?: AmenityItem[];
  onPickCoordinates?: (lat: number, lon: number) => void;
}

export default function LocationMap({
  location,
  amenities = [],
  onPickCoordinates
}: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;

      const leafletModule = (await import("leaflet")).default;

      // Ensure leaflet styles are present
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      if (!isMounted || !mapContainerRef.current) return;

      const map = leafletModule.map(mapContainerRef.current).setView(
        [location.latitude, location.longitude],
        15
      );
      mapInstanceRef.current = map;

      leafletModule.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      // Custom property pin icon
      const propertyIcon = leafletModule.divIcon({
        className: "custom-property-pin",
        html: `
          <div style="background-color: #104c38; color: white; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid #ffffff;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -34]
      });

      const mainMarker = leafletModule.marker([location.latitude, location.longitude], {
        icon: propertyIcon
      }).addTo(map);

      mainMarker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; max-width: 240px; padding: 4px;">
          <strong style="color: #104c38; display: block; margin-bottom: 4px;">Evaluated Location</strong>
          <span>${escapeHtml(location.label)}</span>
          <div style="margin-top: 6px; font-size: 11px; color: #666;">
            Lat: ${location.latitude.toFixed(5)}, Lon: ${location.longitude.toFixed(5)}
          </div>
        </div>
      `);

      const groupColors: Record<string, string> = {
        transit: "#2563eb",
        healthcare: "#dc2626",
        education: "#16a34a",
        essentials: "#d97706",
        civic: "#7c3aed",
        other: "#64748b"
      };

      amenities.forEach((item) => {
        if (item.lat === null || item.lon === null) return;

        const color = groupColors[item.group] || "#64748b";
        const amenityIcon = leafletModule.divIcon({
          className: "custom-amenity-pin",
          html: `
            <div style="background-color: ${color}; color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.25); border: 1.5px solid #ffffff; font-size: 10px; font-weight: bold;">
              •
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
          popupAnchor: [0, -11]
        });

        const marker = leafletModule.marker([item.lat, item.lon], { icon: amenityIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; padding: 2px;">
            <strong style="display: block; margin-bottom: 2px;">${escapeHtml(item.name)}</strong>
            <span style="display: inline-block; padding: 1px 6px; border-radius: 4px; background: #f1f5f9; font-size: 10px; color: #334155; text-transform: uppercase;">
              ${escapeHtml(item.group)} (${escapeHtml(item.category.replace(/_/g, " "))})
            </span>
            <div style="margin-top: 4px; font-size: 11px; color: #104c38; font-weight: 600;">
              ~${item.distanceMeters}m straight-line
            </div>
          </div>
        `);
      });

      if (onPickCoordinates) {
        map.on("click", (e: L.LeafletMouseEvent) => {
          onPickCoordinates(e.latlng.lat, e.latlng.lng);
        });
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [location.latitude, location.longitude, location.label, amenities, onPickCoordinates]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#dce3da] bg-[#f0f4ee]">
      <div ref={mapContainerRef} className="h-[360px] w-full z-0 sm:h-[420px]" />
      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex flex-wrap gap-1.5 rounded-xl bg-white/95 px-3 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur-sm border border-[#e2e8f0]">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#104c38]" /> Subject Location</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#2563eb]" /> Transit</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#dc2626]" /> Healthcare</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#16a34a]" /> School</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#d97706]" /> Essentials</span>
      </div>
      {onPickCoordinates && (
        <div className="pointer-events-none absolute top-3 right-3 z-[400] rounded-lg bg-black/75 px-2.5 py-1 text-[11px] text-white">
          Click anywhere on map to re-target coordinate
        </div>
      )}
    </div>
  );
}
