// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3 — GPS & Location Monitoring
// Live driver tracking: 1s polling, animated marker moves, real road polylines
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { useTrips, useDrivers } from "../hooks";
import {
  Badge, Btn, Card, Table, TR, TD, Modal, Spinner, PageError,
  PageHeader, StatCard, InfoRow, C,
} from "../components/ui";
import { OlaMaps, defaultStyleJson } from "olamaps-web-sdk";

const MAPS_KEY       = import.meta.env.VITE_OLA_MAPS_KEY ?? "";
const DEFAULT_CENTER = { lat: 17.3850, lng: 78.4867 };
const POLL_INTERVAL  = 1000; // 1 second live updates

type LatLngPoint = { lat: number; lng: number };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getDriverCoords(driver: any): [number, number] | null {
  if (driver?.location?.coordinates?.length === 2)
    return driver.location.coordinates as [number, number];
  if (driver?.currentLocation?.coordinates?.length === 2)
    return driver.currentLocation.coordinates as [number, number];
  return null;
}

function distanceKm(a: LatLngPoint, b: LatLngPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function getEta(driver: any, admin?: LatLngPoint | null) {
  const c = getDriverCoords(driver);
  if (!c || !admin) return null;
  const km  = distanceKm({ lat: c[1], lng: c[0] }, admin);
  const min = Math.max(1, Math.ceil((km / 25) * 60));
  return { km, min, label: `${min} min (${km.toFixed(1)} km away)` };
}

// ── Polyline decoder (Google encoded polyline format) ──────────────────────
function decodePolyline(encoded: string): [number, number][] {
  const pts: [number, number][] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    let b: number, s = 0, r = 0;
    do { b = encoded.charCodeAt(i++) - 63; r |= (b & 0x1f) << s; s += 5; } while (b >= 0x20);
    lat += r & 1 ? ~(r >> 1) : r >> 1;
    s = 0; r = 0;
    do { b = encoded.charCodeAt(i++) - 63; r |= (b & 0x1f) << s; s += 5; } while (b >= 0x20);
    lng += r & 1 ? ~(r >> 1) : r >> 1;
    pts.push([lng / 1e5, lat / 1e5]); // GeoJSON [lng, lat]
  }
  return pts;
}

// ── Fetch real road route from Ola Directions API ─────────────────────────
async function fetchRoadRoute(
  origin: LatLngPoint,
  dest: LatLngPoint,
  key: string
): Promise<[number, number][] | null> {
  if (!key || !origin.lat || !dest.lat) return null;
  // Validate coords are real (not 0,0)
  if (Math.abs(origin.lat) < 0.01 && Math.abs(origin.lng) < 0.01) return null;
  if (Math.abs(dest.lat)   < 0.01 && Math.abs(dest.lng)   < 0.01) return null;
  try {
    const url =
      `https://api.olamaps.io/routing/v1/directions` +
      `?origin=${origin.lat},${origin.lng}` +
      `&destination=${dest.lat},${dest.lng}` +
      `&api_key=${key}`;
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "SUCCESS") return null;
    const route = data.routes?.[0];
    if (!route) return null;
    const poly =
      typeof route.overview_polyline === "string"
        ? route.overview_polyline
        : route.overview_polyline?.points;
    if (poly) return decodePolyline(poly);
    if (route.geometry?.coordinates?.length) return route.geometry.coordinates;
    return null;
  } catch {
    return null;
  }
}

// ── Marker element factory ─────────────────────────────────────────────────
function makeMarkerEl(color: string, emoji: string, size = 36): HTMLDivElement {
  const el = document.createElement("div");
  Object.assign(el.style, {
    width:          `${size}px`,
    height:         `${size}px`,
    borderRadius:   "999px",
    background:     color,
    border:         "3px solid #fff",
    boxShadow:      "0 4px 18px rgba(0,0,0,0.45)",
    display:        "flex",
    alignItems:     "center",
    justifyContent: "center",
    fontSize:       `${Math.round(size * 0.48)}px`,
    cursor:         "pointer",
    userSelect:     "none",
    transition:     "transform 0.15s ease",
  });
  el.textContent = emoji;
  return el;
}

