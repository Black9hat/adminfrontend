import React, { useState, useMemo } from "react";
import { Download, RefreshCw, RotateCcw, Wallet } from "lucide-react";
import { usePayments, useMutation } from "../hooks/index.ts";
import {
  Badge, Btn, Card, Table, TR, TD, Modal, Spinner, PageError,
  PageHeader, SearchBar, Sel, Tabs, StatCard, InfoRow, SectionLabel,
  ConfirmDialog, C, Pagination, Input,
} from "../components/ui";
import { toast } from "react-toastify";

const PER = 25;

export default function PaymentRefund() {
  const { payments, loading, error, refetch } = usePayments();
  const { mutate, loading: acting } = useMutation();

  const [tab, setTab]       = useState("all");
  const [q, setQ]           = useState("");
  const [page, setPage]     = useState(1);
  const [sel, setSel]       = useState<any>(null);
  const [refundOpen, setRO] = useState(false);
  const [walletOpen, setWO] = useState(false);
  const [walletAmt, setWA]  = useState("0");
  const [walletNote, setWN] = useState("");

  const stats = useMemo(() => ({
    total:    payments.reduce((s, p) => s + p.amount, 0),
    today:    payments.filter(p => new Date(p.createdAt).toDateString() === new Date().toDateString()).reduce((s, p) => s + p.amount, 0),
    success:  payments.filter(p => p.status === "success").length,
    failed:   payments.filter(p => p.status === "failed").length,
    pending:  payments.filter(p => p.status === "pending").length,
    refunded: payments.filter(p => p.status === "refunded").length,
  }), [payments]);

  const filtered = useMemo(() => {
    let base = payments;
    if (tab === "online")  base = base.filter(p => p.method !== "cash");
    if (tab === "cash")    base = base.filter(p => p.method === "cash");
    if (tab === "failed")  base = base.filter(p => p.status === "failed");
    if (tab === "refunded") base = base.filter(p => p.status === "refunded");
    if (q) {
      const ql = q.toLowerCase();
      base = base.filter(p =>
        [p._id, p.tripId, p.razorpayPaymentId, p.customerPhone, p.customerName].some(v => v?.toLowerCase?.().includes(ql))
      );
    }
    return base.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [payments, tab, q]);

  const pages = Math.ceil(filtered.length / PER);
  const paged = filtered.slice((page - 1) * PER, page * PER);

  const doRefund = async () => {
    const { ok } = await mutate("post", "/admin/payments/refund", { tripId: sel?.tripId });
    if (ok) { toast.success("Refund initiated via Razorpay"); setRO(false); refetch(); }
    else toast.warning("Refund endpoint not set up — configure /admin/payments/refund");
  };

  const doWallet = async () => {
    const { ok } = await mutate("post", "/admin/wallet/credit", {
      customerId: sel?.customerId, amount: parseFloat(walletAmt), note: walletNote,
    });
    if (ok) { toast.success("Wallet updated"); setWO(false); }
    else toast.warning("Wallet endpoint not configured — add /admin/wallet/credit");
  };

  const exportCsv = () => {
    const rows = [["Trip ID","Amount","Method","Status","Razorpay ID","Date"], ...filtered.map(p => [p.tripId, p.amount, p.method, p.status, p.razorpayPaymentId ?? "", p.createdAt])];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" }));
    a.download = "payments_" + Date.now() + ".csv"; a.click();
  };

  if (loading) return <Spinner label="Loading transactions…" />;
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
        @keyframes spin{to{transform:rotate(360deg)}}
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
            <span style={{ fontSize: "1.8rem" }}>💳</span>
            <h1 style={{
              margin: 0,
              fontSize: "1.75rem",
              fontWeight: 900,
              color: "#f1f5f9",
              letterSpacing: "-0.02em",
            }}>
              Payments & Refunds
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8" }}>
            {payments.length} transactions
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Btn icon={<Download size={14} />} variant="ghost" onClick={exportCsv}>Export CSV</Btn>
          <Btn icon={<RefreshCw size={14} />} variant="ghost" onClick={refetch}>Refresh</Btn>
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        padding: "2rem",
        width: "100%",
      }}>
        {/* KPI row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}>
          <StatCard label="Total Revenue"   value={"₹" + Math.round(stats.total).toLocaleString("en-IN")} icon="💰" color={C.amber} />
          <StatCard label="Today Revenue"   value={"₹" + Math.round(stats.today).toLocaleString("en-IN")} icon="📅" color={C.primary} />
          <StatCard label="Successful"      value={stats.success}  icon="✅" color={C.green}  />
          <StatCard label="Failed"          value={stats.failed}   icon="❌" color={C.red}    />
          <StatCard label="Pending"         value={stats.pending}  icon="⏳" color={C.amber}  />
          <StatCard label="Refunded"        value={stats.refunded} icon="↩️" color={C.purple} />
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: "1.5rem" }}>
          <Tabs
            tabs={[
              { key: "all",      label: "All",       count: payments.length },
              { key: "online",   label: "Online/UPI" },
              { key: "cash",     label: "Cash"       },
              { key: "failed",   label: "Failed",    count: stats.failed  },
              { key: "refunded", label: "Refunded",  count: stats.refunded },
            ]}
            active={tab} onChange={k => { setTab(k); setPage(1); }}
          />
        </div>

        {/* Search */}
        <div style={{
          display: "flex",
          gap: 10,
          margin: "1.5rem 0",
          flexWrap: "wrap",
          alignItems: "center",
        }}>
          <SearchBar value={q} onChange={v => { setQ(v); setPage(1); }} placeholder="Search by trip ID, phone, Razorpay ID…" />
          <span style={{ fontSize: "0.72rem", color: "#6b7280", fontFamily: "monospace" }}>
            {filtered.length} results
          </span>
        </div>

        {/* Table */}
        <Card>
          <Table
            headers={["Trip ID", "Customer", "Amount", "Method", "Status", "Razorpay ID", "Date", "Actions"]}
            isEmpty={paged.length === 0} emptyMessage="No transactions found"
          >
            {paged.map(p => (
              <TR key={p._id} onClick={() => setSel(p)}>
                <TD mono muted>#{p.tripId?.slice(-8).toUpperCase()}</TD>
                <TD>
                  <div style={{ fontWeight: 600 }}>{p.customerName ?? "—"}</div>
                  <div style={{ fontSize: "0.7rem", color: "#6b7280", fontFamily: "monospace" }}>{p.customerPhone}</div>
                </TD>
                <TD mono><span style={{ fontWeight: 700, color: "#f59e0b" }}>₹{p.amount.toFixed(2)}</span></TD>
                <TD><Badge status={p.method === "cash" ? "offline" : "online"} label={p.method?.toUpperCase()} /></TD>
                <TD><Badge status={p.status} /></TD>
                <TD mono muted style={{ fontSize: "0.7rem" }}>{p.razorpayPaymentId ? p.razorpayPaymentId.slice(0, 18) + "…" : "—"}</TD>
                <TD mono muted style={{ fontSize: "0.7rem" }}>{new Date(p.createdAt).toLocaleDateString("en-IN")}</TD>
                <TD>
                  <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                    {p.status === "success" && p.razorpayPaymentId && (
                      <Btn size="sm" variant="warning" icon={<RotateCcw size={11} />} onClick={() => { setSel(p); setRO(true); }}>Refund</Btn>
                    )}
                    <Btn size="sm" variant="ghost" icon={<Wallet size={11} />} onClick={() => { setSel(p); setWO(true); }}>Wallet</Btn>
                  </div>
                </TD>
              </TR>
            ))}
          </Table>
          <Pagination page={page} pages={pages} total={filtered.length} perPage={PER} onChange={setPage} />
        </Card>
      </div>

      {/* Payment detail modal */}
      <Modal open={!!sel && !refundOpen && !walletOpen} onClose={() => setSel(null)} title="Transaction Detail" width={460}>
        {sel && (
          <>
            <InfoRow label="Trip ID"        value={"#" + sel.tripId?.slice(-8).toUpperCase()} />
            <InfoRow label="Customer"       value={sel.customerName ?? "—"} />
            <InfoRow label="Phone"          value={sel.customerPhone ?? "—"} />
            <InfoRow label="Amount"         value={"₹" + sel.amount.toFixed(2)} color="#f59e0b" />
            <InfoRow label="Method"         value={sel.method?.toUpperCase()} />
            <InfoRow label="Status"         value={<Badge status={sel.status} />} />
            <InfoRow label="Razorpay ID"    value={sel.razorpayPaymentId ?? "—"} />
            <InfoRow label="Razorpay Order" value={sel.razorpayOrderId ?? "—"} />
            <InfoRow label="Date"           value={new Date(sel.createdAt).toLocaleString("en-IN")} />
            <div style={{ display: "flex", gap: 8, marginTop: "1rem", justifyContent: "flex-end" }}>
              {sel.status === "success" && sel.razorpayPaymentId && (
                <Btn variant="warning" icon={<RotateCcw size={13} />} onClick={() => setRO(true)}>Refund</Btn>
              )}
              <Btn variant="ghost" icon={<Wallet size={13} />} onClick={() => setWO(true)}>Wallet Credit/Debit</Btn>
            </div>
          </>
        )}
      </Modal>

      {/* Refund confirm */}
      <ConfirmDialog
        open={refundOpen} onClose={() => setRO(false)} onConfirm={doRefund}
        title="Initiate Refund"
        message={"Refund ₹" + (sel?.amount?.toFixed(2) ?? 0) + " for trip #" + (sel?.tripId?.slice(-8).toUpperCase() ?? "") + " via Razorpay?"}
        confirmLabel="Yes, Refund" loading={acting}
      />

      {/* Wallet modal */}
      <Modal open={walletOpen} onClose={() => setWO(false)} title="Wallet Credit / Debit" width={380}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <Input label="Amount (positive = credit, negative = debit)" value={walletAmt} onChange={setWA} type="number" placeholder="e.g. 50 or -50" />
          <Input label="Note / Reason" value={walletNote} onChange={setWN} placeholder="Reason for adjustment…" />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setWO(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={doWallet} loading={acting}>Apply</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}