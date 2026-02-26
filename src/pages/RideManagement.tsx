import React, { useState, useMemo } from "react";
import { RefreshCw, UserCheck, XCircle, RotateCcw, MapPin } from "lucide-react";
import { useTrips, useDrivers, useMutation } from "../hooks/index";
import type { Trip } from "../types/index";
import {
  Badge, Btn, Card, Table, TR, TD, Modal, Spinner, PageError, Empty,
  PageHeader, SearchBar, Sel, Tabs, Timeline, InfoRow, SectionLabel,
  ConfirmDialog, C, MapPlaceholder, Pagination,
} from "../components/ui";
import { toast } from "react-toastify";

const PER = 20;
const STATUS_OPTS = [
  { value: "all", label: "All Status" },
  { value: "requested", label: "Requested" },
  { value: "driver_assigned", label: "Assigned" },
  { value: "ride_started", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];
const TYPE_OPTS = [
  { value: "all", label: "All Types" },
  { value: "short", label: "🏙️ City Ride" },
  { value: "long", label: "🛣️ Long Route" },
  { value: "parcel", label: "📦 Parcel" },
];

const VI: Record<string, string> = { bike: "🏍️", auto: "🛺", car: "🚗", premium: "🚙", xl: "🚐" };

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

  const pages  = Math.ceil(filtered.length / PER);
  const paged  = filtered.slice((page - 1) * PER, page * PER);

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

  const fare = (t: Trip) => t.finalFare ?? t.fare ?? 0;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "1.75rem", fontFamily: "'Syne','Segoe UI',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <PageHeader
        title="Ride Management" icon="🚘"
        sub={trips.length + " total rides · " + active.length + " active now"}
        actions={
          <Btn icon={<RefreshCw size={14} />} onClick={refetch} variant="ghost">Refresh</Btn>
        }
      />

      {/* Tabs */}
      <Tabs
        tabs={[
          { key: "all",    label: "All Rides",    count: trips.length  },
          { key: "active", label: "Active",        count: active.length },
        ]}
        active={tab} onChange={k => { setTab(k); setPage(1); }}
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "1rem 0" }}>
        <SearchBar value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Search ID, name, phone, address…" />
        <Sel value={statusF} onChange={v => { setStatusF(v); setPage(1); }} options={STATUS_OPTS} />
        <Sel value={typeF}   onChange={v => { setTypeF(v);   setPage(1); }} options={TYPE_OPTS} />
        <span style={{ fontSize: "0.72rem", color: C.muted, alignSelf: "center", fontFamily: "monospace" }}>{filtered.length} results</span>
      </div>

      {/* Table */}
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

      {/* Detail Modal */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={"Ride #" + (detail?._id.slice(-8).toUpperCase() ?? "")} width={680}>
        {detail && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Status + actions */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Badge status={detail.status} />
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!["completed","cancelled"].includes(detail.status) && (
                  <>
                    <Btn size="sm" variant="ghost" icon={<UserCheck size={13} />} onClick={() => setConfirm("reassign")}>Reassign Driver</Btn>
                    <Btn size="sm" variant="danger" icon={<XCircle size={13} />} onClick={() => setConfirm("cancel")}>Cancel Ride</Btn>
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
                { l: "Total Fare",  v: "₹" + (detail.finalFare ?? detail.fare ?? 0).toFixed(2), c: C.amber },
                { l: "Vehicle",     v: (VI[detail.vehicleType?.toLowerCase()] ?? "🚗") + " " + detail.vehicleType, c: C.text },
                { l: "Payment",     v: detail.payment?.collected ? "✅ Collected" : "⏳ Pending", c: detail.payment?.collected ? C.green : C.amber },
              ].map(x => (
                <div key={x.l} style={{ background: "#0e1015", borderRadius: 10, padding: "0.75rem", textAlign: "center" }}>
                  <div style={{ fontSize: "0.62rem", color: C.muted, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>{x.l}</div>
                  <div style={{ fontWeight: 700, color: x.c, fontFamily: "monospace" }}>{x.v}</div>
                </div>
              ))}
            </div>

            {/* Map */}
            <MapPlaceholder label="Live route map — add VITE_GOOGLE_MAPS_KEY to enable" height={220} />

            {/* People */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {[
                { label: "Customer", p: detail.customerId, color: C.purple },
                { label: "Driver",   p: detail.assignedDriver, color: C.cyan },
              ].map(({ label, p, color }) => (
                <div key={label} style={{ background: "#0e1015", borderRadius: 10, padding: "0.875rem" }}>
                  <SectionLabel>{label}</SectionLabel>
                  {p
                    ? <><div style={{ fontWeight: 700, color: C.text }}>{p.name}</div><div style={{ fontFamily: "monospace", fontSize: "0.75rem", color: C.muted }}>{p.phone}</div></>
                    : <span style={{ color: C.muted, fontSize: "0.78rem" }}>Not assigned</span>}
                </div>
              ))}
            </div>

            {/* Ride timeline */}
            <div style={{ background: "#0e1015", borderRadius: 10, padding: "0.875rem" }}>
              <SectionLabel>Ride Timeline</SectionLabel>
              <Timeline events={[
                { label: "Created",   time: detail.createdAt,     done: true,                                         color: C.muted   },
                { label: "Accepted",  time: detail.acceptedAt,    done: !!detail.acceptedAt,                         color: C.cyan    },
                { label: "Ride Started", time: detail.rideStartTime, done: !!detail.rideStartTime,                   color: C.primary },
                { label: "Completed", time: detail.completedAt,   done: detail.status === "completed",               color: C.green   },
                { label: "Cancelled", time: detail.cancelledAt,   done: detail.status === "cancelled",               color: C.red     },
              ]} />
            </div>

            {/* Route addresses */}
            <div style={{ background: "#0e1015", borderRadius: 10, padding: "0.875rem" }}>
              <SectionLabel>Route</SectionLabel>
              <InfoRow label="📍 Pickup" value={detail.pickup?.address ?? "—"} />
              <InfoRow label="🏁 Drop"   value={detail.drop?.address ?? "—"} />
              {detail.cancellationReason && <InfoRow label="Cancel Reason" value={detail.cancellationReason} color={C.red} />}
            </div>

          </div>
        )}
      </Modal>

      {/* Confirm cancel */}
      <ConfirmDialog
        open={confirm === "cancel"} onClose={() => setConfirm(null)} onConfirm={doCancel}
        title="Cancel Ride" message={"Are you sure you want to cancel ride #" + (detail?._id.slice(-8).toUpperCase() ?? "") + "? This cannot be undone."}
        confirmLabel="Yes, Cancel" danger loading={acting}
      />

      {/* Reassign driver modal */}
      <Modal open={confirm === "reassign"} onClose={() => setConfirm(null)} title="Reassign Driver" width={420}>
        <p style={{ color: C.muted, fontSize: "0.85rem", marginBottom: "1rem" }}>Select an available driver to assign to this ride.</p>
        <Sel
          value={selDriver}
          onChange={setSelDriver}
          options={[{ value: "", label: "Select driver…" }, ...drivers.filter(d => d.isOnline && !d.isBlocked).map(d => ({ value: d._id, label: d.name + " · " + d.vehicleType + " · ☎ " + d.phone }))]}
          style={{ width: "100%", marginBottom: "1rem" }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Btn variant="ghost" onClick={() => setConfirm(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={doReassign} disabled={!selDriver} loading={acting}>Reassign</Btn>
        </div>
      </Modal>

      {/* Confirm refund */}
      <ConfirmDialog
        open={confirm === "refund"} onClose={() => setConfirm(null)} onConfirm={doRefund}
        title="Initiate Refund" message={"Refund ₹" + ((detail?.finalFare ?? detail?.fare ?? 0).toFixed(2)) + " to customer via Razorpay?"}
        confirmLabel="Refund" danger={false} loading={acting}
      />
    </div>
  );
}