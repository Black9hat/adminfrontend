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
  s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=geometry`;
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
  { elementType: "geometry",          stylers: [{ color: "#0e1015" }] },
  { elementType: "labels.text.fill",  stylers: [{ color: "#6b7280" }] },
  { elementType: "labels.text.stroke",stylers: [{ color: "#0e1015" }] },
  { featureType: "road",  elementType: "geometry",         stylers: [{ color: "#1e2330" }] },
  { featureType: "road",  elementType: "geometry.stroke",  stylers: [{ color: "#13161e" }] },
  { featureType: "road",  elementType: "labels.text.fill", stylers: [{ color: "#4a5568" }] },
  { featureType: "water", elementType: "geometry",         stylers: [{ color: "#080a0f" }] },
  { featureType: "poi",   stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1e2330" }] },
];

// ── RideMap component ─────────────────────────────────────────────────────────
interface RideMapProps {
  trip: Trip;
  height?: number;
}

function RideMap({ trip, height = 220 }: RideMapProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(_scriptState === "ready");

  useEffect(() => {
    if (!MAPS_KEY) return;
    loadGoogleMapsScript(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !divRef.current) return;
    const g = (window as any).google.maps;

    const pickupCoords = trip.pickup?.coordinates;
    const dropCoords   = trip.drop?.coordinates;

    // Fallback: geocode addresses if no coordinates stored
    const pickupLatLng = pickupCoords
      ? { lat: pickupCoords[1], lng: pickupCoords[0] }
      : null;
    const dropLatLng = dropCoords
      ? { lat: dropCoords[1], lng: dropCoords[0] }
      : null;

    // Center: prefer pickup, else India
    const center = pickupLatLng ?? dropLatLng ?? { lat: 20.5937, lng: 78.9629 };
    const zoom   = (pickupLatLng && dropLatLng) ? 12 : pickupLatLng ? 14 : 5;

    if (!mapRef.current) {
      mapRef.current = new g.Map(divRef.current, {
        center, zoom,
        styles: DARK_STYLE,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
    } else {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(zoom);
    }

    const map      = mapRef.current;
    const overlays: any[] = [];

    // Pickup marker (green)
    if (pickupLatLng) {
      const m = new g.Marker({
        position: pickupLatLng, map,
        title: "Pickup: " + (trip.pickup?.address ?? ""),
        icon: {
          url: "data:image/svg+xml;utf8," + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44">
              <ellipse cx="17" cy="40" rx="6" ry="3" fill="rgba(0,0,0,0.25)"/>
              <path d="M17 2 C9 2 3 8 3 16 C3 26 17 40 17 40 C17 40 31 26 31 16 C31 8 25 2 17 2Z" fill="#22c55e" stroke="#fff" stroke-width="2"/>
              <circle cx="17" cy="16" r="6" fill="#fff"/>
            </svg>`
          ),
          scaledSize: new (window as any).google.maps.Size(34, 44),
          anchor: new (window as any).google.maps.Point(17, 40),
        },
      });
      const iw = new g.InfoWindow({
        content: `<div style="font-family:sans-serif;font-size:12px;padding:4px;max-width:200px">
          <strong style="color:#22c55e">📍 Pickup</strong><br/>
          ${trip.pickup?.address ?? "—"}
        </div>`,
      });
      m.addListener("click", () => iw.open(map, m));
      overlays.push(m, iw);
    }

    // Drop marker (red)
    if (dropLatLng) {
      const m = new g.Marker({
        position: dropLatLng, map,
        title: "Drop: " + (trip.drop?.address ?? ""),
        icon: {
          url: "data:image/svg+xml;utf8," + encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44">
              <ellipse cx="17" cy="40" rx="6" ry="3" fill="rgba(0,0,0,0.25)"/>
              <path d="M17 2 C9 2 3 8 3 16 C3 26 17 40 17 40 C17 40 31 26 31 16 C31 8 25 2 17 2Z" fill="#ef4444" stroke="#fff" stroke-width="2"/>
              <circle cx="17" cy="16" r="6" fill="#fff"/>
            </svg>`
          ),
          scaledSize: new (window as any).google.maps.Size(34, 44),
          anchor: new (window as any).google.maps.Point(17, 40),
        },
      });
      const iw = new g.InfoWindow({
        content: `<div style="font-family:sans-serif;font-size:12px;padding:4px;max-width:200px">
          <strong style="color:#ef4444">🏁 Drop</strong><br/>
          ${trip.drop?.address ?? "—"}
        </div>`,
      });
      m.addListener("click", () => iw.open(map, m));
      overlays.push(m, iw);
    }

    // Dashed route line between pickup and drop
    if (pickupLatLng && dropLatLng) {
      const poly = new g.Polyline({
        path: [pickupLatLng, dropLatLng],
        geodesic: true,
        strokeColor: "#6366f1",
        strokeOpacity: 0.9,
        strokeWeight: 3,
        icons: [{
          icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
          offset: "0",
          repeat: "18px",
        }],
        map,
      });
      overlays.push(poly);

      // Fit map to show both points
      const bounds = new g.LatLngBounds();
      bounds.extend(pickupLatLng);
      bounds.extend(dropLatLng);
      map.fitBounds(bounds, { top: 32, right: 32, bottom: 32, left: 32 });
    }

    return () => overlays.forEach(o => { try { o.setMap ? o.setMap(null) : o.close(); } catch {} });
  }, [ready, trip]);

  if (!MAPS_KEY) return (
    <div style={{
      height, background: "#0e1015", borderRadius: 12, border: "1px dashed #1e2330",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
    }}>
      <span style={{ fontSize: "1.8rem" }}>🗺️</span>
      <div style={{ color: "#4a5568", fontSize: "0.78rem", fontFamily: "monospace", textAlign: "center" }}>
        Add <span style={{ color: "#6366f1" }}>VITE_GOOGLE_MAPS_KEY</span> to <span style={{ color: "#f59e0b" }}>.env</span> to enable live map
      </div>
    </div>
  );

  if (!ready) return (
    <div style={{ height, background: "#0e1015", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "#6b7280", fontSize: "0.8rem", fontFamily: "monospace" }}>Loading map…</span>
    </div>
  );

  return <div ref={divRef} style={{ width: "100%", height, borderRadius: 12, overflow: "hidden" }} />;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RideManagement() {
  const { trips, loading, error, refetch } = useTrips();
  const { drivers } = useDrivers();
  const { mutate, loading: acting } = useMutation();

  const [tab, setTab]             = useState("all");
  const [q, setQ]                 = useState("");
  const [statusF, setStatusF]     = useState("all");
  const [typeF, setTypeF]         = useState("all");
  const [page, setPage]           = useState(1);
  const [detail, setDetail]       = useState<Trip | null>(null);
  const [confirm, setConfirm]     = useState<null | "cancel" | "refund" | "reassign">(null);
  const [selDriver, setSelDriver] = useState("");

  const active = useMemo(() =>
    trips.filter((t: Trip) => ["requested","driver_assigned","driver_at_pickup","ride_started"].includes(t.status)),
  [trips]);

  const filtered = useMemo(() => {
    let base = tab === "active" ? active : trips;
    if (statusF !== "all") base = base.filter((t: Trip) => t.status === statusF);
    if (typeF   !== "all") base = base.filter((t: Trip) => t.type === typeF);
    if (q) {
      const ql = q.toLowerCase();
      base = base.filter((t: Trip) =>
        [t._id, t.customerId?.name, t.customerId?.phone,
         t.assignedDriver?.name, t.assignedDriver?.phone,
         t.pickup?.address, t.drop?.address].some(v => v?.toLowerCase().includes(ql))
      );
    }
    return base.sort((a: Trip, b: Trip) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [trips, active, tab, statusF, typeF, q]);

  const pages = Math.ceil(filtered.length / PER);
  const paged = filtered.slice((page - 1) * PER, page * PER);
  const fare  = (t: Trip) => t.finalFare ?? t.fare ?? 0;

  const doCancel = async () => {
    if (!detail) return;
    const { ok } = await mutate("put", "/admin/trip/" + detail._id + "/cancel");
    if (ok) { toast.success("Trip cancelled"); setConfirm(null); refetch(); setDetail(null); }
    else toast.error("Failed to cancel");
  };

  const doReassign = async () => {
    if (!detail || !selDriver) return;
    const { ok } = await mutate("post", "/admin/manual-assign", { tripId: detail._id, driverId: selDriver });
    if (ok) { toast.success("Driver reassigned"); setConfirm(null); refetch(); }
    else toast.error("Reassignment failed");
  };

  const doRefund = async () => {
    const { ok } = await mutate("post", "/admin/payments/refund", { tripId: detail?._id });
    if (ok) { toast.success("Refund initiated"); setConfirm(null); }
    else toast.warning("Refund endpoint not configured — check backend");
  };

  if (loading) return <Spinner label="Loading rides…" />;
  if (error)   return <PageError message={error} onRetry={refetch} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "1.75rem", fontFamily: "'Syne','Segoe UI',sans-serif" }}>
      <PageHeader
        title="Ride Management" icon="🚘"
        sub={trips.length + " total rides · " + active.length + " active now"}
        actions={<Btn icon={<RefreshCw size={14} />} onClick={refetch} variant="ghost">Refresh</Btn>}
      />

      <Tabs
        tabs={[
          { key: "all",    label: "All Rides", count: trips.length  },
          { key: "active", label: "Active",    count: active.length },
        ]}
        active={tab} onChange={k => { setTab(k); setPage(1); }}
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "1rem 0" }}>
        <SearchBar value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Search ID, name, phone, address…" />
        <Sel value={statusF} onChange={v => { setStatusF(v); setPage(1); }} options={STATUS_OPTS} />
        <Sel value={typeF}   onChange={v => { setTypeF(v);   setPage(1); }} options={TYPE_OPTS} />
        <span style={{ fontSize: "0.72rem", color: C.muted, alignSelf: "center", fontFamily: "monospace" }}>{filtered.length} results</span>
      </div>

      <Card>
        <Table
          headers={["Trip ID", "Type", "Customer", "Driver", "Route", "Fare", "Status", "Date", ""]}
          isEmpty={paged.length === 0} emptyMessage="No rides match filters"
        >
          {paged.map((t: Trip) => (
            <TR key={t._id} onClick={() => setDetail(t)}>
              <TD mono muted>#{t._id.slice(-8).toUpperCase()}</TD>
              <TD><span style={{ background: "rgba(99,102,241,0.1)", borderRadius: 8, padding: "2px 8px", fontSize: "0.72rem" }}>{VI[t.vehicleType?.toLowerCase()] ?? "🚗"} {t.vehicleType}</span></TD>
              <TD>
                <div style={{ fontWeight: 600 }}>{t.customerId?.name ?? "—"}</div>
                <div style={{ fontSize: "0.7rem", color: C.muted, fontFamily: "monospace" }}>{t.customerId?.phone}</div>
              </TD>
              <TD>
                {t.assignedDriver
                  ? <><div style={{ fontWeight: 600 }}>{t.assignedDriver.name}</div><div style={{ fontSize: "0.7rem", color: C.muted, fontFamily: "monospace" }}>{t.assignedDriver.phone}</div></>
                  : <span style={{ color: C.muted, fontSize: "0.75rem" }}>Unassigned</span>}
              </TD>
              <TD style={{ maxWidth: 180 }}>
                <div style={{ fontSize: "0.72rem", color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {t.pickup?.address ?? "—"}</div>
                <div style={{ fontSize: "0.72rem", color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>🏁 {t.drop?.address ?? "—"}</div>
              </TD>
              <TD mono>
                <div style={{ fontWeight: 700, color: C.amber }}>₹{fare(t).toFixed(0)}</div>
                <div style={{ fontSize: "0.65rem", color: t.payment?.collected ? C.green : C.muted }}>{t.payment?.collected ? "● Paid" : "○ Pending"}</div>
              </TD>
              <TD><Badge status={t.status} /></TD>
              <TD mono muted style={{ fontSize: "0.7rem" }}>{new Date(t.createdAt).toLocaleDateString("en-IN")}</TD>
              <TD><span style={{ color: C.primary, fontSize: "0.75rem", fontWeight: 700 }}>View →</span></TD>
            </TR>
          ))}
        </Table>
        <Pagination page={page} pages={pages} total={filtered.length} perPage={PER} onChange={setPage} />
      </Card>

      {/* ── Detail Modal ─────────────────────────────────────────────────── */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={"Ride #" + (detail?._id.slice(-8).toUpperCase() ?? "")} width={680}>
        {detail && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Status + actions */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Badge status={detail.status} />
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!["completed","cancelled"].includes(detail.status) && (
                  <>
                    <Btn size="sm" variant="ghost"  icon={<UserCheck size={13} />} onClick={() => setConfirm("reassign")}>Reassign Driver</Btn>
                    <Btn size="sm" variant="danger" icon={<XCircle  size={13} />} onClick={() => setConfirm("cancel")}>Cancel Ride</Btn>
                  </>
                )}
                {detail.status === "completed" && detail.payment?.razorpayPaymentId && (
                  <Btn size="sm" variant="warning" icon={<RotateCcw size={13} />} onClick={() => setConfirm("refund")}>Refund</Btn>
                )}
              </div>
            </div>

            {/* Fare summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              {[
                { l: "Total Fare", v: "₹" + (detail.finalFare ?? detail.fare ?? 0).toFixed(2), c: C.amber },
                { l: "Vehicle",    v: (VI[detail.vehicleType?.toLowerCase()] ?? "🚗") + " " + detail.vehicleType, c: C.text },
                { l: "Payment",    v: detail.payment?.collected ? "✅ Collected" : "⏳ Pending", c: detail.payment?.collected ? C.green : C.amber },
              ].map(x => (
                <div key={x.l} style={{ background: "#0e1015", borderRadius: 10, padding: "0.75rem", textAlign: "center" }}>
                  <div style={{ fontSize: "0.62rem", color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>{x.l}</div>
                  <div style={{ fontWeight: 700, color: x.c, fontFamily: "monospace" }}>{x.v}</div>
                </div>
              ))}
            </div>

            {/* ✅ Real Google Map replacing MapPlaceholder */}
            <RideMap trip={detail} height={220} />

            {/* People */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {[
                { label: "Customer", p: detail.customerId,    color: C.purple },
                { label: "Driver",   p: detail.assignedDriver, color: C.cyan  },
              ].map(({ label, p, color }) => (
                <div key={label} style={{ background: "#0e1015", borderRadius: 10, padding: "0.875rem" }}>
                  <SectionLabel>{label}</SectionLabel>
                  {p
                    ? <><div style={{ fontWeight: 700, color: C.text }}>{p.name}</div><div style={{ fontFamily: "monospace", fontSize: "0.75rem", color: C.muted }}>{p.phone}</div></>
                    : <span style={{ color: C.muted, fontSize: "0.78rem" }}>Not assigned</span>}
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div style={{ background: "#0e1015", borderRadius: 10, padding: "0.875rem" }}>
              <SectionLabel>Ride Timeline</SectionLabel>
              <Timeline events={[
                { label: "Created",      time: detail.createdAt,      done: true,                              color: C.muted   },
                { label: "Accepted",     time: detail.acceptedAt,     done: !!detail.acceptedAt,               color: C.cyan    },
                { label: "Ride Started", time: detail.rideStartTime,  done: !!detail.rideStartTime,            color: C.primary },
                { label: "Completed",    time: detail.completedAt,    done: detail.status === "completed",     color: C.green   },
                { label: "Cancelled",    time: detail.cancelledAt,    done: detail.status === "cancelled",     color: C.red     },
              ]} />
            </div>

            {/* Route addresses */}
            <div style={{ background: "#0e1015", borderRadius: 10, padding: "0.875rem" }}>
              <SectionLabel>Route</SectionLabel>
              <InfoRow label="📍 Pickup" value={detail.pickup?.address ?? "—"} />
              <InfoRow label="🏁 Drop"   value={detail.drop?.address   ?? "—"} />
              {detail.cancellationReason && <InfoRow label="Cancel Reason" value={detail.cancellationReason} color={C.red} />}
            </div>

          </div>
        )}
      </Modal>

      {/* Confirm cancel */}
      <ConfirmDialog
        open={confirm === "cancel"} onClose={() => setConfirm(null)} onConfirm={doCancel}
        title="Cancel Ride"
        message={"Are you sure you want to cancel ride #" + (detail?._id.slice(-8).toUpperCase() ?? "") + "? This cannot be undone."}
        confirmLabel="Yes, Cancel" danger loading={acting}
      />

      {/* Reassign driver */}
      <Modal open={confirm === "reassign"} onClose={() => setConfirm(null)} title="Reassign Driver" width={420}>
        <p style={{ color: C.muted, fontSize: "0.85rem", marginBottom: "1rem" }}>Select an available driver to assign to this ride.</p>
        <Sel
          value={selDriver}
          onChange={setSelDriver}
          options={[
            { value: "", label: "Select driver…" },
            ...drivers.filter(d => d.isOnline && !d.isBlocked).map(d => ({
              value: d._id,
              label: d.name + " · " + d.vehicleType + " · ☎ " + d.phone,
            })),
          ]}
          style={{ width: "100%", marginBottom: "1rem" }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="ghost"   onClick={() => setConfirm(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={doReassign} disabled={!selDriver} loading={acting}>Reassign</Btn>
        </div>
      </Modal>

      {/* Confirm refund */}
      <ConfirmDialog
        open={confirm === "refund"} onClose={() => setConfirm(null)} onConfirm={doRefund}
        title="Initiate Refund"
        message={"Refund ₹" + ((detail?.finalFare ?? detail?.fare ?? 0).toFixed(2)) + " to customer via Razorpay?"}
        confirmLabel="Refund" danger={false} loading={acting}
      />
    </div>
  );
}