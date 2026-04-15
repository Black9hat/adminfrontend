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

// ============================================
// HELPER: Format Label from Key
// ============================================
const formatLabel = (key: string): string => {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str: string) => str.toUpperCase())
    .trim();
};

// ============================================
// DOCUMENT CONFIGURATIONS
// ============================================
const DOCUMENT_CONFIGS: Record<string, { displayName: string; fields: Array<{ label: string; key: string }> }> = {
  rc: {
    displayName: "Vehicle RC",
    fields: [
      { label: "Owner Name", key: "fullName" },
      { label: "Registration Number", key: "licenseNumber" },
      { label: "Engine Number", key: "engineNumber" },
      { label: "Model", key: "model" },
      { label: "Registration Date", key: "registrationDate" },
      { label: "Validity Date", key: "validity" },
      { label: "Chassis Number", key: "chassisNumber" },
      { label: "Vehicle Class", key: "vehicleClass" },
      { label: "Address", key: "address" },
    ],
  },
  pan: {
    displayName: "PAN Card",
    fields: [
      { label: "PAN Number", key: "licenseNumber" },
      { label: "Full Name", key: "fullName" },
      { label: "Date of Birth", key: "dob" },
    ],
  },
  aadhaar: {
    displayName: "Aadhaar Card",
    fields: [
      { label: "Aadhaar Number", key: "licenseNumber" },
      { label: "Name", key: "fullName" },
      { label: "Date of Birth", key: "dob" },
      { label: "Mobile No", key: "mobile" },
      { label: "Address", key: "address" },
    ],
  },
  license: {
    displayName: "Driving License",
    fields: [
      { label: "Driving License No", key: "licenseNumber" },
      { label: "Name", key: "fullName" },
      { label: "Date of Birth", key: "dob" },
      { label: "Son/Daughter/Wife of", key: "fatherOrSpouseName" },
      { label: "Address", key: "address" },
      { label: "Validity", key: "validity" },
      { label: "State of Issue", key: "state" },
      { label: "Class of Vehicles", key: "vehicleClass" },
    ],
  },
  fitnesscertificate: {
    displayName: "Fitness Certificate",
    fields: [
      { label: "Registration Number", key: "licenseNumber" },
      { label: "FC Number", key: "fcNumber" },
      { label: "Class of Vehicle", key: "vehicleClass" },
      { label: "FC Issued By", key: "issuedBy" },
      { label: "FC Valid Upto", key: "validity" },
    ],
  },
  insurance: {
    displayName: "Insurance",
    fields: [
      { label: "Insurance Certificate No", key: "licenseNumber" },
      { label: "Company", key: "company" },
      { label: "Valid Upto", key: "validity" },
    ],
  },
  permit: {
    displayName: "Permit",
    fields: [
      { label: "Permit Number", key: "licenseNumber" },
      { label: "Permit Issued By", key: "issuedBy" },
      { label: "Permit Valid Upto", key: "validity" },
    ],
  },
  profile: {
    displayName: "Profile Photo",
    fields: [],
  },
};

