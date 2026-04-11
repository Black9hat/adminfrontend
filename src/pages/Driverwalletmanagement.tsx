// pages/DriverWalletManagement.tsx - COMPLETE FIXED VERSION
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  RefreshCw, Wallet, TrendingUp, AlertCircle, CheckCircle2,
  Clock, Eye, EyeOff, Download, Filter, ArrowUpRight, ArrowDownLeft,
  DollarSign, User, Calendar, CreditCard, Send,
} from "lucide-react";
import { useDrivers, useMutation } from "../hooks/index";
import {
  Badge, Btn, Card, Table, TR, TD, Modal, Spinner, PageError,
  SearchBar, Sel, Tabs, InfoRow, SectionLabel,
  StatCard, C, Pagination, ConfirmDialog,
} from "../components/ui";
import { toast } from "react-toastify";

const PER = 15;
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ── Transaction Type Icons ───────────────────────────────────────────────────
const TXN_ICONS: Record<string, React.ReactNode> = {
  credit:     <ArrowDownLeft size={13} style={{ color: C.green }} />,
  debit:      <ArrowUpRight size={13} style={{ color: C.red }} />,
  commission: <AlertCircle size={13} style={{ color: C.amber }} />,
};

const TXN_COLORS: Record<string, string> = {
  credit:     C.green,
  debit:      C.red,
  commission: C.amber,
};

