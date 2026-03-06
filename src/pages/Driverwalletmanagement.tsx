// ============================================================
// DriverWalletManagement.tsx — Simplified Version
// ============================================================
// ✅ Uses useWallet() hook from hooks/index.ts
// ✅ Follows your exact pattern (useTrips, useDrivers pattern)
// ✅ No separate auth logic — uses axiosInstance from hooks
// ✅ Matches your codebase style and structure
// ============================================================

import React, { useState, useMemo, useEffect } from "react";
import {
  RefreshCw, Wallet, TrendingUp, AlertCircle,
  Clock, Eye, EyeOff, ArrowUpRight, ArrowDownLeft,
  DollarSign, User, ChevronDown, ChevronUp, ShieldCheck,
  Tag, History, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useDrivers, useWallet, type WalletData, type Txn } from "../hooks/index";
import {
  Btn, Card, Modal, Spinner, PageError,
  SearchBar, Sel, InfoRow, SectionLabel,
  C, Pagination,
} from "../components/ui";
import { toast } from "react-toastify";

const PER          = 15;
const TXN_PER_PAGE = 10;

// ── Display config per transaction type ───────────────────────────────────
const TXN_CFG: Record<Txn["type"], { label: string; color: string; sign: "+" | "−" | ""; icon: React.ReactNode }> = {
  credit: {
    label: "Trip Earning", color: "#10B981", sign: "+",
    icon: <ArrowDownLeft size={13} />,
  },
  debit: {
    label: "Debit", color: "#EF4444", sign: "−",
    icon: <ArrowUpRight size={13} />,
  },
  commission: {
    label: "Commission Charged", color: "#F59E0B", sign: "−",
    icon: <Tag size={13} />,
  },
  commission_payment: {
    label: "Commission Paid", color: "#3B82F6", sign: "−",
    icon: <ShieldCheck size={13} />,
  },
};

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  completed: { label: "Completed", color: "#10B981" },
  pending:   { label: "Pending",   color: "#F59E0B" },
  paid:      { label: "Paid",      color: "#3B82F6" },
  failed:    { label: "Failed",    color: "#EF4444" },
};

const FILTER_OPTS = [
  { value: "",                   label: "All Types" },
  { value: "credit",             label: "Trip Earnings" },
  { value: "commission",         label: "Commission Charged" },
  { value: "commission_payment", label: "Commission Paid (Verified)" },
  { value: "debit",              label: "Debits" },
];

const DRIVER_STATUS_OPTS = [
  { value: "all",      label: "All Drivers" },
  { value: "active",   label: "Online" },
  { value: "inactive", label: "Offline" },
];

