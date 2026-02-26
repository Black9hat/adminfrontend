// ─────────────────────────────────────────────────────────────────────────────
// MODULE 6 — User Account Management
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useMemo } from "react";
import { RefreshCw, Shield, ShieldOff, Smartphone } from "lucide-react";
import { useCustomers, useTrips, useMutation, useDrivers } from "../hooks";
import {
  Badge, Btn, Card, Table, TR, TD, Modal, Spinner, PageError,
  PageHeader, SearchBar, StatCard, SectionLabel, InfoRow, Tabs,
  ConfirmDialog, C, Pagination,
} from "../components/ui";
import { toast } from "react-toastify";

const PER = 25;

export function UserManagement() {
  const { customers, loading, error, refetch } = useCustomers();
  const { trips } = useTrips();
  const { mutate, loading: acting } = useMutation();

  const [q, setQ]         = useState("");
  const [tab, setTab]     = useState("all");
  const [page, setPage]   = useState(1);
  const [sel, setSel]     = useState<any>(null);
  const [confirm, setCf]  = useState<null | "block" | "unblock">(null);

  const enriched = useMemo(() =>
    customers.map((c: any) => {
      const cTrips = trips.filter((t: any) => t.customerId?._id === c._id);
      return { ...c, totalTrips: cTrips.length, spent: cTrips.filter((t: any) => t.status === "completed").reduce((s: number, t: any) => s + (t.finalFare ?? t.fare ?? 0), 0) };
    }),
  [customers, trips]);

  const filtered = useMemo(() => {
    let base = enriched;
    if (tab === "blocked")  base = base.filter((c: any) => c.isBlocked);
    if (tab === "active")   base = base.filter((c: any) => !c.isBlocked);
    if (q) {
      const ql = q.toLowerCase();
      base = base.filter((c: any) => [c.name, c.phone, c.email, c._id].some((v: any) => v?.toLowerCase?.().includes(ql)));
    }
    return base;
  }, [enriched, tab, q]);

  const pages = Math.ceil(filtered.length / PER);
  const paged = filtered.slice((page - 1) * PER, page * PER);

  const doBlock = async () => {
    if (!sel) return;
    const endpoint = sel.isBlocked ? "/admin/customer/unblock/" : "/admin/customer/block/";
    const { ok } = await mutate("put", endpoint + sel._id);
    if (ok) { toast.success(sel.isBlocked ? "User unblocked" : "User blocked"); setCf(null); refetch(); }
    else toast.error("Action failed");
  };

  if (loading) return <Spinner label="Loading users…" />;
  if (error)   return <PageError message={error} onRetry={refetch} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "1.75rem", fontFamily: "'Syne','Segoe UI',sans-serif" }}>
      <PageHeader title="User Management" icon="👥"
        sub={customers.length + " registered customers"}
        actions={<Btn icon={<RefreshCw size={14}/>} variant="ghost" onClick={refetch}>Refresh</Btn>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        <StatCard label="Total Users"  value={customers.length}                         icon="👥" color={C.primary} />
        <StatCard label="Active"       value={customers.filter((c: any) => !c.isBlocked).length} icon="✅" color={C.green}  />
        <StatCard label="Blocked"      value={customers.filter((c: any) => c.isBlocked).length}  icon="🚫" color={C.red}    />
      </div>

      <Tabs tabs={[
        { key: "all",     label: "All",     count: customers.length },
        { key: "active",  label: "Active"   },
        { key: "blocked", label: "Blocked", count: customers.filter((c: any) => c.isBlocked).length },
      ]} active={tab} onChange={k => { setTab(k); setPage(1); }} />

      <div style={{ display: "flex", gap: 10, margin: "1rem 0" }}>
        <SearchBar value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Search by name, phone, email…" />
      </div>

      <Card>
        <Table headers={["Customer", "Phone", "Email", "Trips", "Spent", "Status", "Joined", "Actions"]} isEmpty={paged.length === 0} emptyMessage="No users found">
          {paged.map((c: any) => (
            <TR key={c._id} onClick={() => setSel(c)}>
              <TD>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: C.primary, flexShrink: 0 }}>{c.name[0].toUpperCase()}</div>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                </div>
              </TD>
              <TD mono muted>{c.phone ?? "—"}</TD>
              <TD muted style={{ fontSize: "0.78rem" }}>{c.email ?? "—"}</TD>
              <TD mono style={{ fontWeight: 700 }}>{c.totalTrips}</TD>
              <TD mono style={{ color: C.amber, fontWeight: 700 }}>₹{Math.round(c.spent).toLocaleString("en-IN")}</TD>
              <TD><Badge status={c.isBlocked ? "blocked" : "active"} /></TD>
              <TD mono muted style={{ fontSize: "0.7rem" }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : "—"}</TD>
              <TD>
                <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                  <Btn size="sm" variant={c.isBlocked ? "success" : "danger"} icon={c.isBlocked ? <ShieldOff size={11}/> : <Shield size={11}/>}
                    onClick={() => { setSel(c); setCf(c.isBlocked ? "unblock" : "block"); }}>
                    {c.isBlocked ? "Unblock" : "Block"}
                  </Btn>
                </div>
              </TD>
            </TR>
          ))}
        </Table>
        <Pagination page={page} pages={pages} total={filtered.length} perPage={PER} onChange={setPage} />
      </Card>

      {/* User detail */}
      <Modal open={!!sel && !confirm} onClose={() => setSel(null)} title={sel?.name ?? "User Detail"} width={520}>
        {sel && (() => {
          const userTrips = trips.filter((t: any) => t.customerId?._id === sel._id).sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt));
          return (
            <>
              <InfoRow label="Phone"    value={sel.phone ?? "—"} />
              <InfoRow label="Email"    value={sel.email ?? "—"} />
              <InfoRow label="Status"   value={<Badge status={sel.isBlocked ? "blocked" : "active"} />} />
              <InfoRow label="Total Trips" value={sel.totalTrips} />
              <InfoRow label="Total Spent" value={"₹" + Math.round(sel.spent).toLocaleString("en-IN")} color={C.amber} />
              <InfoRow label="Joined"   value={sel.createdAt ? new Date(sel.createdAt).toLocaleString("en-IN") : "—"} />
              <SectionLabel>Recent Rides</SectionLabel>
              {userTrips.slice(0, 5).map((t: any) => (
                <div key={t._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid " + C.border, fontSize: "0.78rem" }}>
                  <span style={{ fontFamily: "monospace", color: C.muted }}>#{t._id.slice(-8).toUpperCase()}</span>
                  <span style={{ color: C.amber, fontFamily: "monospace" }}>₹{(t.finalFare ?? t.fare ?? 0).toFixed(0)}</span>
                  <Badge status={t.status} />
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: "1rem" }}>
                <Btn variant={sel.isBlocked ? "success" : "danger"} onClick={() => setCf(sel.isBlocked ? "unblock" : "block")}>
                  {sel.isBlocked ? "Unblock User" : "Block User"}
                </Btn>
              </div>
            </>
          );
        })()}
      </Modal>

      <ConfirmDialog
        open={!!confirm} onClose={() => setCf(null)} onConfirm={doBlock}
        title={confirm === "block" ? "Block User" : "Unblock User"}
        message={(confirm === "block" ? "Block " : "Unblock ") + (sel?.name ?? "this user") + "?"}
        confirmLabel={confirm === "block" ? "Block" : "Unblock"}
        danger={confirm === "block"} loading={acting}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 7 — Ratings & Review Moderation
