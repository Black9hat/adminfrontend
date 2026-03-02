import React, { useState, useMemo, useEffect } from "react";
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

// ── Transaction Type Icons ────────────────────────────────────────────────────
const TXN_ICONS: Record<string, React.ReactNode> = {
  credit:     <ArrowDownLeft size={13} style={{color: C.green}} />,
  debit:      <ArrowUpRight size={13} style={{color: C.red}} />,
  commission: <AlertCircle size={13} style={{color: C.amber}} />,
};

const TXN_COLORS: Record<string, string> = {
  credit:     C.green,
  debit:      C.red,
  commission: C.amber,
};

// ── Tab configuration ────────────────────────────────────────────────────────
const STATUS_TABS = [
  { value: "all",       label: "All Drivers" },
  { value: "active",    label: "Active" },
  { value: "inactive",  label: "Inactive" },
];

const TXN_FILTER_TABS = [
  { value: "all",       label: "All" },
  { value: "credit",    label: "Earnings" },
  { value: "debit",     label: "Payouts" },
  { value: "commission",label: "Commission" },
];

// ── Stat Card Component ─────────────────────────────────────────────────────
interface WalletStats {
  totalDrivers: number;
  totalBalance: number;
  totalEarnings: number;
  pendingPayouts: number;
}

function WalletStatsSection({ stats }: { stats: WalletStats }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "1rem",
      marginBottom: "1.5rem"
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
        value={`₹${stats.totalBalance.toLocaleString('en-IN', {maximumFractionDigits: 2})}`}
        color={C.green}
      />
      <StatCard
        icon={<TrendingUp size={18} /> as any}
        label="Total Earnings"
        value={`₹${stats.totalEarnings.toLocaleString('en-IN', {maximumFractionDigits: 2})}`}
        color={C.cyan}
      />
      <StatCard
        icon={<Clock size={18} /> as any}
        label="Pending Payouts"
        value={`₹${stats.pendingPayouts.toLocaleString('en-IN', {maximumFractionDigits: 2})}`}
        color={C.amber}
      />
    </div>
  );
}

