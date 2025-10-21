import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setUnauthorized(true);
        return;
      }
      try {
        const res = await axios.get("/api/admin/stats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setStats(res.data);
      } catch (err: any) {
        if (err.response && err.response.status === 401) {
          setUnauthorized(true);
        } else {
          console.error("❌ Failed to fetch dashboard stats:", err);
        }
      }
    };
    fetchStats();
  }, []);


  if (unauthorized) {
    return <p className="text-center text-red-500 font-semibold">Unauthorized: Please log in as admin.</p>;
  }

  if (!stats) {
    return <p className="text-center text-gray-500">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
          <h2 className="text-gray-500 dark:text-gray-400 text-sm">Trips</h2>
          <p className="text-2xl font-bold text-blue-600">
            {stats.stats.trips ? stats.stats.trips.total : "-"}
            <span className="block text-xs text-gray-400 font-normal">
              Completed: {stats.stats.trips ? stats.stats.trips.completed : "-"},
              Ongoing: {stats.stats.trips ? stats.stats.trips.ongoing : "-"},
              Cancelled: {stats.stats.trips ? stats.stats.trips.cancelled : "-"}
            </span>
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
          <h2 className="text-gray-500 dark:text-gray-400 text-sm">Users</h2>
          <p className="text-2xl font-bold text-green-600">
            {stats.stats.users ? stats.stats.users.total : "-"}
            <span className="block text-xs text-gray-400 font-normal">
              Drivers: {stats.stats.users ? stats.stats.users.drivers : "-"},
              Customers: {stats.stats.users ? stats.stats.users.customers : "-"}
            </span>
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
          <h2 className="text-gray-500 dark:text-gray-400 text-sm">Documents</h2>
          <p className="text-2xl font-bold text-purple-600">
            Pending: {stats.stats.documents ? stats.stats.documents.pending : "-"}
            <span className="block text-xs text-gray-400 font-normal">
              Verified: {stats.stats.documents ? stats.stats.documents.verified : "-"},
              Rejected: {stats.stats.documents ? stats.stats.documents.rejected : "-"}
            </span>
          </p>
        </div>
      </div>
      {/* Chart section (optional, if you have chart data) */}
      {stats.tripsPerDay && Array.isArray(stats.tripsPerDay) && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
          <h2 className="text-lg font-bold mb-4 text-gray-700 dark:text-gray-200">
            Trips per Day
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.tripsPerDay}>
                <XAxis dataKey="name" stroke="#8884d8" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="trips" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
