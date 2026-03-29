import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { planApi, type CreatePlanDto, type RevenueStats } from '../api/planApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  _id: string;
  planName: string;
  planType: 'basic' | 'standard' | 'premium';
  description: string;
  planPrice: number;
  durationDays: number;
  commissionRate: number;
  noCommission: boolean;
  perRideIncentive: number;
  platformFeeFlat: number;
  platformFeePercent: number;
  isTimeBasedPlan: boolean;
  planStartTime?: string;
  planEndTime?: string;
  benefits: string[];
  isActive: boolean;
  totalPurchases: number;
  totalRevenueGenerated: number;
  planActivationDate?: string;
  planExpiryDate?: string;
  createdAt: string;
}

interface PurchaseHistoryItem {
  _id: string;
  driver: { _id: string; name: string; phone: string };
  amountPaid: number;
  createdAt: string;
  paymentStatus: string;
  expiryDate: string;
}

const EMPTY_FORM: CreatePlanDto = {
  planName: '',
  planType: 'basic',
  description: '',
  planPrice: 0,
  durationDays: 30,
  commissionRate: 10,
  noCommission: false,
  perRideIncentive: 0,
  platformFeeFlat: 0,
  platformFeePercent: 0,
  monthlyFee: 0,
  isTimeBasedPlan: false,
  planStartTime: '',
  planEndTime: '',
  benefits: [],
  isActive: true,
  planActivationDate: null,
  planExpiryDate: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  basic: 'bg-blue-100 text-blue-800',
  standard: 'bg-orange-100 text-orange-800',
  premium: 'bg-purple-100 text-purple-800',
};

const fmt = (n: number | null | undefined) =>
  `₹${(n ?? 0).toLocaleString('en-IN')}`;

const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Component ────────────────────────────────────────────────────────────────

