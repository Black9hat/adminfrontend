import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Coupon {
  _id: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxDiscountAmount: number | null;
  minFareAmount: number;
  applicableVehicles: string[];
  applicableFor: 'FIRST_RIDE' | 'NTH_RIDE' | 'EVERY_NTH_RIDE' | 'SPECIFIC_RIDES' | 'ALL_RIDES';
  rideNumber: number | null;
  specificRideNumbers: number[];
  maxUsagePerUser: number;
  totalUsageLimit: number | null;
  currentUsageCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  eligibleUserTypes: ('NEW' | 'EXISTING' | 'ALL')[];
  minRidesCompleted: number;
  maxRidesCompleted: number | null;
  createdAt: string;
}

interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  expiredCoupons: number;
  totalUsages: number;
  totalDiscountGiven: number;
  topCoupons: Array<{ _id: string; usageCount: number; totalDiscount: number }>;
}

interface AppSettings {
  welcomeCoupon: {
    enabled: boolean;
    discountAmount: number;
    fareAdjustment: number;
    code: string;
    validityDays: number;
  };
  coins: {
    enabled: boolean;
    coinsPerRide: number;
    conversionRate: number;
    maxDiscountPerRide: number;
    coinsRequiredForMaxDiscount: number;
    // Admin-controlled bonus tiers
    distanceBonuses: { label: string; maxKm: number | null; bonus: number }[];
    vehicleBonuses: { bike: number; auto: number; car: number; premium: number; xl: number };
    randomBonusCoins: number;
    randomBonusChance: number; // 0–1
  };
  referral: {
    enabled: boolean;
    // ── Cycle-based fields (new) ────────────────────────────────────────────
    baseReferralsRequired: number;
    extraReferralsPerCycle: number;
    baseCouponAmount: number;
    extraCouponAmount: number;
    baseCoinsReward: number;
    extraCoinsReward: number;
    maxReferralCycles: number;
    rewardCouponValidityDays: number;
    // ── Legacy / display fields (kept for backwards compat) ─────────────────
    referralsRequired: number;
    rewardCouponAmount: number;
    rewardCoins: number;
  };
}

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  usersWithCode: number;
  rewardsIssued: number;
  conversionRate: string;
  exhaustedCount: number;
  cycleBreakdown: { _id: number; count: number }[];
}

interface TopReferrer {
  _id: string;
  name: string;
  phone: string;
  referralCode: string;
  successfulReferrals: number;
  referralRewardClaimed: boolean;
  referralCycle: number;
  referralProgress: number;
  requiredReferrals: number;
}

interface ReferralRecord {
  _id: string;
  referrerId: { name: string; phone: string; referralCode: string };
  referredUserId: { name: string; phone: string; createdAt: string };
  firstRideCompleted: boolean;
  firstRideCompletedAt: string | null;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VEHICLE_OPTIONS = [
  { value: 'all', label: 'All Vehicles', icon: '🚗', color: 'blue' },
  { value: 'bike', label: 'Bike', icon: '🏍️', color: 'green' },
  { value: 'auto', label: 'Auto', icon: '🛺', color: 'yellow' },
  { value: 'car', label: 'Car', icon: '🚙', color: 'purple' },
  { value: 'premium', label: 'Premium', icon: '🚘', color: 'indigo' },
  { value: 'xl', label: 'XL', icon: '🚐', color: 'pink' },
];

const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
  return 'https://your-api-url.com';
};

