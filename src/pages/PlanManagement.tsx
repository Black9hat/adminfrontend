// src/pages/PlanManagement.tsx
// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN PLAN MANAGEMENT
// Full CRUD, enable/disable toggle, purchase history, and revenue stats.
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Edit, Trash2, Eye,
  TrendingUp, DollarSign, Users, Clock,
  CheckCircle, XCircle, ToggleLeft, ToggleRight,
  ChevronDown, X, AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { planApi, type CreatePlanDto } from "../api/planApi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  _id: string;
  planName: string;
  planType: "basic" | "standard" | "premium";
  description: string;
  commissionRate: number;
  bonusMultiplier: number;
  noCommission: boolean;
  planPrice: number;
  durationDays: number;
  isTimeBasedPlan: boolean;
  planStartTime: string;
  planEndTime: string;
  monthlyFee: number;
  benefits: string[];
  isActive: boolean;
  planActivationDate: string | null;
  planExpiryDate: string | null;
  totalPurchases: number;
  totalRevenueGenerated: number;
  lastPurchaseDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RevenueStats {
  totalRevenue: number;
  totalPurchases: number;
  activePlansCount: number;
  mostPopularPlan?: string;
}

interface PurchaseRecord {
  _id: string;
  driverName: string;
  driverPhone?: string;
  amountPaid: number;
  purchaseDate: string;
  status: string;
  validTill: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_START_TIME = "06:00";
const DEFAULT_END_TIME   = "23:00";

// ─── Blank form defaults ─────────────────────────────────────────────────────

const BLANK_FORM: CreatePlanDto = {
  planName: "",
  planType: "basic",
  description: "",
  planPrice: 0,
  durationDays: 30,
  commissionRate: 15,
  noCommission: false,
  bonusMultiplier: 1.0,
  benefits: [],
  monthlyFee: 0,
  isTimeBasedPlan: false,
  planStartTime: DEFAULT_START_TIME,
  planEndTime: DEFAULT_END_TIME,
  planActivationDate: null,
  planExpiryDate: null,
  isActive: true,
};

// ─── Type badge style map ─────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, React.CSSProperties> = {
  basic:    { background: "#1e3a5f", color: "#60a5fa", border: "1px solid #2563eb" },
  standard: { background: "#1e4d38", color: "#34d399", border: "1px solid #059669" },
  premium:  { background: "#3b2160", color: "#c084fc", border: "1px solid #7c3aed" },
};

