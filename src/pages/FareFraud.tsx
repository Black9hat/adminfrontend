// ─────────────────────────────────────────────────────────────────────────────
// MODULE 10 — Fare & Pricing Control (lightweight wrapper — FareManagement.tsx
// already exists in your project. This page redirects to it and adds
// promo code management on top.)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useMemo } from "react";
import { RefreshCw, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useFareRates, useMutation } from "../hooks/index.ts";
import {
  Badge, Btn, Card, Table, TR, TD, Modal, Spinner, PageError,
  PageHeader, StatCard, SectionLabel, InfoRow, Tabs, C,
  Input, Sel, ConfirmDialog, Empty,
} from "../components/ui";
import { toast } from "react-toastify";
import axiosInstance from "../api/axiosInstance";
import { useEffect } from "react";

export function FarePricing() {
  const { rates, loading, error, refetch } = useFareRates();
  const { mutate, loading: acting } = useMutation();
  const [tab, setTab] = useState("rates");
  const [promos, setPromos] = useState<any[]>([]);
  const [promoLoading, setPL] = useState(false);
  const [newPromo, setNP] = useState<any>({ code: "", discountType: "percent", discountValue: 10, usageLimit: 100, isActive: true });
  const [addOpen, setAdd] = useState(false);

  const tok = () => localStorage.getItem("adminToken") || "";
  const hdrs = { Authorization: "Bearer " + tok(), "ngrok-skip-browser-warning": "true" };

  const fetchPromos = async () => {
    setPL(true);
    try {
      const r = await axiosInstance.get("/admin/promos", { headers: hdrs });
      setPromos(r.data.promos ?? r.data ?? []);
    } catch { setPromos([]); }
    finally { setPL(false); }
  };

  useEffect(() => { if (tab === "promos") fetchPromos(); }, [tab]);

  const createPromo = async () => {
    if (!newPromo.code) return toast.error("Code required");
    const { ok } = await mutate("post", "/admin/promos", newPromo);
    if (ok) { toast.success("Promo created"); setAdd(false); fetchPromos(); }
    else toast.warning("Promo endpoint not configured — add POST /admin/promos");
  };

  const togglePromo = async (promo: any) => {
    const { ok } = await mutate("put", "/admin/promos/" + promo._id, { isActive: !promo.isActive });
    if (ok) fetchPromos();
    else toast.warning("Update endpoint not set — add PUT /admin/promos/:id");
  };

  if (loading) return <Spinner label="Loading fare rates…" />;
  if (error)   return <PageError message={error} onRetry={refetch} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "1.75rem", fontFamily: "'Syne','Segoe UI',sans-serif" }}>
      <PageHeader title="Fare & Pricing Control" icon="⚡"
        sub={rates.length + " vehicle rate configs"}
        actions={<>
          {tab === "promos" && <Btn icon={<Plus size={14}/>} variant="primary" onClick={() => setAdd(true)}>New Promo</Btn>}
          <Btn icon={<RefreshCw size={14}/>} variant="ghost" onClick={refetch}>Refresh</Btn>
        </>}
      />

      <Tabs tabs={[
        { key: "rates",  label: "Fare Rates",   count: rates.length  },
        { key: "promos", label: "Promo Codes",  count: promos.length },
      ]} active={tab} onChange={setTab} />

      <div style={{ marginTop: "1rem" }}>
        {tab === "rates" && (
          <>
            <div style={{ padding: "0.75rem 0", color: C.muted, fontSize: "0.82rem", marginBottom: "0.75rem" }}>
              Edit fare rates in the <strong style={{ color: C.primary }}>Fare Management</strong> page (FareManagement.tsx) — full edit UI already exists. Below is a read-only summary.
            </div>
            <Card>
              <Table headers={["Vehicle", "Base Fare", "Per Km", "Per Min", "Min Fare", "Commission", "Peak ×", "Night ×", "Status"]} isEmpty={rates.length === 0}>
                {rates.map(r => (
                  <TR key={r._id}>
                    <TD><span style={{ fontWeight: 700 }}>{r.vehicleType}</span></TD>
                    <TD mono style={{ color: C.amber }}>₹{r.baseFare}</TD>
                    <TD mono>₹{r.perKm}/km</TD>
                    <TD mono muted>{r.perMin ? "₹" + r.perMin + "/min" : "—"}</TD>
                    <TD mono>₹{r.minFare ?? "—"}</TD>
                    <TD mono style={{ color: C.primary }}>{r.platformFeePercent ?? "10"}%</TD>
                    <TD mono style={{ color: (r.peakMultiplier ?? 1) > 1 ? C.amber : C.muted }}>{r.peakMultiplier ?? 1}×</TD>
                    <TD mono style={{ color: (r.nightMultiplier ?? 1) > 1 ? C.cyan : C.muted }}>{r.nightMultiplier ?? 1}×</TD>
                    <TD><Badge status={r.isActive !== false ? "active" : "blocked"} label={r.isActive !== false ? "Active" : "Disabled"} /></TD>
                  </TR>
                ))}
              </Table>
            </Card>
          </>
        )}

        {tab === "promos" && (
          <>
            {promoLoading ? <Spinner label="Loading promos…" /> : (
              <Card>
                <Table headers={["Code", "Type", "Value", "Used", "Limit", "Active", "Expires", "Actions"]} isEmpty={promos.length === 0} emptyMessage="No promo codes — create one">
                  {promos.map(p => (
                    <TR key={p._id}>
                      <TD mono><span style={{ fontWeight: 800, color: C.primary, letterSpacing: 1 }}>{p.code}</span></TD>
                      <TD><Badge status={p.discountType === "percent" ? "online" : "offline"} label={p.discountType === "percent" ? "%" : "₹ FLAT"} /></TD>
                      <TD mono style={{ fontWeight: 700, color: C.amber }}>{p.discountType === "percent" ? p.discountValue + "%" : "₹" + p.discountValue}</TD>
                      <TD mono>{p.usedCount ?? 0}</TD>
                      <TD mono muted>{p.usageLimit ?? "∞"}</TD>
                      <TD>
                        <button onClick={() => togglePromo(p)} style={{ background: "none", border: "none", cursor: "pointer", color: p.isActive ? C.green : C.muted, fontSize: "1.1rem" }}>
                          {p.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                        </button>
                      </TD>
                      <TD mono muted style={{ fontSize: "0.72rem" }}>{p.expiresAt ? new Date(p.expiresAt).toLocaleDateString("en-IN") : "No expiry"}</TD>
                      <TD>
                        <Btn size="sm" variant="danger" icon={<Trash2 size={11}/>} onClick={async () => {
                          const { ok } = await mutate("delete", "/admin/promos/" + p._id);
                          if (ok) { toast.success("Deleted"); fetchPromos(); }
                        }}>Delete</Btn>
                      </TD>
                    </TR>
                  ))}
                </Table>
              </Card>
            )}
          </>
        )}
      </div>

      {/* New promo modal */}
      <Modal open={addOpen} onClose={() => setAdd(false)} title="Create Promo Code" width={420}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <Input label="Code" value={newPromo.code} onChange={v => setNP({ ...newPromo, code: v.toUpperCase() })} placeholder="e.g. SAVE20" />
          <div>
            <label style={{ fontSize: "0.68rem", color: C.muted, fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>Discount Type</label>
            <Sel value={newPromo.discountType} onChange={v => setNP({ ...newPromo, discountType: v })}
              options={[{ value: "percent", label: "Percentage %" }, { value: "flat", label: "Flat ₹ Amount" }]}
              style={{ width: "100%", marginTop: 5 }} />
          </div>
          <Input label={newPromo.discountType === "percent" ? "Discount %" : "Flat Amount ₹"} value={newPromo.discountValue} onChange={v => setNP({ ...newPromo, discountValue: Number(v) })} type="number" />
          <Input label="Max Discount ₹ (for percent)" value={newPromo.maxDiscount ?? ""} onChange={v => setNP({ ...newPromo, maxDiscount: Number(v) })} type="number" placeholder="Optional cap" />
          <Input label="Usage Limit" value={newPromo.usageLimit} onChange={v => setNP({ ...newPromo, usageLimit: Number(v) })} type="number" />
          <Input label="Expires At" value={newPromo.expiresAt ?? ""} onChange={v => setNP({ ...newPromo, expiresAt: v })} type="date" />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setAdd(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={createPromo} loading={acting}>Create Promo</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 11 — Fraud Detection Panel
// ─────────────────────────────────────────────────────────────────────────────
import { useTrips } from "../hooks/index.ts";

export function FraudDetection() {
  const { trips, loading, error, refetch } = useTrips();

  const fraud = useMemo(() => {
    if (!trips.length) return { multiCancel: [], gpsIssue: [], suspicious: [] };

    // Multiple cancellations by same customer (>3 cancels in last 30 days)
    const cutoff = new Date(Date.now() - 30 * 86400000);
    const cancelMap: Record<string, { name: string; phone: string; count: number }> = {};
    trips.filter((t: any) => t.status === "cancelled" && new Date(t.createdAt) > cutoff).forEach((t: any) => {
      const id = t.customerId?._id ?? "";
      if (!id) return;
      if (!cancelMap[id]) cancelMap[id] = { name: t.customerId!.name, phone: t.customerId!.phone, count: 0 };
      cancelMap[id].count++;
    });
    const multiCancel = Object.entries(cancelMap).filter(([, v]) => v.count > 3).map(([id, v]) => ({ id, ...v }));

    // GPS mismatch: trips cancelled after driver assigned (potential GPS/location fraud)
    const gpsIssue = trips.filter((t: any) =>
      t.status === "cancelled" &&
      t.assignedDriver &&
      t.cancellationReason?.toLowerCase().includes("location")
    );

    // Suspicious: completed rides with very low fare (possibly fare manipulation)
    const suspicious = trips.filter((t: any) =>
      t.status === "completed" &&
      (t.finalFare ?? t.fare ?? 0) < 20 &&
      t.type !== "parcel"
    );

    return { multiCancel, gpsIssue, suspicious };
  }, [trips]);

  if (loading) return <Spinner label="Analyzing trips for fraud…" />;
  if (error)   return <PageError message={error} onRetry={refetch} />;

  const total = fraud.multiCancel.length + fraud.gpsIssue.length + fraud.suspicious.length;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "1.75rem", fontFamily: "'Syne','Segoe UI',sans-serif" }}>
      <PageHeader title="Fraud Detection" icon="🔍"
        sub={total + " alerts from " + trips.length + " trips analyzed"}
        actions={<Btn icon={<RefreshCw size={14}/>} variant="ghost" onClick={refetch}>Refresh</Btn>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        <StatCard label="Total Alerts"      value={total}                       icon="🚨" color={C.red}    />
        <StatCard label="Repeat Cancellers" value={fraud.multiCancel.length}    icon="❌" color={C.amber}  />
        <StatCard label="GPS Mismatches"    value={fraud.gpsIssue.length}       icon="📍" color={C.cyan}   />
        <StatCard label="Suspicious Fares"  value={fraud.suspicious.length}     icon="💰" color={C.purple} />
        <StatCard label="Cancelled Today"   value={trips.filter((t: any) => t.status === "cancelled" && new Date(t.createdAt).toDateString() === new Date().toDateString()).length} icon="📊" color={C.red} />
        <StatCard label="Cancel Rate"       value={(trips.length > 0 ? (trips.filter((t: any) => t.status === "cancelled").length / trips.length * 100).toFixed(1) : 0) + "%"} icon="📉" color={C.amber} />
      </div>

      {/* Multiple cancellations */}
      <SectionLabel>❌ Repeat Cancellers — {">"}3 cancels in 30 days</SectionLabel>
      <Card style={{ marginBottom: "1.25rem" }}>
        <Table headers={["Customer", "Phone", "Cancellations", "Risk", "Action"]} isEmpty={fraud.multiCancel.length === 0} emptyMessage="✅ No repeat cancellers detected">
          {fraud.multiCancel.map(c => (
            <TR key={c.id}>
              <TD style={{ fontWeight: 600 }}>{c.name}</TD>
              <TD mono muted>{c.phone}</TD>
              <TD><span style={{ fontFamily: "monospace", fontWeight: 800, color: c.count > 8 ? C.red : C.amber, fontSize: "1.1rem" }}>{c.count}×</span></TD>
              <TD><Badge status={c.count > 8 ? "blocked" : "suspended"} label={c.count > 8 ? "High Risk" : "Medium Risk"} /></TD>
              <TD><Btn size="sm" variant={c.count > 8 ? "danger" : "warning"}>Review</Btn></TD>
            </TR>
          ))}
        </Table>
      </Card>

      {/* GPS mismatch */}
      <SectionLabel>📍 GPS / Location Issues</SectionLabel>
      <Card style={{ marginBottom: "1.25rem" }}>
        <Table headers={["Trip ID", "Customer", "Driver", "Cancel Reason", "Date"]} isEmpty={fraud.gpsIssue.length === 0} emptyMessage="✅ No GPS mismatch issues">
          {fraud.gpsIssue.map((t: any) => (
            <TR key={t._id}>
              <TD mono muted>#{t._id.slice(-8).toUpperCase()}</TD>
              <TD>{t.customerId?.name ?? "—"}</TD>
              <TD>{t.assignedDriver?.name ?? "—"}</TD>
              <TD muted style={{ fontSize: "0.78rem" }}>{t.cancellationReason}</TD>
              <TD mono muted style={{ fontSize: "0.7rem" }}>{new Date(t.createdAt).toLocaleDateString("en-IN")}</TD>
            </TR>
          ))}
        </Table>
      </Card>

      {/* Suspicious fares */}
      <SectionLabel>💰 Suspicious Low Fares — below ₹20</SectionLabel>
      <Card>
        <Table headers={["Trip ID", "Customer", "Driver", "Fare", "Type", "Date"]} isEmpty={fraud.suspicious.length === 0} emptyMessage="✅ No suspicious fares detected">
          {fraud.suspicious.map((t: any) => (
            <TR key={t._id}>
              <TD mono muted>#{t._id.slice(-8).toUpperCase()}</TD>
              <TD>{t.customerId?.name ?? "—"}</TD>
              <TD>{t.assignedDriver?.name ?? "—"}</TD>
              <TD mono style={{ color: C.red, fontWeight: 700 }}>₹{(t.finalFare ?? t.fare ?? 0).toFixed(2)}</TD>
              <TD muted style={{ fontSize: "0.8rem" }}>{t.type}</TD>
              <TD mono muted style={{ fontSize: "0.7rem" }}>{new Date(t.createdAt).toLocaleDateString("en-IN")}</TD>
            </TR>
          ))}
        </Table>
      </Card>

      {/* Notice */}
      <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, fontSize: "0.8rem", color: C.muted, lineHeight: 1.7 }}>
        <strong style={{ color: C.text }}>💡 Add more fraud signals:</strong> Referral abuse tracking and ride-sharing manipulation require a <code style={{ background: "#0e1015", padding: "1px 5px", borderRadius: 4 }}>GET /admin/fraud/signals</code> endpoint. GPS mismatch detection needs live location comparison in your Socket.IO server.
      </div>
    </div>
  );
}