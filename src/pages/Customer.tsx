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
}

interface Trip {
  _id: string;
  pickupLocation: string;
  dropLocation: string;
  fare: number;
  status: string;
  createdAt: string;
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

  const filteredCustomers = useMemo(() => {
    let result = customers;

    if (search.trim()) {
      const searchLower = search.toLowerCase().trim();
      result = result.filter((customer) => {
        return (
          customer.name?.toLowerCase().includes(searchLower) ||
          customer.email?.toLowerCase().includes(searchLower) ||
          customer.phone?.toLowerCase().includes(searchLower)
        );
      });
    }

    if (statusFilter !== "all") {
      result = result.filter((customer) => {
        if (statusFilter === "active") return !customer.isBlocked;
        if (statusFilter === "blocked") return customer.isBlocked;
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
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      const res = await axios.get("/api/admin/customers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCustomers(res.data.customers || []);
      setLastRefreshed(new Date());
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load customers.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [token]);

  const fetchCustomerTrips = async (customerId: string) => {
    try {
      setTripLoading(true);
      const res = await axios.get("/api/admin/trips", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allTrips: Trip[] = res.data.trips || [];
      const customerTrips = allTrips.filter((t) => (t as any).customerId?._id === customerId);
      setTrips(customerTrips);
    } catch (err) {
      console.error("Error fetching trips", err);
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
  
  const clearAllFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const hasActiveFilters = search || statusFilter !== "all";

  useEffect(() => {
    if (token) fetchCustomers();
  }, [token, fetchCustomers]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (autoRefresh && token) {
      intervalId = setInterval(() => {
        fetchCustomers(true);
      }, refreshInterval * 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval, token, fetchCustomers]);

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900">
      {/* Background Pattern */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

      <div className="relative">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Title Section */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 dark:shadow-purple-900/50">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customer Management</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Monitor and manage all registered customers</p>
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
                      <div className="w-9 h-5 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-100 dark:peer-focus:ring-purple-900/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Auto</span>
                    {autoRefresh && (
                      <select
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                        className="text-xs bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg px-2 py-1 focus:ring-2 focus:ring-purple-500 text-slate-700 dark:text-slate-200"
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
                    onClick={() => fetchCustomers(true)}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg
                      className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${isRefreshing ? "animate-spin" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
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
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Customers", value: stats.total, icon: "👥", color: "purple", percentage: "100%" },
              { label: "Active", value: stats.active, icon: "✅", color: "emerald", percentage: `${Math.round((stats.active / stats.total) * 100) || 0}%` },
              { label: "Blocked", value: stats.blocked, icon: "🚫", color: "red", percentage: `${Math.round((stats.blocked / stats.total) * 100) || 0}%` },
              { label: "This Month", value: stats.thisMonth, icon: "📅", color: "blue", percentage: "New" },
            ].map((stat, index) => (
              <div
                key={index}
                className="group bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-slate-200 dark:hover:border-slate-600 transition-all duration-300"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{stat.label}</p>
                    <p className={`text-3xl font-bold mt-2 ${
                      stat.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                      stat.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                      stat.color === 'red' ? 'text-red-600 dark:text-red-400' :
                      'text-blue-600 dark:text-blue-400'
                    }`}>{stat.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.percentage}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                    stat.color === 'purple' ? 'bg-purple-50 dark:bg-purple-900/30' :
                    stat.color === 'emerald' ? 'bg-emerald-50 dark:bg-emerald-900/30' :
                    stat.color === 'red' ? 'bg-red-50 dark:bg-red-900/30' :
                    'bg-blue-50 dark:bg-blue-900/30'
                  }`}>
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-10 py-3 bg-slate-50 dark:bg-slate-700 border-0 rounded-xl focus:ring-2 focus:ring-purple-500 transition-all text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
                />
                {search && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Filter Dropdowns */}
              <div className="flex gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-3 bg-slate-50 dark:bg-slate-700 border-0 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                </select>

                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-3 text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-xl transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active filters:</span>
                {search && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium">
                    Search: "{search}"
                    <button onClick={clearSearch} className="hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded p-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {statusFilter !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium">
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter("all")} className="hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded p-0.5">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
                  Showing {filteredCustomers.length} of {customers.length} customers
                </span>
              </div>
            )}
          </div>

          {/* Content Area */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-purple-100 dark:border-purple-900 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <p className="mt-6 text-slate-500 dark:text-slate-400 font-medium">Loading customers...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Customers</h3>
              <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
              <button
                onClick={() => fetchCustomers()}
                className="px-6 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">👤</span>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-2">No customers found</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                {hasActiveFilters
                  ? "No customers match your current filters. Try adjusting or clearing them."
                  : "No customers have registered yet. They will appear here once they sign up."}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer._id} className="group hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/30 dark:shadow-purple-900/50">
                              {customer.name?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                                {customer.name || "Unknown"}
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">{customer.email || "-"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="text-sm">{customer.phone || "-"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {new Date(customer.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(customer.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
                            customer.isBlocked
                              ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800"
                              : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${customer.isBlocked ? "bg-red-500" : "bg-emerald-500"}`}></span>
                            {customer.isBlocked ? "Blocked" : "Active"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openTripModal(customer)}
                              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="View Trips"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => toggleBlockCustomer(customer._id, !customer.isBlocked)}
                              className={`p-2 rounded-lg transition-colors ${
                                customer.isBlocked
                                  ? "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                                  : "text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                              }`}
                              title={customer.isBlocked ? "Unblock" : "Block"}
                            >
                              {customer.isBlocked ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

              {/* Table Footer */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600 dark:text-slate-400">
                    Showing <span className="font-semibold text-slate-900 dark:text-white">{filteredCustomers.length}</span> of{" "}
                    <span className="font-semibold text-slate-900 dark:text-white">{customers.length}</span> customers
                  </span>
                  {hasActiveFilters && (
                    <button onClick={clearAllFilters} className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium">
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trip History Modal */}
      {showTripsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeTripModal}>
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-3xl w-full shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Trip History</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selectedCustomer.name}</p>
                </div>
              </div>
              <button onClick={closeTripModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8">
              {tripLoading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-12 h-12 border-4 border-blue-100 dark:border-blue-900 border-t-blue-600 rounded-full animate-spin"></div>
                  <p className="mt-4 text-slate-500 dark:text-slate-400">Loading trips...</p>
                </div>
              ) : trips.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🗺️</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">No trips found</h3>
                  <p className="text-slate-500 dark:text-slate-400">This customer hasn't taken any trips yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {trips.map((trip) => (
                    <div key={trip._id} className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl p-5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-3 h-3 bg-emerald-500 rounded-full mt-1.5 ring-4 ring-emerald-100 dark:ring-emerald-900/50"></div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pickup</p>
                              <p className="font-semibold text-slate-900 dark:text-white">{trip.pickupLocation || "Unknown"}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5 ring-4 ring-red-100 dark:ring-red-900/50"></div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Drop</p>
                              <p className="font-semibold text-slate-900 dark:text-white">{trip.dropLocation || "Unknown"}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{trip.fare?.toFixed(0) || 0}</p>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold mt-2 ${
                            trip.status === "completed" ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300" :
                            trip.status === "cancelled" ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300" :
                            trip.status === "ongoing" ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300" :
                            "bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300"
                          }`}>
                            {trip.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(trip.createdAt).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {trips.length > 0 && (
              <div className="px-8 py-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 rounded-b-3xl">
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
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