// admin/PlanManagement.tsx
// ════════════════════════════════════════════════════════════════════════════════
// ADMIN PLAN MANAGEMENT - Create, Edit, and Manage Driver Plans
// ════════════════════════════════════════════════════════════════════════════════
// Fixes applied:
//   1. handleSave shows the real server error message (not a hardcoded string)
//   2. All numeric inputs use ?? instead of || so 0 is a valid value
//   3. Client-side validation before submitting (bonusMultiplier, commissionRate)
//   4. planName trimmed before submit to avoid accidental duplicate-name errors
// ════════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from "react";
import {
  Plus, Edit, Trash2,
  TrendingUp, DollarSign, Users,
  Eye, EyeOff,
} from "lucide-react";
import { toast } from "react-toastify";
import { useMutation } from "../hooks/index";

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface Plan {
  _id: string;
  planName: string;
  planType: "basic" | "standard" | "premium";
  commissionRate: number;
  bonusMultiplier: number;
  noCommission: boolean;
  monthlyFee: number;
  planPrice: number;
  durationDays: number;
  isTimeBasedPlan: boolean;
  planStartTime?: string;
  planEndTime?: string;
  description: string;
  benefits: string[];
  isActive: boolean;
  totalPurchases?: number;
  totalRevenueGenerated?: number;
  lastPurchaseDate?: string;
  createdAt?: string;
}

interface PlanStats {
  totalRevenue: number;
  totalPurchases: number;
  avgOrderValue: number;
}

interface RevenueData {
  date: string;
  revenue: number;
  purchases: number;
}

interface AnalyticsData {
  totalStats: PlanStats;
  revenueByPlan: Array<{
    planName: string;
    revenue: number;
    purchases: number;
    percentage: string;
  }>;
  failedPayments: number;
  dailyRevenue: RevenueData[];
}

// ════════════════════════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════════════════════════

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

  .pm {
    font-family: 'DM Sans', sans-serif;
    padding: 36px 40px 60px;
    background: #08080f;
    min-height: 100vh;
    color: #e4e2f0;
  }

  .pm-hdr {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 44px;
  }

  .pm-title {
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

  .pm-sub {
    margin: 0;
    color: #5c5a72;
    font-size: 0.875rem;
    font-weight: 300;
  }

  .pm-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    cursor: pointer;
    padding: 11px 20px;
    border: none;
    border-radius: 11px;
    background: linear-gradient(135deg, #6d28d9, #9333ea);
    color: #fff;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.3s;
  }

  .pm-btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(99, 102, 241, 0.3);
  }

  .pm-card {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 1px solid #2d2d44;
    border-radius: 16px;
    padding: 24px;
    transition: all 0.3s;
  }

  .pm-card:hover {
    border-color: #a78bfa;
    box-shadow: 0 12px 24px rgba(167, 139, 250, 0.1);
  }

  .pm-card-stat {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .pm-card-label {
    color: #5c5a72;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .pm-card-value {
    font-family: 'Syne', sans-serif;
    font-size: 1.75rem;
    font-weight: 800;
    background: linear-gradient(135deg, #fff, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .pm-list {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 1px solid #2d2d44;
    border-radius: 16px;
    overflow: hidden;
  }

  .pm-list-item {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 0.5fr;
    gap: 16px;
    padding: 16px 24px;
    border-bottom: 1px solid #2d2d44;
    align-items: center;
  }

  .pm-list-item:last-child { border-bottom: none; }

  .pm-list-header {
    background: rgba(99, 102, 241, 0.05);
    padding: 12px 24px;
    border-bottom: 1px solid #2d2d44;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 0.5fr;
    gap: 16px;
    font-weight: 600;
    color: #a78bfa;
    font-size: 0.875rem;
  }

  .pm-plan-name {
    font-weight: 600;
    color: #fff;
  }

  .pm-actions {
    display: flex;
    gap: 8px;
  }

  .pm-action-btn {
    cursor: pointer;
    background: transparent;
    border: none;
    color: #a78bfa;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .pm-action-btn:hover {
    color: #fff;
    background: rgba(167, 139, 250, 0.1);
    border-radius: 6px;
  }

  .pm-form {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 1px solid #2d2d44;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .pm-form-group {
    margin-bottom: 20px;
  }

  .pm-form-group label {
    display: block;
    margin-bottom: 8px;
    color: #e4e2f0;
    font-weight: 500;
    font-size: 0.875rem;
  }

  .pm-form-group input,
  .pm-form-group select,
  .pm-form-group textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #2d2d44;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.03);
    color: #e4e2f0;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    transition: all 0.3s;
    box-sizing: border-box;
  }

  .pm-form-group input:focus,
  .pm-form-group select:focus,
  .pm-form-group textarea:focus {
    outline: none;
    border-color: #a78bfa;
    background: rgba(167, 139, 250, 0.05);
  }

  .pm-form-group input:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .pm-form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .pm-form-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
  }

  .pm-btn-save {
    flex: 1;
    padding: 12px 24px;
    background: linear-gradient(135deg, #6d28d9, #9333ea);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
  }

  .pm-btn-save:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
  }

  .pm-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }

  .pm-btn-cancel {
    flex: 1;
    padding: 12px 24px;
    background: transparent;
    color: #a78bfa;
    border: 1px solid #2d2d44;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
  }

  .pm-btn-cancel:hover {
    border-color: #a78bfa;
    background: rgba(167, 139, 250, 0.05);
  }

  .pm-tabs {
    display: flex;
    gap: 24px;
    margin-bottom: 24px;
    border-bottom: 1px solid #2d2d44;
  }

  .pm-tab {
    padding: 12px 0;
    background: transparent;
    border: none;
    color: #5c5a72;
    font-weight: 600;
    cursor: pointer;
    position: relative;
    transition: all 0.3s;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
  }

  .pm-tab.active { color: #a78bfa; }

  .pm-tab.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0; right: 0;
    height: 2px;
    background: linear-gradient(135deg, #6d28d9, #9333ea);
  }

  .pm-empty {
    text-align: center;
    padding: 48px 24px;
    color: #5c5a72;
  }

  .pm-empty-icon { font-size: 48px; margin-bottom: 16px; }

  .pm-analytics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
    margin-top: 24px;
  }

  .pm-checkbox-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-top: 28px;
  }

  .pm-checkbox-row input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #9333ea;
  }
