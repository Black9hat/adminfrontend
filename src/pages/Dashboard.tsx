import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  // Dummy data for chart
  const tripData = [
    { name: "Mon", trips: 40 },
    { name: "Tue", trips: 55 },
    { name: "Wed", trips: 30 },
    { name: "Thu", trips: 70 },
    { name: "Fri", trips: 60 },
    { name: "Sat", trips: 90 },
    { name: "Sun", trips: 100 },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
          <h2 className="text-gray-500 dark:text-gray-400 text-sm">Total Trips</h2>
          <p className="text-2xl font-bold text-blue-600">1,245</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
          <h2 className="text-gray-500 dark:text-gray-400 text-sm">Active Drivers</h2>
          <p className="text-2xl font-bold text-green-600">312</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
          <h2 className="text-gray-500 dark:text-gray-400 text-sm">Customers</h2>
          <p className="text-2xl font-bold text-purple-600">4,582</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
          <h2 className="text-gray-500 dark:text-gray-400 text-sm">Revenue</h2>
          <p className="text-2xl font-bold text-yellow-600">₹1.2M</p>
        </div>
      </div>

      {/* Chart section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow">
        <h2 className="text-lg font-bold mb-4 text-gray-700 dark:text-gray-200">
          Trips per Day
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tripData}>
              <XAxis dataKey="name" stroke="#8884d8" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="trips" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
