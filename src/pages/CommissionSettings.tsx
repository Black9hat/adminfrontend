import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  Save,
  RefreshCw,
  Settings,
  DollarSign,
  Percent,
  Edit2,
  AlertCircle,
  Zap,
  Coins,
  Trello,
} from "lucide-react";
import {
  getAllCommissionSettings,
  updateCommissionSetting,
  broadcastConfigToDrivers,
  type CommissionSetting,
} from "../api/commissionApi";

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

const VEHICLE_TYPES = [
  { label: "Bike", value: "bike" },
  { label: "Auto", value: "auto" },
  { label: "Car", value: "car" },
  { label: "Premium", value: "premium" },
  { label: "XL/SUV", value: "xl" },
];

const CommissionSettings: React.FC = () => {
  const [settings, setSettings] = useState<CommissionSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showBroadcastStatus, setShowBroadcastStatus] = useState(false);

  // Form state for editing
  const [formData, setFormData] = useState<Partial<CommissionSetting>>({});

  // Fetch all commission settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const result = await getAllCommissionSettings();
      if (result.success) {
        setSettings(result.data);
        toast.success("Settings loaded successfully");
      } else {
        toast.error(result.error || "Failed to load settings");
      }
    } catch (err) {
      console.error("❌ Error fetching settings:", err);
      toast.error("Server error while loading settings");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (setting: CommissionSetting) => {
    setEditingId(setting._id || null);
    setFormData(setting);
  };

  const handleInputChange = (
    field: keyof CommissionSetting,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!editingId || !formData.vehicleType) {
      toast.error("Please select a vehicle type");
      return;
    }

    // Validation
    if (
      formData.commissionPercent !== undefined &&
      (formData.commissionPercent < 0 || formData.commissionPercent > 100)
    ) {
      toast.error("Commission must be between 0 and 100");
      return;
    }

    if (
      formData.platformFeePercent !== undefined &&
      (formData.platformFeePercent < 0 || formData.platformFeePercent > 100)
    ) {
      toast.error("Platform fee % must be between 0 and 100");
      return;
    }

    try {
      setSaving(editingId);
      const result = await updateCommissionSetting(
        formData.vehicleType,
        formData
      );

      if (result.success) {
        toast.success(`${formData.vehicleType} settings updated!`);
        fetchSettings();
        setEditingId(null);
        setFormData({});
      } else {
        toast.error(result.error || "Failed to save settings");
      }
    } catch (err) {
      console.error("❌ Error saving settings:", err);
      toast.error("Server error");
    } finally {
      setSaving(null);
    }
  };

  const handleBroadcast = async () => {
    try {
      setBroadcasting(true);
      const result = await broadcastConfigToDrivers();

      if (result.success) {
        setShowBroadcastStatus(true);
        toast.success("✅ " + result.message);
        setTimeout(() => setShowBroadcastStatus(false), 3000);
      } else {
        toast.error(result.error || "Failed to broadcast");
      }
    } catch (err) {
      console.error("❌ Error broadcasting:", err);
      toast.error("Server error");
    } finally {
      setBroadcasting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLORS.background,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: `3px solid ${COLORS.divider}`,
              borderTopColor: COLORS.primary,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: COLORS.onSurfaceSecondary }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: COLORS.surface,
        padding: "2rem 1.5rem",
      }}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "3rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <Settings size={28} color={COLORS.primary} />
            <h1
              style={{
                fontSize: "2.2rem",
                fontWeight: "bold",
                color: COLORS.onSurface,
                margin: 0,
              }}
            >
              Commission & Incentive Settings
            </h1>
          </div>
          <p style={{ color: COLORS.onSurfaceSecondary, margin: "8px 0 0 0" }}>
            Control driver commission rates, platform fees, and per-ride incentives in real-time
          </p>
        </div>

        {/* Broadcast Status Alert */}
        {showBroadcastStatus && (
          <div
            style={{
              background: `${COLORS.success}15`,
              border: `2px solid ${COLORS.success}`,
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "2rem",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <Zap size={20} color={COLORS.success} />
            <div>
              <p style={{ color: COLORS.success, fontWeight: "bold", margin: 0 }}>
                ✅ Settings broadcasted to all online drivers
              </p>
              <p style={{ color: COLORS.onSurfaceSecondary, fontSize: "0.9rem", margin: "4px 0 0 0" }}>
                Changes will be reflected immediately in the driver app
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "2rem",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={fetchSettings}
            style={{
              padding: "10px 16px",
              border: `1px solid ${COLORS.divider}`,
              background: COLORS.background,
              borderRadius: "8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: "500",
              color: COLORS.onSurface,
            }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={handleBroadcast}
            disabled={broadcasting}
            style={{
              padding: "10px 16px",
              border: "none",
              background: broadcasting ? COLORS.onSurfaceTertiary : COLORS.success,
              color: "#fff",
              borderRadius: "8px",
              cursor: broadcasting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: "bold",
              opacity: broadcasting ? 0.6 : 1,
            }}
          >
            <Trello size={16} /> {broadcasting ? "Broadcasting..." : "Broadcast to Drivers"}
          </button>
        </div>

        {/* Settings Table */}
        <div
          style={{
            background: COLORS.cardBackground,
            borderRadius: "12px",
            border: `1px solid ${COLORS.divider}`,
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    background: COLORS.surface,
                    borderBottom: `2px solid ${COLORS.divider}`,
                  }}
                >
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "left",
                      fontWeight: "bold",
                      color: COLORS.onSurface,
                    }}
                  >
                    Vehicle Type
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      fontWeight: "bold",
                      color: COLORS.onSurface,
                    }}
                  >
                    Commission %
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      fontWeight: "bold",
                      color: COLORS.onSurface,
                    }}
                  >
                    Platform Fee (₹)
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      fontWeight: "bold",
                      color: COLORS.onSurface,
                    }}
                  >
                    Platform Fee %
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      fontWeight: "bold",
                      color: COLORS.onSurface,
                    }}
                  >
                    Per-Ride Incentive (₹)
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      fontWeight: "bold",
                      color: COLORS.onSurface,
                    }}
                  >
                    Per-Ride Coins
                  </th>
                  <th
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      fontWeight: "bold",
                      color: COLORS.onSurface,
                    }}
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {settings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: COLORS.onSurfaceSecondary,
                      }}
                    >
                      No commission settings found
                    </td>
                  </tr>
                ) : (
                  settings.map((setting) => (
                    <tr
                      key={setting._id}
                      style={{
                        borderBottom: `1px solid ${COLORS.divider}`,
                        background:
                          editingId === setting._id
                            ? `${COLORS.primary}08`
                            : "transparent",
                      }}
                    >
                      <td style={{ padding: "12px", fontWeight: "500" }}>
                        {editingId === setting._id ? (
                          <select
                            value={formData.vehicleType || ""}
                            onChange={(e) =>
                              handleInputChange("vehicleType", e.target.value)
                            }
                            style={{
                              padding: "6px 8px",
                              border: `1px solid ${COLORS.divider}`,
                              borderRadius: "4px",
                              width: "100%",
                              fontSize: "0.9rem",
                            }}
                          >
                            <option value="">Select type</option>
                            {VEHICLE_TYPES.map((type) => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            {setting.vehicleType === "bike" && (
                              <div style={{ fontSize: "1.2rem" }}>🏍️</div>
                            )}
                            {setting.vehicleType === "auto" && (
                              <div style={{ fontSize: "1.2rem" }}>🚘</div>
                            )}
                            {(setting.vehicleType === "car" ||
                              setting.vehicleType === "premium") && (
                              <div style={{ fontSize: "1.2rem" }}>🚗</div>
                            )}
                            {setting.vehicleType === "xl" && (
                              <div style={{ fontSize: "1.2rem" }}>🚙</div>
                            )}
                            <span style={{ textTransform: "capitalize" }}>
                              {setting.vehicleType}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Commission % */}
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        {editingId === setting._id ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={formData.commissionPercent || 0}
                            onChange={(e) =>
                              handleInputChange(
                                "commissionPercent",
                                parseFloat(e.target.value)
                              )
                            }
                            style={{
                              padding: "6px 8px",
                              border: `1px solid ${COLORS.divider}`,
                              borderRadius: "4px",
                              width: "100%",
                              textAlign: "right",
                              fontSize: "0.9rem",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: "6px",
                            }}
                          >
                            <Percent size={14} color={COLORS.primary} />
                            <span style={{ fontWeight: "600" }}>
                              {setting.commissionPercent}%
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Platform Fee Flat */}
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        {editingId === setting._id ? (
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={formData.platformFeeFlat || 0}
                            onChange={(e) =>
                              handleInputChange(
                                "platformFeeFlat",
                                parseFloat(e.target.value)
                              )
                            }
                            style={{
                              padding: "6px 8px",
                              border: `1px solid ${COLORS.divider}`,
                              borderRadius: "4px",
                              width: "100%",
                              textAlign: "right",
                              fontSize: "0.9rem",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: "6px",
                            }}
                          >
                            <DollarSign size={14} color={COLORS.warning} />
                            <span style={{ fontWeight: "600" }}>
                              ₹{setting.platformFeeFlat}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Platform Fee % */}
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        {editingId === setting._id ? (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={formData.platformFeePercent || 0}
                            onChange={(e) =>
                              handleInputChange(
                                "platformFeePercent",
                                parseFloat(e.target.value)
                              )
                            }
                            style={{
                              padding: "6px 8px",
                              border: `1px solid ${COLORS.divider}`,
                              borderRadius: "4px",
                              width: "100%",
                              textAlign: "right",
                              fontSize: "0.9rem",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: "6px",
                            }}
                          >
                            <Percent size={14} color={COLORS.warning} />
                            <span style={{ fontWeight: "600" }}>
                              {setting.platformFeePercent}%
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Per-Ride Incentive */}
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        {editingId === setting._id ? (
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={formData.perRideIncentive || 0}
                            onChange={(e) =>
                              handleInputChange(
                                "perRideIncentive",
                                parseFloat(e.target.value)
                              )
                            }
                            style={{
                              padding: "6px 8px",
                              border: `1px solid ${COLORS.divider}`,
                              borderRadius: "4px",
                              width: "100%",
                              textAlign: "right",
                              fontSize: "0.9rem",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: "6px",
                            }}
                          >
                            <Zap size={14} color={COLORS.success} />
                            <span style={{ fontWeight: "600" }}>
                              ₹{setting.perRideIncentive}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Per-Ride Coins */}
                      <td style={{ padding: "12px", textAlign: "right" }}>
                        {editingId === setting._id ? (
                          <input
                            type="number"
                            min="0"
                            value={formData.perRideCoins || 0}
                            onChange={(e) =>
                              handleInputChange(
                                "perRideCoins",
                                parseFloat(e.target.value)
                              )
                            }
                            style={{
                              padding: "6px 8px",
                              border: `1px solid ${COLORS.divider}`,
                              borderRadius: "4px",
                              width: "100%",
                              textAlign: "right",
                              fontSize: "0.9rem",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              gap: "6px",
                            }}
                          >
                            <Coins size={14} color={COLORS.primary} />
                            <span style={{ fontWeight: "600" }}>
                              {setting.perRideCoins}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: "12px", textAlign: "center" }}>
                        {editingId === setting._id ? (
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                              justifyContent: "center",
                            }}
                          >
                            <button
                              onClick={handleSave}
                              disabled={saving === setting._id}
                              style={{
                                padding: "6px 12px",
                                background: saving === setting._id ? COLORS.onSurfaceTertiary : COLORS.success,
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: saving === setting._id ? "not-allowed" : "pointer",
                                fontSize: "0.85rem",
                                fontWeight: "bold",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Save size={14} /> Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              disabled={saving === setting._id}
                              style={{
                                padding: "6px 12px",
                                background: COLORS.divider,
                                color: COLORS.onSurface,
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                                fontWeight: "500",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditClick(setting)}
                            style={{
                              padding: "6px 12px",
                              background: `${COLORS.primary}15`,
                              color: COLORS.primary,
                              border: `1px solid ${COLORS.primary}30`,
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                              fontWeight: "500",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              margin: "0 auto",
                            }}
                          >
                            <Edit2 size={14} /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div
          style={{
            background: `${COLORS.warning}15`,
            border: `1px solid ${COLORS.warning}30`,
            borderRadius: "8px",
            padding: "1rem 1.5rem",
            marginTop: "2rem",
            display: "flex",
            gap: "12px",
          }}
        >
          <AlertCircle size={20} color={COLORS.warning} style={{ flexShrink: 0 }} />
          <div>
            <p style={{ color: COLORS.onSurface, fontWeight: "bold", margin: 0 }}>
              💡 Changes broadcast immediately
            </p>
            <p style={{ color: COLORS.onSurfaceSecondary, fontSize: "0.9rem", margin: "4px 0 0 0" }}>
              When you save changes, all online drivers receive the updates via socket.io in real-time.
              Offline drivers will get FCM notifications when they come back online.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionSettings;
