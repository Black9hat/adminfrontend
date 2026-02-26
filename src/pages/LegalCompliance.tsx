import React, { useState, useMemo } from "react";
import { Download, FileText, RefreshCw } from "lucide-react";
import { useTrips } from "../hooks/index";
import {
  Btn, Card, Table, TR, TD, Modal, Spinner, PageError,
  PageHeader, StatCard, SectionLabel, InfoRow, Tabs, C,
  SearchBar, Pagination,
} from "../components/ui";
import { toast } from "react-toastify";

const PER = 25;

// ── Rupees formatter
const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

// ── GST calculation (5% on transport services in India)
const GST_RATE = 0.05;
const calcGST = (amount: number) => ({
  base:  Math.round(amount / (1 + GST_RATE) * 100) / 100,
  gst:   Math.round(amount - amount / (1 + GST_RATE)) ,
  total: amount,
  cgst:  Math.round((amount - amount / (1 + GST_RATE)) / 2),
  sgst:  Math.round((amount - amount / (1 + GST_RATE)) / 2),
});

export default function LegalCompliance() {
  const { trips, loading, error, refetch } = useTrips();
  const [tab, setTab]   = useState("invoices");
  const [q, setQ]       = useState("");
  const [page, setPage] = useState(1);
  const [sel, setSel]   = useState<any>(null);

  const completed = useMemo(() =>
    trips.filter(t => t.status === "completed").sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
  [trips]);

  const filtered = useMemo(() => {
    if (!q) return completed;
    const ql = q.toLowerCase();
    return completed.filter(t =>
      [t._id, t.customerId?.name, t.customerId?.phone, t.assignedDriver?.name].some(v => v?.toLowerCase?.().includes(ql))
    );
  }, [completed, q]);

  const pages = Math.ceil(filtered.length / PER);
  const paged = filtered.slice((page - 1) * PER, page * PER);

  const totalRevenue = completed.reduce((s, t) => s + (t.finalFare ?? t.fare ?? 0), 0);
  const totalGST     = completed.reduce((s, t) => s + calcGST(t.finalFare ?? t.fare ?? 0).gst, 0);

  // ── Generate and download invoice HTML as printable page
  const downloadInvoice = (t: any) => {
    const fare = t.finalFare ?? t.fare ?? 0;
    const gst  = calcGST(fare);
    const inv  = "INV-" + t._id.slice(-8).toUpperCase();
    const date = new Date(t.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Invoice ${inv}</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; max-width: 700px; margin: 40px auto; color: #1a1a1a; font-size: 14px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .logo { font-size: 22px; font-weight: 900; color: #6366f1; }
  .inv-num { text-align: right; }
  .inv-num h2 { margin: 0; color: #6366f1; font-size: 18px; }
  .inv-num p { margin: 4px 0; color: #6b7280; font-size: 12px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; padding: 20px; background: #f9fafb; border-radius: 10px; }
  .party h4 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280; }
  .party p { margin: 2px 0; font-size: 14px; }
  .items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  .items th { background: #6366f1; color: white; padding: 10px 14px; text-align: left; font-size: 12px; }
  .items td { padding: 10px 14px; border-bottom: 1px solid #e5e7eb; }
  .totals { margin-left: auto; width: 260px; }
  .totals tr td { padding: 6px 0; font-size: 13px; }
  .totals tr td:last-child { text-align: right; font-family: monospace; font-weight: 600; }
  .totals tr.grand td { font-weight: 900; font-size: 16px; color: #6366f1; border-top: 2px solid #e5e7eb; padding-top: 10px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 11px; }
  .status { display: inline-block; background: #dcfce7; color: #166534; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">🚘 GoIndia</div>
    <p style="color:#6b7280;margin:4px 0;font-size:12px">Ride Booking Platform</p>
    <p style="color:#6b7280;margin:2px 0;font-size:12px">GSTIN: [YOUR GSTIN HERE]</p>
  </div>
  <div class="inv-num">
    <h2>TAX INVOICE</h2>
    <p><strong>${inv}</strong></p>
    <p>Date: ${date}</p>
    <span class="status">PAID</span>
  </div>
</div>

<div class="parties">
  <div class="party">
    <h4>Billed To (Customer)</h4>
    <p><strong>${t.customerId?.name ?? "Customer"}</strong></p>
    <p>📞 ${t.customerId?.phone ?? "—"}</p>
  </div>
  <div class="party">
    <h4>Driver</h4>
    <p><strong>${t.assignedDriver?.name ?? "Driver"}</strong></p>
    <p>📞 ${t.assignedDriver?.phone ?? "—"}</p>
    <p>🚗 ${t.vehicleType ?? "—"}</p>
  </div>
</div>

<table class="items">
  <thead><tr><th>#</th><th>Description</th><th>HSN/SAC</th><th>Amount</th></tr></thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>
        <strong>Ride Service — ${t.type === "short" ? "City Ride" : t.type === "long" ? "Long Route" : "Parcel Delivery"}</strong><br/>
        <span style="color:#6b7280;font-size:12px">
          📍 ${t.pickup?.address ?? "—"}<br/>
          🏁 ${t.drop?.address ?? "—"}<br/>
          Trip ID: #${t._id.slice(-8).toUpperCase()}
        </span>
      </td>
      <td>996411</td>
      <td style="font-family:monospace">₹${gst.base.toFixed(2)}</td>
    </tr>
  </tbody>
</table>

<table class="totals">
  <tr><td>Subtotal</td><td>₹${gst.base.toFixed(2)}</td></tr>
  <tr><td>CGST (2.5%)</td><td>₹${gst.cgst.toFixed(2)}</td></tr>
  <tr><td>SGST (2.5%)</td><td>₹${gst.sgst.toFixed(2)}</td></tr>
  ${t.discountApplied ? `<tr><td style="color:#22c55e">Discount</td><td style="color:#22c55e">-₹${t.discountApplied.toFixed(2)}</td></tr>` : ""}
  <tr class="grand"><td>Total</td><td>₹${fare.toFixed(2)}</td></tr>
</table>

<div class="footer">
  <p>This is a computer-generated invoice. No signature required.</p>
  <p>SAC Code: 996411 — Local road transport services | GST Rate: 5% (CGST 2.5% + SGST 2.5%)</p>
  <p>Payment via: ${t.payment?.method?.toUpperCase() ?? "CASH"} | ${t.payment?.razorpayPaymentId ? "Razorpay ID: " + t.payment.razorpayPaymentId : ""}</p>
</div>
</body></html>`;

    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.print(); }
  };

  // ── Export all completed trips as CSV
  const exportCSV = () => {
    const rows = [
      ["Trip ID", "Date", "Customer", "Customer Phone", "Driver", "Driver Phone", "Vehicle", "Pickup", "Drop", "Base Amount", "GST", "Total", "Payment Method", "Razorpay ID"],
      ...completed.map(t => {
        const fare = t.finalFare ?? t.fare ?? 0;
        const gst  = calcGST(fare);
        return [
          "#" + t._id.slice(-8).toUpperCase(),
          new Date(t.createdAt).toLocaleDateString("en-IN"),
          t.customerId?.name ?? "", t.customerId?.phone ?? "",
          t.assignedDriver?.name ?? "", t.assignedDriver?.phone ?? "",
          t.vehicleType ?? "",
          (t.pickup?.address ?? "").replace(/,/g, " "),
          (t.drop?.address ?? "").replace(/,/g, " "),
          gst.base.toFixed(2), gst.gst.toFixed(2), fare.toFixed(2),
          t.payment?.method ?? "cash",
          t.payment?.razorpayPaymentId ?? "",
        ];
      }),
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "ride_history_" + new Date().toISOString().slice(0, 10) + ".csv"; a.click();
    toast.success("CSV exported — " + completed.length + " trips");
  };

  // ── Export GST summary CSV
  const exportGST = () => {
    const rows = [
      ["Month", "Trips", "Gross Revenue", "Base Amount", "CGST (2.5%)", "SGST (2.5%)", "Total GST"],
    ];
    const monthly: Record<string, { trips: number; gross: number; base: number; gst: number }> = {};
    completed.forEach(t => {
      const month = new Date(t.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short" });
      const fare  = t.finalFare ?? t.fare ?? 0;
      const gst   = calcGST(fare);
      if (!monthly[month]) monthly[month] = { trips: 0, gross: 0, base: 0, gst: 0 };
      monthly[month].trips++; monthly[month].gross += fare; monthly[month].base += gst.base; monthly[month].gst += gst.gst;
    });
    Object.entries(monthly).forEach(([month, v]) => {
      rows.push([month, String(v.trips), v.gross.toFixed(2), v.base.toFixed(2), (v.gst / 2).toFixed(2), (v.gst / 2).toFixed(2), v.gst.toFixed(2)]);
    });
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" })); a.download = "gst_summary_" + new Date().getFullYear() + ".csv"; a.click();
    toast.success("GST summary exported");
  };

  if (loading) return <Spinner label="Loading compliance data…" />;
  if (error)   return <PageError message={error} onRetry={refetch} />;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: "1.75rem", fontFamily: "'Syne','Segoe UI',sans-serif" }}>
      <PageHeader title="Legal & Compliance" icon="📋"
        sub={completed.length + " completed trips · GST registered (5% SAC 996411)"}
        actions={<>
          <Btn icon={<Download size={14}/>} variant="ghost" onClick={exportCSV}>Export All CSV</Btn>
          <Btn icon={<Download size={14}/>} variant="ghost" onClick={exportGST}>GST Summary</Btn>
          <Btn icon={<RefreshCw size={14}/>} variant="ghost" onClick={refetch}>Refresh</Btn>
        </>}
      />

      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: "0.875rem", marginBottom: "1.5rem" }}>
        <StatCard label="Total Revenue"      value={inr(totalRevenue)} icon="💰" color={C.amber}   />
        <StatCard label="Total GST Collected" value={inr(totalGST)}   icon="🏛️" color={C.primary} />
        <StatCard label="Completed Trips"    value={completed.length}  icon="✅" color={C.green}   />
        <StatCard label="Invoices Available" value={completed.length}  icon="📄" color={C.cyan}    />
      </div>

      {/* Tabs */}
      <Tabs tabs={[
        { key: "invoices", label: "Invoices",       count: completed.length },
        { key: "gst",      label: "GST Summary"                              },
        { key: "privacy",  label: "Privacy Logs"                             },
      ]} active={tab} onChange={k => { setTab(k); setPage(1); }} />

      <div style={{ marginTop: "1rem" }}>

        {/* INVOICES tab */}
        {tab === "invoices" && (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: "1rem" }}>
              <SearchBar value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Search customer, driver, trip ID…" />
            </div>
            <Card>
              <Table headers={["Trip ID", "Date", "Customer", "Driver", "Vehicle", "Fare", "GST", "Payment", "Invoice"]} isEmpty={paged.length === 0} emptyMessage="No completed trips">
                {paged.map(t => {
                  const fare = t.finalFare ?? t.fare ?? 0;
                  const gst  = calcGST(fare);
                  return (
                    <TR key={t._id}>
                      <TD mono muted>{"INV-" + t._id.slice(-8).toUpperCase()}</TD>
                      <TD mono muted style={{ fontSize: "0.72rem" }}>{new Date(t.createdAt).toLocaleDateString("en-IN")}</TD>
                      <TD><div style={{ fontWeight: 600 }}>{t.customerId?.name ?? "—"}</div><div style={{ fontSize: "0.7rem", color: C.muted, fontFamily: "monospace" }}>{t.customerId?.phone}</div></TD>
                      <TD muted style={{ fontSize: "0.8rem" }}>{t.assignedDriver?.name ?? "—"}</TD>
                      <TD muted style={{ fontSize: "0.78rem" }}>{t.vehicleType}</TD>
                      <TD mono style={{ fontWeight: 700, color: C.amber }}>₹{fare.toFixed(2)}</TD>
                      <TD mono muted style={{ fontSize: "0.72rem" }}>₹{gst.gst.toFixed(2)}</TD>
                      <TD muted style={{ fontSize: "0.75rem", textTransform: "uppercase" }}>{t.payment?.method ?? "cash"}</TD>
                      <TD>
                        <Btn size="sm" variant="ghost" icon={<FileText size={11}/>} onClick={() => downloadInvoice(t)}>
                          PDF
                        </Btn>
                      </TD>
                    </TR>
                  );
                })}
              </Table>
              <Pagination page={page} pages={pages} total={filtered.length} perPage={PER} onChange={setPage} />
            </Card>
          </>
        )}

        {/* GST SUMMARY tab */}
        {tab === "gst" && (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.875rem" }}>
              <Btn icon={<Download size={14}/>} variant="ghost" onClick={exportGST}>Download GSTR CSV</Btn>
            </div>
            {(() => {
              const monthly: Record<string, { trips: number; gross: number; base: number; gst: number }> = {};
              completed.forEach(t => {
                const month = new Date(t.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long" });
                const fare  = t.finalFare ?? t.fare ?? 0;
                const g     = calcGST(fare);
                if (!monthly[month]) monthly[month] = { trips: 0, gross: 0, base: 0, gst: 0 };
                monthly[month].trips++; monthly[month].gross += fare; monthly[month].base += g.base; monthly[month].gst += g.gst;
              });
              const rows = Object.entries(monthly).reverse();
              return (
                <Card>
                  <Table headers={["Month", "Trips", "Gross Revenue", "Taxable Base", "CGST 2.5%", "SGST 2.5%", "Total GST"]} isEmpty={rows.length === 0} emptyMessage="No GST data">
                    {rows.map(([month, v]) => (
                      <TR key={month}>
                        <TD style={{ fontWeight: 700 }}>{month}</TD>
                        <TD mono>{v.trips}</TD>
                        <TD mono style={{ color: C.amber, fontWeight: 700 }}>₹{Math.round(v.gross).toLocaleString("en-IN")}</TD>
                        <TD mono muted>₹{Math.round(v.base).toLocaleString("en-IN")}</TD>
                        <TD mono muted>₹{Math.round(v.gst / 2).toLocaleString("en-IN")}</TD>
                        <TD mono muted>₹{Math.round(v.gst / 2).toLocaleString("en-IN")}</TD>
                        <TD mono style={{ color: C.primary, fontWeight: 700 }}>₹{Math.round(v.gst).toLocaleString("en-IN")}</TD>
                      </TR>
                    ))}
                  </Table>
                </Card>
              );
            })()}
            <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, fontSize: "0.82rem", color: C.muted, lineHeight: 1.7 }}>
              <strong style={{ color: C.text }}>HSN/SAC: 996411</strong> — Local passenger transport via app-based platform.<br/>
              GST Rate: <strong style={{ color: C.text }}>5%</strong> (CGST 2.5% + SGST 2.5%) applicable on ride fare.<br/>
              Consult your CA for GSTR-1, GSTR-3B filings. Export CSV and share with your accountant.
            </div>
          </>
        )}

        {/* PRIVACY LOGS tab */}
        {tab === "privacy" && (
          <div>
            <Card style={{ padding: "1.25rem", marginBottom: "1rem" }}>
              <SectionLabel>🔒 Data Privacy Log</SectionLabel>
              <div style={{ color: C.muted, fontSize: "0.82rem", lineHeight: 1.8 }}>
                <p>This section tracks admin actions on user data for compliance with India's <strong style={{ color: C.text }}>DPDP Act 2023</strong> (Digital Personal Data Protection).</p>
                <p>To enable full audit logs, add a <code style={{ background: "#0e1015", padding: "2px 6px", borderRadius: 4 }}>AuditLog</code> model in MongoDB that records admin actions with:</p>
                <ul style={{ marginLeft: "1.25rem" }}>
                  <li>Action type (view / export / modify / delete)</li>
                  <li>Admin user ID</li>
                  <li>Target user ID</li>
                  <li>Timestamp</li>
                  <li>IP address</li>
                </ul>
              </div>
            </Card>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "0.875rem" }}>
              {[
                { icon: "📤", title: "Data Export Requests",   desc: "Track when user data is exported (CSV)",       status: "Add /admin/audit/exports endpoint" },
                { icon: "🗑️", title: "Data Deletion Requests", desc: "DPDP Act: right to erasure requests",          status: "Add /admin/data-deletion endpoint"  },
                { icon: "👁️", title: "Admin Access Logs",      desc: "Who viewed which user profile",               status: "Add audit middleware to backend"    },
                { icon: "🔑", title: "Login History",          desc: "All admin logins with IP + device",           status: "Add loginHistory to Admin model"    },
              ].map(item => (
                <Card key={item.title} style={{ padding: "1rem" }}>
                  <div style={{ fontSize: "1.3rem", marginBottom: 8 }}>{item.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 4 }}>{item.title}</div>
                  <div style={{ color: C.muted, fontSize: "0.75rem", marginBottom: 8 }}>{item.desc}</div>
                  <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8, padding: "5px 10px", fontSize: "0.68rem", color: C.amber }}>{item.status}</div>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}