// ── Transaction Detail Modal ───────────────────────────────────────────────
function TransactionDetailModal({ 
  transaction, 
  driverName,
  open, 
  onClose 
}: {
  transaction: any;
  driverName: string;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Transaction Details" width={480}>
      {transaction && (
        <div style={{display: "flex", flexDirection: "column", gap: "0.9rem"}}>
          
          {/* Header with type and amount */}
          <div style={{
            background: TXN_COLORS[transaction.type] + "12",
            border: "1px solid " + TXN_COLORS[transaction.type] + "22",
            borderRadius: 8,
            padding: "1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <div style={{display: "flex", alignItems: "center", gap: 8}}>
              {TXN_ICONS[transaction.type]}
              <div>
                <div style={{fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em"}}>
                  {transaction.type}
                </div>
                <div style={{fontSize: "0.9rem", color: TXN_COLORS[transaction.type], fontWeight: 700}}>
                  {transaction.description}
                </div>
              </div>
            </div>
            <div style={{textAlign: "right"}}>
              <div style={{
                fontSize: "1.3rem",
                fontWeight: 800,
                color: transaction.type === 'debit' ? C.red : C.green,
                fontFamily: "'JetBrains Mono', monospace"
              }}>
                {transaction.type === 'debit' ? '-' : '+'} ₹{transaction.amount.toFixed(2)}
              </div>
              <div style={{marginTop: 4}}>
                <Badge 
                  status={transaction.status}
                />
              </div>
            </div>
          </div>

          {/* Info rows */}
          <div style={{
            background: C.surface2,
            borderRadius: 8,
            overflow: "hidden",
            border: "1px solid " + C.border
          }}>
            <InfoRow label="Driver" value={driverName} />
            <InfoRow label="Type" value={transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} />
            <InfoRow label="Amount" value={`₹${transaction.amount.toFixed(2)}`} />
            <InfoRow label="Status" value={transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)} />
            {transaction.tripId && <InfoRow label="Trip ID" value={transaction.tripId} />}
            {transaction.razorpayPaymentId && (
              <InfoRow label="Payment ID" value={transaction.razorpayPaymentId} />
            )}
            {transaction.paymentMethod && (
              <InfoRow label="Method" value={transaction.paymentMethod.toUpperCase()} />
            )}
            <InfoRow 
              label="Date" 
              value={new Date(transaction.createdAt).toLocaleString("en-IN")} 
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Driver Wallet Card (Expandable) ──────────────────────────────────────────
function DriverWalletCard({
  driver,
  wallet,
  onViewTransactions,
}: {
  driver: any;
  wallet: any;
  onViewTransactions: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showBalance, setShowBalance] = useState(false);

  return (
    <Card style={{marginBottom: "1rem", overflow: "hidden"}}>
      {/* Header - Always visible */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "1rem",
          background: C.surface2,
          border: "1px solid " + C.border,
          borderRadius: 8,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          transition: "all 0.2s"
        }}
      >
        <div style={{display: "flex", alignItems: "center", gap: 12, flex: 1}}>
          {/* Driver Avatar */}
          <div style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: C.primary + "22",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
            fontWeight: 700,
            color: C.primary,
          }}>
            {driver.name?.charAt(0).toUpperCase()}
          </div>

          {/* Driver info */}
          <div style={{flex: 1}}>
            <div style={{fontWeight: 700, fontSize: "0.95rem"}}>
              {driver.name}
            </div>
            <div style={{fontSize: "0.65rem", color: C.muted}}>
              {driver.phone} · {driver.vehicleType ?? "Unknown"}
            </div>
          </div>

          {/* Balance at a glance */}
          <div style={{
            textAlign: "right",
            paddingRight: "0.5rem",
          }}>
            <div style={{fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em"}}>
              Available Balance
            </div>
            <div style={{
              fontSize: "1.1rem",
              fontWeight: 800,
              color: C.green,
              fontFamily: "'JetBrains Mono', monospace",
              display: "flex",
              alignItems: "center",
              gap: 6,
              justifyContent: "flex-end",
            }}>
              {showBalance ? `₹${wallet.availableBalance?.toFixed(2) ?? '0.00'}` : '••••••'}
              <button
                onClick={(e) => {e.stopPropagation(); setShowBalance(!showBalance);}}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: C.muted,
                  padding: 4,
                }}
              >
                {showBalance ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
          </div>

          {/* Expand icon */}
          <div style={{color: C.muted, display: "flex"}}>
            {expanded ? "▲" : "▼"}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{padding: "1.5rem", borderTop: "1px solid " + C.border}}>
          
          {/* Quick stats grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}>
            <div style={{
              background: C.greenDim ?? (C.green + "12"),
              border: "1px solid " + (C.green + "22"),
              borderRadius: 7,
              padding: "0.9rem",
            }}>
              <div style={{fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em"}}>
                Total Earnings
              </div>
              <div style={{
                fontSize: "1.3rem",
                fontWeight: 800,
                color: C.green,
                fontFamily: "'JetBrains Mono', monospace",
                marginTop: 4,
              }}>
                ₹{wallet.totalEarnings?.toFixed(2) ?? '0.00'}
              </div>
            </div>

            <div style={{
              background: C.amberDim ?? (C.amber + "12"),
              border: "1px solid " + (C.amber + "22"),
              borderRadius: 7,
              padding: "0.9rem",
            }}>
              <div style={{fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em"}}>
                Total Commission
              </div>
              <div style={{
                fontSize: "1.3rem",
                fontWeight: 800,
                color: C.amber,
                fontFamily: "'JetBrains Mono', monospace",
                marginTop: 4,
              }}>
                ₹{wallet.totalCommission?.toFixed(2) ?? '0.00'}
              </div>
            </div>

            <div style={{
              background: C.surface2,
              border: "1px solid " + C.border,
              borderRadius: 7,
              padding: "0.9rem",
            }}>
              <div style={{fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em"}}>
                Pending Payout
              </div>
              <div style={{
                fontSize: "1.3rem",
                fontWeight: 800,
                color: C.cyan,
                fontFamily: "'JetBrains Mono', monospace",
                marginTop: 4,
              }}>
                ₹{wallet.pendingAmount?.toFixed(2) ?? '0.00'}
              </div>
            </div>

            <div style={{
              background: C.surface2,
              border: "1px solid " + C.border,
              borderRadius: 7,
              padding: "0.9rem",
            }}>
              <div style={{fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "0.05em"}}>
                Available Balance
              </div>
              <div style={{
                fontSize: "1.3rem",
                fontWeight: 800,
                color: C.primary,
                fontFamily: "'JetBrains Mono', monospace",
                marginTop: 4,
              }}>
                ₹{wallet.availableBalance?.toFixed(2) ?? '0.00'}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{height: "1px", background: C.border, marginBottom: "1.5rem"}} />

          {/* Transaction history */}
          <div style={{marginBottom: "1rem"}}>
            <SectionLabel>Recent Transactions</SectionLabel>
            {wallet.transactions && wallet.transactions.length > 0 ? (
              <div style={{
                marginTop: "0.8rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}>
                {wallet.transactions.slice(0, 3).map((txn: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.7rem",
                      background: C.surface2,
                      borderRadius: 6,
                      fontSize: "0.8rem",
                    }}
                  >
                    <div style={{display: "flex", alignItems: "center", gap: 8}}>
                      {TXN_ICONS[txn.type]}
                      <div>
                        <div style={{fontWeight: 600}}>{txn.description}</div>
                        <div style={{fontSize: "0.65rem", color: C.muted}}>
                          {new Date(txn.createdAt).toLocaleDateString("en-IN")}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      fontWeight: 700,
                      color: TXN_COLORS[txn.type],
                      fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      {txn.type === 'debit' ? '-' : '+'} ₹{txn.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: "1rem",
                textAlign: "center",
                color: C.muted,
                fontSize: "0.8rem",
              }}>
                No transactions yet
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{display: "flex", gap: 8}}>
            <div style={{flex: 1}}>
              <Btn
                size="sm"
                variant="primary"
                icon={<Wallet size={12} />}
                onClick={onViewTransactions}
                full
              >
                View All Transactions
              </Btn>
            </div>
            <Btn
              size="sm"
              variant="ghost"
              icon={<Download size={12} />}
              onClick={() => toast.info("Download feature coming soon")}
            >
              Export
            </Btn>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function DriverWalletManagement() {
  const { drivers, loading, error, refetch } = useDrivers();
  const { mutate, loading: acting } = useMutation();

  const [statusF, setStatusF] = useState("all");
  const [txnF, setTxnF] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showTxnModal, setShowTxnModal] = useState(false);
  const [walletData, setWalletData] = useState<Record<string, any>>({});

  // ── Fetch wallet data ────────────────────────────────────────────────────
useEffect(() => {
  const fetchWallets = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/wallet/admin/wallets`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch wallets");
      }

      const data = await response.json();

      const walletMap: Record<string, any> = {};
      data.wallets?.forEach((w: any) => {
        walletMap[w.driverId] = w;
      });

      setWalletData(walletMap);
    } catch (err) {
      console.error("❌ Error fetching wallets:", err);
    }
  };

  if (drivers.length > 0) fetchWallets();
}, [drivers]);
// ── Calculate stats ──────────────────────────────────────────────────────
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

  // ── Filtering ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = drivers;

    // Status filter
    if (statusF === "active") {
      result = result.filter(d => d.isOnline);
    } else if (statusF === "inactive") {
      result = result.filter(d => !d.isOnline);
    }

    // Search filter
    if (q) {
      const ql = q.toLowerCase();
      result = result.filter(d =>
        d.name?.toLowerCase().includes(ql) ||
        d.phone?.includes(ql) ||
        d._id?.includes(ql)
      );
    }

    return result;
  }, [drivers, statusF, q]);

  const pages = Math.ceil(filtered.length / PER);
  const paged = filtered.slice((page - 1) * PER, page * PER);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleViewTransactions = (driver: any) => {
    setSelectedDriver(driver);
    // This would open a transaction list modal
  };

  const handleViewTransaction = (txn: any) => {
    setSelectedTransaction(txn);
    setShowTxnModal(true);
  };

  if (error) return <PageError message={error} onRetry={refetch} />;

  return (
    <div style={{padding: "1.5rem", background: C.bg, minHeight: "100vh"}}>
      
      {/* Header */}
      <div style={{marginBottom: "2rem"}}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem"}}>
          <div>
            <h1 style={{fontSize: "1.8rem", fontWeight: 800, margin: 0}}>
              💰 Driver Wallet Management
            </h1>
            <p style={{fontSize: "0.9rem", color: C.muted, margin: "0.5rem 0 0"}}>
              Monitor driver earnings, transactions, and wallet balance
            </p>
          </div>
          <Btn
            icon={<RefreshCw size={14} />}
            onClick={() => { refetch(); }}
            loading={loading}
          >
            Refresh
          </Btn>
        </div>
      </div>

      {/* Stats Cards */}
      {!loading && <WalletStatsSection stats={stats} />}

      {/* Filters */}
      <Card style={{marginBottom: "1.5rem"}}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 200px 1fr",
          gap: "1rem",
          alignItems: "flex-end",
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
          <div style={{textAlign: "right", fontSize: "0.85rem", color: C.muted}}>
            <span style={{fontWeight: 600}}>{filtered.length}</span> drivers
          </div>
        </div>
      </Card>

      {/* Loading state */}
      {loading && <Spinner label="Loading wallets…" />}

      {/* Driver Wallet Cards */}
      {!loading && paged.length > 0 ? (
        <div>
          {paged.map((driver) => (
            <DriverWalletCard
              key={driver._id}
              driver={driver}
              wallet={walletData[driver._id] || {
                availableBalance: 0,
                totalEarnings: 0,
                totalCommission: 0,
                pendingAmount: 0,
                transactions: [],
              }}
              onViewTransactions={() => handleViewTransactions(driver)}
            />
          ))}
          <Pagination
            page={page}
            pages={pages}
            total={filtered.length}
            perPage={PER}
            onChange={setPage}
          />
        </div>
      ) : (
        !loading && (
          <Card style={{padding: "2rem", textAlign: "center"}}>
            <Wallet size={48} style={{color: C.muted, margin: "0 auto 1rem"}} />
            <p style={{color: C.muted, fontSize: "1rem"}}>No drivers found</p>
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