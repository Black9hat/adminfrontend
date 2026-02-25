import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Coupon {
  _id: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  maxDiscountAmount: number | null;
  minFareAmount: number;
  applicableVehicles: string[]; // 🚗 Vehicle types
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
  topCoupons: Array<{
    _id: string;
    usageCount: number;
    totalDiscount: number;
  }>;
}

// 🚗 Vehicle options with icons
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
  if (envUrl) {
    return envUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
  }
  return 'https://your-api-url.com';
};

const API_BASE = getApiBase();

const CouponsManagement: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState<CouponStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discountType: 'FIXED' as 'PERCENTAGE' | 'FIXED',
    discountValue: 0,
    maxDiscountAmount: null as number | null,
    minFareAmount: 0,
applicableVehicles: [] as string[], // 🚗 Start empty
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
  });

  useEffect(() => {
    console.log('🔗 API_BASE:', API_BASE);
    fetchCoupons();
    fetchStats();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const getAuthToken = (): string => {
    const token = localStorage.getItem('adminToken');
    return token || '';
  };

  const getAxiosConfig = () => {
    const token = getAuthToken();
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    };
  };

  const fetchCoupons = async () => {
    setLoading(true);
    
    try {
      const url = `${API_BASE}/api/admin/coupons`;
      console.log('📡 Fetching from:', url);
      
      const response = await axios.get(url, getAxiosConfig());
      
      console.log('📦 Response:', response.data);

      if (response.data.success) {
        const fetchedCoupons = response.data.coupons || [];
        console.log(`✅ Fetched ${fetchedCoupons.length} coupons`);
        setCoupons(fetchedCoupons);
      } else {
        console.error('❌ API returned success: false', response.data);
        setMessage({ type: 'error', text: response.data.error || 'Failed to load coupons' });
      }
    } catch (error: any) {
      console.error('❌ Error fetching coupons:', error);
      
      let errorMessage = 'Failed to load coupons';
      if (error.response) {
        errorMessage = error.response.data?.error || error.response.data?.message || `Error ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response from server. Check if backend is running.';
      } else {
        errorMessage = error.message;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const url = `${API_BASE}/api/admin/coupons-stats/overview`;
      const response = await axios.get(url, getAxiosConfig());

      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error: any) {
      console.error('❌ Error fetching stats:', error.response?.data || error.message);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else if (type === 'number') {
      setFormData({ ...formData, [name]: value === '' ? null : Number(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // 🚗 IMPROVED: Handle vehicle selection with better logic
  const handleVehicleChange = (vehicle: string) => {
    let newVehicles = [...formData.applicableVehicles];
    
    if (vehicle === 'all') {
      // Toggle "All Vehicles"
      if (newVehicles.includes('all')) {
        // If deselecting "all", clear everything (will auto-select "all" again)
        newVehicles = [];
      } else {
        // Select only "all"
        newVehicles = ['all'];
      }
    } else {
      // Remove 'all' if it was previously selected
      newVehicles = newVehicles.filter(v => v !== 'all');
      
      if (newVehicles.includes(vehicle)) {
        // Deselect vehicle
        newVehicles = newVehicles.filter(v => v !== vehicle);
      } else {
        // Select vehicle
        newVehicles.push(vehicle);
      }
    }
    
    // If no vehicles selected, default to 'all'
    
    
    setFormData({ ...formData, applicableVehicles: newVehicles });
  };

  const handleCreateCoupon = async () => {
    // Validation
    if (!formData.code.trim()) {
      setMessage({ type: 'error', text: 'Coupon code is required' });
      return;
    }
    if (!formData.description.trim()) {
      setMessage({ type: 'error', text: 'Description is required' });
      return;
    }
    if (!formData.discountValue || formData.discountValue <= 0) {
      setMessage({ type: 'error', text: 'Discount value must be greater than 0' });
      return;
    }
    if (formData.discountType === 'PERCENTAGE' && formData.discountValue > 100) {
      setMessage({ type: 'error', text: 'Percentage discount cannot exceed 100%' });
      return;
    }
    if (!formData.validUntil) {
      setMessage({ type: 'error', text: 'Valid until date is required' });
      return;
    }

    setLoading(true);
    
    try {
      const url = `${API_BASE}/api/admin/coupons`;
      
      const payload = {
        code: formData.code.toUpperCase().trim(),
        description: formData.description.trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : null,
        minFareAmount: Number(formData.minFareAmount) || 0,
        applicableVehicles: formData.applicableVehicles, // 🚗 Send vehicle types
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
      };

      console.log('📤 Creating coupon:', payload);

      const response = await axios.post(url, payload, getAxiosConfig());

      if (response.data.success) {
        setMessage({ type: 'success', text: '✅ Coupon created successfully!' });
        setShowCreateForm(false);
        resetForm();
        
        await fetchCoupons();
        await fetchStats();
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Failed to create coupon' });
      }
    } catch (error: any) {
      console.error('❌ Error creating coupon:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to create coupon';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCoupon = async () => {
    if (!editingCoupon) return;

    if (!formData.description.trim()) {
      setMessage({ type: 'error', text: 'Description is required' });
      return;
    }
    if (!formData.discountValue || formData.discountValue <= 0) {
      setMessage({ type: 'error', text: 'Discount value must be greater than 0' });
      return;
    }

    setLoading(true);

    try {
      const url = `${API_BASE}/api/admin/coupons/${editingCoupon._id}`;
      
      const payload = {
        description: formData.description.trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : null,
        minFareAmount: Number(formData.minFareAmount) || 0,
        applicableVehicles: formData.applicableVehicles, // 🚗 Update vehicle types
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
      };

      console.log('📤 Updating coupon:', editingCoupon._id, payload);

      const response = await axios.put(url, payload, getAxiosConfig());

      if (response.data.success) {
        setMessage({ type: 'success', text: '✅ Coupon updated successfully!' });
        setEditingCoupon(null);
        setShowCreateForm(false);
        resetForm();
        
        await fetchCoupons();
        await fetchStats();
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Failed to update coupon' });
      }
    } catch (error: any) {
      console.error('❌ Error updating coupon:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to update coupon';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCoupon = async (coupon: Coupon) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${coupon.code}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    setLoading(true);

    try {
      const url = `${API_BASE}/api/admin/coupons/${coupon._id}`;
      const response = await axios.delete(url, getAxiosConfig());

      if (response.data.success) {
        setMessage({ type: 'success', text: '✅ Coupon deleted successfully!' });
        await fetchCoupons();
        await fetchStats();
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Failed to delete coupon' });
      }
    } catch (error: any) {
      console.error('❌ Error deleting coupon:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Failed to delete coupon';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (coupon: Coupon) => {
    try {
      const url = `${API_BASE}/api/admin/coupons/${coupon._id}/toggle`;
      const response = await axios.patch(url, {}, getAxiosConfig());

      if (response.data.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ Coupon ${response.data.coupon.isActive ? 'activated' : 'deactivated'}!` 
        });
        await fetchCoupons();
        await fetchStats();
      }
    } catch (error: any) {
      console.error('❌ Error toggling status:', error);
      setMessage({ type: 'error', text: 'Failed to toggle status' });
    }
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
      applicableVehicles: coupon.applicableVehicles && coupon.applicableVehicles.length > 0 
        ? coupon.applicableVehicles 
        : ['all'], // 🚗 Load vehicle types
      applicableFor: coupon.applicableFor,
      rideNumber: coupon.rideNumber,
      specificRideNumbers: coupon.specificRideNumbers || [],
      maxUsagePerUser: coupon.maxUsagePerUser,
      totalUsageLimit: coupon.totalUsageLimit,
      validFrom: coupon.validFrom ? coupon.validFrom.split('T')[0] : '',
      validUntil: coupon.validUntil ? coupon.validUntil.split('T')[0] : '',
      isActive: coupon.isActive,
      eligibleUserTypes: coupon.eligibleUserTypes || ['ALL'],
      minRidesCompleted: coupon.minRidesCompleted || 0,
      maxRidesCompleted: coupon.maxRidesCompleted,
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discountType: 'FIXED',
      discountValue: 0,
      maxDiscountAmount: null,
      minFareAmount: 0,
