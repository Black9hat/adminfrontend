// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3 — GPS & Location Monitoring
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useMemo, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { useTrips, useDrivers, useMutation } from "../hooks";
import {
  Badge, Btn, Card, Table, TR, TD, Modal, Spinner, PageError,
  PageHeader, SearchBar, StatCard, SectionLabel, InfoRow, C, Tabs,
} from "../components/ui";
import { toast } from "react-toastify";
import { OlaMaps, defaultStyleJson } from "olamaps-web-sdk";

// ── Ola Maps API key from .env ────────────────────────────────────────────────
const MAPS_KEY = import.meta.env.VITE_OLA_MAPS_KEY ?? "";

// ── Default center: Hyderabad ─────────────────────────────────────────────────
const DEFAULT_CENTER = { lat: 17.3850, lng: 78.4867 };

type LatLngPoint = { lat: number; lng: number };

// ─────────────────────────────────────────────────────────────────────────────
// POLYLINE DECODER — ported directly from Flutter's _decodePolyline()
// Returns GeoJSON [lng, lat] pairs for use with Ola Maps sources
// ─────────────────────────────────────────────────────────────────────────────
function decodePolyline(encoded: string): [number, number][] {
  const result: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b: number, shift = 0, res = 0;
    do { b = encoded.charCodeAt(index++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += res & 1 ? ~(res >> 1) : res >> 1;
    shift = 0; res = 0;
    do { b = encoded.charCodeAt(index++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += res & 1 ? ~(res >> 1) : res >> 1;
    result.push([lng / 1e5, lat / 1e5]); // GeoJSON order: [lng, lat]
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// OLA ROUTE FETCHER — mirrors Flutter's _fetchRouteFromOla()
// Returns decoded GeoJSON [lng, lat] coordinate array, or null on failure
// Falls back to straight-line pair if API call fails (safe degradation)
// ─────────────────────────────────────────────────────────────────────────────
async function fetchOlaRoute(
  origin: LatLngPoint,
  destination: LatLngPoint,
  apiKey: string
): Promise<[number, number][] | null> {
  if (!apiKey) return null;
  try {
    const url = `https://api.olamaps.io/routing/v1/directions?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&api_key=${apiKey}`;
    const res = await fetch(url, { method: "POST" });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "SUCCESS") return null;

    const route = data.routes?.[0];
    if (!route) return null;

    // Try overview_polyline first (same priority as Flutter)
    const poly =
      typeof route.overview_polyline === "string"
        ? route.overview_polyline
        : route.overview_polyline?.points;
    if (poly) return decodePolyline(poly);

    // Fallback: GeoJSON geometry.coordinates [lng, lat]
    if (route.geometry?.coordinates?.length) return route.geometry.coordinates;

    return null;
  } catch {
    return null;
  }
}

// ── Reusable map container ────────────────────────────────────────────────────
interface LiveMapProps {
  drivers?: any[];
  activeRides?: any[];
  focusDriver?: any;
  focusRide?: any;
  height?: number;
  adminCenter?: LatLngPoint | null;
}

// ── Helper: extract [lng, lat] from a driver object
function getDriverCoords(driver: any): [number, number] | null {
  if (driver?.location?.coordinates?.length === 2) {
    return driver.location.coordinates as [number, number];
  }
  if (driver?.currentLocation?.coordinates?.length === 2) {
    return driver.currentLocation.coordinates as [number, number];
  }
  return null;
}

// ── ETA helper ────────────────────────────────────────────────────────────────
const AVG_CITY_SPEED_KMPH = 25;

function distanceKmBetween(a: LatLngPoint, b: LatLngPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function getDriverEtaToAdmin(
  driver: any,
  adminCenter?: LatLngPoint | null
): { km: number; min: number; label: string } | null {
  const coords = getDriverCoords(driver);
  if (!coords || !adminCenter) return null;
  const [lng, lat] = coords;
  const km = distanceKmBetween({ lat, lng }, adminCenter);
  const min = Math.max(1, Math.ceil((km / AVG_CITY_SPEED_KMPH) * 60));
  return { km, min, label: `${min} min (${km.toFixed(1)} km away)` };
}

// ─────────────────────────────────────────────────────────────────────────────
// LiveMap — renders Ola Maps with real road polylines for each driver route
// ─────────────────────────────────────────────────────────────────────────────
function LiveMap({
  drivers = [],
  activeRides = [],
  focusDriver,
  focusRide,
  height = 500,
  adminCenter,
}: LiveMapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<any>(null);

  const center = useMemo(() => {
    if (focusDriver) {
      const c = getDriverCoords(focusDriver);
      if (c) return { lat: c[1], lng: c[0] };
    }
    if (focusRide?.pickup?.location?.coordinates) {
      const [lng, lat] = focusRide.pickup.location.coordinates;
      return { lat, lng };
    }
    if (!focusDriver && !focusRide && adminCenter) return adminCenter;
    const first = drivers.find((d) => getDriverCoords(d));
    if (first) {
      const c = getDriverCoords(first)!;
      return { lat: c[1], lng: c[0] };
    }
    return DEFAULT_CENTER;
  }, [drivers, focusDriver, focusRide, adminCenter]);

  const zoom = focusDriver || focusRide ? 14 : 12;

  // Route polyline for focused ride
  const routePath = useMemo(() => {
    if (!focusRide) return [];
    const path: LatLngPoint[] = [];
    if (focusRide.pickup?.location?.coordinates) {
      const [lng, lat] = focusRide.pickup.location.coordinates;
      path.push({ lat, lng });
    }
    if (focusRide.drop?.location?.coordinates) {
      const [lng, lat] = focusRide.drop.location.coordinates;
      path.push({ lat, lng });
    }
    return path;
  }, [focusRide]);

  // Driver routes: adminCenter → each online driver
  // Red = driver has active ride, Green = available
  const driverRoutes = useMemo(() => {
    const routes: Array<{
      coordinates: [number, number][];
      color: string;
      status: "active" | "available";
      driverId: string;
    }> = [];

    if (!adminCenter) return routes;

    drivers.forEach((d) => {
      const coords = getDriverCoords(d);
      if (!coords) return;
      const [dLng, dLat] = coords;
      const hasActiveRide = activeRides.some(
        (t: any) => t.assignedDriver?._id === d._id || t.assignedDriver === d._id
      );
      routes.push({
        coordinates: [[adminCenter.lng, adminCenter.lat], [dLng, dLat]],
        color: hasActiveRide ? "#ef4444" : "#22c55e",
        status: hasActiveRide ? "active" : "available",
        driverId: d._id,
      });
    });

    return routes;
  }, [drivers, adminCenter, activeRides]);

  const createMarkerElement = (color: string, glyph: string) => {
    const el = document.createElement("div");
    el.style.width = "32px";
    el.style.height = "32px";
    el.style.borderRadius = "999px";
    el.style.background = color;
    el.style.border = "2.5px solid #fff";
    el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.35)";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.fontSize = "15px";
    el.style.cursor = "pointer";
    el.style.userSelect = "none";
    el.textContent = glyph;
    return el;
  };

  const vehicleEmoji = (type: string) => {
    switch ((type || "").toLowerCase()) {
      case "bike":    return "🏍️";
      case "auto":    return "🛺";
      case "car":     return "🚗";
      case "premium": return "🚙";
      case "xl":      return "🚐";
      default:        return "🚘";
    }
  };

  const vehicleColor = (type: string) => {
    switch ((type || "").toLowerCase()) {
      case "bike":    return "#6366f1";
      case "auto":    return "#f59e0b";
      case "car":     return "#22c55e";
      case "premium": return "#8b5cf6";
      case "xl":      return "#06b6d4";
      default:        return "#6366f1";
    }
  };

  const buildPopup = (title: string, lines: string[]) => `
    <div style="font-family: Inter, Segoe UI, sans-serif; min-width: 160px; color: #0f172a;">
      <div style="font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">${title}</div>
      ${lines.map((line) => `<div style="font-size: 0.8rem; line-height: 1.5; color: #334155;">${line}</div>`).join("")}
    </div>
  `;

  useEffect(() => {
    if (!MAPS_KEY || !containerRef.current) return;

    let cancelled = false;
    const markers: any[] = [];

    const cleanup = () => {
      markers.forEach((marker) => marker.remove?.());
      markers.length = 0;
      if (mapRef.current) {
        mapRef.current.remove?.();
        mapRef.current = null;
      }
    };

    // initMap is async so we can await road-route fetches
    const initMap = async () => {
      const olaMaps = new OlaMaps({ apiKey: MAPS_KEY });
      const map = await olaMaps.init({
        container: containerRef.current,
        style: defaultStyleJson,
        center: [center.lng, center.lat],
        zoom,
        attributionControl: false,
      });

      if (cancelled) { map.remove?.(); return; }
      mapRef.current = map;

      map.addControl(new OlaMaps.NavigationControl({ showCompass: true }), "top-right");

      const addMarker = (
        lng: number,
        lat: number,
        element: HTMLElement,
        popupHtml: string
      ) => {
        const marker = new OlaMaps.Marker({ element })
          .setLngLat([lng, lat])
          .setPopup(
            new OlaMaps.Popup({ offset: 18, closeButton: false, closeOnClick: false })
              .setHTML(popupHtml)
          )
          .addTo(map);
        markers.push(marker);
        return marker;
      };

      // ── Admin center marker ────────────────────────────────────────────────
      if (adminCenter) {
        const centerEl = createMarkerElement("#f97316", "●");
        centerEl.style.width = "34px";
        centerEl.style.height = "34px";
        centerEl.style.fontSize = "18px";
        centerEl.style.zIndex = "9999";
        addMarker(
          adminCenter.lng,
          adminCenter.lat,
          centerEl,
          buildPopup("Admin Center", [
            "Current laptop/admin location",
            `${adminCenter.lat.toFixed(6)}, ${adminCenter.lng.toFixed(6)}`,
          ])
        );
      }

      // ── Driver markers ─────────────────────────────────────────────────────
      drivers.forEach((d) => {
        const coords = getDriverCoords(d);
        if (!coords) return;
        const [lng, lat] = coords;
        const vType = d.vehicleType || "bike";
        const eta = getDriverEtaToAdmin(d, adminCenter);
        addMarker(
          lng,
          lat,
          createMarkerElement(vehicleColor(vType), vehicleEmoji(vType)),
          buildPopup("Driver · " + vType.toUpperCase(), [
            `<strong>${d.name || "—"}</strong>`,
            `📱 ${d.phone ?? "—"}`,
            `🚗 ${d.vehicleNumber ?? "—"}`,
            `<span style="color:#22c55e">● Online</span>`,
            eta ? `<hr style="border:none;border-top:1px solid #e2e8f0;margin:6px 0;" />` : "",
            eta
              ? `🕒 Arriving in <strong style="color:#f97316">${eta.min} min</strong> (${eta.km.toFixed(1)} km)`
              : `🕒 ETA unavailable`,
          ].filter(Boolean))
        );
      });

      // ── Active ride markers (pickup + drop) ────────────────────────────────
      (focusRide ? activeRides : []).forEach((t) => {
        if (t.pickup?.location?.coordinates) {
          const [lng, lat] = t.pickup.location.coordinates;
          addMarker(
            lng, lat,
            createMarkerElement("#22c55e", "📍"),
            buildPopup("Pickup", [
              `${t.pickup?.address ?? "—"}`,
              `Ride #${t._id.slice(-8).toUpperCase()}`,
            ])
          );
        }
        if (t.drop?.location?.coordinates) {
          const [lng, lat] = t.drop.location.coordinates;
          addMarker(
            lng, lat,
            createMarkerElement("#ef4444", "🏁"),
            buildPopup("Drop", [
              `${t.drop?.address ?? "—"}`,
              `Ride #${t._id.slice(-8).toUpperCase()}`,
            ])
          );
        }
      });

      // ── Focused-ride route: real road polyline ─────────────────────────────
      if (routePath.length === 2) {
        const roadPath =
          (await fetchOlaRoute(routePath[0], routePath[1], MAPS_KEY)) ??
          routePath.map((p) => [p.lng, p.lat] as [number, number]);

        const routeData = {
          type: "Feature",
          geometry: { type: "LineString", coordinates: roadPath },
          properties: {},
        } as const;

        map.on("load", () => {
          if (map.getSource("focused-ride-route")) {
            (map.getSource("focused-ride-route") as any).setData(routeData);
          } else {
            map.addSource("focused-ride-route", { type: "geojson", data: routeData });
            map.addLayer({
              id: "focused-ride-route-line",
              type: "line",
              source: "focused-ride-route",
              layout: { "line-cap": "round", "line-join": "round" },
              paint: {
                "line-color": "#6366f1",
                "line-width": 6,
                "line-opacity": 0.9,
              },
            });
          }
        });
      }

      // ── Driver route lines: real road polylines (adminCenter → each driver) ─
      // Uses for...of so await works correctly (forEach doesn't await)
      // Falls back to straight line if Ola API fails for any driver
      for (const route of driverRoutes) {
        const [oLng, oLat] = route.coordinates[0]; // adminCenter
        const [dLng, dLat] = route.coordinates[1]; // driver

        const roadCoords =
          (await fetchOlaRoute(
            { lat: oLat, lng: oLng },
            { lat: dLat, lng: dLng },
            MAPS_KEY
          )) ?? route.coordinates; // fallback: keep original straight pair

        const sourceId = `driver-route-${route.driverId}`;
        const layerId  = `driver-route-${route.driverId}-line`;

        const routeData = {
          type: "Feature",
          geometry: { type: "LineString", coordinates: roadCoords },
          properties: {},
        } as const;

        map.on("load", () => {
          if (map.getSource(sourceId)) {
            (map.getSource(sourceId) as any).setData(routeData);
            if (map.getLayer(layerId)) {
              map.setPaintProperty(layerId, "line-color", route.color);
              map.setPaintProperty(
                layerId,
                "line-opacity",
                route.status === "active" ? 0.95 : 0.7
              );
              map.setPaintProperty(
                layerId,
                "line-width",
                route.status === "active" ? 7 : 5
              );
            }
          } else {
            map.addSource(sourceId, { type: "geojson", data: routeData });
            map.addLayer({
              id: layerId,
              type: "line",
              source: sourceId,
              layout: { "line-cap": "round", "line-join": "round" },
              paint: {
                "line-color": route.color,
                "line-width":   route.status === "active" ? 7 : 5,
                "line-opacity": route.status === "active" ? 0.95 : 0.7,
              },
            });
          }
        });
      }

      // ── Camera / bounds ────────────────────────────────────────────────────
      if (focusDriver) {
        map.setCenter([center.lng, center.lat]);
        map.setZoom(zoom);
      } else if (routePath.length === 2) {
        const [s, e] = routePath;
        map.fitBounds(
          [
            [Math.min(s.lng, e.lng), Math.min(s.lat, e.lat)],
            [Math.max(s.lng, e.lng), Math.max(s.lat, e.lat)],
          ],
          { padding: 48, duration: 0 }
        );
      } else if (drivers.length > 1) {
        const allCoords = drivers.map(getDriverCoords).filter(Boolean) as [number, number][];
        if (allCoords.length >= 2) {
          const lngs = allCoords.map((c) => c[0]);
          const lats = allCoords.map((c) => c[1]);
          map.fitBounds(
            [
              [Math.min(...lngs), Math.min(...lats)],
              [Math.max(...lngs), Math.max(...lats)],
            ],
            { padding: 60, duration: 0, maxZoom: 14 }
          );
        } else {
          map.setCenter([center.lng, center.lat]);
          map.setZoom(zoom);
        }
      } else {
        map.setCenter([center.lng, center.lat]);
        map.setZoom(zoom);
      }
    };

    initMap().catch(console.warn);
    return () => { cancelled = true; cleanup(); };
  }, [activeRides, center.lat, center.lng, focusDriver, focusRide, routePath, zoom, drivers, driverRoutes, adminCenter]);

  if (!MAPS_KEY) {
    return (
      <div
        style={{
          height,
          background: "#0e1015",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          border: "1px dashed #1e2330",
          gap: 10,
        }}
      >
        <span style={{ fontSize: "2rem" }}>🗺️</span>
        <div
          style={{
            color: "#4a5568",
            fontSize: "0.82rem",
            fontFamily: "monospace",
            textAlign: "center",
          }}
        >
          Add <span style={{ color: "#6366f1" }}>VITE_OLA_MAPS_KEY</span> to
          your <span style={{ color: "#f59e0b" }}>.env</span> file
          <br />
          then redeploy to enable live map
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height,
        borderRadius: 12,
        overflow: "hidden",
        background: "#0e1015",
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GPSMonitoring page
// ─────────────────────────────────────────────────────────────────────────────
export function GPSMonitoring() {
  const { trips, loading, error, refetch } = useTrips();
  const { drivers } = useDrivers();
  const [sel, setSel] = useState<any>(null);
  const [adminCenter, setAdminCenter] = useState<LatLngPoint | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        setAdminCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => setAdminCenter(DEFAULT_CENTER),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const activeRides   = useMemo(() => trips.filter((t: any) => t.status === "ride_started"), [trips]);
  const activeDrivers = useMemo(() => drivers.filter((d: any) => d.isOnline), [drivers]);
  const withLocation  = useMemo(() => activeDrivers.filter((d: any) => !!getDriverCoords(d)), [activeDrivers]);

  if (loading) return <Spinner label="Loading GPS data…" />;
  if (error)   return <PageError message={error} onRetry={refetch} />;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        padding: "1.75rem",
        fontFamily: "'Syne','Segoe UI',sans-serif",
      }}
    >
      <PageHeader
        title="GPS & Location Monitoring"
        icon="🗺️"
        sub={`${withLocation.length} drivers broadcasting · ${activeRides.length} rides in progress`}
        actions={
          <Btn icon={<RefreshCw size={14} />} variant="ghost" onClick={refetch}>
            Refresh
          </Btn>
        }
      />

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
          gap: "0.875rem",
          marginBottom: "1.5rem",
        }}
      >
        <StatCard label="Online Drivers"   value={activeDrivers.length}                  icon="🟢" color="#22c55e" />
        <StatCard label="Broadcasting GPS" value={withLocation.length}                   icon="📡" color="#6366f1" />
        <StatCard label="Active Rides"     value={activeRides.length}                    icon="🚘" color="#f59e0b" />
        <StatCard label="Offline Drivers"  value={drivers.length - activeDrivers.length} icon="⚫" color="#6b7280" />
      </div>

      {/* Live Map */}
      <Card style={{ marginBottom: "1.5rem", overflow: "hidden" }}>
        <div
          style={{
            padding: "0.875rem 1rem",
            borderBottom: "1px solid " + C.border,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontWeight: 700 }}>🗺️ Live Map — Riders &amp; Admin Center</span>
          {/* Legend */}
          <div style={{ display: "flex", gap: 12, fontSize: "0.72rem", color: C.muted }}>
            {[
              ["🏍️", "Bike",    "#6366f1"],
              ["🛺", "Auto",    "#f59e0b"],
              ["🚗", "Car",     "#22c55e"],
              ["🚙", "Premium", "#8b5cf6"],
              ["🚐", "XL",      "#06b6d4"],
            ].map(([e, l, c]) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: c as string,
                    display: "inline-block",
                  }}
                />
                {e} {l}
              </span>
            ))}
            <span style={{ width: 1, background: C.border, margin: "0 8px" }} />
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 16, height: 2, background: "#ef4444" }} />
              <span>On Active Ride</span>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 16, height: 2, background: "#22c55e", opacity: 0.6 }} />
              <span>Available</span>
            </span>
          </div>
        </div>
        <div style={{ padding: "0.875rem" }}>
          <LiveMap
            drivers={withLocation}
            activeRides={activeRides}
            adminCenter={adminCenter}
            height={500}
          />
          {withLocation.length === 0 && (
            <div
              style={{
                textAlign: "center",
                color: C.muted,
                fontSize: "0.82rem",
                marginTop: 8,
              }}
            >
              No online drivers with GPS signal right now
            </div>
          )}
        </div>
      </Card>

      {/* Driver location table */}
      <Card style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            padding: "0.875rem 1rem",
            borderBottom: "1px solid " + C.border,
            fontWeight: 700,
          }}
        >
          📍 Driver Locations
        </div>
        <Table
          headers={["Driver", "Vehicle", "Type", "Status", "GPS Coordinates", "ETA to Admin", "Active Ride", "Action"]}
          isEmpty={activeDrivers.length === 0}
          emptyMessage="No drivers online"
        >
          {activeDrivers.map((d: any) => {
            const ride   = activeRides.find(
              (t: any) => t.assignedDriver?._id === d._id || t.assignedDriver === d._id
            );
            const coords = getDriverCoords(d);
            const eta    = getDriverEtaToAdmin(d, adminCenter);
            return (
              <TR key={d._id} onClick={() => setSel({ type: "driver", data: d })}>
                <TD>
                  <div style={{ fontWeight: 600 }}>{d.name}</div>
                  <div style={{ fontSize: "0.7rem", color: C.muted, fontFamily: "monospace" }}>
                    {d.phone}
                  </div>
                </TD>
                <TD mono muted style={{ fontSize: "0.8rem" }}>{d.vehicleNumber ?? "—"}</TD>
                <TD>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      padding: "2px 8px",
                      borderRadius: 6,
                      background: "#1e2330",
                      color: C.text,
                    }}
                  >
                    {d.vehicleType
                      ? d.vehicleType.charAt(0).toUpperCase() + d.vehicleType.slice(1)
                      : "—"}
                  </span>
                </TD>
                <TD><Badge status="online" /></TD>
                <TD mono muted style={{ fontSize: "0.7rem" }}>
                  {coords ? (
                    `${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}`
                  ) : (
                    <span style={{ color: C.red }}>No signal</span>
                  )}
                </TD>
                <TD
                  mono
                  style={{
                    fontSize: "0.75rem",
                    color: eta ? C.amber : C.muted,
                    fontWeight: eta ? 700 : 400,
                  }}
                >
                  {eta ? eta.label : "—"}
                </TD>
                <TD muted style={{ fontSize: "0.75rem" }}>
                  {ride ? "#" + ride._id.slice(-8).toUpperCase() : "—"}
                </TD>
                <TD>
                  {coords && (
                    <a
                      href={`https://maps.olakrutrim.com/?q=${coords[1]},${coords[0]}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: C.primary, fontSize: "0.75rem", fontWeight: 700 }}
                    >
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
        <div
          style={{
            padding: "0.875rem 1rem",
            borderBottom: "1px solid " + C.border,
            fontWeight: 700,
          }}
        >
          🚘 Active Rides — Route Details
        </div>
        <Table
          headers={["Ride ID", "Customer", "Driver", "Pickup", "Drop", "Fare", ""]}
          isEmpty={activeRides.length === 0}
          emptyMessage="No active rides"
        >
          {activeRides.map((t: any) => (
            <TR key={t._id} onClick={() => setSel({ type: "ride", data: t })}>
              <TD mono muted>#{t._id.slice(-8).toUpperCase()}</TD>
              <TD>{t.customerId?.name ?? "—"}</TD>
              <TD>{t.assignedDriver?.name ?? "—"}</TD>
              <TD muted style={{ fontSize: "0.72rem", maxWidth: 160 }}>
                {t.pickup?.address ?? "—"}
              </TD>
              <TD muted style={{ fontSize: "0.72rem", maxWidth: 160 }}>
                {t.drop?.address ?? "—"}
              </TD>
              <TD mono style={{ color: C.amber, fontWeight: 700 }}>
                ₹{(t.finalFare ?? t.fare ?? 0).toFixed(0)}
              </TD>
              <TD>
                <span style={{ color: C.primary, fontSize: "0.75rem", fontWeight: 700 }}>
                  View Route →
                </span>
              </TD>
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
          const eta    = getDriverEtaToAdmin(sel.data, adminCenter);
          return (
            <>
              <LiveMap
                focusDriver={sel.data}
                drivers={[sel.data]}
                adminCenter={adminCenter}
                height={280}
              />
              <div style={{ marginTop: "0.875rem" }}>
                <InfoRow label="Driver"      value={sel.data.name} />
                <InfoRow label="Phone"       value={sel.data.phone} />
                <InfoRow
                  label="Vehicle"
                  value={`${sel.data.vehicleType ?? "—"} · ${sel.data.vehicleNumber ?? "—"}`}
                />
                <InfoRow
                  label="Coordinates"
                  value={
                    coords
                      ? `${coords[1].toFixed(6)}, ${coords[0].toFixed(6)}`
                      : "No signal"
                  }
                />
                <InfoRow
                  label="ETA to Admin Location"
                  value={eta ? eta.label : "Admin location / driver GPS missing"}
                  color={eta ? C.amber : C.muted}
                />
              </div>
            </>
          );
        })()}
        {sel?.type === "ride" && sel.data && (
          <>
            <LiveMap
              focusRide={sel.data}
              activeRides={[sel.data]}
              adminCenter={adminCenter}
              height={280}
            />
            <div style={{ marginTop: "0.875rem" }}>
              <InfoRow label="Pickup" value={sel.data.pickup?.address ?? "—"} />
              <InfoRow label="Drop"   value={sel.data.drop?.address ?? "—"} />
              <InfoRow label="Driver" value={sel.data.assignedDriver?.name ?? "—"} />
              <InfoRow
                label="Fare"
                value={`₹${(sel.data.finalFare ?? sel.data.fare ?? 0).toFixed(2)}`}
                color={C.amber}
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}