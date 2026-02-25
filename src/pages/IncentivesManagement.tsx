// src/pages/IncentivesManagement.tsx
import React, { useState, useEffect, type JSX } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Upload,
  X,
  Edit2,
  Calendar,
  TrendingUp,
  Gift,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Car,
  DollarSign,
  Target,
  Users,
  ShoppingBag,
  Bell,
  Eye,
  EyeOff,
  Sparkles,
  Tag,
  Megaphone,
  PartyPopper
} from 'lucide-react';
import axios from 'axios';

// ============================================================================
// TYPES
// ============================================================================
interface Slab {
  rides: number;
  amount: number;
}

interface IncentiveCampaign {
  _id?: string;
  date: string;
  slabs: Slab[];
  images: string[];
  isActive: boolean;
  isDefault?: boolean;
}

interface CustomerBanner {
  _id: string;
  imageUrl: string;
  title?: string;
  description?: string;
  type: 'promotion' | 'announcement' | 'offer' | 'event';
  date: string;
  target: 'customer' | 'all';
  isActive: boolean;
  createdAt: string;
}

const API_BASE = 'https://ghumobackend.onrender.com';

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function IncentivesManagement() {
  // Driver Incentive States
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDate());
  const [campaign, setCampaign] = useState<IncentiveCampaign | null>(null);
  const [slabs, setSlabs] = useState<Slab[]>([
    { rides: 10, amount: 100 },
    { rides: 13, amount: 150 },
    { rides: 15, amount: 200 }
  ]);
  const [images, setImages] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingSlabIndex, setEditingSlabIndex] = useState<number | null>(null);

  // Customer Banner States
  const [customerBanners, setCustomerBanners] = useState<CustomerBanner[]>([]);
  const [loadingCustomerBanners, setLoadingCustomerBanners] = useState(false);
  const [uploadingCustomerBanner, setUploadingCustomerBanner] = useState(false);
  const [customerBannerForm, setCustomerBannerForm] = useState({
    imageUrl: '',
    title: '',
    description: '',
    type: 'promotion' as 'promotion' | 'announcement' | 'offer' | 'event',
    date: getTodayDate(),
  });
  const [showCustomerBannerForm, setShowCustomerBannerForm] = useState(false);

  // Message State
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'driver' | 'customer'>('driver');

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  function getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  const getAuthToken = (): string => {
    return localStorage.getItem('adminToken') || '';
  };

 const getFullImageUrl = (url: string | null | undefined): string => {
  if (!url) {
    // Return a placeholder when URL is null/undefined
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="160"%3E%3Crect fill="%23f3f4f6" width="400" height="160"/%3E%3Ctext fill="%239ca3af" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="system-ui" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
  }
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
};

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatShortDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    fetchCampaign();
  }, [selectedDate]);

  useEffect(() => {
    fetchCustomerBanners();
  }, []);

  // ============================================================================
  // DRIVER INCENTIVE FUNCTIONS
  // ============================================================================
  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();

      const response = await axios.get(
        `${API_BASE}/api/admin/incentives/${selectedDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        }
      );

      const data = response.data.data;
      setCampaign(data);
      setSlabs(data.slabs || []);
      setImages(data.images || []);
      setIsActive(data.isActive !== undefined ? data.isActive : true);

    } catch (error) {
      console.error('❌ Error fetching campaign:', error);
      setSlabs([
        { rides: 10, amount: 100 },
        { rides: 13, amount: 150 },
        { rides: 15, amount: 200 }
      ]);
      setImages([]);
      setIsActive(true);
    } finally {
      setLoading(false);
    }
  };

  const saveCampaign = async () => {
    try {
      setSaving(true);
      const token = getAuthToken();

      if (slabs.length === 0) {
        setMessage({ type: 'error', text: 'Please add at least one incentive slab' });
        return;
      }

      for (const slab of slabs) {
        if (!slab.rides || slab.rides < 1) {
          setMessage({ type: 'error', text: 'Ride count must be at least 1' });
          return;
        }
        if (slab.amount < 0) {
          setMessage({ type: 'error', text: 'Amount cannot be negative' });
          return;
        }
      }

      const rideCounts = slabs.map(s => s.rides);
      if (new Set(rideCounts).size !== rideCounts.length) {
        setMessage({ type: 'error', text: 'Duplicate ride counts are not allowed' });
        return;
      }

      await axios.post(
        `${API_BASE}/api/admin/incentives`,
        {
          date: selectedDate,
          slabs,
          images,
          isActive
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          }
        }
      );

      setMessage({ type: 'success', text: 'Incentive campaign saved successfully!' });
      fetchCampaign();

    } catch (error) {
      console.error('❌ Error saving campaign:', error);
      setMessage({ type: 'error', text: 'Failed to save campaign' });
    } finally {
      setSaving(false);
    }
  };

  const addSlab = () => {
    const existingRides = slabs.map(s => s.rides);
    let newRides = 5;
    while (existingRides.includes(newRides)) {
      newRides += 1;
    }
    setSlabs([...slabs, { rides: newRides, amount: 0 }]);
  };

  const updateSlab = (index: number, field: 'rides' | 'amount', value: number) => {
    const newSlabs = [...slabs];
    newSlabs[index][field] = value;
    setSlabs(newSlabs);
  };

  const removeSlab = (index: number) => {
    if (slabs.length <= 1) {
      setMessage({ type: 'error', text: 'At least one slab is required' });
      return;
    }
    setSlabs(slabs.filter((_, i) => i !== index));
  };

  const handleDriverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size should be less than 5MB' });
      return;
    }

    try {
      setUploadingImage(true);
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post(
        `${API_BASE}/api/admin/incentives/upload-image`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        }
      );

      setImages([...images, response.data.imageUrl]);
      setMessage({ type: 'success', text: 'Image uploaded successfully!' });

    } catch (error) {
      console.error('❌ Error uploading image:', error);
      setMessage({ type: 'error', text: 'Failed to upload image' });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeDriverImage = async (imageUrl: string) => {
    try {
      const token = getAuthToken();

      await axios.delete(
        `${API_BASE}/api/admin/incentives/delete-image`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          data: { imageUrl }
        }
      );

      setImages(images.filter(img => img !== imageUrl));
      setMessage({ type: 'success', text: 'Image removed successfully!' });

    } catch (error) {
      console.error('❌ Error removing image:', error);
      setMessage({ type: 'error', text: 'Failed to remove image' });
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const current = new Date(selectedDate);
    if (direction === 'prev') {
      current.setDate(current.getDate() - 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // ============================================================================
  // CUSTOMER BANNER FUNCTIONS
  // ============================================================================
  const fetchCustomerBanners = async () => {
    try {
      setLoadingCustomerBanners(true);
      const token = getAuthToken();

      const response = await axios.get(
        `${API_BASE}/api/admin/customer-banners`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        }
      );

      setCustomerBanners(response.data.banners || []);
    } catch (error) {
      console.error('❌ Error fetching customer banners:', error);
    } finally {
      setLoadingCustomerBanners(false);
    }
  };

  const handleCustomerBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image size should be less than 5MB' });
      return;
    }

    try {
      setUploadingCustomerBanner(true);
      const token = getAuthToken();
      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post(
        `${API_BASE}/api/admin/upload-image`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        }
      );

      setCustomerBannerForm(prev => ({
        ...prev,
        imageUrl: response.data.imageUrl || response.data.url
      }));
      setMessage({ type: 'success', text: 'Image uploaded! Fill in the details below.' });

    } catch (error) {
      console.error('❌ Error uploading image:', error);
      setMessage({ type: 'error', text: 'Failed to upload image' });
    } finally {
      setUploadingCustomerBanner(false);
    }
  };

  const saveCustomerBanner = async () => {
    if (!customerBannerForm.imageUrl) {
      setMessage({ type: 'error', text: 'Please upload or enter an image URL' });
      return;
    }

    try {
      setUploadingCustomerBanner(true);
      const token = getAuthToken();

      await axios.post(
        `${API_BASE}/api/admin/customer-banners`,
        {
          imageUrl: customerBannerForm.imageUrl,
          title: customerBannerForm.title || undefined,
          description: customerBannerForm.description || undefined,
          type: customerBannerForm.type,
          date: customerBannerForm.date,
          target: 'customer',
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          }
        }
      );

      setMessage({ type: 'success', text: 'Customer banner created successfully!' });
      
      // Reset form
      setCustomerBannerForm({
        imageUrl: '',
        title: '',
        description: '',
        type: 'promotion',
        date: getTodayDate(),
      });
      setShowCustomerBannerForm(false);
      
      // Refresh banners
      fetchCustomerBanners();

    } catch (error) {
      console.error('❌ Error saving customer banner:', error);
      setMessage({ type: 'error', text: 'Failed to save banner' });
    } finally {
      setUploadingCustomerBanner(false);
    }
  };

  const deleteCustomerBanner = async (bannerId: string) => {
    if (!window.confirm('Are you sure you want to delete this banner?')) return;

    try {
      const token = getAuthToken();

      await axios.delete(
        `${API_BASE}/api/admin/customer-banners/${bannerId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true'
          }
        }
      );

      setMessage({ type: 'success', text: 'Banner deleted successfully!' });
      fetchCustomerBanners();

    } catch (error) {
      console.error('❌ Error deleting banner:', error);
      setMessage({ type: 'error', text: 'Failed to delete banner' });
    }
  };

  const toggleCustomerBannerStatus = async (banner: CustomerBanner) => {
    try {
      const token = getAuthToken();

      await axios.patch(
        `${API_BASE}/api/admin/customer-banners/${banner._id}`,
        { isActive: !banner.isActive },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          }
        }
      );

      fetchCustomerBanners();
    } catch (error) {
      console.error('❌ Error toggling banner status:', error);
      setMessage({ type: 'error', text: 'Failed to update banner status' });
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================
  const sortedSlabs = [...slabs].sort((a, b) => a.rides - b.rides);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'promotion': return <Sparkles size={14} />;
      case 'offer': return <Tag size={14} />;
      case 'announcement': return <Megaphone size={14} />;
      case 'event': return <PartyPopper size={14} />;
      default: return <Gift size={14} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'promotion': return 'bg-purple-100 text-purple-700';
      case 'offer': return 'bg-green-100 text-green-700';
      case 'announcement': return 'bg-blue-100 text-blue-700';
      case 'event': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const todayBanners = customerBanners.filter(b => b.date === getTodayDate());
  const otherBanners = customerBanners.filter(b => b.date !== getTodayDate());

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Toast Notification */}
        {message && (
          <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-2 duration-300">
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
                message.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 size={20} className="text-green-500" />
              ) : (
                <XCircle size={20} className="text-red-500" />
              )}
              <span className="font-medium">{message.text}</span>
              <button onClick={() => setMessage(null)} className="ml-2 hover:opacity-70">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Gift size={28} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    Incentives & Banners
                  </h1>
                  <p className="text-green-100 mt-1">
                    Manage driver incentives and customer promotional banners
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="p-4 bg-gray-50 border-b flex items-center justify-center gap-4">
            <button
              onClick={() => setActiveTab('driver')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'driver'
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Car size={20} />
              Driver Incentives
            </button>
            <button
              onClick={() => setActiveTab('customer')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'customer'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <ShoppingBag size={20} />
              Customer Banners
              {todayBanners.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'customer' ? 'bg-white/20' : 'bg-orange-100 text-orange-600'
                }`}>
                  {todayBanners.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ================================================================== */}
        {/* DRIVER INCENTIVES TAB */}
        {/* ================================================================== */}
        {activeTab === 'driver' && (
          <>
            {/* Date Selector */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => navigateDate('prev')}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                
                <div className="flex items-center gap-3">
                  <Calendar size={20} className="text-green-600" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                <button
                  onClick={() => navigateDate('next')}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ChevronRight size={20} />
                </button>

                <button
                  onClick={() => setSelectedDate(getTodayDate())}
                  className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                >
                  Today
                </button>

                <button
                  onClick={saveCampaign}
                  disabled={saving || loading}
                  className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-semibold disabled:opacity-50 ml-4"
                >
                  {saving ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Save size={18} />
                  )}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>

              <div className="text-center mt-3">
                <p className="text-lg font-semibold text-gray-800">
                  {formatDate(selectedDate)}
                </p>
                {campaign?.isDefault && (
                  <span className="inline-block mt-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                    No campaign saved - showing defaults
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-green-200 rounded-full animate-pulse"></div>
                  <div className="absolute top-0 left-0 w-16 h-16 border-4 border-green-500 rounded-full animate-spin border-t-transparent"></div>
                </div>
                <p className="mt-4 text-gray-500 font-medium">Loading campaign...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Incentive Slabs Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Target size={22} className="text-white" />
                        <div>
                          <h2 className="text-xl font-bold text-white">Incentive Slabs</h2>
                          <p className="text-blue-100 text-sm">Define ride targets and rewards</p>
                        </div>
                      </div>
                      <button
                        onClick={addSlab}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-all font-semibold"
                      >
                        <Plus size={18} />
                        Add Slab
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-12 gap-4 mb-4 px-4">
                      <div className="col-span-5 text-sm font-semibold text-gray-600 flex items-center gap-2">
                        <Car size={16} />
                        Rides Required
                      </div>
                      <div className="col-span-5 text-sm font-semibold text-gray-600 flex items-center gap-2">
                        <DollarSign size={16} />
                        Incentive Amount (₹)
                      </div>
                      <div className="col-span-2 text-sm font-semibold text-gray-600 text-center">
                        Actions
                      </div>
                    </div>

                    <div className="space-y-3">
                      {sortedSlabs.map((slab, index) => {
                        const originalIndex = slabs.findIndex(
                          s => s.rides === slab.rides && s.amount === slab.amount
                        );
                        
                        return (
                          <div
                            key={index}
                            className={`grid grid-cols-12 gap-4 p-4 rounded-xl border transition-all ${
                              editingSlabIndex === originalIndex
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="col-span-5">
                              <input
                                type="number"
                                min="1"
                                value={slab.rides}
                                onChange={(e) => updateSlab(originalIndex, 'rides', parseInt(e.target.value) || 1)}
                                onFocus={() => setEditingSlabIndex(originalIndex)}
                                onBlur={() => setEditingSlabIndex(null)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                              />
                            </div>
                            <div className="col-span-5">
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                                  ₹
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={slab.amount}
                                  onChange={(e) => updateSlab(originalIndex, 'amount', parseInt(e.target.value) || 0)}
                                  onFocus={() => setEditingSlabIndex(originalIndex)}
                                  onBlur={() => setEditingSlabIndex(null)}
                                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                                />
                              </div>
                            </div>
                            <div className="col-span-2 flex items-center justify-center">
                              <button
                                onClick={() => removeSlab(originalIndex)}
                                className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                                title="Remove slab"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {slabs.length === 0 && (
                      <div className="text-center py-8">
                        <Target size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">No slabs configured</p>
                        <button
                          onClick={addSlab}
                          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                        >
                          Add First Slab
                        </button>
                      </div>
                    )}

                    {slabs.length > 0 && (
                      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                          <TrendingUp size={18} />
                          Incentive Structure Preview
                        </h4>
                        <div className="space-y-2">
                          {sortedSlabs.map((slab, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                              <span className="text-blue-700">
                                Complete {slab.rides} rides
                              </span>
                              <span className="font-bold text-blue-900">
                                → Earn ₹{slab.amount}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Driver Banner Images Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ImageIcon size={22} className="text-white" />
                        <div>
                          <h2 className="text-xl font-bold text-white">Driver Banners</h2>
                          <p className="text-purple-100 text-sm">Promotional banners for driver app</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-all font-semibold cursor-pointer">
                        <Upload size={18} />
                        Upload
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleDriverImageUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="p-6">
                    {uploadingImage && (
                      <div className="flex items-center justify-center py-4 mb-4">
                        <RefreshCw size={24} className="animate-spin text-purple-500" />
                        <span className="ml-2 text-gray-600">Uploading image...</span>
                      </div>
                    )}

                    {images.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {images.map((imageUrl, index) => (
                          <div
                            key={index}
                            className="relative group rounded-xl overflow-hidden border border-gray-200"
                          >
                            <img
                              src={getFullImageUrl(imageUrl)}
                              alt={`Incentive banner ${index + 1}`}
                              className="w-full h-40 object-cover"
                              onError={(e) => {
                                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="160"%3E%3Crect fill="%23f3f4f6" width="400" height="160"/%3E%3Ctext fill="%239ca3af" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="system-ui" font-size="14"%3EImage Unavailable%3C/text%3E%3C/svg%3E';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                onClick={() => removeDriverImage(imageUrl)}
                                className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                              Banner {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl">
                        <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500 mb-2">No banner images uploaded</p>
                        <label className="inline-block mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors cursor-pointer">
                          <Upload size={16} className="inline mr-2" />
                          Upload First Image
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleDriverImageUpload}
                            className="hidden"
                            disabled={uploadingImage}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Campaign Status */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-4 h-4 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <div>
                        <h3 className="font-semibold text-gray-800">Campaign Status</h3>
                        <p className="text-sm text-gray-500">
                          {isActive 
                            ? 'This campaign is active and will apply to drivers' 
                            : 'This campaign is inactive'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsActive(!isActive)}
                      className={`relative w-14 h-7 rounded-full transition-colors ${
                        isActive ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          isActive ? 'translate-x-8' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ================================================================== */}
        {/* CUSTOMER BANNERS TAB */}
        {/* ================================================================== */}
        {activeTab === 'customer' && (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Bell size={24} className="text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-800 text-lg">Customer Notification Banners</h3>
                  <p className="text-orange-700 mt-1">
                    Banners uploaded here will appear in the <strong>Customer App → Notifications → Offers tab</strong>.
                    Customers can see today's offers and yesterday's expired offers.
                  </p>
                </div>
              </div>
            </div>

            {/* Add New Banner Button / Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShoppingBag size={22} className="text-white" />
                    <div>
                      <h2 className="text-xl font-bold text-white">Customer Banners</h2>
                      <p className="text-orange-100 text-sm">Promotional offers for customer app</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCustomerBannerForm(!showCustomerBannerForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-lg hover:bg-orange-50 transition-all font-semibold"
                  >
                    {showCustomerBannerForm ? (
                      <>
                        <X size={18} />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        Add Banner
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Add Banner Form */}
              {showCustomerBannerForm && (
                <div className="p-6 bg-orange-50/50 border-b border-orange-100">
                  <div className="max-w-2xl mx-auto space-y-5">
                    {/* Image Upload / URL */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Banner Image *
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="url"
                          value={customerBannerForm.imageUrl}
                          onChange={(e) => setCustomerBannerForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                          placeholder="Enter image URL or upload..."
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <label className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold cursor-pointer transition-all ${
                          uploadingCustomerBanner 
                            ? 'bg-gray-200 text-gray-500' 
                            : 'bg-orange-500 text-white hover:bg-orange-600'
                        }`}>
                          {uploadingCustomerBanner ? (
                            <RefreshCw size={18} className="animate-spin" />
                          ) : (
                            <Upload size={18} />
                          )}
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleCustomerBannerImageUpload}
                            className="hidden"
                            disabled={uploadingCustomerBanner}
                          />
                        </label>
                      </div>
                      {customerBannerForm.imageUrl && (
                        <div className="mt-3">
                          <img
                            src={getFullImageUrl(customerBannerForm.imageUrl)}
                            alt="Preview"
                            className="w-full max-h-48 object-cover rounded-xl border border-gray-200"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="160"%3E%3Crect fill="%23f3f4f6" width="400" height="160"/%3E%3Ctext fill="%239ca3af" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="system-ui" font-size="14"%3EInvalid Image URL%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Title */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Title (Optional)
                        </label>
                        <input
                          type="text"
                          value={customerBannerForm.title}
                          onChange={(e) => setCustomerBannerForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., Flash Sale!"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>

                      {/* Type */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Banner Type
                        </label>
                        <select
                          value={customerBannerForm.type}
                          onChange={(e) => setCustomerBannerForm(prev => ({ ...prev, type: e.target.value as any }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
                        >
                          <option value="promotion">🎉 Promotion</option>
                          <option value="offer">🏷️ Offer</option>
                          <option value="announcement">📣 Announcement</option>
                          <option value="event">🎊 Event</option>
                        </select>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Description (Optional)
                      </label>
                      <textarea
                        value={customerBannerForm.description}
                        onChange={(e) => setCustomerBannerForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Brief description of the offer..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent h-20 resize-none"
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Display Date
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="date"
                          value={customerBannerForm.date}
                          onChange={(e) => setCustomerBannerForm(prev => ({ ...prev, date: e.target.value }))}
                          className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomerBannerForm(prev => ({ ...prev, date: getTodayDate() }))}
                          className="px-4 py-3 bg-orange-100 text-orange-700 rounded-xl hover:bg-orange-200 font-medium"
                        >
                          Today
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        ⓘ Banners show in "Today" or "Yesterday" tabs based on this date
                      </p>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={saveCustomerBanner}
                        disabled={!customerBannerForm.imageUrl || uploadingCustomerBanner}
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all ${
                          !customerBannerForm.imageUrl || uploadingCustomerBanner
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 shadow-lg'
                        }`}
                      >
                        {uploadingCustomerBanner ? (
                          <RefreshCw size={18} className="animate-spin" />
                        ) : (
                          <Save size={18} />
                        )}
                        Save Banner
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Banners List */}
              <div className="p-6">
                {loadingCustomerBanners ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <RefreshCw size={32} className="animate-spin text-orange-500" />
                    <p className="mt-4 text-gray-500">Loading banners...</p>
                  </div>
                ) : customerBanners.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-6">
                      <ImageIcon size={40} className="text-orange-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">No Customer Banners Yet</h3>
                    <p className="text-gray-500 mb-6">
                      Create your first promotional banner to display in the customer app
                    </p>
                    <button
                      onClick={() => setShowCustomerBannerForm(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-semibold transition-all"
                    >
                      <Plus size={20} />
                      Create First Banner
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Today's Banners */}
                    {todayBanners.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                          Today's Banners
                          <span className="text-sm font-normal text-gray-500">({todayBanners.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {todayBanners.map((banner) => (
                            <CustomerBannerCard
                              key={banner._id}
                              banner={banner}
                              getFullImageUrl={getFullImageUrl}
                              getTypeIcon={getTypeIcon}
                              getTypeColor={getTypeColor}
                              onDelete={() => deleteCustomerBanner(banner._id)}
                              onToggle={() => toggleCustomerBannerStatus(banner)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other Banners */}
                    {otherBanners.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                          Other Banners
                          <span className="text-sm font-normal text-gray-500">({otherBanners.length})</span>
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {otherBanners.map((banner) => (
                            <CustomerBannerCard
                              key={banner._id}
                              banner={banner}
                              getFullImageUrl={getFullImageUrl}
                              getTypeIcon={getTypeIcon}
                              getTypeColor={getTypeColor}
                              formatShortDate={formatShortDate}
                              onDelete={() => deleteCustomerBanner(banner._id)}
                              onToggle={() => toggleCustomerBannerStatus(banner)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tips Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                💡 Tips for Customer Banners
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="font-medium text-gray-800 mb-1">📐 Recommended Size</p>
                  <p className="text-sm text-gray-600">800 × 400 pixels for best display</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="font-medium text-gray-800 mb-1">📁 Max File Size</p>
                  <p className="text-sm text-gray-600">5MB for fast loading</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="font-medium text-gray-800 mb-1">📅 Date Logic</p>
                  <p className="text-sm text-gray-600">Today = Active, Yesterday = Expired</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="font-medium text-gray-800 mb-1">📱 Customer View</p>
                  <p className="text-sm text-gray-600">Notifications → Offers Tab</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ============================================================================
// CUSTOMER BANNER CARD COMPONENT
// ============================================================================
interface CustomerBannerCardProps {
  banner: CustomerBanner;
  getFullImageUrl: (url: string) => string;
  getTypeIcon: (type: string) => JSX.Element;
  getTypeColor: (type: string) => string;
  formatShortDate?: (date: string) => string;
  onDelete: () => void;
  onToggle: () => void;
}

function CustomerBannerCard({
  banner,
  getFullImageUrl,
  getTypeIcon,
  getTypeColor,
  formatShortDate,
  onDelete,
  onToggle,
}: CustomerBannerCardProps) {
  const isToday = banner.date === new Date().toISOString().split('T')[0];
  const isYesterday = banner.date === new Date(Date.now() - 86400000).toISOString().split('T')[0];

  return (
    <div className={`relative rounded-xl border overflow-hidden transition-all hover:shadow-md ${
      banner.isActive 
        ? 'border-gray-200' 
        : 'border-gray-100 opacity-60'
    }`}>
      {/* Image */}
      <div className="relative h-36">
        <img
          src={getFullImageUrl(banner.imageUrl)}
          alt={banner.title || 'Banner'}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="160"%3E%3Crect fill="%23f3f4f6" width="400" height="160"/%3E%3Ctext fill="%239ca3af" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="system-ui" font-size="14"%3EImage Not Found%3C/text%3E%3C/svg%3E';
          }}
        />
        
        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            banner.isActive 
              ? 'bg-green-500 text-white' 
              : 'bg-gray-500 text-white'
          }`}>
            {banner.isActive ? 'Active' : 'Inactive'}
          </span>
          
          {isToday && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-500 text-white">
              Today
            </span>
          )}
          {isYesterday && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-400 text-white">
              Yesterday
            </span>
          )}
        </div>

        {/* Type Badge */}
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${getTypeColor(banner.type)}`}>
          {getTypeIcon(banner.type)}
          {banner.type}
        </span>
      </div>

      {/* Content */}
      <div className="p-3">
        {banner.title && (
          <h4 className="font-semibold text-gray-800 text-sm truncate">
            {banner.title}
          </h4>
        )}
        {banner.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {banner.description}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-2">
          📅 {formatShortDate ? formatShortDate(banner.date) : banner.date}
        </p>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={onToggle}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
              banner.isActive 
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
          >
            {banner.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
            {banner.isActive ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={onDelete}
            className="py-1.5 px-3 rounded-lg text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-all"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}