// ─────────────────────────────────────────────────────────────────────────────
// MODULE 3 — GPS & Location Monitoring
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useMemo } from "react";
import { RefreshCw, MapPin, Navigation, AlertTriangle } from "lucide-react";
import { useTrips, useDrivers, useMutation } from "../hooks";
import {
  Badge, Btn, Card, Table, TR, TD, Modal, Spinner, PageError, Empty,
  PageHeader, SearchBar, StatCard, SectionLabel, InfoRow, C,
  MapPlaceholder, Tabs,
} from "../components/ui";
import { toast } from "react-toastify";

export function GPSMonitoring() {
  const { trips, loading, error, refetch } = useTrips();
  const { drivers } = useDrivers();
  const [sel, setSel] = useState<any>(null);

  const activeRides   = useMemo(() => trips.filter((t: any) => t.status === "ride_started"), [trips]);
  const activeDrivers = useMemo(() => drivers.filter((d: any) => d.isOnline), [drivers]);
  const withLocation  = useMemo(() => activeDrivers.filter((d: any) => d.currentLocation?.coordinates), [activeDrivers]);

  if (loading) return <Spinner label="Loading GPS data…" />;
  if (error)   return <PageError message={error} onRetry={refetch} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "1.75rem", fontFamily: "'Syne','Segoe UI',sans-serif" }}>
      <PageHeader title="GPS & Location Monitoring" icon="🗺️"
        sub={withLocation.length + " drivers broadcasting · " + activeRides.length + " rides in progress"}
        actions={<Btn icon={<RefreshCw size={14}/>} variant="ghost" onClick={refetch}>Refresh</Btn>}
      />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        <StatCard label="Online Drivers"    value={activeDrivers.length}  icon="🟢" color="#22c55e" />
        <StatCard label="Broadcasting GPS"  value={withLocation.length}   icon="📡" color="#6366f1" />
        <StatCard label="Active Rides"      value={activeRides.length}    icon="🚘" color="#f59e0b" />
        <StatCard label="Offline Drivers"   value={drivers.length - activeDrivers.length} icon="⚫" color="#6b7280" />
      </div>

      {/* Live Map */}
      <Card style={{ marginBottom: "1.5rem" }}>
        <div style={{ padding: "0.875rem 1rem", borderBottom: "1px solid " + C.border, fontWeight: 700 }}>🗺️ Live Map — All Drivers & Active Rides</div>
        <MapPlaceholder label="Add VITE_GOOGLE_MAPS_KEY to .env to enable live driver map with markers" height={500} />
      </Card>

      {/* Driver location table */}
      <Card style={{ marginBottom: "1.5rem" }}>
        <div style={{ padding: "0.875rem 1rem", borderBottom: "1px solid " + C.border, fontWeight: 700 }}>📍 Driver Locations</div>
        <Table headers={["Driver", "Vehicle", "Status", "GPS Coordinates", "Active Ride", "Action"]} isEmpty={activeDrivers.length === 0} emptyMessage="No drivers online">
          {activeDrivers.map((d: any) => {
            const ride = activeRides.find((t: any) => t.assignedDriver?._id === d._id);
            const coords = d.currentLocation?.coordinates;
            return (
              <TR key={d._id} onClick={() => setSel({ type: "driver", data: d })}>
                <TD><div style={{ fontWeight: 600 }}>{d.name}</div><div style={{ fontSize: "0.7rem", color: C.muted, fontFamily: "monospace" }}>{d.phone}</div></TD>
                <TD><span style={{ fontSize: "0.8rem" }}>{d.vehicleType}</span></TD>
                <TD><Badge status="online" /></TD>
                <TD mono muted style={{ fontSize: "0.7rem" }}>{coords ? coords[1].toFixed(5) + ", " + coords[0].toFixed(5) : "No signal"}</TD>
                <TD muted style={{ fontSize: "0.75rem" }}>{ride ? "#" + ride._id.slice(-8).toUpperCase() : "—"}</TD>
                <TD>
                  {coords && (
                    <a href={"https://maps.google.com/?q=" + coords[1] + "," + coords[0]} target="_blank" rel="noreferrer" style={{ color: C.primary, fontSize: "0.75rem", fontWeight: 700 }}>Open Maps ↗</a>
                  )}
                </TD>
              </TR>
            );
          })}
        </Table>
      </Card>

      {/* Active rides with polyline info */}
      <Card>
        <div style={{ padding: "0.875rem 1rem", borderBottom: "1px solid " + C.border, fontWeight: 700 }}>🚘 Active Rides — Route Details</div>
        <Table headers={["Ride ID", "Customer", "Driver", "Pickup", "Drop", "Fare", ""]} isEmpty={activeRides.length === 0} emptyMessage="No active rides">
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
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.type === "driver" ? "Driver Location" : "Ride Route"} width={500}>
        {sel?.type === "driver" && sel.data && (
          <>
            <MapPlaceholder label={"Driver: " + sel.data.name + " — GPS map"} height={280} />
            <div style={{ marginTop: "0.875rem" }}>
              <InfoRow label="Driver" value={sel.data.name} />
              <InfoRow label="Phone" value={sel.data.phone} />
              <InfoRow label="Vehicle" value={sel.data.vehicleType} />
              <InfoRow label="Coordinates" value={sel.data.currentLocation?.coordinates ? sel.data.currentLocation.coordinates.join(", ") : "—"} />
            </div>
          </>
        )}
        {sel?.type === "ride" && sel.data && (
          <>
            <MapPlaceholder label={"Route polyline — pickup → drop for #" + sel.data._id.slice(-8).toUpperCase()} height={280} />
            <div style={{ marginTop: "0.875rem" }}>
              <InfoRow label="Pickup" value={sel.data.pickup?.address ?? "—"} />
              <InfoRow label="Drop"   value={sel.data.drop?.address ?? "—"} />
              <InfoRow label="Driver" value={sel.data.assignedDriver?.name ?? "—"} />
              <InfoRow label="Fare"   value={"₹" + (sel.data.finalFare ?? sel.data.fare ?? 0).toFixed(2)} color={C.amber} />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 4 — Safety & Complaint Management
// ─────────────────────────────────────────────────────────────────────────────
export function SafetyComplaints() {
  const { trips, loading, error, refetch } = useTrips();
  const { mutate, loading: acting } = useMutation();

  const [tab, setTab]     = useState("all");
  const [q, setQ]         = useState("");
  const [sel, setSel]     = useState<any>(null);
  const [confirm, setCf]  = useState<null | "block" | "suspend">(null);
  const [selDriver, setSD]= useState<any>(null);

  const supportTrips = useMemo(() =>
    trips.filter((t: any) => t.supportRequested),
  [trips]);

  const filtered = useMemo(() => {
    let base = supportTrips;
    if (tab === "pending")  base = base.filter((t: any) => t.status !== "completed" && t.status !== "cancelled");
    if (tab === "resolved") base = base.filter((t: any) => t.status === "completed");
    if (q) {
      const ql = q.toLowerCase();
      base = base.filter((t: any) => [t._id, t.customerId?.name, t.customerId?.phone, t.supportReason].some((v: any) => v?.toLowerCase?.().includes(ql)));
    }
    return base.sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [supportTrips, tab, q]);

  const doBlock = async () => {
    if (!selDriver) return;
    const { ok } = await mutate("put", "/admin/driver/block/" + selDriver._id);
    if (ok) { toast.success("Driver blocked"); setCf(null); refetch(); }
    else toast.error("Block failed");
  };

  const doSuspend = async () => {
    if (!selDriver) return;
    const { ok } = await mutate("put", "/admin/driver/suspend/" + selDriver._id);
    if (ok) { toast.success("Driver suspended"); setCf(null); }
    else toast.warning("Suspend endpoint not configured — add /admin/driver/suspend/:id");
  };

  if (loading) return <Spinner label="Loading complaints…" />;
  if (error)   return <PageError message={error} onRetry={refetch} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "1.75rem", fontFamily: "'Syne','Segoe UI',sans-serif" }}>
      <PageHeader title="Safety & Complaints" icon="🛡️"
        sub={supportTrips.length + " support requests from trip data"}
        actions={<Btn icon={<RefreshCw size={14}/>} variant="ghost" onClick={refetch}>Refresh</Btn>}
      />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        <StatCard label="Total Complaints" value={supportTrips.length} icon="🆘" color={C.red}    />
        <StatCard label="Open"             value={supportTrips.filter((t: any) => !["completed","cancelled"].includes(t.status)).length} icon="🔴" color={C.amber} />
        <StatCard label="Emergency"        value={supportTrips.filter((t: any) => t.supportReason?.toLowerCase().includes("emergency")).length} icon="🚨" color={C.red} />
      </div>

      <Tabs tabs={[
        { key: "all",      label: "All",      count: supportTrips.length },
        { key: "pending",  label: "Open"   },
        { key: "resolved", label: "Resolved" },
      ]} active={tab} onChange={k => { setTab(k); }} />

      <div style={{ display: "flex", gap: 10, margin: "1rem 0" }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search complaint ID, user name, reason…" />
      </div>

      <Card>
        <Table headers={["Trip ID", "Customer", "Driver", "Reason", "Status", "Date", "Actions"]} isEmpty={filtered.length === 0} emptyMessage="No complaints found">
          {filtered.map((t: any) => (
            <TR key={t._id} onClick={() => setSel(t)}>
              <TD mono muted>#{t._id.slice(-8).toUpperCase()}</TD>
              <TD><div style={{ fontWeight: 600 }}>{t.customerId?.name ?? "—"}</div><div style={{ fontSize: "0.7rem", color: C.muted, fontFamily: "monospace" }}>{t.customerId?.phone}</div></TD>
              <TD><div style={{ fontWeight: 600 }}>{t.assignedDriver?.name ?? "—"}</div></TD>
              <TD muted style={{ fontSize: "0.78rem", maxWidth: 180 }}>{t.supportReason ?? "No reason given"}</TD>
              <TD><Badge status={["completed","cancelled"].includes(t.status) ? "resolved" : "pending"} /></TD>
              <TD mono muted style={{ fontSize: "0.7rem" }}>{new Date(t.createdAt).toLocaleDateString("en-IN")}</TD>
              <TD>
                <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                  {t.assignedDriver && (
                    <>
                      <Btn size="sm" variant="danger" onClick={() => { setSD(t.assignedDriver); setCf("block"); }}>Block</Btn>
                      <Btn size="sm" variant="warning" onClick={() => { setSD(t.assignedDriver); setCf("suspend"); }}>Suspend</Btn>
                    </>
                  )}
                </div>
              </TD>
            </TR>
          ))}
        </Table>
      </Card>

      {/* Complaint detail */}
      <Modal open={!!sel && !confirm} onClose={() => setSel(null)} title={"Complaint — #" + (sel?._id?.slice(-8).toUpperCase() ?? "")}>
        {sel && (
          <>
            <InfoRow label="Customer"    value={sel.customerId?.name + " · " + sel.customerId?.phone} />
            <InfoRow label="Driver"      value={sel.assignedDriver?.name + " · " + sel.assignedDriver?.phone} />
            <InfoRow label="Reason"      value={sel.supportReason ?? "Not specified"} />
            <InfoRow label="Ride Status" value={<Badge status={sel.status} />} />
            <InfoRow label="Created"     value={new Date(sel.createdAt).toLocaleString("en-IN")} />
            {sel.assignedDriver && (
              <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
                <Btn variant="danger" onClick={() => { setSD(sel.assignedDriver); setCf("block"); }}>Block Driver</Btn>
                <Btn variant="warning" onClick={() => { setSD(sel.assignedDriver); setCf("suspend"); }}>Suspend Driver</Btn>
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal open={confirm === "block"} onClose={() => setCf(null)} title="Block Driver" width={380}>
        <p style={{ color: C.muted, marginBottom: "1rem", fontSize: "0.88rem" }}>Block <strong style={{ color: C.text }}>{selDriver?.name}</strong>? They won't be able to accept rides.</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={() => setCf(null)}>Cancel</Btn>
          <Btn variant="danger" onClick={doBlock} loading={acting}>Block Driver</Btn>
        </div>
      </Modal>
      <Modal open={confirm === "suspend"} onClose={() => setCf(null)} title="Suspend Driver" width={380}>
        <p style={{ color: C.muted, marginBottom: "1rem", fontSize: "0.88rem" }}>Suspend <strong style={{ color: C.text }}>{selDriver?.name}</strong> temporarily?</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={() => setCf(null)}>Cancel</Btn>
          <Btn variant="warning" onClick={doSuspend} loading={acting}>Suspend</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 5 — Parcel Management
// ─────────────────────────────────────────────────────────────────────────────
export function ParcelManagement() {
  const { trips, loading, error, refetch } = useTrips();
  const { mutate, loading: acting } = useMutation();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("all");
  const [sel, setSel] = useState<any>(null);

  const parcels = useMemo(() => trips.filter((t: any) => t.type === "parcel"), [trips]);

  const filtered = useMemo(() => {
    let base = parcels;
    if (tab === "active")    base = base.filter((t: any) => !["completed","cancelled"].includes(t.status));
    if (tab === "delivered") base = base.filter((t: any) => t.status === "completed");
    if (tab === "cancelled") base = base.filter((t: any) => t.status === "cancelled");
    if (q) {
      const ql = q.toLowerCase();
      base = base.filter((t: any) => [t._id, t.customerId?.name, t.parcelDetails?.senderName, t.parcelDetails?.receiverName, t.parcelDetails?.receiverPhone].some((v: any) => v?.toLowerCase?.().includes(ql)));
    }
    return base.sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [parcels, tab, q]);

  const markLost = async (id: string) => {
    const { ok } = await mutate("put", "/admin/trip/" + id + "/cancel");
    if (ok) { toast.success("Marked as lost/cancelled"); refetch(); }
  };

  if (loading) return <Spinner label="Loading parcels…" />;
  if (error)   return <PageError message={error} onRetry={refetch} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "1.75rem", fontFamily: "'Syne','Segoe UI',sans-serif" }}>
      <PageHeader title="Parcel Management" icon="📦"
        sub={parcels.length + " parcel bookings"}
        actions={<Btn icon={<RefreshCw size={14}/>} variant="ghost" onClick={refetch}>Refresh</Btn>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        <StatCard label="Total Parcels"  value={parcels.length}                                                          icon="📦" color={C.amber}  />
        <StatCard label="In Transit"     value={parcels.filter((t: any) => t.status === "ride_started").length}                 icon="🚚" color={C.cyan}   />
        <StatCard label="Delivered"      value={parcels.filter((t: any) => t.status === "completed").length}                    icon="✅" color={C.green}  />
        <StatCard label="Cancelled"      value={parcels.filter((t: any) => t.status === "cancelled").length}                    icon="❌" color={C.red}    />
      </div>

      <Tabs tabs={[
        { key: "all",       label: "All",        count: parcels.length },
        { key: "active",    label: "In Transit"  },
        { key: "delivered", label: "Delivered"   },
        { key: "cancelled", label: "Cancelled"   },
      ]} active={tab} onChange={setTab} />

      <div style={{ display: "flex", gap: 10, margin: "1rem 0" }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search parcel ID, sender, receiver…" />
      </div>

      <Card>
        <Table headers={["Parcel ID", "Sender", "Receiver", "Driver", "Weight", "Status", "OTP", "Date", "Actions"]} isEmpty={filtered.length === 0} emptyMessage="No parcels found">
          {filtered.map((t: any) => (
            <TR key={t._id} onClick={() => setSel(t)}>
              <TD mono muted>#{t._id.slice(-8).toUpperCase()}</TD>
              <TD><div style={{ fontWeight: 600 }}>{t.parcelDetails?.senderName ?? t.customerId?.name ?? "—"}</div></TD>
              <TD><div style={{ fontWeight: 600 }}>{t.parcelDetails?.receiverName ?? "—"}</div><div style={{ fontSize: "0.7rem", color: C.muted, fontFamily: "monospace" }}>{t.parcelDetails?.receiverPhone}</div></TD>
              <TD muted style={{ fontSize: "0.8rem" }}>{t.assignedDriver?.name ?? "Unassigned"}</TD>
              <TD mono muted style={{ fontSize: "0.8rem" }}>{t.parcelDetails?.weight ? t.parcelDetails.weight + " kg" : "—"}</TD>
              <TD><Badge status={t.status} /></TD>
              <TD mono style={{ fontSize: "0.8rem", color: t.otp ? C.amber : C.muted }}>{t.otp ?? "—"}</TD>
              <TD mono muted style={{ fontSize: "0.7rem" }}>{new Date(t.createdAt).toLocaleDateString("en-IN")}</TD>
              <TD>
                {!["completed","cancelled"].includes(t.status) && (
                  <Btn size="sm" variant="danger" loading={acting} onClick={() => markLost(t._id)}>
                    Mark Lost
                  </Btn>
                )}
              </TD>
            </TR>
          ))}
        </Table>
      </Card>

      {/* Parcel detail */}
      <Modal open={!!sel} onClose={() => setSel(null)} title={"Parcel #" + (sel?._id?.slice(-8).toUpperCase() ?? "")} width={520}>
        {sel && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.875rem" }}>
              <div style={{ background: "#0e1015", borderRadius: 10, padding: "0.875rem" }}>
                <SectionLabel>Sender</SectionLabel>
                <div style={{ fontWeight: 700 }}>{sel.parcelDetails?.senderName ?? sel.customerId?.name}</div>
                <div style={{ color: C.muted, fontFamily: "monospace", fontSize: "0.75rem" }}>{sel.customerId?.phone}</div>
              </div>
              <div style={{ background: "#0e1015", borderRadius: 10, padding: "0.875rem" }}>
                <SectionLabel>Receiver</SectionLabel>
                <div style={{ fontWeight: 700 }}>{sel.parcelDetails?.receiverName ?? "—"}</div>
                <div style={{ color: C.muted, fontFamily: "monospace", fontSize: "0.75rem" }}>{sel.parcelDetails?.receiverPhone}</div>
              </div>
            </div>
            <InfoRow label="Status"       value={<Badge status={sel.status} />} />
            <InfoRow label="Driver"       value={sel.assignedDriver?.name ?? "—"} />
            <InfoRow label="OTP"          value={sel.otp ?? "—"} color={C.amber} />
            <InfoRow label="Weight"       value={sel.parcelDetails?.weight ? sel.parcelDetails.weight + " kg" : "—"} />
            <InfoRow label="Pickup"       value={sel.pickup?.address ?? "—"} />
            <InfoRow label="Drop"         value={sel.drop?.address ?? "—"} />
            <InfoRow label="Fare"         value={"₹" + (sel.finalFare ?? sel.fare ?? 0).toFixed(2)} color={C.amber} />
            <InfoRow label="Created"      value={new Date(sel.createdAt).toLocaleString("en-IN")} />
            <div style={{ marginTop: "0.875rem", padding: "0.875rem", background: "#0e1015", borderRadius: 10, textAlign: "center", color: C.muted, fontSize: "0.8rem" }}>
              📷 Photo proof — requires driver app upload feature
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}