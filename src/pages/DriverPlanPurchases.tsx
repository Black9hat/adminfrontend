// src/pages/DriverPlanPurchases.tsx
// ════════════════════════════════════════════════════════════════════════════════
// ADMIN — DRIVER PLAN PURCHASES
// View all driver plan purchases, stats, filter, and force-deactivate plans
// ════════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useMemo } from "react";
import {
  Eye, EyeOff, RefreshCw,
  TrendingUp, DollarSign, Users, AlertTriangle,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "react-toastify";
import { useMutation } from "../hooks/index";

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface DriverInfo {
  _id: string;
  fullName: string;
  phone: string;
}

interface DriverPlan {
  _id: string;
  driver: DriverInfo;
  planName: string;
  planType: string;
  commissionRate: number;
  bonusMultiplier: number;
  isActive: boolean;
  activatedDate: string;
  expiryDate: string;
  daysRemaining: number;
  amountPaid: number;
  paymentStatus: string;
  purchaseMethod: string;
  razorpayPaymentId?: string;
  extraEarningPerRide?: number;
  isTimeBasedPlan?: boolean;
  planStartTime?: string;
  planEndTime?: string;
}

interface PlanStats {
  totalActivePlans: number;
  totalRevenue: number;
  totalPurchases: number;
  expiringSoon: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════════

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

  .dpp {
    font-family: 'DM Sans', sans-serif;
    padding: 36px 40px 60px;
    background: #08080f;
    min-height: 100vh;
    color: #e4e2f0;
  }

  .dpp-hdr {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 44px;
  }

  .dpp-title {
    font-family: 'Syne', sans-serif;
    font-size: 2rem;
    font-weight: 800;
    margin: 0 0 5px;
    letter-spacing: -0.03em;
    background: linear-gradient(130deg, #fff 30%, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .dpp-sub {
    margin: 0;
    color: #5c5a72;
    font-size: 0.875rem;
    font-weight: 300;
  }

  .dpp-btn-refresh {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    cursor: pointer;
    padding: 10px 18px;
    border: 1px solid #2d2d44;
    border-radius: 10px;
    background: transparent;
    color: #a78bfa;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .dpp-btn-refresh:hover {
    border-color: #a78bfa;
    background: rgba(167, 139, 250, 0.08);
  }

  .dpp-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 32px;
  }

  .dpp-stat-card {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 1px solid #2d2d44;
    border-radius: 14px;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    transition: all 0.3s;
  }

  .dpp-stat-card:hover {
    border-color: #a78bfa;
    box-shadow: 0 10px 20px rgba(167, 139, 250, 0.08);
  }

  .dpp-stat-label {
    color: #5c5a72;
    font-size: 0.8rem;
    font-weight: 500;
    margin-bottom: 8px;
  }

  .dpp-stat-value {
    font-family: 'Syne', sans-serif;
    font-size: 1.6rem;
    font-weight: 800;
    background: linear-gradient(135deg, #fff, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .dpp-filters {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
    flex-wrap: wrap;
    align-items: center;
  }

  .dpp-search {
    flex: 1;
    min-width: 200px;
    padding: 10px 14px;
    border: 1px solid #2d2d44;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.03);
    color: #e4e2f0;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .dpp-search:focus {
    outline: none;
    border-color: #a78bfa;
    background: rgba(167, 139, 250, 0.05);
  }

  .dpp-select {
    padding: 10px 14px;
    border: 1px solid #2d2d44;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.03);
    color: #e4e2f0;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .dpp-select:focus {
    outline: none;
    border-color: #a78bfa;
  }

  .dpp-table-wrap {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 1px solid #2d2d44;
    border-radius: 16px;
    overflow: hidden;
  }

  .dpp-table {
    width: 100%;
    border-collapse: collapse;
  }

  .dpp-table thead tr {
    background: rgba(99, 102, 241, 0.05);
    border-bottom: 1px solid #2d2d44;
  }

  .dpp-table th {
    padding: 13px 16px;
    text-align: left;
    font-size: 0.8rem;
    font-weight: 600;
    color: #a78bfa;
    white-space: nowrap;
  }

  .dpp-table td {
    padding: 13px 16px;
    border-bottom: 1px solid #1e1e30;
    font-size: 0.875rem;
    vertical-align: top;
  }

  .dpp-table tbody tr:last-child td {
    border-bottom: none;
  }

  .dpp-table tbody tr:hover td {
    background: rgba(167, 139, 250, 0.04);
  }

  .dpp-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .dpp-badge-active {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
  }

  .dpp-badge-expired {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }

  .dpp-badge-pending {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
  }

  .dpp-action-btn {
    cursor: pointer;
    background: transparent;
    border: none;
    color: #a78bfa;
    padding: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    border-radius: 6px;
  }

  .dpp-action-btn:hover {
    color: #fff;
    background: rgba(167, 139, 250, 0.12);
  }

  .dpp-action-btn.danger { color: #ef4444; }
  .dpp-action-btn.danger:hover { background: rgba(239, 68, 68, 0.12); }

  .dpp-action-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .dpp-detail-row td {
    background: rgba(167, 139, 250, 0.04);
    padding: 12px 16px;
  }

  .dpp-detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .dpp-detail-item {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid #2d2d44;
    border-radius: 8px;
    padding: 10px 14px;
  }

  .dpp-detail-key {
    font-size: 0.72rem;
    color: #5c5a72;
    margin-bottom: 4px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .dpp-detail-val {
    font-size: 0.875rem;
    color: #e4e2f0;
    font-weight: 500;
    word-break: break-all;
  }

  .dpp-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 20px;
    color: #5c5a72;
    font-size: 0.875rem;
  }

  .dpp-page-btns {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .dpp-page-btn {
    cursor: pointer;
    background: transparent;
    border: 1px solid #2d2d44;
    color: #a78bfa;
    border-radius: 7px;
    padding: 6px 12px;
    font-size: 0.8rem;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .dpp-page-btn:hover:not(:disabled) {
    border-color: #a78bfa;
    background: rgba(167, 139, 250, 0.08);
  }

  .dpp-page-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .dpp-empty {
    text-align: center;
    padding: 48px 24px;
    color: #5c5a72;
  }

  .dpp-empty-icon { font-size: 48px; margin-bottom: 12px; }
`;

// ── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = () => (
  <div style={{ textAlign: "center", padding: "48px 24px" }}>
    <div
      style={{
        display: "inline-block",
        width: 40,
        height: 40,
        border: "3px solid #a78bfa",
        borderTop: "3px solid transparent",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }}
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ── Status badge helper ──────────────────────────────────────────────────────
function StatusBadge({ plan }: { plan: DriverPlan }) {
  if (plan.paymentStatus === "pending" || plan.paymentStatus === "created") {
    return <span className="dpp-badge dpp-badge-pending">Pending</span>;
  }
  if (plan.isActive) {
    return <span className="dpp-badge dpp-badge-active">Active</span>;
  }
  return <span className="dpp-badge dpp-badge-expired">Expired</span>;
}

// ── Date formatter ───────────────────────────────────────────────────────────
function fmt(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;

// ════════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

export default function DriverPlanPurchases() {
  const { mutate, loading: acting } = useMutation();

  const [plans, setPlans] = useState<DriverPlan[]>([]);
  const [stats, setStats] = useState<PlanStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "pending">("all");
  const [methodFilter, setMethodFilter] = useState<"all" | "driver_purchase" | "admin_assigned">("all");

  // Pagination (server-side)
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Expanded detail row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Load plans ─────────────────────────────────────────────────────────────
  const loadPlans = async (pg = page) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pg),
        limit: String(PAGE_SIZE),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(methodFilter !== "all" && { method: methodFilter }),
        ...(search.trim() && { search: search.trim() }),
      });
      const { ok, data, message } = await mutate(
        "get",
        `/admin/driver-plans?${params.toString()}`,
        undefined
      );
      if (ok) {
        setPlans(data?.data?.driverPlans ?? []);
        setTotal(data?.data?.total ?? 0);
        setTotalPages(data?.data?.totalPages ?? 1);
      } else {
        toast.error(message || "Failed to load driver plans");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    const { ok, data } = await mutate("get", "/admin/driver-plans/stats", undefined);
    if (ok) setStats(data?.data ?? null);
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
    loadPlans(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, methodFilter]);

  // debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadPlans(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ── Force Deactivate ────────────────────────────────────────────────────────
  const handleDeactivate = async (dp: DriverPlan) => {
    if (
      !window.confirm(
        `Force-deactivate the plan for ${dp.driver?.fullName ?? "this driver"}?\nThis cannot be undone.`
      )
    )
      return;
    const { ok, message } = await mutate(
      "put",
      `/admin/driver-plans/${dp._id}/deactivate`,
      undefined
    );
    if (ok) {
      toast.success("Plan deactivated");
      loadPlans();
      loadStats();
    } else {
      toast.error(message || "Failed to deactivate plan");
    }
  };

  // ── Pagination ──────────────────────────────────────────────────────────────
  const goToPage = (pg: number) => {
    setPage(pg);
    loadPlans(pg);
  };

  // Client-side filter provides instant UI feedback while the debounced server
  // request is in-flight. Once the server responds, the full page is replaced.
  const rows = useMemo(() => {
    if (!search.trim()) return plans;
    const q = search.toLowerCase();
    return plans.filter(
      (p) =>
        p.driver?.fullName?.toLowerCase().includes(q) ||
        p.driver?.phone?.includes(q) ||
        p.planName?.toLowerCase().includes(q)
    );
  }, [plans, search]);

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div className="dpp">
      <style>{STYLES}</style>

      {/* Header */}
      <div className="dpp-hdr">
        <div>
          <h1 className="dpp-title">Driver Plan Purchases</h1>
          <p className="dpp-sub">View and manage all driver incentive plan subscriptions</p>
        </div>
        <button
          className="dpp-btn-refresh"
          onClick={() => { loadPlans(); loadStats(); }}
          disabled={isLoading || acting}
        >
          <RefreshCw size={15} style={{ animation: isLoading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="dpp-stats">
        <div className="dpp-stat-card">
          <div>
            <div className="dpp-stat-label">Total Active Plans</div>
            <div className="dpp-stat-value">{stats?.totalActivePlans ?? "—"}</div>
          </div>
          <Users size={22} style={{ color: "#a78bfa" }} />
        </div>
        <div className="dpp-stat-card">
          <div>
            <div className="dpp-stat-label">Total Revenue (₹)</div>
            <div className="dpp-stat-value">
              {stats ? `₹${stats.totalRevenue.toLocaleString("en-IN")}` : "—"}
            </div>
          </div>
          <DollarSign size={22} style={{ color: "#a78bfa" }} />
        </div>
        <div className="dpp-stat-card">
          <div>
            <div className="dpp-stat-label">Total Purchases</div>
            <div className="dpp-stat-value">{stats?.totalPurchases ?? "—"}</div>
          </div>
          <TrendingUp size={22} style={{ color: "#a78bfa" }} />
        </div>
        <div className="dpp-stat-card">
          <div>
            <div className="dpp-stat-label">Expiring Soon</div>
            <div className="dpp-stat-value" style={{ color: stats?.expiringSoon ? "#f59e0b" : undefined }}>
              {stats?.expiringSoon ?? "—"}
            </div>
          </div>
          <AlertTriangle size={22} style={{ color: "#f59e0b" }} />
        </div>
      </div>

      {/* Filters */}
      <div className="dpp-filters">
        <input
          className="dpp-search"
          type="text"
          placeholder="Search by driver name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="dpp-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="pending">Pending</option>
        </select>
        <select
          className="dpp-select"
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value as typeof methodFilter)}
        >
          <option value="all">All Methods</option>
          <option value="driver_purchase">Driver Purchase</option>
          <option value="admin_assigned">Admin Assigned</option>
        </select>
      </div>

      {/* Table */}
      <div className="dpp-table-wrap">
        {isLoading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <div className="dpp-empty">
            <div className="dpp-empty-icon">🗂️</div>
            <h3>No plan purchases found</h3>
            <p>Adjust your filters or wait for drivers to purchase plans</p>
          </div>
        ) : (
          <table className="dpp-table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Plan</th>
                <th>Commission</th>
                <th>Status</th>
                <th>Activated</th>
                <th>Expires</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((dp) => (
                <React.Fragment key={dp._id}>
                  <tr>
                    {/* Driver */}
                    <td>
                      <div style={{ fontWeight: 600, color: "#fff" }}>
                        {dp.driver?.fullName ?? "Unknown"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#5c5a72", marginTop: 2 }}>
                        {dp.driver?.phone ?? "—"}
                      </div>
                    </td>

                    {/* Plan */}
                    <td>
                      <div style={{ fontWeight: 600 }}>{dp.planName}</div>
                      <div style={{ fontSize: "0.75rem", color: "#a78bfa", marginTop: 2, textTransform: "capitalize" }}>
                        {dp.planType}
                        {dp.purchaseMethod === "admin_assigned" && (
                          <span style={{ color: "#f59e0b", marginLeft: 6 }}>· Admin</span>
                        )}
                      </div>
                    </td>

                    {/* Commission */}
                    <td>
                      <span style={{ color: dp.commissionRate === 0 ? "#10b981" : "#e4e2f0" }}>
                        {dp.commissionRate}%
                      </span>
                      {(dp.bonusMultiplier ?? 1) > 1 && (
                        <div style={{ fontSize: "0.75rem", color: "#a78bfa", marginTop: 2 }}>
                          {dp.bonusMultiplier}x bonus
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td>
                      <StatusBadge plan={dp} />
                      {dp.isActive && dp.daysRemaining <= 3 && (
                        <div style={{ fontSize: "0.72rem", color: "#f59e0b", marginTop: 4 }}>
                          {dp.daysRemaining}d left
                        </div>
                      )}
                    </td>

                    {/* Activated */}
                    <td style={{ color: "#5c5a72", fontSize: "0.8rem" }}>
                      {dp.activatedDate ? fmt(dp.activatedDate) : "—"}
                    </td>

                    {/* Expires */}
                    <td style={{ color: "#5c5a72", fontSize: "0.8rem" }}>
                      {dp.expiryDate ? fmt(dp.expiryDate) : "—"}
                    </td>

                    {/* Amount */}
                    <td>
                      <span style={{ fontWeight: 600, color: "#10b981" }}>
                        ₹{(dp.amountPaid ?? 0).toLocaleString("en-IN")}
                      </span>
                      <div style={{ fontSize: "0.72rem", color: "#5c5a72", marginTop: 2, textTransform: "capitalize" }}>
                        {dp.paymentStatus}
                      </div>
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          className="dpp-action-btn"
                          title="View details"
                          onClick={() =>
                            setExpandedId(expandedId === dp._id ? null : dp._id)
                          }
                        >
                          {expandedId === dp._id ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        {dp.isActive && (
                          <button
                            className="dpp-action-btn danger"
                            title="Force deactivate"
                            onClick={() => handleDeactivate(dp)}
                            disabled={acting}
                          >
                            ⛔
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expandable detail row */}
                  {expandedId === dp._id && (
                    <tr className="dpp-detail-row">
                      <td colSpan={8}>
                        <div className="dpp-detail-grid">
                          <div className="dpp-detail-item">
                            <div className="dpp-detail-key">Plan ID</div>
                            <div className="dpp-detail-val">{dp._id}</div>
                          </div>
                          {dp.razorpayPaymentId && (
                            <div className="dpp-detail-item">
                              <div className="dpp-detail-key">Razorpay Payment ID</div>
                              <div className="dpp-detail-val">{dp.razorpayPaymentId}</div>
                            </div>
                          )}
                          <div className="dpp-detail-item">
                            <div className="dpp-detail-key">Purchase Method</div>
                            <div className="dpp-detail-val" style={{ textTransform: "capitalize" }}>
                              {dp.purchaseMethod?.replace(/_/g, " ") ?? "—"}
                            </div>
                          </div>
                          <div className="dpp-detail-item">
                            <div className="dpp-detail-key">Bonus Multiplier</div>
                            <div className="dpp-detail-val">{dp.bonusMultiplier ?? 1}x</div>
                          </div>
                          {(dp.extraEarningPerRide ?? 0) > 0 && (
                            <div className="dpp-detail-item">
                              <div className="dpp-detail-key">Extra Per Ride</div>
                              <div className="dpp-detail-val" style={{ color: "#10b981" }}>
                                +₹{dp.extraEarningPerRide}/ride
                              </div>
                            </div>
                          )}
                          {dp.isTimeBasedPlan && (
                            <div className="dpp-detail-item">
                              <div className="dpp-detail-key">Active Window</div>
                              <div className="dpp-detail-val" style={{ color: "#f59e0b" }}>
                                {dp.planStartTime ?? "—"} – {dp.planEndTime ?? "—"}
                              </div>
                            </div>
                          )}
                          <div className="dpp-detail-item">
                            <div className="dpp-detail-key">Days Remaining</div>
                            <div className="dpp-detail-val">{dp.daysRemaining ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && total > 0 && (
        <div className="dpp-pagination">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="dpp-page-btns">
            <button
              className="dpp-page-btn"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span style={{ color: "#e4e2f0", fontWeight: 600 }}>
              {page} / {totalPages}
            </span>
            <button
              className="dpp-page-btn"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
