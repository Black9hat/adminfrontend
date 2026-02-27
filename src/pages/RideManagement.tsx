import React, { useState, useMemo, useEffect, useRef } from "react";
import { RefreshCw, UserCheck, XCircle, RotateCcw, MapPin } from "lucide-react";
import { useTrips, useDrivers, useMutation } from "../hooks/index";
import type { Trip } from "../types/index";
import {
  Badge, Btn, Card, Table, TR, TD, Modal, Spinner, PageError, Empty,
  PageHeader, SearchBar, Sel, Tabs, Timeline, InfoRow, SectionLabel,
  ConfirmDialog, C, Pagination,
} from "../components/ui";
import { toast } from "react-toastify";

const PER = 20;
const STATUS_OPTS = [
  { value: "all",             label: "All Status"  },
  { value: "requested",       label: "Requested"   },
  { value: "driver_assigned", label: "Assigned"    },
  { value: "ride_started",    label: "In Progress" },
  { value: "completed",       label: "Completed"   },
  { value: "cancelled",       label: "Cancelled"   },
];
const TYPE_OPTS = [
  { value: "all",    label: "All Types"    },
  { value: "short",  label: "🏙️ City Ride" },
  { value: "long",   label: "🛣️ Long Route" },
  { value: "parcel", label: "📦 Parcel"    },
];
const VI: Record<string, string> = { bike: "🏍️", auto: "🛺", car: "🚗", premium: "🚙", xl: "🚐" };

// ── Google Maps script loader (shared singleton) ──────────────────────────────
const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY ?? "";
let _scriptState: "idle" | "loading" | "ready" = (window as any).google?.maps ? "ready" : "idle";
const _cbs: Array<() => void> = [];

