import React, { useState, useMemo } from "react";
import { RefreshCw, CheckCircle, XCircle, Shield, ShieldOff, FileText } from "lucide-react";
import { useDrivers, useTrips, useMutation } from "../hooks";
import {
  Badge, Btn, Card, Table, TR, TD, Modal, Spinner, PageError,
  PageHeader, SearchBar, Sel, StatCard, SectionLabel, InfoRow,
  Tabs, ConfirmDialog, C, Pagination, Timeline,
} from "../components/ui";
import { toast } from "react-toastify";
import axiosInstance from "../api/axiosInstance";

const PER = 25;

export default function DriverManagement() {
  const { drivers, loading, error, refetch } = useDrivers();
  const { trips } = useTrips();
  const { mutate, loading: acting } = useMutation();

  const [tab, setTab]       = useState("all");
  const [q, setQ]           = useState("");
  const [page, setPage]     = useState(1);
  const [sel, setSel]       = useState<any>(null);
  const [confirm, setCf]    = useState<null | "block" | "unblock" | "suspend" | "approve" | "reject">(null);
  const [docsOpen, setDO]   = useState(false);
  const [docs, setDocs]     = useState<any[]>([]);
  const [docsLoading, setDL]= useState(false);

  const tok = () => localStorage.getItem("adminToken") || "";
  const hdrs = { Authorization: "Bearer " + tok(), "ngrok-skip-browser-warning": "true" };

  // Enrich drivers with trip stats
  const enriched = useMemo(() =>
    drivers.map(d => {
      const dTrips = trips.filter(t => t.assignedDriver?._id === d._id);
      const earned = dTrips.filter(t => t.status === "completed").reduce((s, t) => {
        const fare = t.finalFare ?? t.fare ?? 0;
        return s + fare * 0.895; // ~89.5% goes to driver
      }, 0);
      return { ...d, tripCount: dTrips.length, earned };
    }),
  [drivers, trips]);

  const filtered = useMemo(() => {
    let base = enriched;
    if (tab === "online")    base = base.filter(d => d.isOnline && !d.isBlocked);
    if (tab === "offline")   base = base.filter(d => !d.isOnline && !d.isBlocked);
    if (tab === "blocked")   base = base.filter(d => d.isBlocked);
    if (tab === "suspended") base = base.filter(d => d.isSuspended);
    if (q) {
      const ql = q.toLowerCase();
      base = base.filter(d => [d.name, d.phone, d.vehicleNumber, d.vehicleType, d._id].some(v => v?.toLowerCase?.().includes(ql)));
    }
    return base;
  }, [enriched, tab, q]);

  const pages = Math.ceil(filtered.length / PER);
  const paged = filtered.slice((page - 1) * PER, page * PER);

  const loadDocs = async (driverId: string) => {
    setDL(true);
    try {
      const r = await axiosInstance.get("/admin/documents/" + driverId, { headers: hdrs });
      setDocs(r.data.documents ?? []);
    } catch { setDocs([]); }
    finally { setDL(false); }
  };

  const doAction = async () => {
    if (!sel) return;
    const endpoints: Record<"block" | "unblock" | "suspend" | "approve" | "reject", string> = {
      block:   "/admin/driver/block/"   + sel._id,
      unblock: "/admin/driver/unblock/" + sel._id,
      suspend: "/admin/driver/suspend/" + sel._id,
      approve: "/admin/driver/approve/" + sel._id,
      reject:  "/admin/driver/reject/"  + sel._id,
    };
    const ep = endpoints[confirm!];
    if (!ep) return;
    const { ok } = await mutate("put", ep);
    if (ok) { toast.success("Done"); setCf(null); refetch(); }
    else toast.error("Action failed — check endpoint");
  };

  if (loading) return <Spinner label="Loading drivers…" />;
  if (error)   return <PageError message={error} onRetry={refetch} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "1.75rem", fontFamily: "'Syne','Segoe UI',sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <PageHeader title="Driver Management" icon="🏍️"
        sub={drivers.length + " registered drivers · " + drivers.filter(d => d.isOnline).length + " online"}
        actions={<Btn icon={<RefreshCw size={14}/>} variant="ghost" onClick={refetch}>Refresh</Btn>}
      />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        <StatCard label="Total Drivers"  value={drivers.length}                            icon="🏍️" color={C.primary} />
        <StatCard label="Online Now"     value={drivers.filter(d => d.isOnline).length}    icon="🟢" color={C.green}  />
        <StatCard label="Offline"        value={drivers.filter(d => !d.isOnline).length}   icon="⚫" color={C.muted}  />
        <StatCard label="Blocked"        value={drivers.filter(d => d.isBlocked).length}   icon="🚫" color={C.red}    />
        <StatCard label="Suspended"      value={drivers.filter(d => d.isSuspended).length} icon="⏸️" color={C.amber}  />
      </div>

      {/* Tabs */}
      <Tabs tabs={[
        { key: "all",       label: "All",       count: drivers.length },
        { key: "online",    label: "Online",    count: drivers.filter(d => d.isOnline).length },
        { key: "offline",   label: "Offline"    },
        { key: "blocked",   label: "Blocked",   count: drivers.filter(d => d.isBlocked).length   },
        { key: "suspended", label: "Suspended", count: drivers.filter(d => d.isSuspended).length },
      ]} active={tab} onChange={k => { setTab(k); setPage(1); }} />

      {/* Search */}
      <div style={{ display: "flex", gap: 10, margin: "1rem 0" }}>
        <SearchBar value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Search name, phone, vehicle number…" />
        <span style={{ fontSize: "0.72rem", color: C.muted, alignSelf: "center", fontFamily: "monospace" }}>{filtered.length} results</span>
      </div>

      {/* Table */}
      <Card>
        <Table headers={["Driver", "Vehicle", "Trips", "Earnings", "Rating", "Status", "Device ID", "Actions"]} isEmpty={paged.length === 0} emptyMessage="No drivers found">
          {paged.map(d => (
            <TR key={d._id} onClick={() => setSel(d)}>
              <TD>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {d.profilePhoto
                    ? <img src={d.profilePhoto} alt="" style={{ width: 32, height: 32, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
                    : <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(6,182,212,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: C.cyan, flexShrink: 0 }}>{d.name[0].toUpperCase()}</div>}
                  <div>
                    <div style={{ fontWeight: 600 }}>{d.name}</div>
                    <div style={{ fontFamily: "monospace", fontSize: "0.7rem", color: C.muted }}>{d.phone}</div>
                  </div>
                </div>
              </TD>
              <TD><div style={{ fontWeight: 600 }}>{d.vehicleType}</div><div style={{ fontSize: "0.7rem", color: C.muted, fontFamily: "monospace" }}>{d.vehicleNumber}</div></TD>
              <TD mono style={{ fontWeight: 700 }}>{d.tripCount}</TD>
              <TD mono style={{ color: C.green, fontWeight: 700 }}>₹{Math.round(d.earned).toLocaleString("en-IN")}</TD>
              <TD><span style={{ color: C.amber, fontFamily: "monospace", fontWeight: 700 }}>{d.rating ? d.rating.toFixed(1) + " ★" : "—"}</span></TD>
              <TD>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <Badge status={d.isBlocked ? "blocked" : d.isSuspended ? "suspended" : "active"} />
                  <Badge status={d.isOnline ? "online" : "offline"} />
                </div>
              </TD>
              <TD mono muted style={{ fontSize: "0.68rem" }}>{d.deviceId ? d.deviceId.slice(0, 16) + "…" : "—"}</TD>
              <TD>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
                  <Btn size="sm" variant="ghost" icon={<FileText size={11}/>} onClick={() => { setSel(d); loadDocs(d._id); setDO(true); }}>KYC</Btn>
                  <Btn size="sm" variant={d.isBlocked ? "success" : "danger"} onClick={() => { setSel(d); setCf(d.isBlocked ? "unblock" : "block"); }}>
                    {d.isBlocked ? "Unblock" : "Block"}
                  </Btn>
                </div>
              </TD>
            </TR>
          ))}
        </Table>
        <Pagination page={page} pages={pages} total={filtered.length} perPage={PER} onChange={setPage} />
      </Card>

      {/* Driver detail modal */}
      <Modal open={!!sel && !confirm && !docsOpen} onClose={() => setSel(null)} title={sel?.name ?? "Driver"} width={580}>
        {sel && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {sel.profilePhoto
                ? <img src={sel.profilePhoto} alt="" style={{ width: 60, height: 60, borderRadius: 14, objectFit: "cover" }} />
                : <div style={{ width: 60, height: 60, borderRadius: 14, background: "rgba(6,182,212,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 800, color: C.cyan }}>{sel.name[0].toUpperCase()}</div>}
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{sel.name}</div>
                <div style={{ fontFamily: "monospace", fontSize: "0.78rem", color: C.muted }}>{sel.phone}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                  <Badge status={sel.isBlocked ? "blocked" : sel.isSuspended ? "suspended" : "active"} />
                  <Badge status={sel.isOnline ? "online" : "offline"} />
                </div>
              </div>
            </div>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              {[
                { l: "Trips",   v: sel.tripCount ?? 0, c: C.primary },
                { l: "Earned",  v: "₹" + Math.round(sel.earned ?? 0).toLocaleString("en-IN"), c: C.green },
                { l: "Rating",  v: sel.rating ? sel.rating.toFixed(1) + " ★" : "—", c: C.amber },
              ].map(x => (
                <div key={x.l} style={{ background: "#0e1015", borderRadius: 10, padding: "0.75rem", textAlign: "center" }}>
                  <div style={{ fontSize: "0.62rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{x.l}</div>
                  <div style={{ fontWeight: 800, color: x.c, fontFamily: "monospace", fontSize: "1rem" }}>{x.v}</div>
                </div>
              ))}
            </div>

            {/* Info */}
            <InfoRow label="Vehicle Type"   value={sel.vehicleType ?? "—"} />
            <InfoRow label="Vehicle Number" value={sel.vehicleNumber ?? "—"} />
            <InfoRow label="Strikes"        value={sel.strikes ?? 0} color={(sel.strikes ?? 0) > 2 ? C.red : C.text} />
            <InfoRow label="Device ID"      value={sel.deviceId ?? "—"} />
            <InfoRow label="Joined"         value={sel.createdAt ? new Date(sel.createdAt).toLocaleDateString("en-IN") : "—"} />

            {/* Actions */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              <Btn variant="ghost" icon={<FileText size={13}/>} onClick={() => { loadDocs(sel._id); setDO(true); }}>View KYC Docs</Btn>
              <Btn variant={sel.isBlocked ? "success" : "danger"} icon={sel.isBlocked ? <ShieldOff size={13}/> : <Shield size={13}/>} onClick={() => setCf(sel.isBlocked ? "unblock" : "block")}>
                {sel.isBlocked ? "Unblock" : "Block Driver"}
              </Btn>
              <Btn variant="warning" onClick={() => setCf("suspend")}>Suspend</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* KYC Documents modal */}
      <Modal open={docsOpen} onClose={() => setDO(false)} title={(sel?.name ?? "Driver") + " — KYC Documents"} width={620}>
        {docsLoading
          ? <Spinner label="Loading documents…" />
          : docs.length === 0
          ? <div style={{ padding: "2rem", textAlign: "center", color: C.muted, fontSize: "0.85rem" }}>No documents uploaded yet — driver needs to upload via app</div>
          : docs.map(doc => (
            <div key={doc._id} style={{ borderBottom: "1px solid " + C.border, paddingBottom: "1rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontWeight: 700 }}>{doc.docType ?? doc.type ?? "Document"}</div>
                <Badge status={doc.isVerified ? "active" : doc.isRejected ? "blocked" : "pending"} label={doc.isVerified ? "Verified" : doc.isRejected ? "Rejected" : "Pending"} />
              </div>
              {doc.imageUrl && <img src={doc.imageUrl} alt={doc.docType} style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 10, marginBottom: 8 }} />}
              <InfoRow label="Doc Number" value={doc.docNumber ?? "—"} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Btn size="sm" variant="success" icon={<CheckCircle size={11}/>} onClick={async () => {
                  const { ok } = await mutate("put", "/admin/verifyDocument/" + doc._id, { isVerified: true });
                  if (ok) { toast.success("Document approved"); loadDocs(sel._id); }
                }}>Approve</Btn>
                <Btn size="sm" variant="danger" icon={<XCircle size={11}/>} onClick={async () => {
                  const { ok } = await mutate("put", "/admin/verifyDocument/" + doc._id, { isVerified: false, isRejected: true });
                  if (ok) { toast.success("Document rejected"); loadDocs(sel._id); }
                }}>Reject</Btn>
              </div>
            </div>
          ))}
      </Modal>

      {/* Confirm actions */}
      <ConfirmDialog
        open={!!confirm && confirm !== "approve" && confirm !== "reject"}
        onClose={() => setCf(null)} onConfirm={doAction}
        title={{ block: "Block Driver", unblock: "Unblock Driver", suspend: "Suspend Driver", approve: "Approve Driver", reject: "Reject Driver" }[confirm!] ?? "Confirm"}
        message={({ block: "Block ", unblock: "Unblock ", suspend: "Temporarily suspend ", approve: "Approve ", reject: "Reject " }[confirm!] ?? "") + (sel?.name ?? "this driver") + "?"}
        confirmLabel={{ block: "Block", unblock: "Unblock", suspend: "Suspend", approve: "Approve", reject: "Reject" }[confirm!] ?? "Confirm"}
        danger={confirm === "block" || confirm === "suspend"} loading={acting}
      />
    </div>
  );
}