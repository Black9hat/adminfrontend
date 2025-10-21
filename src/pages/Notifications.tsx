import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../AuthContext";

interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}

const NotificationPage: React.FC = () => {
  const { token } = useAuth();
  const [mode, setMode] = useState<"broadcast" | "individual">("broadcast");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [role, setRole] = useState<"driver" | "customer" | "all">("all");
  const [drivers, setDrivers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Fetch drivers & customers
  const fetchUsers = async () => {
    try {
      const [driverRes, customerRes] = await Promise.all([
        axios.get("/api/admin/drivers", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("/api/admin/customers", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setDrivers(driverRes.data.drivers || []);
      setCustomers(customerRes.data.customers || []);
    } catch (err) {
      console.error("❌ Error fetching users");
    }
  };

  useEffect(() => {
    if (token) fetchUsers();
  }, [token]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!title.trim() || !body.trim()) {
      setError("Title and message are required.");
      return;
    }

    try {
      setLoading(true);

      if (mode === "broadcast") {
        // 📨 Broadcast mode
        await axios.post(
          "/api/admin/send-fcm",
          { title, body, role: role === "all" ? undefined : role },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess("✅ Broadcast notification sent successfully!");
      } else {
        // 💬 Individual mode
        if (!selectedUser) {
          setError("Please select a user.");
          setLoading(false);
          return;
        }
        await axios.post(
          "/api/admin/send-fcm/individual",
          { title, body, userId: selectedUser },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess("✅ Individual message sent successfully!");
      }

      setTitle("");
      setBody("");
      setSelectedUser("");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Failed to send notification."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-8 text-gray-800">
        📢 Send Push Notification
      </h2>

      {success && (
        <div className="mb-4 p-3 rounded bg-green-100 text-green-700 font-semibold">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded bg-red-100 text-red-700 font-semibold">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="space-y-6 bg-white p-6 rounded-xl shadow"
      >
        {/* Mode Selector */}
        <div>
          <label className="block font-semibold mb-2">Mode</label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                value="broadcast"
                checked={mode === "broadcast"}
                onChange={() => setMode("broadcast")}
              />
              Broadcast
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                value="individual"
                checked={mode === "individual"}
                onChange={() => setMode("individual")}
              />
              Individual
            </label>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block font-semibold mb-2">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Enter notification title"
            required
          />
        </div>

        {/* Message */}
        <div>
          <label className="block font-semibold mb-2">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full p-2 border rounded h-24 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Enter notification message"
            required
          ></textarea>
        </div>

        {/* Broadcast Options */}
        {mode === "broadcast" && (
          <div>
            <label className="block font-semibold mb-2">Send to</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="all"
                  checked={role === "all"}
                  onChange={() => setRole("all")}
                />
                All Users
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="driver"
                  checked={role === "driver"}
                  onChange={() => setRole("driver")}
                />
                Drivers
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="role"
                  value="customer"
                  checked={role === "customer"}
                  onChange={() => setRole("customer")}
                />
                Customers
              </label>
            </div>
          </div>
        )}

        {/* Individual Options */}
        {mode === "individual" && (
          <div>
            <label className="block font-semibold mb-2">
              Select User
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">-- Select --</option>
              <optgroup label="Drivers">
                {drivers.map((d) => (
                  <option key={d._id} value={d._id}>
                    🧑‍✈️ {d.name} {d.phone ? `(${d.phone})` : ""}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Customers">
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    👤 {c.name} {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          {loading
            ? "Sending..."
            : mode === "broadcast"
            ? "🚀 Send Broadcast"
            : "💬 Send Message"}
        </button>
      </form>
    </div>
  );
};

export default NotificationPage;
