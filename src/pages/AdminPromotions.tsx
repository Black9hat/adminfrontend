import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  Trash2, 
  Plus, 
  X, 
  AlertTriangle, 
  Image as ImageIcon,
  Users,
  Car,
  Smartphone,
  CheckCircle2,
  XCircle,
  Eye,
  Calendar,
  TrendingUp,
  RefreshCw,
  Megaphone,
  Zap,
  Monitor,
  ToggleLeft,
  ToggleRight,
  Sparkles
} from 'lucide-react';
import axios from 'axios';

// ✅ Updated interface to include isStartupBanner
interface Promotion {
  _id: string;
  imageUrl: string;
  title: string;
  isActive: boolean;
  isStartupBanner: boolean;
  order: number;
  createdAt: string;
  target?: string[];
  viewCount?: number;
  clickCount?: number;
}

type TargetOption = 'customer' | 'driver' | 'both';
type SectionType = 'customer' | 'driver' | 'general';

const API_BASE = 'https://ghumobackend.onrender.com';

export default function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [title, setTitle] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<TargetOption | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStartupBanner, setIsStartupBanner] = useState(false);
  const [uploadSection, setUploadSection] = useState<SectionType>('general');
  
  // Auto Refresh States
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // ✅ Filter promotions
  const customerPromotions = promotions.filter(p => {
    if (!p.target || p.target.length === 0) return true;
    return p.target.includes('customer');
  });

  const driverPromotions = promotions.filter(p => {
    if (!p.target || p.target.length === 0) return true;
    return p.target.includes('driver');
  });

  const customerStartupBanners = customerPromotions.filter(p => p.isStartupBanner);
  const customerCarouselPromotions = customerPromotions.filter(p => !p.isStartupBanner);
  const driverStartupBanners = driverPromotions.filter(p => p.isStartupBanner);
  const driverCarouselPromotions = driverPromotions.filter(p => !p.isStartupBanner);

  // ✅ Stats
  const stats = {
    total: promotions.length,
    active: promotions.filter(p => p.isActive).length,
    inactive: promotions.filter(p => !p.isActive).length,
    startupBanners: promotions.filter(p => p.isStartupBanner).length,
    carouselPromotions: promotions.filter(p => !p.isStartupBanner).length,
  };

  const getAuthToken = (): string => {
    return localStorage.getItem('adminToken') || '';
  };

  const formatLastRefreshed = (): string => {
    if (!lastRefreshed) return "Never";
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - lastRefreshed.getTime()) / 1000);
    if (diffInSeconds < 5) return "Just now";
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    return lastRefreshed.toLocaleTimeString();
  };

  const getTargetInfo = (target?: string[]) => {
    if (!target || target.length === 0 || (target.includes('customer') && target.includes('driver'))) {
      return {
        text: 'All Users',
        icon: <Users size={14} />,
        color: 'text-orange-700 dark:text-orange-300',
        bgColor: 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800'
      };
    }
    if (target.includes('customer') && target.length === 1) {
      return {
        text: 'Customers',
        icon: <Smartphone size={14} />,
        color: 'text-blue-700 dark:text-blue-300',
        bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
      };
    }
    if (target.includes('driver') && target.length === 1) {
      return {
        text: 'Drivers',
        icon: <Car size={14} />,
        color: 'text-purple-700 dark:text-purple-300',
        bgColor: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800'
      };
    }
    return {
      text: 'All Users',
      icon: <Users size={14} />,
      color: 'text-orange-700 dark:text-orange-300',
      bgColor: 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800'
    };
  };

  const getTargetArrayFromSelection = (selection: TargetOption): string[] => {
    switch (selection) {
      case 'customer': return ['customer'];
      case 'driver': return ['driver'];
      case 'both':
      default: return ['customer', 'driver'];
    }
  };

  // ✅ Fetch promotions
  const fetchPromotions = useCallback(async (showRefreshAnimation = false) => {
    try {
      if (showRefreshAnimation) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const token = getAuthToken();
      if (!token) {
        setMessage({ type: 'error', text: 'Please login to view promotions' });
        return;
      }

      const response = await axios.get(`${API_BASE}/api/admin/promotions`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/json'
        },
      });

      setPromotions(response.data.promotions || []);
      setLastRefreshed(new Date());
      
      if (message?.type === 'error' && message.text.includes('login')) {
        setMessage(null);
      }
    } catch (error) {
      console.error('❌ fetchPromotions error:', error);
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          setMessage({ type: 'error', text: 'Authentication failed. Please login again.' });
        } else {
          setMessage({ type: 'error', text: 'Failed to load promotions' });
        }
      }
      setPromotions([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [message]);

  useEffect(() => {
    fetchPromotions();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchPromotions(true);
      }, refreshInterval * 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval, fetchPromotions]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Please select an image file' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'Image size should be less than 5MB' });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setMessage(null);
    }
  };

  const openUploadModal = (section: SectionType) => {
    setUploadSection(section);
    if (section === 'customer') {
      setSelectedTarget('customer');
    } else if (section === 'driver') {
      setSelectedTarget('driver');
    } else {
      setSelectedTarget(null);
    }
    setIsStartupBanner(false);
    setShowUploadModal(true);
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim() || !selectedTarget) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('title', title);
    formData.append('target', JSON.stringify(getTargetArrayFromSelection(selectedTarget)));
    formData.append('isStartupBanner', String(isStartupBanner));

    try {
      setLoading(true);
      setUploadProgress(10);

      const token = getAuthToken();
      if (!token) {
        setMessage({ type: 'error', text: 'Please login to upload promotions' });
        setLoading(false);
        return;
      }

      const response = await axios.post(
        `${API_BASE}/api/admin/promotions/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true'
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
            }
          },
        }
      );

      setPromotions([...promotions, response.data.promotion]);
      resetModalForm();
      
      const bannerType = isStartupBanner ? 'Popup Banner' : 'Carousel Promotion';
      setMessage({ type: 'success', text: `${bannerType} uploaded successfully!` });

      setTimeout(() => setUploadProgress(0), 1000);
    } catch (error) {
      console.error('❌ Error uploading promotion:', error);
      setMessage({ type: 'error', text: 'Failed to upload promotion' });
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;

    try {
      setLoading(true);
      const token = getAuthToken();

      await axios.delete(`${API_BASE}/api/admin/promotions/${id}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
      });

      setPromotions(promotions.filter(p => p._id !== id));
      setMessage({ type: 'success', text: 'Promotion deleted successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete promotion' });
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const token = getAuthToken();

      await axios.put(
        `${API_BASE}/api/admin/promotions/${id}/toggle`,
        { isActive: !currentStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
        }
      );

      setPromotions(promotions.map(p => 
        p._id === id ? { ...p, isActive: !currentStatus } : p
      ));
      
      setMessage({ 
        type: 'success', 
        text: `Promotion ${!currentStatus ? 'activated' : 'deactivated'} successfully!` 
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to toggle promotion status' });
    }
  };

  const toggleStartupBanner = async (id: string, currentStatus: boolean) => {
    try {
      const token = getAuthToken();

      await axios.put(
        `${API_BASE}/api/admin/promotions/${id}/toggle-startup-banner`,
        { isStartupBanner: !currentStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
        }
      );

      setPromotions(promotions.map(p => 
        p._id === id ? { ...p, isStartupBanner: !currentStatus } : p
      ));
      
      setMessage({ 
        type: 'success', 
        text: `Promotion ${!currentStatus ? 'set as popup' : 'moved to carousel'} successfully!` 
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to toggle startup banner' });
    }
  };

  const resetModalForm = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setPreviewUrl('');
    setTitle('');
    setSelectedTarget(null);
    setUploadSection('general');
    setIsStartupBanner(false);
  };

  const isFormValid = selectedFile && title.trim() && selectedTarget;

  // ✅ Promotion Card Component
  const PromotionCard = ({ promotion }: { promotion: Promotion }) => {
    const targetInfo = getTargetInfo(promotion.target);
    
    return (
      <div className={`group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-slate-200 dark:hover:border-slate-600 ${
        !promotion.isActive ? 'opacity-75' : ''
      }`}>
        {/* Image Section */}
        <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-700">
          <img
            src={promotion.imageUrl}
            alt={promotion.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="200"%3E%3Crect fill="%23475569" width="400" height="200"/%3E%3Ctext fill="%2394a3b8" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="system-ui" font-size="14"%3EImage Unavailable%3C/text%3E%3C/svg%3E';
            }}
          />
          
          {/* Status Badge */}
          <div className="absolute top-3 right-3">
            <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg ${
              promotion.isActive 
                ? 'bg-emerald-500 text-white' 
                : 'bg-slate-500 text-white'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                promotion.isActive ? 'bg-emerald-200 animate-pulse' : 'bg-slate-300'
              }`}></span>
              {promotion.isActive ? 'Live' : 'Paused'}
            </div>
          </div>
          
          {/* Target Badge */}
          <div className="absolute top-3 left-3">
            <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border shadow-sm ${targetInfo.bgColor} ${targetInfo.color}`}>
              {targetInfo.icon}
              {targetInfo.text}
            </div>
          </div>

          {/* Startup Banner Badge */}
          {promotion.isStartupBanner && (
            <div className="absolute bottom-3 left-3">
              <div className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
                <Sparkles size={12} />
                Popup
              </div>
            </div>
          )}
        </div>
        
        {/* Content Section */}
        <div className="p-5">
          <h3 className="font-semibold text-slate-900 dark:text-white text-lg mb-2 line-clamp-1">
            {promotion.title}
          </h3>
          
          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>{new Date(promotion.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}</span>
            </div>
            <div className={`flex items-center gap-1 ${promotion.isStartupBanner ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'}`}>
              {promotion.isStartupBanner ? <Zap size={14} /> : <Monitor size={14} />}
              <span>{promotion.isStartupBanner ? 'Popup' : 'Carousel'}</span>
            </div>
          </div>

          {/* Startup Banner Toggle */}
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className={promotion.isStartupBanner ? 'text-amber-500' : 'text-slate-400'} />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Show as Popup</span>
              </div>
              <button
                onClick={() => toggleStartupBanner(promotion._id, promotion.isStartupBanner)}
                disabled={loading}
                className="focus:outline-none disabled:opacity-50"
              >
                {promotion.isStartupBanner ? (
                  <ToggleRight size={32} className="text-amber-500" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-300 dark:text-slate-500 hover:text-slate-400" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {promotion.isStartupBanner 
                ? 'Shows as popup on app open' 
                : 'Shows in carousel slider'}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => toggleActive(promotion._id, promotion.isActive)}
              disabled={loading}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                promotion.isActive
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {promotion.isActive ? (
                <>
                  <XCircle size={16} />
                  Pause
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Activate
                </>
              )}
            </button>
            <button
              onClick={() => handleDelete(promotion._id)}
              disabled={loading}
              className="px-4 py-2.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ✅ Empty State Component
  const EmptyState = ({ section, type }: { section: 'customer' | 'driver'; type: 'startup' | 'carousel' }) => (
    <div className="bg-slate-50 dark:bg-slate-700/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-600 p-8">
      <div className="text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
          type === 'startup' ? 'bg-amber-100 dark:bg-amber-900/30' : 
          section === 'customer' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'
        }`}>
          {type === 'startup' ? (
            <Zap size={28} className="text-amber-500" />
          ) : section === 'customer' ? (
            <Smartphone size={28} className="text-blue-500" />
          ) : (
            <Car size={28} className="text-purple-500" />
          )}
        </div>
        <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
          No {type === 'startup' ? 'Popup' : 'Carousel'} Promotions
        </h4>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          {type === 'startup' 
            ? 'Add a popup that shows when users open the app'
            : `Create promotions for the ${section} app carousel`}
        </p>
        <button
          onClick={() => openUploadModal(section)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium transition-colors shadow-lg ${
            type === 'startup' 
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
              : section === 'customer' 
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' 
              : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
          }`}
        >
          <Plus size={18} />
          Add Promotion
        </button>
      </div>
    </div>
  );

  // ✅ Startup Banner Section
  const StartupBannerSection = ({ banners, section }: { banners: Promotion[]; section: 'customer' | 'driver' }) => (
    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-4 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
          <Zap size={20} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="font-semibold text-amber-900 dark:text-amber-100">Startup Popup Banner</h3>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Shows as a popup when {section}s open the app
          </p>
        </div>
        {banners.length > 0 && banners[0].isActive && (
          <div className="ml-auto px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-200 rounded-full animate-pulse"></span>
            Active
          </div>
        )}
      </div>

      {banners.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-800 p-6 text-center">
          <Zap size={32} className="text-amber-400 mx-auto mb-3" />
          <p className="text-amber-800 dark:text-amber-200 font-medium mb-2">No startup popup set</p>
          <p className="text-amber-600 dark:text-amber-400 text-sm">
            Add a promotion and toggle "Show as Popup" to enable
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((banner) => (
            <div 
              key={banner._id}
              className="bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-700 overflow-hidden shadow-sm"
            >
              <div className="relative aspect-video">
                <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    banner.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'
                  }`}>
                    {banner.isActive ? 'Live' : 'Paused'}
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="font-medium text-slate-900 dark:text-white truncate">{banner.title}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => toggleActive(banner._id, banner.isActive)}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      banner.isActive 
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300' 
                        : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                    }`}
                  >
                    {banner.isActive ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => toggleStartupBanner(banner._id, true)}
                    className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-medium"
                  >
                    → Carousel
                  </button>
                  <button
                    onClick={() => handleDelete(banner._id)}
                    className="px-3 py-1.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

      <div className="relative">
        {/* Toast Notification */}
        {message && (
          <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-2 duration-300">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
              message.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-900/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-900/50 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle2 size={20} className="text-emerald-500" />
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
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Title Section */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 dark:shadow-orange-900/50">
                    <Megaphone size={24} className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Promotions Manager</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Create and manage promotional banners</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Auto Refresh Toggle */}
                  <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-100 dark:peer-focus:ring-orange-900/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Auto</span>
                    {autoRefresh && (
                      <select
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                        className="text-xs bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg px-2 py-1 focus:ring-2 focus:ring-orange-500 text-slate-700 dark:text-slate-200"
                      >
                        <option value={10}>10s</option>
                        <option value={30}>30s</option>
                        <option value={60}>1m</option>
                      </select>
                    )}
                  </div>

                  {/* Last Updated */}
                  <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-3 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                    <div className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                    <span>{formatLastRefreshed()}</span>
                  </div>

                  {/* Refresh Button */}
                  <button
                    onClick={() => fetchPromotions(true)}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-all shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw size={16} className={`text-slate-600 dark:text-slate-300 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Refresh</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Total", value: stats.total, icon: <TrendingUp size={18} />, color: "slate" },
              { label: "Active", value: stats.active, icon: <Eye size={18} />, color: "emerald" },
              { label: "Inactive", value: stats.inactive, icon: <XCircle size={18} />, color: "slate" },
              { label: "Popups", value: stats.startupBanners, icon: <Zap size={18} />, color: "amber" },
              { label: "Carousel", value: stats.carouselPromotions, icon: <Monitor size={18} />, color: "blue" },
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{stat.label}</p>
                    <p className={`text-3xl font-bold mt-2 ${
                      stat.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                      stat.color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                      stat.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                      'text-slate-600 dark:text-slate-300'
                    }`}>{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    stat.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500' :
                    stat.color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-500' :
                    stat.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-500' :
                    'bg-slate-50 dark:bg-slate-700 text-slate-500'
                  }`}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Loading State */}
          {loading && promotions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-orange-100 dark:border-orange-900 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="mt-6 text-slate-500 dark:text-slate-400 font-medium">Loading promotions...</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Customer Promotions Section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <Smartphone size={22} className="text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Customer Promotions</h2>
                        <p className="text-blue-100 text-sm">
                          Visible in customer app ({customerPromotions.length} total)
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openUploadModal('customer')}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all font-semibold shadow-lg"
                    >
                      <Plus size={18} />
                      <span className="hidden sm:inline">Add Promotion</span>
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <StartupBannerSection banners={customerStartupBanners} section="customer" />

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Monitor size={18} className="text-blue-500" />
                      <h3 className="font-semibold text-slate-800 dark:text-white">Carousel Promotions</h3>
                      <span className="text-sm text-slate-500 dark:text-slate-400">({customerCarouselPromotions.length})</span>
                    </div>
                    
                    {customerCarouselPromotions.length === 0 ? (
                      <EmptyState section="customer" type="carousel" />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {customerCarouselPromotions.map((promotion) => (
                          <PromotionCard key={promotion._id} promotion={promotion} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Driver Promotions Section */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <Car size={22} className="text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Driver Promotions</h2>
                        <p className="text-purple-100 text-sm">
                          Visible in driver app ({driverPromotions.length} total)
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => openUploadModal('driver')}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-xl hover:bg-purple-50 transition-all font-semibold shadow-lg"
                    >
                      <Plus size={18} />
                      <span className="hidden sm:inline">Add Promotion</span>
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <StartupBannerSection banners={driverStartupBanners} section="driver" />

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Monitor size={18} className="text-purple-500" />
                      <h3 className="font-semibold text-slate-800 dark:text-white">Carousel Promotions</h3>
                      <span className="text-sm text-slate-500 dark:text-slate-400">({driverCarouselPromotions.length})</span>
                    </div>
                    
                    {driverCarouselPromotions.length === 0 ? (
                      <EmptyState section="driver" type="carousel" />
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {driverCarouselPromotions.map((promotion) => (
                          <PromotionCard key={promotion._id} promotion={promotion} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className={`px-6 py-5 ${
              uploadSection === 'customer' 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                : uploadSection === 'driver'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600'
                : 'bg-gradient-to-r from-orange-500 to-orange-600'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    {uploadSection === 'customer' ? (
                      <Smartphone size={20} className="text-white" />
                    ) : uploadSection === 'driver' ? (
                      <Car size={20} className="text-white" />
                    ) : (
                      <Upload size={20} className="text-white" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {uploadSection === 'customer' ? 'New Customer Promotion' : 
                       uploadSection === 'driver' ? 'New Driver Promotion' : 'New Promotion'}
                    </h2>
                    <p className="text-sm text-white/80">
                      {uploadSection === 'customer' ? 'Customer app' : 
                       uploadSection === 'driver' ? 'Driver app' : 'Create banner'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetModalForm}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="text-sm font-semibold text-slate-900 dark:text-white mb-2 block">
                    Promotion Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Summer Sale - 50% Off!"
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
                    disabled={loading}
                  />
                </div>

                {/* Target Audience */}
                <div>
                  <label className="text-sm font-semibold text-slate-900 dark:text-white mb-2 block">
                    Target Audience <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['customer', 'driver', 'both'].map((target) => {
                      if (uploadSection === 'customer' && target === 'driver') return null;
                      if (uploadSection === 'driver' && target === 'customer') return null;
                      
                      const isSelected = selectedTarget === target;
                      const config = {
                        customer: { icon: <Smartphone size={20} />, label: 'Customers', color: 'blue' },
                        driver: { icon: <Car size={20} />, label: 'Drivers', color: 'purple' },
                        both: { icon: <Users size={20} />, label: 'Everyone', color: 'orange' }
                      }[target as 'customer' | 'driver' | 'both'];

                      return (
                        <button
                          key={target}
                          type="button"
                          onClick={() => setSelectedTarget(target as TargetOption)}
                          disabled={loading}
                          className={`relative p-4 rounded-xl border-2 transition-all ${
                            isSelected
                              ? `border-${config?.color}-500 bg-${config?.color}-50 dark:bg-${config?.color}-900/30`
                              : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 bg-white dark:bg-slate-700'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle2 size={16} className={`text-${config?.color}-500`} />
                            </div>
                          )}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 ${
                            isSelected ? `bg-${config?.color}-500 text-white` : 'bg-slate-100 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
                          }`}>
                            {config?.icon}
                          </div>
                          <p className={`text-sm font-medium text-center ${
                            isSelected ? `text-${config?.color}-700 dark:text-${config?.color}-300` : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {config?.label}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Display Type */}
                <div>
                  <label className="text-sm font-semibold text-slate-900 dark:text-white mb-2 block">
                    Display Type
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIsStartupBanner(false)}
                      disabled={loading}
                      className={`relative p-4 rounded-xl border-2 transition-all ${
                        !isStartupBanner
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700'
                      }`}
                    >
                      {!isStartupBanner && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 size={16} className="text-blue-500" />
                        </div>
                      )}
                      <Monitor size={24} className={`mx-auto mb-2 ${!isStartupBanner ? 'text-blue-500' : 'text-slate-400'}`} />
                      <p className={`text-sm font-medium text-center ${!isStartupBanner ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>
                        Carousel
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsStartupBanner(true)}
                      disabled={loading}
                      className={`relative p-4 rounded-xl border-2 transition-all ${
                        isStartupBanner
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30'
                          : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700'
                      }`}
                    >
                      {isStartupBanner && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 size={16} className="text-amber-500" />
                        </div>
                      )}
                      <Zap size={24} className={`mx-auto mb-2 ${isStartupBanner ? 'text-amber-500' : 'text-slate-400'}`} />
                      <p className={`text-sm font-medium text-center ${isStartupBanner ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-400'}`}>
                        Popup
                      </p>
                    </button>
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="text-sm font-semibold text-slate-900 dark:text-white mb-2 block">
                    Banner Image <span className="text-red-500">*</span>
                  </label>
                  <div className={`border-2 border-dashed rounded-xl transition-all ${
                    previewUrl ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                  }`}>
                    {previewUrl ? (
                      <div className="p-4">
                        <div className="relative rounded-xl overflow-hidden">
                          <img src={previewUrl} alt="Preview" className="w-full h-48 object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => { setSelectedFile(null); setPreviewUrl(''); }}
                              className="px-4 py-2 bg-white text-slate-700 rounded-lg font-medium"
                            >
                              Change Image
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 text-sm text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={16} />
                          <span>Image selected</span>
                        </div>
                      </div>
                    ) : (
                      <label className="block p-8 cursor-pointer">
                        <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" disabled={loading} />
                        <div className="text-center">
                          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Upload size={24} className="text-slate-400" />
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 font-medium mb-1">Click to upload</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">PNG, JPG up to 5MB</p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                {/* Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Uploading...</span>
                      <span className="font-medium text-orange-600">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700">
              <div className="flex gap-3">
                <button
                  onClick={resetModalForm}
                  disabled={loading}
                  className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!isFormValid || loading}
                  className={`flex-1 px-4 py-3 text-white rounded-xl transition-all font-semibold disabled:opacity-50 shadow-lg ${
                    isStartupBanner
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                      : uploadSection === 'customer'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                      : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Uploading...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {isStartupBanner ? <Zap size={18} /> : <Upload size={18} />}
                      {isStartupBanner ? 'Add Popup' : 'Add to App'}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}