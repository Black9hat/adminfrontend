// pages/IncentivesManagement.tsx
import { useEffect, useState } from "react";
import axios from "axios";

interface IncentiveSettings {
  perRideIncentive: number;
  perRideCoins: number;
  coinsToRupeeConversion: number;
  minimumCoinsForWithdrawal: number;
}

export default function IncentivesManagement() {
  const [settings, setSettings] = useState<IncentiveSettings>({
    perRideIncentive: 0,
    perRideCoins: 0,
    coinsToRupeeConversion: 0.5,
    minimumCoinsForWithdrawal: 100,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [perRideIncentive, setPerRideIncentive] = useState(0);
  const [perRideCoins, setPerRideCoins] = useState(0);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get("/api/incentives/settings");
      const data = res.data.data || res.data;
      setSettings(data);
      setPerRideIncentive(data.perRideIncentive);
      setPerRideCoins(data.perRideCoins);
    } catch (err: any) {
      console.error("Failed to fetch incentive settings:", err);
      setMessage({ type: "error", text: "Failed to fetch incentive settings" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (perRideIncentive < 0 || perRideCoins < 0) {
      setMessage({ type: "error", text: "Values cannot be negative" });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await axios.put("/api/incentives/settings", {
        perRideIncentive,
        perRideCoins,
      });

      setMessage({ type: "success", text: "✅ Incentive settings updated successfully!" });
      fetchSettings();
    } catch (err: any) {
      console.error("Failed to update settings:", err);
      setMessage({
        type: "error",
        text: err.response?.data?.error || "Failed to update settings",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-center text-gray-500">Loading settings...</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          💰 Incentives Management
        </h1>
        <p className="text-white/90 mt-2">
          Control per-ride rewards for drivers and customers
        </p>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
              : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Current Settings Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-l-4 border-green-500">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-2">
            💵 Per Ride Cash
          </h3>
          <p className="text-3xl font-bold text-green-600">
            ₹{settings.perRideIncentive.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Added to wallet after each ride
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-l-4 border-yellow-500">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-2">
            🪙 Per Ride Coins
          </h3>
          <p className="text-3xl font-bold text-yellow-600">
            {settings.perRideCoins}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Coins earned per ride
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border-l-4 border-blue-500">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-2">
            💱 Conversion Rate
          </h3>
          <p className="text-xl font-bold text-blue-600">100 coins = ₹50</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Minimum 100 coins to withdraw
          </p>
        </div>
      </div>

      {/* Update Settings Form */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">
          Update Incentive Settings
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              💵 Per Ride Cash Incentive (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
              <input
                type="number"
                min="0"
                step="0.50"
                value={perRideIncentive}
                onChange={(e) => setPerRideIncentive(parseFloat(e.target.value) || 0)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              🪙 Per Ride Coins
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={perRideCoins}
              onChange={(e) => setPerRideCoins(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
            >
              {saving ? "Saving..." : "💾 Save Settings"}
            </button>
            <button
              onClick={fetchSettings}
              className="px-6 py-4 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold transition-all duration-200"
            >
              🔄 Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
