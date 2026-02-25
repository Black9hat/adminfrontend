import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import axiosInstance from "../api/axiosInstance";

const getAuthToken = (): string => {
  const token = localStorage.getItem('adminToken') || '';
  if (!token) {
    console.error('❌ No authentication token found in localStorage!');
  }
  return token;
};

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchStats = async () => {
      const authToken = getAuthToken();
      
      if (!authToken) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }
      
      try {
        const res = await axiosInstance.get("/admin/stats", {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'ngrok-skip-browser-warning': 'true',
            'Content-Type': 'application/json'
          },
        });
        setStats(res.data);
        setError("");
      } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          setUnauthorized(true);
        } else {
          setError(err.response?.data?.message || "Failed to load dashboard stats");
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  if (unauthorized) {
    return (
      <div className="min-h-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Session Expired</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">Please log in again to access the dashboard.</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-indigo-200 dark:border-indigo-900 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-12 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Error Loading Data</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/30"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">No data available</p>
      </div>
    );
  }

  const tripStats = stats.stats?.trips || { total: 0, completed: 0, ongoing: 0, cancelled: 0 };
  const userStats = stats.stats?.users || { total: 0, drivers: 0, customers: 0 };
  const docStats = stats.stats?.documents || { pending: 0, verified: 0, rejected: 0 };

  const pieData = [
    { name: 'Completed', value: tripStats.completed, color: '#10B981' },
    { name: 'Ongoing', value: tripStats.ongoing, color: '#F59E0B' },
    { name: 'Cancelled', value: tripStats.cancelled, color: '#EF4444' },
  ];

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-900 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Dashboard Overview</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {/* Total Trips */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Trips</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{tripStats.total}</p>
              <div className="flex items-center gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  {tripStats.completed} completed
                </span>
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                  {tripStats.ongoing} ongoing
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Users</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{userStats.total}</p>
              <div className="flex items-center gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                  {userStats.drivers} drivers
                </span>
                <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  {userStats.customers} customers
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending Documents */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Documents</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">{docStats.pending}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">pending review</p>
              <div className="flex items-center gap-4 mt-2 text-xs">
                <span className="text-emerald-600 dark:text-emerald-400">{docStats.verified} verified</span>
                <span className="text-red-600 dark:text-red-400">{docStats.rejected} rejected</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Revenue</p>
              <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">₹{stats.revenue?.toLocaleString() || '0'}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-3 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                +12.5% from last month
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        {/* Trips Chart */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Trips Overview</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Daily trip statistics</p>
            </div>
            <select className="px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 border-0 focus:ring-2 focus:ring-indigo-500">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <div className="h-72">
            {stats.tripsPerDay && Array.isArray(stats.tripsPerDay) && stats.tripsPerDay.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.tripsPerDay}>
                  <defs>
                    <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1E293B', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#F8FAFC'
                    }} 
                  />
                  <Area type="monotone" dataKey="trips" stroke="#6366F1" strokeWidth={2} fill="url(#colorTrips)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-slate-500 dark:text-slate-400">No chart data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trip Status Pie Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Trip Status</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Distribution by status</p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {pieData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-xs text-slate-600 dark:text-slate-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'View Drivers', icon: '🚗', color: 'from-indigo-500 to-purple-600', href: '/drivers' },
            { label: 'View Trips', icon: '🗺️', color: 'from-blue-500 to-cyan-600', href: '/trips' },
            { label: 'Review Docs', icon: '📄', color: 'from-amber-500 to-orange-600', href: '/documents' },
            { label: 'Manage Fares', icon: '💰', color: 'from-emerald-500 to-teal-600', href: '/fare-management' },
          ].map((action, index) => (
            <a
              key={index}
              href={action.href}
              className="group p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center gap-3"
            >
              <div className={`w-10 h-10 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center text-lg shadow-lg group-hover:scale-110 transition-transform`}>
                {action.icon}
              </div>
              <span className="font-medium text-slate-700 dark:text-slate-300">{action.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}