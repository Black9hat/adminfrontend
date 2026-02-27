import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { toast } from "react-toastify";
import {
  Search,
  RefreshCw,
  ChevronDown,
  Save,
  Trash2,
  X,
  DollarSign,
  Percent,
  Zap,
  Gift,
  Settings,
  Filter,
  MapPin,
  Car,
  Bike,
  Truck,
  Users,
  TrendingUp,
  Calculator,
  AlertCircle,
  ArrowRight,
  PieChart,
} from "lucide-react";

const API_BASE = "/admin/fare";

interface FareRate {
  _id: string;
  vehicleType: string;
  category?: string;
  baseFare: number;
  perKm: number;
  perMin?: number;
  minFare?: number;
  manualSurge?: number;
  peakMultiplier?: number;
  nightMultiplier?: number;
  platformFeePercent?: number;
  gstPercent?: number;
  perRideIncentive?: number;
  perRideCoins?: number;
}

const COLORS = {
  background: "#FFFFFF",
  surface: "#F8F9FA",
  cardBackground: "#FFFFFF",
  onSurface: "#1A1A1A",
  onSurfaceSecondary: "#4A4A4A",
  onSurfaceTertiary: "#8A8A8A",
  primary: "#B85F00",
  primaryLight: "#FFF3E8",
  onPrimary: "#FFFFFF",
  divider: "#E8E8E8",
  success: "#2E7D32",
  warning: "#F57C00",
  error: "#D32F2F",
};

const getVehicleIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case "bike":
      return <Bike className="w-5 h-5" />;
    case "auto":
      return <Car className="w-5 h-5" />;
    case "xl":
    case "suv":
      return <Truck className="w-5 h-5" />;
    default:
      return <Car className="w-5 h-5" />;
  }
};

const FareManagement: React.FC = () => {
  const [rates, setRates] = useState<FareRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVehicle, setFilterVehicle] = useState<string>("all");
  const [previewDistance, setPreviewDistance] = useState(10);
  const [previewTime, setPreviewTime] = useState(20);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`${API_BASE}/rates`);
      setRates(res.data.rates || []);
    } catch (err) {
      console.error("Failed to load fare rates:", err);
      toast.error("Failed to load fare rates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleChange = <K extends keyof FareRate>(
    index: number,
    field: K,
    value: FareRate[K]
  ) => {
    const updated = [...rates];
    updated[index][field] = value;
    setRates(updated);
  };

  const handleSave = async (rate: FareRate) => {
    try {
      setSavingId(rate._id);
      await axiosInstance.put(`${API_BASE}/update/${rate._id}`, rate);
      toast.success(`Updated ${rate.vehicleType} fare successfully`);
      fetchRates();
    } catch (err) {
      console.error("Save failed:", err);
      toast.error("Failed to save changes");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (id: string, vehicleType: string) => {
    if (!window.confirm(`Delete ${vehicleType} fare rate? This cannot be undone.`)) return;
    try {
      await axiosInstance.delete(`${API_BASE}/delete/${id}`);
      toast.success("Rate deleted successfully");
      fetchRates();
    } catch (err) {
      toast.error("Failed to delete rate");
    }
  };

  const calculateFareBreakdown = (rate: FareRate, distance: number, time: number) => {
    const baseFare = rate.baseFare;
    const distanceFare = rate.perKm * distance;
    const timeFare = (rate.perMin ?? 0) * time;
    const subtotal = baseFare + distanceFare + timeFare;
    
    const surgeMultiplier = rate.manualSurge ?? 1;
    const surgeAmount = subtotal * (surgeMultiplier - 1);
    const afterSurge = subtotal + surgeAmount;
    
    const gstAmount = (afterSurge * (rate.gstPercent ?? 0)) / 100;
    const totalCustomerPays = Math.max(afterSurge + gstAmount, rate.minFare ?? 0);
    
    const platformFee = (afterSurge * (rate.platformFeePercent ?? 10)) / 100;
    const driverEarnings = afterSurge - platformFee + (rate.perRideIncentive ?? 0);
    
    return {
      baseFare,
      distanceFare,
      timeFare,
      subtotal,
      surgeMultiplier,
      surgeAmount,
      afterSurge,
      gstAmount,
      totalCustomerPays,
      platformFee,
      driverEarnings,
      perRideIncentive: rate.perRideIncentive ?? 0,
      perRideCoins: rate.perRideCoins ?? 0,
      commission: platformFee,
    };
  };

  const filteredRates = rates.filter((rate) => {
    const matchesSearch = rate.vehicleType?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVehicle = filterVehicle === "all" || rate.vehicleType?.toLowerCase() === filterVehicle;
    return matchesSearch && matchesVehicle;
  });

  const vehicleTypes = [...new Set(rates.map((r) => r.vehicleType?.toLowerCase()))];

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100%', backgroundColor: COLORS.surface }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" 
               style={{ borderColor: COLORS.primaryLight, borderTopColor: COLORS.primary }}></div>
          <p style={{ color: COLORS.onSurfaceSecondary }} className="font-medium">Loading fare configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full" style={{ minHeight: '100%', backgroundColor: COLORS.surface }}>
      {/* LEFT SIDEBAR */}
      <div className="w-[420px] min-w-[420px] flex flex-col border-r h-full" 
           style={{ backgroundColor: COLORS.background, borderColor: COLORS.divider }}>
        {/* Header */}
        <div className="p-6 flex-shrink-0" style={{ backgroundColor: COLORS.primary }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" 
                   style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
                <DollarSign className="w-6 h-6" style={{ color: COLORS.onPrimary }} />
              </div>
              <div>
                <h1 className="text-xl font-bold" style={{ color: COLORS.onPrimary }}>Fare Management</h1>
                <p className="text-sm opacity-80" style={{ color: COLORS.onPrimary }}>Configure pricing & incentives</p>
              </div>
            </div>
            <button
              onClick={fetchRates}
              className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <RefreshCw className="w-5 h-5" style={{ color: COLORS.onPrimary }} />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4" style={{ color: COLORS.onSurfaceTertiary }} />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vehicle type..."
              className="w-full pl-10 pr-10 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                color: COLORS.onPrimary,
                borderColor: 'rgba(255,255,255,0.3)',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="w-4 h-4" style={{ color: COLORS.onPrimary }} />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4" style={{ color: COLORS.onPrimary, opacity: 0.8 }} />
            <button
              onClick={() => setFilterVehicle("all")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filterVehicle === "all" ? "" : "opacity-70"
              }`}
              style={{ 
                backgroundColor: filterVehicle === "all" ? COLORS.onPrimary : 'rgba(255,255,255,0.15)',
                color: filterVehicle === "all" ? COLORS.primary : COLORS.onPrimary,
              }}
            >
              All
            </button>
            {vehicleTypes.map((type) => (
              <button
                key={type}
                onClick={() => setFilterVehicle(type)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                  filterVehicle === type ? "" : "opacity-70"
                }`}
                style={{ 
                  backgroundColor: filterVehicle === type ? COLORS.onPrimary : 'rgba(255,255,255,0.15)',
                  color: filterVehicle === type ? COLORS.primary : COLORS.onPrimary,
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0"
             style={{ backgroundColor: COLORS.primaryLight, borderColor: COLORS.divider }}>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>{rates.length}</p>
              <p className="text-xs" style={{ color: COLORS.onSurfaceSecondary }}>Total Rates</p>
            </div>
            <div className="w-px h-10" style={{ backgroundColor: COLORS.divider }}></div>
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>{vehicleTypes.length}</p>
              <p className="text-xs" style={{ color: COLORS.onSurfaceSecondary }}>Vehicles</p>
            </div>
          </div>
          <span className="text-xs" style={{ color: COLORS.onSurfaceTertiary }}>{filteredRates.length} shown</span>
        </div>

        {/* Rate List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredRates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" 
                   style={{ backgroundColor: COLORS.surface }}>
                <Search className="w-8 h-8" style={{ color: COLORS.onSurfaceTertiary }} />
              </div>
              <h3 className="font-semibold mb-1" style={{ color: COLORS.onSurface }}>No Results</h3>
              <p className="text-sm text-center px-4" style={{ color: COLORS.onSurfaceSecondary }}>
                No fare rates match your criteria
              </p>
            </div>
          ) : (
            filteredRates.map((rate) => {
              const isExpanded = expandedCard === rate._id;
              const actualIndex = rates.findIndex((r) => r._id === rate._id);

              return (
                <div
                  key={rate._id}
                  className={`group rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                    isExpanded ? "shadow-lg" : ""
                  }`}
                  style={{
                    backgroundColor: COLORS.background,
                    borderColor: isExpanded ? COLORS.primary : COLORS.divider,
                  }}
                  onClick={() => setExpandedCard(isExpanded ? null : rate._id)}
                >
                  {/* Card Header */}
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" 
                             style={{ backgroundColor: COLORS.primaryLight, color: COLORS.primary }}>
                          {getVehicleIcon(rate.vehicleType)}
                        </div>
                        <div>
                          <h3 className="font-bold uppercase" style={{ color: COLORS.onSurface }}>
                            {rate.vehicleType}
                          </h3>
                          <p className="text-xs" style={{ color: COLORS.onSurfaceSecondary }}>
                            {rate.category || "Standard"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xs" style={{ color: COLORS.onSurfaceTertiary }}>Base</p>
                          <p className="font-bold" style={{ color: COLORS.primary }}>₹{rate.baseFare}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs" style={{ color: COLORS.onSurfaceTertiary }}>Per Km</p>
                          <p className="font-bold" style={{ color: COLORS.primary }}>₹{rate.perKm}</p>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          style={{ color: COLORS.onSurfaceTertiary }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div
                      className="border-t p-4 space-y-5"
                      style={{ borderColor: COLORS.divider }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Base Pricing - Larger Inputs */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <DollarSign className="w-5 h-5" style={{ color: COLORS.primary }} />
                          <h4 className="font-semibold" style={{ color: COLORS.onSurface }}>Base Pricing</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: COLORS.onSurfaceSecondary }}>
                              Base Fare (₹)
                            </label>
                            <input
                              type="number"
                              value={rate.baseFare}
                              onChange={(e) => handleChange(actualIndex, "baseFare", Number(e.target.value))}
                              className="w-full px-4 py-3 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 transition-all"
                              style={{ 
                                backgroundColor: COLORS.surface,
                                borderColor: COLORS.divider,
                                color: COLORS.onSurface,
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: COLORS.onSurfaceSecondary }}>
                              Per Kilometer (₹)
                            </label>
                            <input
                              type="number"
                              value={rate.perKm}
                              onChange={(e) => handleChange(actualIndex, "perKm", Number(e.target.value))}
                              className="w-full px-4 py-3 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 transition-all"
                              style={{ 
                                backgroundColor: COLORS.surface,
                                borderColor: COLORS.divider,
                                color: COLORS.onSurface,
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: COLORS.onSurfaceSecondary }}>
                              Per Minute (₹)
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              value={rate.perMin ?? 0}
                              onChange={(e) => handleChange(actualIndex, "perMin", Number(e.target.value))}
                              className="w-full px-4 py-3 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 transition-all"
                              style={{ 
                                backgroundColor: COLORS.surface,
                                borderColor: COLORS.divider,
                                color: COLORS.onSurface,
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: COLORS.onSurfaceSecondary }}>
                              Minimum Fare (₹)
                            </label>
                            <input
                              type="number"
                              value={rate.minFare ?? 0}
                              onChange={(e) => handleChange(actualIndex, "minFare", Number(e.target.value))}
                              className="w-full px-4 py-3 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 transition-all"
                              style={{ 
                                backgroundColor: COLORS.surface,
                                borderColor: COLORS.divider,
                                color: COLORS.onSurface,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Multipliers */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Zap className="w-5 h-5" style={{ color: COLORS.warning }} />
                          <h4 className="font-semibold" style={{ color: COLORS.onSurface }}>Surge Multipliers</h4>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: COLORS.onSurfaceSecondary }}>
                              Manual Surge
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              min="0.5"
                              max="5"
                              value={rate.manualSurge ?? 1.0}
                              onChange={(e) => handleChange(actualIndex, "manualSurge", Number(e.target.value))}
                              className="w-full px-4 py-3 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 transition-all"
                              style={{ 
                                backgroundColor: COLORS.surface,
                                borderColor: COLORS.divider,
                                color: COLORS.onSurface,
                              }}
                            />
                            {(rate.manualSurge ?? 1) > 1 && (
                              <p className="text-xs mt-1" style={{ color: COLORS.warning }}>
                                +{(((rate.manualSurge ?? 1) - 1) * 100).toFixed(0)}% active
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: COLORS.onSurfaceSecondary }}>
                              Peak Hours
                            </label>
                            <input
                              type="number"
                              step="0.05"
                              min="0.5"
                              max="3"
                              value={rate.peakMultiplier ?? 1.0}
                              onChange={(e) => handleChange(actualIndex, "peakMultiplier", Number(e.target.value))}
                              className="w-full px-4 py-3 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 transition-all"
                              style={{ 
                                backgroundColor: COLORS.surface,
                                borderColor: COLORS.divider,
                                color: COLORS.onSurface,
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: COLORS.onSurfaceSecondary }}>
                              Night Hours
                            </label>
                            <input
                              type="number"
                              step="0.05"
                              min="0.5"
                              max="3"
                              value={rate.nightMultiplier ?? 1.0}
                              onChange={(e) => handleChange(actualIndex, "nightMultiplier", Number(e.target.value))}
                              className="w-full px-4 py-3 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 transition-all"
                              style={{ 
                                backgroundColor: COLORS.surface,
                                borderColor: COLORS.divider,
                                color: COLORS.onSurface,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Driver Incentives */}
                      <div className="rounded-xl p-4" style={{ backgroundColor: COLORS.surface, borderColor: COLORS.divider }}>
                        <div className="flex items-center gap-2 mb-4">
                          <Gift className="w-5 h-5" style={{ color: COLORS.success }} />
                          <h4 className="font-semibold" style={{ color: COLORS.success }}>Driver Incentives</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: COLORS.onSurfaceSecondary }}>
                              Per Ride Bonus (₹)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={rate.perRideIncentive ?? 0}
                              onChange={(e) => handleChange(actualIndex, "perRideIncentive", Number(e.target.value))}
                              className="w-full px-4 py-3 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 transition-all"
                              style={{ 
                                backgroundColor: COLORS.background,
                                borderColor: COLORS.divider,
                                color: COLORS.onSurface,
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: COLORS.onSurfaceSecondary }}>
                              Reward Coins
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={rate.perRideCoins ?? 0}
                              onChange={(e) => handleChange(actualIndex, "perRideCoins", Number(e.target.value))}
                              className="w-full px-4 py-3 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 transition-all"
                              style={{ 
                                backgroundColor: COLORS.background,
                                borderColor: COLORS.divider,
                                color: COLORS.onSurface,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Platform Settings */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Settings className="w-5 h-5" style={{ color: COLORS.onSurfaceSecondary }} />
                          <h4 className="font-semibold" style={{ color: COLORS.onSurface }}>Platform Settings</h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: COLORS.onSurfaceSecondary }}>
                              Commission (%)
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              value={rate.platformFeePercent ?? 10}
                              onChange={(e) => handleChange(actualIndex, "platformFeePercent", Number(e.target.value))}
                              className="w-full px-4 py-3 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 transition-all"
                              style={{ 
                                backgroundColor: COLORS.surface,
                                borderColor: COLORS.divider,
                                color: COLORS.onSurface,
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: COLORS.onSurfaceSecondary }}>
                              GST (%)
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              value={rate.gstPercent ?? 0}
                              onChange={(e) => handleChange(actualIndex, "gstPercent", Number(e.target.value))}
                              className="w-full px-4 py-3 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 transition-all"
                              style={{ 
                                backgroundColor: COLORS.surface,
                                borderColor: COLORS.divider,
                                color: COLORS.onSurface,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-4 border-t" style={{ borderColor: COLORS.divider }}>
                        <button
                          onClick={() => handleSave(rate)}
                          disabled={savingId === rate._id}
                          className="flex-1 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                          style={{
                            backgroundColor: savingId === rate._id ? COLORS.onSurfaceTertiary : COLORS.primary,
                            color: COLORS.onPrimary,
                          }}
                        >
                          {savingId === rate._id ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-5 h-5" />
                              Save Changes
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(rate._id, rate.vehicleType)}
                          className="px-5 py-3.5 rounded-xl font-semibold flex items-center gap-2 transition-colors border"
                          style={{
                            backgroundColor: COLORS.background,
                            color: COLORS.error,
                            borderColor: COLORS.error,
                          }}
                        >
                          <Trash2 className="w-5 h-5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL - Detailed Breakdown */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {!expandedCard ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6" 
                   style={{ backgroundColor: COLORS.primaryLight }}>
                <Calculator className="w-12 h-12" style={{ color: COLORS.primary }} />
              </div>
              <h2 className="text-2xl font-bold mb-2" style={{ color: COLORS.onSurface }}>
                Select a Fare Rate
              </h2>
              <p className="mb-8" style={{ color: COLORS.onSurfaceSecondary }}>
                Click on any fare rate from the left to view detailed calculations
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 rounded-xl border" style={{ backgroundColor: COLORS.background, borderColor: COLORS.divider }}>
                  <p className="text-3xl font-bold mb-2" style={{ color: COLORS.primary }}>{rates.length}</p>
                  <p className="text-sm" style={{ color: COLORS.onSurfaceSecondary }}>Total Rates</p>
                </div>
                <div className="p-6 rounded-xl border" style={{ backgroundColor: COLORS.background, borderColor: COLORS.divider }}>
                  <p className="text-3xl font-bold mb-2" style={{ color: COLORS.primary }}>{vehicleTypes.length}</p>
                  <p className="text-sm" style={{ color: COLORS.onSurfaceSecondary }}>Vehicle Types</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          (() => {
            const selectedRate = rates.find((r) => r._id === expandedCard);
            if (!selectedRate) return null;

            const breakdown = calculateFareBreakdown(selectedRate, previewDistance, previewTime);

            return (
              <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b" style={{ backgroundColor: COLORS.primary, borderColor: COLORS.divider }}>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl flex items-center justify-center" 
                         style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                      {getVehicleIcon(selectedRate.vehicleType)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold uppercase" style={{ color: COLORS.onPrimary }}>
                        {selectedRate.vehicleType}
                      </h2>
                      <p className="opacity-80" style={{ color: COLORS.onPrimary }}>
                        Fare Breakdown Calculator
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Calculator Input */}
                  <div className="rounded-xl p-6 border" style={{ backgroundColor: COLORS.background, borderColor: COLORS.divider }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Calculator className="w-5 h-5" style={{ color: COLORS.primary }} />
                      <h3 className="font-bold text-lg" style={{ color: COLORS.onSurface }}>
                        Calculate Sample Fare
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: COLORS.onSurfaceSecondary }}>
                          Distance (km)
                        </label>
                        <input
                          type="number"
                          value={previewDistance}
                          onChange={(e) => setPreviewDistance(Number(e.target.value))}
                          className="w-full px-4 py-3 rounded-xl text-base font-semibold focus:outline-none focus:ring-2"
                          style={{ 
                            backgroundColor: COLORS.surface,
                            borderColor: COLORS.divider,
                            color: COLORS.onSurface,
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: COLORS.onSurfaceSecondary }}>
                          Duration (min)
                        </label>
                        <input
                          type="number"
                          value={previewTime}
                          onChange={(e) => setPreviewTime(Number(e.target.value))}
                          className="w-full px-4 py-3 rounded-xl text-base font-semibold focus:outline-none focus:ring-2"
                          style={{ 
                            backgroundColor: COLORS.surface,
                            borderColor: COLORS.divider,
                            color: COLORS.onSurface,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Customer View */}
                  <div className="rounded-xl p-6 border" style={{ backgroundColor: COLORS.background, borderColor: COLORS.primary }}>
                    <div className="flex items-center gap-2 mb-6">
                      <Users className="w-6 h-6" style={{ color: COLORS.primary }} />
                      <h3 className="font-bold text-xl" style={{ color: COLORS.primary }}>
                        Customer View
                      </h3>
                      <span className="ml-auto text-sm px-3 py-1 rounded-full" 
                            style={{ backgroundColor: COLORS.primaryLight, color: COLORS.primary }}>
                        What Customer Pays
                      </span>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: COLORS.surface }}>
                        <span style={{ color: COLORS.onSurfaceSecondary }}>Base Fare</span>
                        <span className="font-bold" style={{ color: COLORS.onSurface }}>
                          ₹{breakdown.baseFare.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: COLORS.surface }}>
                        <span style={{ color: COLORS.onSurfaceSecondary }}>
                          Distance ({previewDistance} km × ₹{selectedRate.perKm})
                        </span>
                        <span className="font-bold" style={{ color: COLORS.onSurface }}>
                          ₹{breakdown.distanceFare.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: COLORS.surface }}>
                        <span style={{ color: COLORS.onSurfaceSecondary }}>
                          Time ({previewTime} min × ₹{selectedRate.perMin ?? 0})
                        </span>
                        <span className="font-bold" style={{ color: COLORS.onSurface }}>
                          ₹{breakdown.timeFare.toFixed(2)}
                        </span>
                      </div>

                      {breakdown.surgeAmount > 0 && (
                        <div className="flex justify-between items-center p-3 rounded-lg border" 
                             style={{ backgroundColor: COLORS.background, borderColor: COLORS.warning }}>
                          <div>
                            <span className="font-medium" style={{ color: COLORS.warning }}>Surge Pricing</span>
                            <p className="text-xs" style={{ color: COLORS.onSurfaceTertiary }}>
                              {breakdown.surgeMultiplier}× multiplier
                            </p>
                          </div>
                          <span className="font-bold" style={{ color: COLORS.warning }}>
                            +₹{breakdown.surgeAmount.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {breakdown.gstAmount > 0 && (
                        <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: COLORS.surface }}>
                          <span style={{ color: COLORS.onSurfaceSecondary }}>
                            GST ({selectedRate.gstPercent}%)
                          </span>
                          <span className="font-bold" style={{ color: COLORS.onSurface }}>
                            ₹{breakdown.gstAmount.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t flex justify-between items-center" style={{ borderColor: COLORS.divider }}>
                      <span className="text-lg font-bold" style={{ color: COLORS.onSurface }}>
                        Total Amount
                      </span>
                      <span className="text-3xl font-bold" style={{ color: COLORS.primary }}>
                        ₹{breakdown.totalCustomerPays.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Driver View */}
                  <div className="rounded-xl p-6 border" style={{ backgroundColor: COLORS.background, borderColor: COLORS.success }}>
                    <div className="flex items-center gap-2 mb-6">
                      <Car className="w-6 h-6" style={{ color: COLORS.success }} />
                      <h3 className="font-bold text-xl" style={{ color: COLORS.success }}>
                        Driver View
                      </h3>
                      <span className="ml-auto text-sm px-3 py-1 rounded-full" 
                            style={{ backgroundColor: `${COLORS.success}20`, color: COLORS.success }}>
                        Driver Earnings
                      </span>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: COLORS.surface }}>
                        <span style={{ color: COLORS.onSurfaceSecondary }}>Ride Fare</span>
                        <span className="font-bold" style={{ color: COLORS.onSurface }}>
                          ₹{breakdown.afterSurge.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg border" 
                           style={{ backgroundColor: COLORS.background, borderColor: COLORS.error }}>
                        <div>
                          <span className="font-medium" style={{ color: COLORS.error }}>Platform Commission</span>
                          <p className="text-xs" style={{ color: COLORS.onSurfaceTertiary }}>
                            {selectedRate.platformFeePercent}% of ride fare
                          </p>
                        </div>
                        <span className="font-bold" style={{ color: COLORS.error }}>
                          -₹{breakdown.platformFee.toFixed(2)}
                        </span>
                      </div>

                      {breakdown.perRideIncentive > 0 && (
                        <div className="flex justify-between items-center p-3 rounded-lg border" 
                             style={{ backgroundColor: COLORS.background, borderColor: COLORS.success }}>
                          <div>
                            <span className="font-medium" style={{ color: COLORS.success }}>Ride Incentive</span>
                            <p className="text-xs" style={{ color: COLORS.onSurfaceTertiary }}>
                              Bonus per completed ride
                            </p>
                          </div>
                          <span className="font-bold" style={{ color: COLORS.success }}>
                            +₹{breakdown.perRideIncentive.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {breakdown.perRideCoins > 0 && (
                        <div className="flex justify-between items-center p-3 rounded-lg" 
                             style={{ backgroundColor: `${COLORS.warning}10` }}>
                          <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4" style={{ color: COLORS.warning }} />
                            <span style={{ color: COLORS.warning }}>Reward Coins</span>
                          </div>
                          <span className="font-bold" style={{ color: COLORS.warning }}>
                            {breakdown.perRideCoins} coins
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t flex justify-between items-center" style={{ borderColor: COLORS.divider }}>
                      <span className="text-lg font-bold" style={{ color: COLORS.onSurface }}>
                        Driver Gets
                      </span>
                      <span className="text-3xl font-bold" style={{ color: COLORS.success }}>
                        ₹{breakdown.driverEarnings.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Platform Revenue */}
                  <div className="rounded-xl p-6 border" style={{ backgroundColor: COLORS.background, borderColor: COLORS.divider }}>
                    <div className="flex items-center gap-2 mb-6">
                      <PieChart className="w-6 h-6" style={{ color: COLORS.onSurfaceSecondary }} />
                      <h3 className="font-bold text-xl" style={{ color: COLORS.onSurface }}>
                        Platform Revenue
                      </h3>
                      <span className="ml-auto text-sm px-3 py-1 rounded-full" 
                            style={{ backgroundColor: COLORS.surface, color: COLORS.onSurfaceSecondary }}>
                        Your Commission
                      </span>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: COLORS.surface }}>
                        <span style={{ color: COLORS.onSurfaceSecondary }}>Commission Rate</span>
                        <span className="font-bold" style={{ color: COLORS.onSurface }}>
                          {selectedRate.platformFeePercent}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: COLORS.surface }}>
                        <span style={{ color: COLORS.onSurfaceSecondary }}>Per Ride Commission</span>
                        <span className="font-bold" style={{ color: COLORS.onSurface }}>
                          ₹{breakdown.commission.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t" style={{ borderColor: COLORS.divider }}>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-4 rounded-lg" style={{ backgroundColor: COLORS.primaryLight }}>
                          <p className="text-2xl font-bold mb-1" style={{ color: COLORS.primary }}>
                            ₹{breakdown.totalCustomerPays.toFixed(0)}
                          </p>
                          <p className="text-xs" style={{ color: COLORS.onSurfaceSecondary }}>Customer Pays</p>
                        </div>
                        <div className="p-4 rounded-lg" style={{ backgroundColor: `${COLORS.success}20` }}>
                          <p className="text-2xl font-bold mb-1" style={{ color: COLORS.success }}>
                            ₹{breakdown.driverEarnings.toFixed(0)}
                          </p>
                          <p className="text-xs" style={{ color: COLORS.onSurfaceSecondary }}>Driver Gets</p>
                        </div>
                        <div className="p-4 rounded-lg" style={{ backgroundColor: COLORS.surface }}>
                          <p className="text-2xl font-bold mb-1" style={{ color: COLORS.onSurface }}>
                            ₹{breakdown.commission.toFixed(0)}
                          </p>
                          <p className="text-xs" style={{ color: COLORS.onSurfaceSecondary }}>You Earn</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Per Km Breakdown */}
                  <div className="rounded-xl p-6 border" style={{ backgroundColor: COLORS.background, borderColor: COLORS.divider }}>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5" style={{ color: COLORS.primary }} />
                      <h3 className="font-bold text-lg" style={{ color: COLORS.onSurface }}>
                        Per Kilometer Breakdown
                      </h3>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ backgroundColor: COLORS.surface }}>
                            <th className="text-left p-3 text-sm font-semibold" style={{ color: COLORS.onSurfaceSecondary }}>Distance</th>
                            <th className="text-right p-3 text-sm font-semibold" style={{ color: COLORS.primary }}>Customer</th>
                            <th className="text-right p-3 text-sm font-semibold" style={{ color: COLORS.success }}>Driver</th>
                            <th className="text-right p-3 text-sm font-semibold" style={{ color: COLORS.onSurfaceSecondary }}>Platform</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[1, 5, 10, 15, 20].map((km) => {
                            const calc = calculateFareBreakdown(selectedRate, km, km * 2);
                            return (
                              <tr key={km} className="border-t" style={{ borderColor: COLORS.divider }}>
                                <td className="p-3" style={{ color: COLORS.onSurface }}>{km} km</td>
                                <td className="text-right p-3 font-semibold" style={{ color: COLORS.primary }}>
                                  ₹{calc.totalCustomerPays.toFixed(0)}
                                </td>
                                <td className="text-right p-3 font-semibold" style={{ color: COLORS.success }}>
                                  ₹{calc.driverEarnings.toFixed(0)}
                                </td>
                                <td className="text-right p-3 font-semibold" style={{ color: COLORS.onSurface }}>
                                  ₹{calc.commission.toFixed(0)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};

export default FareManagement;