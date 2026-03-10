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
  bonusMultiplier: number;
  noCommission: boolean;
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
  bonusMultiplier: 1.0,
  noCommission: false,
  isTimeBasedPlan: false,
  planStartTime: '',
  planEndTime: '',
  benefits: [],
  isActive: true,
  planActivationDate: '',
  planExpiryDate: '',
};

// ─── Helpers ──────────────────────────────────���───────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  basic: 'bg-blue-100 text-blue-800',
  standard: 'bg-orange-100 text-orange-800',
  premium: 'bg-purple-100 text-purple-800',
};

const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

// ─── Component ────────────────────────────────────────────────────────────────

const PlanManagement: React.FC = () => {
  // ── State ──
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState<CreatePlanDto>(EMPTY_FORM);
  const [benefitInput, setBenefitInput] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Purchase history
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
      setStats(res.data.data);
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

  // ── Derived stats (fallback when endpoint unavailable) ──
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

  // ── Filtered plans ──
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      if (filterType && p.planType !== filterType) return false;
      if (filterActive === 'true' && !p.isActive) return false;
      if (filterActive === 'false' && p.isActive) return false;
      return true;
    });
  }, [plans, filterType, filterActive]);

  // ── Form validation ──
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.planName.trim()) errs.planName = 'Plan name is required';
    if (form.planPrice < 0) errs.planPrice = 'Price must be ≥ 0';
    if (form.durationDays < 1) errs.durationDays = 'Duration must be ≥ 1 day';
    if (!form.noCommission && (form.commissionRate < 0 || form.commissionRate > 100))
      errs.commissionRate = 'Commission rate must be 0–100';
    if (form.bonusMultiplier < 1.0) errs.bonusMultiplier = 'Bonus multiplier must be ≥ 1.0';
    if (
      form.planActivationDate &&
      form.planExpiryDate &&
      new Date(form.planActivationDate) >= new Date(form.planExpiryDate)
    )
      errs.planExpiryDate = 'Expiry must be after activation date';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Open create modal ──
  const openCreate = () => {
    setEditPlan(null);
    setForm(EMPTY_FORM);
    setBenefitInput('');
    setFormErrors({});
    setShowModal(true);
  };

  // ── Open edit modal ──
  const openEdit = (plan: Plan) => {
    setEditPlan(plan);
    setForm({
      planName: plan.planName,
      planType: plan.planType,
      description: plan.description || '',
      planPrice: plan.planPrice,
      durationDays: plan.durationDays,
      commissionRate: plan.commissionRate,
      bonusMultiplier: plan.bonusMultiplier,
      noCommission: plan.noCommission,
      isTimeBasedPlan: plan.isTimeBasedPlan,
      planStartTime: plan.planStartTime || '',
      planEndTime: plan.planEndTime || '',
      benefits: [...plan.benefits],
      isActive: plan.isActive,
      planActivationDate: plan.planActivationDate ? plan.planActivationDate.slice(0, 10) : '',
      planExpiryDate: plan.planExpiryDate ? plan.planExpiryDate.slice(0, 10) : '',
    });
    setBenefitInput('');
    setFormErrors({});
    setShowModal(true);
  };

  // ── Save (create or update) ──
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editPlan) {
        await planApi.updatePlan(editPlan._id, form);
      } else {
        await planApi.createPlan(form);
      }
      setShowModal(false);
      await Promise.all([fetchPlans(), fetchStats()]);
    } catch (e: any) {
      setFormErrors({ _general: e?.response?.data?.message || 'Failed to save plan' });
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle ──
  const handleToggle = async (plan: Plan) => {
    // Optimistic update
    setPlans((prev) =>
      prev.map((p) => (p._id === plan._id ? { ...p, isActive: !p.isActive } : p))
    );
    try {
      await planApi.togglePlan(plan._id);
      await fetchStats();
    } catch {
      // Revert
      setPlans((prev) =>
        prev.map((p) => (p._id === plan._id ? { ...p, isActive: plan.isActive } : p))
      );
    }
  };

  // ── Delete ──
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

  // ── Purchase history ──
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

  // ── Benefit helpers ──
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Plan Management</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + Create Plan
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: fmt(derivedStats.totalRevenue) },
          { label: 'Total Purchases', value: derivedStats.totalPurchases },
          { label: 'Active Plans', value: derivedStats.activePlansCount },
          {
            label: 'Most Popular',
            value: derivedStats.mostPopularPlan?.planName || '—',
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1 truncate">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          <option value="basic">Basic</option>
          <option value="standard">Standard</option>
          <option value="premium">Premium</option>
        </select>
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Plan Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Name', 'Type', 'Price', 'Duration', 'Commission', 'Bonus', 'Purchases', 'Status', 'Actions'].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredPlans.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  No plans found
                </td>
              </tr>
            ) : (
              filteredPlans.map((plan) => (
                <tr key={plan._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{plan.planName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        TYPE_COLORS[plan.planType] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {plan.planType}
                    </span>
                  </td>
                  <td className="px-4 py-3">{fmt(plan.planPrice)}</td>
                  <td className="px-4 py-3">{plan.durationDays}d</td>
                  <td className="px-4 py-3">
                    {plan.noCommission ? (
                      <span className="text-green-600 font-semibold">0%</span>
                    ) : (
                      `${plan.commissionRate}%`
                    )}
                  </td>
                  <td className="px-4 py-3">{plan.bonusMultiplier}x</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openHistory(plan)}
                      className="text-blue-600 hover:underline"
                    >
                      {plan.totalPurchases}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.isActive}
                        onChange={() => handleToggle(plan)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-green-500 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(plan)}
                        className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(plan)}
                        className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100"
                        disabled={plan.totalPurchases > 0}
                        title={
                          plan.totalPurchases > 0
                            ? 'Cannot delete — has purchases. Deactivate instead.'
                            : 'Delete'
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Create/Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">
              {editPlan ? 'Edit Plan' : 'Create Plan'}
            </h2>

            {formErrors._general && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{formErrors._general}</p>
            )}

            {/* Basic Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
                <input
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    formErrors.planName ? 'border-red-400' : 'border-gray-300'
                  }`}
                  value={form.planName}
                  onChange={(e) => setForm((f) => ({ ...f, planName: e.target.value }))}
                />
                {formErrors.planName && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.planName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.planType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, planType: e.target.value as CreatePlanDto['planType'] }))
                  }
                >
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                <input
                  type="number"
                  min={0}
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    formErrors.planPrice ? 'border-red-400' : 'border-gray-300'
                  }`}
                  value={form.planPrice}
                  onChange={(e) => setForm((f) => ({ ...f, planPrice: Number(e.target.value) }))}
                />
                {formErrors.planPrice && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.planPrice}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (days) *
                </label>
                <input
                  type="number"
                  min={1}
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    formErrors.durationDays ? 'border-red-400' : 'border-gray-300'
                  }`}
                  value={form.durationDays}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, durationDays: Number(e.target.value) }))
                  }
                />
                {formErrors.durationDays && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.durationDays}</p>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <input
                    type="checkbox"
                    checked={form.noCommission}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, noCommission: e.target.checked, commissionRate: 0 }))
                    }
                  />
                  No Commission
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={form.noCommission}
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    form.noCommission ? 'bg-gray-100' : ''
                  } ${formErrors.commissionRate ? 'border-red-400' : 'border-gray-300'}`}
                  value={form.commissionRate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, commissionRate: Number(e.target.value) }))
                  }
                  placeholder="Commission Rate %"
                />
                {formErrors.commissionRate && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.commissionRate}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bonus Multiplier *
                </label>
                <input
                  type="number"
                  min={1}
                  step={0.1}
                  className={`w-full border rounded-lg px-3 py-2 text-sm ${
                    formErrors.bonusMultiplier ? 'border-red-400' : 'border-gray-300'
                  }`}
                  value={form.bonusMultiplier}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, bonusMultiplier: Number(e.target.value) }))
                  }
                />
                {formErrors.bonusMultiplier && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.bonusMultiplier}</p>
                )}
              </div>
            </div>

            {/* Time-based toggle */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.isTimeBasedPlan}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isTimeBasedPlan: e.target.checked }))
                  }
                />
                Time-based Plan
              </label>
              {form.isTimeBasedPlan && (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Time</label>
                    <input
                      type="time"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      value={form.planStartTime}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, planStartTime: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Time</label>
                    <input
                      type="time"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      value={form.planEndTime}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, planEndTime: e.target.value }))
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Offer window */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offer Activation Date
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.planActivationDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, planActivationDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offer Expiry Date
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form.planExpiryDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, planExpiryDate: e.target.value }))
                  }
                />
                {formErrors.planExpiryDate && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.planExpiryDate}</p>
                )}
              </div>
            </div>

            {/* Benefits */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Benefits</label>
              <div className="flex gap-2 mb-2">
                <input
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={benefitInput}
                  onChange={(e) => setBenefitInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBenefit())}
                  placeholder="Type a benefit and press Enter"
                />
                <button
                  type="button"
                  onClick={addBenefit}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.benefits.map((b, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs"
                  >
                    {b}
                    <button onClick={() => removeBenefit(i)} className="hover:text-red-500 ml-1">
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Active toggle */}
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Plan is Active
            </label>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : editPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Delete Plan</h2>
            {deleteTarget.totalPurchases > 0 ? (
              <p className="text-sm text-red-600">
                ⚠️ This plan has been purchased {deleteTarget.totalPurchases} time(s) and cannot be
                deleted. Please deactivate it instead.
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                Are you sure you want to delete{' '}
                <span className="font-semibold">{deleteTarget.planName}</span>? This action cannot
                be undone.
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              {deleteTarget.totalPurchases === 0 && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Purchase History Modal ── */}
      {historyPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Purchase History — {historyPlan.planName}
              </h2>
              <button
                onClick={() => setHistoryPlan(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : history.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No purchases yet</p>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Driver', 'Amount Paid', 'Purchase Date', 'Status', 'Valid Till'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {history.map((item) => (
                    <tr key={item._id}>
                      <td className="px-4 py-2">
                        <p className="font-medium">{item.driver?.name || '—'}</p>
                        <p className="text-xs text-gray-400">{item.driver?.phone}</p>
                      </td>
                      <td className="px-4 py-2">{fmt(item.amountPaid)}</td>
                      <td className="px-4 py-2">
                        {new Date(item.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            item.paymentStatus === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {item.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {item.expiryDate
                          ? new Date(item.expiryDate).toLocaleDateString('en-IN')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanManagement;