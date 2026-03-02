import React, { useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Car, Users, CreditCard, Map, Shield, Package,
  Star, Monitor, UserCog, Zap, Search, Scale,
  DollarSign, ChevronDown, ChevronRight, LogOut, Menu,
  Bell, MapPin, HelpCircle, Gift, TrendingUp, Percent, Receipt,
  FileText, Ticket, Activity, Wallet,
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
      { path: "/analytics",  label: "Analytics",  icon: <LayoutDashboard size={14} /> },
      { path: "/money-flow", label: "Money Flow",  icon: <DollarSign size={14} />     },
    ],
  },
  {
    key: "ops",
    label: "Operations",
    items: [
      { path: "/rides",         label: "Ride Management",   icon: <Car size={14} />        },
      { path: "/drivers",       label: "Driver Management", icon: <UserCog size={14} />    },
      { path: "/earnings",      label: "Driver Earnings",   icon: <TrendingUp size={14} /> },
      { path: "/wallets",       label: "Driver Wallets",    icon: <Wallet size={14} />     }, // ✅ NEW
      { path: "/documents",     label: "Documents",         icon: <FileText size={14} />   },
      { path: "/parcels",       label: "Parcel Delivery",   icon: <Package size={14} />    },
      { path: "/gps",           label: "GPS Monitoring",    icon: <Map size={14} />        },
      { path: "/service-areas", label: "Service Areas",     icon: <MapPin size={14} />     },
    ],
  },
  {
    key: "users",
    label: "Users",
    items: [
      { path: "/customers", label: "User Accounts", icon: <Users size={14} /> },
      { path: "/ratings",   label: "Ratings",       icon: <Star size={14} />  },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    items: [
      { path: "/payments",        label: "Payments & Refunds", icon: <CreditCard size={14} /> },
      { path: "/fare-management", label: "Fare Management",    icon: <Receipt size={14} />    },
      { path: "/fare-pricing",    label: "Fare Rates",         icon: <Zap size={14} />        },
      { path: "/promotions",      label: "Promo Codes",        icon: <Percent size={14} />    },
      { path: "/incentives",      label: "Incentives",         icon: <Gift size={14} />       },
      { path: "/coupons",         label: "Coupons",            icon: <Ticket size={14} />     },
    ],
  },
  {
    key: "safety",
    label: "Safety & Trust",
    items: [
      { path: "/safety",  label: "Complaints",      icon: <Shield size={14} />     },
      { path: "/support", label: "Admin Support",   icon: <HelpCircle size={14} /> },
      { path: "/fraud",   label: "Fraud Detection", icon: <Search size={14} />     },
    ],
  },
  {
    key: "system",
    label: "System",
    items: [
      { path: "/tech",          label: "Tech Monitoring",    icon: <Monitor size={14} />    },
      { path: "/legal",         label: "Legal & Compliance", icon: <Scale size={14} />      },
      { path: "/notifications", label: "Notifications",      icon: <Bell size={14} />       },
      { path: "/help",          label: "Help Management",    icon: <HelpCircle size={14} /> },
    ],
  },
];

const SIDEBAR_FULL = 224;
const SIDEBAR_MINI = 50;

export default function AdminLayout() {
  const location = useLocation();
  const navigate  = useNavigate();
  const [open, setOpen]     = useState<Record<string, boolean>>(
    Object.fromEntries(GROUPS.map(g => [g.key, true]))
  );
  const [collapsed, setCol] = useState(false);

  const toggle = (key: string) => setOpen(v => ({ ...v, [key]: !v[key] }));
  const logout = () => { localStorage.removeItem("adminToken"); navigate("/login"); };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div style={{ display: "flex", height: "100vh", background: C.surface }}>
      {/* ── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          width: collapsed ? SIDEBAR_MINI : SIDEBAR_FULL,
          height: "100vh",
          background: C.surface,
          borderRight: `1px solid ${C.border}`,
          overflow: "hidden",
          transition: "width 0.25s",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "1rem",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            minHeight: 60,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: `linear-gradient(135deg, ${C.primary}, ${C.cyan})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 800,
              fontSize: "0.9rem",
            }}
          >
            🚗
          </div>
          {!collapsed && (
            <div
              style={{
                fontSize: "0.85rem",
                fontWeight: 800,
                color: C.text,
                whiteSpace: "nowrap",
              }}
            >
              RideHub Admin
            </div>
          )}
        </div>

        {/* Nav Groups */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 0" }}>
          {GROUPS.map((g) => (
            <div key={g.key} style={{ marginBottom: "1.5rem" }}>
              {/* Group Label */}
              {!collapsed && (
                <button
                  onClick={() => toggle(g.key)}
                  style={{
                    width: "100%",
                    padding: "0.5rem 1rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    color: C.muted,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "0.5rem",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = C.text)}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = C.muted)}
                >
                  {g.label}
                  {!collapsed && (
                    <ChevronRight
                      size={12}
                      style={{
                        transform: open[g.key] ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                      }}
                    />
                  )}
                </button>
              )}

              {/* Nav Items */}
              {open[g.key] &&
                g.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    style={({ isActive: linkActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      gap: collapsed ? 0 : "0.5rem",
                      padding: "0.65rem 1rem",
                      margin: "0.2rem 0.5rem",
                      borderRadius: 6,
                      textDecoration: "none",
                      fontSize: "0.8rem",
                      fontWeight: linkActive ? 600 : 500,
                      color: linkActive ? C.primary : C.text,
                      background: linkActive ? `${C.primary}15` : "transparent",
                      border: linkActive ? `1px solid ${C.primary}33` : "1px solid transparent",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    })}
                  >
                    <span style={{ display: "flex", flexShrink: 0, color: "inherit" }}>
                      {item.icon}
                    </span>
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span
                        style={{
                          marginLeft: "auto",
                          background: C.red,
                          color: "#fff",
                          borderRadius: 999,
                          padding: "0.1rem 0.45rem",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
            </div>
          ))}
        </div>

        {/* Toggle Collapse */}
        <button
          onClick={() => setCol(!collapsed)}
          style={{
            width: "100%",
            padding: "1rem",
            background: `${C.border}`,
            border: "none",
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: C.muted,
            transition: "all 0.2s",
            borderRadius: 0,
          }}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <Menu size={16} />
        </button>

        {/* Logout */}
        {!collapsed && (
          <button
            onClick={logout}
            style={{
              width: "100%",
              padding: "0.8rem 1rem",
              background: `${C.red}15`,
              border: `1px solid ${C.red}33`,
              borderRadius: 0,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              color: C.red,
              fontSize: "0.8rem",
              fontWeight: 600,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = `${C.red}25`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = `${C.red}15`;
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        )}
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top Bar */}
        <div
          style={{
            height: 60,
            background: C.surface,
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "center",
            paddingRight: "1.5rem",
            justifyContent: "space-between",
          }}
        >
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: C.muted,
                padding: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 6,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = C.surface2;
                (e.currentTarget as HTMLElement).style.color = C.text;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "none";
                (e.currentTarget as HTMLElement).style.color = C.muted;
              }}
            >
              <Bell size={18} />
            </button>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.primary}, ${C.cyan})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              A
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}