applicableVehicles: [], // 🚗 Reset empty
      applicableFor: 'FIRST_RIDE',
      rideNumber: null,
      specificRideNumbers: [],
      maxUsagePerUser: 1,
      totalUsageLimit: null,
      validFrom: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true,
      eligibleUserTypes: ['ALL'],
      minRidesCompleted: 0,
      maxRidesCompleted: null,
    });
    setEditingCoupon(null);
  };

  const handleSpecificRidesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numbers = value
      .split(',')
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n));
    setFormData({ ...formData, specificRideNumbers: numbers });
  };

  const getStatusBadge = (coupon: Coupon) => {
    const now = new Date();
    const validUntil = new Date(coupon.validUntil);
    
    if (validUntil < now) {
      return <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">Expired</span>;
    }
    if (!coupon.isActive) {
      return <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">Inactive</span>;
    }
    return <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">Active</span>;
  };

  // 🚗 IMPROVED: Get vehicle badges with better styling
  const getVehicleBadges = (vehicles: string[]) => {
    if (!vehicles || vehicles.length === 0 || vehicles.includes('all')) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
          <span>🚗</span>
          <span>All Vehicles</span>
        </span>
      );
    }
    
    return (
      <div className="flex flex-wrap gap-1">
        {vehicles.map((vehicle) => {
          const option = VEHICLE_OPTIONS.find(v => v.value === vehicle);
          const colorClasses = {
            green: 'bg-green-100 text-green-800 border-green-200',
            yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            purple: 'bg-purple-100 text-purple-800 border-purple-200',
            indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            pink: 'bg-pink-100 text-pink-800 border-pink-200',
            blue: 'bg-blue-100 text-blue-800 border-blue-200',
          };
          
          return (
            <span 
              key={vehicle} 
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${
                colorClasses[option?.color as keyof typeof colorClasses] || colorClasses.blue
              }`}
            >
              <span>{option?.icon || '🚗'}</span>
              <span>{option?.label || vehicle}</span>
            </span>
          );
        })}
      </div>
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: `📋 Copied: ${text}` });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">🎫 Coupon Management</h1>
        <button
          onClick={fetchCoupons}
          disabled={loading}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            '🔄'
          )}
          Refresh
        </button>
      </div>

      {/* Messages */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex justify-between items-center ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="text-xl font-bold hover:opacity-70 ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-blue-100 text-center">
            <div className="text-sm text-blue-600">📊 Total</div>
            <div className="text-2xl font-bold text-blue-800">{stats.totalCoupons}</div>
          </div>
          <div className="p-4 rounded-lg bg-green-100 text-center">
            <div className="text-sm text-green-600">✅ Active</div>
            <div className="text-2xl font-bold text-green-800">{stats.activeCoupons}</div>
          </div>
          <div className="p-4 rounded-lg bg-red-100 text-center">
            <div className="text-sm text-red-600">⏰ Expired</div>
            <div className="text-2xl font-bold text-red-800">{stats.expiredCoupons}</div>
          </div>
          <div className="p-4 rounded-lg bg-yellow-100 text-center">
            <div className="text-sm text-yellow-600">🎯 Uses</div>
            <div className="text-2xl font-bold text-yellow-800">{stats.totalUsages}</div>
          </div>
          <div className="p-4 rounded-lg bg-purple-100 text-center">
            <div className="text-sm text-purple-600">💰 Saved</div>
            <div className="text-2xl font-bold text-purple-800">₹{stats.totalDiscountGiven}</div>
          </div>
        </div>
      )}

      {/* Create Button */}
      <div className="mb-6">
        <button
          onClick={() => {
            if (showCreateForm && !editingCoupon) {
              setShowCreateForm(false);
            } else {
              setShowCreateForm(true);
              setEditingCoupon(null);
              resetForm();
            }
          }}
          className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition font-semibold"
        >
          {showCreateForm && !editingCoupon ? '❌ Cancel' : '➕ Create New Coupon'}
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border">
          <h2 className="text-2xl font-bold mb-4">
            {editingCoupon ? `✏️ Edit Coupon: ${editingCoupon.code}` : '➕ Create New Coupon'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coupon Code */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Coupon Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                className="border rounded w-full p-2 uppercase focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="e.g., FIRST50"
                disabled={!!editingCoupon}
              />
              {editingCoupon && (
                <p className="text-xs text-gray-500 mt-1">Code cannot be changed</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="e.g., Get 50% off on your first ride"
              />
            </div>

            {/* Discount Type */}
            <div>
              <label className="block text-sm font-medium mb-1">Discount Type</label>
              <select
                name="discountType"
                value={formData.discountType}
                onChange={handleInputChange}
                className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
              >
                <option value="FIXED">Fixed Amount (₹)</option>
                <option value="PERCENTAGE">Percentage (%)</option>
              </select>
            </div>

            {/* Discount Value */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Discount Value <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="discountValue"
                  value={formData.discountValue || ''}
                  onChange={handleInputChange}
                  className="border rounded w-full p-2 pr-8 focus:ring-2 focus:ring-orange-500"
                  placeholder={formData.discountType === 'PERCENTAGE' ? '1-100' : 'Amount'}
                  min="0"
                  max={formData.discountType === 'PERCENTAGE' ? 100 : undefined}
                />
                <span className="absolute right-3 top-2 text-gray-500">
                  {formData.discountType === 'PERCENTAGE' ? '%' : '₹'}
                </span>
              </div>
            </div>

            {/* Max Discount Amount (for percentage) */}
            {formData.discountType === 'PERCENTAGE' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Discount Amount (₹)
                </label>
                <input
                  type="number"
                  name="maxDiscountAmount"
                  value={formData.maxDiscountAmount || ''}
                  onChange={handleInputChange}
                  className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
                  placeholder="Optional cap"
                  min="0"
                />
              </div>
            )}

            {/* Min Fare Amount */}
            <div>
              <label className="block text-sm font-medium mb-1">Min Fare Amount (₹)</label>
              <input
                type="number"
                name="minFareAmount"
                value={formData.minFareAmount || ''}
                onChange={handleInputChange}
                className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
                placeholder="0"
                min="0"
              />
            </div>

            {/* 🚗 IMPROVED: Applicable Vehicles Section */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-3">
                🚗 Applicable Vehicles <span className="text-red-500">*</span>
              </label>
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                <div className="flex flex-wrap gap-3">
                  {VEHICLE_OPTIONS.map((vehicle) => {
                    const isSelected = formData.applicableVehicles.includes(vehicle.value);
                    const isAllSelected = formData.applicableVehicles.includes('all');
                    const isDisabled = vehicle.value !== 'all' && isAllSelected;
                    
                    const colorClasses = {
                      green: 'border-green-500 bg-green-500 hover:bg-green-600',
                      yellow: 'border-yellow-500 bg-yellow-500 hover:bg-yellow-600',
                      purple: 'border-purple-500 bg-purple-500 hover:bg-purple-600',
                      indigo: 'border-indigo-500 bg-indigo-500 hover:bg-indigo-600',
                      pink: 'border-pink-500 bg-pink-500 hover:bg-pink-600',
                      blue: 'border-blue-500 bg-blue-500 hover:bg-blue-600',
                    };
                    
                    return (
                      <button
                        key={vehicle.value}
                        type="button"
                        onClick={() => handleVehicleChange(vehicle.value)}
                        disabled={isDisabled}
                        className={`
                          relative px-5 py-3 rounded-xl border-2 transition-all 
                          flex items-center gap-3 font-semibold
                          ${isSelected
                            ? `${colorClasses[vehicle.color as keyof typeof colorClasses]} text-white shadow-lg transform scale-105`
                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400 hover:shadow-md'
                          }
                          ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        <span className="text-2xl">{vehicle.icon}</span>
                        <span className="text-sm">{vehicle.label}</span>
                        {isSelected && (
                          <span className="absolute -top-2 -right-2 bg-white text-green-600 rounded-full p-1 shadow-md">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-600 text-lg">ℹ️</span>
                    <p className="text-sm text-blue-800">
                      {formData.applicableVehicles.includes('all')
                        ? '✅ This coupon will be available for ALL vehicle types'
                        : formData.applicableVehicles.length > 0
                        ? `✅ This coupon will ONLY work for: ${formData.applicableVehicles.map(v => {
                            const opt = VEHICLE_OPTIONS.find(o => o.value === v);
                            return opt?.label || v;
                          }).join(', ')}`
                        : '⚠️ Please select at least one vehicle type'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rest of the form fields... (unchanged from original) */}
            {/* Applicable For */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Applicable For <span className="text-red-500">*</span>
              </label>
              <select
                name="applicableFor"
                value={formData.applicableFor}
                onChange={handleInputChange}
                className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
              >
                <option value="FIRST_RIDE">First Ride Only</option>
                <option value="NTH_RIDE">Specific Ride Number (e.g., 5th ride)</option>
                <option value="EVERY_NTH_RIDE">Every Nth Ride (e.g., every 10th)</option>
                <option value="SPECIFIC_RIDES">Specific Ride Numbers (e.g., 1, 5, 10)</option>
                <option value="ALL_RIDES">All Rides</option>
              </select>
            </div>

            {/* Ride Number (for NTH_RIDE or EVERY_NTH_RIDE) */}
            {(formData.applicableFor === 'NTH_RIDE' ||
              formData.applicableFor === 'EVERY_NTH_RIDE') && (
              <div>
                <label className="block text-sm font-medium mb-1">Ride Number</label>
                <input
                  type="number"
                  name="rideNumber"
                  value={formData.rideNumber || ''}
                  onChange={handleInputChange}
                  className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., 5"
                  min="1"
                />
              </div>
            )}

            {/* Specific Ride Numbers */}
            {formData.applicableFor === 'SPECIFIC_RIDES' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Specific Ride Numbers
                </label>
                <input
                  type="text"
                  value={formData.specificRideNumbers.join(', ')}
                  onChange={handleSpecificRidesChange}
                  className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., 1, 5, 10, 15"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated numbers</p>
              </div>
            )}

            {/* Max Usage Per User */}
            <div>
              <label className="block text-sm font-medium mb-1">Max Usage Per User</label>
              <input
                type="number"
                name="maxUsagePerUser"
                value={formData.maxUsagePerUser || ''}
                onChange={handleInputChange}
                className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
                placeholder="1"
                min="1"
              />
            </div>

            {/* Total Usage Limit */}
            <div>
              <label className="block text-sm font-medium mb-1">Total Usage Limit</label>
              <input
                type="number"
                name="totalUsageLimit"
                value={formData.totalUsageLimit || ''}
                onChange={handleInputChange}
                className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
                placeholder="Unlimited"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
            </div>

            {/* Eligible User Types */}
            <div>
              <label className="block text-sm font-medium mb-1">Eligible Users</label>
              <select
                value={formData.eligibleUserTypes[0] || 'ALL'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    eligibleUserTypes: [e.target.value as 'NEW' | 'EXISTING' | 'ALL'],
                  })
                }
                className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
              >
                <option value="ALL">All Users</option>
                <option value="NEW">New Users Only</option>
                <option value="EXISTING">Existing Users Only</option>
              </select>
            </div>

            {/* Min Rides Completed */}
            <div>
              <label className="block text-sm font-medium mb-1">Min Rides Completed</label>
              <input
                type="number"
                name="minRidesCompleted"
                value={formData.minRidesCompleted || ''}
                onChange={handleInputChange}
                className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
                placeholder="0"
                min="0"
              />
            </div>

            {/* Valid From */}
            <div>
              <label className="block text-sm font-medium mb-1">Valid From</label>
              <input
                type="date"
                name="validFrom"
                value={formData.validFrom}
                onChange={handleInputChange}
                className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Valid Until */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Valid Until <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="validUntil"
                value={formData.validUntil}
                onChange={handleInputChange}
                className="border rounded w-full p-2 focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Is Active */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="w-5 h-5 text-orange-500 focus:ring-orange-500 rounded"
                id="isActive"
              />
              <label htmlFor="isActive" className="text-sm font-medium cursor-pointer">
                Active (can be used immediately)
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
            <button
              onClick={() => {
                setShowCreateForm(false);
                setEditingCoupon(null);
                resetForm();
              }}
              disabled={loading}
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={editingCoupon ? handleUpdateCoupon : handleCreateCoupon}
              disabled={loading}
              className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {editingCoupon ? '💾 Update Coupon' : '➕ Create Coupon'}
            </button>
          </div>
        </div>
      )}

      {/* Coupons List */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            All Coupons ({coupons.length})
          </h2>
        </div>

        {loading && coupons.length === 0 ? (
          <div className="text-center py-12">
            <svg className="animate-spin h-10 w-10 mx-auto text-orange-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="mt-4 text-gray-500">Loading coupons...</p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">🎫</div>
            <p className="text-lg">No coupons created yet.</p>
            <p className="text-sm">Click "Create New Coupon" to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-semibold">Code</th>
                  <th className="text-left p-3 font-semibold">Description</th>
                  <th className="text-left p-3 font-semibold">Discount</th>
                  <th className="text-left p-3 font-semibold">🚗 Vehicles</th>
                  <th className="text-left p-3 font-semibold">Applicable</th>
                  <th className="text-left p-3 font-semibold">Usage</th>
                  <th className="text-left p-3 font-semibold">Valid Until</th>
                  <th className="text-left p-3 font-semibold">Status</th>
                  <th className="text-left p-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon._id} className="border-b hover:bg-gray-50 transition">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span 
                          className="font-mono font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded cursor-pointer hover:bg-orange-100"
                          onClick={() => copyToClipboard(coupon.code)}
                          title="Click to copy"
                        >
                          {coupon.code}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 max-w-xs truncate" title={coupon.description}>
                      {coupon.description}
                    </td>
                    <td className="p-3">
                      <span className="font-semibold">
                        {coupon.discountType === 'PERCENTAGE'
                          ? `${coupon.discountValue}%`
                          : `₹${coupon.discountValue}`}
                      </span>
                      {coupon.maxDiscountAmount && (
                        <span className="text-xs text-gray-500 block">
                          max ₹{coupon.maxDiscountAmount}
                        </span>
                      )}
                    </td>
                    {/* 🚗 Vehicle column with improved badges */}
                    <td className="p-3">
                      {getVehicleBadges(coupon.applicableVehicles)}
                    </td>
                    <td className="p-3 text-sm">
                      {coupon.applicableFor === 'FIRST_RIDE' && '1st Ride'}
                      {coupon.applicableFor === 'NTH_RIDE' && `Ride #${coupon.rideNumber}`}
                      {coupon.applicableFor === 'EVERY_NTH_RIDE' && `Every ${coupon.rideNumber}th`}
                      {coupon.applicableFor === 'SPECIFIC_RIDES' && `Rides: ${coupon.specificRideNumbers?.join(', ') || 'N/A'}`}
                      {coupon.applicableFor === 'ALL_RIDES' && 'All Rides'}
                    </td>
                    <td className="p-3">
                      <span className="font-mono">
                        {coupon.currentUsageCount || 0}
                        {coupon.totalUsageLimit ? ` / ${coupon.totalUsageLimit}` : ''}
                      </span>
                    </td>
                    <td className="p-3 text-sm">
                      {new Date(coupon.validUntil).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      {getStatusBadge(coupon)}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleToggleStatus(coupon)}
                          className={`px-2 py-1 rounded text-xs font-medium transition ${
                            coupon.isActive 
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                          title={coupon.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {coupon.isActive ? '⏸️ Pause' : '▶️ Activate'}
                        </button>
                        <button
                          onClick={() => handleEditCoupon(coupon)}
                          className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(coupon)}
                          className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 transition"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-gray-400 text-sm">
        🎫 Coupon Management System • API: {API_BASE}
      </div>
    </div>
  );
};

export default CouponsManagement;