function loadGoogleMapsScript(cb: () => void) {
  if (!MAPS_KEY) return;
  if (_scriptState === "ready") { cb(); return; }
  _cbs.push(cb);
  if (_scriptState === "loading") return;
  _scriptState = "loading";
  const s = document.createElement("script");
  s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=geometry,directions`;
  s.async = true;
  s.defer = true;
  s.onload = () => {
    _scriptState = "ready";
    _cbs.forEach(fn => fn());
    _cbs.length = 0;
  };
  document.head.appendChild(s);
}

// ── Dark map style ────────────────────────────────────────────────────────────
const DARK_STYLE = [
  { elementType: "geometry",           stylers: [{ color: "#0e1015" }] },
  { elementType: "labels.text.fill",   stylers: [{ color: "#6b7280" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0e1015" }] },
  { featureType: "road",  elementType: "geometry",          stylers: [{ color: "#1e2330" }] },
  { featureType: "road",  elementType: "geometry.stroke",   stylers: [{ color: "#13161e" }] },
  { featureType: "road",  elementType: "labels.text.fill",  stylers: [{ color: "#4a5568" }] },
  { featureType: "water", elementType: "geometry",          stylers: [{ color: "#080a0f" }] },
  { featureType: "poi",        stylers: [{ visibility: "off" }] },
  { featureType: "transit",    stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1e2330" }] },
];

// ── Coord helper ──────────────────────────────────────────────────────────────
// MongoDB stores coordinates as [longitude, latitude] (GeoJSON order).
// The admin API returns the raw document, so:
//   trip.pickup.coordinates = [lng, lat]
//   trip.drop.coordinates   = [lng, lat]
function toLatLng(loc?: Trip["pickup"]): { lat: number; lng: number } | null {
  if (!loc) return null;
  const c = loc.coordinates;
  if (c && c.length === 2) return { lat: c[1], lng: c[0] };  // [lng, lat] → {lat, lng}
  return null;
}

// ── RideMap component ─────────────────────────────────────────────────────────
interface RideMapProps {
  trip: Trip;
  height?: number;
}

function RideMap({ trip, height = 220 }: RideMapProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(_scriptState === "ready");

  useEffect(() => {
    if (!MAPS_KEY) return;
    loadGoogleMapsScript(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !divRef.current) return;

    const pickup = toLatLng(trip.pickup);
    const drop   = toLatLng(trip.drop);

    if (!pickup) return; // no coordinates — nothing to render

    try {
      const G   = (window as any).google.maps;
      const map = new G.Map(divRef.current, {
        zoom: 13,
        center: pickup,
        mapTypeId: "roadmap",
        styles: DARK_STYLE,
        disableDefaultUI: true,
        zoomControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      // Pickup marker
      new G.Marker({
        position: pickup,
        map,
        title: "Pickup: " + (trip.pickup?.address ?? ""),
        icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
      });

      if (drop) {
        // Drop marker
        new G.Marker({
          position: drop,
          map,
          title: "Drop: " + (trip.drop?.address ?? ""),
          icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
        });

        // Route line
        new G.Polyline({
          path: [pickup, drop],
          geodesic: true,
          strokeColor: "#6366f1",
          strokeOpacity: 0.7,
          strokeWeight: 3,
          map,
        });

        // Fit both points
        const bounds = new G.LatLngBounds();
        bounds.extend(pickup);
        bounds.extend(drop);
        map.fitBounds(bounds, 48);
      }
    } catch (e) {
      console.warn("Map init error:", e);
    }
  }, [ready, trip]);

  if (!MAPS_KEY) {
    return (
      <div style={{
        height, background: "#0e1015", border: "1px solid #1e2330",
        borderRadius: 10, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 8,
      }}>
        <span style={{ fontSize: "1.5rem" }}>🗺️</span>
        <span style={{ color: C.muted, fontSize: "0.75rem", fontFamily: "monospace" }}>
          Add VITE_GOOGLE_MAPS_KEY to .env to enable map
        </span>
      </div>
    );
  }

  return (
    <div ref={divRef} style={{
      width: "100%",
      height: `${height}px`,
      borderRadius: "10px",
      background: "#0e1015",
      border: "1px solid #1e2330",
    }} />
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RideManagement() {
  const { trips, loading, error, refetch } = useTrips();
  const { drivers } = useDrivers();
  const { mutate, loading: acting } = useMutation();

  const [status,     setStatus]   = useState("all");
  const [type,       setType]     = useState("all");
  const [q,          setQ]        = useState("");
  const [page,       setPage]     = useState(1);
  const [sel,        setSel]      = useState<Trip | null>(null);
  const [assignOpen, setAO]       = useState(false);
  const [assignDrvr, setAD]       = useState("");
  const [cancelOpen, setCO]       = useState(false);

  const filtered = useMemo(() => {
    let base = trips;
    if (status !== "all") base = base.filter(t => t.status === status);
    if (type   !== "all") base = base.filter(t => t.type === type);
    if (q) {
      const ql = q.toLowerCase();
      base = base.filter(t =>
        [t._id, t.customerId?.name, t.customerId?.phone, t.assignedDriver?.name,
         t.pickup?.address, t.drop?.address].some(v => v?.toLowerCase?.().includes(ql))
      );
    }
    return base.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [trips, status, type, q]);

  const pages = Math.ceil(filtered.length / PER);
  const paged = filtered.slice((page - 1) * PER, page * PER);

  const doAssign = async () => {
    if (!sel || !assignDrvr) return;
    // Uses the route confirmed in your adminRoutes.js: POST /admin/manual-assign
    const { ok } = await mutate("post", "/admin/manual-assign", { tripId: sel._id, driverId: assignDrvr });
    if (ok) { toast.success("Driver assigned"); setAO(false); refetch(); }
    else toast.error("Assignment failed");
  };

  const doCancel = async () => {
    if (!sel) return;
    // Uses the route confirmed in your adminRoutes.js: PUT /admin/trip/:tripId/cancel
    const { ok } = await mutate("put", `/admin/trip/${sel._id}/cancel`, {});
    if (ok) { toast.success("Trip cancelled"); setCO(false); setSel(null); refetch(); }
    else toast.error("Cancellation failed");
  };

  if (loading) return <Spinner label="Loading rides…" />;
  if (error)   return <PageError message={error} onRetry={refetch} />;

  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      display: "flex",
      flexDirection: "column",
      background: "linear-gradient(135deg, #0f1117 0%, #131820 100%)",
      fontFamily: "'Syne','Segoe UI',sans-serif",
      margin: 0,
      padding: 0,
    }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.4); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.6); }
      `}</style>

      {/* Header */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(0,0,0,0.3)",
        padding: "1.5rem 2rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backdropFilter: "blur(10px)",
        flexShrink: 0,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
            <span style={{ fontSize: "1.8rem" }}>🚘</span>
            <h1 style={{
              margin: 0, fontSize: "1.75rem", fontWeight: 900,
              color: "#f1f5f9", letterSpacing: "-0.02em",
            }}>
              Ride Management
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>
            {trips.length} total · {trips.filter(t => t.status === "ride_started").length} active now
          </p>
        </div>
        <Btn icon={<RefreshCw size={14} />} variant="ghost" onClick={refetch}>Refresh</Btn>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "2rem", width: "100%" }}>

        {/* Status tabs */}
        <div style={{ marginBottom: "1.5rem" }}>
          <Tabs tabs={STATUS_OPTS} active={status} onChange={s => { setStatus(s); setPage(1); }} />
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "1.5rem", alignItems: "center" }}>
          <SearchBar
            value={q}
            onChange={v => { setQ(v); setPage(1); }}
            placeholder="Search trip ID, customer, driver, address…"
          />
          <Sel value={type} options={TYPE_OPTS} onChange={t => { setType(t); setPage(1); }} />
          <span style={{ fontSize: "0.72rem", color: "#6b7280", fontFamily: "monospace" }}>
            {filtered.length} results
          </span>
        </div>

        {/* Table */}
        <Card>
          <Table
            headers={["Trip ID", "Type", "Customer", "Driver", "Route", "Fare", "Status", "Date", "Actions"]}
            isEmpty={paged.length === 0}
            emptyMessage="No rides found"
          >
            {paged.map(t => (
              <TR key={t._id} onClick={() => setSel(t)}>
                <TD mono muted>#{t._id?.slice(-6).toUpperCase()}</TD>
                <TD>
                  <span style={{ fontSize: "1rem" }}>{VI[t.vehicleType?.toLowerCase()] ?? "🚗"}</span>
                  {" "}<span style={{ fontSize: "0.75rem", color: C.muted }}>{t.type}</span>
                </TD>
                <TD>
                  <div style={{ fontWeight: 600 }}>{t.customerId?.name ?? "—"}</div>
                  <div style={{ fontSize: "0.7rem", color: "#6b7280", fontFamily: "monospace" }}>{t.customerId?.phone}</div>
                </TD>
                <TD>
                  {t.assignedDriver
                    ? <div>
                        <div style={{ fontWeight: 600 }}>{t.assignedDriver.name}</div>
                        <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>{t.assignedDriver.phone}</div>
                      </div>
                    : <span style={{ color: "#6b7280" }}>Unassigned</span>}
                </TD>
                <TD style={{ maxWidth: 160 }}>
                  {/* pickup.address — correct field from Trip type */}
                  <div style={{ fontSize: "0.7rem", color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <MapPin size={10} style={{ marginRight: 3, verticalAlign: "middle" }} />
                    {t.pickup?.address ?? "—"}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                    🏁 {t.drop?.address ?? "—"}
                  </div>
                </TD>
                <TD mono>
                  <span style={{ fontWeight: 700, color: "#f59e0b" }}>₹{Math.round(t.finalFare ?? t.fare ?? 0)}</span>
                </TD>
                <TD><Badge status={t.status} /></TD>
                <TD mono muted style={{ fontSize: "0.7rem" }}>{new Date(t.createdAt).toLocaleDateString("en-IN")}</TD>
                <TD>
                  <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                    {t.status === "requested" && (
                      <Btn size="sm" variant="success" icon={<UserCheck size={11} />} onClick={() => { setSel(t); setAO(true); }}>Assign</Btn>
                    )}
                    {["requested", "driver_assigned", "ride_started"].includes(t.status) && (
                      <Btn size="sm" variant="danger" icon={<XCircle size={11} />} onClick={() => { setSel(t); setCO(true); }}>Cancel</Btn>
                    )}
                    <Btn size="sm" variant="ghost" icon={<RotateCcw size={11} />} onClick={() => setSel(t)}>Details</Btn>
                  </div>
                </TD>
              </TR>
            ))}
          </Table>
          <Pagination page={page} pages={pages} total={filtered.length} perPage={PER} onChange={setPage} />
        </Card>
      </div>

      {/* Detail modal */}
      <Modal open={!!sel && !assignOpen && !cancelOpen} onClose={() => setSel(null)} title="Trip Details" width={540}>
        {sel && (
          <>
            {/* Map — uses trip.pickup.coordinates and trip.drop.coordinates */}
            <RideMap trip={sel} height={240} />

            <div style={{ marginTop: "1rem" }}>
              <InfoRow label="Trip ID"      value={"#" + sel._id?.slice(-6).toUpperCase()} />
              <InfoRow label="Type"         value={sel.type?.toUpperCase()} />
              <InfoRow label="Vehicle"      value={(VI[sel.vehicleType?.toLowerCase()] ?? "🚗") + " " + sel.vehicleType?.toUpperCase()} />
              <InfoRow label="Customer"     value={sel.customerId?.name ?? "—"} />
              <InfoRow label="Phone"        value={sel.customerId?.phone ?? "—"} />
              <InfoRow label="Driver"       value={sel.assignedDriver?.name ?? "Unassigned"} />
              {/* pickup.address — correct field */}
              <InfoRow label="Pickup"       value={sel.pickup?.address ?? "—"} />
              {/* drop.address — correct field */}
              <InfoRow label="Drop"         value={sel.drop?.address ?? "—"} />
              <InfoRow label="Fare"         value={"₹" + Math.round(sel.finalFare ?? sel.fare ?? 0)} color="#f59e0b" />
              <InfoRow label="Payment"      value={sel.payment?.collected ? "✅ Paid" : "⏳ Pending"} />
              <InfoRow label="Status"       value={<Badge status={sel.status} />} />
              <InfoRow label="Created"      value={new Date(sel.createdAt).toLocaleString("en-IN")} />
              {sel.completedAt && (
                <InfoRow label="Completed"  value={new Date(sel.completedAt).toLocaleString("en-IN")} />
              )}
              {sel.cancellationReason && (
                <InfoRow label="Cancel Reason" value={sel.cancellationReason} color={C.red} />
              )}

              <SectionLabel>Timeline</SectionLabel>
              <Timeline events={[
                { label: "Requested",    time: sel.createdAt,     done: true,                         color: C.muted   },
                { label: "Accepted",     time: sel.acceptedAt,    done: !!sel.acceptedAt,             color: C.cyan    },
                { label: "Ride Started", time: sel.rideStartTime, done: !!sel.rideStartTime,          color: C.primary },
                { label: "Completed",    time: sel.completedAt,   done: sel.status === "completed",   color: C.green   },
                { label: "Cancelled",    time: sel.cancelledAt,   done: sel.status === "cancelled",   color: C.red     },
              ]} />

              <div style={{ display: "flex", gap: 8, marginTop: "1rem", justifyContent: "flex-end" }}>
                {sel.status === "requested" && (
                  <Btn variant="success" icon={<UserCheck size={13} />} onClick={() => setAO(true)}>Assign Driver</Btn>
                )}
                {["requested", "driver_assigned", "ride_started"].includes(sel.status) && (
                  <Btn variant="danger" icon={<XCircle size={13} />} onClick={() => setCO(true)}>Cancel Trip</Btn>
                )}
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* Assign driver modal */}
      <Modal open={assignOpen} onClose={() => setAO(false)} title="Assign Driver" width={400}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <p style={{ margin: 0, color: C.muted, fontSize: "0.85rem" }}>
            Select an online driver for trip #{sel?._id?.slice(-6).toUpperCase()}.
          </p>
          <Sel
            value={assignDrvr}
            onChange={setAD}
            options={[
              { value: "", label: "Select driver…" },
              ...drivers
                .filter(d => d.isOnline && !d.isBlocked)
                .map(d => ({ value: d._id, label: `${d.name} · ${d.vehicleType ?? ""} · ${d.phone}` })),
            ]}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setAO(false)}>Cancel</Btn>
            <Btn variant="success" onClick={doAssign} disabled={!assignDrvr} loading={acting}>Assign</Btn>
          </div>
        </div>
      </Modal>

      {/* Cancel confirm */}
      <ConfirmDialog
        open={cancelOpen} onClose={() => setCO(false)} onConfirm={doCancel}
        title="Cancel Trip"
        message={`Cancel trip #${sel?._id?.slice(-6).toUpperCase()}? This cannot be undone.`}
        confirmLabel="Yes, Cancel" danger loading={acting}
      />
    </div>
  );
}