`;

// ── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = () => (
  <div style={{ textAlign: "center", padding: "48px 24px" }}>
    <div style={{
      display: "inline-block", width: 40, height: 40,
      border: "3px solid #a78bfa", borderTop: "3px solid transparent",
      borderRadius: "50%", animation: "spin 1s linear infinite",
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════════════════

interface Props {}

export const PlanManagement: React.FC<Props> = () => {
  const { mutate, loading: acting } = useMutation();

  const [activeTab, setActiveTab] = useState<"manage" | "analytics">("manage");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showForm, setShowForm] = useState(false);

  const emptyForm: Partial<Plan> = {
    planName: "",
    planType: "basic",
    commissionRate: 20,
    bonusMultiplier: 1.0,
    noCommission: false,
    monthlyFee: 0,
    planPrice: 299,
    durationDays: 30,
    description: "",
    benefits: [],
    isActive: true,
  };

  const [formData, setFormData] = useState<Partial<Plan>>(emptyForm);

  useEffect(() => {
    if (activeTab === "manage") loadPlans();
    else loadAnalytics();
  }, [activeTab]);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const { ok, data, message } = await mutate("get", "/admin/plans", undefined);
      if (ok) setPlans(data?.data ?? []);
      // ✅ FIX: show real server error message
      else toast.error(message || "Failed to load plans");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const { ok, data, message } = await mutate("get", "/admin/plans/stats/revenue", undefined);
      if (ok) setAnalytics(data?.data ?? null);
      else toast.error(message || "Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingPlan(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData(plan);
    setShowForm(true);
  };

  const handleDelete = async (planId: string) => {
    if (!window.confirm("Are you sure you want to delete this plan?")) return;
    const { ok, message } = await mutate("delete", `/admin/plans/${planId}`, undefined);
    if (ok) { toast.success("Plan deleted"); loadPlans(); }
    else toast.error(message || "Failed to delete plan");
  };

  // ✅ FIX: client-side guards + real server error messages in toasts
  const handleSave = async () => {
    // Required fields
    if (!formData.planName?.trim()) {
      toast.error("Plan name is required");
      return;
    }

    // Numeric guards — catches NaN from cleared / non-numeric inputs
    const commissionRate = formData.commissionRate ?? 20;
    const bonusMultiplier = formData.bonusMultiplier ?? 1.0;
    const planPrice = formData.planPrice ?? 0;
    const durationDays = formData.durationDays ?? 30;

    if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      toast.error("Commission rate must be between 0 and 100");
      return;
    }
    if (isNaN(bonusMultiplier) || bonusMultiplier < 1.0) {
      toast.error("Earnings multiplier must be 1.0 or higher");
      return;
    }
    if (isNaN(planPrice) || planPrice < 0) {
      toast.error("Price must be 0 or higher");
      return;
    }
    if (isNaN(durationDays) || durationDays < 1) {
      toast.error("Duration must be at least 1 day");
      return;
    }

    const payload = {
      ...formData,
      planName: formData.planName.trim(),
      commissionRate: formData.noCommission ? 0 : commissionRate,
      bonusMultiplier,
      planPrice,
      durationDays,
    };

    if (editingPlan) {
      const { ok, message } = await mutate("put", `/admin/plans/${editingPlan._id}`, payload);
      if (ok) { toast.success("Plan updated"); setShowForm(false); loadPlans(); }
      else toast.error(message || "Failed to update plan");
    } else {
      const { ok, message } = await mutate("post", "/admin/plans", payload);
      if (ok) { toast.success("Plan created"); setShowForm(false); loadPlans(); }
      else toast.error(message || "Failed to create plan");
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    const { ok, message } = await mutate("put", `/admin/plans/${plan._id}`, { isActive: !plan.isActive });
    if (ok) { toast.success(plan.isActive ? "Plan deactivated" : "Plan activated"); loadPlans(); }
    else toast.error(message || "Failed to toggle plan status");
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════

  return (
    <div className="pm">
      <style>{STYLES}</style>

      {/* Header */}
      <div className="pm-hdr">
        <div>
          <h1 className="pm-title">Plan Management</h1>
          <p className="pm-sub">Create and manage driver incentive plans</p>
        </div>
        {activeTab === "manage" && (
          <button className="pm-btn-primary" onClick={handleCreateNew}>
            <Plus size={18} />
            New Plan
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="pm-tabs">
        <button
          className={`pm-tab ${activeTab === "manage" ? "active" : ""}`}
          onClick={() => setActiveTab("manage")}
        >
          Manage Plans
        </button>
        <button
          className={`pm-tab ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveTab("analytics")}
        >
          Analytics
        </button>
      </div>

      {/* ── Create / Edit Form ── */}
      {showForm && (
        <div className="pm-form">
          <h3 style={{ marginTop: 0, marginBottom: 20, color: "#fff" }}>
            {editingPlan ? "Edit Plan" : "Create New Plan"}
          </h3>

          {/* Plan Name */}
          <div className="pm-form-group">
            <label>Plan Name *</label>
            <input
              type="text"
              value={formData.planName ?? ""}
              onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
              placeholder="e.g., Zero Commission Plus"
            />
          </div>

          {/* Type + Price */}
          <div className="pm-form-row">
            <div className="pm-form-group">
              <label>Plan Type *</label>
              <select
                value={formData.planType}
                onChange={(e) =>
                  setFormData({ ...formData, planType: e.target.value as Plan["planType"] })
                }
              >
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div className="pm-form-group">
              <label>Price (₹) *</label>
              <input
                type="number"
                min={0}
                // ✅ FIX: ?? not || — keeps 0 as valid input
                value={formData.planPrice ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, planPrice: parseFloat(e.target.value) || 0 })
                }
                placeholder="299"
              />
            </div>
          </div>

          {/* Duration + Commission */}
          <div className="pm-form-row">
            <div className="pm-form-group">
              <label>Duration (Days) *</label>
              <input
                type="number"
                min={1}
                value={formData.durationDays ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, durationDays: parseInt(e.target.value) || 30 })
                }
                placeholder="30"
              />
            </div>
            <div className="pm-form-group">
              <label>
                Commission Rate (%)
                {formData.noCommission && (
                  <span style={{ color: "#5c5a72", marginLeft: 6 }}>— disabled</span>
                )}
              </label>
              <input
                type="number"
                min={0}
                max={100}
                // ✅ FIX: ?? not || — keeps 0% commission valid
                value={formData.noCommission ? 0 : (formData.commissionRate ?? "")}
                onChange={(e) =>
                  setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })
                }
                disabled={formData.noCommission}
                placeholder="20"
              />
            </div>
          </div>

          {/* Multiplier + No Commission */}
          <div className="pm-form-row">
            <div className="pm-form-group">
              <label>Earnings Multiplier (min 1.0)</label>
              <input
                type="number"
                step="0.1"
                min={1.0}
                value={formData.bonusMultiplier ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, bonusMultiplier: parseFloat(e.target.value) || 1.0 })
                }
                placeholder="1.2"
              />
            </div>
            <div className="pm-form-group">
              <div className="pm-checkbox-row">
                <input
                  type="checkbox"
                  id="noCommission"
                  checked={formData.noCommission ?? false}
                  onChange={(e) =>
                    setFormData({ ...formData, noCommission: e.target.checked })
                  }
                />
                <label htmlFor="noCommission" style={{ cursor: "pointer", marginBottom: 0 }}>
                  No Commission (0%)
                </label>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="pm-form-group">
            <label>Description</label>
            <textarea
              value={formData.description ?? ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Plan description for drivers"
              rows={3}
            />
          </div>

          {/* Benefits */}
          <div className="pm-form-group">
            <label>Benefits (one per line)</label>
            <textarea
              value={(formData.benefits ?? []).join("\n")}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  benefits: e.target.value.split("\n").filter((b) => b.trim()),
                })
              }
              placeholder={"0% commission\n1.2x earnings boost\n24/7 support"}
              rows={4}
            />
          </div>

          {/* Form Buttons */}
          <div className="pm-form-actions">
            <button className="pm-btn-save" onClick={handleSave} disabled={acting}>
              {acting ? "Saving…" : editingPlan ? "Update Plan" : "Create Plan"}
            </button>
            <button className="pm-btn-cancel" onClick={() => setShowForm(false)} disabled={acting}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Manage Tab ── */}
      {activeTab === "manage" && (
        <>
          {isLoading ? (
            <Spinner />
          ) : plans.length === 0 ? (
            <div className="pm-empty">
              <div className="pm-empty-icon">📋</div>
              <h3>No plans yet</h3>
              <p>Create your first incentive plan to get started</p>
              <button className="pm-btn-primary" onClick={handleCreateNew} style={{ marginTop: 16 }}>
                Create Plan
              </button>
            </div>
          ) : (
            <div className="pm-list">
              <div className="pm-list-header">
                <div>Plan Name</div>
                <div>Type</div>
                <div>Commission</div>
                <div>Price / Duration</div>
                <div>Actions</div>
              </div>
              {plans.map((plan) => (
                <div key={plan._id} className="pm-list-item">
                  <div>
                    <div className="pm-plan-name">{plan.planName}</div>
                    <div style={{ fontSize: "0.75rem", color: "#5c5a72", marginTop: 4 }}>
                      {plan.totalPurchases || 0} purchases
                    </div>
                  </div>
                  <div style={{ textTransform: "capitalize" }}>{plan.planType}</div>
                  <div>{plan.noCommission ? "0%" : `${plan.commissionRate}%`}</div>
                  <div>₹{plan.planPrice} / {plan.durationDays}d</div>
                  <div className="pm-actions">
                    <button
                      className="pm-action-btn"
                      onClick={() => handleToggleActive(plan)}
                      title={plan.isActive ? "Deactivate" : "Activate"}
                    >
                      {plan.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    <button
                      className="pm-action-btn"
                      onClick={() => handleEdit(plan)}
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      className="pm-action-btn"
                      onClick={() => handleDelete(plan._id)}
                      title="Delete"
                      style={{ color: "#ef4444" }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Analytics Tab ── */}
      {activeTab === "analytics" && (
        <>
          {isLoading ? (
            <Spinner />
          ) : analytics ? (
            <>
              <div className="pm-analytics">
                <div className="pm-card">
                  <div className="pm-card-stat">
                    <div>
                      <div className="pm-card-label">Total Revenue</div>
                      <div className="pm-card-value">
                        ₹{analytics.totalStats.totalRevenue.toLocaleString()}
                      </div>
                    </div>
                    <DollarSign size={24} style={{ color: "#a78bfa" }} />
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#5c5a72", marginTop: 8 }}>
                    {analytics.totalStats.totalPurchases} purchases
                  </div>
                </div>

                <div className="pm-card">
                  <div className="pm-card-stat">
                    <div>
                      <div className="pm-card-label">Avg Order Value</div>
                      <div className="pm-card-value">
                        ₹{analytics.totalStats.avgOrderValue.toFixed(0)}
                      </div>
                    </div>
                    <TrendingUp size={24} style={{ color: "#a78bfa" }} />
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#5c5a72", marginTop: 8 }}>
                    Failed payments: {analytics.failedPayments}
                  </div>
                </div>

                <div className="pm-card">
                  <div className="pm-card-stat">
                    <div>
                      <div className="pm-card-label">Plans Available</div>
                      <div className="pm-card-value">{plans.length}</div>
                    </div>
                    <Users size={24} style={{ color: "#a78bfa" }} />
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#5c5a72", marginTop: 8 }}>
                    Active plan templates
                  </div>
                </div>
              </div>

              {analytics.revenueByPlan.length > 0 && (
                <div className="pm-list" style={{ marginTop: 24 }}>
                  <div
                    className="pm-list-header"
                    style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}
                  >
                    <div>Plan</div>
                    <div>Revenue</div>
                    <div>Purchases</div>
                    <div>% of Total</div>
                  </div>
                  {analytics.revenueByPlan.map((item) => (
                    <div
                      key={item.planName}
                      className="pm-list-item"
                      style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}
                    >
                      <div className="pm-plan-name">{item.planName}</div>
                      <div>₹{item.revenue.toLocaleString()}</div>
                      <div>{item.purchases}</div>
                      <div style={{ color: "#a78bfa", fontWeight: 600 }}>
                        {item.percentage}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="pm-empty">
              <div className="pm-empty-icon">📊</div>
              <p>No analytics data available yet</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PlanManagement;