function vehicleEmoji(type: string) {
  switch ((type || "").toLowerCase()) {
    case "bike":    return "🏍️";
    case "auto":    return "🛺";
    case "car":     return "🚗";
    case "premium": return "🚙";
    case "xl":      return "🚐";
    default:        return "🚘";
  }
}

function vehicleColor(type: string) {
  switch ((type || "").toLowerCase()) {
    case "bike":    return "#6366f1";
    case "auto":    return "#f59e0b";
    case "car":     return "#22c55e";
    case "premium": return "#8b5cf6";
    case "xl":      return "#06b6d4";
    default:        return "#6366f1";
  }
}

function popupHtml(title: string, lines: string[]) {
  return `<div style="font-family:Inter,sans-serif;min-width:170px;color:#0f172a">
    <div style="font-size:0.7rem;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:5px">${title}</div>
    ${lines.map(l => `<div style="font-size:0.8rem;line-height:1.55;color:#334155">${l}</div>`).join("")}
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// LiveMap component
// Strategy: init map once, then imperatively update markers + routes on prop changes.
// This avoids full destroy/recreate on every 1s poll tick.
// ─────────────────────────────────────────────────────────────────────────────
interface LiveMapProps {
  drivers?:     any[];
  activeRides?: any[];
  focusDriver?: any;
  focusRide?:   any;
  height?:      number;
  adminCenter?: LatLngPoint | null;
}

function LiveMap({
  drivers     = [],
  activeRides = [],
  focusDriver,
  focusRide,
  height      = 500,
  adminCenter,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const mapReadyRef  = useRef(false);          // true once "load" event fired
  const markersRef   = useRef<Map<string, any>>(new Map()); // id → OlaMaps Marker
  const routeCacheRef= useRef<Map<string, [number,number][]>>(new Map()); // key → coords

  // ── compute stable props we'll pass into imperative updater ───────────────
  const adminCenterRef = useRef(adminCenter);
  useEffect(() => { adminCenterRef.current = adminCenter; }, [adminCenter]);

  // ── Wait for map load, then draw everything ───────────────────────────────
  const drawAll = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;

    const admin = adminCenterRef.current;

    // ── 1. Admin center marker ─────────────────────────────────────────────
    if (admin) {
      const id = "__admin__";
      if (!markersRef.current.has(id)) {
        const el = makeMarkerEl("#f97316", "📍", 38);
        el.style.zIndex = "9999";
        const m = new OlaMaps.Marker({ element: el })
          .setLngLat([admin.lng, admin.lat])
          .setPopup(
            new OlaMaps.Popup({ offset: 20, closeButton: false })
              .setHTML(popupHtml("Your Location (Admin)", [
                "Current device position",
                `${admin.lat.toFixed(6)}, ${admin.lng.toFixed(6)}`,
              ]))
          )
          .addTo(map);
        markersRef.current.set(id, m);
      } else {
        markersRef.current.get(id)!.setLngLat([admin.lng, admin.lat]);
      }
    }

    // ── 2. Driver markers — create once, then animate position ────────────
    for (const d of drivers) {
      const coords = getDriverCoords(d);
      if (!coords) continue;
      const [dLng, dLat] = coords;
      const vType = d.vehicleType || "bike";
      const eta   = getEta(d, adminCenterRef.current);
      const hasRide = activeRides.some(
        (t: any) => t.assignedDriver?._id === d._id || t.assignedDriver === d._id
      );

      const popupContent = popupHtml(`Driver · ${vType.toUpperCase()}`, [
        `<strong>${d.name || "—"}</strong>`,
        `📱 ${d.phone ?? "—"}`,
        `🚗 ${d.vehicleNumber ?? "—"}`,
        hasRide
          ? `<span style="color:#ef4444">● On Active Ride</span>`
          : `<span style="color:#22c55e">● Available</span>`,
        eta
          ? `<hr style="border:none;border-top:1px solid #e2e8f0;margin:5px 0"/>🕒 <strong style="color:#f97316">${eta.min} min</strong> · ${eta.km.toFixed(1)} km`
          : "",
      ].filter(Boolean));

      if (!markersRef.current.has(d._id)) {
        // Create marker fresh
        const el = makeMarkerEl(vehicleColor(vType), vehicleEmoji(vType));
        const m = new OlaMaps.Marker({ element: el })
          .setLngLat([dLng, dLat])
          .setPopup(
            new OlaMaps.Popup({ offset: 20, closeButton: false, closeOnClick: false })
              .setHTML(popupContent)
          )
          .addTo(map);
        markersRef.current.set(d._id, m);
      } else {
        // Smoothly animate to new position (CSS transition on the element handles this)
        const m = markersRef.current.get(d._id)!;
        m.setLngLat([dLng, dLat]);
        // Update popup content so ETA stays fresh
        m.getPopup()?.setHTML(popupContent);
      }
    }

    // Remove markers for drivers that went offline
    const activeIds = new Set(drivers.map((d: any) => d._id));
    markersRef.current.forEach((m, id) => {
      if (id !== "__admin__" && id !== "__pickup__" && id !== "__drop__" && !activeIds.has(id)) {
        m.remove();
        markersRef.current.delete(id);
        // Also clean up their route source/layer
        const srcId = `driver-route-${id}`;
        if (map.getSource(srcId)) {
          map.removeLayer(`${srcId}-border`);
          map.removeLayer(`${srcId}-line`);
          map.removeSource(srcId);
        }
        routeCacheRef.current.delete(id);
      }
    });

    // ── 3. Active ride markers (pickup + drop) ─────────────────────────────
    if (focusRide) {
      if (focusRide.pickup?.location?.coordinates) {
        const [lng, lat] = focusRide.pickup.location.coordinates;
        const id = "__pickup__";
        if (!markersRef.current.has(id)) {
          const m = new OlaMaps.Marker({ element: makeMarkerEl("#22c55e", "📍", 34) })
            .setLngLat([lng, lat])
            .setPopup(new OlaMaps.Popup({ offset: 18, closeButton: false })
              .setHTML(popupHtml("Pickup", [focusRide.pickup?.address ?? "—"])))
            .addTo(map);
          markersRef.current.set(id, m);
        } else {
          markersRef.current.get(id)!.setLngLat([lng, lat]);
        }
      }
      if (focusRide.drop?.location?.coordinates) {
        const [lng, lat] = focusRide.drop.location.coordinates;
        const id = "__drop__";
        if (!markersRef.current.has(id)) {
          const m = new OlaMaps.Marker({ element: makeMarkerEl("#ef4444", "🏁", 34) })
            .setLngLat([lng, lat])
            .setPopup(new OlaMaps.Popup({ offset: 18, closeButton: false })
              .setHTML(popupHtml("Drop", [focusRide.drop?.address ?? "—"])))
            .addTo(map);
          markersRef.current.set(id, m);
        } else {
          markersRef.current.get(id)!.setLngLat([lng, lat]);
        }
      }
    }

    // ── 4. Road polylines ─────────────────────────────────────────────────
    // Each driver gets a real-road route from admin → driver position.
    // Routes are cached by driverId so we only re-fetch when position changes
    // more than ~50m (avoids hammering the API on every 1s tick).
    if (admin) {
      for (const d of drivers) {
        const coords = getDriverCoords(d);
        if (!coords) continue;
        const [dLng, dLat] = coords;
        const hasRide = activeRides.some(
          (t: any) => t.assignedDriver?._id === d._id || t.assignedDriver === d._id
        );
        const lineColor  = hasRide ? "#ef4444" : "#22c55e";
        const lineWidth  = hasRide ? 9 : 7;
        const lineOpacity= hasRide ? 0.95 : 0.75;

        const srcId    = `driver-route-${d._id}`;
        const borderId = `${srcId}-border`;
        const lineId   = `${srcId}-line`;

        // Cache key includes rounded coords so we re-route only on meaningful moves
        const cacheKey = `${d._id}__${dLat.toFixed(4)}_${dLng.toFixed(4)}`;
        let roadCoords = routeCacheRef.current.get(cacheKey);

        if (!roadCoords) {
          // Fetch real road route; fall back to straight line
          const fetched = await fetchRoadRoute(
            { lat: admin.lat, lng: admin.lng },
            { lat: dLat,      lng: dLng      },
            MAPS_KEY
          );
          roadCoords = fetched ?? [[admin.lng, admin.lat], [dLng, dLat]];
          // Evict old cache entries for this driver (different coords)
          routeCacheRef.current.forEach((_, k) => {
            if (k.startsWith(`${d._id}__`)) routeCacheRef.current.delete(k);
          });
          routeCacheRef.current.set(cacheKey, roadCoords);
        }

        const geojson = {
          type: "Feature" as const,
          geometry: { type: "LineString" as const, coordinates: roadCoords },
          properties: {},
        };

        if (map.getSource(srcId)) {
          // Update existing source data (moves the line as driver moves)
          (map.getSource(srcId) as any).setData(geojson);
          // Update style in case ride status changed
          if (map.getLayer(lineId)) {
            map.setPaintProperty(lineId, "line-color",   lineColor);
            map.setPaintProperty(lineId, "line-width",   lineWidth);
            map.setPaintProperty(lineId, "line-opacity", lineOpacity);
          }
        } else {
          // Add source + two layers (white border + colored line)
          map.addSource(srcId, { type: "geojson", data: geojson });

          // White border layer — makes line pop on any map background
          map.addLayer({
            id:     borderId,
            type:   "line",
            source: srcId,
            layout: { "line-cap": "round", "line-join": "round" },
            paint:  { "line-color": "#ffffff", "line-width": lineWidth + 4, "line-opacity": 0.6 },
          });

          // Colored main line
          map.addLayer({
            id:     lineId,
            type:   "line",
            source: srcId,
            layout: { "line-cap": "round", "line-join": "round" },
            paint:  { "line-color": lineColor, "line-width": lineWidth, "line-opacity": lineOpacity },
          });
        }
      }
    }

    // ── 5. Focused-ride route ──────────────────────────────────────────────
    if (focusRide?.pickup?.location?.coordinates && focusRide?.drop?.location?.coordinates) {
      const [pLng, pLat] = focusRide.pickup.location.coordinates;
      const [dLng, dLat] = focusRide.drop.location.coordinates;
      const origin = { lat: pLat, lng: pLng };
      const dest   = { lat: dLat, lng: dLng };

      const cacheKey = `ride__${pLat.toFixed(4)}_${pLng.toFixed(4)}__${dLat.toFixed(4)}_${dLng.toFixed(4)}`;
      let roadCoords = routeCacheRef.current.get(cacheKey);
      if (!roadCoords) {
        const fetched = await fetchRoadRoute(origin, dest, MAPS_KEY);
        roadCoords = fetched ?? [[pLng, pLat], [dLng, dLat]];
        routeCacheRef.current.set(cacheKey, roadCoords);
      }

      const geojson = {
        type: "Feature" as const,
        geometry: { type: "LineString" as const, coordinates: roadCoords },
        properties: {},
      };

      if (map.getSource("focused-ride-route")) {
        (map.getSource("focused-ride-route") as any).setData(geojson);
      } else {
        map.addSource("focused-ride-route", { type: "geojson", data: geojson });
        map.addLayer({
          id: "focused-ride-border", type: "line", source: "focused-ride-route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint:  { "line-color": "#ffffff", "line-width": 10, "line-opacity": 0.6 },
        });
        map.addLayer({
          id: "focused-ride-route-line", type: "line", source: "focused-ride-route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint:  { "line-color": "#6366f1", "line-width": 7, "line-opacity": 0.9 },
        });
      }
    }
  }, [drivers, activeRides, focusDriver, focusRide]);

  // ── Init map ONCE ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!MAPS_KEY || !containerRef.current) return;
    let cancelled = false;

    const initCenter = (() => {
      if (focusDriver) {
        const c = getDriverCoords(focusDriver);
        if (c) return { lat: c[1], lng: c[0] };
      }
      if (adminCenter) return adminCenter;
      const first = drivers.find((d) => getDriverCoords(d));
      if (first) { const c = getDriverCoords(first)!; return { lat: c[1], lng: c[0] }; }
      return DEFAULT_CENTER;
    })();

    const zoom = focusDriver || focusRide ? 14 : 12;

    (async () => {
      const olaMaps = new OlaMaps({ apiKey: MAPS_KEY });
      const map = await olaMaps.init({
        container:         containerRef.current!,
        style:             defaultStyleJson,
        center:            [initCenter.lng, initCenter.lat],
        zoom,
        attributionControl: false,
      });
      if (cancelled) { map.remove?.(); return; }

      mapRef.current = map;
      map.addControl(new OlaMaps.NavigationControl({ showCompass: true }), "top-right");

      // Wait for map tiles to load before adding sources/layers
      map.on("load", () => {
        if (cancelled) return;
        mapReadyRef.current = true;
        drawAll(); // initial draw
      });
    })().catch(console.warn);

    return () => {
      cancelled = true;
      mapReadyRef.current = false;
      markersRef.current.forEach((m) => m.remove?.());
      markersRef.current.clear();
      routeCacheRef.current.clear();
      mapRef.current?.remove?.();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ← init only once

  // ── Re-draw whenever drivers/rides/adminCenter change (1s poll ticks here) ─
  useEffect(() => {
    drawAll();
  }, [drawAll]);

  if (!MAPS_KEY) {
    return (
      <div style={{
        height, background: "#0e1015", borderRadius: 12,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        border: "1px dashed #1e2330", gap: 10,
      }}>
        <span style={{ fontSize: "2rem" }}>🗺️</span>
        <div style={{ color: "#4a5568", fontSize: "0.82rem", fontFamily: "monospace", textAlign: "center" }}>
          Add <span style={{ color: "#6366f1" }}>VITE_OLA_MAPS_KEY</span> to your{" "}
          <span style={{ color: "#f59e0b" }}>.env</span> file
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height, borderRadius: 12, overflow: "hidden", background: "#0e1015" }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GPSMonitoring page — polls useDrivers every 1s so map stays live
// ─────────────────────────────────────────────────────────────────────────────
export function GPSMonitoring() {
  const { trips, loading, error, refetch } = useTrips();
  const { drivers, refetch: refetchDrivers } = useDrivers();
  const [sel, setSel]                         = useState<any>(null);
  const [adminCenter, setAdminCenter]         = useState<LatLngPoint | null>(null);

  // ── Get admin/laptop location once ────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) { setAdminCenter(DEFAULT_CENTER); return; }
    // Initial fix
    navigator.geolocation.getCurrentPosition(
      (p) => setAdminCenter({ lat: p.coords.latitude, lng: p.coords.longitude }),
      ()  => setAdminCenter(DEFAULT_CENTER),
      { enableHighAccuracy: true, timeout: 10000 }
    );
    // Watch for laptop/device movement too
    const watchId = navigator.geolocation.watchPosition(
      (p) => setAdminCenter({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ── Poll driver locations every 1 second ──────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => { refetchDrivers(); }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [refetchDrivers]);

  const activeRides   = useMemo(() => trips.filter((t: any)   => t.status === "ride_started"), [trips]);
  const activeDrivers = useMemo(() => drivers.filter((d: any) => d.isOnline),                  [drivers]);
  const withLocation  = useMemo(() => activeDrivers.filter((d: any) => !!getDriverCoords(d)),  [activeDrivers]);

  if (loading) return <Spinner label="Loading GPS data…" />;
  if (error)   return <PageError message={error} onRetry={refetch} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "1.75rem", fontFamily: "'Syne','Segoe UI',sans-serif" }}>
      <PageHeader
        title="GPS & Location Monitoring"
        icon="🗺️"
        sub={`${withLocation.length} drivers broadcasting · ${activeRides.length} rides in progress`}
        actions={
          <Btn icon={<RefreshCw size={14} />} variant="ghost" onClick={() => { refetch(); refetchDrivers(); }}>
            Refresh
          </Btn>
        }
      />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        <StatCard label="Online Drivers"   value={activeDrivers.length}                  icon="🟢" color="#22c55e" />
        <StatCard label="Broadcasting GPS" value={withLocation.length}                   icon="📡" color="#6366f1" />
        <StatCard label="Active Rides"     value={activeRides.length}                    icon="🚘" color="#f59e0b" />
        <StatCard label="Offline Drivers"  value={drivers.length - activeDrivers.length} icon="⚫" color="#6b7280" />
      </div>

      {/* Live Map */}
      <Card style={{ marginBottom: "1.5rem", overflow: "hidden" }}>
        <div style={{ padding: "0.875rem 1rem", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontWeight: 700 }}>🗺️ Live Map — Drivers &amp; Admin Center</span>
          <div style={{ display: "flex", gap: 10, fontSize: "0.72rem", color: C.muted, flexWrap: "wrap" }}>
            {[["🏍️","Bike","#6366f1"],["🛺","Auto","#f59e0b"],["🚗","Car","#22c55e"],["🚙","Premium","#8b5cf6"],["🚐","XL","#06b6d4"]].map(([e,l,c]) => (
              <span key={l as string} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: c as string, display: "inline-block" }} />
                {e} {l}
              </span>
            ))}
            <span style={{ width: 1, background: C.border, margin: "0 4px" }} />
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 20, height: 4, background: "#ef4444", borderRadius: 2, display: "inline-block" }} />
              On Active Ride
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 20, height: 4, background: "#22c55e", borderRadius: 2, display: "inline-block" }} />
              Available
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: "0.8rem" }}>📍</span> Admin / You
            </span>
          </div>
        </div>
        <div style={{ padding: "0.875rem" }}>
          <LiveMap
            drivers={withLocation}
            activeRides={activeRides}
            adminCenter={adminCenter}
            height={520}
          />
          {withLocation.length === 0 && (
            <div style={{ textAlign: "center", color: C.muted, fontSize: "0.82rem", marginTop: 8 }}>
              No online drivers with GPS signal right now
            </div>
          )}
        </div>
      </Card>

      {/* Driver table */}
      <Card style={{ marginBottom: "1.5rem" }}>
        <div style={{ padding: "0.875rem 1rem", borderBottom: "1px solid " + C.border, fontWeight: 700 }}>
          📍 Driver Locations
        </div>
        <Table
          headers={["Driver","Vehicle","Type","Status","GPS Coordinates","ETA to Admin","Active Ride","Action"]}
          isEmpty={activeDrivers.length === 0}
          emptyMessage="No drivers online"
        >
          {activeDrivers.map((d: any) => {
            const ride   = activeRides.find((t: any) => t.assignedDriver?._id === d._id || t.assignedDriver === d._id);
            const coords = getDriverCoords(d);
            const eta    = getEta(d, adminCenter);
            return (
              <TR key={d._id} onClick={() => setSel({ type: "driver", data: d })}>
                <TD><div style={{ fontWeight: 600 }}>{d.name}</div><div style={{ fontSize: "0.7rem", color: C.muted, fontFamily: "monospace" }}>{d.phone}</div></TD>
                <TD mono muted style={{ fontSize: "0.8rem" }}>{d.vehicleNumber ?? "—"}</TD>
                <TD>
                  <span style={{ fontSize: "0.78rem", padding: "2px 8px", borderRadius: 6, background: "#1e2330", color: C.text }}>
                    {d.vehicleType ? d.vehicleType.charAt(0).toUpperCase() + d.vehicleType.slice(1) : "—"}
                  </span>
                </TD>
                <TD><Badge status="online" /></TD>
                <TD mono muted style={{ fontSize: "0.7rem" }}>
                  {coords ? `${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}` : <span style={{ color: C.red }}>No signal</span>}
                </TD>
                <TD mono style={{ fontSize: "0.75rem", color: eta ? C.amber : C.muted, fontWeight: eta ? 700 : 400 }}>
                  {eta ? eta.label : "—"}
                </TD>
                <TD muted style={{ fontSize: "0.75rem" }}>{ride ? "#" + ride._id.slice(-8).toUpperCase() : "—"}</TD>
                <TD>
                  {coords && (
                    <a href={`https://maps.olakrutrim.com/?q=${coords[1]},${coords[0]}`}
                      target="_blank" rel="noreferrer"
                      style={{ color: C.primary, fontSize: "0.75rem", fontWeight: 700 }}>
                      Open Map ↗
                    </a>
                  )}
                </TD>
              </TR>
            );
          })}
        </Table>
      </Card>

      {/* Active rides table */}
      <Card>
        <div style={{ padding: "0.875rem 1rem", borderBottom: "1px solid " + C.border, fontWeight: 700 }}>
          🚘 Active Rides — Route Details
        </div>
        <Table
          headers={["Ride ID","Customer","Driver","Pickup","Drop","Fare",""]}
          isEmpty={activeRides.length === 0}
          emptyMessage="No active rides"
        >
          {activeRides.map((t: any) => (
            <TR key={t._id} onClick={() => setSel({ type: "ride", data: t })}>
              <TD mono muted>#{t._id.slice(-8).toUpperCase()}</TD>
              <TD>{t.customerId?.name ?? "—"}</TD>
              <TD>{t.assignedDriver?.name ?? "—"}</TD>
              <TD muted style={{ fontSize: "0.72rem", maxWidth: 160 }}>{t.pickup?.address ?? "—"}</TD>
              <TD muted style={{ fontSize: "0.72rem", maxWidth: 160 }}>{t.drop?.address ?? "—"}</TD>
              <TD mono style={{ color: C.amber, fontWeight: 700 }}>₹{(t.finalFare ?? t.fare ?? 0).toFixed(0)}</TD>
              <TD><span style={{ color: C.primary, fontSize: "0.75rem", fontWeight: 700 }}>View Route →</span></TD>
            </TR>
          ))}
        </Table>
      </Card>

      {/* Detail modal */}
      <Modal
        open={!!sel}
        onClose={() => setSel(null)}
        title={sel?.type === "driver" ? "Driver Location" : "Ride Route"}
        width={560}
      >
        {sel?.type === "driver" && sel.data && (() => {
          const coords = getDriverCoords(sel.data);
          const eta    = getEta(sel.data, adminCenter);
          return (
            <>
              <LiveMap focusDriver={sel.data} drivers={[sel.data]} adminCenter={adminCenter} height={280} />
              <div style={{ marginTop: "0.875rem" }}>
                <InfoRow label="Driver"      value={sel.data.name} />
                <InfoRow label="Phone"       value={sel.data.phone} />
                <InfoRow label="Vehicle"     value={`${sel.data.vehicleType ?? "—"} · ${sel.data.vehicleNumber ?? "—"}`} />
                <InfoRow label="Coordinates" value={coords ? `${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}` : "No signal"} />
                <InfoRow label="ETA to Admin" value={eta ? eta.label : "Unavailable"} color={eta ? C.amber : C.muted} />
              </div>
            </>
          );
        })()}
        {sel?.type === "ride" && sel.data && (
          <>
            <LiveMap focusRide={sel.data} activeRides={[sel.data]} adminCenter={adminCenter} height={280} />
            <div style={{ marginTop: "0.875rem" }}>
              <InfoRow label="Pickup" value={sel.data.pickup?.address ?? "—"} />
              <InfoRow label="Drop"   value={sel.data.drop?.address ?? "—"} />
              <InfoRow label="Driver" value={sel.data.assignedDriver?.name ?? "—"} />
              <InfoRow label="Fare"   value={`₹${(sel.data.finalFare ?? sel.data.fare ?? 0).toFixed(2)}`} color={C.amber} />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}