const PlanManagement: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<CreatePlanDto>(EMPTY_FORM);
  const [benefitInput, setBenefitInput] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [historyPlan, setHistoryPlan] = useState<Plan | null>(null);
  const [history, setHistory] = useState<PurchaseHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // ── Fetchers ──

  const fetchPlans = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filterType) params.planType = filterType;
      if (filterActive) params.isActive = filterActive;
      const res = await planApi.getPlans(params);
      setPlans(res.data.data || []);
    } catch {
      setError('Failed to load plans');
    }
  }, [filterType, filterActive]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await planApi.getRevenueStats();
      const payload = res.data?.data ?? res.data;
      if (payload && typeof payload.totalRevenue === 'number') {
        setStats(payload);
      }
    } catch {
      // fallback: aggregate locally
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchPlans(), fetchStats()]);
      setLoading(false);
    })();
  }, [fetchPlans, fetchStats]);

  const derivedStats = useMemo(() => {
    if (stats) return stats;
    const totalRevenue = plans.reduce((s, p) => s + (p.totalRevenueGenerated || 0), 0);
    const totalPurchases = plans.reduce((s, p) => s + (p.totalPurchases || 0), 0);
    const activePlansCount = plans.filter((p) => p.isActive).length;
    const mostPopularPlan = plans.reduce<Plan | null>(
      (best, p) => (!best || p.totalPurchases > best.totalPurchases ? p : best),
      null
    );
    return {
      totalRevenue,
      totalPurchases,
      activePlansCount,
      mostPopularPlan: mostPopularPlan
        ? { planName: mostPopularPlan.planName, totalPurchases: mostPopularPlan.totalPurchases }
        : null,
    };
  }, [stats, plans]);

  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (filterType && p.planType !== filterType) return false;
      if (filterActive === 'true' && !p.isActive) return false;
      if (filterActive === 'false' && p.isActive) return false;
      return true;
    });
  }, [plans, filterType, filterActive]);

  // ── Validation ──

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.planName.trim()) errs.planName = 'Plan name is required';
    if (form.planPrice < 0) errs.planPrice = 'Price must be ≥ 0';
    if (form.durationDays < 1) errs.durationDays = 'Duration must be ≥ 1 day';
    if (!form.noCommission && (form.commissionRate < 0 || form.commissionRate > 100))
      errs.commissionRate = 'Commission must be 0–100';
    if (form.perRideIncentive < 0) errs.perRideIncentive = 'Incentive must be ≥ 0';
    if (form.platformFeeFlat < 0) errs.platformFeeFlat = 'Platform fee must be ≥ 0';
    if (form.planActivationDate && form.planExpiryDate && form.planActivationDate > form.planExpiryDate)
      errs.planExpiryDate = 'Expiry must be after activation date';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Modal open ──

  const openCreate = () => {
    setEditPlan(null);
    setForm(EMPTY_FORM);
    setBenefitInput('');
    setFormErrors({});
    setShowModal(true);
  };

  const openEdit = (plan: Plan) => {
    setEditPlan(plan);
    setForm({
      planName: plan.planName,
      planType: plan.planType,
      description: plan.description || '',
      planPrice: plan.planPrice,
      durationDays: plan.durationDays,
      commissionRate: plan.commissionRate,
      noCommission: plan.noCommission,
      perRideIncentive: plan.perRideIncentive ?? 0,
      platformFeeFlat: plan.platformFeeFlat ?? 0,
      platformFeePercent: plan.platformFeePercent ?? 0,
      monthlyFee: 0,
      isTimeBasedPlan: plan.isTimeBasedPlan,
      planStartTime: plan.planStartTime || '',
      planEndTime: plan.planEndTime || '',
      benefits: [...plan.benefits],
      isActive: plan.isActive,
      planActivationDate: plan.planActivationDate ? plan.planActivationDate.slice(0, 10) : null,
      planExpiryDate: plan.planExpiryDate ? plan.planExpiryDate.slice(0, 10) : null,
    });
    setBenefitInput('');
    setFormErrors({});
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        planPrice: Number(form.planPrice) || 0,
        durationDays: Number(form.durationDays) || 30,
        commissionRate: form.noCommission ? 0 : (Number(form.commissionRate) || 0),
        perRideIncentive: Number(form.perRideIncentive) || 0,
        platformFeeFlat: Number(form.platformFeeFlat) || 0,
        platformFeePercent: Number(form.platformFeePercent) || 0,
        planActivationDate: form.planActivationDate || null,
        planExpiryDate: form.planExpiryDate || null,
        planStartTime: form.isTimeBasedPlan ? form.planStartTime : '',
        planEndTime: form.isTimeBasedPlan ? form.planEndTime : '',
      };
      if (editPlan) {
        await planApi.updatePlan(editPlan._id, payload);
      } else {
        await planApi.createPlan(payload);
      }
      setShowModal(false);
      await Promise.all([fetchPlans(), fetchStats()]);
    } catch (e: any) {
      setFormErrors({ _general: e?.response?.data?.message || 'Failed to save plan' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (plan: Plan) => {
    setPlans((prev) =>
      prev.map((p) => (p._id === plan._id ? { ...p, isActive: !p.isActive } : p))
    );
    try {
      await planApi.togglePlan(plan._id);
      await fetchStats();
    } catch {
      setPlans((prev) =>
        prev.map((p) => (p._id === plan._id ? { ...p, isActive: plan.isActive } : p))
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await planApi.deletePlan(deleteTarget._id);
      setDeleteTarget(null);
      await fetchPlans();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete plan');
    } finally {
      setDeleting(false);
    }
  };

  const openHistory = async (plan: Plan) => {
    setHistoryPlan(plan);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const res = await planApi.getPurchaseHistory(plan._id);
      setHistory(res.data.data || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const addBenefit = () => {
    if (benefitInput.trim()) {
      setForm((f) => ({ ...f, benefits: [...f.benefits, benefitInput.trim()] }));
      setBenefitInput('');
    }
  };
  const removeBenefit = (i: number) =>
    setForm((f) => ({ ...f, benefits: f.benefits.filter((_, idx) => idx !== i) }));

  // ── Render ──

  if (loading)
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', background: '#08080f' }}>
        <div style={{ color: '#a78bfa', fontSize: 18 }}>Loading plans…</div>
      </div>
    );

  return (
    <>
      <style>{`
        .pm-wrap { background: #08080f; min-height: 100vh; padding: 28px; font-family: 'DM Sans', sans-serif; color: #e8e8f0; }
        .pm-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
        .pm-title { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 700; color: #e8e8f0; }
        .pm-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 28px; }
        .pm-stat-card { background: linear-gradient(135deg,#1a1a2e,#16213e); border: 1px solid #2d2d44; border-radius: 12px; padding: 18px; }
        .pm-stat-label { font-size: 12px; color: #9898b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .5px; }
        .pm-stat-value { font-size: 22px; font-weight: 700; color: #a78bfa; }
        .pm-filters { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
        .pm-select { background: #1a1a2e; border: 1px solid #2d2d44; color: #e8e8f0; padding: 8px 12px; border-radius: 8px; font-size: 13px; }
        .pm-btn { padding: 8px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; border: none; font-size: 13px; transition: opacity .2s; }
        .pm-btn:disabled { opacity: .5; cursor: not-allowed; }
        .pm-btn-primary { background: #7c3aed; color: #fff; }
        .pm-btn-primary:hover:not(:disabled) { background: #6d28d9; }
        .pm-btn-danger { background: rgba(239,68,68,.15); color: #ef4444; border: 1px solid rgba(239,68,68,.3); }
        .pm-btn-ghost { background: transparent; color: #9898b8; border: 1px solid #2d2d44; }
        .pm-table-wrap { background: linear-gradient(135deg,#1a1a2e,#16213e); border: 1px solid #2d2d44; border-radius: 14px; overflow: auto; }
        table.pm-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .pm-table th { padding: 12px 16px; text-align: left; color: #9898b8; font-weight: 600; border-bottom: 1px solid #2d2d44; white-space: nowrap; }
        .pm-table td { padding: 13px 16px; border-bottom: 1px solid #1a1a2e; vertical-align: middle; }
        .pm-table tr:last-child td { border-bottom: none; }
        .pm-table tr:hover td { background: rgba(167,139,250,.04); }
        .pm-badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .pm-badge-basic { background: rgba(29,78,216,.15); color: #60a5fa; }
        .pm-badge-standard { background: rgba(184,95,0,.15); color: #f97316; }
        .pm-badge-premium { background: rgba(124,58,237,.15); color: #a78bfa; }
        .pm-toggle { position: relative; display: inline-block; width: 40px; height: 22px; }
        .pm-toggle input { opacity: 0; width: 0; height: 0; }
        .pm-toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #2d2d44; border-radius: 22px; transition: .3s; }
        .pm-toggle-slider:before { content: ''; position: absolute; height: 16px; width: 16px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: .3s; }
        input:checked + .pm-toggle-slider { background: #7c3aed; }
        input:checked + .pm-toggle-slider:before { transform: translateX(18px); }
        /* Modal */
        .pm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .pm-modal { background: #12121e; border: 1px solid #2d2d44; border-radius: 16px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
        .pm-modal-header { padding: 20px 24px 16px; border-bottom: 1px solid #2d2d44; display: flex; align-items: center; justify-content: space-between; }
        .pm-modal-title { font-size: 18px; font-weight: 700; color: #e8e8f0; }
        .pm-modal-body { padding: 20px 24px; }
        .pm-modal-footer { padding: 16px 24px; border-top: 1px solid #2d2d44; display: flex; gap: 10px; justify-content: flex-end; }
        .pm-form-group { margin-bottom: 16px; }
        .pm-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        .pm-label { display: block; font-size: 12px; color: #9898b8; margin-bottom: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
        .pm-input { width: 100%; background: #1a1a2e; border: 1px solid #2d2d44; color: #e8e8f0; padding: 9px 12px; border-radius: 8px; font-size: 13px; box-sizing: border-box; }
        .pm-input:focus { outline: none; border-color: #7c3aed; }
        .pm-input.error { border-color: #ef4444; }
        .pm-error-text { color: #ef4444; font-size: 11px; margin-top: 4px; }
        .pm-checkbox-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; cursor: pointer; }
        .pm-checkbox-row input { width: 16px; height: 16px; accent-color: #7c3aed; }
        .pm-benefits-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
        .pm-benefit-tag { background: rgba(124,58,237,.15); border: 1px solid rgba(124,58,237,.3); color: #a78bfa; border-radius: 20px; padding: 3px 10px; font-size: 12px; display: flex; align-items: center; gap: 4px; }
        .pm-benefit-remove { cursor: pointer; color: #ef4444; font-size: 14px; line-height: 1; }
      `}</style>

      <div className="pm-wrap">
        {/* Header */}
        <div className="pm-header">
          <h1 className="pm-title">Driver Incentive Plans</h1>
          <button className="pm-btn pm-btn-primary" onClick={openCreate}>+ Create Plan</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '10px 16px', marginBottom: 20, color: '#ef4444', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="pm-stats">
          <div className="pm-stat-card">
            <div className="pm-stat-label">Total Revenue</div>
            <div className="pm-stat-value">{fmt(derivedStats.totalRevenue)}</div>
          </div>
          <div className="pm-stat-card">
            <div className="pm-stat-label">Total Purchases</div>
            <div className="pm-stat-value">{derivedStats.totalPurchases}</div>
          </div>
          <div className="pm-stat-card">
            <div className="pm-stat-label">Active Plans</div>
            <div className="pm-stat-value">{derivedStats.activePlansCount}</div>
          </div>
          <div className="pm-stat-card">
            <div className="pm-stat-label">Most Popular</div>
            <div className="pm-stat-value" style={{ fontSize: 14, paddingTop: 4 }}>
              {derivedStats.mostPopularPlan?.planName ?? '—'}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="pm-filters">
          <select className="pm-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="basic">Basic</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </select>
          <select className="pm-select" value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <span style={{ color: '#9898b8', fontSize: 13 }}>{filteredPlans.length} plan{filteredPlans.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="pm-table-wrap">
          <table className="pm-table">
            <thead>
              <tr>
                <th>Plan Name</th>
                <th>Type</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Commission</th>
                <th>Incentive</th>
                <th>Platform Fee</th>
                <th>Purchases</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', color: '#9898b8', padding: 32 }}>
                    No plans found. Create one to get started.
                  </td>
                </tr>
              ) : filteredPlans.map((plan) => (
                <tr key={plan._id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#e8e8f0' }}>{plan.planName}</div>
                    {plan.description && (
                      <div style={{ color: '#9898b8', fontSize: 11, marginTop: 2 }}>
                        {plan.description.slice(0, 50)}{plan.description.length > 50 ? '…' : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`pm-badge pm-badge-${plan.planType}`}>{plan.planType}</span>
                  </td>
                  <td style={{ color: '#a78bfa', fontWeight: 600 }}>{fmt(plan.planPrice)}</td>
                  <td>{plan.durationDays}d</td>
                  <td>{plan.noCommission ? <span style={{ color: '#10b981', fontWeight: 600 }}>0%</span> : `${plan.commissionRate}%`}</td>
                  <td>{plan.perRideIncentive > 0 ? <span style={{ color: '#10b981' }}>₹{plan.perRideIncentive}</span> : <span style={{ color: '#9898b8' }}>—</span>}</td>
                  <td>{(plan.platformFeeFlat > 0 || plan.platformFeePercent > 0)
                    ? <span style={{ color: '#f59e0b' }}>{plan.platformFeeFlat > 0 ? `₹${plan.platformFeeFlat}` : `${plan.platformFeePercent}%`}</span>
                    : <span style={{ color: '#9898b8' }}>—</span>}
                  </td>
                  <td>{plan.totalPurchases}</td>
                  <td>
                    <label className="pm-toggle">
                      <input type="checkbox" checked={plan.isActive} onChange={() => handleToggle(plan)} />
                      <span className="pm-toggle-slider" />
                    </label>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="pm-btn pm-btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }}
                        onClick={() => openEdit(plan)}>Edit</button>
                      <button className="pm-btn pm-btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }}
                        onClick={() => openHistory(plan)}>History</button>
                      <button className="pm-btn pm-btn-danger" style={{ padding: '5px 10px', fontSize: 12 }}
                        onClick={() => setDeleteTarget(plan)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create / Edit Modal ── */}
      {showModal && (
        <div className="pm-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="pm-modal">
            <div className="pm-modal-header">
              <div className="pm-modal-title">{editPlan ? 'Edit Plan' : 'Create New Plan'}</div>
              <button className="pm-btn pm-btn-ghost" style={{ padding: '4px 10px' }} onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="pm-modal-body">
              {formErrors._general && (
                <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '8px 14px', marginBottom: 14, color: '#ef4444', fontSize: 13 }}>
                  {formErrors._general}
                </div>
              )}

              <div className="pm-form-row">
                <div>
                  <label className="pm-label">Plan Name *</label>
                  <input className={`pm-input${formErrors.planName ? ' error' : ''}`} value={form.planName}
                    onChange={(e) => setForm((f) => ({ ...f, planName: e.target.value }))} placeholder="e.g. Zero Commission Plan" />
                  {formErrors.planName && <div className="pm-error-text">{formErrors.planName}</div>}
                </div>
                <div>
                  <label className="pm-label">Plan Type</label>
                  <select className="pm-input" value={form.planType}
                    onChange={(e) => setForm((f) => ({ ...f, planType: e.target.value as any }))}>
                    <option value="basic">Basic</option>
                    <option value="standard">Standard</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
              </div>

              <div className="pm-form-group">
                <label className="pm-label">Description</label>
                <textarea className="pm-input" rows={2} value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of this plan" style={{ resize: 'vertical' }} />
              </div>

              <div className="pm-form-row">
                <div>
                  <label className="pm-label">Price (₹) *</label>
                  <input type="number" min={0} className={`pm-input${formErrors.planPrice ? ' error' : ''}`}
                    value={form.planPrice}
                    onChange={(e) => setForm((f) => ({ ...f, planPrice: parseFloat(e.target.value) || 0 }))} />
                  {formErrors.planPrice && <div className="pm-error-text">{formErrors.planPrice}</div>}
                </div>
                <div>
                  <label className="pm-label">Duration (Days) *</label>
                  <input type="number" min={1} className={`pm-input${formErrors.durationDays ? ' error' : ''}`}
                    value={form.durationDays}
                    onChange={(e) => setForm((f) => ({ ...f, durationDays: parseInt(e.target.value) || 1 }))} />
                  {formErrors.durationDays && <div className="pm-error-text">{formErrors.durationDays}</div>}
                </div>
              </div>

              <label className="pm-checkbox-row">
                <input type="checkbox" checked={form.noCommission}
                  onChange={(e) => setForm((f) => ({ ...f, noCommission: e.target.checked, commissionRate: e.target.checked ? 0 : f.commissionRate }))} />
                <span style={{ color: '#e8e8f0', fontSize: 13 }}>Zero Commission Plan (0% commission on all rides)</span>
              </label>

              <div className="pm-form-row">
                <div>
                  <label className="pm-label">Commission Rate (%)</label>
                  <input type="number" min={0} max={100} disabled={form.noCommission}
                    className={`pm-input${formErrors.commissionRate ? ' error' : ''}`}
                    style={form.noCommission ? { opacity: 0.4 } : {}}
                    value={form.noCommission ? 0 : form.commissionRate}
                    onChange={(e) => setForm((f) => ({ ...f, commissionRate: parseFloat(e.target.value) || 0 }))} />
                  {formErrors.commissionRate && <div className="pm-error-text">{formErrors.commissionRate}</div>}
                </div>
                <div>
                  <label className="pm-label">Per-Ride Incentive (₹)</label>
                  <input type="number" min={0} step={0.5}
                    className={`pm-input${formErrors.perRideIncentive ? ' error' : ''}`}
                    value={form.perRideIncentive}
                    onChange={(e) => setForm((f) => ({ ...f, perRideIncentive: parseFloat(e.target.value) || 0 }))} />
                  <div style={{ color: '#9898b8', fontSize: 11, marginTop: 3 }}>Cash credited to driver per completed ride (0 = hidden from driver)</div>
                  {formErrors.perRideIncentive && <div className="pm-error-text">{formErrors.perRideIncentive}</div>}
                </div>
              </div>

              <div className="pm-form-row">
                <div>
                  <label className="pm-label">Platform Fee — Flat (₹)</label>
                  <input type="number" min={0} step={1}
                    className={`pm-input${formErrors.platformFeeFlat ? ' error' : ''}`}
                    value={form.platformFeeFlat}
                    onChange={(e) => setForm((f) => ({ ...f, platformFeeFlat: parseFloat(e.target.value) || 0 }))} />
                  <div style={{ color: '#9898b8', fontSize: 11, marginTop: 3 }}>Fixed ₹ added to customer fare</div>
                  {formErrors.platformFeeFlat && <div className="pm-error-text">{formErrors.platformFeeFlat}</div>}
                </div>
                <div>
                  <label className="pm-label">Platform Fee — Percent (%)</label>
                  <input type="number" min={0} max={100} step={0.5}
                    className="pm-input"
                    value={form.platformFeePercent}
                    onChange={(e) => setForm((f) => ({ ...f, platformFeePercent: parseFloat(e.target.value) || 0 }))} />
                  <div style={{ color: '#9898b8', fontSize: 11, marginTop: 3 }}>% of fare added to customer bill</div>
                </div>
              </div>

              {/* Benefits */}
              <div className="pm-form-group">
                <label className="pm-label">Benefits</label>
                <div className="pm-benefits-list">
                  {form.benefits.map((b, i) => (
                    <span key={i} className="pm-benefit-tag">
                      {b} <span className="pm-benefit-remove" onClick={() => removeBenefit(i)}>×</span>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="pm-input" style={{ flex: 1 }} placeholder="e.g. Zero commission" value={benefitInput}
                    onChange={(e) => setBenefitInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addBenefit(); } }} />
                  <button className="pm-btn pm-btn-ghost" onClick={addBenefit}>Add</button>
                </div>
              </div>

              {/* Time-based plan */}
              <label className="pm-checkbox-row">
                <input type="checkbox" checked={form.isTimeBasedPlan}
                  onChange={(e) => setForm((f) => ({ ...f, isTimeBasedPlan: e.target.checked }))} />
                <span style={{ color: '#e8e8f0', fontSize: 13 }}>Time-Based Plan (restrict benefits to specific hours)</span>
              </label>
              {form.isTimeBasedPlan && (
                <div className="pm-form-row" style={{ marginTop: 0 }}>
                  <div>
                    <label className="pm-label">Start Time</label>
                    <input type="time" className="pm-input" value={form.planStartTime}
                      onChange={(e) => setForm((f) => ({ ...f, planStartTime: e.target.value }))} />
                  </div>
                  <div>
                    <label className="pm-label">End Time</label>
                    <input type="time" className="pm-input" value={form.planEndTime}
                      onChange={(e) => setForm((f) => ({ ...f, planEndTime: e.target.value }))} />
                  </div>
                </div>
              )}

              {/* Offer window */}
              <div className="pm-form-row">
                <div>
                  <label className="pm-label">Offer Activation Date</label>
                  <input type="date" className="pm-input" value={form.planActivationDate || ''}
                    onChange={(e) => setForm((f) => ({ ...f, planActivationDate: e.target.value || null }))} />
                  <div style={{ color: '#9898b8', fontSize: 11, marginTop: 3 }}>Leave blank = always available</div>
                </div>
                <div>
                  <label className="pm-label">Offer Expiry Date</label>
                  <input type="date" className={`pm-input${formErrors.planExpiryDate ? ' error' : ''}`}
                    value={form.planExpiryDate || ''}
                    onChange={(e) => setForm((f) => ({ ...f, planExpiryDate: e.target.value || null }))} />
                  {formErrors.planExpiryDate && <div className="pm-error-text">{formErrors.planExpiryDate}</div>}
                  <div style={{ color: '#9898b8', fontSize: 11, marginTop: 3 }}>Leave blank = never expires</div>
                </div>
              </div>

              {/* Active toggle */}
              <label className="pm-checkbox-row">
                <input type="checkbox" checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
                <span style={{ color: '#e8e8f0', fontSize: 13 }}>Plan is active (visible to drivers)</span>
              </label>
            </div>
            <div className="pm-modal-footer">
              <button className="pm-btn pm-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="pm-btn pm-btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Saving…' : editPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="pm-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div className="pm-modal" style={{ maxWidth: 420 }}>
            <div className="pm-modal-header">
              <div className="pm-modal-title">Delete Plan</div>
            </div>
            <div className="pm-modal-body">
              {deleteTarget.totalPurchases > 0 ? (
                <div style={{ color: '#f59e0b', fontSize: 14 }}>
                  ⚠️ This plan has <strong>{deleteTarget.totalPurchases}</strong> purchase(s). You cannot delete it.
                </div>
              ) : (
                <div style={{ color: '#e8e8f0', fontSize: 14 }}>
                  Are you sure you want to delete <strong>{deleteTarget.planName}</strong>? This action cannot be undone.
                </div>
              )}
            </div>
            <div className="pm-modal-footer">
              <button className="pm-btn pm-btn-ghost" onClick={() => setDeleteTarget(null)}>Cancel</button>
              {deleteTarget.totalPurchases === 0 && (
                <button className="pm-btn pm-btn-danger" disabled={deleting} onClick={handleDelete}>
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Purchase History Modal ── */}
      {historyPlan && (
        <div className="pm-overlay" onClick={(e) => { if (e.target === e.currentTarget) setHistoryPlan(null); }}>
          <div className="pm-modal" style={{ maxWidth: 700 }}>
            <div className="pm-modal-header">
              <div className="pm-modal-title">Purchase History — {historyPlan.planName}</div>
              <button className="pm-btn pm-btn-ghost" style={{ padding: '4px 10px' }} onClick={() => setHistoryPlan(null)}>✕</button>
            </div>
            <div className="pm-modal-body">
              {historyLoading ? (
                <div style={{ textAlign: 'center', color: '#9898b8', padding: 24 }}>Loading…</div>
              ) : history.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9898b8', padding: 24 }}>No purchases found.</div>
              ) : (
                <div className="pm-table-wrap">
                  <table className="pm-table">
                    <thead>
                      <tr>
                        <th>Driver</th>
                        <th>Phone</th>
                        <th>Amount Paid</th>
                        <th>Purchase Date</th>
                        <th>Valid Till</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h._id}>
                          <td>{h.driver?.name || '—'}</td>
                          <td>{h.driver?.phone || '—'}</td>
                          <td style={{ color: '#a78bfa', fontWeight: 600 }}>{fmt(h.amountPaid)}</td>
                          <td>{fmtDate(h.createdAt)}</td>
                          <td>{fmtDate(h.expiryDate)}</td>
                          <td>
                            <span style={{
                              background: h.paymentStatus === 'completed' ? 'rgba(16,185,129,.15)' : 'rgba(245,158,11,.15)',
                              color: h.paymentStatus === 'completed' ? '#10b981' : '#f59e0b',
                              padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            }}>
                              {h.paymentStatus}
                            </span>
                          </td>
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
    </>
  );
};

export default PlanManagement;