const getDocConfig = (docType: string) => {
  const normalized = docType.toLowerCase().trim();
  return DOCUMENT_CONFIGS[normalized] || { displayName: docType, fields: [] };
};

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
  const [savedDocsOpen, setSavedDO] = useState(false);
  const [savedDocs, setSavedDocs] = useState<any[]>([]);
  const [savedDocsLoading, setSavedDL] = useState(false);

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
      // ✅ FIX 1: adminController.getDriverDocuments returns { docs: [...] } not { documents: [...] }
      setDocs(r.data.docs ?? r.data.documents ?? []);
    } catch { setDocs([]); }
    finally { setDL(false); }
  };

  const loadSavedDocs = async (phone: string) => {
    setSavedDL(true);
    try {
      const r = await axiosInstance.get("/admin/saved-documents/" + phone, { headers: hdrs });
      setSavedDocs(r.data.files ?? []);
    } catch (err) {
      console.error("Error loading saved documents:", err);
      setSavedDocs([]);
    } finally {
      setSavedDL(false);
    }
  };

  const downloadSavedDocToComputer = async (file: any) => {
    if (!sel?.phone) return;

    const fileName = file?.name || file;
    if (!fileName) return;

    try {
      const response = await axiosInstance.get(
        `/admin/saved-documents/${encodeURIComponent(sel.phone)}/${encodeURIComponent(fileName)}`,
        {
          headers: hdrs,
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Download started");
    } catch (err: any) {
      console.error("Saved document download failed:", err);
      toast.error(err?.response?.data?.message || "Failed to download file");
    }
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
      <Modal open={docsOpen} onClose={() => setDO(false)} title={(sel?.name ?? "Driver") + " — KYC Documents"} width={900}>
        {/* View Saved Folder Button */}
        {sel && (
          <div style={{ marginBottom: "1rem", display: "flex", gap: 8 }}>
            <Btn 
              variant="ghost" 
              icon={<FileText size={13}/>}
              onClick={() => { loadSavedDocs(sel.phone); setSavedDO(true); }}
            >
              📁 View Saved Folder
            </Btn>
          </div>
        )}

        {docsLoading
          ? <Spinner label="Loading documents…" />
          : docs.length === 0
          ? <div style={{ padding: "2rem", textAlign: "center", color: C.muted, fontSize: "0.85rem" }}>No documents uploaded yet — driver needs to upload via app</div>
          : (() => {
              // Group documents by docType
              const grouped: Record<string, any[]> = {};
              docs.forEach(doc => {
                const type = doc.docType ?? "Document";
                if (!grouped[type]) grouped[type] = [];
                grouped[type].push(doc);
              });
              
              return Object.entries(grouped).map(([docType, typeDocs]) => {
                // Sort to show front first
                const sorted = typeDocs.sort((a, b) => {
                  if ((a.side ?? "") === "front") return -1;
                  if ((b.side ?? "") === "front") return 1;
                  return 0;
                });

                const docConfig = getDocConfig(docType);
                const allVerified = sorted.every(d => d.status === "approved" || d.status === "verified");
                const someRejected = sorted.some(d => d.status === "rejected");

                return (
                  <div key={docType} style={{ marginBottom: "2.5rem", paddingBottom: "1.5rem", borderBottom: "1px solid " + C.border }}>
                    {/* Document Type Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "1.2rem", color: C.text }}>{docConfig.displayName}</div>
                        <div style={{ fontSize: "0.8rem", color: C.muted, marginTop: "0.25rem" }}>Document Type: {docType}</div>
                      </div>
                      <Badge
                        status={allVerified ? "active" : someRejected ? "blocked" : "pending"}
                        label={allVerified ? "✓ Verified" : someRejected ? "✕ Rejected" : "⏳ Pending"}
                      />
                    </div>

                    {/* Document Slides */}
                    <div style={{ display: "grid", gridTemplateColumns: sorted.length > 1 ? "repeat(2, 1fr)" : "1fr", gap: "1.5rem" }}>
                      {(() => {
                        // Deduplicate: If front and back have same extracted data, show only front
                        const toDisplay = sorted.filter((doc) => {
                          if (sorted.length > 1) {
                            const docSide = (doc.side ?? "").toLowerCase().trim();
                            if (docSide === "back") {
                              const frontDoc = sorted.find(d => (d.side ?? "").toLowerCase().trim() === "front");
                              if (frontDoc && JSON.stringify(frontDoc.extractedData) === JSON.stringify(doc.extractedData)) {
                                return false; // Skip back if identical to front
                              }
                            }
                          }
                          return true;
                        });

                        return toDisplay.map((doc) => {
                          const side = doc.side ?? "front";
                          const isVerified = doc.status === "approved" || doc.status === "verified";
                          const isRejected = doc.status === "rejected";

                          return (
                            <div
                              key={doc._id}
                              style={{
                                border: isVerified ? "2px solid #10b981" : isRejected ? "2px solid #ef4444" : "2px solid #3b82f6",
                                borderRadius: 14,
                                padding: "1.5rem",
                                background: isVerified ? "rgba(16,185,129,0.1)" : isRejected ? "rgba(239,68,68,0.1)" : "#1a2332",
                                transition: "all 0.2s",
                              }}
                            >
                              {/* Slide Header - Side & Status */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                                <div style={{
                                  fontSize: "0.85rem",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  color: side === "front" ? "rgb(59, 130, 246)" : "rgb(236, 72, 153)",
                                  letterSpacing: "0.05em",
                                }}>
                                  {side === "front" ? "🔵 FRONT SIDE" : side === "back" ? "🔴 BACK SIDE" : "📄 DOCUMENT"}
                                </div>
                                <Badge
                                  status={isVerified ? "active" : isRejected ? "blocked" : "pending"}
                                  label={isVerified ? "Verified" : isRejected ? "Rejected" : "Pending"}
                                />
                              </div>

                              {/* Extracted Data Fields - Formatted by Config */}
                              <div style={{ fontSize: "0.85rem", lineHeight: 2 }}>
                                {doc.extractedData && Object.keys(doc.extractedData).length > 0 ? (
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 1rem" }}>
                                    {docConfig.fields.length > 0 ? (
                                      // Show only configured fields for this document type
                                      docConfig.fields.map((fieldConfig) => {
                                        const value = doc.extractedData[fieldConfig.key];
                                        let displayValue = "—";

                                        if (value) {
                                          if (Array.isArray(value)) {
                                            displayValue = value.length > 0 ? value.join(", ") : "—";
                                          } else if (typeof value === "string") {
                                            displayValue = value.trim() || "—";
                                          } else if (typeof value === "boolean") {
                                            displayValue = value ? "Yes" : "No";
                                          } else {
                                            displayValue = String(value);
                                          }
                                        }

                                        return (
                                          <div key={fieldConfig.key}>
                                            <div style={{ fontWeight: 600, color: "#e0e7ff", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                                              {fieldConfig.label}
                                            </div>
                                            <div style={{
                                              color: "#ffffff",
                                              fontFamily: displayValue === "—" ? "inherit" : "monospace",
                                              fontWeight: 500,
                                              fontSize: "0.8rem",
                                              wordBreak: "break-word",
                                              padding: "0.5rem",
                                              backgroundColor: displayValue === "—" ? "transparent" : "rgba(59, 130, 246, 0.3)",
                                              borderRadius: 6,
                                              border: displayValue === "—" ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(59, 130, 246, 0.5)",
                                            }}>
                                              {displayValue}
                                            </div>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      // Fallback: show all extracted data
                                      Object.entries(doc.extractedData).map(([key, value]) => {
                                        if (key === "vehicleTypesVerified" || key.startsWith("_") || !value) return null;

                                        let displayValue = "—";
                                        if (Array.isArray(value)) {
                                          displayValue = value.length > 0 ? value.join(", ") : "—";
                                        } else if (typeof value === "string") {
                                          displayValue = value.trim() || "—";
                                        } else if (typeof value === "boolean") {
                                          displayValue = value ? "Yes" : "No";
                                        } else {
                                          displayValue = String(value);
                                        }

                                        return (
                                          <div key={key}>
                                            <div style={{ fontWeight: 600, color: "#e0e7ff", fontSize: "0.8rem", marginBottom: "0.25rem" }}>
                                              {formatLabel(key)}
                                            </div>
                                            <div style={{
                                              color: "#ffffff",
                                              fontFamily: "monospace",
                                              fontWeight: 500,
                                              fontSize: "0.8rem",
                                              wordBreak: "break-word",
                                              padding: "0.5rem",
                                              backgroundColor: "rgba(59, 130, 246, 0.3)",
                                              borderRadius: 6,
                                              border: "1px solid rgba(59, 130, 246, 0.5)",
                                            }}>
                                              {displayValue}
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ color: "#9ca3af", fontStyle: "italic", fontSize: "0.85rem", padding: "1rem" }}>
                                    No data extracted
                                  </div>
                                )}
                              </div>

                              {/* Remarks (if rejected) */}
                              {isRejected && doc.remarks && (
                                <div style={{
                                  marginTop: "1rem",
                                  padding: "0.75rem",
                                  backgroundColor: "rgba(239,68,68,0.1)",
                                  borderRadius: 8,
                                  borderLeft: "3px solid #ef4444",
                                }}>
                                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#dc2626", marginBottom: "0.25rem" }}>⚠️ Rejection Remarks:</div>
                                  <div style={{ fontSize: "0.75rem", color: "#991b1b", lineHeight: 1.5 }}>{doc.remarks}</div>
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                );
              });
            })()}
      </Modal>

      {/* Saved Documents Modal */}
      <Modal
        open={savedDocsOpen}
        onClose={() => setSavedDO(false)}
        title={`${sel?.name ?? "Driver"} — Saved Documents`}
        width={900}
      >
        {savedDocsLoading ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <Spinner label="Loading saved documents…" />
          </div>
        ) : savedDocs.length === 0 ? (
          <div style={{
            padding: "2rem",
            textAlign: "center",
            color: "#6b7280",
            fontSize: "0.95rem",
          }}>
            No saved documents found for this driver
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>File Name</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: 600, color: "#374151" }}>Size</th>
                  <th style={{ padding: "0.75rem", textAlign: "center", fontWeight: 600, color: "#374151" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {savedDocs.map((file: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.75rem", color: "#1f2937" }}>
                      {file.name || file}
                    </td>
                    <td style={{ padding: "0.75rem", color: "#6b7280" }}>
                      {file.size ? `${(file.size / 1024).toFixed(2)} KB` : "–"}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "center" }}>
                      <Btn
                        size="sm"
                        variant="outline"
                        onClick={() => downloadSavedDocToComputer(file)}
                      >
                        📥 Download
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