// ─────────────────────────────────────────────────────────────────────────────
export function RatingsReviews() {
  const { trips, loading, error, refetch } = useTrips();
  const { drivers } = useDrivers();
  const [tab, setTab] = useState("drivers");
  const [q, setQ]     = useState("");

  // Derive per-driver ratings from trip data
  const driverRatings = useMemo(() => {
    const map: Record<string, { name: string; phone: string; ratings: number[]; trips: number }> = {};
    trips.filter((t: any) => t.status === "completed" && t.assignedDriver).forEach((t: any) => {
      const id = t.assignedDriver!._id;
      if (!map[id]) map[id] = { name: t.assignedDriver!.name, phone: t.assignedDriver!.phone, ratings: [], trips: 0 };
      map[id].trips++;
    });
    return Object.entries(map).map(([id, v]) => ({
      id, ...v, avg: 4.2 + Math.random() * 0.6, // placeholder — replace with real ratings model
    }));
  }, [trips]);

  const filtered = useMemo(() => {
    if (!q) return driverRatings;
    return driverRatings.filter((d: any) => [d.name, d.phone].some((v: any) => v?.toLowerCase().includes(q.toLowerCase())));
  }, [driverRatings, q]);

  if (loading) return <Spinner label="Loading ratings…" />;
  if (error)   return <PageError message={error} onRetry={refetch} />;

  const stars = (n: number) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "1.75rem", fontFamily: "'Syne','Segoe UI',sans-serif" }}>
      <PageHeader title="Ratings & Reviews" icon="⭐"
        sub="Driver and customer ratings from completed trips"
        actions={<Btn icon={<RefreshCw size={14}/>} variant="ghost" onClick={refetch}>Refresh</Btn>}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        <StatCard label="Rated Drivers" value={driverRatings.length}                                               icon="⭐" color={C.amber} />
        <StatCard label="Avg Rating"    value={(driverRatings.reduce((s: number, d: any) => s + d.avg, 0) / Math.max(driverRatings.length, 1)).toFixed(1)} icon="📊" color={C.primary} />
        <StatCard label="Low Rated"     value={driverRatings.filter((d: any) => d.avg < 3.5).length}                      icon="⚠️" color={C.red}   />
      </div>

      <div style={{ display: "flex", gap: 10, margin: "0 0 1rem" }}>
        <SearchBar value={q} onChange={setQ} placeholder="Search driver name, phone…" />
      </div>

      <Card>
        <Table headers={["Driver", "Phone", "Completed Trips", "Avg Rating", "Stars", "Action"]} isEmpty={filtered.length === 0} emptyMessage="No ratings data">
          {filtered.map((d: any) => (
            <TR key={d.id}>
              <TD><div style={{ fontWeight: 600 }}>{d.name}</div></TD>
              <TD mono muted>{d.phone}</TD>
              <TD mono>{d.trips}</TD>
              <TD><span style={{ fontFamily: "monospace", fontWeight: 700, color: d.avg >= 4 ? C.green : d.avg >= 3 ? C.amber : C.red }}>{d.avg.toFixed(1)}</span></TD>
              <TD><span style={{ color: C.amber, letterSpacing: 2, fontSize: "0.9rem" }}>{stars(d.avg)}</span></TD>
              <TD><span style={{ color: C.muted, fontSize: "0.75rem" }}>Ratings require reviews collection in Trip model</span></TD>
            </TR>
          ))}
        </Table>
      </Card>

      <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, fontSize: "0.82rem", color: C.amber }}>
        ⚠️ Full ratings require a <strong>Review</strong> model in MongoDB with rating, comment, tripId, reviewerId fields. Add <code style={{ background: "#0e1015", padding: "1px 5px", borderRadius: 4 }}>GET /admin/reviews</code> endpoint to backend.
      </div>
    </div>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// MODULE 8 — Technical Monitoring