// ── Tab config ───────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { value: "all",      label: "All Drivers" },
  { value: "active",   label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// ── Interfaces ───────────────────────────────────────────────────────────────
interface WalletStats {
  totalDrivers: number;
  totalBalance: number;
  totalEarnings: number;
  pendingPayouts: number;
}

// ── WalletStatsSection ───────────────────────────────────────────────────────
function WalletStatsSection({ stats }: { stats: WalletStats }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "1rem",
      marginBottom: "1.5rem",
    }}>
      <StatCard
        icon={<User size={18} /> as any}
        label="Total Drivers"
        value={stats.totalDrivers}
        color={C.primary}
      />
      <StatCard
        icon={<DollarSign size={18} /> as any}
        label="Total Balance"
        value={`₹${stats.totalBalance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
        color={C.green}
      />
      <StatCard
        icon={<TrendingUp size={18} /> as any}
        label="Total Earnings"
        value={`₹${stats.totalEarnings.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
        color={C.cyan}
      />
      <StatCard
        icon={<Clock size={18} /> as any}
        label="Pending Payouts"
        value={`₹${stats.pendingPayouts.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
        color={C.amber}
      />
    </div>
  );
}

// ── TransactionDetailModal ───────────────────────────────────────────────────
function TransactionDetailModal({
  transaction, driverName, open, onClose,
}: {
  transaction: any; driverName: string; open: boolean; onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Transaction Details" width={480}>
      {transaction && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <div style={{
            background: TXN_COLORS[transaction.type] + "12",
            border: "1px solid " + TXN_COLORS[transaction.type] + "22",
            borderRadius: 8, padding: "1rem",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {TXN_ICONS[transaction.type]}
              <div>
                <div style={{ fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {transaction.type}
                </div>
                <div style={{ fontSize: "0.9rem", color: TXN_COLORS[transaction.type], fontWeight: 700 }}>
                  {transaction.description}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{
                fontSize: "1.3rem", fontWeight: 800,
                color: transaction.type === "debit" ? C.red : C.green,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {transaction.type === "debit" ? "-" : "+"} ₹{transaction.amount.toFixed(2)}
              </div>
              <div style={{ marginTop: 4 }}>
                <Badge status={transaction.status} />
              </div>
            </div>
          </div>

          <div style={{
            background: C.surface2, borderRadius: 8, overflow: "hidden",
            border: "1px solid " + C.border,
          }}>
            <InfoRow label="Driver" value={driverName} />
            <InfoRow label="Type" value={transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} />
            <InfoRow label="Amount" value={`₹${transaction.amount.toFixed(2)}`} />
            <InfoRow label="Status" value={transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)} />
            {transaction.tripId && <InfoRow label="Trip ID" value={transaction.tripId} />}
            {transaction.razorpayPaymentId && <InfoRow label="Payment ID" value={transaction.razorpayPaymentId} />}
            {transaction.paymentMethod && <InfoRow label="Method" value={transaction.paymentMethod.toUpperCase()} />}
            <InfoRow label="Date" value={new Date(transaction.createdAt).toLocaleString("en-IN")} />
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── DriverWalletCard (Change 1: added onExport prop) ─────────────────────────
function DriverWalletCard({
  driver, wallet, onViewTransactions, onExport,
}: {
  driver: any; wallet: any; onViewTransactions: () => void; onExport: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showBalance, setShowBalance] = useState(false);

  return (
    <Card style={{ marginBottom: "1rem", overflow: "hidden" }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "1rem", background: C.surface2,
          border: "1px solid " + C.border, borderRadius: 8,
          cursor: "pointer", display: "flex",
          justifyContent: "space-between", alignItems: "center",
          transition: "all 0.2s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          {/* Avatar */}
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: C.primary + "22",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem", fontWeight: 700, color: C.primary,
          }}>
            {driver.name?.charAt(0).toUpperCase() || "?"}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
              {driver.name || "Unknown Driver"}
            </div>
            <div style={{ fontSize: "0.65rem", color: C.muted }}>
              {driver.phone || "N/A"} · {driver.vehicleType ?? "Unknown"}
            </div>
          </div>

          {/* Balance */}
          <div style={{ textAlign: "right", paddingRight: "0.5rem" }}>
            <div style={{
              fontSize: "0.65rem", color: C.muted,
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              Available Balance
            </div>
            <div style={{
              fontSize: "1.1rem", fontWeight: 800, color: C.green,
              fontFamily: "'JetBrains Mono', monospace",
              display: "flex", alignItems: "center", gap: 6,
              justifyContent: "flex-end",
            }}>
              {showBalance ? `₹${wallet.availableBalance?.toFixed(2) ?? "0.00"}` : "••••••"}
              <button
                onClick={(e) => { e.stopPropagation(); setShowBalance(!showBalance); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}
              >
                {showBalance ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
          </div>

          {/* Expand */}
          <div style={{ color: C.muted, display: "flex" }}>
            {expanded ? "▲" : "▼"}
          </div>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: "1.5rem", borderTop: "1px solid " + C.border }}>
          {/* Stats grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
            gap: "1rem", marginBottom: "1.5rem",
          }}>
            {[
              { label: "Total Earnings", value: wallet.totalEarnings, color: C.green },
              { label: "Total Commission", value: wallet.totalCommission, color: C.amber },
              { label: "Pending Payout", value: wallet.pendingAmount, color: C.cyan },
              { label: "Available Balance", value: wallet.availableBalance, color: C.primary },
            ].map((stat, i) => (
              <div key={i} style={{
                background: stat.color + "12",
                border: "1px solid " + stat.color + "22",
                borderRadius: 7, padding: "0.9rem",
              }}>
                <div style={{
                  fontSize: "0.65rem", color: C.muted,
                  textTransform: "uppercase", letterSpacing: "0.05em",
                }}>
                  {stat.label}
                </div>
                <div style={{
                  fontSize: "1.3rem", fontWeight: 800, color: stat.color,
                  fontFamily: "'JetBrains Mono', monospace", marginTop: 4,
                }}>
                  ₹{(stat.value ?? 0).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ height: "1px", background: C.border, marginBottom: "1.5rem" }} />

          {/* Recent Transactions */}
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.8rem" }}>
              <SectionLabel>Recent Transactions</SectionLabel>
              <span style={{ fontSize: "0.7rem", color: C.muted }}>
                {wallet.transactions?.length ?? 0} total
              </span>
            </div>
            {wallet.transactions && wallet.transactions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {wallet.transactions.slice(0, 5).map((txn: any, idx: number) => {
                  const isCredit = txn.type === "credit";
                  const isCommission = txn.type === "commission";
                  const color = isCredit ? C.green : isCommission ? C.amber : C.red;
                  const prefix = isCredit ? "+" : "-";
                  const methodLabel = txn.paymentMethod && txn.paymentMethod !== "unknown"
                    ? txn.paymentMethod.toUpperCase() : null;
                  return (
                    <div key={txn._id || idx} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "0.65rem 0.8rem",
                      background: color + "08",
                      border: "1px solid " + color + "20",
                      borderRadius: 8, fontSize: "0.8rem",
                      borderLeft: "3px solid " + color,
                    }}>
                      {/* Icon circle */}
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%",
                        background: color + "18",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        {TXN_ICONS[txn.type] || <AlertCircle size={13} style={{ color: C.muted }} />}
                      </div>
                      {/* Description + meta */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.82rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {txn.description || "Transaction"}
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.63rem", color: C.muted }}>
                            {new Date(txn.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {methodLabel && (
                            <span style={{
                              fontSize: "0.6rem", fontWeight: 700, color: C.primary,
                              background: C.primary + "15", padding: "1px 5px", borderRadius: 3,
                            }}>
                              {methodLabel}
                            </span>
                          )}
                          {txn.razorpayPaymentId && (
                            <span style={{ fontSize: "0.6rem", color: C.cyan, fontFamily: "monospace" }}>
                              {txn.razorpayPaymentId.slice(0, 16)}…
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Amount */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{
                          fontWeight: 800, color, fontSize: "0.9rem",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>
                          {prefix}₹{(txn.amount || 0).toFixed(2)}
                        </div>
                        <div style={{
                          fontSize: "0.6rem", textTransform: "uppercase", fontWeight: 600,
                          color: txn.status === "completed" ? C.green : C.amber,
                          marginTop: 2,
                        }}>
                          {txn.status || "completed"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                padding: "1.5rem", textAlign: "center", color: C.muted,
                fontSize: "0.8rem", background: C.surface2, borderRadius: 8,
              }}>
                No transactions yet
              </div>
            )}
          </div>

          {/* Actions (Change 2: Export button now calls onExport) */}
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Btn size="sm" variant="primary" icon={<Wallet size={12} />} onClick={onViewTransactions} full>
                View All Transactions
              </Btn>
            </div>
            <Btn size="sm" variant="ghost" icon={<Download size={12} />} onClick={onExport}>
              Export CSV
            </Btn>
          </div>
        </div>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════


// ── AllTransactionsModal ─────────────────────────────────────────────────────
function AllTransactionsModal({ driver, open, onClose }: { driver: any; open: boolean; onClose: () => void }) {
  const [wallet, setWallet]           = useState<any>(null);
  const [loading, setLoading]         = useState(false);
  const [filter, setFilter]           = useState("all");
  const [search, setSearch]           = useState("");
  const [selectedTxn, setSelectedTxn] = useState<any>(null);

  const fetchDriverWallet = useCallback(async () => {
    if (!driver?._id) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_BASE_URL}/api/wallet/admin/wallets/${driver._id}`, {
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success && data.wallet) {
        const w = data.wallet;
        w.transactions = (w.transactions ?? [])
          .slice()
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setWallet(w);
      }
    } catch (err) { console.error("fetchDriverWallet error:", err); }
    finally { setLoading(false); }
  }, [driver?._id]);

  useEffect(() => {
    if (open && driver?._id) { setFilter("all"); setSearch(""); setSelectedTxn(null); fetchDriverWallet(); }
  }, [open, driver?._id, fetchDriverWallet]);

  const transactions: any[] = wallet?.transactions ?? [];
  const FILTERS = [
    { val: "all", label: "All" },
    { val: "credit", label: "Earnings" },
    { val: "commission", label: "Commission Paid" },
    { val: "debit", label: "Debit" },
  ];
  const filtered = transactions
    .filter(t => filter === "all" || t.type === filter)
    .filter(t => {
      if (!search) return true;
      const s = search.toLowerCase();
      return t.description?.toLowerCase().includes(s) ||
             t.razorpayPaymentId?.toLowerCase().includes(s) ||
             t.paymentMethod?.toLowerCase().includes(s);
    });

  const amountColor = (type: string) => type === "credit" ? C.green : type === "commission" ? C.amber : C.red;
  const amountPrefix = (type: string) => type === "credit" ? "+" : "-";

  const handleExport = () => {
    const rows: string[][] = [];
    rows.push(["Date", "Type", "Description", "Amount (₹)", "Method", "Payment ID (UPI Ref)", "Order ID", "Trip ID", "Status"]);
    filtered.forEach((t: any) => {
      rows.push([
        t.createdAt ? new Date(t.createdAt).toLocaleString("en-IN") : "",
        t.type ?? "", (t.description ?? "").replace(/,/g, " "),
        (amountPrefix(t.type)) + (t.amount ?? 0).toFixed(2),
        t.paymentMethod ?? "", t.razorpayPaymentId ?? "",
        t.razorpayOrderId ?? "", t.tripId?.toString() ?? "", t.status ?? "",
      ]);
    });
    rows.push([], ["Summary"]);
    rows.push(["Total Earnings",         `₹${(wallet?.totalEarnings   ?? 0).toFixed(2)}`]);
    rows.push(["Total Commission Paid",  `₹${(wallet?.totalCommission  ?? 0).toFixed(2)}`]);
    rows.push(["Pending Commission",     `₹${(wallet?.pendingAmount    ?? 0).toFixed(2)}`]);
    rows.push(["Available Balance",      `₹${(wallet?.availableBalance ?? 0).toFixed(2)}`]);
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `wallet_${(driver?.name ?? "driver").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} transactions`);
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={`All Transactions — ${driver?.name ?? ""}`} width={820}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Summary strip */}
          <div style={{
            background: C.surface2, border: "1px solid " + C.border, borderRadius: 10,
            padding: "1rem 1.2rem", display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "center",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: C.primary + "22", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "1.2rem", fontWeight: 700, color: C.primary,
              }}>
                {driver?.name?.charAt(0).toUpperCase() ?? "?"}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{driver?.name ?? "—"}</div>
                <div style={{ fontSize: "0.72rem", color: C.muted }}>{driver?.phone ?? "—"} · {driver?.vehicleType ?? "—"}</div>
              </div>
            </div>
            <div style={{ width: 1, height: 36, background: C.border }} />
            {wallet && [
              { label: "Earnings",    value: wallet.totalEarnings,    color: C.green },
              { label: "Commission",  value: wallet.totalCommission,  color: C.red   },
              { label: "Pending",     value: wallet.pendingAmount,     color: C.amber },
              { label: "Balance",     value: wallet.availableBalance, color: C.cyan  },
            ].map(item => (
              <div key={item.label}>
                <div style={{ fontSize: "0.62rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{item.label}</div>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: item.color, fontFamily: "monospace" }}>
                  ₹{(item.value ?? 0).toFixed(2)}
                </div>
              </div>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <Btn size="sm" variant="ghost" icon={<RefreshCw size={13} />} onClick={fetchDriverWallet} loading={loading}>Refresh</Btn>
              <Btn size="sm" variant="ghost" icon={<Download size={13} />} onClick={handleExport}>Export CSV</Btn>
            </div>
          </div>

          {/* Filter tabs + search */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            {FILTERS.map(({ val, label }) => {
              const count = val === "all" ? transactions.length : transactions.filter(t => t.type === val).length;
              const color = val === "credit" ? C.green : val === "commission" ? C.amber : val === "debit" ? C.red : C.primary;
              return (
                <button key={val} onClick={() => setFilter(val)} style={{
                  padding: "5px 14px", borderRadius: 20, border: "1.5px solid",
                  cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
                  borderColor: filter === val ? color : C.border,
                  background:  filter === val ? color + "18" : "transparent",
                  color:        filter === val ? color : C.muted,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {label}
                  <span style={{
                    background: filter === val ? color + "30" : C.surface2,
                    color: filter === val ? color : C.muted,
                    fontSize: "0.68rem", fontWeight: 700,
                    padding: "0px 6px", borderRadius: 10,
                  }}>
                    {count}
                  </span>
                </button>
              );
            })}
            <input
              placeholder="Search payment ID, description, method…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, minWidth: 200, padding: "6px 12px", borderRadius: 8,
                border: "1px solid " + C.border, background: C.surface2,
                color: "inherit", fontSize: "0.82rem", outline: "none",
              }}
            />
          </div>

          {/* Transactions */}
          <div style={{ maxHeight: 460, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {loading ? (
              <div style={{ padding: "3rem", textAlign: "center" }}><Spinner label="Loading transactions…" /></div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: C.muted, fontSize: "0.85rem" }}>
                No transactions found
              </div>
            ) : filtered.map((txn: any, idx: number) => {
              const color  = amountColor(txn.type);
              const prefix = amountPrefix(txn.type);
              const methodLabel = txn.paymentMethod && txn.paymentMethod !== "unknown" ? txn.paymentMethod.toUpperCase() : null;
              return (
                <div
                  key={txn._id || idx}
                  onClick={() => setSelectedTxn(txn)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "0.8rem 1rem",
                    background: color + "08",
                    border: "1px solid " + color + "22",
                    borderLeft: "3px solid " + color,
                    borderRadius: 8, cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: color + "20",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {TXN_ICONS[txn.type] || <AlertCircle size={14} style={{ color: C.muted }} />}
                  </div>

                  {/* Main info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {txn.description || "Transaction"}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: "0.68rem", color: C.muted }}>
                        {txn.createdAt ? new Date(txn.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </span>
                      {methodLabel && (
                        <span style={{
                          fontSize: "0.62rem", fontWeight: 700, color: C.primary,
                          background: C.primary + "15", padding: "1px 6px", borderRadius: 4,
                        }}>
                          {methodLabel}
                        </span>
                      )}
                      {txn.razorpayPaymentId && (
                        <span style={{ fontSize: "0.62rem", color: C.cyan, fontFamily: "monospace" }}>
                          {txn.razorpayPaymentId}
                        </span>
                      )}
                      {txn.tripId && (
                        <span style={{ fontSize: "0.62rem", color: C.muted }}>Trip: {txn.tripId?.toString().slice(-6)}</span>
                      )}
                    </div>
                  </div>

                  {/* Amount + status */}
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 800, color, fontSize: "1rem", fontFamily: "monospace" }}>
                      {prefix}₹{(txn.amount ?? 0).toFixed(2)}
                    </div>
                    <div style={{
                      fontSize: "0.6rem", textTransform: "uppercase", fontWeight: 700, marginTop: 2,
                      color: txn.status === "completed" ? C.green : C.amber,
                    }}>
                      ● {txn.status || "completed"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer count */}
          {!loading && (
            <div style={{ fontSize: "0.75rem", color: C.muted, textAlign: "right" }}>
              Showing {filtered.length} of {transactions.length} transactions
            </div>
          )}
        </div>
      </Modal>

      {/* Detail sub-modal */}
      {selectedTxn && (
        <Modal open={!!selectedTxn} onClose={() => setSelectedTxn(null)} title="Transaction Details" width={500}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Amount header */}
            <div style={{
              background: amountColor(selectedTxn.type) + "10",
              border: "1px solid " + amountColor(selectedTxn.type) + "30",
              borderRadius: 10, padding: "1.2rem",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: amountColor(selectedTxn.type) + "20",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {TXN_ICONS[selectedTxn.type]}
                </div>
                <div>
                  <div style={{ fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{selectedTxn.type}</div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: amountColor(selectedTxn.type), maxWidth: 220 }}>{selectedTxn.description}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: amountColor(selectedTxn.type), fontFamily: "monospace" }}>
                  {amountPrefix(selectedTxn.type)}₹{(selectedTxn.amount ?? 0).toFixed(2)}
                </div>
                <div style={{
                  fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", marginTop: 4,
                  color: selectedTxn.status === "completed" ? C.green : C.amber,
                }}>
                  ● {selectedTxn.status || "completed"}
                </div>
              </div>
            </div>
            {/* Details grid */}
            <div style={{ background: C.surface2, borderRadius: 10, overflow: "hidden", border: "1px solid " + C.border }}>
              <InfoRow label="Driver" value={driver?.name ?? "—"} />
              <InfoRow label="Phone" value={driver?.phone ?? "—"} />
              <InfoRow label="Type" value={selectedTxn.type?.toUpperCase()} />
              <InfoRow label="Payment Method" value={selectedTxn.paymentMethod?.toUpperCase() ?? "—"} />
              {selectedTxn.razorpayPaymentId && <InfoRow label="Payment ID (UPI Ref)" value={selectedTxn.razorpayPaymentId} />}
              {selectedTxn.razorpayOrderId   && <InfoRow label="Razorpay Order ID"   value={selectedTxn.razorpayOrderId} />}
              {selectedTxn.tripId            && <InfoRow label="Trip ID"              value={selectedTxn.tripId?.toString()} />}
              <InfoRow label="Date & Time" value={selectedTxn.createdAt ? new Date(selectedTxn.createdAt).toLocaleString("en-IN") : "—"} />
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── WithdrawalRequestsTab ────────────────────────────────────────────────────
function WithdrawalRequestsTab() {
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<any>(null);
  const [paymentReferenceId, setPaymentReferenceId] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchWithdrawals = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_BASE_URL}/api/withdrawal/admin/all`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.withdrawals)) {
        setWithdrawals(
          data.withdrawals.sort((a: any, b: any) => 
            new Date(b.initiatedAt).getTime() - new Date(a.initiatedAt).getTime()
          )
        );
      }
    } catch (err) {
      console.error("❌ Failed to fetch withdrawals:", err);
      toast.error("Failed to load withdrawal requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  useEffect(() => {
    if (!selectedWithdrawal) return;
    setPaymentReferenceId(selectedWithdrawal.paymentReferenceId || "");
    setPaymentNotes(selectedWithdrawal.manualPaymentNotes || "");
    setProofUrl(selectedWithdrawal.paymentProofImageUrl || "");
    setProofFile(null);
  }, [selectedWithdrawal]);

  const updateWithdrawalInList = (updated: any) => {
    setWithdrawals(prev => prev.map(w => (w._id === updated._id ? { ...w, ...updated } : w)));
    setSelectedWithdrawal(updated);
  };

  const uploadProof = async () => {
    if (!proofFile) {
      toast.error("Please choose a proof image first");
      return;
    }

    setProofUploading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const fd = new FormData();
      fd.append("proof", proofFile);

      const res = await fetch(`${API_BASE_URL}/api/withdrawal/admin/upload-proof`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Proof upload failed");
      }

      setProofUrl(data.paymentProofImageUrl || "");
      toast.success("Proof uploaded successfully");
    } catch (err: any) {
      console.error("❌ upload proof failed", err);
      toast.error(err?.message || "Failed to upload proof");
    } finally {
      setProofUploading(false);
    }
  };

  const markPaid = async () => {
    if (!selectedWithdrawal?._id) return;

    if (!paymentReferenceId.trim()) {
      toast.error("Reference ID is required");
      return;
    }
    if (!proofUrl.trim()) {
      toast.error("Payment proof is required. Upload image first.");
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_BASE_URL}/api/withdrawal/admin/${selectedWithdrawal._id}/mark-paid`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentReferenceId: paymentReferenceId.trim(),
          paymentProofImageUrl: proofUrl.trim(),
          notes: paymentNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to mark withdrawal as paid");
      }

      if (data.withdrawal) {
        updateWithdrawalInList(data.withdrawal);
      }
      toast.success("Withdrawal marked as paid");
    } catch (err: any) {
      console.error("❌ mark paid failed", err);
      toast.error(err?.message || "Failed to mark paid");
    } finally {
      setActionLoading(false);
    }
  };

  const rejectWithdrawal = async () => {
    if (!selectedWithdrawal?._id) return;
    const reason = (paymentNotes || "").trim();
    if (!reason) {
      toast.error("Enter rejection reason in notes before rejecting");
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_BASE_URL}/api/withdrawal/admin/${selectedWithdrawal._id}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason,
          notes: reason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to reject withdrawal");
      }

      if (data.withdrawal) {
        updateWithdrawalInList(data.withdrawal);
      }
      toast.success("Withdrawal rejected and refunded");
    } catch (err: any) {
      console.error("❌ reject failed", err);
      toast.error(err?.message || "Failed to reject withdrawal");
    } finally {
      setActionLoading(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "completed": return C.green;
      case "processing": return C.amber;
      case "failed": return C.red;
      case "pending": return C.cyan;
      default: return C.muted;
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 size={14} />;
      case "processing": return <Clock size={14} />;
      case "failed": return <AlertCircle size={14} />;
      case "pending": return <Clock size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const filtered = withdrawals
    .filter(w => filter === "all" || w.status === filter)
    .filter(w => {
      if (!search) return true;
      const s = search.toLowerCase();
      return w.upiId?.toLowerCase().includes(s) ||
             w.driverId?.toString().includes(s) ||
             w.razorpayPayoutId?.includes(s);
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "1rem",
      }}>
        {[
          { label: "Total Requests", value: withdrawals.length, color: C.primary },
          { label: "Completed", value: withdrawals.filter(w => w.status === "completed").length, color: C.green },
          { label: "Processing", value: withdrawals.filter(w => w.status === "processing").length, color: C.amber },
          { label: "Failed", value: withdrawals.filter(w => w.status === "failed").length, color: C.red },
        ].map((stat, i) => (
          <div key={i} style={{
            background: stat.color + "15",
            border: "1px solid " + stat.color + "30",
            borderRadius: 10, padding: "1rem",
          }}>
            <div style={{ fontSize: "0.7rem", color: C.muted, textTransform: "uppercase", fontWeight: 600, marginBottom: 4 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          {["all", "pending", "processing", "completed", "failed"].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: "6px 14px", borderRadius: 20, border: "1.5px solid",
              cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
              borderColor: filter === s ? statusColor(s) : C.border,
              background: filter === s ? statusColor(s) + "18" : "transparent",
              color: filter === s ? statusColor(s) : C.muted,
              textTransform: "capitalize",
            }}>
              {s}
            </button>
          ))}
          <input
            placeholder="Search UPI, driver ID, payout ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, minWidth: 200, padding: "6px 12px", borderRadius: 8,
              border: "1px solid " + C.border, background: C.surface2,
              color: "inherit", fontSize: "0.82rem", outline: "none",
            }}
          />
          <Btn size="sm" variant="ghost" icon={<RefreshCw size={13} />} onClick={fetchWithdrawals} loading={loading}>
            Refresh
          </Btn>
        </div>
      </Card>

      {/* List */}
      <Card>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center" }}><Spinner label="Loading withdrawals…" /></div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: C.muted }}>
            <Send size={32} style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
            <p>No withdrawal requests found</p>
            <p style={{ fontSize: "0.85rem", marginTop: 4 }}>Adjust filters or check back later</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {filtered.map((w: any) => (
              <div
                key={w._id}
                onClick={() => setSelectedWithdrawal(w)}
                style={{
                  padding: "1rem", borderRadius: 10,
                  border: "1px solid " + C.border,
                  background: C.surface2,
                  cursor: "pointer", display: "flex",
                  alignItems: "center", gap: 12,
                  transition: "all 0.15s",
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: statusColor(w.status) + "20",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: statusColor(w.status), flexShrink: 0,
                }}>
                  {statusIcon(w.status)}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                    ₹{(w.amount || 0).toFixed(2)} → {w.upiId}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: "0.72rem", color: C.muted }}>
                    <span>Driver: {w.driverId?.toString().slice(-6) || "—"}</span>
                    <span>·</span>
                    <span>{new Date(w.initiatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    {w.razorpayPayoutId && (
                      <>
                        <span>·</span>
                        <span style={{ fontFamily: "monospace" }}>{w.razorpayPayoutId}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <div style={{
                  padding: "4px 10px", borderRadius: 6,
                  background: statusColor(w.status) + "20",
                  color: statusColor(w.status),
                  fontSize: "0.7rem", fontWeight: 700,
                  textTransform: "uppercase",
                }}>
                  {w.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Withdrawal Detail Modal */}
      {selectedWithdrawal && (
        <Modal open={!!selectedWithdrawal} onClose={() => setSelectedWithdrawal(null)} title="Withdrawal Request Details" width={600}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            {/* Amount header */}
            <div style={{
              background: statusColor(selectedWithdrawal.status) + "10",
              border: "1px solid " + statusColor(selectedWithdrawal.status) + "30",
              borderRadius: 10, padding: "1.2rem",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                  Withdrawal Amount
                </div>
                <div style={{ fontSize: "2rem", fontWeight: 800, color: statusColor(selectedWithdrawal.status), fontFamily: "monospace" }}>
                  ₹{(selectedWithdrawal.amount || 0).toFixed(2)}
                </div>
              </div>
              <div style={{
                padding: "6px 14px", borderRadius: 8,
                background: statusColor(selectedWithdrawal.status) + "20",
                color: statusColor(selectedWithdrawal.status),
                fontSize: "0.75rem", fontWeight: 700,
                textTransform: "uppercase", textAlign: "center",
              }}>
                {selectedWithdrawal.status}
              </div>
            </div>

            {/* Details */}
            <div style={{ background: C.surface2, borderRadius: 10, overflow: "hidden", border: "1px solid " + C.border }}>
              <InfoRow label="UPI ID" value={selectedWithdrawal.upiId} />
              <InfoRow label="Driver ID" value={selectedWithdrawal.driverId?.toString()} />
              <InfoRow label="Initiated At" value={new Date(selectedWithdrawal.initiatedAt).toLocaleString("en-IN")} />
              {selectedWithdrawal.processedAt && (
                <InfoRow label="Processed At" value={new Date(selectedWithdrawal.processedAt).toLocaleString("en-IN")} />
              )}
              {selectedWithdrawal.razorpayPayoutId && (
                <InfoRow
                  label="Razorpay Payout ID"
                  value={<span style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{selectedWithdrawal.razorpayPayoutId}</span>}
                />
              )}
              {selectedWithdrawal.failureReason && (
                <InfoRow label="Failure Reason" value={selectedWithdrawal.failureReason} />
              )}
              {selectedWithdrawal.paymentReferenceId && (
                <InfoRow label="Payment Reference ID" value={selectedWithdrawal.paymentReferenceId} />
              )}
              {selectedWithdrawal.paymentProofImageUrl && (
                <InfoRow label="Payment Proof" value={<a href={selectedWithdrawal.paymentProofImageUrl} target="_blank" rel="noreferrer">View Proof</a>} />
              )}
              {selectedWithdrawal.processedByAdminEmail && (
                <InfoRow label="Processed By" value={selectedWithdrawal.processedByAdminEmail} />
              )}
              {selectedWithdrawal.processingMode && (
                <InfoRow label="Processing Mode" value={selectedWithdrawal.processingMode} />
              )}
              <InfoRow label="Balance Debited" value={selectedWithdrawal.balanceDebited ? "Yes" : "No"} />
            </div>

            {(selectedWithdrawal.status === "pending" || selectedWithdrawal.status === "processing") && (
              <div style={{ background: C.surface2, borderRadius: 10, border: "1px solid " + C.border, padding: "1rem" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Admin Manual Settlement
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    value={paymentReferenceId}
                    onChange={e => setPaymentReferenceId(e.target.value)}
                    placeholder="Enter transfer reference/UTR ID"
                    style={{
                      padding: "8px 10px", borderRadius: 8,
                      border: "1px solid " + C.border, background: C.bg,
                      color: "inherit", fontSize: "0.82rem", outline: "none",
                    }}
                  />

                  <textarea
                    value={paymentNotes}
                    onChange={e => setPaymentNotes(e.target.value)}
                    placeholder="Notes (required for reject, optional for mark paid)"
                    rows={3}
                    style={{
                      padding: "8px 10px", borderRadius: 8,
                      border: "1px solid " + C.border, background: C.bg,
                      color: "inherit", fontSize: "0.82rem", outline: "none", resize: "vertical",
                    }}
                  />

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProofFile(e.target.files?.[0] || null)}
                      style={{ fontSize: "0.78rem" }}
                    />
                    <Btn size="sm" variant="ghost" onClick={uploadProof} loading={proofUploading}>
                      Upload Proof
                    </Btn>
                    {proofUrl && (
                      <a href={proofUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.76rem" }}>
                        Proof Uploaded
                      </a>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                    <Btn size="sm" variant="ghost" onClick={rejectWithdrawal} loading={actionLoading}>
                      Reject + Refund
                    </Btn>
                    <Btn size="sm" variant="primary" onClick={markPaid} loading={actionLoading}>
                      Mark Paid
                    </Btn>
                  </div>
                </div>
              </div>
            )}

            {/* Webhook events */}
            {selectedWithdrawal.webhookEvents && selectedWithdrawal.webhookEvents.length > 0 && (
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: 8, color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Webhook Events
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {selectedWithdrawal.webhookEvents.map((evt: any, i: number) => (
                    <div key={i} style={{
                      padding: "0.6rem 0.8rem", borderRadius: 6,
                      background: C.surface2, border: "1px solid " + C.border,
                      fontSize: "0.75rem",
                    }}>
                      <div style={{ fontWeight: 600 }}>
                        {evt.event}
                      </div>
                      <div style={{ color: C.muted, fontSize: "0.7rem", marginTop: 2 }}>
                        {new Date(evt.receivedAt).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function DriverWalletManagement() {
  const { drivers, loading, error, refetch } = useDrivers();
  const { mutate, loading: acting } = useMutation();

  const [tab, setTab] = useState<"wallets" | "withdrawals">("wallets");
  const [statusF, setStatusF] = useState("all");
  const [q, setQ] = useState("");
  const [page,   setPage] = useState(1);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [walletData, setWalletData] = useState<Record<string, any>>({});
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [showAllTxnModal, setShowAllTxnModal] = useState(false);
  const [allTxnDriver, setAllTxnDriver] = useState<any>(null);

  // ── Fetch wallet data ──────────────────────────────────────────────────
  const fetchWallets = useCallback(async () => {
    try {
      setWalletLoading(true);
      setWalletError(null);

      const token = localStorage.getItem("adminToken");

      if (!token) {
        const errMsg = "No admin token found. Please log in again.";
        console.error("❌", errMsg);
        setWalletError(errMsg);
        return;
      }

      const url = `${API_BASE_URL}/api/wallet/admin/wallets?limit=500&sortBy=totalEarnings&order=desc`;
      console.log("🔄 Fetching wallets from:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
      });

      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Response error:", response.status, errorText);

        let errorMessage = `Server error (${response.status})`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          // not JSON
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("✅ Wallet API response:", {
        success: data.success,
        walletCount: data.wallets?.length,
        total: data.total,
        stats: data.stats,
      });

      if (!data.success) {
        throw new Error(data.message || "API returned success: false");
      }

      // ── Map wallets by driver ID ──────────────────────────────────
      const walletMap: Record<string, any> = {};

      if (Array.isArray(data.wallets)) {
        data.wallets.forEach((item: any) => {
          const pop = item.driverId;
          const driverIdStr = (
            typeof pop === "object" && pop !== null ? pop._id : pop
          )?.toString();
          if (!driverIdStr) return;

          walletMap[driverIdStr] = {
            availableBalance: item.availableBalance ?? 0,
            totalEarnings:    item.totalEarnings    ?? 0,
            totalCommission:  item.totalCommission  ?? 0,
            pendingAmount:    item.pendingAmount     ?? 0,
            transactions:     (item.transactions    ?? [])
                                .slice()
                                .sort((a: any, b: any) =>
                                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                                ),
            lastUpdated:      item.lastUpdated,
          };
        });
      }

      console.log("📊 Mapped wallets for", Object.keys(walletMap).length, "drivers");

      // Debug: check if driver IDs match
      if (drivers.length > 0 && Object.keys(walletMap).length > 0) {
        const sampleDriverId = drivers[0]?._id?.toString();
        const matchFound = walletMap[sampleDriverId] !== undefined;
        console.log(
          matchFound
            ? `✅ ID match confirmed: driver ${sampleDriverId} found in wallet map`
            : `⚠️ ID mismatch: driver ${sampleDriverId} NOT in wallet map. Wallet keys: ${Object.keys(walletMap).slice(0, 3).join(", ")}`
        );
      }

      setWalletData(walletMap);

    } catch (err: any) {
      console.error("❌ Wallet fetch error:", err);
      setWalletError(err.message || "Failed to load wallet data");
    } finally {
      setWalletLoading(false);
    }
  }, [drivers]);

  // Fetch wallets when drivers load
  useEffect(() => {
    if (drivers.length > 0) {
      console.log("👥 Drivers loaded:", drivers.length, "- fetching wallets...");
      fetchWallets();
    }
  }, [drivers, fetchWallets]);

  // ── Stats ──────────────────────────────────────────────────────────────
  const stats: WalletStats = useMemo(() => {
    let totalBalance = 0;
    let totalEarnings = 0;
    let pendingPayouts = 0;

    Object.values(walletData).forEach((w: any) => {
      totalBalance += w.availableBalance ?? 0;
      totalEarnings += w.totalEarnings ?? 0;
      pendingPayouts += w.pendingAmount ?? 0;
    });

    return {
      totalDrivers: drivers.length,
      totalBalance,
      totalEarnings,
      pendingPayouts,
    };
  }, [walletData, drivers]);

  // ── Filtering ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = drivers;

    if (statusF === "active") {
      result = result.filter((d: any) => d.isOnline);
    } else if (statusF === "inactive") {
      result = result.filter((d: any) => !d.isOnline);
    }

    if (q) {
      const ql = q.toLowerCase();
      result = result.filter((d: any) =>
        d.name?.toLowerCase().includes(ql) ||
        d.phone?.includes(ql) ||
        d._id?.includes(ql) ||
        d.email?.toLowerCase().includes(ql)
      );
    }

    return result;
  }, [drivers, statusF, q]);

  const pages = Math.ceil(filtered.length / PER);
  const paged = filtered.slice((page - 1) * PER, page * PER);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [statusF, q]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleViewTransactions = (driver: any) => {
    setAllTxnDriver(driver);
    setShowAllTxnModal(true);
  };

  const handleRefresh = () => {
    refetch();
    fetchWallets();
  };

  // ── Change 3: Export driver wallet as CSV ──────────────────────────────
  const exportDriverCSV = (drv: any, wal: any) => {
    const name = drv?.name ?? "driver";
    const txns = (wal?.transactions ?? [])
      .slice()
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Date","Type","Description","Amount (INR)","Method","Payment ID","Order ID","Trip ID","Status"].map(esc).join(","),
      ...txns.map((t: any) => [
        t.createdAt ? new Date(t.createdAt).toLocaleString("en-IN") : "",
        t.type ?? "",
        t.description ?? "",
        (t.type === "credit" ? "+" : "-") + (t.amount ?? 0).toFixed(2),
        t.paymentMethod ?? "",
        t.razorpayPaymentId ?? "",
        t.razorpayOrderId ?? "",
        t.tripId?.toString() ?? "",
        t.status ?? "",
      ].map(esc).join(",")),
      "", `"Total Earnings","Rs ${(wal?.totalEarnings ?? 0).toFixed(2)}"`,
      `"Commission Paid","Rs ${(wal?.totalCommission ?? 0).toFixed(2)}"`,
      `"Pending","Rs ${(wal?.pendingAmount ?? 0).toFixed(2)}"`,
      `"Balance","Rs ${(wal?.availableBalance ?? 0).toFixed(2)}"`,
    ];

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `wallet_${name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${txns.length} transactions for ${name}`);
  };

  // ── Render ─────────────────────────────────────────────────────────────
  if (error) return <PageError message={error} onRetry={handleRefresh} />;

  return (
    <div style={{ padding: "1.5rem", background: C.bg, minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: "1rem",
        }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: 0 }}>
              💰 Driver Wallet Management
            </h1>
            <p style={{ fontSize: "0.9rem", color: C.muted, margin: "0.5rem 0 0" }}>
              Monitor driver earnings, transactions, and withdrawal requests
            </p>
          </div>
          <Btn
            icon={<RefreshCw size={14} />}
            onClick={handleRefresh}
            loading={loading || walletLoading}
          >
            Refresh
          </Btn>
        </div>

        {/* Tab buttons */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {[
            { value: "wallets" as const, label: "📊 Wallets", icon: Wallet },
            { value: "withdrawals" as const, label: "💸 Withdrawals", icon: Send },
          ].map(t => (
            <button key={t.value} onClick={() => { setTab(t.value); setPage(1); }} style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid",
              cursor: "pointer", fontSize: "0.85rem", fontWeight: 600,
              borderColor: tab === t.value ? C.primary : C.border,
              background: tab === t.value ? C.primary + "15" : "transparent",
              color: tab === t.value ? C.primary : C.muted,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Debug Panel (development only) */}
      {import.meta.env.DEV && (
        <div style={{
          background: "#111827", border: "1px solid #374151", borderRadius: 8,
          padding: "0.75rem 1rem", marginBottom: "1rem",
          fontSize: "0.72rem", fontFamily: "monospace", color: "#9CA3AF",
        }}>
          <div>📊 Drivers: {drivers.length} | Wallets: {Object.keys(walletData).length}</div>
          <div>🔗 API: {API_BASE_URL}/api/wallet/admin/wallets</div>
          <div>🔑 Token: {localStorage.getItem("adminToken") ? `Present (${localStorage.getItem("adminToken")!.length} chars)` : "❌ MISSING"}</div>
          {walletError && <div style={{ color: "#EF4444" }}>❌ {walletError}</div>}
          {Object.keys(walletData).length > 0 && (
            <div style={{ color: "#10B981" }}>
              ✅ Wallet IDs: {Object.keys(walletData).slice(0, 3).join(", ")}
            </div>
          )}
          {drivers.length > 0 && (
            <div>
              👤 Driver IDs: {drivers.slice(0, 3).map((d: any) => d._id).join(", ")}
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {walletError && (
        <div style={{
          background: C.red + "15", border: "1px solid " + C.red + "33",
          borderRadius: 8, padding: "1rem", marginBottom: "1rem",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <AlertCircle size={18} style={{ color: C.red }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: C.red }}>Failed to load wallet data</div>
            <div style={{ fontSize: "0.8rem", color: C.muted }}>{walletError}</div>
          </div>
          <Btn size="sm" variant="ghost" onClick={fetchWallets}>Retry</Btn>
        </div>
      )}

      {/* WALLETS TAB */}
      {tab === "wallets" && (
        <>
          {/* Stats */}
          {!loading && <WalletStatsSection stats={stats} />}

          {/* Filters */}
          <Card style={{ marginBottom: "1.5rem" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 200px 1fr",
              gap: "1rem", alignItems: "flex-end",
            }}>
              <SearchBar
                placeholder="Search driver name, phone, or ID…"
                value={q}
                onChange={setQ}
              />
              <Sel
                label="Status"
                value={statusF}
                onChange={setStatusF}
                options={STATUS_TABS}
              />
              <div style={{ textAlign: "right", fontSize: "0.85rem", color: C.muted }}>
                <span style={{ fontWeight: 600 }}>{filtered.length}</span> drivers
                {Object.keys(walletData).length > 0 && (
                  <span>
                    {" "}· <span style={{ color: C.green }}>{Object.keys(walletData).length}</span> wallets
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Loading */}
          {(loading || walletLoading) && <Spinner label="Loading wallets…" />}

          {/* Driver Cards (Change 4: onExport passed to DriverWalletCard) */}
          {!loading && !walletLoading && paged.length > 0 ? (
            <div>
              {paged.map((driver: any) => {
                const driverIdStr = (driver._id || "").toString();
                const wallet = walletData[driverIdStr] || {
                  availableBalance: 0,
                  totalEarnings: 0,
                  totalCommission: 0,
                  pendingAmount: 0,
                  transactions: [],
                };

                return (
                  <DriverWalletCard
                    key={driver._id}
                    driver={driver}
                    wallet={wallet}
                    onViewTransactions={() => handleViewTransactions(driver)}
                    onExport={() => exportDriverCSV(driver, wallet)}
                  />
                );
              })}
              <Pagination
                page={page}
                pages={pages}
                total={filtered.length}
                perPage={PER}
                onChange={setPage}
              />
            </div>
          ) : (
            !loading && !walletLoading && (
              <Card style={{ padding: "2rem", textAlign: "center" }}>
                <Wallet size={48} style={{ color: C.muted, margin: "0 auto 1rem" }} />
                <p style={{ color: C.muted, fontSize: "1rem" }}>No drivers found</p>
                <p style={{ color: C.muted, fontSize: "0.8rem", marginTop: 4 }}>
                  {q ? "Try adjusting your search" : "No drivers registered yet"}
                </p>
              </Card>
            )
          )}

          {/* All Transactions Modal */}
          {allTxnDriver && (
            <AllTransactionsModal
              driver={allTxnDriver}
              open={showAllTxnModal}
              onClose={() => { setShowAllTxnModal(false); setAllTxnDriver(null); }}
            />
          )}

          {/* Transaction Detail Modal */}
          <TransactionDetailModal
            transaction={selectedTransaction}
            driverName={selectedDriver?.name ?? "Unknown"}
            open={showTxnModal}
            onClose={() => {
              setShowTxnModal(false);
              setSelectedTransaction(null);
            }}
          />
        </>
      )}

      {/* WITHDRAWALS TAB */}
      {tab === "withdrawals" && (
        <WithdrawalRequestsTab />
      )}
    </div>
  );
}