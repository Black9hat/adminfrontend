import React, { useEffect, useState } from "react";
import axiosInstance from "../api/axiosInstance";
import { toast } from "react-toastify";
import {
  Search, RefreshCw, ChevronDown, Trash2, DollarSign, Users, Settings,
  AlertCircle, Crown, Zap, TrendingUp, Plus
} from "lucide-react";

const API_BASE = "/admin/driver-earnings";

interface DriverPlan {
  _id: string;
  planName: string;
  description: string;
  monthlyFee: number;
  commissionPercent: number;
  minRideValue?: number;
  status: "active" | "inactive";
}

interface DriverSubscription {
  _id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  planId: string;
  planName: string;
  monthlyFee: number;
  commissionPercent: number;
  monthlyEarnings: number;
  profitLoss: number;
  status: "active" | "expired";
}

const COLORS = {
  background: "#FFFFFF",
  surface: "#F8F9FA",
  onSurface: "#1A1A1A",
  onSurfaceSecondary: "#4A4A4A",
  primary: "#B85F00",
  divider: "#E8E8E8",
  success: "#2E7D32",
  warning: "#F57C00",
  error: "#D32F2F",
  info: "#1976D2",
};

const DriverEarningsManagement: React.FC = () => {
  const [plans, setPlans] = useState<DriverPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<DriverSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"plans" | "subscriptions">("plans");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DriverPlan | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const [newPlan, setNewPlan] = useState<Partial<DriverPlan>>({
    planName: "",
    description: "",
    monthlyFee: 0,
    commissionPercent: 10,
    minRideValue: 50,
    status: "active",
  });

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`${API_BASE}/plans`);
      setPlans(res.data.plans || []);
    } catch (err) {
      toast.error("Failed to load driver plans");
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await axiosInstance.get(`${API_BASE}/subscriptions`);
      setSubscriptions(res.data.subscriptions || []);
    } catch (err) {
      toast.error("Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    activeTab === "plans" ? fetchPlans() : fetchSubscriptions();
  }, [activeTab]);

  const handleCreatePlan = async () => {
    if (!newPlan.planName?.trim()) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      await axiosInstance.post(`${API_BASE}/plans`, newPlan);
      toast.success("Plan created successfully");
      setNewPlan({
        planName: "",
        description: "",
        monthlyFee: 0,
        commissionPercent: 10,
        minRideValue: 50,
        status: "active",
      });
      setShowNewPlanForm(false);
      fetchPlans();
    } catch (err) {
      toast.error("Failed to create plan");
    }
  };

  const handleUpdatePlan = async (plan: DriverPlan) => {
    try {
      await axiosInstance.put(`${API_BASE}/plans/${plan._id}`, plan);
      toast.success("Plan updated successfully");
      setEditingPlan(null);
      fetchPlans();
    } catch (err) {
      toast.error("Failed to update plan");
    }
  };

  const handleDeletePlan = async (id: string, planName: string) => {
    if (!window.confirm(`Delete "${planName}"?`)) return;
    try {
      await axiosInstance.delete(`${API_BASE}/plans/${id}`);
      toast.success("Plan deleted");
      fetchPlans();
    } catch (err) {
      toast.error("Failed to delete plan");
    }
  };

  const getPlanType = (plan: DriverPlan) => {
    if (plan.monthlyFee === 99 && plan.commissionPercent === 0) {
      return { label: "₹99/MONTH", color: COLORS.warning };
    }
    if (plan.monthlyFee === 0 && plan.commissionPercent === 0) {
      return { label: "UNLIMITED", color: COLORS.success };
    }
    return { label: "STANDARD", color: COLORS.info };
  };

  const filteredPlans = plans.filter((p) =>
    p.planName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSubs = subscriptions.filter((s) =>
    s.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.driverPhone.includes(searchTerm)
  );

  if (loading) {
    return (
      <div style={{minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background}}>
        <div style={{textAlign: "center"}}>
          <div style={{width: 40, height: 40, border: `3px solid ${COLORS.divider}`, borderTopColor: COLORS.primary, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px"}} />
          <p style={{color: COLORS.onSurfaceSecondary}}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{minHeight: "100vh", backgroundColor: COLORS.surface, padding: "2rem 1.5rem"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      
      <div style={{maxWidth: 1400, margin: "0 auto"}}>
        {/* Header */}
        <div style={{marginBottom: "3rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px"}}>
            <Crown size={28} color={COLORS.primary} />
            <h1 style={{fontSize: "2.2rem", fontWeight: "bold", color: COLORS.onSurface, margin: 0}}>
              Driver Earnings Management
            </h1>
          </div>
          <p style={{color: COLORS.onSurfaceSecondary, margin: "8px 0 0 0"}}>
            Manage driver subscription plans and monthly earnings
          </p>
        </div>

        {/* Tabs */}
        <div style={{display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: `1px solid ${COLORS.divider}`}}>
          {(["plans", "subscriptions"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "12px 20px",
                border: "none",
                background: activeTab === tab ? COLORS.primary : "transparent",
                color: activeTab === tab ? "#fff" : COLORS.onSurfaceSecondary,
                fontSize: "1rem",
                fontWeight: activeTab === tab ? "bold" : "500",
                cursor: "pointer",
                transition: "all 0.3s",
              }}
            >
              {tab === "plans" ? <><Zap size={18} /> Plans</> : <><Users size={18} /> Subscriptions</>}
            </button>
          ))}
        </div>

        {/* PLANS TAB */}
        {activeTab === "plans" && (
          <div>
            {/* Controls */}
            <div style={{display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap"}}>
              <div style={{flex: 1, minWidth: "200px", position: "relative"}}>
                <Search size={18} style={{position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: COLORS.onSurfaceSecondary}} />
                <input
                  type="text"
                  placeholder="Search plans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 40px",
                    border: `1px solid ${COLORS.divider}`,
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                  }}
                />
              </div>
              <button
                onClick={() => fetchPlans()}
                style={{padding: "10px 16px", border: `1px solid ${COLORS.divider}`, background: COLORS.background, borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px"}}
              >
                <RefreshCw size={16} /> Refresh
              </button>
              <button
                onClick={() => setShowNewPlanForm(!showNewPlanForm)}
                style={{padding: "10px 16px", border: "none", background: COLORS.primary, color: "#fff", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px"}}
              >
                <Plus size={18} /> New Plan
              </button>
            </div>

            {/* New Plan Form */}
            {showNewPlanForm && (
              <div style={{background: COLORS.background, border: `2px solid ${COLORS.primary}`, borderRadius: "12px", padding: "2rem", marginBottom: "2rem"}}>
                <h2 style={{fontSize: "1.3rem", fontWeight: "bold", marginBottom: "1.5rem"}}>Create New Plan</h2>
                <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem"}}>
                  <div>
                    <label style={{display: "block", marginBottom: "6px", fontWeight: "bold"}}>Plan Name *</label>
                    <input
                      type="text"
                      placeholder="e.g., Standard Plan"
                      value={newPlan.planName || ""}
                      onChange={(e) => setNewPlan({...newPlan, planName: e.target.value})}
                      style={{width: "100%", padding: "10px 12px", border: `1px solid ${COLORS.divider}`, borderRadius: "8px", fontSize: "0.95rem", boxSizing: "border-box"}}
                    />
                  </div>
                  <div>
                    <label style={{display: "block", marginBottom: "6px", fontWeight: "bold"}}>Monthly Fee (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={newPlan.monthlyFee || 0}
                      onChange={(e) => setNewPlan({...newPlan, monthlyFee: parseFloat(e.target.value)})}
                      style={{width: "100%", padding: "10px 12px", border: `1px solid ${COLORS.divider}`, borderRadius: "8px", fontSize: "0.95rem", boxSizing: "border-box"}}
                    />
                  </div>
                  <div>
                    <label style={{display: "block", marginBottom: "6px", fontWeight: "bold"}}>Commission %</label>
                    <input
                      type="number"
                      placeholder="10"
                      value={newPlan.commissionPercent || 10}
                      onChange={(e) => setNewPlan({...newPlan, commissionPercent: parseFloat(e.target.value)})}
                      step="0.1"
                      style={{width: "100%", padding: "10px 12px", border: `1px solid ${COLORS.divider}`, borderRadius: "8px", fontSize: "0.95rem", boxSizing: "border-box"}}
                    />
                  </div>
                  <div>
                    <label style={{display: "block", marginBottom: "6px", fontWeight: "bold"}}>Min Ride Value (₹)</label>
                    <input
                      type="number"
                      placeholder="50"
                      value={newPlan.minRideValue || 50}
                      onChange={(e) => setNewPlan({...newPlan, minRideValue: parseFloat(e.target.value)})}
                      style={{width: "100%", padding: "10px 12px", border: `1px solid ${COLORS.divider}`, borderRadius: "8px", fontSize: "0.95rem", boxSizing: "border-box"}}
                    />
                  </div>
                </div>
                <div style={{marginBottom: "1.5rem"}}>
                  <label style={{display: "block", marginBottom: "6px", fontWeight: "bold"}}>Description</label>
                  <textarea
                    placeholder="e.g., Normal earnings with standard commission"
                    value={newPlan.description || ""}
                    onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                    style={{width: "100%", padding: "10px 12px", border: `1px solid ${COLORS.divider}`, borderRadius: "8px", fontSize: "0.95rem", minHeight: "80px", fontFamily: "inherit", boxSizing: "border-box"}}
                  />
                </div>
                <div style={{display: "flex", gap: "1rem", justifyContent: "flex-end"}}>
                  <button onClick={() => setShowNewPlanForm(false)} style={{padding: "10px 20px", border: `1px solid ${COLORS.divider}`, background: COLORS.background, borderRadius: "8px", cursor: "pointer", fontWeight: "bold"}}>
                    Cancel
                  </button>
                  <button onClick={handleCreatePlan} style={{padding: "10px 20px", border: "none", background: COLORS.success, color: "#fff", borderRadius: "8px", cursor: "pointer", fontWeight: "bold"}}>
                    Create Plan
                  </button>
                </div>
              </div>
            )}

            {/* Plans List */}
            <div style={{display: "grid", gap: "1.5rem"}}>
              {filteredPlans.length === 0 ? (
                <div style={{textAlign: "center", padding: "3rem 2rem", background: COLORS.background, borderRadius: "12px", color: COLORS.onSurfaceSecondary}}>
                  <Users size={40} style={{margin: "0 auto 1rem", opacity: 0.3}} />
                  <p>No plans found. Create your first plan.</p>
                </div>
              ) : (
                filteredPlans.map((plan) => {
                  const planType = getPlanType(plan);
                  const isExpanded = expandedPlan === plan._id;
                  const isEditing = editingPlan?._id === plan._id;

                  return (
                    <div key={plan._id} style={{background: COLORS.background, border: `1px solid ${COLORS.divider}`, borderRadius: "12px", overflow: "hidden", boxShadow: isExpanded ? "0 4px 12px rgba(0,0,0,0.1)" : "none"}}>
                      <div onClick={() => setExpandedPlan(isExpanded ? null : plan._id)} style={{padding: "1.5rem", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: isExpanded ? COLORS.surface : COLORS.background, borderBottom: isExpanded ? `1px solid ${COLORS.divider}` : "none"}}>
                        <div style={{display: "flex", alignItems: "center", gap: "1rem", flex: 1}}>
                          <div style={{width: "4px", height: "40px", backgroundColor: planType.color, borderRadius: "2px"}} />
                          <div style={{flex: 1}}>
                            <div style={{display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px"}}>
                              <h3 style={{fontSize: "1.1rem", fontWeight: "bold", margin: 0}}>{plan.planName}</h3>
                              <span style={{padding: "2px 8px", background: `${planType.color}20`, color: planType.color, borderRadius: "4px", fontSize: "0.7rem", fontWeight: "bold"}}>
                                {planType.label}
                              </span>
                              <span style={{padding: "2px 8px", background: plan.status === "active" ? `${COLORS.success}20` : `${COLORS.error}20`, color: plan.status === "active" ? COLORS.success : COLORS.error, borderRadius: "4px", fontSize: "0.7rem", fontWeight: "bold"}}>
                                {plan.status.toUpperCase()}
                              </span>
                            </div>
                            <p style={{color: COLORS.onSurfaceSecondary, margin: 0, fontSize: "0.9rem"}}>{plan.description}</p>
                          </div>
                        </div>
                        <div style={{display: "flex", alignItems: "center", gap: "1rem"}}>
                          <div style={{textAlign: "right"}}>
                            <div style={{fontSize: "1.2rem", fontWeight: "bold"}}>₹{plan.monthlyFee}</div>
                            <div style={{fontSize: "0.8rem", color: COLORS.onSurfaceSecondary}}>Monthly</div>
                          </div>
                          <ChevronDown size={20} style={{color: COLORS.onSurfaceSecondary, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s"}} />
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{padding: "1.5rem", borderTop: `1px solid ${COLORS.divider}`}}>
                          {isEditing ? (
                            <div>
                              <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1.5rem"}}>
                                <div>
                                  <label style={{display: "block", marginBottom: "6px", fontWeight: "bold"}}>Plan Name</label>
                                  <input
                                    type="text"
                                    value={editingPlan.planName}
                                    onChange={(e) => setEditingPlan({...editingPlan, planName: e.target.value})}
                                    style={{width: "100%", padding: "10px 12px", border: `1px solid ${COLORS.divider}`, borderRadius: "8px", fontSize: "0.95rem", boxSizing: "border-box"}}
                                  />
                                </div>
                                <div>
                                  <label style={{display: "block", marginBottom: "6px", fontWeight: "bold"}}>Monthly Fee</label>
                                  <input
                                    type="number"
                                    value={editingPlan.monthlyFee}
                                    onChange={(e) => setEditingPlan({...editingPlan, monthlyFee: parseFloat(e.target.value)})}
                                    style={{width: "100%", padding: "10px 12px", border: `1px solid ${COLORS.divider}`, borderRadius: "8px", fontSize: "0.95rem", boxSizing: "border-box"}}
                                  />
                                </div>
                                <div>
                                  <label style={{display: "block", marginBottom: "6px", fontWeight: "bold"}}>Commission %</label>
                                  <input
                                    type="number"
                                    value={editingPlan.commissionPercent}
                                    onChange={(e) => setEditingPlan({...editingPlan, commissionPercent: parseFloat(e.target.value)})}
                                    step="0.1"
                                    style={{width: "100%", padding: "10px 12px", border: `1px solid ${COLORS.divider}`, borderRadius: "8px", fontSize: "0.95rem", boxSizing: "border-box"}}
                                  />
                                </div>
                                <div>
                                  <label style={{display: "block", marginBottom: "6px", fontWeight: "bold"}}>Status</label>
                                  <select value={editingPlan.status} onChange={(e) => setEditingPlan({...editingPlan, status: e.target.value as "active" | "inactive"})} style={{width: "100%", padding: "10px 12px", border: `1px solid ${COLORS.divider}`, borderRadius: "8px", fontSize: "0.95rem", boxSizing: "border-box"}}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                  </select>
                                </div>
                              </div>
                              <div style={{display: "flex", gap: "1rem", justifyContent: "flex-end"}}>
                                <button onClick={() => setEditingPlan(null)} style={{padding: "10px 20px", border: `1px solid ${COLORS.divider}`, background: COLORS.background, borderRadius: "8px", cursor: "pointer", fontWeight: "bold"}}>
                                  Cancel
                                </button>
                                <button onClick={() => handleUpdatePlan(editingPlan)} style={{padding: "10px 20px", border: "none", background: COLORS.success, color: "#fff", borderRadius: "8px", cursor: "pointer", fontWeight: "bold"}}>
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem"}}>
                                <div style={{padding: "1rem", background: COLORS.surface, borderRadius: "8px"}}>
                                  <div style={{fontSize: "0.8rem", color: COLORS.onSurfaceSecondary, marginBottom: "4px"}}>Monthly Fee</div>
                                  <div style={{fontSize: "1.5rem", fontWeight: "bold", color: COLORS.primary}}>₹{plan.monthlyFee}</div>
                                </div>
                                <div style={{padding: "1rem", background: COLORS.surface, borderRadius: "8px"}}>
                                  <div style={{fontSize: "0.8rem", color: COLORS.onSurfaceSecondary, marginBottom: "4px"}}>Commission Cut</div>
                                  <div style={{fontSize: "1.5rem", fontWeight: "bold", color: COLORS.warning}}>{plan.commissionPercent}%</div>
                                </div>
                                <div style={{padding: "1rem", background: COLORS.surface, borderRadius: "8px"}}>
                                  <div style={{fontSize: "0.8rem", color: COLORS.onSurfaceSecondary, marginBottom: "4px"}}>Driver Gets</div>
                                  <div style={{fontSize: "1.5rem", fontWeight: "bold", color: COLORS.success}}>{100 - plan.commissionPercent}%</div>
                                </div>
                              </div>
                              <div style={{padding: "1rem", background: `${COLORS.info}10`, borderLeft: `4px solid ${COLORS.info}`, borderRadius: "6px", marginBottom: "1.5rem"}}>
                                <p style={{color: COLORS.info, margin: 0, fontSize: "0.9rem"}}>
                                  <strong>How it works:</strong> Drivers earn {100 - plan.commissionPercent}% of rides {plan.monthlyFee > 0 ? `and pay ₹${plan.monthlyFee}/month` : "with no subscription fee."}
                                </p>
                              </div>
                              <div style={{display: "flex", gap: "1rem", justifyContent: "flex-end"}}>
                                <button onClick={() => handleDeletePlan(plan._id, plan.planName)} style={{padding: "10px 16px", border: `1px solid ${COLORS.error}`, background: `${COLORS.error}10`, color: COLORS.error, borderRadius: "8px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px"}}>
                                  <Trash2 size={16} /> Delete
                                </button>
                                <button onClick={() => setEditingPlan(plan)} style={{padding: "10px 16px", border: "none", background: COLORS.primary, color: "#fff", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px"}}>
                                  <Settings size={16} /> Edit
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* SUBSCRIPTIONS TAB */}
        {activeTab === "subscriptions" && (
          <div>
            <div style={{display: "flex", gap: "1rem", marginBottom: "2rem"}}>
              <div style={{flex: 1, minWidth: "200px", position: "relative"}}>
                <Search size={18} style={{position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: COLORS.onSurfaceSecondary}} />
                <input
                  type="text"
                  placeholder="Search by driver name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{width: "100%", padding: "10px 12px 10px 40px", border: `1px solid ${COLORS.divider}`, borderRadius: "8px", fontSize: "0.95rem"}}
                />
              </div>
              <button onClick={() => fetchSubscriptions()} style={{padding: "10px 16px", border: `1px solid ${COLORS.divider}`, background: COLORS.background, borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px"}}>
                <RefreshCw size={16} /> Refresh
              </button>
            </div>

            {/* Subscriptions Table */}
            <div style={{background: COLORS.background, border: `1px solid ${COLORS.divider}`, borderRadius: "12px", overflow: "hidden"}}>
              {filteredSubs.length === 0 ? (
                <div style={{textAlign: "center", padding: "3rem 2rem", color: COLORS.onSurfaceSecondary}}>
                  <Users size={40} style={{margin: "0 auto 1rem", opacity: 0.3}} />
                  <p>No driver subscriptions found.</p>
                </div>
              ) : (
                <div style={{overflowX: "auto"}}>
                  <table style={{width: "100%", borderCollapse: "collapse"}}>
                    <thead>
                      <tr style={{backgroundColor: COLORS.surface, borderBottom: `1px solid ${COLORS.divider}`}}>
                        <th style={{padding: "12px 16px", textAlign: "left", fontWeight: "bold", color: COLORS.onSurfaceSecondary}}>Driver</th>
                        <th style={{padding: "12px 16px", textAlign: "left", fontWeight: "bold", color: COLORS.onSurfaceSecondary}}>Plan</th>
                        <th style={{padding: "12px 16px", textAlign: "right", fontWeight: "bold", color: COLORS.onSurfaceSecondary}}>Fee</th>
                        <th style={{padding: "12px 16px", textAlign: "right", fontWeight: "bold", color: COLORS.onSurfaceSecondary}}>Commission</th>
                        <th style={{padding: "12px 16px", textAlign: "right", fontWeight: "bold", color: COLORS.onSurfaceSecondary}}>Monthly Earnings</th>
                        <th style={{padding: "12px 16px", textAlign: "right", fontWeight: "bold", color: COLORS.onSurfaceSecondary}}>Net Profit</th>
                        <th style={{padding: "12px 16px", textAlign: "center", fontWeight: "bold", color: COLORS.onSurfaceSecondary}}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubs.map((sub, idx) => (
                        <tr key={sub._id} style={{borderBottom: `1px solid ${COLORS.divider}`, backgroundColor: idx % 2 === 0 ? COLORS.background : COLORS.surface}}>
                          <td style={{padding: "12px 16px"}}>
                            <div style={{fontWeight: "bold"}}>{sub.driverName}</div>
                            <div style={{fontSize: "0.85rem", color: COLORS.onSurfaceSecondary}}>{sub.driverPhone}</div>
                          </td>
                          <td style={{padding: "12px 16px"}}>{sub.planName}</td>
                          <td style={{padding: "12px 16px", textAlign: "right", fontWeight: "bold"}}>₹{sub.monthlyFee}</td>
                          <td style={{padding: "12px 16px", textAlign: "right", fontWeight: "bold", color: COLORS.warning}}>{sub.commissionPercent}%</td>
                          <td style={{padding: "12px 16px", textAlign: "right", fontWeight: "bold"}}>₹{Math.round(sub.monthlyEarnings)}</td>
                          <td style={{padding: "12px 16px", textAlign: "right", fontWeight: "bold", color: sub.profitLoss >= 0 ? COLORS.success : COLORS.error}}>
                            ₹{Math.round(sub.profitLoss)}
                          </td>
                          <td style={{padding: "12px 16px", textAlign: "center"}}>
                            <span style={{padding: "4px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "bold", backgroundColor: sub.status === "active" ? `${COLORS.success}20` : `${COLORS.error}20`, color: sub.status === "active" ? COLORS.success : COLORS.error}}>
                              {sub.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Summary */}
            {filteredSubs.length > 0 && (
              <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "2rem"}}>
                {(() => {
                  const totalEarnings = filteredSubs.reduce((sum, s) => sum + s.monthlyEarnings, 0);
                  const totalFees = filteredSubs.reduce((sum, s) => sum + s.monthlyFee, 0);
                  const netProfit = filteredSubs.reduce((sum, s) => sum + s.profitLoss, 0);
                  const activeCount = filteredSubs.filter(s => s.status === "active").length;

                  return [
                    {label: "Active Subscriptions", value: activeCount, color: COLORS.success},
                    {label: "Total Earnings", value: `₹${Math.round(totalEarnings)}`, color: COLORS.primary},
                    {label: "Subscription Revenue", value: `₹${Math.round(totalFees)}`, color: COLORS.warning},
                    {label: "Net Profit", value: `₹${Math.round(netProfit)}`, color: netProfit >= 0 ? COLORS.success : COLORS.error},
                  ].map((stat, idx) => (
                    <div key={idx} style={{padding: "1.5rem", background: COLORS.background, border: `1px solid ${COLORS.divider}`, borderRadius: "12px", textAlign: "center"}}>
                      <div style={{fontSize: "0.9rem", color: COLORS.onSurfaceSecondary, marginBottom: "8px"}}>{stat.label}</div>
                      <div style={{fontSize: "1.8rem", fontWeight: "bold", color: stat.color}}>{stat.value}</div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverEarningsManagement;