import React, { useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Car, Users, CreditCard, Map, Shield, Package,
  Star, Monitor, UserCog, Zap, Search, Scale,
  DollarSign, ChevronDown, ChevronRight, LogOut, Menu,
  Bell, MapPin, HelpCircle, Gift, TrendingUp, Percent, Receipt,
  FileText, Ticket, Activity,
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

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      background: C.bg, fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes liveDot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:0.5} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.45} }

        ::-webkit-scrollbar       { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border3}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${C.muted}; }

        input, select, textarea { font-family: 'Inter', sans-serif; color-scheme: dark; }
        input::placeholder { color: ${C.muted}; }

        /* Button interactions */
        .pr-btn { transition: all 0.13s ease; user-select: none; }
        .pr-btn:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); }
        .pr-btn:active:not(:disabled) { transform: translateY(0); filter: brightness(0.96); }

        /* Table row */
        .pr-row { transition: background 0.08s; cursor: pointer; }
        .pr-row:hover { background: ${C.surface3} !important; }

        /* Card hover */
        .pr-card { transition: border-color 0.2s, box-shadow 0.2s; }
        .pr-card:hover { border-color: ${C.border3} !important; box-shadow: 0 4px 24px rgba(0,0,0,.35); }

        /* Tab */
        .pr-tab { transition: all 0.13s ease; }
        .pr-tab:hover:not(.pr-tab-active) { color: ${C.text2} !important; background: ${C.surface3} !important; }

        /* Input focus */
        .pr-input:focus  { border-color: ${C.primary} !important; outline: none; }
        .pr-select:focus { border-color: ${C.primary} !important; outline: none; }

        /* Nav link base */
        .nav-lnk { display: block; text-decoration: none; margin: 1px 5px; }
        .nav-lnk .nav-in {
          display: flex; align-items: center; gap: 9px;
          padding: 7px 9px; border-radius: 7px;
          border-left: 2px solid transparent;
          transition: all 0.12s ease;
        }
        .nav-lnk:hover .nav-in  { background: ${C.surface3}; }
        .nav-lnk.active .nav-in {
          background: ${C.primaryDim};
          border-left-color: ${C.primary};
        }
        .nav-lnk.active .nav-ico { color: ${C.primary} !important; }
        .nav-lnk.active .nav-txt { color: ${C.primary} !important; font-weight: 700 !important; }

        /* Group header button */
        .grp-btn {
          width: 100%; padding: 4px 12px;
          background: none; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: space-between;
          gap: 6px; margin-top: 6px; transition: background 0.1s;
          border-radius: 6px;
        }
        .grp-btn:hover { background: ${C.surface2}; }

        /* Logout button */
        .logout-btn {
          width: 100%; background: none; border: none; cursor: pointer;
          display: flex; align-items: center; gap: 9px;
          padding: 7px 9px; color: ${C.muted};
          font-size: 0.83rem; font-family: 'Inter', sans-serif;
          border-radius: 7px; transition: all 0.12s;
        }
        .logout-btn:hover { color: ${C.red}; background: ${C.redDim}; }
      `}</style>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
      <aside style={{
        width: collapsed ? SIDEBAR_MINI : SIDEBAR_FULL,
        flexShrink: 0,
        background: C.surface,
        borderRight: "1px solid " + C.border,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)",
        zIndex: 40,
        height: "100vh",
        position: "sticky",
        top: 0,
      }}>

        {/* ── Logo / Brand ─────────────────────────────────────────────────── */}
        <div style={{
          height: 54,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          padding: collapsed ? "0 8px" : "0 10px 0 14px",
          borderBottom: "1px solid " + C.border,
          flexShrink: 0,
          gap: 8,
        }}>
          {!collapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: C.primaryDim, border: "1px solid " + C.primaryBrd,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1rem", flexShrink: 0,
              }}>🚘</div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontWeight: 800, fontSize: "0.92rem", color: C.text,
                  letterSpacing: "-0.02em", lineHeight: 1,
                }}>GoIndia</div>
                <div style={{
                  fontSize: "0.54rem", color: C.muted,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 2,
                }}>Admin Center</div>
              </div>
            </div>
          )}
          {collapsed && (
            <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>🚘</span>
          )}
          <button
            onClick={() => setCol(v => !v)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: C.muted, padding: 5, borderRadius: 6,
              display: "flex", alignItems: "center", flexShrink: 0,
              transition: "color 0.12s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = C.text2)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
          >
            <Menu size={15} />
          </button>
        </div>

        {/* ── Live status pill ─────────────────────────────────────────────── */}
        {!collapsed && (
          <div style={{
            margin: "8px 10px 2px",
            padding: "5px 10px",
            background: C.greenDim,
            border: "1px solid " + C.green + "22",
            borderRadius: 7,
            display: "flex", alignItems: "center", gap: 7,
            flexShrink: 0,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: C.green,
              animation: "liveDot 1.6s ease-in-out infinite",
              flexShrink: 0, boxShadow: "0 0 5px " + C.green,
            }} />
            <span style={{ fontSize: "0.69rem", color: C.green, fontWeight: 600 }}>
              System Live
            </span>
          </div>
        )}

        {/* ── Nav ──────────────────────────────────────────────────────────── */}
        <nav style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          padding: "6px 0 8px",
        }}>
          {GROUPS.map(group => (
            <div key={group.key}>

              {/* Group header */}
              {!collapsed && (
                <button
                  className="grp-btn"
                  onClick={() => toggle(group.key)}
                >
                  <span style={{
                    fontSize: "0.58rem", color: C.muted,
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.13em", textTransform: "uppercase",
                  }}>
                    {group.label}
                  </span>
                  <span style={{ color: C.muted, display: "flex", opacity: 0.6 }}>
                    {open[group.key] ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
                  </span>
                </button>
              )}

              {/* Nav items */}
              {(open[group.key] || collapsed) && group.items.map(item => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== "/" && location.pathname.startsWith(item.path + "/"));
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={"nav-lnk" + (isActive ? " active" : "")}
                    title={collapsed ? item.label : undefined}
                  >
                    <div
                      className="nav-in"
                      style={{
                        justifyContent: collapsed ? "center" : "flex-start",
                        padding: collapsed ? "9px 0" : "7px 9px",
                        gap: collapsed ? 0 : 9,
                      }}
                    >
                      {/* Icon */}
                      <span
                        className="nav-ico"
                        style={{
                          color: isActive ? C.primary : C.muted,
                          display: "flex", flexShrink: 0,
                          transition: "color 0.12s",
                        }}
                      >
                        {item.icon}
                      </span>

                      {/* Label */}
                      {!collapsed && (
                        <span
                          className="nav-txt"
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? C.primary : C.text2,
                            overflow: "hidden", textOverflow: "ellipsis",
                            whiteSpace: "nowrap", transition: "color 0.12s",
                          }}
                        >
                          {item.label}
                        </span>
                      )}

                      {/* Badge */}
                      {!collapsed && item.badge !== undefined && (
                        <span style={{
                          marginLeft: "auto",
                          background: isActive ? C.primary + "30" : C.border,
                          color: isActive ? C.primary : C.muted,
                          borderRadius: 4, padding: "0 5px",
                          fontSize: "0.6rem", lineHeight: "15px",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 700, flexShrink: 0,
                        }}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Logout footer ────────────────────────────────────────────────── */}
        <div style={{
          padding: "6px 5px 8px",
          borderTop: "1px solid " + C.border,
          flexShrink: 0,
        }}>
          <button
            className="logout-btn"
            onClick={logout}
            style={{
              justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "8px 0" : "7px 9px",
              gap: collapsed ? 0 : 9,
            }}
          >
            <LogOut size={14} style={{ flexShrink: 0 }} />
            {!collapsed && "Log out"}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0, overflow: "auto", background: C.bg }}>
        <Outlet />
      </main>
    </div>
  );
}