const API_BASE = getApiBase();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAuthToken = () => localStorage.getItem('adminToken') || '';
const getAxiosConfig = () => ({
  headers: {
    Authorization: `Bearer ${getAuthToken()}`,
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).catch(() => {});
};

const getStatusBadge = (coupon: Coupon) => {
  const now = new Date();
  const validUntil = new Date(coupon.validUntil);
  if (validUntil < now)
    return <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">Expired</span>;
  if (!coupon.isActive)
    return <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Inactive</span>;
  return <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Active</span>;
};

const getVehicleBadges = (vehicles: string[]) => {
  const colorMap: Record<string, string> = {
    green: 'bg-green-100 text-green-800 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    pink: 'bg-pink-100 text-pink-800 border-pink-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  if (!vehicles || vehicles.length === 0 || vehicles.includes('all')) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
        🚗 All Vehicles
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {vehicles.map((v) => {
        const opt = VEHICLE_OPTIONS.find((o) => o.value === v);
        return (
          <span
            key={v}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${colorMap[opt?.color ?? 'blue']}`}
          >
            {opt?.icon || '🚗'} {opt?.label || v}
          </span>
        );
      })}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'coupons' | 'reward-config' | 'referrals';

const CouponsManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('coupons');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [message]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🎫 Rewards & Coupons</h1>
          <p className="text-gray-500 mt-1">Manage coupons, reward settings, and referrals</p>
        </div>
      </div>

      {/* Global message */}
      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg font-medium flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {(
          [
            { id: 'coupons', label: '🎫 Coupons' },
            { id: 'reward-config', label: '⚙️ Reward Config' },
            { id: 'referrals', label: '👥 Referrals' },
          ] as { id: Tab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'coupons' && <CouponsTab setMessage={setMessage} />}
      {activeTab === 'reward-config' && <RewardConfigTab setMessage={setMessage} />}
      {activeTab === 'referrals' && <ReferralsTab />}

      <div className="mt-8 text-center text-gray-400 text-xs">
        🎫 Rewards Management System • API: {API_BASE}
      </div>
    </div>
  );
};

// ─── Coupons Tab (unchanged logic, same as original) ─────────────────────────

const CouponsTab: React.FC<{
  setMessage: (m: { type: 'success' | 'error'; text: string } | null) => void;
}> = ({ setMessage }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const defaultForm = {
    code: '',
    description: '',
    discountType: 'FIXED' as 'PERCENTAGE' | 'FIXED',
    discountValue: 0,
    maxDiscountAmount: null as number | null,
    minFareAmount: 0,
    applicableVehicles: [] as string[],
    applicableFor: 'FIRST_RIDE' as Coupon['applicableFor'],
    rideNumber: null as number | null,
    specificRideNumbers: [] as number[],
    maxUsagePerUser: 1,
    totalUsageLimit: null as number | null,
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isActive: true,
    eligibleUserTypes: ['ALL'] as ('NEW' | 'EXISTING' | 'ALL')[],
    minRidesCompleted: 0,
    maxRidesCompleted: null as number | null,
  };

  const [formData, setFormData] = useState(defaultForm);

  useEffect(() => {
    fetchCoupons();
    fetchStats();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/admin/coupons`, getAxiosConfig());
      if (res.data.success) setCoupons(res.data.coupons || []);
      else setMessage({ type: 'error', text: res.data.error || 'Failed to load coupons' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.response?.data?.error || 'Failed to load coupons' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/admin/coupons-stats/overview`, getAxiosConfig());
      if (res.data.success) setStats(res.data.stats);
    } catch {}
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    } else if (type === 'number') {
      setFormData({ ...formData, [name]: value === '' ? null : Number(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleVehicleChange = (vehicle: string) => {
    let v = [...formData.applicableVehicles];
    if (vehicle === 'all') {
      v = v.includes('all') ? [] : ['all'];
    } else {
      v = v.filter((x) => x !== 'all');
      v = v.includes(vehicle) ? v.filter((x) => x !== vehicle) : [...v, vehicle];
    }
    setFormData({ ...formData, applicableVehicles: v });
  };

  const handleUserTypeChange = (type: 'NEW' | 'EXISTING' | 'ALL') => {
    let types = [...formData.eligibleUserTypes];
    if (type === 'ALL') {
      types = ['ALL'];
    } else {
      types = types.filter((t) => t !== 'ALL');
      types = types.includes(type) ? types.filter((t) => t !== type) : [...types, type];
      if (types.length === 0) types = ['ALL'];
    }
    setFormData({ ...formData, eligibleUserTypes: types });
  };

  const validate = () => {
    if (!formData.code.trim()) { setMessage({ type: 'error', text: 'Coupon code is required' }); return false; }
    if (!formData.description.trim()) { setMessage({ type: 'error', text: 'Description is required' }); return false; }
    if (!formData.discountValue || formData.discountValue <= 0) { setMessage({ type: 'error', text: 'Discount value must be > 0' }); return false; }
    if (!formData.validUntil) { setMessage({ type: 'error', text: 'Valid until is required' }); return false; }
    return true;
  };

  const buildPayload = () => ({
    code: formData.code.toUpperCase().trim(),
    description: formData.description.trim(),
    discountType: formData.discountType,
    discountValue: Number(formData.discountValue),
    maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : null,
    minFareAmount: Number(formData.minFareAmount) || 0,
    applicableVehicles: formData.applicableVehicles,
    applicableFor: formData.applicableFor,
    rideNumber: formData.rideNumber ? Number(formData.rideNumber) : null,
    specificRideNumbers: formData.specificRideNumbers,
    maxUsagePerUser: Number(formData.maxUsagePerUser) || 1,
    totalUsageLimit: formData.totalUsageLimit ? Number(formData.totalUsageLimit) : null,
    validFrom: formData.validFrom,
    validUntil: formData.validUntil,
    isActive: formData.isActive,
    eligibleUserTypes: formData.eligibleUserTypes,
    minRidesCompleted: Number(formData.minRidesCompleted) || 0,
    maxRidesCompleted: formData.maxRidesCompleted ? Number(formData.maxRidesCompleted) : null,
  });

  const handleCreateCoupon = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/admin/coupons`, buildPayload(), getAxiosConfig());
      if (res.data.success) {
        setMessage({ type: 'success', text: '✅ Coupon created!' });
        setShowCreateForm(false);
        setFormData(defaultForm);
        fetchCoupons(); fetchStats();
      } else setMessage({ type: 'error', text: res.data.error || 'Failed' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.response?.data?.error || 'Failed to create coupon' });
    } finally { setLoading(false); }
  };

  const handleUpdateCoupon = async () => {
    if (!editingCoupon || !validate()) return;
    setLoading(true);
    try {
      const res = await axios.put(`${API_BASE}/api/admin/coupons/${editingCoupon._id}`, buildPayload(), getAxiosConfig());
      if (res.data.success) {
        setMessage({ type: 'success', text: '✅ Coupon updated!' });
        setEditingCoupon(null); setShowCreateForm(false); setFormData(defaultForm);
        fetchCoupons(); fetchStats();
      } else setMessage({ type: 'error', text: res.data.error || 'Failed' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.response?.data?.error || 'Failed to update coupon' });
    } finally { setLoading(false); }
  };

  const handleDeleteCoupon = async (coupon: Coupon) => {
    if (!window.confirm(`Delete coupon "${coupon.code}"?`)) return;
    setLoading(true);
    try {
      const res = await axios.delete(`${API_BASE}/api/admin/coupons/${coupon._id}`, getAxiosConfig());
      if (res.data.success) { setMessage({ type: 'success', text: '✅ Deleted!' }); fetchCoupons(); fetchStats(); }
    } catch { setMessage({ type: 'error', text: 'Failed to delete' }); }
    finally { setLoading(false); }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    try {
      const res = await axios.patch(`${API_BASE}/api/admin/coupons/${coupon._id}/toggle`, {}, getAxiosConfig());
      if (res.data.success) { setMessage({ type: 'success', text: `✅ ${res.data.coupon.isActive ? 'Activated' : 'Deactivated'}!` }); fetchCoupons(); }
    } catch { setMessage({ type: 'error', text: 'Failed to toggle' }); }
  };

  const handleEditCoupon = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      minFareAmount: coupon.minFareAmount,
      applicableVehicles: coupon.applicableVehicles?.length ? coupon.applicableVehicles : ['all'],
      applicableFor: coupon.applicableFor,
      rideNumber: coupon.rideNumber,
      specificRideNumbers: coupon.specificRideNumbers || [],
      maxUsagePerUser: coupon.maxUsagePerUser,
      totalUsageLimit: coupon.totalUsageLimit,
      validFrom: coupon.validFrom?.split('T')[0] || '',
      validUntil: coupon.validUntil?.split('T')[0] || '',
      isActive: coupon.isActive,
      eligibleUserTypes: coupon.eligibleUserTypes || ['ALL'],
      minRidesCompleted: coupon.minRidesCompleted || 0,
      maxRidesCompleted: coupon.maxRidesCompleted,
    });
    setShowCreateForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total', value: stats.totalCoupons, icon: '🎫', color: 'orange' },
            { label: 'Active', value: stats.activeCoupons, icon: '✅', color: 'green' },
            { label: 'Expired', value: stats.expiredCoupons, icon: '⏰', color: 'gray' },
            { label: 'Used', value: stats.totalUsages, icon: '📊', color: 'blue' },
            { label: 'Discount Given', value: `₹${stats.totalDiscountGiven?.toFixed(0) || 0}`, icon: '💰', color: 'purple' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-4 border shadow-sm">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Create button */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowCreateForm(true); setEditingCoupon(null); setFormData(defaultForm); }}
          className="bg-orange-500 text-white px-5 py-2 rounded-lg hover:bg-orange-600 font-semibold flex items-center gap-2"
        >
          ➕ Create New Coupon
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white rounded-2xl shadow-lg p-6 border">
          <h2 className="text-xl font-bold mb-6">{editingCoupon ? '✏️ Edit Coupon' : '➕ Create New Coupon'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Code */}
            <div>
              <label className="block text-sm font-medium mb-1">Code <span className="text-red-500">*</span></label>
              <input
                name="code" value={formData.code}
                onChange={handleInputChange}
                disabled={!!editingCoupon}
                placeholder="e.g. SAVE20"
                className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500 uppercase disabled:bg-gray-50"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">Description <span className="text-red-500">*</span></label>
              <input
                name="description" value={formData.description}
                onChange={handleInputChange}
                placeholder="What is this coupon for?"
                className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Discount Type */}
            <div>
              <label className="block text-sm font-medium mb-1">Discount Type</label>
              <select name="discountType" value={formData.discountType} onChange={handleInputChange} className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500">
                <option value="FIXED">Fixed (₹)</option>
                <option value="PERCENTAGE">Percentage (%)</option>
              </select>
            </div>

            {/* Discount Value */}
            <div>
              <label className="block text-sm font-medium mb-1">Discount Value <span className="text-red-500">*</span></label>
              <input type="number" name="discountValue" value={formData.discountValue || ''} onChange={handleInputChange} min="0" className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500" />
            </div>

            {/* Max Discount (% only) */}
            {formData.discountType === 'PERCENTAGE' && (
              <div>
                <label className="block text-sm font-medium mb-1">Max Discount Amount (₹)</label>
                <input type="number" name="maxDiscountAmount" value={formData.maxDiscountAmount || ''} onChange={handleInputChange} min="0" className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500" />
              </div>
            )}

            {/* Min Fare */}
            <div>
              <label className="block text-sm font-medium mb-1">Minimum Fare (₹)</label>
              <input type="number" name="minFareAmount" value={formData.minFareAmount || ''} onChange={handleInputChange} min="0" className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500" />
            </div>

            {/* Vehicle Types */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">🚗 Applicable Vehicles</label>
              <div className="flex flex-wrap gap-2">
                {VEHICLE_OPTIONS.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => handleVehicleChange(v.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      formData.applicableVehicles.includes(v.value)
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <span>{v.icon}</span>
                    <span>{v.label}</span>
                    {formData.applicableVehicles.includes(v.value) && <span className="text-orange-500">✓</span>}
                  </button>
                ))}
              </div>
              {formData.applicableVehicles.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">⚠️ No vehicles selected — coupon won't match any ride</p>
              )}
            </div>

            {/* Applicable For */}
            <div>
              <label className="block text-sm font-medium mb-1">Applicable For</label>
              <select name="applicableFor" value={formData.applicableFor} onChange={handleInputChange} className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500">
                <option value="FIRST_RIDE">First Ride Only</option>
                <option value="NTH_RIDE">Nth Ride</option>
                <option value="EVERY_NTH_RIDE">Every Nth Ride</option>
                <option value="SPECIFIC_RIDES">Specific Ride Numbers</option>
                <option value="ALL_RIDES">All Rides</option>
              </select>
            </div>

            {/* Ride number */}
            {(formData.applicableFor === 'NTH_RIDE' || formData.applicableFor === 'EVERY_NTH_RIDE') && (
              <div>
                <label className="block text-sm font-medium mb-1">Ride Number</label>
                <input type="number" name="rideNumber" value={formData.rideNumber || ''} onChange={handleInputChange} min="1" className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500" />
              </div>
            )}

            {formData.applicableFor === 'SPECIFIC_RIDES' && (
              <div>
                <label className="block text-sm font-medium mb-1">Specific Ride Numbers (comma separated)</label>
                <input
                  type="text"
                  value={formData.specificRideNumbers.join(', ')}
                  onChange={(e) => {
                    const nums = e.target.value.split(',').map((n) => parseInt(n.trim())).filter((n) => !isNaN(n));
                    setFormData({ ...formData, specificRideNumbers: nums });
                  }}
                  placeholder="e.g. 5, 10, 15"
                  className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}

            {/* Usage limits */}
            <div>
              <label className="block text-sm font-medium mb-1">Max Uses Per User</label>
              <input type="number" name="maxUsagePerUser" value={formData.maxUsagePerUser} onChange={handleInputChange} min="1" className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Total Usage Limit <span className="text-gray-400 text-xs">(blank = unlimited)</span></label>
              <input type="number" name="totalUsageLimit" value={formData.totalUsageLimit || ''} onChange={handleInputChange} min="1" className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500" />
            </div>

            {/* User type */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Eligible User Types</label>
              <div className="flex gap-3">
                {(['ALL', 'NEW', 'EXISTING'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleUserTypeChange(t)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      formData.eligibleUserTypes.includes(t)
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {t === 'ALL' ? '👥 All Users' : t === 'NEW' ? '🆕 New Users' : '🔄 Existing Users'}
                  </button>
                ))}
              </div>
            </div>

            {/* Min / max rides */}
            <div>
              <label className="block text-sm font-medium mb-1">Min Rides Completed</label>
              <input type="number" name="minRidesCompleted" value={formData.minRidesCompleted} onChange={handleInputChange} min="0" className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Max Rides Completed <span className="text-gray-400 text-xs">(blank = no limit)</span></label>
              <input type="number" name="maxRidesCompleted" value={formData.maxRidesCompleted || ''} onChange={handleInputChange} min="0" className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500" />
            </div>

            {/* Dates */}
            <div>
              <label className="block text-sm font-medium mb-1">Valid From</label>
              <input type="date" name="validFrom" value={formData.validFrom} onChange={handleInputChange} className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Valid Until <span className="text-red-500">*</span></label>
              <input type="date" name="validUntil" value={formData.validUntil} onChange={handleInputChange} className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500" />
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-2">
              <input type="checkbox" name="isActive" id="isActive" checked={formData.isActive} onChange={handleInputChange} className="w-5 h-5 text-orange-500 focus:ring-orange-500 rounded" />
              <label htmlFor="isActive" className="text-sm font-medium cursor-pointer">Active (can be used immediately)</label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button onClick={() => { setShowCreateForm(false); setEditingCoupon(null); setFormData(defaultForm); }} disabled={loading} className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50">
              Cancel
            </button>
            <button onClick={editingCoupon ? handleUpdateCoupon : handleCreateCoupon} disabled={loading} className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">
              {loading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
              {editingCoupon ? '💾 Update Coupon' : '➕ Create Coupon'}
            </button>
          </div>
        </div>
      )}

      {/* Coupons list */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border">
        <h2 className="text-xl font-bold mb-4">All Coupons ({coupons.length})</h2>
        {loading && coupons.length === 0 ? (
          <div className="text-center py-12">
            <svg className="animate-spin h-8 w-8 mx-auto text-orange-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
            <p className="mt-3 text-gray-500">Loading coupons...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-3">🎫</div>
            <p>No coupons yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  {['Code', 'Description', 'Discount', '🚗 Vehicles', 'Applicable', 'Usage', 'Valid Until', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="p-3 font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon._id} className="border-b hover:bg-gray-50 transition">
                    <td className="p-3">
                      <span onClick={() => copyToClipboard(coupon.code)} className="font-mono font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded cursor-pointer hover:bg-orange-100" title="Click to copy">
                        {coupon.code}
                      </span>
                    </td>
                    <td className="p-3 max-w-xs truncate text-gray-600" title={coupon.description}>{coupon.description}</td>
                    <td className="p-3">
                      <span className="font-semibold">{coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}</span>
                      {coupon.maxDiscountAmount && <span className="text-xs text-gray-400 block">max ₹{coupon.maxDiscountAmount}</span>}
                    </td>
                    <td className="p-3">{getVehicleBadges(coupon.applicableVehicles)}</td>
                    <td className="p-3 text-gray-600">
                      {coupon.applicableFor === 'FIRST_RIDE' && '1st Ride'}
                      {coupon.applicableFor === 'NTH_RIDE' && `Ride #${coupon.rideNumber}`}
                      {coupon.applicableFor === 'EVERY_NTH_RIDE' && `Every ${coupon.rideNumber}th`}
                      {coupon.applicableFor === 'SPECIFIC_RIDES' && `Rides: ${coupon.specificRideNumbers?.join(', ')}`}
                      {coupon.applicableFor === 'ALL_RIDES' && 'All Rides'}
                    </td>
                    <td className="p-3 font-mono">{coupon.currentUsageCount || 0}{coupon.totalUsageLimit ? ` / ${coupon.totalUsageLimit}` : ''}</td>
                    <td className="p-3 text-gray-600">{new Date(coupon.validUntil).toLocaleDateString()}</td>
                    <td className="p-3">{getStatusBadge(coupon)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <button onClick={() => handleToggleStatus(coupon)} className={`px-2 py-1 rounded text-xs font-medium ${coupon.isActive ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                          {coupon.isActive ? '⏸️ Pause' : '▶️ Activate'}
                        </button>
                        <button onClick={() => handleEditCoupon(coupon)} className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200">✏️ Edit</button>
                        <button onClick={() => handleDeleteCoupon(coupon)} className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200">🗑️ Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Reward Config Tab ────────────────────────────────────────────────────────

interface WelcomeStats {
  totalEligible: number;
  totalUsed: number;
  totalPending: number;
  totalSavingsGiven: number;
}

interface CoinStats {
  totalUsersWithCoins: number;
  totalCoinsInCirculation: number;
  totalCoinsEverEarned: number;
  totalCoinsEverRedeemed: number;
  totalTransactions: number;
  usersEligibleForDiscount: number;
  coinsRequired: number;
  discountAmount: number;
  coinsEnabled: boolean;
}

const RewardConfigTab: React.FC<{
  setMessage: (m: { type: 'success' | 'error'; text: string } | null) => void;
}> = ({ setMessage }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [welcomeStats, setWelcomeStats] = useState<WelcomeStats | null>(null);
  const [coinStats, setCoinStats] = useState<CoinStats | null>(null);

  useEffect(() => { fetchSettings(); fetchWelcomeStats(); fetchCoinStats(); }, []);

  const fetchCoinStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/rewards/stats`, getAxiosConfig());
      if (res.data.success) setCoinStats(res.data.stats);
    } catch { /* non-critical */ }
  };

  const fetchWelcomeStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/coupons/welcome-stats`, getAxiosConfig());
      if (res.data.success) setWelcomeStats(res.data.stats);
    } catch { /* non-critical — silently skip if endpoint not yet live */ }
  };

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/admin/reward-config`, getAxiosConfig());
      if (res.data.success) setSettings(res.data.settings);
    } catch { setMessage({ type: 'error', text: 'Failed to load reward config' }); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await axios.put(`${API_BASE}/api/admin/reward-config`, settings, getAxiosConfig());
      if (res.data.success) { setMessage({ type: 'success', text: '✅ Reward config saved!' }); setSettings(res.data.settings); }
      else setMessage({ type: 'error', text: res.data.error || 'Failed' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.response?.data?.error || 'Failed to save' });
    } finally { setSaving(false); }
  };

  const update = (section: keyof AppSettings, key: string, value: any) => {
    if (!settings) return;
    setSettings({ ...settings, [section]: { ...settings[section], [key]: value } });
  };

  if (loading) return (
    <div className="text-center py-16">
      <svg className="animate-spin h-8 w-8 mx-auto text-orange-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
      <p className="mt-3 text-gray-500">Loading config...</p>
    </div>
  );
  if (!settings) return null;

  const SectionCard = ({ icon, title, subtitle, children }: { icon: string; title: string; subtitle: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl border shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-xl">{icon}</div>
        <div>
          <h3 className="font-bold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );

  const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      {children}
    </div>
  );

  const NumInput = ({ value, onChange, min, step, max }: { value: number; onChange: (v: number) => void; min?: number; step?: number; max?: number }) => (
      <input
        type="number"
        value={value}
        min={min ?? 0}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="border rounded-lg w-full p-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
      />
    );

  const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-orange-500' : 'bg-gray-200'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">

      {/* 🎁 Welcome Coupon Live Stats */}
      {settings?.welcomeCoupon.enabled && welcomeStats && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎁</span>
            <span className="font-bold text-orange-800 text-sm">Welcome Coupon — Live Stats</span>
            <button
              onClick={fetchWelcomeStats}
              className="ml-auto text-xs text-orange-600 hover:text-orange-800 underline"
            >
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Eligible Users', value: welcomeStats.totalEligible, icon: '👥' },
              { label: 'Used', value: welcomeStats.totalUsed, icon: '✅' },
              { label: 'Pending', value: welcomeStats.totalPending, icon: '⏳' },
              { label: 'Total Savings Given', value: `₹${welcomeStats.totalSavingsGiven ?? 0}`, icon: '💰' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-3 border border-orange-100 text-center">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-lg font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-orange-600 mt-3">
            Code: <strong>{settings.welcomeCoupon.code}</strong> &nbsp;·&nbsp;
            Discount: <strong>₹{settings.welcomeCoupon.discountAmount}</strong> &nbsp;·&nbsp;
            Internal markup: <strong>₹{settings.welcomeCoupon.fareAdjustment}</strong> &nbsp;·&nbsp;
            Net saving to customer:{' '}
            <strong style={{ color: settings.welcomeCoupon.discountAmount - settings.welcomeCoupon.fareAdjustment <= 0 ? '#dc2626' : 'inherit' }}>
              ₹{settings.welcomeCoupon.discountAmount - settings.welcomeCoupon.fareAdjustment}
              {settings.welcomeCoupon.discountAmount - settings.welcomeCoupon.fareAdjustment <= 0 ? ' ⚠️ FIX THIS!' : ''}
            </strong> &nbsp;·&nbsp;
            Valid for: <strong>{settings.welcomeCoupon.validityDays} days</strong> after sign-up
          </p>
        </div>
      )}

      {/* 🪙 Coin System Live Stats */}
      {settings?.coins.enabled && coinStats && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🪙</span>
            <span className="font-bold text-blue-800 text-sm">Coin System — Live Stats</span>
            <button
              onClick={fetchCoinStats}
              className="ml-auto text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {[
              { label: 'Users with Coins', value: coinStats.totalUsersWithCoins, icon: '👥' },
              { label: 'Coins in Circulation', value: coinStats.totalCoinsInCirculation.toLocaleString(), icon: '🪙' },
              { label: 'Ever Earned', value: coinStats.totalCoinsEverEarned.toLocaleString(), icon: '📈' },
              { label: 'Ever Redeemed', value: coinStats.totalCoinsEverRedeemed.toLocaleString(), icon: '💳' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-3 border border-blue-100 text-center">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-lg font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 items-center text-xs text-blue-700">
            <span>
              🎯 <strong>{coinStats.usersEligibleForDiscount}</strong> users eligible for ₹{coinStats.discountAmount} discount
              ({coinStats.coinsRequired} coins required)
            </span>
            <span>·</span>
            <span>📊 <strong>{coinStats.totalTransactions}</strong> total transactions</span>
            <span>·</span>
            <span>
              💰 ₹{(coinStats.totalCoinsEverRedeemed * (settings?.coins.conversionRate ?? 0.10)).toFixed(0)} total discounts given
            </span>
          </div>
        </div>
      )}
      {settings && !settings.coins.enabled && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center gap-3 text-sm text-gray-500">
          <span className="text-xl">🪙</span>
          <span>Coin system is currently <strong>disabled</strong>. Enable it in the config below.</span>
        </div>
      )}

      {/* Disabled notice */}
      {settings && !settings.welcomeCoupon.enabled && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex items-center gap-3 text-sm text-gray-500">
          <span className="text-xl">🎁</span>
          <span>Welcome coupon is currently <strong>disabled</strong>. Enable it in the config below to start giving first-ride discounts.</span>
        </div>
      )}

      {/* ── Welcome Coupon + Referral — side by side (unchanged) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Welcome Coupon */}
        <SectionCard icon="🎁" title="Welcome Coupon" subtitle="Auto-assigned to every new customer">
          <Toggle checked={settings.welcomeCoupon.enabled} onChange={(v) => update('welcomeCoupon', 'enabled', v)} label="Enable welcome coupon" />
          <Field label="Coupon Code">
            <input value={settings.welcomeCoupon.code} onChange={(e) => update('welcomeCoupon', 'code', e.target.value.toUpperCase())} className="border rounded-lg w-full p-2 focus:ring-2 focus:ring-orange-500 uppercase font-mono" />
          </Field>
          <Field label="Discount Amount (₹)" hint="How much off the customer gets">
            <NumInput value={settings.welcomeCoupon.discountAmount} onChange={(v) => update('welcomeCoupon', 'discountAmount', v)} min={1} />
          </Field>
          <Field label="Internal Fare Adjustment (₹)" hint="Added to fare before discount is applied (not shown to customer)">
            <NumInput value={settings.welcomeCoupon.fareAdjustment} onChange={(v) => update('welcomeCoupon', 'fareAdjustment', v)} min={0} />
          </Field>
          <Field label="Validity (days)" hint="How long new users have to use the coupon">
            <NumInput value={settings.welcomeCoupon.validityDays} onChange={(v) => update('welcomeCoupon', 'validityDays', v)} min={1} />
          </Field>
          <div className="mt-3 p-3 bg-orange-50 rounded-lg text-xs text-orange-700">
            <strong>Example:</strong> Ride ₹100 → adjusted to ₹{100 + settings.welcomeCoupon.fareAdjustment} → discount ₹{settings.welcomeCoupon.discountAmount} → customer pays <strong>₹{100 + settings.welcomeCoupon.fareAdjustment - settings.welcomeCoupon.discountAmount}</strong>
          </div>
          {/* ⚠️ Warning: fareAdjustment must be less than discountAmount */}
          {settings.welcomeCoupon.fareAdjustment >= settings.welcomeCoupon.discountAmount && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-semibold">
              ⚠️ ERROR: Internal Fare Adjustment (₹{settings.welcomeCoupon.fareAdjustment}) must be LESS than Discount Amount (₹{settings.welcomeCoupon.discountAmount}).
              The net saving to the customer is ₹{settings.welcomeCoupon.discountAmount - settings.welcomeCoupon.fareAdjustment} — which is zero or negative!
              The welcome coupon will NOT show in the app until this is fixed.
              Set Fare Adjustment to less than ₹{settings.welcomeCoupon.discountAmount}.
            </div>
          )}
        </SectionCard>

        {/* Referral System — cycle-based */}
        <SectionCard icon="👥" title="Referral System" subtitle="Cycle-based rewards — each cycle requires more referrals and pays more">
          <Toggle checked={settings.referral.enabled} onChange={(v) => update('referral', 'enabled', v)} label="Enable referral rewards" />

          {/* Cycle thresholds */}
          <div className="mt-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cycle Thresholds</div>
          <Field label="Base Referrals Required (Cycle 1)" hint="Friends who must complete first ride to unlock Cycle-1 reward">
            <NumInput value={(settings.referral as any).baseReferralsRequired ?? settings.referral.referralsRequired} onChange={(v) => {
              update('referral', 'baseReferralsRequired', v);
              update('referral', 'referralsRequired', v);
            }} min={1} />
          </Field>
          <Field label="Extra Referrals per Cycle" hint="+N more required per subsequent cycle (e.g. 2 → Cycle2 needs +2 more)">
            <NumInput value={(settings.referral as any).extraReferralsPerCycle ?? 2} onChange={(v) => update('referral', 'extraReferralsPerCycle', v)} min={0} />
          </Field>
          <Field label="Max Reward Cycles per User" hint="User earns rewards this many times, then the program ends for them">
            <NumInput value={(settings.referral as any).maxReferralCycles ?? 3} onChange={(v) => update('referral', 'maxReferralCycles', v)} min={1} max={10} />
          </Field>

          {/* Coupon rewards */}
          <div className="mt-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Coupon Rewards</div>
          <Field label="Base Coupon Amount ₹ (Cycle 1)" hint="₹ discount coupon issued on first milestone">
            <NumInput value={(settings.referral as any).baseCouponAmount ?? settings.referral.rewardCouponAmount} onChange={(v) => {
              update('referral', 'baseCouponAmount', v);
              update('referral', 'rewardCouponAmount', v);
            }} min={1} />
          </Field>
          <Field label="Extra Coupon per Cycle (₹)" hint="Additional ₹ added to coupon for each new cycle">
            <NumInput value={(settings.referral as any).extraCouponAmount ?? 10} onChange={(v) => update('referral', 'extraCouponAmount', v)} min={0} />
          </Field>

          {/* Coin rewards */}
          <div className="mt-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Coin Rewards</div>
          <Field label="Base Coins Reward (Cycle 1)" hint="Coins awarded on first milestone">
            <NumInput value={(settings.referral as any).baseCoinsReward ?? settings.referral.rewardCoins} onChange={(v) => {
              update('referral', 'baseCoinsReward', v);
              update('referral', 'rewardCoins', v);
            }} min={0} />
          </Field>
          <Field label="Extra Coins per Cycle" hint="Additional coins per cycle (e.g. 10 → Cycle2 gives +10 more coins)">
            <NumInput value={(settings.referral as any).extraCoinsReward ?? 10} onChange={(v) => update('referral', 'extraCoinsReward', v)} min={0} />
          </Field>

          {/* Misc */}
          <div className="mt-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Misc</div>
          <Field label="Coupon Validity (days)">
            <NumInput value={settings.referral.rewardCouponValidityDays} onChange={(v) => update('referral', 'rewardCouponValidityDays', v)} min={1} />
          </Field>

          {/* Live cycle preview */}
          <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200 text-xs text-green-800 space-y-1">
            <div className="font-bold text-sm mb-2">📊 Cycle Preview</div>
            {Array.from({ length: (settings.referral as any).maxReferralCycles ?? 3 }, (_, i) => {
              const base        = (settings.referral as any).baseReferralsRequired ?? settings.referral.referralsRequired ?? 5;
              const extraReq    = (settings.referral as any).extraReferralsPerCycle ?? 2;
              const baseCoupon  = (settings.referral as any).baseCouponAmount ?? settings.referral.rewardCouponAmount ?? 50;
              const extraCoupon = (settings.referral as any).extraCouponAmount ?? 10;
              const baseCoins   = (settings.referral as any).baseCoinsReward ?? settings.referral.rewardCoins ?? 20;
              const extraCoins  = (settings.referral as any).extraCoinsReward ?? 10;
              return (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <span className="w-16 font-semibold">Cycle {i + 1}:</span>
                  <span className="text-gray-700">{base + i * extraReq} referrals</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-orange-700 font-bold">₹{baseCoupon + i * extraCoupon} coupon</span>
                  <span className="text-gray-400">+</span>
                  <span className="text-yellow-700 font-bold">{baseCoins + i * extraCoins} coins</span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          🪙 COINS SYSTEM — Full-width panel, all fields clearly grouped
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">

        {/* Panel header with toggle */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl">🪙</div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">Coins System</h3>
              <p className="text-xs text-gray-500">Earn &amp; redeem coins for ride discounts — all values are admin-controlled</p>
            </div>
          </div>
          <Toggle checked={settings.coins.enabled} onChange={(v) => update('coins', 'enabled', v)} label="" />
        </div>

        <div className="p-6 space-y-8">

          {/* ── Section 1: Core Settings ── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-5 w-1 rounded-full bg-amber-400" />
              <span className="text-sm font-bold text-gray-800">Core Settings</span>
              <span className="text-xs text-gray-400 ml-1">— base earn rate &amp; discount threshold</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 mb-1">🎯 Base Coins / Ride</p>
                <p className="text-[11px] text-gray-400 mb-2">Minimum every completed ride earns (bonuses stack on top)</p>
                <NumInput value={settings.coins.coinsPerRide} onChange={(v) => update('coins', 'coinsPerRide', v)} min={1} />
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 mb-1">💱 Coin Value (₹)</p>
                <p className="text-[11px] text-gray-400 mb-2">1 coin = ₹ value &nbsp;(e.g. 0.10 → 100 coins = ₹10)</p>
                <NumInput value={settings.coins.conversionRate} onChange={(v) => update('coins', 'conversionRate', v)} min={0.01} step={0.01} />
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 mb-1">🔓 Coins to Unlock</p>
                <p className="text-[11px] text-gray-400 mb-2">Coins a user must collect to trigger the discount</p>
                <NumInput value={settings.coins.coinsRequiredForMaxDiscount} onChange={(v) => update('coins', 'coinsRequiredForMaxDiscount', v)} min={1} />
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 mb-1">🏷️ Discount Unlocked (₹)</p>
                <p className="text-[11px] text-gray-400 mb-2">₹ off given when threshold is reached</p>
                <NumInput value={settings.coins.maxDiscountPerRide} onChange={(v) => update('coins', 'maxDiscountPerRide', v)} min={1} />
              </div>
            </div>
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-full text-xs font-semibold text-amber-800">
              🏆 Collect <strong>{settings.coins.coinsRequiredForMaxDiscount}</strong> coins → unlock <strong>₹{settings.coins.maxDiscountPerRide} off</strong> &nbsp;·&nbsp; 1 coin ≈ ₹{settings.coins.conversionRate}
            </div>
          </div>

          {/* ── Section 2: Distance Bonus + Vehicle Bonus side by side ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Distance Bonus */}
            <div className="border border-blue-100 rounded-xl overflow-hidden">
              <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex items-center gap-2">
                <div className="h-4 w-1 rounded-full bg-blue-400" />
                <span className="text-sm font-bold text-gray-800">📍 Distance Bonus Tiers</span>
                <span className="text-xs text-gray-400 ml-1">— extra coins by trip length</span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-3">
                  {(settings.coins.distanceBonuses ?? [
                    { label: '0–3 km', maxKm: 3,    bonus: 1 },
                    { label: '3–8 km', maxKm: 8,    bonus: 2 },
                    { label: '8+ km',  maxKm: null,  bonus: 4 },
                  ]).map((tier, i) => (
                    <div key={i} className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                      <div className="text-xs font-bold text-blue-700 mb-0.5">{tier.label}</div>
                      <div className="text-[10px] text-gray-400 mb-2">
                        {i === 0 ? 'Short trip' : i === 1 ? 'Mid trip' : 'Long trip'}
                      </div>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-xs text-gray-400 font-medium">+</span>
                        <NumInput
                          value={tier.bonus}
                          min={0}
                          onChange={(v) => {
                            const newTiers = [...(settings.coins.distanceBonuses ?? [])];
                            newTiers[i] = { ...tier, bonus: v };
                            update('coins', 'distanceBonuses', newTiers);
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-blue-500 font-semibold">coins</div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-3">Tier ranges are fixed (0–3 / 3–8 / 8+ km). Edit bonus coins per tier above.</p>
              </div>
            </div>

            {/* Vehicle Bonus */}
            <div className="border border-purple-100 rounded-xl overflow-hidden">
              <div className="bg-purple-50 px-4 py-3 border-b border-purple-100 flex items-center gap-2">
                <div className="h-4 w-1 rounded-full bg-purple-400" />
                <span className="text-sm font-bold text-gray-800">🚗 Vehicle Bonus</span>
                <span className="text-xs text-gray-400 ml-1">— extra coins by vehicle type</span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-5 gap-2">
                  {([
                    { key: 'bike'    as const, emoji: '🏍️', label: 'Bike'    },
                    { key: 'auto'    as const, emoji: '🛺',  label: 'Auto'    },
                    { key: 'car'     as const, emoji: '🚙',  label: 'Car'     },
                    { key: 'premium' as const, emoji: '🚘',  label: 'Premium' },
                    { key: 'xl'      as const, emoji: '🚐',  label: 'XL'      },
                  ]).map(({ key, emoji, label }) => {
                    const val = settings.coins.vehicleBonuses?.[key] ?? 0;
                    return (
                      <div key={key} className="bg-purple-50 border border-purple-200 rounded-xl p-2 text-center">
                        <div className="text-lg mb-0.5">{emoji}</div>
                        <div className="text-[10px] font-semibold text-gray-600 mb-2">{label}</div>
                        <div className="flex items-center justify-center gap-0.5 mb-1">
                          <span className="text-[10px] text-gray-400 font-medium">+</span>
                          <NumInput
                            value={val}
                            min={0}
                            onChange={(v) => {
                              const newVeh = { ...(settings.coins.vehicleBonuses ?? {}), [key]: v };
                              update('coins', 'vehicleBonuses', newVeh);
                            }}
                          />
                        </div>
                        <div className="text-[9px] text-purple-500 font-semibold">coins</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 3: Lucky Bonus + Live Preview side by side ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Lucky Bonus */}
            <div className="border border-amber-200 rounded-xl overflow-hidden">
              <div className="bg-amber-50 px-4 py-3 border-b border-amber-100 flex items-center gap-2">
                <div className="h-4 w-1 rounded-full bg-amber-400" />
                <span className="text-sm font-bold text-gray-800">🎲 Lucky Bonus</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Bonus Coins</p>
                  <p className="text-[10px] text-gray-400 mb-2">Extra coins on a lucky ride</p>
                  <NumInput value={settings.coins.randomBonusCoins ?? 10} onChange={(v) => update('coins', 'randomBonusCoins', v)} min={1} />
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">Trigger Chance (%)</p>
                  <p className="text-[10px] text-gray-400 mb-2">Probability per ride (e.g. 20 = 20%)</p>
                  <NumInput value={Math.round((settings.coins.randomBonusChance ?? 0.20) * 100)} onChange={(v) => update('coins', 'randomBonusChance', v / 100)} min={1} max={100} />
                </div>
                <div className="flex items-start gap-2 p-3 bg-amber-100 rounded-xl text-[11px] text-amber-800">
                  <span>🎲</span>
                  <span><strong>Hidden from fare cards.</strong> The extra +{settings.coins.randomBonusCoins ?? 10} coins appear as a surprise after the ride — creating delight.</span>
                </div>
              </div>
            </div>

            {/* Live Preview Table */}
            <div className="lg:col-span-2 border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                <div className="h-4 w-1 rounded-full bg-gray-400" />
                <span className="text-sm font-bold text-gray-800">👁️ Live Fare Card Preview</span>
                <span className="text-xs text-gray-400 ml-1">— updates as you change values above</span>
              </div>
              <div className="p-4">
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="px-3 py-2.5 text-left font-semibold">Vehicle</th>
                        {(settings.coins.distanceBonuses ?? [{label:'0–3 km',maxKm:3,bonus:1},{label:'3–8 km',maxKm:8,bonus:2},{label:'8+ km',maxKm:null,bonus:4}]).map(t => (
                          <th key={t.label} className="px-3 py-2.5 text-center font-semibold">{t.label}</th>
                        ))}
                        <th className="px-3 py-2.5 text-center font-semibold">Lucky 🎲</th>
                      </tr>
                    </thead>
                    <tbody>
                      {([
                        { key: 'bike'    as const, label: '🏍️ Bike'    },
                        { key: 'auto'    as const, label: '🛺 Auto'    },
                        { key: 'car'     as const, label: '🚙 Car'     },
                        { key: 'premium' as const, label: '🚘 Premium' },
                        { key: 'xl'      as const, label: '🚐 XL'      },
                      ]).map(({ key, label }, i) => {
                        const vBonus = settings.coins.vehicleBonuses?.[key] ?? 0;
                        const base   = settings.coins.coinsPerRide;
                        const tiers  = settings.coins.distanceBonuses ?? [{bonus:1},{bonus:2},{bonus:4}];
                        const lucky  = settings.coins.randomBonusCoins ?? 10;
                        const chance = Math.round((settings.coins.randomBonusChance ?? 0.2) * 100);
                        return (
                          <tr key={key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2.5 font-semibold text-gray-700">{label}</td>
                            {tiers.map((t, ti) => (
                              <td key={ti} className="px-3 py-2.5 text-center">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold">
                                  🪙 {base + (t.bonus ?? 0) + vBonus}
                                </span>
                              </td>
                            ))}
                            <td className="px-3 py-2.5 text-center">
                              <span className="text-gray-500 text-[10px] block">+{lucky} coins</span>
                              <span className="text-gray-400 text-[10px]">{chance}% chance</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">
                  Formula shown to user: Base ({settings.coins.coinsPerRide}) + Distance bonus + Vehicle bonus. Lucky bonus is hidden — surprise after completion.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="bg-orange-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2 text-sm">
          {saving && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>}
          💾 Save Reward Config
        </button>
      </div>
    </div>
  );
};

// ─── Referrals Tab ────────────────────────────────────────────────────────────

const ReferralsTab: React.FC = () => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'stats' | 'list'>('stats');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Read admin-configured milestone so the progress bar uses the real target
  const [referralsRequired, setReferralsRequired] = useState(5);

  useEffect(() => {
    fetchStats();
    // Load the admin milestone value so the progress bar is accurate
    axios.get(`${API_BASE}/api/admin/reward-config`, getAxiosConfig())
      .then((res) => {
        if (res.data.success) {
          setReferralsRequired(res.data.settings?.referral?.referralsRequired || 5);
        }
      })
      .catch(() => {}); // non-critical — fallback stays 5
  }, []);
  useEffect(() => { if (view === 'list') fetchReferrals(); }, [view, page]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/admin/referral-stats`, getAxiosConfig());
      if (res.data.success) { setStats(res.data.stats); setTopReferrers(res.data.topReferrers || []); }
    } catch {} finally { setLoading(false); }
  };

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/admin/referrals?page=${page}&limit=20`, getAxiosConfig());
      if (res.data.success) { setReferrals(res.data.referrals); setTotalPages(res.data.pagination.pages); }
    } catch {} finally { setLoading(false); }
  };

  if (loading && !stats) return (
    <div className="text-center py-16">
      <svg className="animate-spin h-8 w-8 mx-auto text-orange-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
      <p className="mt-3 text-gray-500">Loading referral data...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              { label: 'Total Referrals', value: stats.totalReferrals, icon: '🔗' },
              { label: 'Completed', value: stats.completedReferrals, icon: '✅' },
              { label: 'Pending', value: stats.pendingReferrals, icon: '⏳' },
              { label: 'Users with Code', value: stats.usersWithCode, icon: '🪪' },
              { label: 'Rewards Issued', value: stats.rewardsIssued, icon: '🎁' },
              { label: 'Exhausted Cycles', value: stats.exhaustedCount ?? 0, icon: '🏁' },
              { label: 'Conversion', value: stats.conversionRate, icon: '📊' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-4 border shadow-sm text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
          {(stats.cycleBreakdown ?? []).length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <div className="text-sm font-semibold text-gray-700 mb-3">🔄 Users by Referral Cycle</div>
              <div className="flex flex-wrap gap-3">
                {(stats.cycleBreakdown ?? []).map((cb) => (
                  <div key={cb._id} className="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-xs font-semibold text-orange-700">
                    Cycle {cb._id}: {cb.count} users
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Sub-nav */}
      <div className="flex gap-2">
        <button onClick={() => setView('stats')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === 'stats' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          🏆 Top Referrers
        </button>
        <button onClick={() => setView('list')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === 'list' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          📋 All Referrals
        </button>
      </div>

      {view === 'stats' && (
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4">🏆 Top Referrers</h3>
          {topReferrers.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No referrals yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    {['Rank', 'Name', 'Phone', 'Code', 'Progress', 'Cycle', 'Reward'].map((h) => (
                      <th key={h} className="p-3 font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topReferrers.map((r, i) => (
                    <tr key={r._id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-500'}`}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                        </span>
                      </td>
                      <td className="p-3 font-medium">{r.name}</td>
                      <td className="p-3 text-gray-500">{r.phone}</td>
                      <td className="p-3"><span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{r.referralCode}</span></td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${Math.min(((r.referralProgress ?? 0) / (r.requiredReferrals || referralsRequired)) * 100, 100)}%` }} />
                          </div>
                          <span className="font-semibold text-xs">{r.referralProgress ?? 0}/{r.requiredReferrals || referralsRequired}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">Total: {r.successfulReferrals}</div>
                      </td>
                      <td className="p-3">
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-semibold">
                          C{(r.referralCycle ?? 0) + 1}
                        </span>
                      </td>
                      <td className="p-3">
                        {r.referralRewardClaimed
                          ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">🎁 Claimed</span>
                          : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Pending</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {view === 'list' && (
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4">📋 All Referral Records</h3>
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : referrals.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No referral records</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left">
                      {['Referrer', 'Referred User', 'Code Used', 'Joined', 'First Ride', 'Status'].map((h) => (
                        <th key={h} className="p-3 font-semibold text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((r) => (
                      <tr key={r._id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <div className="font-medium">{r.referrerId?.name || '—'}</div>
                          <div className="text-xs text-gray-400">{r.referrerId?.phone}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium">{r.referredUserId?.name || '—'}</div>
                          <div className="text-xs text-gray-400">{r.referredUserId?.phone}</div>
                        </td>
                        <td className="p-3"><span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{r.referrerId?.referralCode}</span></td>
                        <td className="p-3 text-gray-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                        <td className="p-3 text-gray-500 text-xs">{r.firstRideCompletedAt ? new Date(r.firstRideCompletedAt).toLocaleDateString() : '—'}</td>
                        <td className="p-3">
                          {r.firstRideCompleted
                            ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✅ Completed</span>
                            : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">⏳ Awaiting ride</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 rounded border text-sm disabled:opacity-40">← Prev</button>
                  <span className="px-3 py-1 text-sm text-gray-600">Page {page} / {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 rounded border text-sm disabled:opacity-40">Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CouponsManagement;