"use client";

import "leaflet/dist/leaflet.css";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { useEffect, useRef } from "react";

export type Point = { latitude: number; longitude: number };
/** A stop on the map. `marker` overrides the number (e.g. "P" for a shop pick-up, a flag for the finish). */
export type RouteStop = Point & { key: string; label: string; done?: boolean; marker?: string; variant?: "pickup" | "finish" };

/** Accra, where most deliveries go; the map opens here until there is something to show. */
const accra: [number, number] = [5.6037, -0.187];

/**
 * The courier's route on an OpenStreetMap map: the start (a shop, their location or a dropped pin), numbered stops
 * in route order and the road path between them. With `onPickStart`, tapping the map drops the start pin.
 */
export default function RouteMap({ start, stops, path, onPickStart, className = "" }: {
  start?: Point; stops: RouteStop[]; path?: [number, number][]; onPickStart?: (point: Point) => void; className?: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const pick = useRef(onPickStart);
  useEffect(() => { pick.current = onPickStart; }, [onPickStart]);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !element.current || map.current) return;
      const view = L.map(element.current, { center: accra, zoom: 12, zoomControl: false, attributionControl: true, scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(view);
      L.control.zoom({ position: "bottomright" }).addTo(view);
      view.on("click", (event) => pick.current?.({ latitude: round(event.latlng.lat), longitude: round(event.latlng.lng) }));
      map.current = view;
      layer.current = L.layerGroup().addTo(view);
      draw(L);
    });
    return () => { cancelled = true; map.current?.remove(); map.current = null; layer.current = null; };
    // The map is created once; markers and the path are redrawn below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw(L: typeof import("leaflet")) {
    const view = map.current; const group = layer.current;
    if (!view || !group) return;
    group.clearLayers();
    const bounds: [number, number][] = [];
    if (path && path.length > 1) {
      L.polyline(path, { color: "#0c2d35", weight: 7, opacity: 0.18, lineCap: "round" }).addTo(group);
      L.polyline(path, { color: "#123c45", weight: 4, opacity: 0.9, lineCap: "round", lineJoin: "round" }).addTo(group);
      bounds.push(...path);
    }
    if (start) {
      L.marker([start.latitude, start.longitude], { icon: L.divIcon({ className: "route-pin-start", html: "<span>Start</span>", iconSize: [54, 26], iconAnchor: [27, 13] }), keyboard: false, title: "Route start" }).addTo(group);
      bounds.push([start.latitude, start.longitude]);
    }
    let number = 0;
    stops.forEach((stop) => {
      const text = stop.marker ?? String(++number);
      L.marker([stop.latitude, stop.longitude], {
        icon: L.divIcon({ className: `route-pin${stop.done ? " is-done" : ""}${stop.variant ? ` is-${stop.variant}` : ""}`, html: `<span>${text}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] }),
        title: stop.label, keyboard: false,
      }).addTo(group);
      bounds.push([stop.latitude, stop.longitude]);
    });
    if (bounds.length > 1) view.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
    else if (bounds.length === 1) view.setView(bounds[0], 15);
  }

  useEffect(() => { if (map.current) import("leaflet").then(draw); });

  return <div ref={element} className={`route-map ${onPickStart ? "is-picking " : ""}${className}`} role="application" aria-label={onPickStart ? "Map. Tap to drop the start of the route." : "Route map"} />;
}

const round = (value: number) => Math.round(value * 1e6) / 1e6;

/** Google Maps directions through the stops in order (Google accepts up to 9 stops between start and end). */
export function googleDirections(start: Point | undefined, stops: Point[]) {
  if (!stops.length) return undefined;
  const at = (point: Point) => `${point.latitude},${point.longitude}`;
  const shown = stops.slice(0, 10);
  const params = new URLSearchParams({ api: "1", travelmode: "driving", destination: at(shown[shown.length - 1]) });
  if (start) params.set("origin", at(start));
  if (shown.length > 1) params.set("waypoints", shown.slice(0, -1).map(at).join("|"));
  return `https://www.google.com/maps/dir/?${params}`;
}

/** Google Maps links are limited to 10 stops, so a longer route becomes parts: each part starts where the last ended. */
export const googleStopLimit = 10;
export function googleRouteParts(start: Point | undefined, stops: Point[]) {
  const parts: { from: number; to: number; href: string }[] = [];
  for (let index = 0; index < stops.length; index += googleStopLimit) {
    const chunk = stops.slice(index, index + googleStopLimit);
    parts.push({ from: index + 1, to: index + chunk.length, href: googleDirections(index === 0 ? start : stops[index - 1], chunk)! });
  }
  return parts;
}
