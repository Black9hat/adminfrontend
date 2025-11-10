import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { toast } from "react-toastify";

// 🔧 Adjust if backend base differs
const API_BASE = "/admin/fare";

interface FareRate {
  _id: string;
  city: string;
  state?: string;
  vehicleType: string;
  baseFare: number;
  perKm: number;
  manualSurge?: number;
  peakMultiplier?: number;
  nightMultiplier?: number;
  discountOffset?: number;
  category?: string;
}

const FareManagement: React.FC = () => {
  const [rates, setRates] = useState<FareRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("adminToken");

  const axiosConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  // 🧭 Fetch all rates
  const fetchRates = async () => {
    try {
      setLoading(true);
const res = await axiosInstance.get(`${API_BASE}/rates`);
      setRates(res.data.rates || []);
    } catch (err) {
      console.error("❌ Failed to load fare rates:", err);
      toast.error("Unauthorized or failed to load fare rates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  // ✏️ Handle input changes
  const handleChange = <K extends keyof FareRate>(
    index: number,
    field: K,
    value: FareRate[K]
  ) => {
    const updated = [...rates];
    updated[index][field] = value;
    setRates(updated);
  };

  // 💾 Save updated rate
  const handleSave = async (rate: FareRate) => {
    try {
      setSaving(true);
await axiosInstance.put(`${API_BASE}/update/${rate._id}`, rate);
      toast.success(`✅ Updated ${rate.vehicleType} fare`);
      fetchRates();
    } catch (err) {
      console.error("❌ Save failed:", err);
      toast.error("Unauthorized or failed to save");
    } finally {
      setSaving(false);
    }
  };

  // 🗑 Delete rate
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this fare rate?")) return;
    try {
await axiosInstance.delete(`${API_BASE}/delete/${id}`);
      toast.success("Rate deleted successfully");
      fetchRates();
    } catch (err) {
      toast.error("Unauthorized or failed to delete");
    }
  };

  if (loading) return <p>Loading fare data...</p>;

  return (
    <div className="fare-management">
      <h2 className="mb-4 text-xl font-semibold">💰 Fare Management</h2>

      <table className="fare-table">
        <thead>
          <tr>
            <th>City</th>
            <th>Vehicle</th>
            <th>Base (₹)</th>
            <th>Per Km (₹)</th>
            <th>Surge ×</th>
            <th>Peak ×</th>
            <th>Night ×</th>
            <th>Discount ₹</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((r, i) => (
            <tr key={r._id}>
              <td>{r.city || "All"}</td>
              <td>{r.vehicleType}</td>
              <td>
                <input
                  type="number"
                  value={r.baseFare}
                  onChange={(e) =>
                    handleChange(i, "baseFare", Number(e.target.value))
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  value={r.perKm}
                  onChange={(e) =>
                    handleChange(i, "perKm", Number(e.target.value))
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.1"
                  value={r.manualSurge ?? 1.0}
                  onChange={(e) =>
                    handleChange(i, "manualSurge", Number(e.target.value))
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.05"
                  value={r.peakMultiplier ?? 1.0}
                  onChange={(e) =>
                    handleChange(i, "peakMultiplier", Number(e.target.value))
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.05"
                  value={r.nightMultiplier ?? 1.0}
                  onChange={(e) =>
                    handleChange(i, "nightMultiplier", Number(e.target.value))
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  value={r.discountOffset ?? 10}
                  onChange={(e) =>
                    handleChange(i, "discountOffset", Number(e.target.value))
                  }
                />
              </td>
              <td>
                <button
                  className="btn-save"
                  disabled={saving}
                  onClick={() => handleSave(r)}
                >
                  Save
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(r._id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        .fare-management {
          padding: 20px;
          background: #040000ff;
          border-radius: 8px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .fare-table {
          width: 100%;
          border-collapse: collapse;
        }
        .fare-table th, .fare-table td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: center;
        }
        .fare-table th {
          background: #000000ff;
          font-weight: 600;
        }
        input {
          width: 80px;
          padding: 5px;
          border-radius: 4px;
          border: 1px solid #ccc;
          text-align: center;
        }
        .btn-save {
          background: #007bff;
          color: white;
          padding: 6px 10px;
          border: none;
          border-radius: 4px;
          margin-right: 5px;
          cursor: pointer;
        }
        .btn-delete {
          background: #dc3545;
          color: white;
          padding: 6px 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default FareManagement;