// ── Format helpers ───────────────────────────────────────────────────────
const inr = (n: number) =>
  `₹${(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDt = (d?: string) =>
  d ? new Date(d).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }) : "—";

// ══════════════════════════════════════════════════════════════════
// TRANSACTION ROW
// ══════════════════════════════════════════════════════════════════
function TxnRow({ txn, onClick }: { txn: Txn; onClick: () => void }) {
  const cfg = TXN_CFG[txn.type] ?? TXN_CFG.credit;
  const stCfg = STATUS_CFG[txn.status] ?? STATUS_CFG.pending;

  return (
    <div
      onClick={onClick}
      style={{
        display: "grid", gridTemplateColumns: "30px 1fr auto",
        gap: "0.65rem", alignItems: "center",
        padding: "0.65rem 0.9rem",
        borderBottom: `1px solid ${C.border}`,
        cursor: "pointer", transition: "background 0.12s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = C.surface2 + "cc")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{
        width: 30, height: 30, borderRadius: "50%",
        background: cfg.color + "18",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: cfg.color, flexShrink: 0,
      }}>
        {cfg.icon}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: "0.8rem", color: cfg.color }}>
            {cfg.label}
          </span>
          {txn.type === "commission_payment" && txn.verifiedAt && (
            <span style={{
              fontSize: "0.55rem", fontWeight: 700, padding: "1px 5px",
              borderRadius: 8, background: "#10B98120", color: "#10B981",
              border: "1px solid #10B98140", letterSpacing: "0.04em",
            }}>✓ VERIFIED</span>
          )}
          <span style={{
            fontSize: "0.58rem", padding: "1px 5px", borderRadius: 8,
            background: stCfg.color + "18", color: stCfg.color,
            border: `1px solid ${stCfg.color}28`,
          }}>
            {stCfg.label}
          </span>
        </div>
        <div style={{ fontSize: "0.67rem", color: C.muted, marginTop: 1, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span>{fmtDt(txn.createdAt)}</span>
          {txn.tripId && <span style={{ color: C.cyan }}>Trip #{txn.tripId.slice(-6)}</span>}
          {txn.razorpayPaymentId && (
            <span style={{ fontFamily: "monospace", color: "#3B82F6" }}>
              {txn.razorpayPaymentId.slice(-12)}
            </span>
          )}
        </div>
      </div>

      <div style={{
        fontFamily: "'JetBrains Mono', 'Courier New', monospace",
        fontWeight: 800, fontSize: "0.88rem", flexShrink: 0,
        color: txn.type === "credit"
          ? "#10B981"
          : txn.type === "commission_payment"
          ? "#3B82F6"
          : "#EF4444",
      }}>
        {TXN_CFG[txn.type]?.sign}{inr(txn.amount)}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// TRANSACTION DETAIL MODAL
// ══════════════════════════════════════════════════════════════════
function TxnDetailModal({ txn, driverName, open, onClose }: {
  txn: Txn | null; driverName: string; open: boolean; onClose: () => void;
}) {
  if (!txn) return null;
  const cfg   = TXN_CFG[txn.type] ?? TXN_CFG.credit;
  const stCfg = STATUS_CFG[txn.status] ?? STATUS_CFG.pending;

  return (
    <Modal open={open} onClose={onClose} title="Transaction Details" width={500}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
        <div style={{
          background: cfg.color + "10",
          border: `1px solid ${cfg.color}28`,
          borderRadius: 10, padding: "1.1rem",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: cfg.color + "22",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: cfg.color,
            }}>
              {cfg.icon}
            </div>
            <div>
              <div style={{ fontSize: "0.6rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {cfg.label}
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, marginTop: 1 }}>
                {txn.description}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "1.35rem", fontWeight: 900, color: cfg.color,
            }}>
              {cfg.sign}{inr(txn.amount)}
            </div>
            <div style={{
              marginTop: 4, fontSize: "0.65rem", fontWeight: 700,
              color: stCfg.color,
            }}>
              {stCfg.label}
            </div>
          </div>
        </div>

        <div style={{
          background: C.surface2, borderRadius: 8, overflow: "hidden",
          border: `1px solid ${C.border}`,
        }}>
          <InfoRow label="Driver"  value={driverName} />
          <InfoRow label="Type"    value={cfg.label} />
          <InfoRow label="Amount"  value={inr(txn.amount)} />
          <InfoRow label="Status"  value={<span style={{ color: stCfg.color, fontWeight: 600 }}>{stCfg.label}</span>} />
          {txn.tripId           && <InfoRow label="Trip ID"          value={txn.tripId} />}
          {txn.paymentMethod    && <InfoRow label="Method"           value={txn.paymentMethod.toUpperCase()} />}
          {txn.razorpayPaymentId && (
            <InfoRow label="Razorpay Payment ID" value={
              <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#3B82F6" }}>
                {txn.razorpayPaymentId}
              </span>
            } />
          )}
          {txn.razorpayOrderId  && (
            <InfoRow label="Order ID" value={
              <span style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>
                {txn.razorpayOrderId}
              </span>
            } />
          )}
          {txn.verifiedAt && (
            <InfoRow label="Verified At" value={
              <span style={{ color: "#10B981", fontWeight: 600 }}>{fmtDt(txn.verifiedAt)}</span>
            } />
          )}
          {txn.paidAt           && <InfoRow label="Paid At"          value={fmtDt(txn.paidAt)} />}
          <InfoRow label="Created At" value={fmtDt(txn.createdAt)} />
        </div>

        {txn.type === "commission_payment" && (
          <div style={{
            background: "#3B82F60c", border: "1px solid #3B82F628",
            borderRadius: 8, padding: "0.75rem",
            display: "flex", gap: 8, alignItems: "flex-start",
          }}>
            <ShieldCheck size={15} color="#3B82F6" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: "0.72rem", color: C.muted, lineHeight: 1.55 }}>
              {txn.verifiedAt
                ? <>This payment was <strong style={{ color: "#3B82F6" }}>cryptographically verified</strong> via Razorpay HMAC-SHA256. Cannot be duplicated or fraudulent.</>
                : "Recorded via Razorpay webhook. Verification pending."
              }
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════
// DRIVER FULL HISTORY MODAL
// ══════════════════════════════════════════════════════════════════
function DriverHistoryModal({ driver, wallet, open, onClose }: {
  driver: any; wallet: WalletData | null; open: boolean; onClose: () => void;
}) {
  const [typeF,      setTypeF]      = useState("");
  const [txnPage,    setTxnPage]    = useState(1);
  const [selTxn,     setSelTxn]     = useState<Txn | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => { if (open) { setTypeF(""); setTxnPage(1); } }, [open]);

  const allTxns = useMemo<Txn[]>(() => {
    let t: Txn[] = wallet?.transactions ?? [];
    if (typeF) t = t.filter(x => x.type === typeF);
    return [...t].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [wallet, typeF]);

  const pages     = Math.ceil(allTxns.length / TXN_PER_PAGE) || 1;
  const pagedTxns = allTxns.slice((txnPage - 1) * TXN_PER_PAGE, txnPage * TXN_PER_PAGE);

  const verifiedPayments = useMemo<Txn[]>(() =>
    (wallet?.transactions ?? [])
      .filter(t => t.type === "commission_payment" && t.status === "completed")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [wallet]
  );

  const paidCommTotal = verifiedPayments.reduce((s, t) => s + t.amount, 0);

  if (!driver || !wallet) return null;

  return (
    <>
      <Modal open={open} onClose={onClose} title={`Full History — ${driver.name}`} width={740}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.6rem" }}>
            {[
              { label: "Total Earnings",      value: wallet.totalEarnings,    color: "#10B981" },
              { label: "Commission Paid ✓",   value: paidCommTotal,           color: "#3B82F6" },
              { label: "Pending Commission",  value: wallet.pendingAmount,    color: "#F59E0B" },
              { label: "Available Balance",   value: wallet.availableBalance, color: C.primary },
            ].map((s, i) => (
              <div key={i} style={{
                background: s.color + "0e",
                border: `1px solid ${s.color}22`,
                borderRadius: 8, padding: "0.7rem",
              }}>
                <div style={{ fontSize: "0.58rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {s.label}
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.95rem", fontWeight: 800, color: s.color, marginTop: 3,
                }}>
                  {inr(s.value)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 220 }}>
              <Sel
                label="Filter by type"
                value={typeF}
                onChange={v => { setTypeF(v); setTxnPage(1); }}
                options={FILTER_OPTS}
              />
            </div>
            <div style={{ fontSize: "0.78rem", color: C.muted }}>
              {allTxns.length} transactions
            </div>
          </div>

          <div style={{
            border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden",
            maxHeight: 380, overflowY: "auto",
          }}>
            {pagedTxns.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: C.muted, fontSize: "0.82rem" }}>
                No transactions
              </div>
            ) : (
              pagedTxns.map((t, i) => (
                <TxnRow
                  key={t._id ?? i}
                  txn={t}
                  onClick={() => { setSelTxn(t); setShowDetail(true); }}
                />
              ))
            )}
          </div>

          {pages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <button
                onClick={() => setTxnPage(p => Math.max(1, p - 1))}
                disabled={txnPage === 1}
                style={{
                  background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
                  padding: "3px 9px", cursor: txnPage === 1 ? "not-allowed" : "pointer",
                  color: txnPage === 1 ? C.muted : C.text, display: "flex",
                }}
              ><ChevronLeft size={14} /></button>
              <span style={{ fontSize: "0.78rem", color: C.muted }}>
                {txnPage} / {pages}
              </span>
              <button
                onClick={() => setTxnPage(p => Math.min(pages, p + 1))}
                disabled={txnPage === pages}
                style={{
                  background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
                  padding: "3px 9px", cursor: txnPage === pages ? "not-allowed" : "pointer",
                  color: txnPage === pages ? C.muted : C.text, display: "flex",
                }}
              ><ChevronRight size={14} /></button>
            </div>
          )}

          {verifiedPayments.length > 0 && (
            <div style={{
              background: "#3B82F607",
              border: "1px solid #3B82F622",
              borderRadius: 8, padding: "0.9rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: "0.7rem" }}>
                <ShieldCheck size={14} color="#3B82F6" />
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#3B82F6" }}>
                  Verified Razorpay Commission Payments ({verifiedPayments.length})
                </span>
                <span style={{
                  marginLeft: "auto",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 800, fontSize: "0.82rem", color: "#3B82F6",
                }}>
                  Total: {inr(paidCommTotal)}
                </span>
              </div>
              {verifiedPayments.map((t, i) => (
                <div
                  key={t._id ?? i}
                  onClick={() => { setSelTxn(t); setShowDetail(true); }}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    padding: "0.55rem 0",
                    borderTop: i > 0 ? `1px solid ${C.border}` : "none",
                    cursor: "pointer",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600 }}>{fmtDt(t.createdAt)}</div>
                    {t.razorpayPaymentId && (
                      <div style={{ fontFamily: "monospace", color: "#3B82F6", fontSize: "0.68rem" }}>
                        {t.razorpayPaymentId}
                      </div>
                    )}
                    {t.verifiedAt && (
                      <div style={{ fontSize: "0.65rem", color: "#10B981", display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                        <ShieldCheck size={9} /> Verified {fmtDt(t.verifiedAt)}
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 800, color: "#3B82F6", fontSize: "0.88rem",
                  }}>
                    {inr(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {verifiedPayments.length === 0 && wallet.pendingAmount > 0 && (
            <div style={{
              background: "#F59E0B08", border: "1px solid #F59E0B22",
              borderRadius: 8, padding: "0.8rem",
              display: "flex", alignItems: "center", gap: 8,
              fontSize: "0.75rem", color: C.muted,
            }}>
              <AlertCircle size={14} color="#F59E0B" />
              Commission of <strong style={{ color: "#F59E0B" }}>{inr(wallet.pendingAmount)}</strong> is pending.
            </div>
          )}
        </div>
      </Modal>

      <TxnDetailModal
        txn={selTxn}
        driverName={driver?.name ?? "Unknown"}
        open={showDetail}
        onClose={() => { setShowDetail(false); setSelTxn(null); }}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// DRIVER WALLET CARD
// ══════════════════════════════════════════════════════════════════
function DriverWalletCard({ driver, wallet, onViewHistory }: {
  driver: any; wallet: WalletData; onViewHistory: () => void;
}) {
  const [expanded, setExpanded]  = useState(false);
  const [showBal, setShowBal]    = useState(false);
  const [selTxn,  setSelTxn]     = useState<Txn | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const recentTxns = useMemo<Txn[]>(() =>
    [...(wallet.transactions ?? [])]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
    [wallet]
  );

  const paidComm = useMemo(() =>
    (wallet.transactions ?? [])
      .filter(t => t.type === "commission_payment" && t.status === "completed")
      .reduce((s, t) => s + t.amount, 0),
    [wallet]
  );

  return (
    <>
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 10, marginBottom: "0.65rem", overflow: "hidden",
      }}>
        <div
          onClick={() => setExpanded(!expanded)}
          style={{
            padding: "0.85rem 1rem", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 12,
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
            background: (driver.isOnline ? "#10B981" : C.muted) + "1a",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, color: driver.isOnline ? "#10B981" : C.muted,
          }}>
            {driver.name?.charAt(0)?.toUpperCase() ?? "?"}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>
              {driver.name ?? "Unknown"}
              {driver.isOnline && (
                <span style={{
                  marginLeft: 6, fontSize: "0.55rem", padding: "1px 5px",
                  background: "#10B98118", color: "#10B981", borderRadius: 8,
                }}>ONLINE</span>
              )}
            </div>
            <div style={{ fontSize: "0.62rem", color: C.muted }}>
              {driver.phone ?? "N/A"} · {driver.vehicleType ?? "—"}
            </div>
          </div>

          {wallet.pendingAmount >= 1 && (
            <div style={{
              padding: "3px 8px", borderRadius: 20, fontSize: "0.65rem",
              background: "#F59E0b18", color: "#F59E0B", fontWeight: 700,
            }}>
              ⚠ {inr(wallet.pendingAmount)} due
            </div>
          )}

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.58rem", color: C.muted, textTransform: "uppercase" }}>
              Balance
            </div>
            <div style={{
              fontSize: "0.95rem", fontWeight: 800, color: "#10B981",
              fontFamily: "'JetBrains Mono', monospace",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              {showBal ? inr(wallet.availableBalance) : "••••••"}
              <button
                onClick={e => { e.stopPropagation(); setShowBal(!showBal); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
              >
                {showBal ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
            </div>
          </div>

          <div style={{ color: C.muted }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>

        {expanded && (
          <div style={{ padding: "0.9rem 1rem", borderTop: `1px solid ${C.border}`, background: C.surface2 }}>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem", marginBottom: "0.9rem" }}>
              {[
                { label: "Total Earnings",     value: wallet.totalEarnings,    color: "#10B981" },
                { label: "Commission Paid ✓",  value: paidComm,                color: "#3B82F6" },
                { label: "Pending Commission", value: wallet.pendingAmount,    color: "#F59E0B" },
                { label: "Available Balance",  value: wallet.availableBalance, color: C.primary },
              ].map((s, i) => (
                <div key={i} style={{
                  background: s.color + "0d",
                  border: `1px solid ${s.color}20`,
                  borderRadius: 7, padding: "0.6rem 0.7rem",
                }}>
                  <div style={{ fontSize: "0.58rem", color: C.muted, textTransform: "uppercase" }}>
                    {s.label}
                  </div>
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: "0.88rem", fontWeight: 800, color: s.color, marginTop: 3,
                  }}>
                    {inr(s.value)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: "0.8rem" }}>
              <div style={{
                fontSize: "0.6rem", color: C.muted, textTransform: "uppercase",
                fontWeight: 600, marginBottom: "0.4rem",
              }}>
                Recent Transactions
              </div>
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 7 }}>
                {recentTxns.length === 0 ? (
                  <div style={{ padding: "1rem", textAlign: "center", color: C.muted, fontSize: "0.78rem" }}>
                    No transactions
                  </div>
                ) : (
                  recentTxns.map((t, i) => (
                    <TxnRow
                      key={t._id ?? i} txn={t}
                      onClick={() => { setSelTxn(t); setShowDetail(true); }}
                    />
                  ))
                )}
              </div>
            </div>

            <Btn size="sm" variant="primary" full icon={<History size={12} />} onClick={onViewHistory}>
              Full History ({wallet.transactions?.length ?? 0})
            </Btn>
          </div>
        )}
      </div>

      <TxnDetailModal
        txn={selTxn}
        driverName={driver?.name ?? "Unknown"}
        open={showDetail}
        onClose={() => { setShowDetail(false); setSelTxn(null); }}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function DriverWalletManagement() {
  const { drivers, loading, error, refetch } = useDrivers();
  const { walletData, loading: walletLoading, error: walletError, refetch: fetchWallets } = useWallet();

  const [statusF, setStatusF] = useState("all");
  const [q,       setQ]       = useState("");
  const [page,    setPage]    = useState(1);
  const [histDriver, setHistDriver] = useState<any>(null);
  const [showHist, setShowHist] = useState(false);

  const filtered = useMemo(() => {
    let r = drivers as any[];
    if (statusF === "active")   r = r.filter(d => d.isOnline);
    if (statusF === "inactive") r = r.filter(d => !d.isOnline);
    if (q) {
      const ql = q.toLowerCase();
      r = r.filter(d =>
        d.name?.toLowerCase().includes(ql) || d.phone?.includes(ql) ||
        d._id?.includes(ql) || d.email?.toLowerCase().includes(ql)
      );
    }
    return r;
  }, [drivers, statusF, q]);

  const pages = Math.ceil(filtered.length / PER);
  const paged = filtered.slice((page - 1) * PER, page * PER);
  useEffect(() => { setPage(1); }, [statusF, q]);

  if (error) return <PageError message={error} onRetry={() => { refetch(); fetchWallets(); }} />;

  const emptyWallet: WalletData = {
    availableBalance: 0, totalEarnings: 0, totalCommission: 0,
    paidCommission: 0, pendingAmount: 0, transactions: [],
  };

  const stats = useMemo(() => {
    let bal = 0, earn = 0, pend = 0, paid = 0;
    Object.values(walletData).forEach(w => {
      bal  += w.availableBalance ?? 0;
      earn += w.totalEarnings    ?? 0;
      pend += w.pendingAmount    ?? 0;
      paid += (w.transactions ?? [])
        .filter(t => t.type === "commission_payment" && t.status === "completed")
        .reduce((s, t) => s + t.amount, 0);
    });
    return { bal, earn, pend, paid };
  }, [walletData]);

  return (
    <div style={{ padding: "1.5rem", background: C.bg, minHeight: "100vh" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.4rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.55rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
            <Wallet size={20} /> Driver Wallet Management
          </h1>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: C.muted }}>
            Earnings, commissions, and verified Razorpay payments
          </p>
        </div>
        <Btn
          icon={<RefreshCw size={13} />}
          onClick={() => { refetch(); fetchWallets(); }}
          loading={loading || walletLoading}
        >
          Refresh
        </Btn>
      </div>

      {!loading && !walletLoading && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "0.8rem", marginBottom: "1.4rem",
        }}>
          {[
            { icon: <User size={15} />,        label: "Drivers",            value: String(drivers.length),     color: C.primary },
            { icon: <DollarSign size={15} />,  label: "Total Balance",      value: inr(stats.bal),              color: "#10B981" },
            { icon: <TrendingUp size={15} />,  label: "Total Earnings",     value: inr(stats.earn),             color: "#06B6D4" },
            { icon: <Clock size={15} />,       label: "Pending Commission", value: inr(stats.pend),             color: "#F59E0B" },
            { icon: <ShieldCheck size={15} />, label: "Commission Paid ✓",  value: inr(stats.paid),             color: "#3B82F6" },
          ].map((x, i) => (
            <div key={i} style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 9, padding: "0.85rem 1rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ color: x.color }}>{x.icon}</span>
                <span style={{ fontSize: "0.62rem", color: C.muted, textTransform: "uppercase" }}>
                  {x.label}
                </span>
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "1.05rem", fontWeight: 800, color: x.color,
              }}>
                {x.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {walletError && (
        <div style={{
          background: "#EF444412", border: "1px solid #EF444428",
          borderRadius: 8, padding: "0.85rem 1rem", marginBottom: "1rem",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <AlertCircle size={15} color="#EF4444" />
          <div style={{ flex: 1, fontSize: "0.82rem" }}>
            <span style={{ fontWeight: 700, color: "#EF4444" }}>Wallet error: </span>
            <span style={{ color: C.muted }}>{walletError}</span>
          </div>
          <Btn size="sm" variant="ghost" onClick={fetchWallets}>Retry</Btn>
        </div>
      )}

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 180px auto",
        gap: "0.75rem", alignItems: "flex-end",
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: "0.85rem", marginBottom: "1rem",
      }}>
        <SearchBar placeholder="Search name, phone, or ID…" value={q} onChange={setQ} />
        <Sel label="Status" value={statusF} onChange={setStatusF} options={DRIVER_STATUS_OPTS} />
        <div style={{ fontSize: "0.78rem", color: C.muted, paddingBottom: 2 }}>
          <strong>{filtered.length}</strong> drivers
        </div>
      </div>

      {(loading || walletLoading) && <Spinner label="Loading wallet data…" />}

      {!loading && !walletLoading && (
        paged.length > 0 ? (
          <>
            {paged.map((driver: any) => {
              const id = (driver._id ?? "").toString();
              const wallet = walletData[id] ?? emptyWallet;
              return (
                <DriverWalletCard
                  key={driver._id}
                  driver={driver}
                  wallet={wallet}
                  onViewHistory={() => { setHistDriver(driver); setShowHist(true); }}
                />
              );
            })}
            <Pagination page={page} pages={pages} total={filtered.length} perPage={PER} onChange={setPage} />
          </>
        ) : (
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: "3rem", textAlign: "center",
          }}>
            <Wallet size={38} color={C.muted} style={{ marginBottom: 10 }} />
            <p style={{ color: C.muted, margin: 0 }}>No drivers found</p>
          </div>
        )
      )}

      <DriverHistoryModal
        driver={histDriver}
        wallet={histDriver ? (walletData[(histDriver._id ?? "").toString()] ?? emptyWallet) : null}
        open={showHist}
        onClose={() => { setShowHist(false); setHistDriver(null); }}
      />
    </div>
  );
}