// ─── CSS ──────────────────────────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

  .pm { font-family:'DM Sans',sans-serif; padding:32px 36px 64px; background:#08080f; min-height:100vh; color:#e4e2f0; }
  .pm-hdr { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:32px; gap:16px; flex-wrap:wrap; }
  .pm-title { font-family:'Syne',sans-serif; font-size:2rem; font-weight:800; margin:0 0 4px; letter-spacing:-0.03em;
    background:linear-gradient(130deg,#fff 30%,#a78bfa); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
  .pm-sub { margin:0; color:#5c5a72; font-size:0.875rem; font-weight:300; }

  .pm-btn { display:inline-flex; align-items:center; gap:7px; cursor:pointer; padding:10px 18px; border:none; border-radius:10px;
    font-family:'DM Sans',sans-serif; font-size:0.875rem; font-weight:500; transition:all 0.2s; line-height:1; }
  .pm-btn:disabled { opacity:0.6; cursor:not-allowed; }
  .pm-btn-primary { background:linear-gradient(135deg,#6d28d9,#9333ea); color:#fff; }
  .pm-btn-primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 8px 20px rgba(99,102,241,0.3); }
  .pm-btn-ghost { background:rgba(255,255,255,0.06); color:#a78bfa; border:1px solid #2d2d44; }
  .pm-btn-ghost:hover:not(:disabled) { background:rgba(167,139,250,0.1); }
  .pm-btn-danger { background:rgba(239,68,68,0.12); color:#f87171; border:1px solid #7f1d1d; }
  .pm-btn-danger:hover:not(:disabled) { background:rgba(239,68,68,0.2); }
  .pm-btn-icon { padding:7px; border-radius:8px; }

  .pm-filters { display:flex; gap:10px; margin-bottom:24px; flex-wrap:wrap; }
  .pm-filter-wrap { position:relative; display:inline-flex; align-items:center; }
  .pm-select { background:#131320; color:#c4c2d8; border:1px solid #2d2d44; border-radius:9px; padding:8px 34px 8px 12px;
    font-family:'DM Sans',sans-serif; font-size:0.875rem; appearance:none; cursor:pointer; }
  .pm-select:focus { outline:none; border-color:#7c3aed; }
  .pm-filter-chevron { position:absolute; right:10px; pointer-events:none; color:#5c5a72; width:14px; height:14px; }

  .pm-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; margin-bottom:32px; }
  .pm-stat { background:linear-gradient(135deg,#1a1a2e,#16213e); border:1px solid #2d2d44; border-radius:16px; padding:20px 24px; }
  .pm-stat-lbl { color:#5c5a72; font-size:0.8rem; font-weight:500; margin-bottom:6px; display:flex; align-items:center; gap:6px; }
  .pm-stat-lbl svg { color:#a78bfa; opacity:0.8; width:16px; height:16px; }
  .pm-stat-val { font-family:'Syne',sans-serif; font-size:1.6rem; font-weight:800;
    background:linear-gradient(135deg,#fff,#a78bfa); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }

  .pm-table-wrap { background:linear-gradient(135deg,#1a1a2e,#16213e); border:1px solid #2d2d44; border-radius:16px; overflow:hidden; }
  .pm-table { width:100%; border-collapse:collapse; }
  .pm-table th { background:rgba(99,102,241,0.07); padding:12px 16px; text-align:left; font-size:0.8rem; font-weight:600;
    color:#a78bfa; border-bottom:1px solid #2d2d44; white-space:nowrap; }
  .pm-table td { padding:14px 16px; border-bottom:1px solid #1e1e30; font-size:0.875rem; vertical-align:middle; }
  .pm-table tr:last-child td { border-bottom:none; }
  .pm-table tr:hover td { background:rgba(167,139,250,0.04); }

  .pm-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:0.75rem; font-weight:500; }
  .pm-badge-active   { background:rgba(52,211,153,0.12); color:#34d399; border:1px solid rgba(52,211,153,0.3); }
  .pm-badge-inactive { background:rgba(100,100,120,0.15); color:#6b7280; border:1px solid rgba(100,100,120,0.3); }

  .pm-toggle { cursor:pointer; color:#a78bfa; transition:color 0.2s; background:none; border:none; padding:4px; display:inline-flex; align-items:center; }
  .pm-toggle:hover:not(:disabled) { color:#c4b5fd; }
  .pm-toggle:disabled { cursor:not-allowed; opacity:0.5; }
  .pm-toggle-off { color:#4b4b6a; }

  .pm-empty { text-align:center; padding:64px 24px; color:#5c5a72; }
  .pm-empty-icon { width:48px; height:48px; margin:0 auto 16px; opacity:0.4; }
  .pm-empty h3 { font-size:1.1rem; font-weight:600; color:#8b89a0; margin:0 0 8px; }
  .pm-empty p { font-size:0.875rem; margin:0 0 24px; }

  .pm-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.72); z-index:1000; display:flex; align-items:flex-start;
    justify-content:center; overflow-y:auto; padding:32px 16px; }
  .pm-modal { background:#0f0f1e; border:1px solid #2d2d44; border-radius:20px; width:100%; max-width:680px; position:relative; box-shadow:0 24px 64px rgba(0,0,0,0.6); }
  .pm-modal-hdr { display:flex; align-items:center; justify-content:space-between; padding:22px 28px 0; }
  .pm-modal-title { font-family:'Syne',sans-serif; font-size:1.3rem; font-weight:700; color:#fff; margin:0; }
  .pm-modal-body { padding:20px 28px 28px; }
  .pm-modal-close { background:none; border:none; cursor:pointer; color:#5c5a72; transition:color 0.2s; display:inline-flex; align-items:center; }
  .pm-modal-close:hover { color:#a78bfa; }

  .pm-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .pm-form-full { grid-column:1/-1; }
  .pm-field { display:flex; flex-direction:column; gap:5px; }
  .pm-label { font-size:0.8rem; font-weight:600; color:#a78bfa; text-transform:uppercase; letter-spacing:0.04em; }
  .pm-input { background:#131320; color:#e4e2f0; border:1px solid #2d2d44; border-radius:9px; padding:10px 12px;
    font-family:'DM Sans',sans-serif; font-size:0.9rem; transition:border-color 0.2s; width:100%; box-sizing:border-box; }
  .pm-input:focus { outline:none; border-color:#7c3aed; }
  .pm-input.pm-error { border-color:#f87171; }
  .pm-input-error { font-size:0.78rem; color:#f87171; }
  .pm-checkbox-row { display:flex; align-items:center; gap:8px; cursor:pointer; }
  .pm-checkbox-row input[type="checkbox"] { width:16px; height:16px; accent-color:#7c3aed; cursor:pointer; flex-shrink:0; }
  .pm-section-divider { grid-column:1/-1; border:none; border-top:1px solid #2d2d44; margin:4px 0; }

  .pm-benefit-row { display:flex; gap:8px; align-items:center; margin-bottom:6px; }
  .pm-benefit-row input { flex:1; }

  .pm-modal-footer { display:flex; gap:10px; justify-content:flex-end; padding-top:20px; border-top:1px solid #2d2d44; margin-top:8px; }

  .pm-purchase-table { width:100%; border-collapse:collapse; font-size:0.85rem; }
  .pm-purchase-table th { color:#a78bfa; font-size:0.75rem; font-weight:600; padding:8px 12px; border-bottom:1px solid #2d2d44; text-align:left; }
  .pm-purchase-table td { padding:10px 12px; border-bottom:1px solid #1e1e30; color:#c4c2d8; }
  .pm-purchase-table tr:last-child td { border-bottom:none; }

  .pm-confirm { background:#0f0f1e; border:1px solid #3a1a1a; border-radius:16px; max-width:420px; width:100%; padding:28px; text-align:center; margin-top:80px; }
  .pm-confirm h3 { font-family:'Syne',sans-serif; font-size:1.1rem; font-weight:700; color:#f87171; margin:0 0 10px; }
  .pm-confirm p { font-size:0.875rem; color:#9a9ab0; margin:0 0 20px; line-height:1.6; }
  .pm-confirm-btns { display:flex; gap:10px; justify-content:center; }

  .pm-loading { text-align:center; padding:80px 24px; color:#5c5a72; }
  .pm-spinner { width:40px; height:40px; border:3px solid #2d2d44; border-top-color:#7c3aed; border-radius:50%;
    animation:pm-spin 0.8s linear infinite; margin:0 auto 16px; }
  @keyframes pm-spin { to { transform:rotate(360deg); } }

  @media (max-width:640px) {
    .pm { padding:20px 16px 48px; }
    .pm-form-grid { grid-template-columns:1fr; }
    .pm-form-full { grid-column:1; }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inr = (n: number) =>
  "\u20B9" + (n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const fmtDate = (s: string | null | undefined) => {
  if (!s) return "\u2014";
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps { icon: React.ReactNode; label: string; value: string; }

const StatCard: React.FC<StatCardProps> = ({ icon, label, value }) => (
  <div className="pm-stat">
    <div className="pm-stat-lbl">{icon}{label}</div>
    <div className="pm-stat-val">{value}</div>
  </div>
);

// ─── Plan Row ─────────────────────────────────────────────────────────────────

interface PlanRowProps {
  plan: Plan;
  toggling: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewPurchases: () => void;
}

const PlanRow: React.FC<PlanRowProps> = ({ plan, toggling, onToggle, onEdit, onDelete, onViewPurchases }) => {
  const typeStyle = TYPE_BADGE[plan.planType] ?? TYPE_BADGE.basic;
  return (
    <tr style={plan.isActive ? undefined : { opacity: 0.55 }}>
      <td>
        <div style={{ fontWeight: 600, color: "#e4e2f0" }}>{plan.planName}</div>
        {plan.description && (
          <div style={{ fontSize: "0.78rem", color: "#5c5a72", marginTop: 2, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {plan.description}
          </div>
        )}
      </td>
      <td>
        <span className="pm-badge" style={typeStyle}>{plan.planType}</span>
      </td>
      <td style={{ fontWeight: 500 }}>{inr(plan.planPrice)}</td>
      <td>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#c4c2d8" }}>
          <Clock size={13} />{plan.durationDays}d
        </span>
      </td>
      <td style={{ color: "#c4c2d8" }}>
        {plan.noCommission ? <span style={{ color: "#34d399", fontWeight: 600 }}>0%</span> : `${plan.commissionRate ?? 0}%`}
      </td>
      <td style={{ color: "#c4c2d8" }}>{plan.bonusMultiplier ?? 1}&times;</td>
      <td style={{ color: "#9a9ab0" }}>{plan.totalPurchases ?? 0}</td>
      <td>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className={`pm-badge ${plan.isActive ? "pm-badge-active" : "pm-badge-inactive"}`}>
            {plan.isActive ? <CheckCircle size={11} /> : <XCircle size={11} />}
            {plan.isActive ? "Active" : "Inactive"}
          </span>
          <button
            className={`pm-toggle${plan.isActive ? "" : " pm-toggle-off"}`}
            onClick={onToggle}
            disabled={toggling}
            title={plan.isActive ? "Disable plan" : "Enable plan"}
          >
            {toggling ? (
              <span style={{ fontSize: "0.75rem", width: 22, display: "inline-block", textAlign: "center" }}>…</span>
            ) : plan.isActive ? (
              <ToggleRight size={22} />
            ) : (
              <ToggleLeft size={22} />
            )}
          </button>
        </div>
      </td>
      <td>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="pm-btn pm-btn-ghost pm-btn-icon" onClick={onViewPurchases} title="View purchases"><Eye size={15} /></button>
          <button className="pm-btn pm-btn-ghost pm-btn-icon" onClick={onEdit} title="Edit"><Edit size={15} /></button>
          <button className="pm-btn pm-btn-danger pm-btn-icon" onClick={onDelete} title="Delete"><Trash2 size={15} /></button>
        </div>
      </td>
    </tr>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const PlanManagement: React.FC = () => {
  const [plans, setPlans]             = useState<Plan[]>([]);
  const [stats, setStats]             = useState<RevenueStats | null>(null);
  const [loading, setLoading]         = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [filterType, setFilterType]     = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");

  const [showForm, setShowForm]           = useState(false);
  const [editingPlan, setEditingPlan]     = useState<Plan | null>(null);
  const [form, setFormState]              = useState<CreatePlanDto>(BLANK_FORM);
  const [fieldErrors, setFieldErrors]     = useState<Record<string, string>>({});
  const [saving, setSaving]               = useState(false);
  const [newBenefit, setNewBenefit]       = useState("");

  const [confirmDelete, setConfirmDelete] = useState<Plan | null>(null);
  const [deleting, setDeleting]           = useState(false);

  const [purchasePlan, setPurchasePlan]           = useState<Plan | null>(null);
  const [purchases, setPurchases]                 = useState<PurchaseRecord[]>([]);
  const [purchasesLoading, setPurchasesLoading]   = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await planApi.getPlans();
      const raw = res.data;
      const list: Plan[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.plans ?? []);
      setPlans(list);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Failed to load plans";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await planApi.getRevenueStats();
      const raw = res.data;
      setStats(raw?.data ?? raw ?? null);
    } catch {
      // non-critical
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); fetchStats(); }, [fetchPlans, fetchStats]);

  // ── filter ─────────────────────────────────────────────────────────────────
  const filtered = plans.filter(p => {
    if (filterType !== "all" && p.planType !== filterType) return false;
    if (filterActive === "active"   && !p.isActive) return false;
    if (filterActive === "inactive" &&  p.isActive) return false;
    return true;
  });

  // ── form helpers ───────────────────────────────────────────────────────────
  const setField = <K extends keyof CreatePlanDto>(k: K, v: CreatePlanDto[K]) => {
    setFormState(f => ({ ...f, [k]: v }));
    if (fieldErrors[k]) setFieldErrors(fe => { const c = { ...fe }; delete c[k]; return c; });
  };

  const openCreate = () => {
    setEditingPlan(null);
    setFormState({ ...BLANK_FORM, benefits: [] });
    setFieldErrors({});
    setNewBenefit("");
    setShowForm(true);
  };

  const openEdit = (p: Plan) => {
    setEditingPlan(p);
    setFormState({
      planName: p.planName, planType: p.planType, description: p.description,
      planPrice: p.planPrice, durationDays: p.durationDays, commissionRate: p.commissionRate,
      noCommission: p.noCommission, bonusMultiplier: p.bonusMultiplier,
      benefits: [...p.benefits], monthlyFee: p.monthlyFee,
      isTimeBasedPlan: p.isTimeBasedPlan,
      planStartTime: p.planStartTime ?? DEFAULT_START_TIME, planEndTime: p.planEndTime ?? DEFAULT_END_TIME,
      planActivationDate: p.planActivationDate ?? null, planExpiryDate: p.planExpiryDate ?? null,
      isActive: p.isActive,
    });
    setFieldErrors({});
    setNewBenefit("");
    setShowForm(true);
  };

  // ── validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.planName.trim())            errs.planName        = "Plan name is required";
    if (form.planPrice < 0)               errs.planPrice       = "Price must be \u2265 0";
    if (form.durationDays < 1)            errs.durationDays    = "Duration must be \u2265 1 day";
    if (!form.noCommission && (form.commissionRate < 0 || form.commissionRate > 100))
      errs.commissionRate = "Commission must be 0\u2013100";
    if (form.bonusMultiplier < 1.0)       errs.bonusMultiplier = "Bonus multiplier must be \u2265 1.0";
    if (form.planActivationDate && form.planExpiryDate) {
      if (new Date(form.planActivationDate) >= new Date(form.planExpiryDate))
        errs.planExpiryDate = "Expiry must be after activation date";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: CreatePlanDto = {
        ...form,
        planName: form.planName.trim(),
        commissionRate: form.noCommission ? 0 : form.commissionRate,
      };
      if (editingPlan) {
        await planApi.updatePlan(editingPlan._id, payload);
        toast.success("Plan updated successfully");
      } else {
        await planApi.createPlan(payload);
        toast.success("Plan created successfully");
      }
      setShowForm(false);
      fetchPlans();
      fetchStats();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── toggle ─────────────────────────────────────────────────────────────────
  const handleToggle = async (plan: Plan) => {
    if (togglingId) return;
    setTogglingId(plan._id);
    try {
      await planApi.togglePlan(plan._id);
      const next = !plan.isActive;
      toast.success(`Plan ${next ? "enabled" : "disabled"}`);
      setPlans(ps => ps.map(p => p._id === plan._id ? { ...p, isActive: next } : p));
      fetchStats();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Toggle failed";
      toast.error(msg);
    } finally {
      setTogglingId(null);
    }
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await planApi.deletePlan(confirmDelete._id);
      toast.success("Plan deleted");
      setConfirmDelete(null);
      fetchPlans();
      fetchStats();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Delete failed";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  // ── purchases ──────────────────────────────────────────────────────────────
  const openPurchases = async (plan: Plan) => {
    setPurchasePlan(plan);
    setPurchases([]);
    setPurchasesLoading(true);
    try {
      const res = await planApi.getPurchaseHistory(plan._id);
      const raw = res.data;
      const list: PurchaseRecord[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.purchases ?? []);
      setPurchases(list);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "Failed to load purchases";
      toast.error(msg);
    } finally {
      setPurchasesLoading(false);
    }
  };

  // ── benefits ───────────────────────────────────────────────────────────────
  const addBenefit = () => {
    const b = newBenefit.trim();
    if (!b) return;
    setField("benefits", [...form.benefits, b]);
    setNewBenefit("");
  };
  const removeBenefit = (idx: number) =>
    setField("benefits", form.benefits.filter((_, i) => i !== idx));

  // ── derived stats ──────────────────────────────────────────────────────────
  const { totalRevenue, totalPurchases, activePlansCount, popularPlan } = useMemo(() => {
    const totalRevenue     = stats?.totalRevenue    ?? plans.reduce((s, p) => s + (p.totalRevenueGenerated ?? 0), 0);
    const totalPurchases   = stats?.totalPurchases  ?? plans.reduce((s, p) => s + (p.totalPurchases ?? 0), 0);
    const activePlansCount = stats?.activePlansCount ?? plans.filter(p => p.isActive).length;
    const popularPlan      = stats?.mostPopularPlan ??
      ([...plans].sort((a, b) => (b.totalPurchases ?? 0) - (a.totalPurchases ?? 0))[0]?.planName ?? "\u2014");
    return { totalRevenue, totalPurchases, activePlansCount, popularPlan };
  }, [stats, plans]);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>
      <div className="pm">

        {/* Header */}
        <div className="pm-hdr">
          <div>
            <h1 className="pm-title">Plan Management</h1>
            <p className="pm-sub">Create and manage driver incentive plans</p>
          </div>
          <button className="pm-btn pm-btn-primary" onClick={openCreate}>
            <Plus size={16} />Create Plan
          </button>
        </div>

        {/* Stats */}
        <div className="pm-stats">
          <StatCard icon={<DollarSign />} label="Total Revenue"   value={statsLoading ? "\u2026" : inr(totalRevenue)} />
          <StatCard icon={<Users />}      label="Total Purchases" value={statsLoading ? "\u2026" : String(totalPurchases)} />
          <StatCard icon={<CheckCircle />} label="Active Plans"   value={String(activePlansCount)} />
          <StatCard icon={<TrendingUp />}  label="Most Popular"   value={popularPlan} />
        </div>

        {/* Filters */}
        <div className="pm-filters">
          <div className="pm-filter-wrap">
            <select className="pm-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
            <ChevronDown className="pm-filter-chevron" />
          </div>
          <div className="pm-filter-wrap">
            <select className="pm-select" value={filterActive} onChange={e => setFilterActive(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="pm-filter-chevron" />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="pm-loading"><div className="pm-spinner" /><p>Loading plans\u2026</p></div>
        ) : filtered.length === 0 ? (
          <div className="pm-table-wrap">
            <div className="pm-empty">
              <AlertCircle className="pm-empty-icon" />
              <h3>No plans found</h3>
              <p>{plans.length === 0 ? "No plans created yet. Create your first plan." : "No plans match the current filters."}</p>
              {plans.length === 0 && (
                <button className="pm-btn pm-btn-primary" onClick={openCreate}>
                  <Plus size={16} />Create Your First Plan
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="pm-table-wrap" style={{ overflowX: "auto" }}>
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Plan Name</th><th>Type</th><th>Price</th><th>Duration</th>
                  <th>Commission</th><th>Bonus</th><th>Purchases</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(plan => (
                  <PlanRow
                    key={plan._id}
                    plan={plan}
                    toggling={togglingId === plan._id}
                    onToggle={() => handleToggle(plan)}
                    onEdit={() => openEdit(plan)}
                    onDelete={() => setConfirmDelete(plan)}
                    onViewPurchases={() => openPurchases(plan)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Create / Edit Modal */}
        {showForm && (
          <div className="pm-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
            <div className="pm-modal">
              <div className="pm-modal-hdr">
                <h2 className="pm-modal-title">{editingPlan ? "Edit Plan" : "Create Plan"}</h2>
                <button className="pm-modal-close" onClick={() => setShowForm(false)}><X size={20} /></button>
              </div>
              <div className="pm-modal-body">
                <div className="pm-form-grid">

                  {/* Plan Name */}
                  <div className="pm-field">
                    <label className="pm-label">Plan Name *</label>
                    <input className={`pm-input${fieldErrors.planName ? " pm-error" : ""}`}
                      value={form.planName} onChange={e => setField("planName", e.target.value)}
                      placeholder="e.g. Zero Commission Plan" />
                    {fieldErrors.planName && <span className="pm-input-error">{fieldErrors.planName}</span>}
                  </div>

                  {/* Plan Type */}
                  <div className="pm-field">
                    <label className="pm-label">Plan Type</label>
                    <select className="pm-input" value={form.planType}
                      onChange={e => setField("planType", e.target.value as CreatePlanDto["planType"])}>
                      <option value="basic">Basic</option>
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div className="pm-field pm-form-full">
                    <label className="pm-label">Description</label>
                    <textarea className="pm-input" rows={3} value={form.description}
                      onChange={e => setField("description", e.target.value)}
                      placeholder="Describe this plan\u2026" style={{ resize: "vertical" }} />
                  </div>

                  {/* Price */}
                  <div className="pm-field">
                    <label className="pm-label">Plan Price (\u20B9)</label>
                    <input type="number" min={0} className={`pm-input${fieldErrors.planPrice ? " pm-error" : ""}`}
                      value={form.planPrice} onChange={e => setField("planPrice", Number(e.target.value))} />
                    {fieldErrors.planPrice && <span className="pm-input-error">{fieldErrors.planPrice}</span>}
                  </div>

                  {/* Duration */}
                  <div className="pm-field">
                    <label className="pm-label">Duration (days)</label>
                    <input type="number" min={1} className={`pm-input${fieldErrors.durationDays ? " pm-error" : ""}`}
                      value={form.durationDays} onChange={e => setField("durationDays", Number(e.target.value))} />
                    {fieldErrors.durationDays && <span className="pm-input-error">{fieldErrors.durationDays}</span>}
                  </div>

                  {/* Monthly Fee */}
                  <div className="pm-field">
                    <label className="pm-label">Monthly Fee (\u20B9)</label>
                    <input type="number" min={0} className="pm-input" placeholder="0"
                      value={form.monthlyFee} onChange={e => setField("monthlyFee", Number(e.target.value))} />
                  </div>

                  {/* Bonus Multiplier */}
                  <div className="pm-field">
                    <label className="pm-label">Bonus Multiplier (\u2265 1.0)</label>
                    <input type="number" min={1.0} step={0.05}
                      className={`pm-input${fieldErrors.bonusMultiplier ? " pm-error" : ""}`}
                      value={form.bonusMultiplier} onChange={e => setField("bonusMultiplier", Number(e.target.value))}
                      placeholder="e.g. 1.2" />
                    {fieldErrors.bonusMultiplier && <span className="pm-input-error">{fieldErrors.bonusMultiplier}</span>}
                  </div>

                  <hr className="pm-section-divider" />

                  {/* No Commission */}
                  <div className="pm-field pm-form-full">
                    <label className="pm-checkbox-row">
                      <input type="checkbox" checked={form.noCommission}
                        onChange={e => setField("noCommission", e.target.checked)} />
                      <span style={{ color: "#e4e2f0", fontSize: "0.9rem" }}>Zero Commission Plan (override commission to 0%)</span>
                    </label>
                  </div>

                  {/* Commission Rate */}
                  <div className="pm-field">
                    <label className="pm-label">Commission Rate (%)</label>
                    <input type="number" min={0} max={100}
                      className={`pm-input${fieldErrors.commissionRate ? " pm-error" : ""}`}
                      value={form.commissionRate} disabled={form.noCommission}
                      onChange={e => setField("commissionRate", Number(e.target.value))}
                      style={form.noCommission ? { opacity: 0.4, cursor: "not-allowed" } : undefined} />
                    {fieldErrors.commissionRate && <span className="pm-input-error">{fieldErrors.commissionRate}</span>}
                  </div>

                  <hr className="pm-section-divider" />

                  {/* Time-based */}
                  <div className="pm-field pm-form-full">
                    <label className="pm-checkbox-row">
                      <input type="checkbox" checked={form.isTimeBasedPlan}
                        onChange={e => setField("isTimeBasedPlan", e.target.checked)} />
                      <span style={{ color: "#e4e2f0", fontSize: "0.9rem" }}>
                        <Clock size={14} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
                        Restrict benefits to time window
                      </span>
                    </label>
                  </div>

                  {form.isTimeBasedPlan && (
                    <>
                      <div className="pm-field">
                        <label className="pm-label">Start Time</label>
                        <input type="time" className="pm-input" value={form.planStartTime}
                          onChange={e => setField("planStartTime", e.target.value)} />
                      </div>
                      <div className="pm-field">
                        <label className="pm-label">End Time</label>
                        <input type="time" className="pm-input" value={form.planEndTime}
                          onChange={e => setField("planEndTime", e.target.value)} />
                      </div>
                    </>
                  )}

                  <hr className="pm-section-divider" />

                  {/* Offer window */}
                  <div className="pm-field">
                    <label className="pm-label">Offer Start Date</label>
                    <input type="date" className="pm-input" value={form.planActivationDate ?? ""}
                      onChange={e => setField("planActivationDate", e.target.value || null)} />
                  </div>
                  <div className="pm-field">
                    <label className="pm-label">Offer End Date</label>
                    <input type="date" className={`pm-input${fieldErrors.planExpiryDate ? " pm-error" : ""}`}
                      value={form.planExpiryDate ?? ""}
                      onChange={e => setField("planExpiryDate", e.target.value || null)} />
                    {fieldErrors.planExpiryDate && <span className="pm-input-error">{fieldErrors.planExpiryDate}</span>}
                  </div>

                  <hr className="pm-section-divider" />

                  {/* Benefits */}
                  <div className="pm-field pm-form-full">
                    <label className="pm-label">Benefits</label>
                    {form.benefits.map((b, i) => (
                      <div key={i} className="pm-benefit-row">
                        <input className="pm-input" value={b}
                          onChange={e => {
                            const updated = [...form.benefits];
                            updated[i] = e.target.value;
                            setField("benefits", updated);
                          }} />
                        <button type="button" className="pm-btn pm-btn-danger pm-btn-icon"
                          onClick={() => removeBenefit(i)} title="Remove"><X size={14} /></button>
                      </div>
                    ))}
                    <div className="pm-benefit-row" style={{ marginTop: 4 }}>
                      <input className="pm-input" placeholder="Add a benefit\u2026"
                        value={newBenefit} onChange={e => setNewBenefit(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addBenefit(); } }} />
                      <button type="button" className="pm-btn pm-btn-ghost pm-btn-icon"
                        onClick={addBenefit} title="Add"><Plus size={14} /></button>
                    </div>
                  </div>

                  {/* isActive */}
                  <div className="pm-field pm-form-full">
                    <label className="pm-checkbox-row">
                      <input type="checkbox" checked={form.isActive}
                        onChange={e => setField("isActive", e.target.checked)} />
                      <span style={{ color: "#e4e2f0", fontSize: "0.9rem" }}>Plan is active (drivers can purchase)</span>
                    </label>
                  </div>

                </div>

                <div className="pm-modal-footer">
                  <button className="pm-btn pm-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                  <button className="pm-btn pm-btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving\u2026" : editingPlan ? "Update Plan" : "Create Plan"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {confirmDelete && (
          <div className="pm-overlay" onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null); }}>
            <div className="pm-confirm">
              <Trash2 size={32} color="#f87171" style={{ margin: "0 auto 12px", display: "block" }} />
              <h3>Delete Plan?</h3>
              {(confirmDelete.totalPurchases ?? 0) > 0 ? (
                <>
                  <p style={{ color: "#f87171" }}>
                    This plan has <strong>{confirmDelete.totalPurchases}</strong> purchase(s).
                    Deleting plans with existing purchases is not allowed.
                  </p>
                  <div className="pm-confirm-btns">
                    <button className="pm-btn pm-btn-ghost" onClick={() => setConfirmDelete(null)}>Close</button>
                  </div>
                </>
              ) : (
                <>
                  <p>Are you sure you want to delete <strong style={{ color: "#e4e2f0" }}>"{confirmDelete.planName}"</strong>? This cannot be undone.</p>
                  <div className="pm-confirm-btns">
                    <button className="pm-btn pm-btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
                    <button className="pm-btn pm-btn-danger" onClick={handleDelete} disabled={deleting}>
                      {deleting ? "Deleting\u2026" : "Yes, Delete"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Purchase History Modal */}
        {purchasePlan && (
          <div className="pm-overlay" onClick={e => { if (e.target === e.currentTarget) setPurchasePlan(null); }}>
            <div className="pm-modal">
              <div className="pm-modal-hdr">
                <h2 className="pm-modal-title">Purchases \u2014 {purchasePlan.planName}</h2>
                <button className="pm-modal-close" onClick={() => setPurchasePlan(null)}><X size={20} /></button>
              </div>
              <div className="pm-modal-body">
                {purchasesLoading ? (
                  <div className="pm-loading" style={{ padding: "32px" }}>
                    <div className="pm-spinner" /><p>Loading\u2026</p>
                  </div>
                ) : purchases.length === 0 ? (
                  <div className="pm-empty" style={{ padding: "32px" }}>
                    <p>No purchases yet for this plan.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="pm-purchase-table">
                      <thead>
                        <tr>
                          <th>Driver</th><th>Amount Paid</th><th>Purchase Date</th><th>Status</th><th>Valid Till</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchases.map(r => (
                          <tr key={r._id}>
                            <td>
                              <div>{r.driverName || "Unknown"}</div>
                              {r.driverPhone && <div style={{ color: "#5c5a72", fontSize: "0.78rem" }}>{r.driverPhone}</div>}
                            </td>
                            <td>{inr(r.amountPaid)}</td>
                            <td>{fmtDate(r.purchaseDate)}</td>
                            <td>
                              <span className={`pm-badge ${r.status === "active" ? "pm-badge-active" : "pm-badge-inactive"}`}>
                                {r.status}
                              </span>
                            </td>
                            <td>{fmtDate(r.validTill)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default PlanManagement;
