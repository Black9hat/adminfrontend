import React, { useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Car, Users, CreditCard, Map, Shield, Package,
  Star, Monitor, UserCog, Zap, Search, Scale,
  DollarSign, ChevronDown, ChevronRight, LogOut, Menu, X,
  Bell, MapPin, HelpCircle, Gift, TrendingUp, Percent, Receipt,
  FileText, Ticket,
} from "lucide-react";
import { C } from "../components/ui";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number | string;
}
interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    key: "overview",
    label: "Overview",
    items: [
      { path: "/analytics",  label: "Analytics",  icon: <LayoutDashboard size={16} /> },
      { path: "/money-flow", label: "Money Flow",  icon: <DollarSign size={16} /> },
    ],
  },
  {
    key: "ops",
    label: "Operations",
    items: [
      { path: "/rides",         label: "Ride Management",   icon: <Car size={16} />        },
      { path: "/drivers",       label: "Driver Management", icon: <UserCog size={16} />    },
      { path: "/earnings",      label: "Driver Earnings",   icon: <TrendingUp size={16} /> },
      { path: "/documents",     label: "Documents",         icon: <FileText size={16} />   },
      { path: "/parcels",       label: "Parcel Delivery",   icon: <Package size={16} />    },
      { path: "/gps",           label: "GPS Monitoring",    icon: <Map size={16} />        },
      { path: "/service-areas", label: "Service Areas",     icon: <MapPin size={16} />     },
    ],
  },
  {
    key: "users",
    label: "Users",
    items: [
      { path: "/customers", label: "User Accounts", icon: <Users size={16} /> },
      { path: "/ratings",   label: "Ratings",       icon: <Star size={16} />  },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    items: [
      { path: "/payments",        label: "Payments & Refunds", icon: <CreditCard size={16} /> },
      { path: "/fare-management", label: "Fare Management",    icon: <Receipt size={16} />    },
      { path: "/fare-pricing",    label: "Fare Rates",         icon: <Zap size={16} />        },
      { path: "/promotions",      label: "Promo Codes",        icon: <Percent size={16} />    },
      { path: "/incentives",      label: "Incentives",         icon: <Gift size={16} />       },
      { path: "/coupons",         label: "Coupons",            icon: <Ticket size={16} />     }, // ✅ added
    ],
  },
  {
    key: "safety",
    label: "Safety & Trust",
    items: [
      { path: "/safety",  label: "Complaints",      icon: <Shield size={16} />     },
      { path: "/support", label: "Admin Support",   icon: <HelpCircle size={16} /> },
      { path: "/fraud",   label: "Fraud Detection", icon: <Search size={16} />     },
    ],
  },
  {
    key: "system",
    label: "System",
    items: [
      { path: "/tech",          label: "Tech Monitoring",    icon: <Monitor size={16} />    },
      { path: "/legal",         label: "Legal & Compliance", icon: <Scale size={16} />      },
      { path: "/notifications", label: "Notifications",      icon: <Bell size={16} />       },
      { path: "/help",          label: "Help Management",    icon: <HelpCircle size={16} /> },
    ],
  },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen]     = useState<Record<string, boolean>>(Object.fromEntries(GROUPS.map(g => [g.key, true])));
  const [collapsed, setCol] = useState(false);

  const toggle = (key: string) => setOpen(v => ({ ...v, [key]: !v[key] }));

  const logout = () => {
    localStorage.removeItem("adminToken");
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'Syne','Segoe UI',sans-serif" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .nav-item{transition:background 0.12s,color 0.12s}
        .nav-item:hover{background:rgba(255,255,255,0.04)!important}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#2d3748;border-radius:4px}
        input,select{color-scheme:dark}
        *{box-sizing:border-box}
      `}</style>

      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 56 : 230,
        flexShrink: 0,
        background: "#0e1015",
        borderRight: "1px solid " + C.border,
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: "hidden",
        transition: "width 0.22s cubic-bezier(.4,0,.2,1)",
        zIndex: 40,
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? "1rem 0" : "1.1rem 1.25rem", borderBottom: "1px solid " + C.border, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", flexShrink: 0 }}>
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 900, fontSize: "1rem", color: C.text, letterSpacing: "-0.03em" }}>🚘 GoIndia</div>
              <div style={{ fontSize: "0.6rem", fontFamily: "monospace", color: C.muted, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 1 }}>Admin Panel</div>
            </div>
          )}
          {collapsed && <span style={{ fontSize: "1.2rem" }}>🚘</span>}
          <button onClick={() => setCol(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, borderRadius: 6, display: "flex", alignItems: "center" }}>
            {collapsed ? <Menu size={16} /> : <X size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: collapsed ? "0.5rem 0" : "0.5rem 0.5rem" }}>
          {GROUPS.map(group => (
            <div key={group.key} style={{ marginBottom: collapsed ? 0 : 4 }}>
              {!collapsed && (
                <button
                  onClick={() => toggle(group.key)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "6px 10px", background: "none", border: "none", cursor: "pointer", color: C.muted, marginTop: 6 }}
                >
                  <span style={{ fontSize: "0.58rem", fontFamily: "monospace", letterSpacing: "0.18em", textTransform: "uppercase" }}>{group.label}</span>
                  {open[group.key] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                </button>
              )}

              {(open[group.key] || collapsed) && group.items.map(item => {
                const active = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className="nav-item"
                    title={collapsed ? item.label : undefined}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: collapsed ? 0 : 9,
                      justifyContent: collapsed ? "center" : "flex-start",
                      padding: collapsed ? "10px 0" : "8px 10px",
                      borderRadius: collapsed ? 0 : 9,
                      marginBottom: 2,
                      textDecoration: "none",
                      color: active ? "#fff" : C.muted,
                      background: active ? C.primary : "transparent",
                      fontWeight: active ? 700 : 500,
                      fontSize: "0.83rem",
                      position: "relative",
                    }}
                  >
                    <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>{item.icon}</span>
                    {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>}
                    {!collapsed && item.badge !== undefined && (
                      <span style={{ marginLeft: "auto", background: active ? "rgba(255,255,255,0.25)" : C.border, borderRadius: 20, padding: "0 7px", fontSize: "0.6rem", fontFamily: "monospace" }}>
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: collapsed ? "0.75rem 0" : "0.875rem 0.75rem", borderTop: "1px solid " + C.border, flexShrink: 0 }}>
          <button
            onClick={logout}
            className="nav-item"
            style={{
              display: "flex", alignItems: "center", gap: collapsed ? 0 : 9, justifyContent: collapsed ? "center" : "flex-start",
              width: "100%", padding: collapsed ? "8px 0" : "8px 10px",
              background: "none", border: "none", cursor: "pointer",
              color: C.muted, fontSize: "0.83rem", borderRadius: 9,
            }}
          >
            <LogOut size={15} />
            {!collapsed && "Log Out"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
        <Outlet />
      </main>
    </div>
  );
}