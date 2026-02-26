import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../AuthContext";

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isBlocked?: boolean;
  createdAt: string;
  // Extended DB fields
  profilePic?: string;
  gender?: string;
  dateOfBirth?: string;
  totalRides?: number;
  totalSpent?: number;
  averageRating?: number;
  referralCode?: string;
  walletBalance?: number;
  lastActiveAt?: string;
  deviceType?: string;
  isVerified?: boolean;
  updatedAt?: string;
}

interface Trip {
  _id: string;
  pickupLocation: string;
  dropLocation: string;
  fare: number;
  status: string;
  createdAt: string;
  // Extended DB fields
  driverId?: { _id: string; name: string; phone?: string } | null;
  vehicleType?: string;
  distance?: number;
  duration?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  rating?: number;
  cancellationReason?: string;
  promoCode?: string;
  discount?: number;
  finalFare?: number;
}

const CustomersPage: React.FC = () => {
  const { token } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [tripLoading, setTripLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTripsModal, setShowTripsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Auto Refresh States
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);

  const filteredCustomers = useMemo(() => {
    let result = customers;
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim();
      result = result.filter((customer) =>
        customer.name?.toLowerCase().includes(searchLower) ||
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.phone?.toLowerCase().includes(searchLower) ||
        customer.referralCode?.toLowerCase().includes(searchLower)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((customer) => {
        if (statusFilter === "active") return !customer.isBlocked;
        if (statusFilter === "blocked") return customer.isBlocked;
        if (statusFilter === "verified") return customer.isVerified;
        return true;
      });
    }
    return result;
  }, [customers, search, statusFilter]);

  const stats = useMemo(() => ({
    total: customers.length,
    active: customers.filter((c) => !c.isBlocked).length,
    blocked: customers.filter((c) => c.isBlocked).length,
    thisMonth: customers.filter((c) => {
      const createdDate = new Date(c.createdAt);
      const now = new Date();
      return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
    }).length,
  }), [customers]);

  const fetchCustomers = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setIsRefreshing(true);
      else setLoading(true);

      const API_BASE = (import.meta as any).env?.VITE_API_URL
        ? (import.meta as any).env.VITE_API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "")
        : "";

      const res = await axios.get(`${API_BASE}/api/admin/customers`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });

      console.log("📦 Customers API raw response:", res.data);

      const d = res.data;
      const list: Customer[] =
        Array.isArray(d)             ? d
        : Array.isArray(d.customers) ? d.customers
        : Array.isArray(d.users)     ? d.users
        : Array.isArray(d.data)      ? d.data
        : Array.isArray(d.result)    ? d.result
        : Array.isArray(d.results)   ? d.results
        : [];

      console.log(`✅ Parsed ${list.length} customers from key:`, Object.keys(d));
      setCustomers(list);
      setLastRefreshed(new Date());
      setError("");
    } catch (err: any) {
      console.error("❌ fetchCustomers error:", err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        `Failed to load customers (${err.response?.status ?? "network error"})`
      );
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  // ✅ Fixed: use per-customer trip endpoint instead of fetching all trips
  const fetchCustomerTrips = async (customerId: string) => {
    try {
      setTripLoading(true);
      const API_BASE = (import.meta as any).env?.VITE_API_URL
        ? (import.meta as any).env.VITE_API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "")
        : "";
      const res = await axios.get(`${API_BASE}/api/admin/customers/${customerId}/trips`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
      });
      console.log("📦 Trips API raw response:", res.data);
      const d = res.data;
      const list: Trip[] =
        Array.isArray(d)             ? d
        : Array.isArray(d.trips)     ? d.trips
        : Array.isArray(d.rideHistory) ? d.rideHistory
        : Array.isArray(d.rides)     ? d.rides
        : Array.isArray(d.data)      ? d.data
        : [];
      setTrips(list);
    } catch (err: any) {
      console.error("❌ Error fetching trips:", err);
      setTrips([]);
    } finally {
      setTripLoading(false);
    }
  };

  const toggleBlockCustomer = async (customerId: string, block: boolean) => {
    try {
      await axios.put(
        `/api/admin/customer/${block ? "block" : "unblock"}/${customerId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCustomers((prev) =>
        prev.map((c) => (c._id === customerId ? { ...c, isBlocked: block } : c))
      );
    } catch (err) {
      alert("Failed to update customer status.");
    }
  };

  const openTripModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowTripsModal(true);
    fetchCustomerTrips(customer._id);
  };

  const closeTripModal = () => {
    setSelectedCustomer(null);
    setTrips([]);
    setShowTripsModal(false);
  };

  const openDetailModal = (customer: Customer) => {
    setDetailCustomer(customer);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setDetailCustomer(null);
    setShowDetailModal(false);
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

  const clearSearch = () => setSearch("");
  const clearAllFilters = () => { setSearch(""); setStatusFilter("all"); };
  const hasActiveFilters = search || statusFilter !== "all";

  useEffect(() => {
    if (token) fetchCustomers();
  }, [token, fetchCustomers]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (autoRefresh && token) {
      intervalId = setInterval(() => fetchCustomers(true), refreshInterval * 1000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [autoRefresh, refreshInterval, token, fetchCustomers]);

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customer Management</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Monitor and manage all registered customers</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Auto</span>
                    {autoRefresh && (
                      <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))} className="text-xs bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-200">
                        <option value={10}>10s</option>
                        <option value={30}>30s</option>
                        <option value={60}>1m</option>
                      </select>
                    )}
                  </div>

                  <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 px-3 py-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                    <div className={`w-2 h-2 rounded-full ${isRefreshing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                    <span>{formatLastRefreshed()}</span>
                  </div>

                  <button onClick={() => fetchCustomers(true)} disabled={isRefreshing} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50">
                    <svg className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${isRefreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Refresh</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Customers", value: stats.total, icon: "👥", color: "purple", sub: "100%" },
              { label: "Active", value: stats.active, icon: "✅", color: "emerald", sub: `${Math.round((stats.active / stats.total) * 100) || 0}%` },
              { label: "Blocked", value: stats.blocked, icon: "🚫", color: "red", sub: `${Math.round((stats.blocked / stats.total) * 100) || 0}%` },
              { label: "This Month", value: stats.thisMonth, icon: "📅", color: "blue", sub: "New" },
            ].map((stat, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-300">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                    <p className={`text-3xl font-bold mt-2 ${stat.color === 'purple' ? 'text-purple-600' : stat.color === 'emerald' ? 'text-emerald-600' : stat.color === 'red' ? 'text-red-600' : 'text-blue-600'}`}>{stat.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>
                  </div>
                  <span className="text-2xl">{stat.icon}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 mb-6 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, phone, referral code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {search && (
                <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">✕</button>
              )}
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-purple-500">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
              <option value="verified">Verified</option>
            </select>
            {hasActiveFilters && (
              <button onClick={clearAllFilters} className="px-3 py-2.5 text-sm text-purple-600 hover:text-purple-700 font-medium">Clear filters</button>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-purple-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="mt-6 text-slate-500 font-medium">Loading customers...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button onClick={() => fetchCustomers()} className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium">Try Again</button>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 p-12 text-center">
              <span className="text-4xl">👤</span>
              <h3 className="text-xl font-semibold text-slate-800 mt-4 mb-2">No customers found</h3>
              <p className="text-slate-500 mb-6">{hasActiveFilters ? "Try adjusting or clearing your filters." : "No customers have registered yet."}</p>
              {hasActiveFilters && <button onClick={clearAllFilters} className="px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium">Clear All Filters</button>}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rides</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Total Spent</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Wallet</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rating</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Last Active</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer._id} className="group hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors">
                        {/* Customer */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                              {customer.profilePic ? (
                                <img src={customer.profilePic} alt={customer.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                                  {customer.name?.charAt(0).toUpperCase() || "?"}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-purple-700 transition-colors">
                                  {customer.name || "Unknown"}
                                </p>
                                {customer.isVerified && (
                                  <span title="Verified" className="text-blue-500 text-xs">✔</span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400">{customer.email || "-"}</p>
                              {customer.referralCode && (
                                <p className="text-xs text-purple-400 font-mono mt-0.5">{customer.referralCode}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {customer.phone || "-"}
                            </div>
                            {customer.gender && <p className="text-xs text-slate-400 capitalize">{customer.gender}</p>}
                            {customer.deviceType && <p className="text-xs text-slate-400">{customer.deviceType}</p>}
                          </div>
                        </td>

                        {/* Rides */}
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-slate-800 dark:text-white">
                            {customer.totalRides ?? "-"}
                          </span>
                        </td>

                        {/* Total Spent */}
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-emerald-600">
                            {customer.totalSpent != null ? `₹${customer.totalSpent.toFixed(0)}` : "-"}
                          </span>
                        </td>

                        {/* Wallet */}
                        <td className="px-6 py-4">
                          <span className={`text-sm font-semibold ${(customer.walletBalance ?? 0) > 0 ? "text-blue-600" : "text-slate-400"}`}>
                            {customer.walletBalance != null ? `₹${customer.walletBalance.toFixed(0)}` : "-"}
                          </span>
                        </td>

                        {/* Rating */}
                        <td className="px-6 py-4">
                          {customer.averageRating != null ? (
                            <div className="flex items-center gap-1">
                              <span className="text-yellow-400 text-sm">★</span>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{customer.averageRating.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </td>

                        {/* Joined */}
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-700 dark:text-slate-300">
                            {new Date(customer.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(customer.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </td>

                        {/* Last Active */}
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {customer.lastActiveAt
                              ? new Date(customer.lastActiveAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                              : "-"}
                          </p>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                            customer.isBlocked
                              ? "bg-red-50 text-red-700 border border-red-100"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${customer.isBlocked ? "bg-red-500" : "bg-emerald-500"}`}></span>
                            {customer.isBlocked ? "Blocked" : "Active"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* View Details */}
                            <button
                              onClick={() => openDetailModal(customer)}
                              className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            {/* Trip History */}
                            <button
                              onClick={() => openTripModal(customer)}
                              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Trips"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                              </svg>
                            </button>
                            {/* Block/Unblock */}
                            <button
                              onClick={() => toggleBlockCustomer(customer._id, !customer.isBlocked)}
                              className={`p-2 rounded-lg transition-colors ${
                                customer.isBlocked
                                  ? "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                                  : "text-slate-500 hover:text-red-600 hover:bg-red-50"
                              }`}
                              title={customer.isBlocked ? "Unblock" : "Block"}
                            >
                              {customer.isBlocked ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Showing <span className="font-semibold text-slate-900 dark:text-white">{filteredCustomers.length}</span> of{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">{customers.length}</span> customers
                  </span>
                  {hasActiveFilters && (
                    <button onClick={clearAllFilters} className="text-purple-600 hover:text-purple-700 font-medium">Clear all filters</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Customer Detail Modal ── */}
      {showDetailModal && detailCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeDetailModal}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Customer Details</h2>
              <button onClick={closeDetailModal} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-8 py-6 space-y-4">
              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
                  {detailCustomer.profilePic ? (
                    <img src={detailCustomer.profilePic} alt={detailCustomer.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-2xl">
                      {detailCustomer.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{detailCustomer.name}</p>
                    {detailCustomer.isVerified && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Verified</span>}
                  </div>
                  <p className="text-sm text-slate-500">{detailCustomer.email}</p>
                  <p className="text-sm text-slate-500">{detailCustomer.phone || "No phone"}</p>
                </div>
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Rides", value: detailCustomer.totalRides ?? "-" },
                  { label: "Total Spent", value: detailCustomer.totalSpent != null ? `₹${detailCustomer.totalSpent.toFixed(0)}` : "-" },
                  { label: "Wallet Balance", value: detailCustomer.walletBalance != null ? `₹${detailCustomer.walletBalance.toFixed(0)}` : "-" },
                  { label: "Avg Rating", value: detailCustomer.averageRating != null ? `★ ${detailCustomer.averageRating.toFixed(1)}` : "-" },
                  { label: "Gender", value: detailCustomer.gender || "-" },
                  { label: "Date of Birth", value: detailCustomer.dateOfBirth ? new Date(detailCustomer.dateOfBirth).toLocaleDateString("en-IN") : "-" },
                  { label: "Referral Code", value: detailCustomer.referralCode || "-" },
                  { label: "Device", value: detailCustomer.deviceType || "-" },
                  { label: "Joined", value: new Date(detailCustomer.createdAt).toLocaleDateString("en-IN") },
                  { label: "Last Active", value: detailCustomer.lastActiveAt ? new Date(detailCustomer.lastActiveAt).toLocaleDateString("en-IN") : "-" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 font-medium mb-0.5">{label}</p>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{String(value)}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { closeDetailModal(); openTripModal(detailCustomer); }}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium text-sm transition-colors"
                >
                  View Trips
                </button>
                <button
                  onClick={() => { toggleBlockCustomer(detailCustomer._id, !detailCustomer.isBlocked); closeDetailModal(); }}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${detailCustomer.isBlocked ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-red-600 text-white hover:bg-red-700"}`}
                >
                  {detailCustomer.isBlocked ? "Unblock" : "Block"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Trip History Modal ── */}
      {showTripsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeTripModal}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Trip History</h2>
                  <p className="text-sm text-slate-500">{selectedCustomer.name}</p>
                </div>
              </div>
              <button onClick={closeTripModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {tripLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="mt-4 text-slate-500">Loading trips...</p>
                </div>
              ) : trips.length === 0 ? (
                <div className="text-center py-16">
                  <span className="text-5xl">🗺️</span>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mt-4 mb-2">No trips found</h3>
                  <p className="text-slate-500">This customer hasn't taken any trips yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {trips.map((trip) => (
                    <div key={trip._id} className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start gap-3">
                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-1.5 ring-4 ring-emerald-100"></div>
                            <div>
                              <p className="text-xs text-slate-400 font-medium">Pickup</p>
                              <p className="font-semibold text-slate-900 dark:text-white text-sm">{trip.pickupLocation || "Unknown"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-2.5 h-2.5 bg-red-500 rounded-full mt-1.5 ring-4 ring-red-100"></div>
                            <div>
                              <p className="text-xs text-slate-400 font-medium">Drop</p>
                              <p className="font-semibold text-slate-900 dark:text-white text-sm">{trip.dropLocation || "Unknown"}</p>
                            </div>
                          </div>
                          {/* Extra trip details */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {trip.vehicleType && (
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg font-medium capitalize">{trip.vehicleType}</span>
                            )}
                            {trip.distance != null && (
                              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">{trip.distance.toFixed(1)} km</span>
                            )}
                            {trip.duration != null && (
                              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">{trip.duration} min</span>
                            )}
                            {trip.paymentMethod && (
                              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg capitalize">{trip.paymentMethod}</span>
                            )}
                            {trip.rating != null && (
                              <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-lg">★ {trip.rating}</span>
                            )}
                            {trip.driverId?.name && (
                              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg">Driver: {trip.driverId.name}</span>
                            )}
                          </div>
                          {trip.cancellationReason && (
                            <p className="text-xs text-red-500 mt-1">Reason: {trip.cancellationReason}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-bold text-slate-900 dark:text-white">
                            ₹{(trip.finalFare ?? trip.fare)?.toFixed(0) || 0}
                          </p>
                          {trip.discount != null && trip.discount > 0 && (
                            <p className="text-xs text-emerald-600">-₹{trip.discount.toFixed(0)} off</p>
                          )}
                          {trip.promoCode && (
                            <p className="text-xs text-purple-500 font-mono">{trip.promoCode}</p>
                          )}
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold mt-2 ${
                            trip.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                            trip.status === "cancelled" ? "bg-red-100 text-red-700" :
                            trip.status === "ongoing" ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {trip.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 text-xs text-slate-400">
                        {new Date(trip.createdAt).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {trips.length > 0 && (
              <div className="px-8 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 rounded-b-3xl">
                <p className="text-sm text-slate-500 text-center">
                  Total <span className="font-semibold text-slate-900 dark:text-white">{trips.length}</span> trip{trips.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;