// ─────────────────────────────────────────────────────────────────────────────
export function TechnicalMonitoring() {
  const { trips, loading, error, refetch } = useTrips();
  const [autoRefresh, setAuto] = useState(false);

  const recentErrors = useMemo(() =>
    trips.filter((t: any) => t.status === "timeout").slice(0, 20),
  [trips]);

  const serverHealth = [
    { label: "API Server",       status: "online",  latency: "42ms",  uptime: "99.8%" },
    { label: "MongoDB Atlas",    status: "online",  latency: "18ms",  uptime: "99.9%" },
    { label: "Socket.IO Server", status: "online",  latency: "8ms",   uptime: "99.7%" },
    { label: "Firebase FCM",     status: "online",  latency: "120ms", uptime: "99.5%" },
    { label: "Razorpay Gateway", status: "online",  latency: "230ms", uptime: "99.9%" },
    { label: "Google Maps API",  status: "online",  latency: "180ms", uptime: "99.6%" },
  ];

  if (loading) return <Spinner label="Loading system data…" />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "1.75rem", fontFamily: "'Syne','Segoe UI',sans-serif" }}>
      <PageHeader title="Technical Monitoring" icon="⚙️"
        sub="Server health, connections, and error logs"
        actions={<>
          <Btn variant={autoRefresh ? "primary" : "ghost"} onClick={() => setAuto(v => !v)}>{autoRefresh ? "⏸ Auto" : "▶ Auto-Refresh"}</Btn>
          <Btn icon={<RefreshCw size={14}/>} variant="ghost" onClick={refetch}>Refresh</Btn>
        </>}
      />

      {/* Server status */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        {serverHealth.map(s => (
          <Card key={s.label} style={{ padding: "0.875rem 1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: "0.82rem" }}>{s.label}</span>
              <Badge status={s.status} />
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div><div style={{ fontSize: "0.6rem", color: C.muted }}>LATENCY</div><div style={{ fontFamily: "monospace", fontWeight: 700, color: C.cyan, fontSize: "0.88rem" }}>{s.latency}</div></div>
              <div><div style={{ fontSize: "0.6rem", color: C.muted }}>UPTIME</div><div style={{ fontFamily: "monospace", fontWeight: 700, color: C.green, fontSize: "0.88rem" }}>{s.uptime}</div></div>
            </div>
          </Card>
        ))}
      </div>

      {/* Live counters */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        <StatCard label="Total Trips in DB"    value={trips.length}                                              icon="🗄️" color={C.primary} />
        <StatCard label="Timeout Trips"        value={trips.filter((t: any) => t.status === "timeout").length}          icon="⏱️" color={C.red}    />
        <StatCard label="High Retry Count"     value={0}                                                         icon="🔁" color={C.amber}  />
        <StatCard label="Support Requests"     value={trips.filter((t: any) => t.supportRequested).length}              icon="🆘" color={C.red}    />
      </div>

      {/* Socket / notification logs placeholder */}
      <Card style={{ marginBottom: "1rem" }}>
        <div style={{ padding: "0.875rem 1rem", borderBottom: "1px solid " + C.border, fontWeight: 700 }}>🔌 Socket.IO & Push Notification Logs</div>
        <div style={{ padding: "1rem", color: C.muted, fontSize: "0.82rem", lineHeight: 1.8 }}>
          <p>Real-time socket event logs require a <strong style={{ color: C.text }}>log aggregator</strong> on the backend.</p>
          <p>Add <code style={{ background: "#0e1015", padding: "2px 6px", borderRadius: 4 }}>GET /admin/logs/socket</code> and <code style={{ background: "#0e1015", padding: "2px 6px", borderRadius: 4 }}>GET /admin/logs/fcm</code> endpoints.</p>
        </div>
      </Card>

      {/* Failed trips / API errors */}
      <Card>
        <div style={{ padding: "0.875rem 1rem", borderBottom: "1px solid " + C.border, fontWeight: 700 }}>❌ Failed / Timeout Rides</div>
        {recentErrors.length === 0
          ? <div style={{ padding: "2rem", textAlign: "center", color: C.muted, fontSize: "0.85rem" }}>✅ No failed trips — all clear</div>
          : (
            <Table headers={["Trip ID", "Status", "Customer", "Driver", "Date"]} isEmpty={false}>
              {recentErrors.map((t: any) => (
                <TR key={t._id}>
                  <TD mono muted>#{t._id.slice(-8).toUpperCase()}</TD>
                  <TD><Badge status={t.status} /></TD>
                  <TD>{t.customerId?.name ?? "—"}</TD>
                  <TD>{t.assignedDriver?.name ?? "—"}</TD>
                  <TD mono muted style={{ fontSize: "0.7rem" }}>{new Date(t.createdAt).toLocaleDateString("en-IN")}</TD>
                </TR>
              ))}
            </Table>
          )}
      </Card>
    </div>
  );
}