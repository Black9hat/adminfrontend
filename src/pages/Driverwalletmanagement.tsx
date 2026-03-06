// pages/DriverWalletManagement.tsx - COMPLETE FIXED VERSION
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  RefreshCw, Wallet, TrendingUp, AlertCircle, CheckCircle2,
  Clock, Eye, EyeOff, Download, Filter, ArrowUpRight, ArrowDownLeft,
  DollarSign, User, Calendar, CreditCard,
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

// ── DriverWalletCard ─────────────────────────────────────────────────────────
function DriverWalletCard({
  driver, wallet, onViewTransactions,
}: {
  driver: any; wallet: any; onViewTransactions: () => void;
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
            <SectionLabel>Recent Transactions</SectionLabel>
            {wallet.transactions && wallet.transactions.length > 0 ? (
              <div style={{
                marginTop: "0.8rem", display: "flex", flexDirection: "column", gap: "0.5rem",
              }}>
                {wallet.transactions.slice(0, 3).map((txn: any, idx: number) => (
                  <div key={txn._id || idx} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "0.7rem", background: C.surface2, borderRadius: 6, fontSize: "0.8rem",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {TXN_ICONS[txn.type] || <AlertCircle size={13} style={{ color: C.muted }} />}
                      <div>
                        <div style={{ fontWeight: 600 }}>{txn.description || "Transaction"}</div>
                        <div style={{ fontSize: "0.65rem", color: C.muted }}>
                          {new Date(txn.createdAt).toLocaleDateString("en-IN")}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontWeight: 700, color: TXN_COLORS[txn.type] || C.muted,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {txn.type === "debit" ? "-" : "+"} ₹{(txn.amount || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "1rem", textAlign: "center", color: C.muted, fontSize: "0.8rem" }}>
                No transactions yet
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Btn size="sm" variant="primary" icon={<Wallet size={12} />} onClick={onViewTransactions} full>
                View All Transactions
              </Btn>
            </div>
            <Btn size="sm" variant="ghost" icon={<Download size={12} />}
              onClick={() => toast.info("Download feature coming soon")}>
              Export
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

export default function DriverWalletManagement() {
  const { drivers, loading, error, refetch } = useDrivers();
  const { mutate, loading: acting } = useMutation();

  const [statusF, setStatusF] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [walletData, setWalletData] = useState<Record<string, any>>({});
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

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

      const url = `${API_BASE_URL}/api/wallet/admin/wallets`;
      console.log("🔄 Fetching wallets from:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
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
          const driverId = (item._id || item.driverId || "").toString();

          if (!driverId) return;

          // The API returns: { _id, driverId, wallet: { ... } }
          if (item.wallet) {
            walletMap[driverId] = {
              availableBalance: item.wallet.availableBalance ?? 0,
              totalEarnings: item.wallet.totalEarnings ?? 0,
              totalCommission: item.wallet.totalCommission ?? 0,
              pendingAmount: item.wallet.pendingAmount ?? 0,
              transactions: item.wallet.transactions ?? [],
              lastUpdated: item.wallet.lastUpdated,
            };
          } else {
            // Fallback: flat structure
            walletMap[driverId] = {
              availableBalance: item.availableBalance ?? 0,
              totalEarnings: item.totalEarnings ?? 0,
              totalCommission: item.totalCommission ?? 0,
              pendingAmount: item.pendingAmount ?? 0,
              transactions: item.transactions ?? [],
              lastUpdated: item.lastUpdated,
            };
          }
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
    setSelectedDriver(driver);
    toast.info(`Viewing transactions for ${driver.name}`);
  };

  const handleRefresh = () => {
    refetch();
    fetchWallets();
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
              Monitor driver earnings, transactions, and wallet balance
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

      {/* Driver Cards */}
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
    </div>
  );
}